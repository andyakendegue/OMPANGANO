/**
 * Données personnelles (ISO 27001 A.5.34, A.8.10 ; loi gabonaise n° 001/2011 ; règles Google Play et App Store) :
 *  - GET    /v1/me/donnees   : export de toutes les données liées au compte (JSON téléchargeable) ;
 *  - DELETE /v1/me           : suppression du compte par la personne elle-même ;
 *  - purgerDonnees()         : effacement quotidien des données arrivées au terme de leur durée de conservation (DUREES).
 *
 * Ce que devient chaque donnée à la suppression (à reprendre dans la politique de confidentialité) :
 *  - effacé : profil, e-mail, téléphone, progression, scores, votes, discussions avec l'IA, certificats, jetons de notification,
 *    droits d'accès, courriels envoyés, statut de professeur, annonces publiées (retirées) ;
 *  - enregistrements de voix : effacés (fichier et contribution), sauf si la personne choisit de les laisser au corpus, anonymes ;
 *  - textes proposés au corpus : gardés sans aucun lien avec la personne (auteur « anonyme », nom et clans retirés) ;
 *  - visites, erreurs, statistiques de pub et d'IA : détachées du compte (identifiant remplacé ou retiré) ;
 *  - gardé pour obligation légale (comptabilité OHADA, 10 ans) : paiements et reçus d'achat ; registre Nkorouna (immuable, compte gelé) ;
 *  - gardé comme preuve (journaux d'audit, 5 ans) : journal_admin, item_audit ;
 *  - une empreinte SHA-256 de l'identifiant (comptes_supprimes) refuse les jetons émis avant la suppression.
 */
import { createHash } from 'node:crypto';
import type { Queryable, Db } from './db.ts';
import type { MediaStorage } from './storage.ts';
import { journaliser, type Ctx } from './ctx.ts';
import { SUPER_ADMIN_EMAIL } from './config.ts';

export const empreinteCompte = (uid: string) => createHash('sha256').update('nkala-compte:' + uid).digest('hex');
export const ANONYME = 'anonyme';

/** Durées de conservation (jours). Toute nouvelle donnée personnelle doit figurer ici (règle D1). */
export const DUREES = {
  ipVisites: 30,          // l'adresse IP des visites est effacée après 30 jours
  visites: 395,           // sessions de visite (13 mois)
  ipErreurs: 30,
  erreurs: 90,
  essaisSms: 30,
  pubEvenements: 395,
  iaUsage: 730,           // suivi des coûts de l'IA (2 ans)
  discussionsIa: 730,     // discussions sans activité depuis 2 ans
  courriels: 730,
  comptesSupprimes: 400,  // au-delà, plus aucun jeton émis avant la suppression ne peut être valide
  journaux: 1825,         // journal_admin, item_audit (5 ans)
  paiements: 3650,        // obligation comptable (10 ans)
  // Hors base : sauvegardes chiffrées 14 jours, copies faites avant une mise à jour 30 jours (server/backup/backup.sh)
} as const;

async function tablesExistantes(q: Queryable): Promise<Set<string>> {
  const r = await q.query<any>(`SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()`);
  return new Set(r.map(x => x.table_name as string));
}

/** Tables (et colonne) qui portent l'identifiant du compte, pour l'export. */
const EXPORT: [string, string][] = [
  ['progression', 'user_id'], ['scores', 'user_id'], ['votes', 'user_id'], ['droits', 'user_id'], ['paiements', 'user_id'],
  ['achats_recus', 'user_id'], ['certificats', 'user_id'], ['ia_chats', 'user_id'], ['ia_usage', 'user_id'], ['user_mails', 'user_id'],
  ['visit_sessions', 'user_id'], ['pub_evenements', 'user_id'], ['professeurs', 'user_id'], ['cours_planifies', 'hote_id'],
  ['nkr_comptes', 'user_id'], ['medias_annonces_envois', 'user_id'],
];

export async function exporterDonnees(q: Queryable, uid: string, storage: MediaStorage): Promise<Record<string, unknown>> {
  const t = await tablesExistantes(q);
  const sortie: Record<string, unknown> = { genereLe: new Date().toISOString(), compte: uid };
  sortie.profil = (await q.query<any>(`SELECT * FROM users WHERE id = $1`, [uid]))[0] ?? null;
  const contributions = await q.query<any>(`SELECT * FROM contributions WHERE user_id = $1 ORDER BY created_at`, [uid]);
  for (const c of contributions) {
    if (c.audio_storage_path) c.audio_lien_1h = await storage.presignGet(c.audio_storage_path, 3600).catch(() => null);
  }
  sortie.contributions = contributions;
  for (const [table, col] of EXPORT) {
    if (!t.has(table)) continue;
    sortie[table] = await q.query(`SELECT * FROM ${table} WHERE ${col} = $1 LIMIT 20000`, [uid]);
  }
  if (t.has('ia_messages')) sortie.ia_messages = await q.query(`SELECT m.* FROM ia_messages m JOIN ia_chats c ON c.id = m.chat_id WHERE c.user_id = $1 ORDER BY m.at LIMIT 20000`, [uid]);
  if (t.has('push_jetons')) sortie.push_jetons = (await q.query<any>(`SELECT plateforme, created_at, jeton FROM push_jetons WHERE user_id = $1`, [uid])).map(r => ({ ...r, jeton: String(r.jeton).slice(0, 12) + '…' }));
  if (t.has('nkr_mouvements') && t.has('nkr_comptes')) sortie.nkr_mouvements = await q.query(`SELECT m.* FROM nkr_mouvements m JOIN nkr_comptes c ON c.id IN (m.debit, m.credit) WHERE c.user_id = $1 ORDER BY m.rang LIMIT 20000`, [uid]);
  sortie.contenus_publies = await q.query(`SELECT collection, id, data, statut, publie, created_at FROM contenus WHERE owner_id = $1`, [uid]);
  sortie.actions_sur_le_compte = await q.query(`SELECT action, at, detail FROM journal_admin WHERE cible = $1 ORDER BY at`, [uid]);
  return sortie;
}

