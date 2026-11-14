/**
 * Services transversaux : assistant IA avec comptage des jetons (Kak'Igonjo), passerelle publicitaire, droits d'accès
 * (abonnements et achats), licences de lecture protégées, signalisation des cours à distance (4 personnes au plus).
 */
import { createHmac, randomBytes } from 'node:crypto';
import { SignJWT } from 'jose';
import { verifierQuota, estimerJetons, type QuotaJetons, type UsageJetons } from '../../../packages/noyau/src/jetons.ts';
import { peutAcceder, type DroitsUtilisateur, type NiveauAcces } from '../../../packages/noyau/src/acces.ts';
import { accesCompletVideo, finPartieGratuite } from '../../../packages/noyau/src/lecons.ts';
import { prixSeance, TARIF_COURS_DEFAUT, type TarifCoursDistance } from '../../../packages/noyau/src/coursDistance.ts';
import { zoneAffichable, profilAgeDepuis, modulesSansPub, ZONES, type ZonePub } from '../../../packages/noyau/src/publicite.ts';
import { construireSysteme } from './ia.ts';
import type { Queryable } from './db.ts';
import { journaliser, parametre, str, type Ctx } from './ctx.ts';
import { modulesActuels } from './contenus.ts';
import { baseApi } from './media.ts';
import { creationsServables } from './regie.ts';
import { profilAcces, verifierRegle } from './profil_acces.ts';

// ================================================================== IA (fournisseurs, RAG et prompt : ia.ts)
export type { FournisseurIa } from './ia.ts';
export { fournisseurIaParDefaut } from './ia.ts';

export const QUOTA_DEFAUT: QuotaJetons = { parJour: 20_000, parMois: 300_000, parConversation: 8_000 };

export async function consommation(q: Queryable, uid: string, conversation: string) {
  const r = await q.query<any>(
    `SELECT COALESCE(sum(jetons_entree + jetons_sortie) FILTER (WHERE at >= date_trunc('day', clock_timestamp())), 0)::int AS jour,
            COALESCE(sum(jetons_entree + jetons_sortie) FILTER (WHERE at >= date_trunc('month', clock_timestamp())), 0)::int AS mois,
            COALESCE(sum(jetons_entree + jetons_sortie) FILTER (WHERE conversation_id = $2), 0)::int AS conversation
     FROM ia_usage WHERE user_id = $1`, [uid, conversation]);
  return r[0] as { jour: number; mois: number; conversation: number };
}

// ================================================================== droits
export async function droitsDe(q: Queryable, uid: string, role?: string): Promise<DroitsUtilisateur> {
  const r = await q.query<any>(`SELECT type, contenu_id, fin FROM droits WHERE user_id = $1 AND statut = 'actif' AND (fin IS NULL OR fin > clock_timestamp())`, [uid]);
  const d: DroitsUtilisateur = { role, abonneJusque: null, achats: [], essais: {}, locations: {} };
  const achats: string[] = [];
  for (const x of r) {
    const fin = x.fin ? new Date(x.fin).getTime() : 8.64e15;
    if (x.type === 'abonnement') d.abonneJusque = Math.max(d.abonneJusque ?? 0, fin);
    else if (x.type === 'achat' && x.contenu_id) achats.push(x.contenu_id);
    else if (x.type === 'essai' && x.contenu_id) d.essais![x.contenu_id] = fin;
    else if (x.type === 'location' && x.contenu_id) d.locations![x.contenu_id] = fin;
  }
  d.achats = achats;
  return d;
}

// ================================================================== appels (signalisation)
interface Salle { id: string; hote: string; titre: string; cree: number; membres: Map<string, { nom: string }>; signaux: { n: number; de: string; a: string; data: unknown }[]; n: number; /** Salle d'un cours prévu : seuls ses inscrits entrent. */ planifie?: boolean }
const salles = new Map<string, Salle>();
export const MAX_GROUPE = 4;

