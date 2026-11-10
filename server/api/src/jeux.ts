/**
 * Progression (leçons, unités, séries), parties d'Azeva, succès, XP partagé et classements.
 * Le client envoie ses réponses ; le serveur recalcule le score et décide de l'XP (plafonds quotidiens).
 */
import { scorePartie, jourLocal } from '../../../packages/noyau/src/moteurs.ts';
import { terminerLecon, uniteValidee, progressionVide, majSerie, XP_LECON, type ProgressionOnenji } from '../../../packages/noyau/src/lecons.ts';
import { nouveauRang } from '../../../packages/noyau/src/rangs.ts';
import { getLevelForXp } from '../../../shared/levels.ts';
import type { Queryable } from './db.ts';
import { parametre, str, type Ctx } from './ctx.ts';
import { verifierRegle } from './profil_acces.ts';

const PLAFOND_XP_JEUX_JOUR = 150;
const XP_UNITE = 30;

interface Donnees extends ProgressionOnenji {
  parties: number; victoires: number; points: number; succes: string[]; avatar?: string; prefs?: Record<string, unknown>;
  defisFaits: Record<string, string>; amis: string[]; contributions?: number;
  /** Chapitres de livres terminés : identifiant -> jour et résultat du quiz (l'XP n'est donnée qu'une fois par chapitre). */
  lectures?: Record<string, { jour: string; bonnes: number; sur: number }>;
}
const vide = (): Donnees => ({ ...progressionVide(), parties: 0, victoires: 0, points: 0, succes: [], defisFaits: {}, amis: [] });

export async function lireProgression(q: Queryable, uid: string): Promise<Donnees> {
  const r = await q.query<any>(`SELECT data FROM progression WHERE user_id = $1`, [uid]);
  return { ...vide(), ...(r[0]?.data ?? {}) };
}
const ecrire = (q: Queryable, uid: string, d: Donnees) =>
  q.query(`INSERT INTO progression (user_id, data) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = clock_timestamp()`, [uid, JSON.stringify(d)]);

/** Ajoute de l'XP au profil (colonnes protégées, écrites par le serveur seul) et renvoie le nouveau total et le rang éventuellement atteint. */
async function donnerXp(q: Queryable, uid: string, xp: number) {
  const r = await q.query<any>(`SELECT xp FROM users WHERE id = $1 FOR UPDATE`, [uid]);
  const avant = Number(r[0]?.xp ?? 0), apres = avant + Math.max(0, Math.floor(xp));
  if (apres !== avant) {
    const niv = getLevelForXp(apres);
    await q.query(`UPDATE users SET xp = $2, level = $3, level_index = $4 WHERE id = $1`, [uid, apres, niv.name, niv.index]);
  }
  return { xp: apres, nouveauRang: nouveauRang(avant, apres) };
}

