/**
 * API OMPANGANO. Toute décision de sécurité est prise ici (jamais dans le navigateur) :
 * rôle, statut, XP, badges, compteurs et calcul des points.
 */
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { EventEmitter } from 'node:events';
import type { Db, Queryable } from './db.ts';
import type { AuthUser, TokenVerifier } from './auth.ts';
import type { MediaStorage } from './storage.ts';
import { MAX_UPLOAD_BYTES, SUPER_ADMIN_EMAIL, UPLOAD_URL_TTL_S } from './config.ts';
import {
  CURSOR_SQL, cleanData, contributionRow, genericRow, isGenericTable, isSyncTable, iso, serializeRow, userRow,
  type GenericTable, type SyncTable
} from './model.ts';
import { importItems } from './importItems.ts';
import { journaliserErreur } from './erreurs.ts';
import { estJetonSession, fournisseurParDefaut, lireSession, type FournisseurSms } from './sms.ts';
import { registerContenus } from './contenus.ts';
import { registerJeux } from './jeux.ts';
import { registerServices } from './services.ts';
import { fournisseurEmbeddingParDefaut, fournisseurIaParDefaut, registerIaAdmin, type FournisseurEmbedding, type FournisseurIa } from './ia.ts';
import { registerSupervision } from './supervision.ts';
import { registerMedia } from './media.ts';
import { registerRegie } from './regie.ts';
import { registerPush } from './push.ts';
import { registerAchats } from './achats.ts';
import { registerMobileMoney } from './mobilemoney.ts';
import { registerExemples } from './exemples.ts';
import { enregistrerVisite, lireStatistiques, tropDeRequetes } from './visites.ts';
import { chargerEcartees, cle as cleTexte, estPlusAncienne, journaliser, preparerProtection, raisonEcartee, type EntreeJournal } from './protection.ts';
import { normalizePhraseComparisonKey } from '../../../shared/csvDedup.ts';
import {
  NEW_USER_PROTECTED_DEFAULTS, PROTECTED_USER_FIELDS, buildLeaderboardEntry, computeValidationReward,
  stripProtectedUserFields, validationBadgesFor
} from '../../../shared/userSecurity.ts';
import { getLevelForXp } from '../../../shared/levels.ts';
import type { Badge, Contribution, ContributionStatus, QuestionnaireItem, UserProfile, WeeklyChallenge } from '../../../src/types/index.ts';

export interface Deps {
  db: Db;
  verify: TokenVerifier;
  storage: MediaStorage;
  corsOrigins: string[];
  rateLimitMax?: number;
  logger?: boolean;
  /** Connexion par SMS (Twilio Verify par défaut). */
  sms?: FournisseurSms;
  /** Assistant IA (Anthropic par défaut, simulation sans clé). */
  ia?: FournisseurIa;
  /** Embeddings du RAG (RunPod ou compatible OpenAI ; simulation sans clé). */
  embed?: FournisseurEmbedding;
  /** Secret de signature des sessions SMS (SESSION_SECRET). */
  sessionSecret?: string;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const fail = (status: number, msg: string): never => { throw new HttpError(status, msg); };

declare module 'fastify' {
  interface FastifyRequest { auth?: AuthUser }
}

/** Téléchargements complets du catalogue par compte (mémoire du processus : repart de zéro au redémarrage) */
const telechargementsComplets = new Map<string, number[]>();
const MAX_TELECHARGEMENTS_PAR_JOUR = 6;
function telechargementsTropNombreux(uid: string, maintenant = Date.now()): boolean {
  const recents = (telechargementsComplets.get(uid) || []).filter(t => maintenant - t < 24 * 3600_000);
  if (recents.length >= MAX_TELECHARGEMENTS_PAR_JOUR) { telechargementsComplets.set(uid, recents); return true; }
  recents.push(maintenant);
  telechargementsComplets.set(uid, recents);
  if (telechargementsComplets.size > 10000) telechargementsComplets.clear();
  return false;
}

/** Phrases du seed initial : un import CSV ou une écriture en masse venant d'un autre auteur ne les remplace jamais. */
const SEED_CREATOR = 'system_ompangano';
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const RECORD_ID_RE = /^[A-Za-z0-9_.-]{1,200}$/;
const CONTRIBUTION_STATUSES: string[] = ['pending', 'approved', 'rejected', 'needs_revision', 'audio_approved_text_revision', 'text_approved_audio_revision'];
const VALIDATION_STATUSES: ContributionStatus[] = ['approved', 'rejected', 'needs_revision', 'audio_approved_text_revision', 'text_approved_audio_revision'];
const ROLES = ['user', 'validator', 'admin'];
const ACCOUNT_STATUSES = ['active', 'flagged', 'suspended'];
/** Champs d'une contribution que le navigateur ne fixe jamais. */
const CONTRIBUTION_SERVER_FIELDS = [
  'status', 'userId', 'rewardedXp', 'rewardedContribution', 'rewardedRecording', 'countedChallengeIds',
  'validatorId', 'validatorDisplayName', 'validatorNotes', 'validatedAt', 'spellingVerdict', 'pronunciationVerdict',
  'audioUrl', 'createdAt', 'offlineQueued'
];

interface Actor {
  auth: AuthUser;
  isSuper: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  role: string;
  status: string;
  exists: boolean;
}

export function isSuperAdmin(a: Pick<AuthUser, 'email' | 'emailVerified'>): boolean {
  return a.emailVerified === true && !!a.email && a.email.toLowerCase() === SUPER_ADMIN_EMAIL;
}

const str = (v: unknown): v is string => typeof v === 'string';

export async function buildApp(deps: Deps): Promise<FastifyInstance> {
  const { db, verify, storage } = deps;
  const secret = deps.sessionSecret || process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'secret-de-developpement-nkala-0123456789');
  if (!secret) throw new Error('SESSION_SECRET manquant');
  // Garde-fous du corpus : phrases écartées et correction des anciennes phrases de départ (idempotent)
  await db.tx(q => preparerProtection(q));
  const app = Fastify({
    logger: deps.logger === false ? false : { level: 'info', redact: ['req.headers.authorization', 'req.headers.cookie'] },
    bodyLimit: 8 * 1024 * 1024,
    trustProxy: true,
    disableRequestLogging: false
  });
  const bus = new EventEmitter();
  bus.setMaxListeners(0);
  const notify = (collection: string) => bus.emit('change', { collection, at: new Date().toISOString() });

