/**
 * Azeva côté serveur : le contenu des jeux ne quitte la base que manche par manche.
 * L'application ne contient aucun mot, aucune question, aucun plateau : elle demande une manche (jeu + niveau), le serveur
 * vérifie l'accès au niveau (niveau précédent gagné, puis rang, formule d'abonnement ou achat du palier), tire le contenu et le renvoie avec un jeton signé.
 * Le résultat de la partie doit présenter ce jeton : il fixe le jeu, le niveau, le nombre de questions et le bonus d'XP.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { accesAuNiveau, accesNiveau, NIVEAUX_INVITE, nombreNiveaux, palierDuNiveau, paliersDuJeu, reglesNiveau, type ItemJeu, type Palier, type ReglesManche } from '../../../packages/noyau/src/difficulte.ts';
import { graineJour, hasardGraine, lettres } from '../../../packages/noyau/src/moteurs.ts';
import { melanger } from '../../../packages/noyau/src/azeva.ts';
import type { Queryable } from './db.ts';
import { str, type Ctx } from './ctx.ts';
import { profilAcces } from './profil_acces.ts';

/** Long pour permettre de jouer hors ligne une manche préchargée et d'envoyer le résultat au retour du réseau. */
const DUREE_JETON_MS = 14 * 24 * 3600_000;
const MOTEURS_MOTS = new Set(['ogoni', 'pendu', 'anagramme', 'mots_meles', 'mots_croises', 'mots_fleches', 'memoire', 'plateau', 'relier']);
const MOTEURS_FICHES = new Set(['qcm', 'ordre', 'plateau']);
const MOTEURS_SANS_ITEMS = new Set(['ogoni', 'pendu', 'anagramme', 'mots_meles', 'mots_croises', 'mots_fleches', 'memoire', 'qcm', 'ordre', 'dictee', 'plateau']);

const liste = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : str(v) && v ? v.split('|').map(x => x.trim()) : []).filter(Boolean);
const ligne = (r: any) => ({ ...r.data, id: r.id });

// ------------------------------------------------------------------ jeton de manche
export interface ChargeManche { j: string; n: number; q: number; x: number; e: number; u: string }
const signer = (secret: string, corps: string) => createHmac('sha256', secret).update('manche.' + corps).digest('base64url');
export function creerJetonManche(secret: string, c: ChargeManche): string {
  const corps = Buffer.from(JSON.stringify(c)).toString('base64url');
  return `${corps}.${signer(secret, corps)}`;
}
/** Renvoie la charge si le jeton est authentique, non expiré, et émis pour ce compte (ou pour un invité). */
export function lireJetonManche(secret: string, jeton: unknown, uid: string | null, maintenant = Date.now()): ChargeManche | null {
  if (!str(jeton) || jeton.length > 600) return null;
  const [corps, sig] = jeton.split('.');
  if (!corps || !sig) return null;
  const attendu = Buffer.from(signer(secret, corps)), recu = Buffer.from(sig);
  if (attendu.length !== recu.length || !timingSafeEqual(attendu, recu)) return null;
  try {
    const c = JSON.parse(Buffer.from(corps, 'base64url').toString()) as ChargeManche;
    if (!str(c.j) || !Number.isInteger(c.n) || !Number.isInteger(c.q) || c.e < maintenant) return null;
    if (c.u && c.u !== uid) return null;
    return c;
  } catch { return null; }
}

// ------------------------------------------------------------------ lecture des niveaux et de l'accès
export async function paliersDe(q: Queryable, jeuId: string, total: number): Promise<Palier[]> {
  const r = await q.query<any>(`SELECT id, data FROM contenus WHERE collection = 'jeux_niveaux' AND publie AND deleted_at IS NULL AND owner_id IS NULL AND data->>'jeu_id' = $1`, [jeuId]);
  return paliersDuJeu(jeuId, r.map(ligne), total);
}