export interface OptionsSuppression { garderEnregistrements?: boolean }

/** Supprime le compte dans la transaction donnée ; renvoie les fichiers à effacer du stockage (après validation de la transaction). */
export async function supprimerCompte(q: Queryable, uid: string, o: OptionsSuppression = {}): Promise<{ fichiers: string[]; resume: Record<string, number> }> {
  const t = await tablesExistantes(q);
  const resume: Record<string, number> = {};
  const run = async (cle: string, sql: string, p: unknown[] = [uid]) => { resume[cle] = (await q.query(sql + ' RETURNING 1', p)).length; };
  const fichiers: string[] = [];

  // Voix : effacées sauf accord explicite pour les laisser au corpus (anonymes)
  if (!o.garderEnregistrements) {
    const audios = await q.query<any>(`SELECT id, audio_storage_path FROM contributions WHERE user_id = $1 AND audio_storage_path IS NOT NULL`, [uid]);
    fichiers.push(...audios.map(a => a.audio_storage_path as string));
    await run('enregistrements_effaces', `UPDATE contributions SET deleted_at = COALESCE(deleted_at, clock_timestamp()), audio_storage_path = NULL, audio_mime_type = NULL, data = data - 'audioUrl' - 'audioStoragePath' WHERE user_id = $1 AND audio_storage_path IS NOT NULL`);
  }
  const PERSO = `data - 'userId' - 'userDisplayName' - 'userTribe' - 'userPaternalClan' - 'userMaternalClan' - 'userPhotoURL' - 'userEmail'`;
  await run('contributions_anonymisees', `UPDATE contributions SET user_id = '${ANONYME}', data = ${PERSO} || '{"userDisplayName":"Anonyme"}'::jsonb WHERE user_id = $1`);
  await run('validations_anonymisees', `UPDATE contributions SET validator_id = '${ANONYME}', data = data - 'validatorDisplayName' - 'validatorId' WHERE validator_id = $1`);

  const effacer: [string, string][] = [
    ['progression', 'user_id'], ['scores', 'user_id'], ['votes', 'user_id'], ['droits', 'user_id'], ['certificats', 'user_id'],
    ['ia_chats', 'user_id'], ['push_jetons', 'user_id'], ['user_mails', 'user_id'], ['professeurs', 'user_id'],
    ['medias_annonces_envois', 'user_id'], ['cours_planifies', 'hote_id'],
  ];
  for (const [table, col] of effacer) if (t.has(table)) await run(table, `DELETE FROM ${table} WHERE ${col} = $1`);
  for (const table of ['visit_sessions', 'app_errors']) if (t.has(table)) await run(table, `UPDATE ${table} SET user_id = NULL WHERE user_id = $1`);
  for (const table of ['ia_usage', 'pub_evenements']) if (t.has(table)) await run(table, `UPDATE ${table} SET user_id = '${ANONYME}' WHERE user_id = $1`);
  const dataPrivee = (await q.query(`SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'contenus' AND column_name = 'data_privee'`)).length > 0;
  await run('contenus_retires', `UPDATE contenus SET deleted_at = COALESCE(deleted_at, clock_timestamp()), publie = false${dataPrivee ? ', data_privee = NULL' : ''} WHERE owner_id = $1`);
  if (t.has('nkr_comptes')) await run('nkorouna_gele', `UPDATE nkr_comptes SET gele = true WHERE user_id = $1`);
  await run('admin', `UPDATE admins SET deleted_at = clock_timestamp() WHERE id = $1 AND deleted_at IS NULL`);
  await run('profil', `DELETE FROM users WHERE id = $1`);
  await q.query(`INSERT INTO comptes_supprimes (empreinte) VALUES ($1) ON CONFLICT (empreinte) DO UPDATE SET at = clock_timestamp()`, [empreinteCompte(uid)]);
  await journaliser(q, uid, 'compte_supprime', empreinteCompte(uid).slice(0, 16), { resume, garderEnregistrements: !!o.garderEnregistrements });
  return { fichiers, resume };
}