  await app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || deps.corsOrigins.includes(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    // Les navigateurs gardent la pré-requête CORS 24 h : une requête de moins avant chaque appel (réseau lent)
    maxAge: 86400
  });

  app.setErrorHandler((err: any, req, reply) => {
    if (err instanceof HttpError) return reply.status(err.status).send({ error: err.message });
    if (err.statusCode && err.statusCode < 500) return reply.status(err.statusCode).send({ error: err.message });
    if (err.code === '23505') return reply.status(409).send({ error: 'Conflit : cet enregistrement existe déjà.' });
    req.log.error({ err: { message: err.message, code: err.code } }, 'erreur serveur');
    // Journalisé pour l'alerte par e-mail (sans jamais gêner la réponse)
    journaliserErreur(db, {
      source: 'serveur', message: `${req.method} ${req.routeOptions?.url || req.url.split('?')[0]} : ${err.message || err.code || 'erreur'}`,
      stack: err.stack, url: req.routeOptions?.url || req.url.split('?')[0], userId: req.auth?.uid, ip: req.ip,
      userAgent: req.headers['user-agent'], ctx: { status: 500, methode: req.method, route: req.routeOptions?.url }
    }).catch(() => {});
    return reply.status(500).send({ error: 'Erreur interne.' });
  });

  app.get('/health', async () => {
    await db.query('SELECT 1');
    return { ok: true };
  });

  // ------------------------------------------------------------------ authentification
  app.addHook('preHandler', async (req) => {
    if (!req.url.startsWith('/v1/') || req.method === 'OPTIONS') return; // les pré-requêtes CORS n'ont pas de jeton
    const header = req.headers.authorization || '';
    const m = /^Bearer\s+(.+)$/i.exec(header);
    if (!m) fail(401, 'Jeton manquant.');
    try {
      // Sessions créées par SMS (Twilio) ou jetons Firebase (Google, e-mail)
      req.auth = estJetonSession(m![1]) ? await lireSession(secret, m![1]) : await verify(m![1]);
    } catch {
      fail(401, 'Jeton invalide ou expiré.');
    }
  });

  await app.register(rateLimit, {
    max: deps.rateLimitMax ?? 1200,
    timeWindow: '1 minute',
    hook: 'preHandler',
    keyGenerator: (req) => req.auth?.uid || req.ip,
    allowList: (req) => !req.url.startsWith('/v1/')
  });

  // ------------------------------------------------------------------ utilitaires métier
  async function loadActor(q: Queryable, auth: AuthUser): Promise<Actor> {
    const rows = await q.query<any>(`SELECT role, status FROM users WHERE id = $1 AND deleted_at IS NULL`, [auth.uid]);
    const adm = await q.query(`SELECT 1 FROM admins WHERE id = $1 AND deleted_at IS NULL`, [auth.uid]);
    const isSuper = isSuperAdmin(auth);
    // Administrateurs désignés par numéro (ADMIN_TELEPHONES=+24106123456,…) : utile avec la connexion par SMS
    const parTel = !!auth.phone && (process.env.ADMIN_TELEPHONES || '').split(',').map(x => x.trim()).filter(Boolean).includes(auth.phone);
    const isAdmin = isSuper || parTel || adm.length > 0;
    const role = isAdmin ? 'admin' : rows[0]?.role || 'user';
    return { auth, isSuper, isAdmin, isStaff: isAdmin || role === 'validator', role, status: rows[0]?.status || 'active', exists: rows.length > 0 };
  }
  const actorOf = (req: FastifyRequest) => loadActor(db, req.auth!);

  /** Crée le profil avec les valeurs initiales s'il n'existe pas ; le super-admin reçoit toujours le rôle admin. */
  async function ensureUser(q: Queryable, auth: AuthUser): Promise<any> {
    const now = new Date().toISOString();
    const superAdmin = isSuperAdmin(auth);
    const d = NEW_USER_PROTECTED_DEFAULTS;
    await q.query(
      `INSERT INTO users (id, email, role, status, suspicion_score, xp, level, level_index, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [auth.uid, auth.email, superAdmin ? 'admin' : d.role, d.status, d.suspicionScore, d.xp, d.level, d.levelIndex,
        JSON.stringify({
          displayName: auth.name || (auth.email ? auth.email.split('@')[0] : ''),
          fullName: auth.name || '',
          photoURL: auth.picture || '',
          registrationCompleted: false,
          streakDays: 0,
          createdAt: now
        })]
    );
    if (auth.email) await q.query(`UPDATE users SET email = $2 WHERE id = $1 AND email IS DISTINCT FROM $2`, [auth.uid, auth.email]);
    if (auth.phone) await q.query(`UPDATE users SET data = data || jsonb_build_object('phone', $2::text) WHERE id = $1 AND (data->>'phone') IS DISTINCT FROM $2`, [auth.uid, auth.phone]);
    if (superAdmin) {
      await q.query(`UPDATE users SET role = 'admin' WHERE id = $1 AND role <> 'admin'`, [auth.uid]);
      await q.query(
        `INSERT INTO admins (id, data) VALUES ($1, '{"role":"admin"}') ON CONFLICT (id) DO UPDATE SET deleted_at = NULL`,
        [auth.uid]
      );
    }
    return (await q.query<any>(`SELECT * FROM users WHERE id = $1`, [auth.uid]))[0];
  }

  /** Verrouille des profils dans l'ordre des identifiants (évite les blocages croisés entre validateurs). */
  async function lockUsers(q: Queryable, ids: string[]): Promise<Map<string, any>> {
    const rows = await q.query<any>(`SELECT * FROM users WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`, [[...new Set(ids)]]);
    return new Map(rows.map(r => [r.id, r]));
  }

  async function rewardContext(q: Queryable) {
    const ch = await q.query<any>(`SELECT id, data FROM challenges WHERE deleted_at IS NULL`);
    const bd = await q.query<any>(`SELECT id, data FROM badges WHERE deleted_at IS NULL`);
    return {
      challenges: ch.map(r => ({ ...r.data, id: r.id }) as WeeklyChallenge),
      badges: bd.map(r => ({ ...r.data, id: r.id }) as Badge)
    };
  }

  async function itemOf(q: Queryable, itemId?: string): Promise<QuestionnaireItem | undefined> {
    if (!itemId) return undefined;
    const r = (await q.query<any>(`SELECT id, data FROM items WHERE id = $1`, [itemId]))[0];
    return r ? ({ ...r.data, id: r.id } as QuestionnaireItem) : undefined;
  }

  function applyUserPatch(q: Queryable, id: string, patch: Partial<UserProfile>) {
    return q.query(
      `UPDATE users SET xp = $2, level = $3, level_index = $4, contributions_count = $5, recordings_count = $6,
              weekly_progress = $7, completed_challenges = $8, badges = $9, last_contribution_date = $10
       WHERE id = $1`,
      [id, patch.xp, patch.level, patch.levelIndex, patch.contributionsCount, patch.recordingsCount,
        JSON.stringify(patch.weeklyProgress || {}), JSON.stringify(patch.completedChallenges || []),
        JSON.stringify(patch.badges || []), patch.lastContributionDate ?? null]
    );
  }

  /** Valide un chemin de média pour l'utilisateur donné ; renvoie un message d'erreur ou null. */
  function mediaPathError(path: unknown, uid: string, isAdmin: boolean, kind?: 'recording' | 'image'): string | null {
    if (!str(path) || path.length > 300 || path.includes('..') || path.startsWith('/')) return 'Chemin invalide.';
    if (path.startsWith('recordings/')) {
      if (kind === 'image') return 'Chemin incompatible avec le type de fichier.';
      return new RegExp(`^recordings/${uid.replace(/[^A-Za-z0-9_-]/g, '\\$&')}/[A-Za-z0-9._-]{1,200}$`).test(path)
        ? null : 'Vous ne pouvez envoyer des enregistrements que dans votre propre dossier.';
    }
    if (path.startsWith('images/')) {
      if (kind === 'recording') return 'Chemin incompatible avec le type de fichier.';
      if (!isAdmin) return 'Les images sont réservées aux administrateurs.';
      return /^images\/[A-Za-z0-9._\/-]{1,250}$/.test(path) ? null : 'Chemin invalide.';
    }
    return 'Dossier inconnu.';
  }

  // Interrupteurs de modules : route dans contenus.ts (variables du serveur puis réglages de la console)

  // ------------------------------------------------------------------ profil
  app.get('/v1/me', async (req) => {
    const row = await db.tx(q => ensureUser(q, req.auth!));
    return userRow(row);
  });

  app.patch('/v1/me', async (req) => {
    const body = (req.body || {}) as Record<string, unknown>;
    // Champs protégés ignorés (jamais d'erreur : un ancien client peut encore les envoyer)
    const safe = cleanData(stripProtectedUserFields(body as Partial<UserProfile>, 'user') as Record<string, unknown>, ['email', 'createdAt', 'role']);
    const row = await db.tx(async q => {
      await ensureUser(q, req.auth!);
      await q.query(`UPDATE users SET data = data || $2::jsonb WHERE id = $1`, [req.auth!.uid, JSON.stringify(safe)]);
      return (await q.query<any>(`SELECT * FROM users WHERE id = $1`, [req.auth!.uid]))[0];
    });
    return userRow(row);
  });

  // ------------------------------------------------------------------ phrases écartées et journal des fiches (administrateurs)
  app.get('/v1/admin/phrases-ecartees', async (req) => {
    const a = await actorOf(req);
    if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.');
    const liste = await db.query<any>(`SELECT key, myene_text, reason, created_by, created_at FROM rejected_phrases ORDER BY created_at, key`);
    // Fiches de la base qui portent actuellement une phrase écartée (à corriger ou supprimer)
    const cles = new Set(liste.map(r => r.key as string));
    const fiches = await db.query<any>(`SELECT id, data->>'myeneText' AS m, updated_at FROM items WHERE deleted_at IS NULL AND data->>'myeneText' IS NOT NULL`);
    const presentes = fiches.filter(f => cles.has(cleTexte(f.m))).slice(0, 200).map(f => ({ id: f.id, myeneText: f.m, updatedAt: iso(f.updated_at) }));
    return { phrases: liste.map(r => ({ key: r.key, myeneText: r.myene_text, reason: r.reason, createdBy: r.created_by, createdAt: iso(r.created_at) })), fichesConcernees: presentes };
  });

  app.post('/v1/admin/phrases-ecartees', async (req, reply) => {
    const a = await actorOf(req);
    if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.');
    const b = (req.body || {}) as { myeneText?: string; reason?: string };
    if (!str(b.myeneText) || !b.myeneText!.trim() || b.myeneText!.length > 500) fail(400, 'myeneText requis (500 caractères maximum).');
    await db.query(`INSERT INTO rejected_phrases (key, myene_text, reason, created_by) VALUES ($1,$2,$3,$4)
                    ON CONFLICT (key) DO UPDATE SET reason = EXCLUDED.reason`, [cleTexte(b.myeneText), b.myeneText!.trim(), String(b.reason || '').slice(0, 500), a.auth.uid]);
    return reply.status(201).send({ ok: true, key: cleTexte(b.myeneText) });
  });

  app.delete('/v1/admin/phrases-ecartees/:key', async (req, reply) => {
    const a = await actorOf(req);
    if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.');
    await db.query(`DELETE FROM rejected_phrases WHERE key = $1`, [(req.params as { key: string }).key]);
    return reply.status(204).send();
  });

  app.get('/v1/admin/audit-fiches', async (req) => {
    const a = await actorOf(req);
    if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.');
    const qs = req.query as { item?: string; action?: string; limit?: string };
    const limit = Math.min(Math.max(Number(qs.limit) || 100, 1), 500);
    const rows = await db.query<any>(
      `SELECT id, at, item_id, action, actor, source, old_myene, new_myene, old_french, new_french, client_updated_at, server_updated_at, detail
         FROM item_audit WHERE ($1::text IS NULL OR item_id = $1) AND ($2::text IS NULL OR action = $2) ORDER BY at DESC, id DESC LIMIT $3`,
      [qs.item || null, qs.action || null, limit]
    );
    return rows.map(r => ({ id: Number(r.id), at: iso(r.at), itemId: r.item_id, action: r.action, actor: r.actor, source: r.source, ancienMyene: r.old_myene, nouveauMyene: r.new_myene,
      ancienFrancais: r.old_french, nouveauFrancais: r.new_french, dateClient: r.client_updated_at, dateServeur: r.server_updated_at ? iso(r.server_updated_at) : null, detail: r.detail }));
  });

  // Mes contributions seulement (application mobile : évite de télécharger celles des autres)
  app.get('/v1/me/contributions', async (req) => {
    const rows = await db.query<any>(
      `SELECT * FROM contributions WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1000`,
      [req.auth!.uid]
    );
    return rows.map(contributionRow);
  });

  // Statistiques des modérations faites par le validateur connecté (lui seul y a accès ; l'administrateur voit les siennes)
  app.get('/v1/me/moderation-stats', async (req) => {
    const a = await actorOf(req);
    if (!a.isStaff) fail(403, 'Réservé aux validateurs et administrateurs.');
    const uid = a.auth.uid;
    const parStatut = await db.query<any>(
      `SELECT status, count(*)::int AS n FROM contributions WHERE validator_id = $1 AND deleted_at IS NULL GROUP BY status`, [uid]);
    const periodes = (await db.query<any>(
      `SELECT count(*) FILTER (WHERE (data->>'validatedAt')::timestamptz >= date_trunc('day', now()))::int AS aujourdhui,
              count(*) FILTER (WHERE (data->>'validatedAt')::timestamptz >= now() - interval '7 days')::int AS sept_jours,
              count(*) FILTER (WHERE (data->>'validatedAt')::timestamptz >= now() - interval '30 days')::int AS trente_jours,
              max(data->>'validatedAt') AS derniere
         FROM contributions WHERE validator_id = $1 AND deleted_at IS NULL AND data ? 'validatedAt'`, [uid]))[0] || {};
    const enAttente = (await db.query<any>(`SELECT count(*)::int AS n FROM contributions WHERE status = 'pending' AND deleted_at IS NULL AND user_id <> $1`, [uid]))[0]?.n || 0;
    const compteur = (await db.query<any>(`SELECT validations_count FROM users WHERE id = $1`, [uid]))[0]?.validations_count || 0;
    const counts: Record<string, number> = {};
    let total = 0;
    for (const r of parStatut) { counts[r.status] = r.n; total += r.n; }
    return {
      total, counts, enAttente, validationsCount: compteur,
      aujourdhui: periodes.aujourdhui || 0, septJours: periodes.sept_jours || 0, trenteJours: periodes.trente_jours || 0,
      derniere: periodes.derniere || null,
    };
  });

  // File de modération (application mobile) : contributions par statut + compteurs, réservé au personnel
  app.get('/v1/admin/contributions', async (req) => {
    const a = await actorOf(req);
    if (!a.isStaff) fail(403, 'Réservé aux validateurs et administrateurs.');
    const qs = req.query as { status?: string; limit?: string; offset?: string };
    const status = qs.status || 'pending';
    if (status !== 'all' && !CONTRIBUTION_STATUSES.includes(status)) fail(400, 'Statut invalide.');
    const limit = Math.min(Math.max(Number(qs.limit) || 30, 1), 100);
    const offset = Math.max(Number(qs.offset) || 0, 0);
    const rows = await db.query<any>(
      `SELECT * FROM contributions WHERE deleted_at IS NULL AND ($1 = 'all' OR status = $1)
       ORDER BY created_at, id LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );
    const counts: Record<string, number> = {};
    for (const r of await db.query<any>(`SELECT status, count(*) AS n FROM contributions WHERE deleted_at IS NULL GROUP BY status`)) counts[r.status] = Number(r.n);
    return { records: rows.map(contributionRow), counts };
  });

  // Jeux sonores : enregistrements VALIDÉS (contribution approuvée, voix non contestée) dont l'auteur n'a pas retiré
  // son autorisation d'usage de la voix. Aucun nom de contributeur n'est renvoyé.
  app.get('/v1/games/audio', async (req) => {
    const qs = req.query as { dialect?: string; limit?: string };
    const limit = Math.min(Math.max(Number(qs.limit) || 12, 1), 40);
    const dialect = qs.dialect && /^[a-z]{3,12}$/.test(qs.dialect) ? qs.dialect : null;
    const rows = await db.query<any>(
      `SELECT c.id, c.item_id, c.audio_storage_path, i.dialect,
              i.data->>'myeneText' AS myene_text, i.data->>'frenchText' AS french_text
         FROM contributions c
         JOIN items i ON i.id = c.item_id AND i.deleted_at IS NULL AND i.status = 'active'
         JOIN users u ON u.id = c.user_id AND u.status = 'active'
        WHERE c.deleted_at IS NULL AND c.status = 'approved' AND c.audio_storage_path IS NOT NULL
          AND COALESCE(c.data->>'pronunciationVerdict', 'correct') <> 'incorrect'
          AND COALESCE(u.data->>'consentVoiceUsage', 'true') <> 'false'
          AND ($1::text IS NULL OR i.dialect = $1)
        ORDER BY random() LIMIT $2`,
      [dialect, limit]
    );
    return rows.map(r => ({
      id: r.id, itemId: r.item_id, dialect: r.dialect, myeneText: r.myene_text, frenchText: r.french_text,
      audioUrl: `media:${r.audio_storage_path}`
    }));
  });

  // Annotations VALIDÉES des fiches (Ezango) : tribu d'une variante, orthographe proposée, nuances de sens français.
  // Contributions approuvées (ou texte approuvé) seulement, sans identité de contributeur.
  app.get('/v1/items/annotations', async () => {
    const rows = await db.query<any>(
      `SELECT c.item_id, c.data->>'dialectVariant' AS variant, u.data->>'tribe' AS user_tribe,
              c.data->>'proposedSpelling' AS spelling, c.data->>'proposedFrenchMeaning' AS french_meaning,
              c.data->>'secondaryMeaning' AS secondary
         FROM contributions c
         LEFT JOIN users u ON u.id = c.user_id
        WHERE c.deleted_at IS NULL AND c.item_id IS NOT NULL AND c.status IN ('approved', 'text_approved_audio_revision')
        ORDER BY c.created_at DESC LIMIT 5000`
    );
    return rows.map(r => ({
      itemId: r.item_id, variant: r.variant || r.user_tribe || null, spelling: r.spelling || null,
      frenchMeaning: r.french_meaning || null, secondaryMeaning: r.secondary || null
    }));
  });

  app.get('/v1/leaderboard', async () => {
    const rows = await db.query<any>(`SELECT * FROM leaderboard ORDER BY xp DESC, id LIMIT 500`);
    return rows.map(r => ({
      id: r.id, displayName: r.display_name, fullName: r.full_name, photoURL: r.photo_url, tribe: r.tribe,
      villageOfOrigin: r.village_of_origin, xp: r.xp, level: r.level, levelIndex: r.level_index,
      contributionsCount: r.contributions_count, recordingsCount: r.recordings_count,
      validationsCount: r.validations_count, badgesCount: r.badges_count, updatedAt: iso(r.updated_at)
    }));
  });

  // ------------------------------------------------------------------ gestion des utilisateurs
  const TRANCHES_AGE: [string, number, number][] = [
    ['moins18', 0, 17], ['18-25', 18, 25], ['26-35', 26, 35], ['36-50', 36, 50], ['51-65', 51, 65], ['66plus', 66, 200],
  ];
  const ageDe = (d: any): number | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d?.birthDate || ''));
    if (!m) return null;
    const n = new Date();
    let age = n.getUTCFullYear() - Number(m[1]);
    if (n.getUTCMonth() + 1 < Number(m[2]) || (n.getUTCMonth() + 1 === Number(m[2]) && n.getUTCDate() < Number(m[3]))) age--;
    return age >= 0 && age <= 120 ? age : null;
  };
  const trancheDe = (age: number | null) => (age === null ? 'inconnu' : TRANCHES_AGE.find(t => age >= t[1] && age <= t[2])![0]);

  app.get('/v1/users', async (req) => {
    const a = await actorOf(req);
    if (!a.isStaff) fail(403, 'Réservé aux validateurs et administrateurs.');
    const qs = req.query as { page?: string; limit?: string; q?: string; ethnie?: string; age?: string; role?: string; status?: string };
    const rows = await db.query<any>(`SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at, id`);
    // Sans `page` : liste complète (anciens clients). Avec `page` : liste paginée et filtrée.
    if (!qs.page) return rows.map(userRow);
    const t = (qs.q || '').trim().toLowerCase();
    const filtres = rows.filter(r => {
      const d = r.data || {};
      if (qs.role && r.role !== qs.role) return false;
      if (qs.status && r.status !== qs.status) return false;
      if (qs.ethnie && (d.tribe || 'inconnue') !== qs.ethnie) return false;
      if (qs.age && trancheDe(ageDe(d)) !== qs.age) return false;
      if (t && !`${d.fullName || ''} ${d.displayName || ''} ${r.email || ''} ${d.contact || ''}`.toLowerCase().includes(t)) return false;
      return true;
    });
    const limit = Math.min(100, Math.max(1, Math.trunc(Number(qs.limit)) || 30));
    const pages = Math.max(1, Math.ceil(filtres.length / limit));
    const page = Math.min(pages, Math.max(1, Math.trunc(Number(qs.page)) || 1));
    return { items: filtres.slice((page - 1) * limit, page * limit).map(userRow), total: filtres.length, page, pages, limit };
  });

  /** Statistiques des contributions : volumes, heures enregistrées, questions couvertes, par ethnie / thème / période. */
  app.get('/v1/admin/contribution-stats', async (req) => {
    const a = await actorOf(req);
    if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.');
    const rows = await db.query<any>(
      `SELECT c.id, c.item_id, c.user_id, c.status, c.audio_storage_path, c.created_at, c.data, i.category AS theme
         FROM contributions c LEFT JOIN items i ON i.id = c.item_id WHERE c.deleted_at IS NULL`);
    const totalItems = Number((await db.query<any>(`SELECT count(*)::int AS n FROM items WHERE deleted_at IS NULL`))[0]?.n || 0);
    const dec = (n: number) => Math.round(n * 100) / 100;
    const vide = () => ({ contributions: 0, approuvees: 0, enregistrements: 0, secondes: 0, secondesApprouvees: 0, contributeurs: new Set<string>() });
    const cumul = (g: ReturnType<typeof vide>, r: any, sec: number, audio: boolean) => {
      g.contributions++; g.contributeurs.add(r.user_id);
      if (r.status === 'approved') g.approuvees++;
      if (audio) { g.enregistrements++; g.secondes += sec; if (r.status === 'approved' || r.status === 'audio_approved_text_revision') g.secondesApprouvees += sec; }
    };
    const sortie = (g: ReturnType<typeof vide>) => ({
      contributions: g.contributions, approuvees: g.approuvees, enregistrements: g.enregistrements,
      heures: dec(g.secondes / 3600), heuresApprouvees: dec(g.secondesApprouvees / 3600), contributeurs: g.contributeurs.size,
    });
    const global = vide(), parEthnie: Record<string, ReturnType<typeof vide>> = {}, parTheme: Record<string, ReturnType<typeof vide>> = {};
    const parStatut: Record<string, number> = {}, parJour: Record<string, number> = {}, parUtilisateur: Record<string, { nom: string; n: number; sec: number }> = {};
    const questions = new Set<string>(), questionsApprouvees = new Set<string>();
    const maintenant = Date.now(), jour = 86_400_000;
    const periode = { aujourdhui: 0, septJours: 0, trenteJours: 0 };
    for (const r of rows) {
      const d = r.data || {};
      const audio = !!r.audio_storage_path;
      const sec = audio ? Math.max(0, Number(d.audioDuration) || 0) : 0;
      cumul(global, r, sec, audio);
      cumul((parEthnie[d.userTribe || 'inconnue'] ||= vide()), r, sec, audio);
      cumul((parTheme[r.theme || 'autre'] ||= vide()), r, sec, audio);
      parStatut[r.status] = (parStatut[r.status] || 0) + 1;
      if (r.item_id) { questions.add(r.item_id); if (r.status === 'approved') questionsApprouvees.add(r.item_id); }
      const age = maintenant - new Date(r.created_at).getTime();
      if (age < jour) periode.aujourdhui++;
      if (age < 7 * jour) periode.septJours++;
      if (age < 30 * jour) { periode.trenteJours++; const k = new Date(r.created_at).toISOString().slice(0, 10); parJour[k] = (parJour[k] || 0) + 1; }
      const u = (parUtilisateur[r.user_id] ||= { nom: d.userDisplayName || r.user_id, n: 0, sec: 0 });
      u.n++; u.sec += sec;
    }
    const mapper = (m: Record<string, ReturnType<typeof vide>>) => Object.fromEntries(Object.entries(m).map(([k, g]) => [k, sortie(g)]));
    return {
      ...sortie(global), parStatut, periode,
      questions: { total: totalItems, avecContribution: questions.size, avecContributionApprouvee: questionsApprouvees.size },
      parEthnie: mapper(parEthnie), parTheme: mapper(parTheme),
      parJour: Object.entries(parJour).sort().map(([jour, n]) => ({ jour, n })),
      topContributeurs: Object.values(parUtilisateur).sort((x, y) => y.n - x.n).slice(0, 10).map(u => ({ nom: u.nom, contributions: u.n, heures: dec(u.sec / 3600) })),
    };
  });

  /** Répartition de la communauté par ethnie et par tranche d'âge (et croisement des deux). */
  app.get('/v1/users/segments', async (req) => {
    const a = await actorOf(req);
    if (!a.isStaff) fail(403, 'Réservé aux validateurs et administrateurs.');
    const rows = await db.query<any>(`SELECT data FROM users WHERE deleted_at IS NULL`);
    const parEthnie: Record<string, number> = {}, parAge: Record<string, number> = {}, croise: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const e = r.data?.tribe || 'inconnue', g = trancheDe(ageDe(r.data));
      parEthnie[e] = (parEthnie[e] || 0) + 1;
      parAge[g] = (parAge[g] || 0) + 1;
      (croise[e] ||= {})[g] = (croise[e][g] || 0) + 1;
    }
    return { total: rows.length, parEthnie, parAge, croise };
  });

  app.get('/v1/users/:id', async (req) => {
    const { id } = req.params as { id: string };
    const a = await actorOf(req);
    if (id !== a.auth.uid && !a.isStaff) fail(403, 'Vous ne pouvez lire que votre propre profil.');
    const r = (await db.query<any>(`SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`, [id]))[0];
    if (!r) fail(404, 'Profil introuvable.');
    return userRow(r);
  });

  app.patch('/v1/users/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = (req.body || {}) as Record<string, any>;
    const a = await actorOf(req);
    if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.');
    if (body.role !== undefined && !ROLES.includes(body.role)) fail(400, 'Rôle invalide.');
    if (body.status !== undefined && !ACCOUNT_STATUSES.includes(body.status)) fail(400, 'Statut invalide.');
    const row = await db.tx(async q => {
      const cur = (await q.query<any>(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [id]))[0];
      if (!cur) fail(404, 'Profil introuvable.');
      const sets: string[] = [];
      const vals: unknown[] = [id];
      const set = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
      if (body.role !== undefined) {
        // Le super-administrateur reste admin quoi qu'il arrive
        set('role', cur.email && isSuperAdmin({ email: cur.email, emailVerified: true }) ? 'admin' : body.role);
      }
      if (body.status !== undefined) set('status', body.status);
      if (body.suspicionScore !== undefined) set('suspicion_score', Math.max(0, Math.trunc(Number(body.suspicionScore) || 0)));
      if (body.xp !== undefined) {
        const xp = Math.max(0, Math.trunc(Number(body.xp) || 0));
        set('xp', xp);
        if (body.levelIndex === undefined) { const l = getLevelForXp(xp); set('level', l.name); set('level_index', l.index); }
      }
      if (body.levelIndex !== undefined) {
        const l = [1, 2, 3, 4, 5].includes(body.levelIndex) ? getLevelForXp([0, 150, 450, 1000, 2500][body.levelIndex - 1]) : fail(400, 'Niveau invalide.');
        set('level', l.name); set('level_index', l.index);
      }
      if (body.badges !== undefined) set('badges', JSON.stringify(Array.isArray(body.badges) ? body.badges.map(String) : []));
      for (const [key, col] of [['contributionsCount', 'contributions_count'], ['recordingsCount', 'recordings_count'], ['validationsCount', 'validations_count']] as const) {
        if (body[key] !== undefined) set(col, Math.max(0, Math.trunc(Number(body[key]) || 0)));
      }
      if (body.weeklyProgress !== undefined) set('weekly_progress', JSON.stringify(body.weeklyProgress || {}));
      if (body.completedChallenges !== undefined) set('completed_challenges', JSON.stringify(body.completedChallenges || []));
      const rest = cleanData(body, [...PROTECTED_USER_FIELDS, 'email', 'createdAt']);
      if (Object.keys(rest).length) set('data', JSON.stringify({ ...cur.data, ...rest }));
      if (sets.length) await q.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $1`, vals);
      if (body.role !== undefined) {
        if (body.role === 'admin') {
          await q.query(`INSERT INTO admins (id, data) VALUES ($1, '{"role":"admin"}') ON CONFLICT (id) DO UPDATE SET deleted_at = NULL`, [id]);
        } else if (!(cur.email && isSuperAdmin({ email: cur.email, emailVerified: true }))) {
          await q.query(`UPDATE admins SET deleted_at = clock_timestamp() WHERE id = $1 AND deleted_at IS NULL`, [id]);
        }
      }
      return (await q.query<any>(`SELECT * FROM users WHERE id = $1`, [id]))[0];
    });
    notify('users');
    return userRow(row);
  });

  // ------------------------------------------------------------------ statistiques de fréquentation
  // Collecte publique (visiteurs non connectés compris) ; sendBeacon envoie du text/plain pour éviter la pré-requête CORS.
  app.addContentTypeParser('text/plain', { parseAs: 'string' }, (_req, body, done) => {
    try { done(null, JSON.parse(String(body))); } catch { done(null, {}); }
  });
  app.post('/pub/collect', async (req, reply) => {
    if (tropDeRequetes(req.ip)) return reply.status(429).send({ error: 'Trop de requêtes.' });
    try { await enregistrerVisite(db, req.ip, req.body); } catch (err: any) { req.log.warn({ msg: err?.message }, 'collecte ignorée'); }
    return reply.status(204).send();
  });
  // Erreurs signalées par les navigateurs (script en échec, envoi audio refusé, synchronisation impossible…)
  app.post('/pub/erreur', async (req, reply) => {
    if (tropDeRequetes(`err:${req.ip}`)) return reply.status(429).send({ error: 'Trop de requêtes.' });
    const b: any = req.body || {};
    try {
      await journaliserErreur(db, {
        source: 'navigateur', message: b.message, stack: b.stack, url: b.url, userId: b.uid, ip: req.ip,
        userAgent: req.headers['user-agent'], ctx: b.ctx
      });
    } catch (err: any) { req.log.warn({ msg: err?.message }, 'erreur navigateur ignorée'); }
    return reply.status(204).send();
  });
  app.get('/v1/admin/analytics', async (req) => {
    const a = await actorOf(req);
    if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.');
    return lireStatistiques(db, Number((req.query as any).days) || 30);
  });

  // Ordre de présentation des fiches : les moins répondues d'abord (tous contributeurs confondus) ; à égalité, les 10 phrases de départ
  // (« Mbôluani »…) d'abord, puis par identifiant.
  app.get('/v1/items/ordre', async () => {
    const rows = await db.query<any>(
      `SELECT t.id FROM items t
       LEFT JOIN (SELECT item_id, count(*)::int AS n FROM contributions WHERE deleted_at IS NULL GROUP BY item_id) c ON c.item_id = t.id
       WHERE t.deleted_at IS NULL
       ORDER BY COALESCE(c.n, 0), COALESCE(t.data->>'createdBy' = '${SEED_CREATOR}', false) DESC, t.id`);
    return { ids: rows.map(r => r.id as string) };
  });

  // ------------------------------------------------------------------ synchronisation
  app.get('/v1/sync/:collection', async (req) => {
    const { collection } = req.params as { collection: string };
    const qs = req.query as { since?: string; limit?: string; epoch?: string; order?: string; offset?: string };
    if (!isSyncTable(collection)) fail(404, 'Collection inconnue.');
    if (collection === 'users') {
      const a = await actorOf(req);
      if (!a.isStaff) fail(403, 'Réservé aux validateurs et administrateurs.');
    }
    const limit = Math.min(Math.max(Number(qs.limit) || 1000, 1), 5000);
    // « Époque » des données : quand elle change (purge directe en base), les appareils repartent de zéro
    const epoch = (await db.query<any>(`SELECT data->>'value' AS v FROM metrics WHERE id = 'sync_epoch'`))[0]?.v || '0';
    const reset = !!qs.since && qs.epoch !== epoch;
    let sinceTs: string | null = null;
    let sinceId = '';
    if (qs.since && !reset) {
      const [ts, id] = String(qs.since).split('|');
      if (Number.isNaN(Date.parse(ts))) fail(400, 'Paramètre since invalide.');
      sinceTs = ts;
      sinceId = id || '';
    }
    // Premier téléchargement des fiches : les moins répondues d'abord (couverture rapide de la langue).
    // Pagination par position ; `deltaCursor` (pris sur la première page) sert ensuite aux synchronisations par différences.
    if (collection === 'items' && qs.order === 'rarete') {
      const offset = Math.max(Number(qs.offset) || 0, 0);
      // Anti-aspiration du corpus : au plus 6 téléchargements complets par compte et par jour
      if (offset === 0 && telechargementsTropNombreux(req.auth!.uid)) fail(429, 'Trop de téléchargements complets aujourd’hui. Réessayez demain.');
      const rows = await db.query<any>(
        // Le tri porte sur (identifiant, nombre de réponses) seulement ; les fiches complètes ne sont lues que pour la page demandée
        `SELECT t.*, ${CURSOR_SQL} AS _cur FROM (
           SELECT i.id, COALESCE(c.n, 0) AS n, (i.data->>'createdBy' = '${SEED_CREATOR}') AS depart FROM items i
           LEFT JOIN (SELECT item_id, count(*)::int AS n FROM contributions WHERE deleted_at IS NULL GROUP BY item_id) c ON c.item_id = i.id
           WHERE i.deleted_at IS NULL ORDER BY COALESCE(c.n, 0), COALESCE(i.data->>'createdBy' = '${SEED_CREATOR}', false) DESC, i.id OFFSET $1 LIMIT $2
         ) o JOIN items t ON t.id = o.id ORDER BY o.n, COALESCE(o.depart, false) DESC, o.id`, [offset, limit]);
      const head = (await db.query<any>(
        `SELECT ${CURSOR_SQL} AS _cur, t.id FROM items t ORDER BY t.updated_at DESC, t.id DESC LIMIT 1`))[0];
      const n = Number((await db.query<any>(`SELECT count(*) AS n FROM items WHERE deleted_at IS NULL`))[0].n);
      return {
        total: Math.max(n - offset, rows.length),
        records: rows.map(r => serializeRow('items', r)),
        cursor: null,
        deltaCursor: head ? `${head._cur}|${head.id}` : null,
        nextOffset: offset + rows.length,
        hasMore: rows.length === limit,
        epoch,
        reset: false,
        serverTime: new Date().toISOString()
      };
    }
    const rows = await db.query<any>(
      `SELECT t.*, ${CURSOR_SQL} AS _cur FROM ${collection} t
       WHERE ($1::timestamptz IS NULL OR (t.updated_at, t.id) > ($1::timestamptz, $2::text))
       ORDER BY t.updated_at, t.id LIMIT $3`,
      [sinceTs, sinceId, limit]
    );
    const last = rows[rows.length - 1];
    // Nombre total à télécharger (barre de progression), calculé une seule fois : sur la première page d'une synchro
    const total = rows.length === limit || sinceTs === null
      ? Number((await db.query<any>(
          `SELECT count(*) AS n FROM ${collection} t WHERE ($1::timestamptz IS NULL OR (t.updated_at, t.id) > ($1::timestamptz, $2::text))`,
          [sinceTs, sinceId]
        ))[0].n)
      : rows.length;
    return {
      total,
      records: rows.map(r => serializeRow(collection as SyncTable, r)),
      cursor: last ? `${last._cur}|${last.id}` : (reset ? null : (qs.since ?? null)),
      hasMore: rows.length === limit,
      epoch,
      reset,
      serverTime: new Date().toISOString()
    };
  });

  // ------------------------------------------------------------------ contributions
  app.post('/v1/contributions', async (req, reply) => {
    const body = (req.body || {}) as Record<string, any>;
    const uid = req.auth!.uid;
    const id = body.id === undefined ? `c_${uid.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : body.id;
    if (!str(id) || !ID_RE.test(id)) fail(400, 'Identifiant invalide.');
    if (body.audioStoragePath) {
      const err = mediaPathError(body.audioStoragePath, uid, false, 'recording');
      if (err) fail(400, err);
    }
    const row = await db.tx(async q => {
      const user = await ensureUser(q, req.auth!);
      if (user.status === 'suspended') fail(403, 'Compte suspendu.');
      const u = userRow(user);
      if (!u.termsAccepted || !u.dataUsageAccepted) fail(403, 'Le consentement aux conditions et à l\'usage des données est requis.');
      const prior = (await q.query<any>(`SELECT * FROM contributions WHERE id = $1`, [id]))[0];
      if (prior) {
        // Rejeu d'une file hors-ligne : même auteur = même contribution, pas de doublon
        if (prior.user_id !== uid) fail(409, 'Identifiant déjà utilisé.');
        return prior;
      }
      const data = cleanData(body, CONTRIBUTION_SERVER_FIELDS);
      delete data.itemId; delete data.audioStoragePath; delete data.audioMimeType;
      data.createdAt = body.createdAt && !Number.isNaN(Date.parse(body.createdAt)) ? body.createdAt : new Date().toISOString();
      const created = await q.query<any>(
        `INSERT INTO contributions (id, item_id, user_id, status, audio_storage_path, audio_mime_type, data)
         VALUES ($1,$2,$3,'pending',$4,$5,$6) RETURNING *`,
        [id, str(body.itemId) ? body.itemId : null, uid, body.audioStoragePath || null, str(body.audioMimeType) ? body.audioMimeType : null, JSON.stringify(data)]
      );
      return created[0];
    });
    notify('contributions');
    return reply.status(201).send(contributionRow(row));
  });

  app.patch('/v1/contributions/:id', async (req) => {
    const { id } = req.params as { id: string };
    const body = (req.body || {}) as Record<string, any>;
    const a = await actorOf(req);
    const row = await db.tx(async q => {
      const cur = (await q.query<any>(`SELECT * FROM contributions WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, [id]))[0];
      if (!cur) fail(404, 'Contribution introuvable.');
      const own = cur.user_id === a.auth.uid && cur.status === 'pending';
      if (!own && !a.isAdmin) fail(403, 'Vous ne pouvez compléter que vos contributions en attente.');
      if (body.audioStoragePath) {
        const err = mediaPathError(body.audioStoragePath, cur.user_id, false, 'recording');
        if (err) fail(400, err);
      }
      const data = cleanData(body, [...CONTRIBUTION_SERVER_FIELDS, 'itemId', 'audioStoragePath', 'audioMimeType']);
      await q.query(
        `UPDATE contributions SET data = data || $2::jsonb,
                audio_storage_path = COALESCE($3, audio_storage_path), audio_mime_type = COALESCE($4, audio_mime_type)
         WHERE id = $1`,
        [id, JSON.stringify(data), body.audioStoragePath || null, str(body.audioMimeType) ? body.audioMimeType : null]
      );
      return (await q.query<any>(`SELECT * FROM contributions WHERE id = $1`, [id]))[0];
    });
    notify('contributions');
    return contributionRow(row);
  });

  app.delete('/v1/contributions/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const a = await actorOf(req);
    let audioPath: string | null = null;
    await db.tx(async q => {
      const cur = (await q.query<any>(`SELECT * FROM contributions WHERE id = $1 FOR UPDATE`, [id]))[0];
      if (!cur || cur.deleted_at) return;
      const ownPending = cur.user_id === a.auth.uid && cur.status === 'pending';
      if (!ownPending && !a.isAdmin) fail(403, 'Vous ne pouvez supprimer que vos propres contributions en attente de validation.');
      // Retrait des points déjà attribués
      if (cur.rewarded_xp || cur.rewarded_contribution || cur.rewarded_recording) {
        const users = await lockUsers(q, [cur.user_id]);
        const contributor = users.get(cur.user_id);
        if (contributor) {
          const ctx = await rewardContext(q);
          const reward = computeValidationReward({
            contributor: userRow(contributor), contribution: contributionRow(cur), newStatus: 'rejected',
            item: await itemOf(q, cur.item_id), ...ctx
          });
          if (reward.userPatch) await applyUserPatch(q, cur.user_id, reward.userPatch);
        }
      }
      await q.query(
        `UPDATE contributions SET deleted_at = clock_timestamp(), rewarded_xp = 0, rewarded_contribution = 0, rewarded_recording = 0 WHERE id = $1`,
        [id]
      );
      audioPath = cur.audio_storage_path;
    });
    if (audioPath) storage.remove(audioPath).catch(() => {});
    notify('contributions');
    notify('users');
    return reply.status(204).send();
  });

  app.post('/v1/contributions/:id/validate', async (req) => {
    const { id } = req.params as { id: string };
    const body = (req.body || {}) as Record<string, any>;
    if (!VALIDATION_STATUSES.includes(body.status)) fail(400, 'Statut de validation invalide.');
    const a = await actorOf(req);
    if (!a.isStaff) fail(403, 'Seuls les validateurs et administrateurs peuvent évaluer une contribution.');
    if (a.status === 'suspended') fail(403, 'Compte suspendu.');
    const result = await db.tx(async q => {
      const cur = (await q.query<any>(`SELECT * FROM contributions WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, [id]))[0];
      if (!cur) fail(404, 'Contribution introuvable.');
      if (cur.user_id === a.auth.uid) fail(403, 'Vous ne pouvez pas valider votre propre contribution.');
      const validator = (await ensureUser(q, a.auth));
      const users = await lockUsers(q, [cur.user_id, a.auth.uid]);
      const contributor = users.get(cur.user_id);
      const validatorRow = users.get(a.auth.uid) || validator;
      const validatorName = (validatorRow.data?.fullName || validatorRow.data?.displayName || 'Validateur') as string;

      const nowIso = new Date().toISOString();
      const fields: Record<string, unknown> = {
        validatorDisplayName: validatorName,
        validatedAt: nowIso,
        validatorNotes: str(body.validatorNotes) ? body.validatorNotes : '',
      };
      if (body.spellingVerdict) fields.spellingVerdict = body.spellingVerdict;
      if (body.pronunciationVerdict) fields.pronunciationVerdict = body.pronunciationVerdict;
      if (body.spellingVerdict) fields.isSpellingCorrect = body.spellingVerdict === 'correct';
      if (body.pronunciationVerdict) fields.isPronunciationCorrect = body.pronunciationVerdict === 'correct';

      const ctx = await rewardContext(q);
      const before = contributionRow(cur);
      const reward = contributor
        ? computeValidationReward({ contributor: userRow(contributor), contribution: before, newStatus: body.status, item: await itemOf(q, cur.item_id), ...ctx })
        : { userPatch: null, contributionPatch: {} as Partial<Contribution>, completedChallenges: [] };

      const patch = reward.contributionPatch;
      await q.query(
        `UPDATE contributions SET status = $2, validator_id = $3, data = data || $4::jsonb,
                rewarded_xp = $5, rewarded_contribution = $6, rewarded_recording = $7, counted_challenge_ids = $8
         WHERE id = $1`,
        [id, body.status, a.auth.uid, JSON.stringify(fields), patch.rewardedXp ?? cur.rewarded_xp,
          patch.rewardedContribution ?? cur.rewarded_contribution, patch.rewardedRecording ?? cur.rewarded_recording,
          JSON.stringify(patch.countedChallengeIds ?? cur.counted_challenge_ids ?? [])]
      );
      if (reward.userPatch && contributor) await applyUserPatch(q, cur.user_id, reward.userPatch);

      // Compteur du validateur : une seule fois par contribution (un renvoi ne compte pas deux fois)
      const firstByThisValidator = cur.status === 'pending' || cur.validator_id !== a.auth.uid;
      if (firstByThisValidator) {
        const count = (validatorRow.validations_count || 0) + 1;
        await q.query(`UPDATE users SET validations_count = $2, badges = $3 WHERE id = $1`,
          [a.auth.uid, count, JSON.stringify(validationBadgesFor(count, validatorRow.badges || [], ctx.badges))]);
      }
      return {
        contribution: contributionRow((await q.query<any>(`SELECT * FROM contributions WHERE id = $1`, [id]))[0]),
        contributor: contributor ? userRow((await q.query<any>(`SELECT * FROM users WHERE id = $1`, [cur.user_id]))[0]) : null,
        validator: userRow((await q.query<any>(`SELECT * FROM users WHERE id = $1`, [a.auth.uid]))[0]),
        completedChallenges: reward.completedChallenges.map(c => c.id)
      };
    });
    notify('contributions');
    notify('users');
    return result;
  });

  // ------------------------------------------------------------------ import des phrases
  app.post('/v1/items/import', async (req) => {
    const a = await actorOf(req);
    if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.');
    const body = (req.body || {}) as { items?: QuestionnaireItem[]; dryRun?: boolean };
    if (!Array.isArray(body.items)) fail(400, 'items attendu (tableau).');
    if (body.items!.length > 60000) fail(413, 'Trop de phrases pour un seul envoi.');
    const report = await db.tx(q => importItems(q, body.items!, { dryRun: body.dryRun, acteur: a.auth.uid }));
    if (!body.dryRun) notify('items');
    return report;
  });

  // ------------------------------------------------------------------ catalogues (items, clans, villages…)
  const OPEN_CREATE: GenericTable[] = ['clans', 'villages'];

  type Rejet = { rejet: 'ancien' | 'ecartee'; message: string };

  async function upsertGeneric(q: Queryable, table: GenericTable, id: string, body: Record<string, unknown>, a: Actor): Promise<Record<string, unknown> | Rejet> {
    if (!RECORD_ID_RE.test(id)) fail(400, 'Identifiant invalide.');
    // Ligne déjà présente, supprimée ou non : sa dernière modification sert à repérer une écriture périmée
    const ligne = (await q.query<any>(`SELECT updated_at, deleted_at${table === 'items' ? `, data->>'myeneText' AS m, data->>'frenchText' AS f` : ''} FROM ${table} WHERE id = $1`, [id]))[0];
    const exists = !!ligne && !ligne.deleted_at;
    if (!a.isAdmin) {
      // Un contributeur peut AJOUTER son clan / village à l'inscription, jamais modifier
      if (!OPEN_CREATE.includes(table) || exists) fail(403, 'Réservé aux administrateurs.');
    }
    if (table === 'items') {
      const raison = raisonEcartee(await chargerEcartees(q), body.myeneText);
      if (raison) {
        await journaliser(q, [{ itemId: id, action: 'rejete_refusee', acteur: a.auth.uid, source: 'put', nouveauMyene: String(body.myeneText), dateClient: str(body.updatedAt) ? (body.updatedAt as string) : null, detail: raison }]);
        return { rejet: 'ecartee', message: `Phrase écartée : ${raison}` };
      }
    }
    const perime = ligne ? estPlusAncienne(table, body, ligne) : { refus: false, dateClient: null };
    if (perime.refus) {
      if (table === 'items') await journaliser(q, [{ itemId: id, action: 'rejete_ancien', acteur: a.auth.uid, source: 'put', ancienMyene: ligne.m, nouveauMyene: str(body.myeneText) ? (body.myeneText as string) : null, dateClient: perime.dateClient, dateServeur: ligne.updated_at, detail: 'Écriture plus ancienne que la version enregistrée : ignorée.' }]);
      return { rejet: 'ancien', message: "Cette version est plus ancienne que celle du serveur : écriture ignorée. Rechargez les données avant de modifier." };
    }
    const data = cleanData(body);
    if (table === 'items') {
      await q.query(
        `INSERT INTO items (id, source_ref, dialect, category, status, data) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET source_ref = COALESCE(EXCLUDED.source_ref, items.source_ref), dialect = COALESCE(EXCLUDED.dialect, items.dialect),
           category = COALESCE(EXCLUDED.category, items.category), status = EXCLUDED.status, data = items.data || EXCLUDED.data, deleted_at = NULL`,
        [id, str(data.sourceRef) ? data.sourceRef : null, str(data.dialect) ? data.dialect : null, str(data.category) ? data.category : null,
          str(data.status) ? data.status : 'active', JSON.stringify(data)]
      );
    } else {
      await q.query(
        `INSERT INTO ${table} (id, data) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET data = ${table}.data || EXCLUDED.data, deleted_at = NULL`,
        [id, JSON.stringify(data)]
      );
    }
    if (table === 'items' && (!ligne || ligne.deleted_at || ligne.m !== data.myeneText || ligne.f !== data.frenchText)) {
      await journaliser(q, [{ itemId: id, action: ligne ? 'modifie' : 'cree', acteur: a.auth.uid, source: 'put', ancienMyene: ligne?.m ?? null, nouveauMyene: str(data.myeneText) ? (data.myeneText as string) : null, ancienFrancais: ligne?.f ?? null, nouveauFrancais: str(data.frenchText) ? (data.frenchText as string) : null, dateClient: str(body.updatedAt) ? (body.updatedAt as string) : null }]);
    }
    if (table === 'clans' || table === 'villages') {
      await q.query(`UPDATE ${table} SET data = jsonb_set(data, '{createdBy}', to_jsonb($2::text)) WHERE id = $1 AND NOT (data ? 'createdBy')`, [id, a.auth.uid]);
    }
    if (table === 'admins') {
      /* La table admins est tenue par PATCH /v1/users/:id ; l'écriture directe reste réservée aux admins. */
    }
    return genericRow((await q.query<any>(`SELECT * FROM ${table} WHERE id = $1`, [id]))[0]);
  }

  /** Écriture en masse (administrateur) : un seul ordre SQL par lot de 500. */
  async function bulkUpsert(q: Queryable, table: GenericTable, records: Record<string, unknown>[], a: Actor): Promise<{ saved: number; skipped: number }> {
    const seen = new Map<string, Record<string, unknown>>();
    // cleanData retire updatedAt (champ géré par le serveur) : on garde la date portée par l'écriture pour repérer les écritures périmées
    const datesClient = new Map<string, unknown>();
    for (const r of records) {
      const id = String(r.id ?? '');
      if (!RECORD_ID_RE.test(id)) fail(400, `Identifiant invalide : ${id.slice(0, 40)}`);
      seen.set(id, { ...(seen.get(id) || {}), ...cleanData(r) });
      if (r.updatedAt !== undefined) datesClient.set(id, r.updatedAt);
    }
    let entries = [...seen.entries()];
    if (table === 'items') {
      // Une phrase dont le texte myènè est celui d'une phrase du seed n'est pas ajoutée une seconde fois
      const seed = await q.query<any>(`SELECT id, data->>'myeneText' AS m FROM items WHERE deleted_at IS NULL AND data->>'createdBy' = '${SEED_CREATOR}'`);
      const keys = new Map(seed.map(r => [normalizePhraseComparisonKey(r.m || ''), r.id as string]));
      entries = entries.filter(([id, d]) => {
        if (d.createdBy === SEED_CREATOR) return true;
        const owner = keys.get(normalizePhraseComparisonKey(String(d.myeneText || '')));
        return !owner || owner === id;
      });
    }
    // Garde-fous : phrases écartées, et écritures plus anciennes que la version enregistrée (file hors-ligne rejouée trop tard)
    const journal: EntreeJournal[] = [];
    let ignorees = 0;
    const existants = new Map<string, any>();
    for (let i = 0; i < entries.length; i += 1000) {
      const ids = entries.slice(i, i + 1000).map(([id]) => id);
      const rows = await q.query<any>(`SELECT id, updated_at, deleted_at${table === 'items' ? `, data->>'myeneText' AS m, data->>'frenchText' AS f` : ''} FROM ${table} WHERE id = ANY($1::text[])`, [ids]);
      rows.forEach(r => existants.set(r.id, r));
    }
    const ecartees = table === 'items' ? await chargerEcartees(q) : null;
    entries = entries.filter(([id, d0]) => {
      const d = { ...d0, updatedAt: datesClient.get(id) } as Record<string, unknown>;
      if (ecartees) {
        const raison = raisonEcartee(ecartees, d.myeneText);
        if (raison) { ignorees++; journal.push({ itemId: id, action: 'rejete_refusee', acteur: a.auth.uid, source: 'batch', nouveauMyene: String(d.myeneText), dateClient: str(d.updatedAt) ? (d.updatedAt as string) : null, detail: raison }); return false; }
      }
      const ex = existants.get(id);
      const perime = ex ? estPlusAncienne(table, d, ex) : { refus: false, dateClient: null };
      if (perime.refus) {
        ignorees++;
        if (table === 'items') journal.push({ itemId: id, action: 'rejete_ancien', acteur: a.auth.uid, source: 'batch', ancienMyene: ex.m, nouveauMyene: str(d.myeneText) ? (d.myeneText as string) : null, dateClient: perime.dateClient, dateServeur: ex.updated_at, detail: 'Écriture plus ancienne que la version enregistrée : ignorée.' });
        return false;
      }
      if (table === 'items' && (!ex || ex.deleted_at || ex.m !== d.myeneText || ex.f !== d.frenchText)) {
        journal.push({ itemId: id, action: ex ? 'modifie' : 'cree', acteur: a.auth.uid, source: 'batch', ancienMyene: ex?.m ?? null, nouveauMyene: str(d.myeneText) ? (d.myeneText as string) : null, ancienFrancais: ex?.f ?? null, nouveauFrancais: str(d.frenchText) ? (d.frenchText as string) : null, dateClient: str(d.updatedAt) ? (d.updatedAt as string) : null });
      }
      return true;
    });

    for (let i = 0; i < entries.length; i += 500) {
      const part = entries.slice(i, i + 500);
      const ids = part.map(([id]) => id);
      const datas = part.map(([, d]) => JSON.stringify(d));
      if (table === 'items') {
        const col = (k: string) => part.map(([, d]) => (str(d[k]) ? (d[k] as string) : null));
        await q.query(
          `INSERT INTO items (id, source_ref, dialect, category, status, data)
           SELECT v.id, v.source_ref, v.dialect, v.category, COALESCE(v.status, 'active'), v.data
           FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::jsonb[]) AS v(id, source_ref, dialect, category, status, data)
           ON CONFLICT (id) DO UPDATE SET source_ref = COALESCE(EXCLUDED.source_ref, items.source_ref), dialect = COALESCE(EXCLUDED.dialect, items.dialect),
             category = COALESCE(EXCLUDED.category, items.category), status = EXCLUDED.status, data = items.data || EXCLUDED.data, deleted_at = NULL
           WHERE items.data->>'createdBy' IS DISTINCT FROM '${SEED_CREATOR}' OR EXCLUDED.data->>'createdBy' = '${SEED_CREATOR}'`,
          [ids, col('sourceRef'), col('dialect'), col('category'), col('status'), datas]
        );
      } else {
        await q.query(
          `INSERT INTO ${table} (id, data) SELECT * FROM unnest($1::text[], $2::jsonb[])
           ON CONFLICT (id) DO UPDATE SET data = ${table}.data || EXCLUDED.data, deleted_at = NULL`,
          [ids, datas]
        );
      }
    }
    if (journal.length) await journaliser(q, journal);
    return { saved: entries.length, skipped: ignorees };
  }

  app.put('/v1/:collection/:id', async (req) => {
    const { collection, id } = req.params as { collection: string; id: string };
    if (!isGenericTable(collection)) fail(404, 'Collection inconnue.');
    const a = await actorOf(req);
    const out = await db.tx(q => upsertGeneric(q, collection as GenericTable, id, (req.body || {}) as Record<string, unknown>, a));
    if ('rejet' in out) { const r = out as Rejet; fail(r.rejet === 'ancien' ? 409 : 422, r.message); }
    notify(collection);
    return out;
  });

  app.post('/v1/:collection/batch', async (req) => {
    const { collection } = req.params as { collection: string };
    if (!isGenericTable(collection)) fail(404, 'Collection inconnue.');
    const records = ((req.body || {}) as { records?: Record<string, unknown>[] }).records;
    if (!Array.isArray(records) || records.length > 2000) fail(400, 'records attendu (2000 maximum).');
    const a = await actorOf(req);
    const r = await db.tx(async q => {
      if (a.isAdmin) return bulkUpsert(q, collection as GenericTable, records!, a);
      let skipped = 0;
      for (const rec of records!) { const o = await upsertGeneric(q, collection as GenericTable, String(rec.id), rec, a); if ('rejet' in o) skipped++; }
      return { saved: records!.length - skipped, skipped };
    });
    notify(collection);
    return r;
  });

  app.delete('/v1/:collection/:id', async (req, reply) => {
    const { collection, id } = req.params as { collection: string; id: string };
    if (!isGenericTable(collection)) fail(404, 'Collection inconnue.');
    const a = await actorOf(req);
    if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.');
    await db.query(`UPDATE ${collection} SET deleted_at = clock_timestamp() WHERE id = $1 AND deleted_at IS NULL`, [id]);
    notify(collection);
    return reply.status(204).send();
  });

  // ------------------------------------------------------------------ médias (Garage / S3)
  app.post('/v1/media/upload-url', async (req) => {
    const body = (req.body || {}) as { path?: string; contentType?: string; size?: number };
    const a = await actorOf(req);
    if (a.status === 'suspended') fail(403, 'Compte suspendu.');
    const path = body.path;
    const isImage = str(path) && path.startsWith('images/');
    const err = mediaPathError(path, a.auth.uid, a.isAdmin);
    if (err) fail(403, err);
    const ct = str(body.contentType) ? body.contentType.split(';')[0].trim().toLowerCase() : '';
    if (!(isImage ? /^image\/[a-z0-9.+-]+$/ : /^audio\/[a-z0-9.+-]+$/).test(ct)) fail(400, isImage ? 'Seuls les fichiers image sont acceptés.' : 'Seuls les fichiers audio sont acceptés.');
    const size = Number(body.size);
    if (!Number.isFinite(size) || size <= 0) fail(400, 'Taille du fichier requise.');
    if (size >= MAX_UPLOAD_BYTES) fail(413, 'Fichier trop volumineux (15 Mo maximum).');
    const uploadUrl = await storage.presignPut(path as string, ct, size, UPLOAD_URL_TTL_S);
    return { uploadUrl, path, headers: { 'Content-Type': ct }, expiresIn: UPLOAD_URL_TTL_S };
  });

  app.get('/v1/media/url', async (req) => {
    const path = (req.query as { path?: string }).path;
    if (!str(path) || path.includes('..') || !(path.startsWith('recordings/') || path.startsWith('images/'))) fail(400, 'Chemin invalide.');
    return { url: await storage.presignGet(path!, 3600), expiresIn: 3600 };
  });

  // ------------------------------------------------------------------ signal de modification (SSE)
  app.get('/v1/events', (req, reply) => {
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': deps.corsOrigins.includes(String(req.headers.origin)) ? String(req.headers.origin) : deps.corsOrigins[0] || ''
    });
    res.write(': ok\n\n');
    const onChange = (ev: unknown) => res.write(`event: change\ndata: ${JSON.stringify(ev)}\n\n`);
    bus.on('change', onChange);
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.raw.on('close', () => { clearInterval(ping); bus.off('change', onChange); });
  });

  app.addHook('onClose', async () => { bus.removeAllListeners(); });
  // ------------------------------------------------------------------ Nkala : contenus, jeux, services, supervision, SMS
  const nk = {
    app, db, fail,
    acteur: async (req: FastifyRequest) => { const a = await actorOf(req); return { auth: a.auth, isAdmin: a.isAdmin, isStaff: a.isStaff, role: a.role, status: a.status }; },
    ensureUser, notify, env: process.env, sms: deps.sms ?? fournisseurParDefaut(), ia: deps.ia ?? fournisseurIaParDefaut(), embed: deps.embed ?? fournisseurEmbeddingParDefaut(), secret
  };
  registerContenus(nk);
  registerJeux(nk);
  registerServices(nk);
  registerIaAdmin(nk);
  registerSupervision(nk);
  registerMedia(nk, storage);
  registerRegie(nk);
  registerPush(nk);
  registerAchats(nk);
  registerMobileMoney(nk);
  registerExemples(nk);

  return app;
}

// Réexport utile aux scripts
export { buildLeaderboardEntry };