/** Profil d'accès complet d'un compte pour les niveaux : rang, formules, formule complète, achats (produits et contenus). Invité : rang 1, rien d'autre. */
export async function profilNiveau(q: Queryable, uid: string | null) {
  if (!uid) return { rang: 1, plans: [] as string[], tout: false, achats: [] as string[] };
  const p = await profilAcces(q, uid);
  const a = await q.query<any>(`SELECT produit_id, contenu_id FROM droits WHERE user_id = $1 AND type = 'achat' AND statut = 'actif' AND (fin IS NULL OR fin > clock_timestamp())`, [uid]);
  return { rang: p.rang, plans: [...p.plans], tout: p.tout, achats: [...new Set(a.flatMap(x => [x.produit_id, x.contenu_id]).filter(Boolean) as string[])] };
}

// ------------------------------------------------------------------ tirage du contenu
const item = (r: any): ItemJeu => ({
  id: r.id, enonce: String(r.data.enonce ?? ''), reponse: String(r.data.reponse ?? ''), leurres: liste(r.data.leurres), groupe: r.data.groupe ?? null,
  ordre: r.data.ordre ?? null, niveau: r.data.niveau ?? null, indice: r.data.indice ?? null, image: r.data.image ?? null, audio: r.data.audio ?? null, extra: r.data.extra ?? null,
});
const dansDialecte = (d: unknown, dialecte: string | null) => !d || !dialecte || String(d).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().startsWith(dialecte.slice(0, 5));

export async function tirerContenu(q: Queryable, jeu: Record<string, any> & { id: string }, regles: ReglesManche, dialecte: string | null, hasard: () => number = Math.random) {
  const moteur = String(jeu.moteur);
  const out = { mots: [] as any[], items: [] as ItemJeu[], fiches: [] as { id: string; myene: string; francais: string }[], cases: [] as any[] };
  const niveauOk = (n: unknown) => !Number(n) || Number(n) <= regles.contenuNiveau;

  if (MOTEURS_MOTS.has(moteur)) {
    const themes = liste(jeu.theme);
    const r = await q.query<any>(`SELECT id, data FROM contenus WHERE collection = 'mots_jeux' AND publie AND deleted_at IS NULL AND owner_id IS NULL`);
    let mots = r.map(ligne).filter(m => (!themes.length || themes.includes(String(m.theme ?? ''))) && dansDialecte(m.dialecte, dialecte));
    const faciles = mots.filter(m => niveauOk(m.niveau));
    if (faciles.length >= 4) mots = faciles;
    // Juste ce qu'il faut pour la manche (et quelques mots de plus pour les leurres et les lettres du clavier), jamais toute la banque.
    const besoin = Math.min(40, regles.questions * 3 + 6);
    out.mots = melanger(mots, hasard).slice(0, besoin).map(m => ({ id: m.id, myene: String(m.myene), francais: String(m.francais), theme: m.theme ?? null, niveau: m.niveau ?? null, audio: m.audio ?? null, image: m.image ?? null }));
    if (jeu.corpus === true && dialecte) {
      const f = await q.query<any>(
        `SELECT id, data->>'myeneText' AS m, data->>'frenchText' AS f FROM items WHERE deleted_at IS NULL AND status = 'active' AND dialect = $1
           AND data->>'myeneText' IS NOT NULL AND data->>'frenchText' IS NOT NULL AND position(' ' in btrim(data->>'myeneText')) = 0 ORDER BY random() LIMIT $2`, [dialecte, Math.min(30, regles.questions * 2 + 4)]);
      for (const x of f) { const n = lettres(String(x.m)).length; if (n >= 3 && n <= 12) out.mots.push({ id: x.id, myene: String(x.m).trim(), francais: String(x.f).trim() }); }
    }
  }
  if (MOTEURS_FICHES.has(moteur) && dialecte) {
    const f = await q.query<any>(
      `SELECT id, data->>'myeneText' AS m, data->>'frenchText' AS f FROM items WHERE deleted_at IS NULL AND status = 'active' AND dialect = $1
         AND btrim(COALESCE(data->>'myeneText', '')) <> '' AND btrim(COALESCE(data->>'frenchText', '')) <> '' ORDER BY random() LIMIT 60`, [dialecte]);
    out.fiches = f.map(x => ({ id: x.id, myene: String(x.m).trim(), francais: String(x.f).trim() }));
  }
  if (moteur === 'plateau') {
    const r = await q.query<any>(`SELECT id, data FROM contenus WHERE collection = 'plateau' AND publie AND deleted_at IS NULL AND owner_id IS NULL ORDER BY (data->>'position')::numeric`);
    out.cases = r.map(x => ({ id: x.id, position: Number(x.data.position) || 0, type: x.data.type, texte: x.data.texte ?? '', effet: Number(x.data.effet) || 0 }));
  }
  if (!MOTEURS_SANS_ITEMS.has(moteur)) {
    const banque = str(jeu.banque) && jeu.banque ? jeu.banque : jeu.id;
    const r = await q.query<any>(`SELECT id, data FROM contenus WHERE collection = 'jeux_items' AND publie AND deleted_at IS NULL AND owner_id IS NULL AND data->>'jeu_id' = $1 ORDER BY (data->>'ordre')::numeric NULLS LAST, id`, [banque]);
    let items = r.filter(x => dansDialecte(x.data.dialecte, dialecte)).map(item);
    if (moteur === 'sequence') {
      // Une suite entière ou rien : on tire des groupes complets.
      const groupes = melanger([...new Set(items.map(i => i.groupe || 'suite'))], hasard).slice(0, regles.questions);
      out.items = items.filter(i => groupes.includes(i.groupe || 'suite'));
    } else {
      const faciles = items.filter(i => niveauOk(i.niveau));
      if (faciles.length >= Math.min(4, items.length)) items = faciles;
      // Les questions de la manche, plus de quoi fabriquer des leurres : jamais toute la banque d'un coup.
      out.items = melanger(items, hasard).slice(0, Math.min(40, regles.questions * 3 + 6));
    }
  }
  return out;
}

