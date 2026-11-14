/**
 * Bibliothèque d'Onenji, servie par morceaux (14 nov. 2026) : 13 000 livres et 147 000 chapitres (≈ 400 Mo de texte) ne tiennent
 * pas dans une lecture en bloc (/pub/contenus/livre_chapitres tombait en erreur 500, la liste des livres pesait 8 Mo).
 * - liste paginée et filtrée des livres (champs légers, gardés en mémoire quelques minutes) ;
 * - fiche d'un livre avec la liste de ses chapitres, sans leur texte ;
 * - texte d'un chapitre, un par un, avec le contrôle d'accès du livre (gratuit sans compte ; sinon droits du compte).
 * Aucune donnée personnelle n'est renvoyée par les routes /pub.
 */
import { peutAcceder, type NiveauAcces } from '../../../packages/noyau/src/acces.ts';
import { str, type Ctx } from './ctx.ts';
import { verifierRegle } from './profil_acces.ts';
import { droitsDe } from './services.ts';

const ID_RE = /^[A-Za-z0-9_.:-]{1,200}$/;
const DUREE_CACHE_MS = 5 * 60_000;
/** Champs envoyés dans la liste (le reste — fichier, empreinte, source, rag_fait… — reste sur le serveur ou dans la fiche). */
const CHAMPS_LISTE = ['titre', 'auteur', 'categorie', 'annee', 'cycle', 'couleur', 'image', 'type', 'langue', 'url', 'minutes', 'nb_chapitres', 'niveau_acces', 'rang_min', 'plans', 'ordre'] as const;
type LivreLeger = Record<string, unknown> & { id: string; titre: string };

const sansAccents = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nombre = (v: unknown, defaut: number, min: number, max: number) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut; };

/** Livre lisible sans compte : gratuit (libre ou gratuit avec publicité) et sans règle de rang ni de formule. */
export const livreGratuit = (d: Record<string, any>) => {
  const n = (d.niveau_acces || 'libre') as string;
  return (n === 'libre' || n === 'gratuit_avec_pub') && !(Number(d.rang_min) > 0) && !(Array.isArray(d.plans) && d.plans.length);
};