export function registerJeux({ app, db, fail, acteur, ensureUser, notify }: Ctx) {
  app.get('/v1/progression', async (req) => {
    const a = await acteur(req);
    await ensureUser(db, a.auth);
    const d = await lireProgression(db, a.auth.uid);
    const u = (await db.query<any>(`SELECT xp, contributions_count FROM users WHERE id = $1`, [a.auth.uid]))[0];
    return { ...d, xp: Number(u?.xp ?? 0), contributions: Number(u?.contributions_count ?? 0) };
  });

  /** Préférences et avatar seulement : tout le reste est calculé par le serveur. */
  app.put('/v1/progression', async (req) => {
    const a = await acteur(req);
    await ensureUser(db, a.auth);
    const b = (req.body || {}) as { prefs?: Record<string, unknown>; avatar?: string; amis?: string[] };
    return db.tx(async q => {
      const d = await lireProgression(q, a.auth.uid);
      if (b.prefs && typeof b.prefs === 'object') d.prefs = JSON.parse(JSON.stringify(b.prefs).slice(0, 4000));
      if (str(b.avatar)) d.avatar = b.avatar.slice(0, 60);
      if (Array.isArray(b.amis)) d.amis = b.amis.filter(str).slice(0, 100);
      await ecrire(q, a.auth.uid, d);
      return d;
    });
  });

  app.post('/v1/progression/lecon', async (req) => {
    const a = await acteur(req);
    const { leconId, bonnes = 0, erreurs = 0 } = (req.body || {}) as { leconId?: string; bonnes?: number; erreurs?: number };
    if (!str(leconId) || !Number.isInteger(bonnes) || !Number.isInteger(erreurs) || bonnes < 0 || erreurs < 0 || bonnes + erreurs > 60) return fail(400, 'Résultat de leçon invalide.');
    const l = await db.query<any>(`SELECT data FROM contenus WHERE collection = 'lecons' AND id = $1 AND publie AND deleted_at IS NULL`, [leconId]);
    if (!l.length) return fail(404, 'Leçon introuvable.');
    { const r = await verifierRegle(db, a.auth.uid, a.isStaff, l[0].data); if (!r.ok) return fail(402, 'Cette leçon demande un niveau ou un abonnement supérieur.'); }
    const out = await db.tx(async q => {
      await ensureUser(q, a.auth);
      const d = await lireProgression(q, a.auth.uid);
      const lecon = { ...l[0].data, id: leconId };
      const xpLecon = Number(lecon.xp) > 0 ? Number(lecon.xp) : XP_LECON;
      const dejaFaite = !!d.leconsTerminees[leconId];
      const apres = terminerLecon(d, lecon, { index: bonnes + erreurs, bonnes, erreurs, termine: true, xp: xpLecon }, jourLocal());
      const suite: Donnees = { ...d, ...apres, xp: 0 };
      const gain = dejaFaite ? 0 : xpLecon;
      await ecrire(q, a.auth.uid, suite);
      const x = await donnerXp(q, a.auth.uid, gain);
      return { xpGagne: gain, xp: x.xp, nouveauRang: x.nouveauRang, serie: suite.serie, recordSerie: suite.recordSerie, lecons: suite.leconsTerminees };
    });
    notify('progression');
    return out;
  });

  app.post('/v1/progression/unite', async (req) => {
    const a = await acteur(req);
    const { uniteId, bonnes, sur } = (req.body || {}) as { uniteId?: string; bonnes?: number; sur?: number };
    if (!str(uniteId) || !Number.isInteger(bonnes) || !Number.isInteger(sur) || sur! < 1 || sur! > 20 || bonnes! < 0 || bonnes! > sur!) return fail(400, 'Résultat invalide.');
    return db.tx(async q => {
      await ensureUser(q, a.auth);
      const d = await lireProgression(q, a.auth.uid);
      const valide = uniteValidee(bonnes!, sur!);
      let gain = 0;
      if (valide && !d.unitesValidees.includes(uniteId)) { d.unitesValidees.push(uniteId); gain = XP_UNITE; await ecrire(q, a.auth.uid, d); }
      const x = await donnerXp(q, a.auth.uid, gain);
      return { valide, xpGagne: gain, xp: x.xp, nouveauRang: x.nouveauRang, unitesValidees: d.unitesValidees };
    });
  });

  app.post('/v1/jeux/partie', async (req) => {
    const a = await acteur(req);
    const b = (req.body || {}) as { jeuId?: string; bonnes?: number; erreurs?: number; secondesRestantes?: number; serie?: number; defiId?: string };
    const bon = Number(b.bonnes), err = Number(b.erreurs);
    if (!str(b.jeuId) || !Number.isInteger(bon) || !Number.isInteger(err) || bon < 0 || err < 0 || bon > 60 || err > 60) return fail(400, 'Résultat de partie invalide.');
    const jeu = await db.query<any>(`SELECT data FROM contenus WHERE collection = 'jeux' AND id = $1 AND publie AND deleted_at IS NULL`, [b.jeuId]);
    if (!jeu.length) return fail(404, 'Jeu introuvable.');
    { const r = await verifierRegle(db, a.auth.uid, a.isStaff, jeu[0].data); if (!r.ok) return fail(402, 'Ce jeu demande un niveau ou un abonnement supérieur.'); }
    const score = scorePartie({ bonnes: bon, erreurs: err, secondesRestantes: Math.min(60, Math.max(0, Number(b.secondesRestantes) || 0)), serie: Math.min(5, Math.max(0, Number(b.serie) || 0)) });
    const out = await db.tx(async q => {
      await ensureUser(q, a.auth);
      await q.query(`INSERT INTO scores (user_id, jeu_id, score, bonnes, erreurs) VALUES ($1,$2,$3,$4,$5)`, [a.auth.uid, b.jeuId, score, bon, err]);
      const d = await lireProgression(q, a.auth.uid);
      const jour = jourLocal();
      const dejaXp = Number((await q.query<any>(`SELECT COALESCE(sum(LEAST(30, score / 50)), 0)::int AS xp FROM scores WHERE user_id = $1 AND jour = current_date AND id <> (SELECT max(id) FROM scores WHERE user_id = $1)`, [a.auth.uid]))[0].xp);
      let xpPartie = Math.min(30, Math.floor(score / 50));
      xpPartie = Math.max(0, Math.min(xpPartie, PLAFOND_XP_JEUX_JOUR - dejaXp));
      d.parties++; d.points += score; if (bon > err) d.victoires++;
      Object.assign(d, majSerie(d, jour));
      // Défi du jour ou de la semaine : une seule récompense par défi
      let xpDefi = 0;
      if (str(b.defiId) && !d.defisFaits[b.defiId]) {
        const df = await q.query<any>(`SELECT data FROM contenus WHERE collection = 'defis' AND id = $1 AND publie AND deleted_at IS NULL`, [b.defiId]);
        if (df.length && (df[0].data.jeu_id ?? b.jeuId) === b.jeuId && bon >= Math.min(Number(df[0].data.objectif) || 1, 60)) { xpDefi = Number(df[0].data.xp) || 0; d.defisFaits[b.defiId] = jour; }
      }
      // Succès
      const sc = await q.query<any>(`SELECT id, data FROM contenus WHERE collection = 'succes' AND publie AND deleted_at IS NULL`);
      const compteurs: Record<string, number> = { parties: d.parties, victoires: d.victoires, serie: d.serie, points: d.points, lecons: Object.keys(d.leconsTerminees).length, contributions: Number((await q.query<any>(`SELECT contributions_count AS n FROM users WHERE id = $1`, [a.auth.uid]))[0]?.n ?? 0) };
      const debloques: { id: string; titre: string; xp: number }[] = [];
      for (const s of sc) if (!d.succes.includes(s.id) && (compteurs[s.data.condition] ?? 0) >= Number(s.data.seuil)) { d.succes.push(s.id); debloques.push({ id: s.id, titre: s.data.titre, xp: Number(s.data.xp) || 0 }); }
      const gain = xpPartie + xpDefi + debloques.reduce((n, s) => n + s.xp, 0);
      await ecrire(q, a.auth.uid, d);
      const x = await donnerXp(q, a.auth.uid, gain);
      return { score, xpGagne: gain, xp: x.xp, nouveauRang: x.nouveauRang, succesDebloques: debloques, serie: d.serie, defiRempli: xpDefi > 0 };
    });
    notify('scores');
    return out;
  });

  /** Fin d'un chapitre de la bibliothèque : XP une seule fois par chapitre (6 + 2 par bonne réponse au quiz, 16 au plus), compte dans la série. */
  app.post('/v1/bibliotheque/chapitre', async (req) => {
    const a = await acteur(req);
    const b = (req.body || {}) as { livreId?: string; chapitreId?: string; bonnes?: number; sur?: number };
    const bon = Number(b.bonnes), sur = Number(b.sur);
    if (!str(b.livreId) || !str(b.chapitreId) || !Number.isInteger(bon) || !Number.isInteger(sur) || bon < 0 || sur < 0 || sur > 10 || bon > sur) return fail(400, 'Résultat de lecture invalide.');
    const livre = await db.query<any>(`SELECT data FROM contenus WHERE collection = 'bibliotheque' AND id = $1 AND publie AND deleted_at IS NULL`, [b.livreId]);
    const chap = await db.query<any>(`SELECT 1 FROM contenus WHERE collection = 'livre_chapitres' AND id = $1 AND data->>'livre_id' = $2 AND publie AND deleted_at IS NULL`, [b.chapitreId, b.livreId]);
    if (!livre.length || !chap.length) return fail(404, 'Chapitre introuvable.');
    { const r = await verifierRegle(db, a.auth.uid, a.isStaff, livre[0].data); if (!r.ok) return fail(402, 'Ce livre demande un niveau ou un abonnement supérieur.'); }
    const out = await db.tx(async q => {
      await ensureUser(q, a.auth);
      const d = await lireProgression(q, a.auth.uid);
      d.lectures ??= {};
      const jour = jourLocal();
      const premiere = !d.lectures[b.chapitreId!];
      if (premiere) d.lectures[b.chapitreId!] = { jour, bonnes: bon, sur };
      else if (bon > d.lectures[b.chapitreId!].bonnes) d.lectures[b.chapitreId!] = { jour: d.lectures[b.chapitreId!].jour, bonnes: bon, sur };
      Object.assign(d, majSerie(d, jour));
      const sc = await q.query<any>(`SELECT id, data FROM contenus WHERE collection = 'succes' AND publie AND deleted_at IS NULL`);
      const compteurs: Record<string, number> = { chapitres: Object.keys(d.lectures).length, serie: d.serie, points: d.points };
      const debloques: { id: string; titre: string; xp: number }[] = [];
      for (const s of sc) if (s.data.condition === 'chapitres' && !d.succes.includes(s.id) && (compteurs.chapitres ?? 0) >= Number(s.data.seuil)) { d.succes.push(s.id); debloques.push({ id: s.id, titre: s.data.titre, xp: Number(s.data.xp) || 0 }); }
      const gain = (premiere ? 6 + 2 * Math.min(bon, 5) : 0) + debloques.reduce((n, s) => n + s.xp, 0);
      await ecrire(q, a.auth.uid, d);
      const x = await donnerXp(q, a.auth.uid, gain);
      return { xpGagne: gain, xp: x.xp, nouveauRang: x.nouveauRang, premiereFois: premiere, succesDebloques: debloques, serie: d.serie, chapitresLus: compteurs.chapitres };
    });
    notify('scores');
    return out;
  });

  app.get('/v1/jeux/classement', async (req) => {
    const a = await acteur(req);
    const { portee = 'semaine', groupe = 'tous', jeu } = req.query as Record<string, string>;
    const depuis = portee === 'jour' ? `s.jour = current_date` : portee === 'mois' ? `s.at > clock_timestamp() - interval '30 days'` : portee === 'tout' ? 'true' : `s.at > clock_timestamp() - interval '7 days'`;
    const moi = (await db.query<any>(`SELECT data FROM users WHERE id = $1`, [a.auth.uid]))[0]?.data ?? {};
    const params: unknown[] = [];
    let filtre = '';
    if (jeu) { params.push(jeu); filtre += ` AND s.jeu_id = $${params.length}`; }
    if (groupe === 'ethnie' && moi.tribe) { params.push(moi.tribe); filtre += ` AND u.data->>'tribe' = $${params.length}`; }
    if (groupe === 'village' && moi.villageOfOrigin) { params.push(moi.villageOfOrigin); filtre += ` AND u.data->>'villageOfOrigin' = $${params.length}`; }
    if (groupe === 'amis') {
      const d = await lireProgression(db, a.auth.uid);
      params.push([a.auth.uid, ...d.amis]); filtre += ` AND s.user_id = ANY($${params.length}::text[])`;
    }
    const rows = await db.query<any>(
      `SELECT s.user_id AS id, COALESCE(u.data->>'displayName', 'Joueur') AS nom, u.data->>'tribe' AS tribu, sum(s.score)::int AS points, count(*)::int AS parties
       FROM scores s JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL AND u.status <> 'suspended'
       WHERE ${depuis} ${filtre} GROUP BY s.user_id, u.data->>'displayName', u.data->>'tribe' ORDER BY points DESC, s.user_id LIMIT 50`, params);
    const classement = rows.map((r, i) => ({ rang: i + 1, ...r, moi: r.id === a.auth.uid }));
    return { portee, groupe, classement, maPlace: classement.find(r => r.moi)?.rang ?? null };
  });

  /** Défi du jour : choisi par la date (identique pour tous) parmi les défis publiés, sinon parmi les jeux. */
  app.get('/pub/defi-du-jour', async () => {
    const jour = jourLocal();
    const d = await db.query<any>(`SELECT id, data FROM contenus WHERE collection = 'defis' AND publie AND deleted_at IS NULL AND data->>'type' = 'jour' AND (data->>'debut' IS NULL OR data->>'debut' <= $1) AND (data->>'fin' IS NULL OR data->>'fin' >= $1) ORDER BY id`, [jour]);
    return { jour, defi: d.length ? { ...d[0].data, id: d[0].id } : null };
  });

  app.post('/v1/progression/amis', async (req) => {
    const a = await acteur(req);
    const { telephone } = (req.body || {}) as { telephone?: string };
    if (!str(telephone)) return fail(400, 'Numéro attendu.');
    const uid = 'tel_' + telephone.replace(/\D/g, '');
    const u = await db.query<any>(`SELECT id, data->>'displayName' AS nom FROM users WHERE id = $1 AND deleted_at IS NULL`, [uid]);
    if (!u.length || uid === a.auth.uid) return fail(404, 'Aucun joueur avec ce numéro.');
    await db.tx(async q => { const d = await lireProgression(q, a.auth.uid); if (!d.amis.includes(uid)) d.amis.push(uid); await ecrire(q, a.auth.uid, d); });
    return { ajoute: u[0] };
  });

  // ---------------------------------------------------------------- duels asynchrones : même graine, trois manches, le meilleur score gagne
  const nomDe = async (uid: string, q: Queryable = db) => (await q.query<any>(`SELECT data->>'displayName' AS n FROM users WHERE id = $1`, [uid]))[0]?.n || 'Joueur';
  const duelOut = (r: any) => ({ id: r.id, seed: r.data.seed, createur: r.owner_id, scores: r.data.scores ?? {}, noms: r.data.noms ?? {}, termine: Object.keys(r.data.scores ?? {}).length >= 2 });
  app.post('/v1/duels', async (req, reply) => {
    const a = await acteur(req);
    const n = (await db.query<any>(`SELECT count(*)::int AS n FROM contenus WHERE collection = 'duels' AND owner_id = $1 AND created_at > clock_timestamp() - interval '1 day'`, [a.auth.uid]))[0].n;
    if (n >= 10) return fail(429, 'Tu as lancé assez de duels aujourd\'hui.');
    const id = Math.random().toString(36).slice(2, 8);
    const seed = Math.random().toString(36).slice(2, 10);
    await db.query(`INSERT INTO contenus (collection, id, data, publie, statut, owner_id) VALUES ('duels', $1, $2, false, 'publie', $3)`, [id, JSON.stringify({ seed, scores: {}, noms: {} }), a.auth.uid]);
    return reply.status(201).send({ id, seed });
  });
  app.get('/v1/duels/:id', async (req) => {
    const r = (await db.query<any>(`SELECT id, data, owner_id FROM contenus WHERE collection = 'duels' AND id = $1 AND deleted_at IS NULL`, [(req.params as any).id]))[0];
    if (!r) return fail(404, 'Duel introuvable.');
    return duelOut(r);
  });
  app.post('/v1/duels/:id/jouer', async (req) => {
    const a = await acteur(req);
    const { score } = (req.body || {}) as { score?: number };
    if (!Number.isInteger(score) || score! < 0 || score! > 2000) return fail(400, 'Score invalide.');
    return db.tx(async q => {
      const r = (await q.query<any>(`SELECT id, data, owner_id FROM contenus WHERE collection = 'duels' AND id = $1 AND deleted_at IS NULL FOR UPDATE`, [(req.params as any).id]))[0];
      if (!r) return fail(404, 'Duel introuvable.');
      const scores = r.data.scores ?? {}, noms = r.data.noms ?? {};
      if (scores[a.auth.uid] !== undefined) return fail(409, 'Tu as déjà joué ce duel.');
      if (Object.keys(scores).length >= 2) return fail(409, 'Ce duel est complet.');
      scores[a.auth.uid] = score; noms[a.auth.uid] = await nomDe(a.auth.uid, q);
      await q.query(`UPDATE contenus SET data = $3, updated_at = clock_timestamp() WHERE collection = 'duels' AND id = $1 AND owner_id = $2`, [r.id, r.owner_id, JSON.stringify({ ...r.data, scores, noms })]);
      return duelOut({ ...r, data: { ...r.data, scores, noms } });
    });
  });

  void parametre;
}