export function registerServices(ctx: Ctx) {
  const { app, db, fail, acteur, ensureUser, env, cles } = ctx;
  const admin = async (req: any) => { const a = await acteur(req); if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.'); return a; };
  const staff = async (req: any) => { const a = await acteur(req); if (!a.isStaff) fail(403, 'Réservé aux modérateurs.'); return a; };
  const profilAge = async (uid: string) => profilAgeDepuis((await db.query<any>(`SELECT data->>'birthDate' AS n FROM users WHERE id = $1`, [uid]))[0]?.n);

  // ---------------------------------------------------------------- IA
  app.post('/v1/ia/message', async (req) => {
    const a = await acteur(req);
    const { message, conversationId, historique } = (req.body || {}) as { message?: string; conversationId?: string; historique?: { role: string; content: string }[] };
    if (!str(message) || !message.trim() || message.length > 2000) return fail(400, 'Message vide ou trop long (2000 caractères au plus).');
    const { fonctions } = await modulesActuels(db, env);
    if (!fonctions.assistantIA) return fail(503, 'Kak\'Igonjo n\'est pas encore là.');
    await ensureUser(db, a.auth);
    const age = await profilAge(a.auth.uid);
    const droits = await droitsDe(db, a.auth.uid, a.role);
    const base = { ...QUOTA_DEFAUT, ...(await parametre<Partial<QuotaJetons>>(db, 'ia_quotas', {})) };
    const f = age === 'enfant' ? 0.25 : droits.abonneJusque && droits.abonneJusque > Date.now() ? 4 : 1;
    const quota: QuotaJetons = { parJour: Math.floor(base.parJour * f), parMois: Math.floor(base.parMois * f), parConversation: Math.floor(base.parConversation * f) };
    const conv = str(conversationId) && /^[A-Za-z0-9_-]{6,60}$/.test(conversationId) ? conversationId : 'c_' + randomBytes(6).toString('hex');
    const msgs = [...(Array.isArray(historique) ? historique : []).filter(m => (m.role === 'user' || m.role === 'assistant') && str(m.content)).slice(-8).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 1500) })), { role: 'user' as const, content: message.trim() }];
    const { systeme, cfg } = await construireSysteme(db, ctx.embed, { message: message.trim(), enfant: age === 'enfant' });
    const estimation = estimerJetons(systeme + msgs.map(m => m.content).join('')) + cfg.maxTokens;
    const verdict = verifierQuota(quota, await consommation(db, a.auth.uid, conv), estimation);
    if (!verdict.ok) return fail(429, verdict.limite === 'conversation' ? 'Cette conversation est trop longue : commence-en une nouvelle.' : verdict.limite === 'jour' ? 'Tu as utilisé tous tes messages d\'aujourd\'hui. Reviens demain !' : 'Tu as atteint ton quota du mois.');
    let rep;
    try { rep = await ctx.ia.repondre({ systeme, messages: msgs, modele: cfg.modele || env.IA_MODELE || 'claude-haiku-5-5', temperature: cfg.temperature, maxTokens: cfg.maxTokens }); }
    catch (e) { return fail(502, 'Kak\'Igonjo ne répond pas pour le moment. Réessaie dans un instant.'); }
    await db.query(`INSERT INTO ia_usage (user_id, conversation_id, modele, jetons_entree, jetons_sortie, jetons_cache, simule) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [a.auth.uid, conv, rep.modele, rep.usage.entree, rep.usage.sortie, rep.usage.cache ?? 0, rep.simule]);
    const apres = verifierQuota(quota, await consommation(db, a.auth.uid, conv), 0);
    return { reponse: rep.texte, conversationId: conv, usage: { entree: rep.usage.entree, sortie: rep.usage.sortie }, simule: rep.simule, quota: apres.ok ? { restantJour: apres.restantJour, restantMois: apres.restantMois, alerte: apres.alerte } : { restantJour: 0, restantMois: 0, alerte: true } };
  });

  app.get('/v1/ia/usage', async (req) => {
    const a = await acteur(req);
    const base = { ...QUOTA_DEFAUT, ...(await parametre<Partial<QuotaJetons>>(db, 'ia_quotas', {})) };
    return { consommation: await consommation(db, a.auth.uid, ''), quota: base };
  });

  // ---------------------------------------------------------------- droits et accès
  app.get('/v1/droits', async (req) => {
    const a = await acteur(req);
    const d = await droitsDe(db, a.auth.uid, a.role);
    const liste = await db.query<any>(`SELECT id, produit_id, type, contenu_id, debut, fin, source, statut FROM droits WHERE user_id = $1 ORDER BY debut DESC LIMIT 100`, [a.auth.uid]);
    return { ...d, abonne: !!d.abonneJusque && d.abonneJusque > Date.now(), historique: liste };
  });

  app.get('/v1/droits/acces', async (req) => { const a = await acteur(req); await ensureUser(db, a.auth); return profilAcces(db, a.auth.uid); });

  app.post('/v1/acces/verifier', async (req) => {
    const a = await acteur(req);
    const { collection, id } = (req.body || {}) as { collection?: string; id?: string };
    if (!str(collection) || !str(id)) return fail(400, 'Contenu attendu.');
    const c = await db.query<any>(`SELECT data FROM contenus WHERE collection = $1 AND id = $2 AND publie AND deleted_at IS NULL AND owner_id IS NULL`, [collection, id]);
    if (!c.length) return fail(404, 'Contenu introuvable.');
    const niveau = (c[0].data.niveau_acces || 'libre') as NiveauAcces;
    const d = peutAcceder({ id, acces: niveau, roles: ['admin', 'validator'] }, await droitsDe(db, a.auth.uid, a.role));
    const r = d.ok ? await verifierRegle(db, a.auth.uid, a.isStaff, c[0].data) : null;
    const ok = d.ok && !!r && r.ok;
    return { autorise: ok, avecPub: ok && d.ok ? d.avecPub : false, motif: !d.ok ? d.motif : r && !r.ok ? r.motif : null, niveau, rangMin: r && !r.ok && r.motif === 'rang_requis' ? r.rangMin : null, plans: r && !r.ok && r.motif === 'plan_requis' ? r.plans : null };
  });

  /** Licence de lecture : jeton court à présenter au serveur de segments ; contient une empreinte du compte pour le filigrane. */
  app.post('/v1/lecture/licence', async (req) => {
    const a = await acteur(req);
    const { collection, id } = (req.body || {}) as { collection?: string; id?: string };
    if (!str(collection) || !['titres', 'chapitres', 'cours_artisans', 'chaines_tv'].includes(collection) || !str(id)) return fail(400, 'Contenu attendu.');
    const c = await db.query<any>(`SELECT data FROM contenus WHERE collection = $1 AND id = $2 AND publie AND deleted_at IS NULL`, [collection, id]);
    if (!c.length) return fail(404, 'Contenu introuvable.');
    const droits = await droitsDe(db, a.auth.uid, a.role);
    // Vidéothèque (décision du 13 nov. 2026) : réglage vidéo par vidéo, sinon 1er chapitre gratuit avec publicité, la suite au forfait
    // (à l'achat pour un cours d'artisan long). Sans le droit complet, la licence ne couvre que la partie gratuite (« limiteS »).
    let limiteS: number | null = null;
    let d = peutAcceder({ id, acces: (c[0].data.niveau_acces || 'libre') as NiveauAcces, roles: ['admin', 'validator'] }, droits);
    if (collection === 'cours_artisans') {
      const chap = (await db.query<any>(`SELECT id, data FROM contenus WHERE collection = 'chapitres' AND deleted_at IS NULL AND data->>'cours_id' = $1`, [id])).map(x => ({ ...x.data, id: x.id }));
      const cours = { ...c[0].data, id };
      d = peutAcceder({ id, acces: accesCompletVideo(cours, chap), roles: ['admin', 'validator'] }, droits);
      if (!d.ok && !a.isStaff) {
        const fin = finPartieGratuite(cours, chap);
        if (fin === null || fin > 0) { limiteS = fin; d = peutAcceder({ id, acces: 'gratuit_avec_pub' }, droits); }
      }
    }
    if (!d.ok && a.isStaff) d = { ok: true, avecPub: false };
    if (!d.ok) return fail(402, 'Accès réservé : ' + d.motif);
    const r = await verifierRegle(db, a.auth.uid, a.isStaff, c[0].data);
    if (!r.ok) return fail(402, 'Accès réservé : ' + r.motif);
    const filigrane = createHmac('sha256', cles.filigrane).update(a.auth.uid).digest('hex').slice(0, 10);
    const jeton = await new SignJWT({ c: `${collection}/${id}`, fil: filigrane }).setProtectedHeader({ alg: 'HS256' }).setSubject(a.auth.uid).setIssuer('nkala-licence').setExpirationTime('10m').sign(new TextEncoder().encode(cles.licences));
    const protege = c[0].data.protege === true;
    return { jeton, filigrane, expireDans: 600, avecPub: d.avecPub, limiteS, videoUrl: protege ? null : (c[0].data.video_url ?? null), protection: { niveau: 1, enregistrementEcranInterdit: true, segmentsChiffres: protege }, urlHls: protege ? `${baseApi(req, env)}/media/hls/${collection}/${id}.m3u8?t=${encodeURIComponent(jeton)}` : null };
  });

  app.get('/v1/admin/droits', async (req) => {
    await staff(req);
    const { userId } = req.query as { userId?: string };
    return db.query(`SELECT id, user_id, produit_id, type, contenu_id, debut, fin, source, statut FROM droits ${userId ? 'WHERE user_id = $1' : ''} ORDER BY debut DESC LIMIT 200`, userId ? [userId] : []);
  });
  app.post('/v1/admin/droits', async (req, reply) => {
    const a = await admin(req);
    const b = (req.body || {}) as { userId?: string; produitId?: string; type?: string; contenuId?: string; jours?: number };
    if (!str(b.userId) || !['abonnement', 'achat', 'essai', 'location'].includes(b.type || '')) return fail(400, 'Compte et type attendus.');
    const jours = Number(b.jours);
    await db.tx(async q => {
      await q.query(`INSERT INTO droits (user_id, produit_id, type, contenu_id, fin, source) VALUES ($1,$2,$3,$4, ${jours > 0 ? `clock_timestamp() + ($5 || ' days')::interval` : 'NULL'}, 'admin')`,
        jours > 0 ? [b.userId, b.produitId || b.type, b.type, b.contenuId || null, String(Math.min(3650, jours))] : [b.userId, b.produitId || b.type, b.type, b.contenuId || null]);
      await journaliser(q, a.auth.uid, 'droit_accorde', b.userId, b);
    });
    return reply.status(201).send({ ok: true });
  });
  app.delete('/v1/admin/droits/:id', async (req, reply) => {
    const a = await admin(req);
    const { id } = req.params as { id: string };
    await db.tx(async q => { await q.query(`UPDATE droits SET statut = 'annule', fin = clock_timestamp() WHERE id = $1`, [id]); await journaliser(q, a.auth.uid, 'droit_annule', id); });
    return reply.status(204).send();
  });

  // ---------------------------------------------------------------- publicité (passerelle ; Revive viendra derrière)
  const servables = async (zone: string) => {
    const plafonds = await parametre<Record<string, number>>(db, 'pub_plafonds', {});
    const r = await creationsServables(db, zone, new Date().toISOString().slice(0, 10));
    return r.filter(x => { const p = Number(x.data.plafond_jour) || plafonds.parCreationJour || 0; const pc = Number(x.plafond_campagne) || 0; return (!p || x.vus < p) && (!pc || x.vus_campagne < pc); });
  };
  const versPub = (c: any, zone: string) => ({ id: c.id, zone, image: c.data.image ?? null, lien: c.data.lien ?? null, titre: c.data.titre ?? null, texte_alt: c.data.texte_alt, annonceur: c.data.annonceur ?? null, cta: c.data.cta ?? null, format: c.data.format ?? 'bandeau' });

  /**
   * Publicité selon le forfait (décision de Capp, 13 nov. 2026) : chaque formule active coupe la publicité sur « tout » ou sur des modules
   * (colonne « sans_pub » des formules). Un abonnement sans formule précisée garde l'effet d'avant : aucune publicité. Même règle que l'app (Pub.tsx).
   */
  const contextePub = async (uid: string, role?: string) => {
    const droits = await droitsDe(db, uid, role);
    const abonneActif = !!droits.abonneJusque && droits.abonneJusque > Date.now();
    if (!uid || !abonneActif) return { abonne: false, sansPub: [] as string[] };
    const { plans } = await profilAcces(db, uid);
    if (!plans.length) return { abonne: true, sansPub: [] as string[] };
    const lignes = await db.query<any>(`SELECT id, data->'sans_pub' AS sans_pub FROM contenus WHERE collection = 'plans' AND deleted_at IS NULL AND id = ANY($1)`, [plans]);
    return { abonne: false, sansPub: modulesSansPub(plans, lignes) };
  };

  app.get('/v1/pub', async (req) => {
    const a = await acteur(req);
    const { zone, activite } = req.query as { zone?: string; activite?: string };
    if (!str(zone) || !(zone in ZONES)) return fail(400, 'Zone inconnue.');
    const { fonctions } = await modulesActuels(db, env);
    const cp = await contextePub(a.auth.uid, a.role);
    const profil = await profilAge(a.auth.uid);
    const ok = zoneAffichable(zone as ZonePub, { active: !!fonctions.publicite, ...cp, profil, enLigne: true, activiteEnCours: activite === '1' });
    if (!ok) return { pub: null };
    const dispo = await servables(zone);
    if (!dispo.length) return { pub: null };
    return { pub: versPub(dispo[Math.floor(Math.random() * dispo.length)], zone) };
  });

  /** Fil : plusieurs créations différentes pour les glisser dans une liste (publication sponsorisée, mention « Publicité » côté application). */
  app.get('/v1/pub/fil', async (req) => {
    const a = await acteur(req);
    const { zone, n } = req.query as { zone?: string; n?: string };
    if (!str(zone) || !(zone in ZONES)) return fail(400, 'Zone inconnue.');
    const { fonctions } = await modulesActuels(db, env);
    const ok = zoneAffichable(zone as ZonePub, { active: !!fonctions.publicite, ...(await contextePub(a.auth.uid, a.role)), profil: await profilAge(a.auth.uid), enLigne: true, activiteEnCours: false });
    if (!ok) return { pubs: [] };
    const dispo = (await servables(zone)).sort(() => Math.random() - 0.5).slice(0, Math.min(6, Math.max(1, Number(n) || 3)));
    return { pubs: dispo.map(c => versPub(c, zone)) };
  });

  app.post('/v1/pub/evenement', async (req, reply) => {
    const a = await acteur(req);
    const { type, creationId, zone } = (req.body || {}) as { type?: string; creationId?: string; zone?: string };
    if (!['affichage', 'clic'].includes(type || '') || !str(zone) || !(zone in ZONES)) return fail(400, 'Événement invalide.');
    await db.query(`INSERT INTO pub_evenements (type, zone, creation_id, user_id) VALUES ($1,$2,$3,$4)`, [type, zone, str(creationId) ? creationId : null, a.auth.uid]);
    return reply.status(204).send();
  });

  app.post('/v1/pub/recompense', async (req) => {
    const a = await acteur(req);
    const { creationId, tempsVuMs } = (req.body || {}) as { creationId?: string; tempsVuMs?: number };
    if (!str(creationId) || !(Number(tempsVuMs) >= 5000)) return fail(400, 'La publicité doit être vue en entier pour gagner un cœur.');
    if (await profilAge(a.auth.uid) === 'enfant') return fail(403, 'Non disponible en mode enfant.');
    const { fonctions } = await modulesActuels(db, env);
    if (!fonctions.publicite) return fail(503, 'Les annonces récompensées ne sont pas ouvertes.');
    const plafonds = await parametre<Record<string, number>>(db, 'pub_plafonds', {});
    const max = plafonds.recompensesParJour ?? 3;
    const n = (await db.query<any>(`SELECT count(*)::int AS n FROM pub_evenements WHERE user_id = $1 AND type = 'recompense' AND jour = current_date`, [a.auth.uid]))[0].n;
    if (n >= max) return fail(429, `Tu as déjà gagné ${max} cœurs avec des annonces aujourd'hui.`);
    await db.query(`INSERT INTO pub_evenements (type, zone, creation_id, user_id) VALUES ('recompense','recompense_coeur',$1,$2)`, [creationId, a.auth.uid]);
    return { accorde: true, coeurs: 1, restantAujourdhui: max - n - 1 };
  });

  // ---------------------------------------------------------------- cours à distance : signalisation, groupes de 4 au plus
  app.get('/v1/appels/ice', async (req) => {
    const a = await acteur(req);
    const stun = (env.STUN_URLS || 'stun:stun.l.google.com:19302').split(',').map(s => s.trim()).filter(Boolean);
    const serveurs: any[] = [{ urls: stun }];
    if (env.TURN_URLS && env.TURN_SECRET) {
      const fin = Math.floor(Date.now() / 1000) + 3600;
      const nom = `${fin}:${a.auth.uid}`;
      serveurs.push({ urls: env.TURN_URLS.split(',').map(s => s.trim()), username: nom, credential: createHmac('sha1', env.TURN_SECRET).update(nom).digest('base64') });
    }
    return { iceServers: serveurs, maxGroupe: MAX_GROUPE };
  });

  const nettoyer = () => { const lim = Date.now() - 3 * 3600_000; for (const [id, s] of salles) if (s.cree < lim) salles.delete(id); };
  const nomDe = async (uid: string) => (await db.query<any>(`SELECT data->>'displayName' AS n FROM users WHERE id = $1`, [uid]))[0]?.n || 'Participant';

  app.post('/v1/appels', async (req, reply) => {
    const a = await acteur(req);
    // Salle immédiate, hors planning : administrateurs seulement (essais, assistance). Les cours passent par le planning (prix, inscrits).
    if (!a.isAdmin) return fail(403, 'Les salles se créent par le planning, par un professeur ou un administrateur.');
    nettoyer();
    const { titre } = (req.body || {}) as { titre?: string };
    const id = randomBytes(4).toString('hex');
    const s: Salle = { id, hote: a.auth.uid, titre: (titre || 'Cours à distance').slice(0, 80), cree: Date.now(), membres: new Map([[a.auth.uid, { nom: await nomDe(a.auth.uid) }]]), signaux: [], n: 0 };
    salles.set(id, s);
    return reply.status(201).send({ id, titre: s.titre, maxGroupe: MAX_GROUPE });
  });
  app.post('/v1/appels/:id/rejoindre', async (req) => {
    const a = await acteur(req);
    const s = salles.get((req.params as any).id) ?? fail(404, 'Cette salle n\'existe plus.');
    if (s.planifie && !s.membres.has(a.auth.uid)) return fail(403, 'Ce cours est prévu : entre par « Mes cours prévus » après t\'être inscrit.');
    if (!s.membres.has(a.auth.uid)) {
      if (s.membres.size >= MAX_GROUPE) return fail(409, `Ce groupe est complet (${MAX_GROUPE} personnes au maximum).`);
      s.membres.set(a.auth.uid, { nom: await nomDe(a.auth.uid) });
    }
    return { id: s.id, titre: s.titre, membres: [...s.membres].map(([uid, m]) => ({ uid, nom: m.nom, hote: uid === s.hote })) };
  });
  app.post('/v1/appels/:id/signal', async (req, reply) => {
    const a = await acteur(req);
    const s = salles.get((req.params as any).id) ?? fail(404, 'Cette salle n\'existe plus.');
    const { a: dest, data } = (req.body || {}) as { a?: string; data?: unknown };
    if (!s.membres.has(a.auth.uid) || !str(dest) || !s.membres.has(dest)) return fail(403, 'Destinataire invalide.');
    if (JSON.stringify(data ?? null).length > 20_000) return fail(413, 'Signal trop gros.');
    s.signaux.push({ n: ++s.n, de: a.auth.uid, a: dest, data });
    if (s.signaux.length > 500) s.signaux.splice(0, 250);
    return reply.status(204).send();
  });
  app.get('/v1/appels/:id', async (req) => {
    const a = await acteur(req);
    const s = salles.get((req.params as any).id) ?? fail(404, 'Cette salle n\'existe plus.');
    if (!s.membres.has(a.auth.uid)) return fail(403, 'Tu ne fais pas partie de ce groupe.');
    const depuis = Number((req.query as any).depuis) || 0;
    return { membres: [...s.membres].map(([uid, m]) => ({ uid, nom: m.nom, hote: uid === s.hote })), signaux: s.signaux.filter(x => x.a === a.auth.uid && x.n > depuis), dernier: s.n };
  });
  // ---------------------------------------------------------------- planning des cours à distance (14 nov. 2026)
  const AVANCE_ENTREE_MS = 15 * 60_000;
  // ---------------------------------------------------------------- professeurs et tarif générique (14 nov. 2026)
  const estProfesseur = async (uid: string) => (await db.query<any>(`SELECT 1 FROM professeurs WHERE user_id = $1`, [uid])).length > 0;
  const peutAnimer = async (a: { isAdmin: boolean; auth: { uid: string } }) => a.isAdmin || await estProfesseur(a.auth.uid);
  const tarifCours = async () => ({ ...TARIF_COURS_DEFAUT, ...(await parametre<Partial<TarifCoursDistance>>(db, 'cours_distance', {})) }) as TarifCoursDistance;
  /** La place est-elle comprise dans une formule de l'élève ? (personnel : toujours) */
  const placeIncluse = async (a: { isStaff: boolean; auth: { uid: string } }, t: TarifCoursDistance) => {
    if (a.isStaff) return true;
    if (!t.plans_inclus.length) return false;
    const p = await profilAcces(db, a.auth.uid);
    return p.tout || p.plans.some(x => t.plans_inclus.includes(x));
  };
  app.get('/v1/appels/moi', async (req) => {
    const a = await acteur(req);
    const t = await tarifCours();
    return { peutAnimer: await peutAnimer(a), admin: a.isAdmin, professeur: await estProfesseur(a.auth.uid), tarif: t, inclus: await placeIncluse(a, t) };
  });
  app.get('/v1/admin/professeurs', async (req) => {
    await admin(req);
    return db.query<any>(`SELECT p.user_id AS uid, COALESCE(u.data->>'fullName', u.data->>'displayName', p.user_id) AS nom, u.data->>'email' AS email, p.created_at AS depuis FROM professeurs p LEFT JOIN users u ON u.id = p.user_id ORDER BY nom`);
  });
  app.post('/v1/admin/professeurs', async (req, reply) => {
    const a = await admin(req);
    const { userId } = (req.body || {}) as { userId?: string };
    if (!str(userId) || !(await db.query<any>(`SELECT 1 FROM users WHERE id = $1`, [userId])).length) return fail(404, 'Utilisateur introuvable.');
    await db.query(`INSERT INTO professeurs (user_id, nomme_par) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [userId, a.auth.uid]);
    await journaliser(db, a.auth.uid, 'professeur_nomme', userId);
    return reply.status(201).send({ ok: true });
  });
  app.delete('/v1/admin/professeurs/:uid', async (req, reply) => {
    const a = await admin(req);
    await db.query(`DELETE FROM professeurs WHERE user_id = $1`, [(req.params as any).uid]);
    await journaliser(db, a.auth.uid, 'professeur_retire', (req.params as any).uid);
    return reply.status(204).send();
  });

  const formePlanning = async (r: any, uid: string) => ({
    prixFcfa: Number(r.prix_fcfa) || 0,
    code: r.code, titre: r.titre, debut: new Date(r.debut).toISOString(), dureeMin: r.duree_min, hote: r.hote_id === uid, hoteNom: await nomDe(r.hote_id),
    inscrits: (r.inscrits as string[]).length, inscrit: (r.inscrits as string[]).includes(uid), places: MAX_GROUPE,
    ouvert: Date.now() >= new Date(r.debut).getTime() - AVANCE_ENTREE_MS && Date.now() <= new Date(r.debut).getTime() + r.duree_min * 60_000,
  });
  const lirePlanning = async (code: string) => (await db.query<any>(`SELECT * FROM cours_planifies WHERE code = $1`, [String(code || '').toLowerCase()]))[0] ?? fail(404, 'Aucun cours prévu avec ce code.');
  app.post('/v1/appels/planning', async (req, reply) => {
    const a = await acteur(req);
    if (!(await peutAnimer(a))) return fail(403, 'Seuls les professeurs et les administrateurs créent des cours à distance.');
    const { titre, debut, dureeMin, professeurId } = (req.body || {}) as { titre?: string; debut?: string; dureeMin?: number; professeurId?: string };
    // Un administrateur peut désigner le professeur du cours ; un professeur anime toujours lui-même.
    let hote = a.auth.uid;
    if (str(professeurId) && professeurId !== a.auth.uid) {
      if (!a.isAdmin) return fail(403, 'Seul un administrateur désigne le professeur d\'un cours.');
      if (!(await estProfesseur(professeurId))) return fail(400, 'Cette personne n\'est pas professeur : nomme-la d\'abord dans la console.');
      hote = professeurId;
    }
    const t = Date.parse(String(debut ?? ''));
    if (!Number.isFinite(t) || t < Date.now() - 5 * 60_000 || t > Date.now() + 60 * 86_400_000) return fail(400, 'Choisis une date dans les 60 prochains jours.');
    const duree = Number(dureeMin ?? 60);
    if (!Number.isInteger(duree) || duree < 15 || duree > 180) return fail(400, 'Durée : entre 15 et 180 minutes.');
    const n = (await db.query<any>(`SELECT count(*)::int AS n FROM cours_planifies WHERE hote_id = $1 AND debut + make_interval(mins => duree_min) > clock_timestamp()`, [hote]))[0].n;
    if (n >= 20) return fail(429, 'Ce professeur a déjà 20 cours prévus.');
    const code = randomBytes(4).toString('hex');
    // Prix fixé maintenant d'après le tarif générique (un changement de tarif ne touche pas les cours déjà prévus).
    const prix = prixSeance(await tarifCours(), duree);
    await db.query(`INSERT INTO cours_planifies (code, hote_id, titre, debut, duree_min, inscrits, prix_fcfa, cree_par) VALUES ($1,$2,$3,$4,$5,ARRAY[$2],$6,$7)`, [code, hote, String(titre || 'Cours à distance').slice(0, 80), new Date(t).toISOString(), duree, prix, a.auth.uid]);
    return reply.status(201).send(await formePlanning(await lirePlanning(code), a.auth.uid));
  });
  app.get('/v1/appels/planning', async (req) => {
    const a = await acteur(req);
    const r = await db.query<any>(`SELECT * FROM cours_planifies WHERE $1 = ANY(inscrits) AND debut + make_interval(mins => duree_min) > clock_timestamp() ORDER BY debut LIMIT 50`, [a.auth.uid]);
    return Promise.all(r.map(x => formePlanning(x, a.auth.uid)));
  });
  app.get('/v1/appels/planning/:code', async (req) => { const a = await acteur(req); return formePlanning(await lirePlanning((req.params as any).code), a.auth.uid); });
  app.post('/v1/appels/planning/:code/inscrire', async (req, reply) => {
    const a = await acteur(req);
    const p = await lirePlanning((req.params as any).code);
    if (new Date(p.debut).getTime() + p.duree_min * 60_000 < Date.now()) return fail(410, 'Ce cours est terminé.');
    if (!p.inscrits.includes(a.auth.uid) && Number(p.prix_fcfa) > 0 && !(await placeIncluse(a, await tarifCours()))) {
      if (p.inscrits.length >= MAX_GROUPE) return fail(409, `Ce cours est complet (${MAX_GROUPE} personnes au maximum).`);
      return reply.status(402).send({ error: `Place payante : ${p.prix_fcfa} FCFA.`, paiement: { produitId: `seance:${p.code}`, prixFcfa: Number(p.prix_fcfa) } });
    }
    if (!p.inscrits.includes(a.auth.uid)) {
      const r = await db.query<any>(`UPDATE cours_planifies SET inscrits = array_append(inscrits, $2) WHERE code = $1 AND NOT ($2 = ANY(inscrits)) AND cardinality(inscrits) < $3 RETURNING code`, [p.code, a.auth.uid, MAX_GROUPE]);
      if (!r.length) return fail(409, `Ce cours est complet (${MAX_GROUPE} personnes au maximum).`);
    }
    return formePlanning(await lirePlanning(p.code), a.auth.uid);
  });
  app.post('/v1/appels/planning/:code/desinscrire', async (req, reply) => {
    const a = await acteur(req);
    const p = await lirePlanning((req.params as any).code);
    const payants = Number(p.prix_fcfa) > 0 && (p.inscrits as string[]).length > 1;
    if ((p.hote_id === a.auth.uid || a.isAdmin) && payants && !a.isAdmin) return fail(409, 'Des élèves ont payé leur place : seul un administrateur peut annuler ce cours (remboursements).');
    if (p.hote_id === a.auth.uid || (a.isAdmin && !p.inscrits.includes(a.auth.uid))) {
      if (payants) await journaliser(db, a.auth.uid, 'cours_annule_a_rembourser', p.code, { inscrits: p.inscrits, prix: p.prix_fcfa });
      await db.query(`DELETE FROM cours_planifies WHERE code = $1`, [p.code]);
    }
    else await db.query(`UPDATE cours_planifies SET inscrits = array_remove(inscrits, $2) WHERE code = $1`, [p.code, a.auth.uid]);
    return reply.status(204).send();
  });
  /** Entrer dans la salle d'un cours prévu : 15 minutes avant l'heure jusqu'à la fin, pour les inscrits seulement. */
  app.post('/v1/appels/planning/:code/entrer', async (req) => {
    const a = await acteur(req);
    const p = await lirePlanning((req.params as any).code);
    if (!p.inscrits.includes(a.auth.uid)) return fail(403, 'Inscris-toi d\'abord à ce cours.');
    const debut = new Date(p.debut).getTime();
    if (Date.now() < debut - AVANCE_ENTREE_MS) return fail(425, 'La salle ouvre 15 minutes avant le cours.');
    if (Date.now() > debut + p.duree_min * 60_000) return fail(410, 'Ce cours est terminé.');
    nettoyer();
    let s = salles.get(p.code);
    if (!s) { s = { id: p.code, hote: p.hote_id, titre: p.titre, cree: Date.now(), membres: new Map(), signaux: [], n: 0, planifie: true }; salles.set(p.code, s); }
    if (!s.membres.has(a.auth.uid)) s.membres.set(a.auth.uid, { nom: await nomDe(a.auth.uid) });
    return { id: s.id, titre: s.titre, membres: [...s.membres].map(([uid, m]) => ({ uid, nom: m.nom, hote: uid === s!.hote })) };
  });

  app.post('/v1/appels/:id/quitter', async (req, reply) => {
    const a = await acteur(req);
    const s = salles.get((req.params as any).id);
    if (s) { s.membres.delete(a.auth.uid); if (!s.membres.size) salles.delete(s.id); }
    return reply.status(204).send();
  });
}
