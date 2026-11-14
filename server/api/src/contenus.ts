/**
 * Contenus pilotés par fichiers JSON/CSV : lecture publique des contenus publiés, import/export par l'administration,
 * contenus d'utilisateurs (annonces, signalements, idées…) avec modération, sondages, réglages et interrupteurs.
 */
import { SCHEMAS, schemaDe, estPrivee } from '../../../packages/noyau/src/contenu/schemas.ts';
import { validerTarifCours } from '../../../packages/noyau/src/coursDistance.ts';
import { validerLignes, validerTexte, modeleCsv } from '../../../packages/noyau/src/contenu/valider.ts';
import { objetsVersCsv } from '../../../packages/noyau/src/contenu/csv.ts';
import type { Queryable } from './db.ts';
import { journaliser, parametre, str, type Ctx } from './ctx.ts';
import type { MediaStorage } from './storage.ts';
import { cheminsDe, lignePublique, marquerAEffacer, preparerAnnonceLogement, requeteAnnonces, signerLogement } from './annoncesLogement.ts';

const MODULES = ['ompangano', 'onenji', 'azeva', 'ontci', 'nkala', 'traducteur'];
const FONCTIONS = ['publicite', 'achats', 'assistantIA', 'salleParis'];
const liste = (v: string | undefined) => (v ?? '').split(',').map(x => x.trim()).filter(Boolean);
const MAX_LIGNES = 5000;

/**
 * Interrupteurs : variables du serveur, puis réglages de la console par-dessus. La salle des paris n'est jamais ouverte par cette route.
 * `pourAdmin` : ajoute les modules réservés aux administrateurs (réglage `modules_admin`), listés dans `essai`.
 */
export async function modulesActuels(q: Queryable, env = process.env, pourAdmin = false) {
  const m = env.MODULES_ACTIFS, f = env.FONCTIONS_ACTIVES;
  const modules: Record<string, boolean> = m === undefined ? {} : Object.fromEntries(MODULES.map(id => [id, liste(m).includes(id)]));
  const fonctions: Record<string, boolean> = f === undefined ? {} : Object.fromEntries(FONCTIONS.map(id => [id, id !== 'salleParis' && liste(f).includes(id)]));
  const dbm = await parametre<Record<string, boolean>>(q, 'modules', {});
  const dbf = await parametre<Record<string, boolean>>(q, 'fonctions', {});
  for (const id of MODULES) if (typeof dbm[id] === 'boolean') modules[id] = dbm[id];
  for (const id of FONCTIONS) if (typeof dbf[id] === 'boolean') fonctions[id] = id !== 'salleParis' && dbf[id];
  if (!pourAdmin) return { modules, fonctions };
  // Modules « réservés aux administrateurs » (essai) : fermés au public, ouverts aux seuls administrateurs connectés.
  const dba = await parametre<Record<string, boolean>>(q, 'modules_admin', {});
  const essai = MODULES.filter(id => dba[id] === true && modules[id] !== true);
  for (const id of essai) modules[id] = true;
  return essai.length ? { modules, fonctions, essai } : { modules, fonctions };
}

const UTILISATEUR: Record<string, { statut: 'publie' | 'en_attente'; max: number; titre: string }> = {
  annonces: { statut: 'en_attente', max: 20, titre: 'annonce' },
  signalements: { statut: 'en_attente', max: 60, titre: 'signalement' },
  idees: { statut: 'en_attente', max: 20, titre: 'idée' },
  taxi_demandes: { statut: 'publie', max: 30, titre: 'course' },
  avis: { statut: 'en_attente', max: 60, titre: 'avis' },
};

const ligne = (r: any) => ({ ...r.data, id: r.id });