/** Efface ce qui a dépassé sa durée de conservation. Idempotent ; appelé au démarrage puis chaque jour. */
export async function purgerDonnees(db: Db): Promise<Record<string, number>> {
  const t = await tablesExistantes(db);
  const d: Record<string, number> = {};
  const run = async (cle: string, table: string, sql: string, jours: number) => {
    if (!t.has(table)) return;
    d[cle] = (await db.query(sql.replace('$J', `clock_timestamp() - make_interval(days => ${Math.trunc(jours)})`) + ' RETURNING 1')).length;
  };
  await run('ip_visites', 'visit_sessions', `UPDATE visit_sessions SET ip = NULL WHERE ip IS NOT NULL AND started_at < $J`, DUREES.ipVisites);
  await run('visites', 'visit_sessions', `DELETE FROM visit_sessions WHERE started_at < $J`, DUREES.visites);
  await run('ip_erreurs', 'app_errors', `UPDATE app_errors SET ip = NULL, user_agent = NULL WHERE ip IS NOT NULL AND at < $J`, DUREES.ipErreurs);
  await run('erreurs', 'app_errors', `DELETE FROM app_errors WHERE at < $J`, DUREES.erreurs);
  await run('essais_sms', 'sms_essais', `DELETE FROM sms_essais WHERE at < $J`, DUREES.essaisSms);
  await run('pub', 'pub_evenements', `DELETE FROM pub_evenements WHERE at < $J`, DUREES.pubEvenements);
  await run('ia_usage', 'ia_usage', `DELETE FROM ia_usage WHERE at < $J`, DUREES.iaUsage);
  await run('discussions_ia', 'ia_chats', `DELETE FROM ia_chats WHERE updated_at < $J`, DUREES.discussionsIa);
  await run('courriels', 'user_mails', `DELETE FROM user_mails WHERE sent_at < $J`, DUREES.courriels);
  await run('comptes_supprimes', 'comptes_supprimes', `DELETE FROM comptes_supprimes WHERE at < $J`, DUREES.comptesSupprimes);
  await run('journal_admin', 'journal_admin', `DELETE FROM journal_admin WHERE at < $J`, DUREES.journaux);
  await run('item_audit', 'item_audit', `DELETE FROM item_audit WHERE at < $J`, DUREES.journaux);
  await run('paiements', 'paiements', `DELETE FROM paiements WHERE created_at < $J`, DUREES.paiements);
  await run('achats_recus', 'achats_recus', `DELETE FROM achats_recus WHERE at < $J`, DUREES.paiements);
  if (t.has('purges')) await db.query(`INSERT INTO purges (detail) VALUES ($1)`, [JSON.stringify(d)]);
  return d;
}

export function registerDonnees({ app, db, fail, acteur }: Ctx, storage: MediaStorage) {
  app.get('/v1/me/donnees', async (req, reply) => {
    const a = await acteur(req);
    const n = (await db.query<any>(`SELECT count(*)::int AS n FROM journal_admin WHERE par = $1 AND action = 'donnees_exportees' AND at > clock_timestamp() - interval '1 hour'`, [a.auth.uid]))[0].n;
    if (n >= 3) return fail(429, 'Trois exports par heure au plus. Réessaie plus tard.');
    const donnees = await exporterDonnees(db, a.auth.uid, storage);
    await journaliser(db, a.auth.uid, 'donnees_exportees', a.auth.uid);
    return reply.header('Content-Disposition', 'attachment; filename="mes-donnees-nkala.json"').send(donnees);
  });

  app.delete('/v1/me', async (req) => {
    const a = await acteur(req);
    const b = (req.body || {}) as { confirmation?: string; garderEnregistrements?: boolean; abandonnerSoldeNkorouna?: boolean };
    if (b.confirmation !== 'SUPPRIMER') return fail(400, 'Écris SUPPRIMER pour confirmer la suppression définitive du compte.');
    if (a.auth.emailVerified && a.auth.email === SUPER_ADMIN_EMAIL) {
      // Super-administrateur (désigné par son adresse) : sa suppression couperait l'administration
      return fail(400, 'Le compte du super-administrateur ne peut pas être supprimé depuis l\'application.');
    }
    const solde = await db.query<any>(`SELECT COALESCE(sum(solde), 0)::bigint AS s FROM nkr_comptes WHERE user_id = $1`, [a.auth.uid]).catch(() => [{ s: 0 }]);
    if (Number(solde[0]?.s || 0) > 0 && !b.abandonnerSoldeNkorouna) return fail(409, `Il te reste ${solde[0].s} NKR. Utilise-les, ou confirme que tu y renonces (abandonnerSoldeNkorouna).`);
    const r = await db.tx(q => supprimerCompte(q, a.auth.uid, { garderEnregistrements: b.garderEnregistrements === true }));
    for (const f of r.fichiers) await storage.remove(f).catch(() => {});
    return { supprime: true, resume: r.resume };
  });
}