/** Trois questions de duel, identiques pour les deux joueurs : tirage reproductible depuis la graine du duel. */
export async function questionsDuDuel(q: Queryable, seed: string) {
  const r = await q.query<any>(`SELECT id, data FROM contenus WHERE collection = 'mots_jeux' AND publie AND deleted_at IS NULL AND owner_id IS NULL ORDER BY id`);
  const base = r.map(ligne);
  if (base.length < 4) return [];
  const h = hasardGraine(graineJour(seed));
  return melanger(base, h).slice(0, 3).map(m => {
    const faux = melanger(base.filter(x => x.id !== m.id && String(x.myene) !== String(m.myene)), h).slice(0, 3).map(x => String(x.myene));
    const options = melanger([String(m.myene), ...faux], h);
    return { enonce: `Comment dit-on « ${m.francais} » ?`, options, bonne: options.indexOf(String(m.myene)) };
  });
}

export function registerAzeva({ app, db, fail, acteur, cles }: Ctx) {
  /** Paliers d'un jeu avec, pour le compte, ce qui est ouvert ou non, et le plus haut niveau gagné. */
  const etatNiveaux = async (jeuId: string, uid: string | null, personnel: boolean) => {
    const jeu = (await db.query<any>(`SELECT id, data FROM contenus WHERE collection = 'jeux' AND id = $1 AND publie AND deleted_at IS NULL`, [jeuId]))[0];
    if (!jeu) return fail(404, 'Jeu introuvable.');
    const profil = await profilNiveau(db, uid);
    const total = nombreNiveaux(jeu.data);
    const paliers = await paliersDe(db, jeuId, total);
    // Sans compte, la progression n'est pas connue du serveur : les premiers niveaux sont tous ouverts, les suivants demandent un compte.
    const atteint = personnel ? total : uid ? Number((await db.query<any>(`SELECT data->'niveauxGagnes'->>$2 AS n FROM progression WHERE user_id = $1`, [uid, jeuId]))[0]?.n ?? 0) : NIVEAUX_INVITE;
    return { jeu, profil, total, atteint, paliers: paliers.map(p => ({ ...p, acces: personnel ? { ok: true as const } : accesNiveau(p, profil) })) };
  };
  const sortie = (e: Awaited<ReturnType<typeof etatNiveaux>>, invite: boolean) => ({ total: e.total, atteint: invite ? 0 : Math.min(e.atteint, e.total), invite, paliers: e.paliers });
  app.get('/pub/jeux/:id/niveaux', async (req) => sortie(await etatNiveaux((req.params as any).id, null, false), true));
  app.get('/v1/jeux/:id/niveaux', async (req) => { const a = await acteur(req); return sortie(await etatNiveaux((req.params as any).id, a.auth.uid, a.isStaff), false); });

  const manche = async (req: any, uid: string | null, personnel: boolean) => {
    const b = (req.body || {}) as { niveau?: number; dialecte?: string };
    const e = await etatNiveaux(req.params.id, uid, personnel);
    const jeu = { ...e.jeu.data, id: e.jeu.id } as Record<string, any> & { id: string };
    const n = Math.floor(Number(b.niveau) || 1);
    if (n < 1 || n > e.total) return fail(404, 'Niveau introuvable.');
    if (!personnel) {
      // Règle du jeu lui-même (rang et formule), puis celle du niveau : niveau précédent gagné, puis condition du palier.
      const rj = accesNiveau({ id: jeu.id, rang_min: jeu.rang_min, plans: jeu.plans, produit_id: null }, e.profil);
      if (!rj.ok) return fail(402, rj.motif === 'rang_requis' ? `Ce jeu s'ouvre au rang ${rj.rangMin}.` : 'Ce jeu demande une formule d\'abonnement.');
      const r = accesAuNiveau(n, e.paliers, e.atteint, e.profil, !uid);
      if (!r.ok) {
        if (r.motif === 'compte_requis') return fail(401, `Sans compte, tu peux jouer les ${NIVEAUX_INVITE} premiers niveaux. Connecte-toi pour continuer.`);
        if (r.motif === 'niveau_precedent') return fail(409, `Gagne d'abord le niveau ${r.atteint + 1}.`);
        return fail(402, r.motif === 'rang_requis' ? `Ce niveau s'ouvre au rang ${r.rangMin}.` : r.motif === 'achat_requis' ? 'Ce niveau s\'achète, ou s\'ouvre avec une formule d\'abonnement.' : 'Ce niveau demande une formule d\'abonnement.');
      }
    }
    const palier = palierDuNiveau(e.paliers, n);
    const regles = reglesNiveau(String(jeu.moteur), n, palier, e.total, Number(jeu.duree_s) || 0);
    const dialecte = str(b.dialecte) && /^[a-z]{3,12}$/.test(b.dialecte) ? b.dialecte : null;
    // Le niveau N d'un jeu tire toujours le même contenu (graine = jeu + niveau) : tout le monde affronte le même niveau.
    const contenu = await tirerContenu(db, jeu, regles, dialecte, hasardGraine(graineJour(`${jeu.id}#${n}`)));
    const jeton = creerJetonManche(cles.manches, { j: jeu.id, n, q: Math.min(60, Math.max(regles.questions, 1) * 2 + 6), x: regles.xpPct, e: Date.now() + DUREE_JETON_MS, u: uid ?? '' });
    return { jeton, jeuId: jeu.id, moteur: jeu.moteur, regles, palier: palier.titre, ...contenu };
  };
  /** Sans compte : essai libre sur les premiers niveaux, s'ils ne demandent ni rang, ni formule, ni achat. */
  app.post('/pub/jeux/:id/manche', async (req) => manche(req, null, false));
  app.post('/v1/jeux/:id/manche', async (req) => { const a = await acteur(req); return manche(req, a.auth.uid, a.isStaff); });

  app.get('/v1/duels/:id/questions', async (req) => {
    const r = (await db.query<any>(`SELECT data FROM contenus WHERE collection = 'duels' AND id = $1 AND deleted_at IS NULL`, [(req.params as any).id]))[0];
    if (!r) return fail(404, 'Duel introuvable.');
    const questions = await questionsDuDuel(db, String(r.data.seed));
    if (!questions.length) return fail(409, 'Pas assez de mots publiés pour un duel.');
    return { questions };
  });
}