export function registerBibliotheque({ app, db, fail, acteur }: Ctx) {
  let cache: { t: number; livres: LivreLeger[]; rayons: { rayon: string; n: number }[] } | null = null;
  const charger = async () => {
    if (cache && Date.now() - cache.t < DUREE_CACHE_MS) return cache;
    const rows = await db.query<any>(`SELECT id, data FROM contenus WHERE collection = 'bibliotheque' AND publie AND deleted_at IS NULL AND owner_id IS NULL`);
    // Les livres du scanner portent « nb_chapitres » ; ceux importés par la console non : on compte leurs chapitres (par l'index,
    // seulement pour eux ; compter les 150 000 chapitres d'un coup prend ≈ 12 s en production).
    const sansCompte = rows.filter(r => r.data.nb_chapitres === undefined || r.data.nb_chapitres === null || r.data.nb_chapitres === '' || !Number.isFinite(Number(r.data.nb_chapitres))).map(r => r.id as string);
    const comptes = new Map<string, number>(), sansCompteSet = new Set(sansCompte);
    for (let i = 0; i < sansCompte.length; i += 500) {
      const lot = sansCompte.slice(i, i + 500);
      for (const x of await db.query<any>(`SELECT data->>'livre_id' AS l, count(*)::int AS n FROM contenus WHERE collection = 'livre_chapitres' AND data->>'livre_id' = ANY($1) AND publie AND deleted_at IS NULL GROUP BY 1`, [lot])) comptes.set(x.l, Number(x.n));
    }
    const livres: LivreLeger[] = rows
      .map(r => { const o: LivreLeger = { id: r.id, titre: String(r.data.titre ?? r.id) }; for (const k of CHAMPS_LISTE) if (r.data[k] !== undefined && r.data[k] !== null && r.data[k] !== '') o[k] = r.data[k]; if (sansCompteSet.has(r.id)) o.nb_chapitres = comptes.get(r.id) ?? 0; return o; })
      // Un livre sans chapitre ni lien n'a rien à ouvrir : il n'apparaît pas.
      .filter(l => Number(l.nb_chapitres) > 0 || str(l.url))
      .sort((a, b) => (Number(a.ordre) || 1e9) - (Number(b.ordre) || 1e9) || a.titre.localeCompare(b.titre, 'fr'));
    const parRayon = new Map<string, number>();
    for (const l of livres) { const r = String(l.categorie || 'Livres'); parRayon.set(r, (parRayon.get(r) ?? 0) + 1); }
    cache = { t: Date.now(), livres, rayons: [...parRayon].map(([rayon, n]) => ({ rayon, n })).sort((a, b) => b.n - a.n) };
    return cache;
  };

  /** Liste : ?q= (titre ou auteur), ?rayon=, ?cycleMax= (mode enfant), ?ids=a,b (livres précis), ?page=0&n=30 (60 au plus). */
  app.get('/pub/bibliotheque', async (req, reply) => {
    const qs = (req.query || {}) as Record<string, string>;
    const { livres } = await charger();
    let l = livres;
    if (str(qs.ids)) { const ids = new Set(qs.ids.split(',').filter(x => ID_RE.test(x)).slice(0, 60)); l = l.filter(x => ids.has(x.id)); }
    if (str(qs.rayon)) l = l.filter(x => String(x.categorie || 'Livres') === qs.rayon.slice(0, 120));
    if (str(qs.cycleMax)) { const m = nombre(qs.cycleMax, 9, 1, 9); l = l.filter(x => !Number(x.cycle) || Number(x.cycle) <= m); }
    if (str(qs.q) && qs.q.trim().length >= 2) {
      const mots = sansAccents(qs.q.slice(0, 100)).split(/\s+/).filter(Boolean);
      l = l.filter(x => { const t = sansAccents(`${x.titre} ${x.auteur ?? ''}`); return mots.every(m => t.includes(m)); });
    }
    const n = nombre(qs.n, 30, 1, 60), page = nombre(qs.page, 0, 0, 100_000);
    reply.header('Cache-Control', 'public, max-age=60');
    return { total: l.length, page, n, livres: l.slice(page * n, page * n + n) };
  });

  app.get('/pub/bibliotheque/rayons', async (_req, reply) => {
    const { rayons, livres } = await charger();
    reply.header('Cache-Control', 'public, max-age=120');
    return { total: livres.length, chapitres: livres.reduce((s, x) => s + (Number(x.nb_chapitres) || 0), 0), rayons };
  });

  /** Fiche : le livre (sans les champs techniques) et ses chapitres sans texte (titre, ordre, nombre de mots). */
  app.get('/pub/bibliotheque/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!ID_RE.test(id)) return fail(400, 'Identifiant de livre invalide.');
    const r = (await db.query<any>(`SELECT data FROM contenus WHERE collection = 'bibliotheque' AND id = $1 AND publie AND deleted_at IS NULL AND owner_id IS NULL`, [id]))[0];
    if (!r) return fail(404, 'Livre introuvable.');
    const { fichier: _f, empreinte: _e, rag_fait: _r, ...livre } = r.data;
    const chapitres = await db.query<any>(
      `SELECT id, data->>'titre' AS titre, (data->>'ordre')::numeric AS ordre, length(data->>'texte') AS lettres
       FROM contenus WHERE collection = 'livre_chapitres' AND data->>'livre_id' = $1 AND publie AND deleted_at IS NULL ORDER BY (data->>'ordre')::numeric NULLS LAST, id`, [id]);
    reply.header('Cache-Control', 'public, max-age=120');
    return { livre: { ...livre, id }, chapitres: chapitres.map(c => ({ id: c.id, titre: c.titre, ordre: Number(c.ordre) || 0, mots: Math.round((Number(c.lettres) || 0) / 6) })) };
  });

  /** Texte d'un chapitre. Sans compte : livres gratuits seulement ; avec compte (/v1) : selon les droits (forfait, achat, rang). */
  const chapitre = async (req: any, avecCompte: boolean) => {
    const { id, cid } = req.params as { id: string; cid: string };
    if (!ID_RE.test(id) || !ID_RE.test(cid)) return fail(400, 'Identifiant invalide.');
    const l = (await db.query<any>(`SELECT data FROM contenus WHERE collection = 'bibliotheque' AND id = $1 AND publie AND deleted_at IS NULL AND owner_id IS NULL`, [id]))[0];
    if (!l) return fail(404, 'Livre introuvable.');
    if (!livreGratuit(l.data)) {
      if (!avecCompte) return fail(401, 'Connecte-toi pour lire ce livre.');
      const a = await acteur(req);
      if (!a.isStaff) {
        const d = peutAcceder({ id, acces: (l.data.niveau_acces || 'libre') as NiveauAcces, roles: ['admin', 'validator'] }, await droitsDe(db, a.auth.uid, a.role));
        if (!d.ok) return fail(402, 'Ce livre est réservé : passe à un forfait ou achète-le.');
        if (!(await verifierRegle(db, a.auth.uid, a.isStaff, l.data)).ok) return fail(402, 'Ce livre s\'ouvre à un rang ou avec une formule supérieurs.');
      }
    }
    const c = (await db.query<any>(`SELECT id, data FROM contenus WHERE collection = 'livre_chapitres' AND id = $1 AND data->>'livre_id' = $2 AND publie AND deleted_at IS NULL`, [cid, id]))[0];
    if (!c) return fail(404, 'Chapitre introuvable.');
    const { titre, ordre, texte, glossaire, questions } = c.data;
    return { chapitre: { id: c.id, livre_id: id, titre, ordre: Number(ordre) || 0, texte: String(texte ?? ''), glossaire: glossaire ?? null, questions: questions ?? null } };
  };
  app.get('/pub/bibliotheque/:id/chapitres/:cid', async req => chapitre(req, false));
  app.get('/v1/bibliotheque/:id/chapitres/:cid', async req => chapitre(req, true));
}