export function registerContenus({ app, db, fail, acteur, notify, env }: Ctx, storage?: MediaStorage) {
  const admin = async (req: any) => { const a = await acteur(req); if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.'); return a; };
  const staff = async (req: any) => { const a = await acteur(req); if (!a.isStaff) fail(403, 'Réservé aux modérateurs.'); return a; };

  // ---------------------------------------------------------------- lecture publique (sans compte : essai libre)
  app.get('/pub/modules', async () => modulesActuels(db, env));
  app.get('/v1/modules', async (req) => modulesActuels(db, env, (await acteur(req)).isAdmin));

  app.get('/pub/contenus', async (_req, reply) => {
    const r = await db.query<any>(`SELECT collection, count(*)::int AS n, max(updated_at) AS maj FROM contenus WHERE publie AND deleted_at IS NULL AND owner_id IS NULL GROUP BY collection`);
    reply.header('Cache-Control', 'public, max-age=30');
    return { versions: Object.fromEntries(r.filter(x => !estPrivee(x.collection)).map(x => [x.collection, { n: x.n, v: new Date(x.maj).getTime() }])) };
  });

  app.get('/pub/contenus/:collection', async (req, reply) => {
    const { collection } = req.params as { collection: string };
    if (!schemaDe(collection)) return fail(404, 'Collection inconnue.');
    // Contenu des jeux (mots, questions, plateau) : jamais servi en bloc. Il sort manche par manche (azeva.ts).
    if (estPrivee(collection)) return fail(403, 'Cette collection n\'est pas publique.');
    const rows = await db.query<any>(`SELECT id, data, updated_at FROM contenus WHERE collection = $1 AND publie AND deleted_at IS NULL AND owner_id IS NULL ORDER BY (data->>'ordre')::numeric NULLS LAST, id`, [collection]);
    const v = rows.reduce((m, r) => Math.max(m, new Date(r.updated_at).getTime()), 0);
    const etag = `"${collection}-${rows.length}-${v}"`;
    reply.header('ETag', etag).header('Cache-Control', 'public, max-age=60');
    if (req.headers['if-none-match'] === etag) return reply.status(304).send();
    // Vidéothèque (14 nov. 2026) : l'adresse de la vidéo ne sort qu'avec la licence de lecture (compte obligatoire) ; ici, seulement « video: true ».
    const lignes = rows.map(ligne).map((l: any) => (collection === 'cours_artisans' && l.video_url ? (({ video_url: _v, ...reste }) => ({ ...reste, video: true }))(l) : l));
    return { collection, version: v, lignes };
  });

  // ---------------------------------------------------------------- administration des contenus
  app.get('/v1/admin/contenus/schemas', async (req) => { await staff(req); return SCHEMAS; });

  app.get('/v1/admin/contenus', async (req) => {
    await staff(req);
    const r = await db.query<any>(`SELECT collection, count(*)::int AS total, count(*) FILTER (WHERE publie)::int AS publies, max(updated_at) AS maj FROM contenus WHERE deleted_at IS NULL AND owner_id IS NULL GROUP BY collection`);
    const par = new Map(r.map(x => [x.collection, x]));
    return SCHEMAS.map(s => ({ collection: s.id, titre: s.titre, module: s.module, description: s.description, total: par.get(s.id)?.total ?? 0, publies: par.get(s.id)?.publies ?? 0, maj: par.get(s.id)?.maj ?? null }));
  });

  app.get('/v1/admin/contenus/modele/:collection', async (req, reply) => {
    await staff(req);
    const s = schemaDe((req.params as any).collection);
    if (!s) return fail(404, 'Collection inconnue.');
    reply.header('Content-Type', 'text/csv; charset=utf-8').header('Content-Disposition', `attachment; filename="${s.id}.csv"`);
    return modeleCsv(s);
  });

  app.get('/v1/admin/contenus/:collection', async (req) => {
    await staff(req);
    const { collection } = req.params as { collection: string };
    const { q, page = '1', limit = '50' } = req.query as Record<string, string>;
    if (!schemaDe(collection)) return fail(404, 'Collection inconnue.');
    const lim = Math.min(200, Math.max(1, Number(limit) || 50)), p = Math.max(1, Number(page) || 1);
    const filtre = q ? `AND (id ILIKE $2 OR data::text ILIKE $2)` : '';
    const params: unknown[] = q ? [collection, `%${q}%`] : [collection];
    const tot = await db.query<any>(`SELECT count(*)::int AS n FROM contenus WHERE collection = $1 AND deleted_at IS NULL AND owner_id IS NULL ${filtre}`, params);
    const rows = await db.query<any>(`SELECT id, data, publie, updated_at FROM contenus WHERE collection = $1 AND deleted_at IS NULL AND owner_id IS NULL ${filtre} ORDER BY (data->>'ordre')::numeric NULLS LAST, id LIMIT ${lim} OFFSET ${(p - 1) * lim}`, params);
    return { items: rows.map(r => ({ ...ligne(r), publie: r.publie, maj: r.updated_at })), total: tot[0].n, page: p, pages: Math.max(1, Math.ceil(tot[0].n / lim)), limit: lim };
  });

  app.get('/v1/admin/contenus/:collection/export', async (req, reply) => {
    await staff(req);
    const { collection } = req.params as { collection: string };
    const { format = 'json' } = req.query as Record<string, string>;
    const s = schemaDe(collection);
    if (!s) return fail(404, 'Collection inconnue.');
    const rows = (await db.query<any>(`SELECT id, data FROM contenus WHERE collection = $1 AND deleted_at IS NULL AND owner_id IS NULL ORDER BY (data->>'ordre')::numeric NULLS LAST, id`, [collection])).map(ligne);
    if (format === 'csv') {
      reply.header('Content-Type', 'text/csv; charset=utf-8').header('Content-Disposition', `attachment; filename="${collection}.csv"`);
      return objetsVersCsv(rows, s.champs.map(c => c.nom));
    }
    reply.header('Content-Disposition', `attachment; filename="${collection}.json"`);
    return rows;
  });

  /** Identifiants existants des collections référencées par un schéma (contrôle des liens entre fichiers). */
  async function existants(collection: string, ajoutes: Record<string, Set<string>> = {}) {
    const s = schemaDe(collection)!;
    const refs = [...new Set(s.champs.map(c => c.ref).filter((x): x is string => !!x))];
    const out: Record<string, Set<string>> = {};
    for (const ref of refs) {
      const r = await db.query<any>(`SELECT id FROM contenus WHERE collection = $1 AND deleted_at IS NULL`, [ref]);
      out[ref] = new Set(r.map(x => x.id));
    }
    return out;
  }

  app.post('/v1/admin/contenus/:collection/import', async (req) => {
    const a = await admin(req);
    const { collection } = req.params as { collection: string };
    const s = schemaDe(collection);
    if (!s) return fail(404, 'Collection inconnue.');
    const b = (req.body || {}) as { texte?: string; lignes?: Record<string, unknown>[]; mode?: string; partiel?: boolean; format?: string };
    const mode = b.mode === 'remplacer' ? 'remplacer' : b.mode === 'ajouter' ? 'ajouter' : 'verifier';
    const ex = await existants(collection);
    const rapport = Array.isArray(b.lignes) ? validerLignes(s, b.lignes, ex) : str(b.texte) ? validerTexte(collection, b.texte, ex) : fail(400, 'Fournir « texte » (CSV ou JSON) ou « lignes ».');
    if (rapport.total > MAX_LIGNES) return fail(413, `Trop de lignes (${MAX_LIGNES} au plus par import).`);
    const format = Array.isArray(b.lignes) ? 'json' : b.texte!.trim().startsWith('[') || b.texte!.trim().startsWith('{') ? 'json' : 'csv';
    const bloque = rapport.erreurs.length > 0 && !b.partiel;
    let ecrit = 0, supprimes = 0;
    if (mode !== 'verifier' && !bloque) {
      await db.tx(async q => {
        const a_publie = s.champs.some(c => c.nom === 'publie');
        for (const l of rapport.lignes) {
          const publie = a_publie ? l.publie === true : true;
          const r = await q.query(
            `INSERT INTO contenus (collection, id, data, publie, statut) VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, publie = EXCLUDED.publie, statut = EXCLUDED.statut, deleted_at = NULL, updated_at = clock_timestamp()
             WHERE contenus.owner_id IS NULL RETURNING id`,
            [collection, l.id, JSON.stringify(l), publie, publie ? 'publie' : 'brouillon']);
          ecrit += r.length;
        }
        if (mode === 'remplacer') {
          const ids = rapport.lignes.map(l => l.id as string);
          const r = await q.query(`UPDATE contenus SET deleted_at = clock_timestamp(), publie = false, updated_at = clock_timestamp() WHERE collection = $1 AND owner_id IS NULL AND deleted_at IS NULL AND NOT (id = ANY($2::text[])) RETURNING id`, [collection, ids]);
          supprimes = r.length;
        }
        await q.query(`INSERT INTO contenus_imports (collection, par, format, mode, total, valides, erreurs) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [collection, a.auth.uid, format, mode, rapport.total, rapport.valides, rapport.erreurs.length]);
        await journaliser(q, a.auth.uid, `import_${mode}`, collection, { total: rapport.total, ecrit, supprimes, erreurs: rapport.erreurs.length });
      });
      notify('contenus');
    }
    return { ...rapport, lignes: undefined, mode, ecrit, supprimes, bloque, ecritureFaite: mode !== 'verifier' && !bloque };
  });

  app.put('/v1/admin/contenus/:collection/:id', async (req) => {
    const a = await admin(req);
    const { collection, id } = req.params as { collection: string; id: string };
    const s = schemaDe(collection);
    if (!s) return fail(404, 'Collection inconnue.');
    const corps = { ...((req.body || {}) as Record<string, unknown>), id };
    const rapport = validerLignes(s, [corps], await existants(collection));
    if (rapport.erreurs.length) return fail(400, rapport.erreurs.map(e => `${e.champ ?? ''} : ${e.message}`).join(' ; '));
    const l = rapport.lignes[0];
    const publie = s.champs.some(c => c.nom === 'publie') ? l.publie === true : true;
    await db.tx(async q => {
      await q.query(`INSERT INTO contenus (collection, id, data, publie, statut) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, publie = EXCLUDED.publie, statut = EXCLUDED.statut, deleted_at = NULL, updated_at = clock_timestamp() WHERE contenus.owner_id IS NULL`,
        [collection, id, JSON.stringify(l), publie, publie ? 'publie' : 'brouillon']);
      await journaliser(q, a.auth.uid, 'contenu_modifie', `${collection}/${id}`);
    });
    notify('contenus');
    return { ...l, publie };
  });

  app.delete('/v1/admin/contenus/:collection/:id', async (req, reply) => {
    const a = await admin(req);
    const { collection, id } = req.params as { collection: string; id: string };
    await db.tx(async q => {
      await q.query(`UPDATE contenus SET deleted_at = clock_timestamp(), publie = false, updated_at = clock_timestamp() WHERE collection = $1 AND id = $2 AND owner_id IS NULL`, [collection, id]);
      await journaliser(q, a.auth.uid, 'contenu_supprime', `${collection}/${id}`);
    });
    notify('contenus');
    return reply.status(204).send();
  });

  app.get('/v1/admin/imports', async (req) => {
    await staff(req);
    return db.query(`SELECT id, collection, par, format, mode, total, valides, erreurs, at FROM contenus_imports ORDER BY at DESC LIMIT 100`);
  });

  // ---------------------------------------------------------------- contenus d'utilisateurs et modération
  const collectionUtilisateur = (c: string) => UTILISATEUR[c] ?? fail(404, 'Collection inconnue.');

  app.post('/v1/utilisateur/:collection', async (req, reply) => {
    const { collection } = req.params as { collection: string };
    const cfg = collectionUtilisateur(collection);
    const a = await acteur(req);
    if (a.status === 'suspended') return fail(403, 'Compte suspendu.');
    const corps = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(corps).slice(0, cfg.max)) {
      if (['id', 'owner', 'statut', 'publie'].includes(k)) continue;
      if (str(v)) data[k] = v.slice(0, 4000);
      else if (typeof v === 'number' && Number.isFinite(v)) data[k] = v;
      else if (typeof v === 'boolean') data[k] = v;
      else if (Array.isArray(v)) data[k] = v.filter(str).slice(0, 10).map(x => x.slice(0, 500));
    }
    // Fiche logement structurée (objet) : traitée à part, jamais aplatie.
    delete data.logement;
    const ficheLogement = collection === 'annonces' && data.categorie_id === 'logement' && corps.logement && typeof corps.logement === 'object' ? corps.logement : null;
    if (collection !== 'taxi_demandes' && !str(data.titre) && !str(data.texte) && !str(data.description)) return fail(400, 'Un titre ou un texte est obligatoire.');
    if (collection === 'annonces') {
      const cat = str(data.categorie_id) ? data.categorie_id : 'divers';
      const c = await db.query<any>(`SELECT data FROM contenus WHERE collection = 'categories_annonces' AND id = $1 AND deleted_at IS NULL`, [cat]);
      const quota = Number(c[0]?.data?.quota_gratuit ?? 3);
      const n = await db.query<any>(`SELECT count(*)::int AS n FROM contenus WHERE collection = 'annonces' AND owner_id = $1 AND created_at > date_trunc('month', clock_timestamp()) AND deleted_at IS NULL`, [a.auth.uid]);
      if (n[0].n >= quota) return fail(429, `Tu as atteint le quota de ${quota} annonces ce mois-ci.`);
    } else {
      const n = await db.query<any>(`SELECT count(*)::int AS n FROM contenus WHERE collection = $1 AND owner_id = $2 AND created_at > clock_timestamp() - interval '1 day'`, [collection, a.auth.uid]);
      if (n[0].n >= 20) return fail(429, 'Trop d\'envois aujourd\'hui. Réessaie demain.');
    }
    const id = `${collection.slice(0, 3)}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    let privee: unknown = null, lat: number | null = null, lng: number | null = null;
    if (ficheLogement) {
      if (!storage) return fail(503, 'Stockage indisponible.');
      const r = await preparerAnnonceLogement(storage, a.auth.uid, id, ficheLogement, data as any);
      if (!r.ok) return reply.status(400).send({ error: r.erreurs.join(' '), erreurs: r.erreurs });
      data.logement = r.logement; privee = r.privee; lat = r.lat; lng = r.lng;
    }
    data.auteur = (await db.query<any>(`SELECT data->>'displayName' AS n FROM users WHERE id = $1`, [a.auth.uid]))[0]?.n || 'Anonyme';
    await db.query(`INSERT INTO contenus (collection, id, data, publie, statut, owner_id, data_privee, lat, lng) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [collection, id, JSON.stringify(data), cfg.statut === 'publie', cfg.statut, a.auth.uid, privee ? JSON.stringify(privee) : null, lat, lng]);
    notify('contenus');
    return reply.status(201).send({ ...data, id, statut: cfg.statut });
  });

  /** Modification d'une annonce de logement par son auteur : elle repasse en relecture. */
  app.put('/v1/utilisateur/annonces/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const a = await acteur(req);
    if (a.status === 'suspended') return fail(403, 'Compte suspendu.');
    const cur = (await db.query<any>(`SELECT data FROM contenus WHERE collection = 'annonces' AND id = $1 AND owner_id = $2 AND deleted_at IS NULL`, [id, a.auth.uid]))[0];
    if (!cur) return fail(404, 'Annonce introuvable.');
    const corps = (req.body || {}) as Record<string, unknown>;
    const data: Record<string, unknown> = { ...cur.data };
    for (const k of ['titre', 'description', 'ville', 'telephone']) if (str(corps[k])) data[k] = (corps[k] as string).slice(0, 4000);
    if (typeof corps.prix === 'number' && Number.isFinite(corps.prix) && corps.prix >= 0) data.prix = corps.prix;
    if (!str(data.titre) || !(data.titre as string).trim()) return fail(400, 'Un titre est obligatoire.');
    let privee: unknown = null, lat: number | null = null, lng: number | null = null;
    if (corps.logement && typeof corps.logement === 'object') {
      if (data.categorie_id !== 'logement') return fail(400, 'Seules les annonces de logement ont une fiche.');
      if (!storage) return fail(503, 'Stockage indisponible.');
      const r = await preparerAnnonceLogement(storage, a.auth.uid, id, corps.logement, data as any);
      if (!r.ok) return reply.status(400).send({ error: r.erreurs.join(' '), erreurs: r.erreurs });
      const anciens = new Set(cheminsDe(cur.data.logement)), gardes = new Set(cheminsDe(r.logement));
      await marquerAEffacer(db, id, [...anciens].filter(c => !gardes.has(c)), 'remplace');
      data.logement = r.logement; privee = r.privee; lat = r.lat; lng = r.lng;
    } else if (cur.data.logement) {
      lat = cur.data.logement.positionPublique?.lat ?? null; lng = cur.data.logement.positionPublique?.lng ?? null;
      privee = (await db.query<any>(`SELECT data_privee FROM contenus WHERE collection = 'annonces' AND id = $1`, [id]))[0]?.data_privee ?? null;
    }
    delete data.motif_refus;
    await db.query(`UPDATE contenus SET data = $3, data_privee = $4, lat = $5, lng = $6, publie = false, statut = 'en_attente', updated_at = clock_timestamp() WHERE collection = 'annonces' AND id = $1 AND owner_id = $2`,
      [id, a.auth.uid, JSON.stringify(data), privee ? JSON.stringify(privee) : null, lat, lng]);
    notify('contenus');
    return { ...data, id, statut: 'en_attente' };
  });

  app.get('/v1/utilisateur/:collection', async (req) => {
    const { collection } = req.params as { collection: string };
    collectionUtilisateur(collection);
    const a = await acteur(req);
    const r = await db.query<any>(`SELECT id, data, statut, created_at FROM contenus WHERE collection = $1 AND owner_id = $2 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100`, [collection, a.auth.uid]);
    return Promise.all(r.map(async x => ({ ...ligne(x), ...(x.data?.logement && storage ? { logement: await signerLogement(storage, x.data.logement) } : {}), statut: x.statut, cree: x.created_at })));
  });

  app.delete('/v1/utilisateur/:collection/:id', async (req, reply) => {
    const { collection, id } = req.params as { collection: string; id: string };
    collectionUtilisateur(collection);
    const a = await acteur(req);
    const r = await db.query<any>(`UPDATE contenus SET deleted_at = clock_timestamp(), publie = false, updated_at = clock_timestamp() WHERE collection = $1 AND id = $2 AND owner_id = $3 RETURNING data`, [collection, id, a.auth.uid]);
    if (r[0]?.data?.logement) await marquerAEffacer(db, id, cheminsDe(r[0].data.logement), 'supprime');
    notify('contenus');
    return reply.status(204).send();
  });

  /** Annonces publiées (lecture libre, sans compte). */
  // Filtres : categorie, ville, quartier, transaction, type, prix_min, prix_max, chambres_min, meuble, avec360, avecVideo, certifiee,
  // equip (ids séparés par des virgules), lat, lng, rayon_km (≤ 50), tri (recent | prix | -prix | distance | completude), page, limite (≤ 50).
  app.get('/pub/annonces', async (req, reply) => {
    const { sql, params, avecPos } = requeteAnnonces(req.query as Record<string, string>);
    const r = await db.query<any>(sql, params);
    // Une réponse calculée autour de la position de quelqu'un ne va pas dans un cache partagé.
    reply.header('Cache-Control', avecPos ? 'private, max-age=30' : 'public, max-age=30');
    return storage ? Promise.all(r.map(x => lignePublique(storage, x))) : r.map(x => ({ ...ligne(x), cree: x.created_at }));
  });

  /** Détail d'une annonce publiée (notification de proximité, lien partagé). */
  app.get('/pub/annonces/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const r = await db.query<any>(`SELECT id, data, created_at FROM contenus WHERE collection = 'annonces' AND id = $1 AND publie AND deleted_at IS NULL`, [id]);
    if (!r.length) return fail(404, 'Annonce introuvable ou retirée.');
    reply.header('Cache-Control', 'public, max-age=30');
    return storage ? lignePublique(storage, r[0]) : { ...ligne(r[0]), cree: r[0].created_at };
  });

  app.get('/v1/admin/moderation', async (req) => {
    await staff(req);
    const { collection, statut = 'en_attente' } = req.query as Record<string, string>;
    const params: unknown[] = [Object.keys(UTILISATEUR), statut];
    let f = '';
    if (collection) { params.push(collection); f = ` AND collection = $3`; }
    const r = await db.query<any>(`SELECT collection, id, data, statut, owner_id, created_at, data_privee FROM contenus WHERE collection = ANY($1::text[]) AND statut = $2 AND deleted_at IS NULL ${f} ORDER BY created_at DESC LIMIT 200`, params);
    // Le modérateur voit les médias (URL signées) et, si l'emplacement est masqué, la position réelle.
    return Promise.all(r.map(async x => ({
      collection: x.collection, ...ligne(x),
      ...(x.data?.logement && storage ? { logement: { ...(await signerLogement(storage, x.data.logement)), ...(x.data_privee?.position ? { positionReelle: x.data_privee.position } : {}) } } : {}),
      statut: x.statut, owner: x.owner_id, cree: x.created_at,
    })));
  });

  app.post('/v1/admin/moderation/:collection/:id', async (req) => {
    const a = await staff(req);
    const { collection, id } = req.params as { collection: string; id: string };
    collectionUtilisateur(collection);
    const b = (req.body || {}) as { decision?: string; motif?: string };
    if (!['publier', 'refuser'].includes(b.decision || '')) return fail(400, 'Décision attendue : publier ou refuser.');
    const publie = b.decision === 'publier';
    await db.tx(async q => {
      const r = await q.query<any>(`UPDATE contenus SET publie = $3, statut = $4, data = data || $5::jsonb, updated_at = clock_timestamp() WHERE collection = $1 AND id = $2 AND owner_id IS NOT NULL RETURNING data`,
        [collection, id, publie, publie ? 'publie' : 'refuse', JSON.stringify(b.motif ? { motif_refus: String(b.motif).slice(0, 300) } : {})]);
      if (!publie && r[0]?.data?.logement) await marquerAEffacer(q, id, cheminsDe(r[0].data.logement), 'refuse');
      await journaliser(q, a.auth.uid, publie ? 'moderation_publie' : 'moderation_refuse', `${collection}/${id}`, { motif: b.motif });
    });
    notify('contenus');
    return { ok: true };
  });

  // ---------------------------------------------------------------- sondages
  app.post('/v1/sondages/:id/voter', async (req) => {
    const { id } = req.params as { id: string };
    const { choix } = (req.body || {}) as { choix?: string };
    const a = await acteur(req);
    const s = await db.query<any>(`SELECT data FROM contenus WHERE collection = 'sondages' AND id = $1 AND publie AND deleted_at IS NULL`, [id]);
    if (!s.length) return fail(404, 'Sondage introuvable.');
    const options: string[] = s[0].data.options ?? [];
    if (!str(choix) || !options.includes(choix)) return fail(400, 'Choix invalide.');
    const fin = s[0].data.fin; if (fin && Date.parse(fin) + 86_400_000 < Date.now()) return fail(409, 'Ce sondage est terminé.');
    await db.query(`INSERT INTO votes (sondage_id, user_id, choix) VALUES ($1,$2,$3) ON CONFLICT (sondage_id, user_id) DO UPDATE SET choix = EXCLUDED.choix, at = clock_timestamp()`, [id, a.auth.uid, choix]);
    return resultatsSondage(id, options);
  });
  async function resultatsSondage(id: string, options: string[]) {
    const r = await db.query<any>(`SELECT choix, count(*)::int AS n FROM votes WHERE sondage_id = $1 GROUP BY choix`, [id]);
    const par = Object.fromEntries(options.map(o => [o, r.find(x => x.choix === o)?.n ?? 0]));
    return { id, resultats: par, total: Object.values(par).reduce((s: number, n) => s + (n as number), 0) };
  }
  app.get('/pub/sondages/:id/resultats', async (req) => {
    const { id } = req.params as { id: string };
    const s = await db.query<any>(`SELECT data FROM contenus WHERE collection = 'sondages' AND id = $1 AND publie AND deleted_at IS NULL`, [id]);
    if (!s.length) return fail(404, 'Sondage introuvable.');
    return resultatsSondage(id, s[0].data.options ?? []);
  });

  // ---------------------------------------------------------------- réglages et interrupteurs
  const CLES = ['modules', 'modules_admin', 'fonctions', 'ia_quotas', 'ia_contexte', 'ia_tarifs', 'pub_plafonds', 'maintenance', 'contact', 'cours_distance'];
  app.get('/v1/admin/parametres', async (req) => {
    await staff(req);
    const r = await db.query<any>(`SELECT cle, valeur, par, updated_at FROM parametres ORDER BY cle`);
    return { parametres: Object.fromEntries(r.map(x => [x.cle, x.valeur])), effectif: await modulesActuels(db, env), cles: CLES };
  });
  app.put('/v1/admin/parametres/:cle', async (req) => {
    const a = await admin(req);
    const { cle } = req.params as { cle: string };
    if (!CLES.includes(cle)) return fail(404, 'Réglage inconnu.');
    let valeur = (req.body as any)?.valeur;
    if (cle === 'modules' || cle === 'modules_admin' || cle === 'fonctions') {
      const ok = cle === 'fonctions' ? FONCTIONS : MODULES;
      if (!valeur || typeof valeur !== 'object') return fail(400, 'Objet attendu.');
      valeur = Object.fromEntries(Object.entries(valeur).filter(([k, v]) => ok.includes(k) && typeof v === 'boolean' && !(k === 'salleParis' && v)));
    } else if (cle === 'cours_distance') {
      // Tarif générique des cours à distance (14 nov. 2026) : réglé par les administrateurs seuls, jamais par les professeurs.
      const t = validerTarifCours(valeur);
      if (!t) return fail(400, 'Tarif invalide : prix_heure_fcfa et minimum_fcfa entiers positifs, plans_inclus liste de formules.');
      valeur = t;
    } else if (cle === 'ia_contexte' || cle === 'ia_tarifs') {
      // Règles de contexte (inclus, max, politique) et tarifs de l'assistant (devise, prix par million, frais d'excès)
      if (!valeur || typeof valeur !== 'object') return fail(400, 'Objet attendu.');
      valeur = Object.fromEntries(Object.entries(valeur).filter(([k, v]) => (typeof v === 'number' && v >= 0 && Number.isFinite(v)) || (k === 'devise' && typeof v === 'string' && v.length <= 8) || (k === 'politique' && ['bloquer', 'facturer', 'suivre'].includes(v as string))));
    } else if (cle === 'ia_quotas' || cle === 'pub_plafonds') {
      if (!valeur || typeof valeur !== 'object') return fail(400, 'Objet attendu.');
      valeur = Object.fromEntries(Object.entries(valeur).filter(([, v]) => typeof v === 'number' && v >= 0 && Number.isFinite(v)));
    }
    await db.tx(async q => {
      const avant = await q.query<any>(`SELECT valeur FROM parametres WHERE cle = $1`, [cle]);
      await q.query(`INSERT INTO parametres (cle, valeur, par) VALUES ($1,$2,$3) ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur, par = EXCLUDED.par, updated_at = clock_timestamp()`, [cle, JSON.stringify(valeur), a.auth.uid]);
      await journaliser(q, a.auth.uid, 'parametre', cle, { avant: avant[0]?.valeur ?? null, apres: valeur });
    });
    notify('modules');
    return { cle, valeur, effectif: await modulesActuels(db, env) };
  });

  app.get('/v1/admin/journal', async (req) => {
    await admin(req);
    return db.query(`SELECT id, par, action, cible, detail, at FROM journal_admin ORDER BY at DESC LIMIT 200`);
  });
}
