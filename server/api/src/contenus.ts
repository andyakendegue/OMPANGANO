/**
 * Contenus pilotés par fichiers JSON/CSV : lecture publique des contenus publiés, import/export par l'administration,
 * contenus d'utilisateurs (annonces, signalements, idées…) avec modération, sondages, réglages et interrupteurs.
 */
import { SCHEMAS, schemaDe } from '../../../packages/noyau/src/contenu/schemas.ts';
import { validerLignes, validerTexte, modeleCsv } from '../../../packages/noyau/src/contenu/valider.ts';
import { objetsVersCsv } from '../../../packages/noyau/src/contenu/csv.ts';
import type { Queryable } from './db.ts';
import { journaliser, parametre, str, type Ctx } from './ctx.ts';

const MODULES = ['ompangano', 'onenji', 'azeva', 'ontci', 'nkala', 'traducteur'];
const FONCTIONS = ['publicite', 'achats', 'assistantIA', 'salleParis'];
const liste = (v: string | undefined) => (v ?? '').split(',').map(x => x.trim()).filter(Boolean);
const MAX_LIGNES = 5000;

/** Interrupteurs : variables du serveur, puis réglages de la console par-dessus. La salle des paris n'est jamais ouverte par cette route. */
export async function modulesActuels(q: Queryable, env = process.env) {
  const m = env.MODULES_ACTIFS, f = env.FONCTIONS_ACTIVES;
  const modules: Record<string, boolean> = m === undefined ? {} : Object.fromEntries(MODULES.map(id => [id, liste(m).includes(id)]));
  const fonctions: Record<string, boolean> = f === undefined ? {} : Object.fromEntries(FONCTIONS.map(id => [id, id !== 'salleParis' && liste(f).includes(id)]));
  const dbm = await parametre<Record<string, boolean>>(q, 'modules', {});
  const dbf = await parametre<Record<string, boolean>>(q, 'fonctions', {});
  for (const id of MODULES) if (typeof dbm[id] === 'boolean') modules[id] = dbm[id];
  for (const id of FONCTIONS) if (typeof dbf[id] === 'boolean') fonctions[id] = id !== 'salleParis' && dbf[id];
  return { modules, fonctions };
}

const UTILISATEUR: Record<string, { statut: 'publie' | 'en_attente'; max: number; titre: string }> = {
  annonces: { statut: 'en_attente', max: 20, titre: 'annonce' },
  signalements: { statut: 'en_attente', max: 60, titre: 'signalement' },
  idees: { statut: 'en_attente', max: 20, titre: 'idée' },
  taxi_demandes: { statut: 'publie', max: 30, titre: 'course' },
  avis: { statut: 'en_attente', max: 60, titre: 'avis' },
};

const ligne = (r: any) => ({ ...r.data, id: r.id });

export function registerContenus({ app, db, fail, acteur, notify, env }: Ctx) {
  const admin = async (req: any) => { const a = await acteur(req); if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.'); return a; };
  const staff = async (req: any) => { const a = await acteur(req); if (!a.isStaff) fail(403, 'Réservé aux modérateurs.'); return a; };

  // ---------------------------------------------------------------- lecture publique (sans compte : essai libre)
  app.get('/pub/modules', async () => modulesActuels(db, env));
  app.get('/v1/modules', async () => modulesActuels(db, env));

  app.get('/pub/contenus', async (_req, reply) => {
    const r = await db.query<any>(`SELECT collection, count(*)::int AS n, max(updated_at) AS maj FROM contenus WHERE publie AND deleted_at IS NULL AND owner_id IS NULL GROUP BY collection`);
    reply.header('Cache-Control', 'public, max-age=30');
    return { versions: Object.fromEntries(r.map(x => [x.collection, { n: x.n, v: new Date(x.maj).getTime() }])) };
  });

  app.get('/pub/contenus/:collection', async (req, reply) => {
    const { collection } = req.params as { collection: string };
    if (!schemaDe(collection)) return fail(404, 'Collection inconnue.');
    const rows = await db.query<any>(`SELECT id, data, updated_at FROM contenus WHERE collection = $1 AND publie AND deleted_at IS NULL AND owner_id IS NULL ORDER BY (data->>'ordre')::numeric NULLS LAST, id`, [collection]);
    const v = rows.reduce((m, r) => Math.max(m, new Date(r.updated_at).getTime()), 0);
    const etag = `"${collection}-${rows.length}-${v}"`;
    reply.header('ETag', etag).header('Cache-Control', 'public, max-age=60');
    if (req.headers['if-none-match'] === etag) return reply.status(304).send();
    return { collection, version: v, lignes: rows.map(ligne) };
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
    data.auteur = (await db.query<any>(`SELECT data->>'displayName' AS n FROM users WHERE id = $1`, [a.auth.uid]))[0]?.n || 'Anonyme';
    await db.query(`INSERT INTO contenus (collection, id, data, publie, statut, owner_id) VALUES ($1,$2,$3,$4,$5,$6)`, [collection, id, JSON.stringify(data), cfg.statut === 'publie', cfg.statut, a.auth.uid]);
    notify('contenus');
    return reply.status(201).send({ ...data, id, statut: cfg.statut });
  });

  app.get('/v1/utilisateur/:collection', async (req) => {
    const { collection } = req.params as { collection: string };
    collectionUtilisateur(collection);
    const a = await acteur(req);
    const r = await db.query<any>(`SELECT id, data, statut, created_at FROM contenus WHERE collection = $1 AND owner_id = $2 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100`, [collection, a.auth.uid]);
    return r.map(x => ({ ...ligne(x), statut: x.statut, cree: x.created_at }));
  });

  app.delete('/v1/utilisateur/:collection/:id', async (req, reply) => {
    const { collection, id } = req.params as { collection: string; id: string };
    collectionUtilisateur(collection);
    const a = await acteur(req);
    await db.query(`UPDATE contenus SET deleted_at = clock_timestamp(), publie = false, updated_at = clock_timestamp() WHERE collection = $1 AND id = $2 AND owner_id = $3`, [collection, id, a.auth.uid]);
    notify('contenus');
    return reply.status(204).send();
  });

  /** Annonces publiées (lecture libre, sans compte). */
  app.get('/pub/annonces', async (req, reply) => {
    const { categorie, ville } = req.query as Record<string, string>;
    const params: unknown[] = ['annonces'];
    let filtre = '';
    if (categorie) { params.push(categorie); filtre += ` AND data->>'categorie_id' = $${params.length}`; }
    if (ville) { params.push(ville); filtre += ` AND data->>'ville' ILIKE $${params.length}`; }
    const r = await db.query<any>(`SELECT id, data, created_at FROM contenus WHERE collection = $1 AND publie AND deleted_at IS NULL ${filtre} ORDER BY created_at DESC LIMIT 100`, params);
    reply.header('Cache-Control', 'public, max-age=30');
    return r.map(x => ({ ...ligne(x), cree: x.created_at }));
  });

  app.get('/v1/admin/moderation', async (req) => {
    await staff(req);
    const { collection, statut = 'en_attente' } = req.query as Record<string, string>;
    const params: unknown[] = [Object.keys(UTILISATEUR), statut];
    let f = '';
    if (collection) { params.push(collection); f = ` AND collection = $3`; }
    const r = await db.query<any>(`SELECT collection, id, data, statut, owner_id, created_at FROM contenus WHERE collection = ANY($1::text[]) AND statut = $2 AND deleted_at IS NULL ${f} ORDER BY created_at DESC LIMIT 200`, params);
    return r.map(x => ({ collection: x.collection, ...ligne(x), statut: x.statut, owner: x.owner_id, cree: x.created_at }));
  });

  app.post('/v1/admin/moderation/:collection/:id', async (req) => {
    const a = await staff(req);
    const { collection, id } = req.params as { collection: string; id: string };
    collectionUtilisateur(collection);
    const b = (req.body || {}) as { decision?: string; motif?: string };
    if (!['publier', 'refuser'].includes(b.decision || '')) return fail(400, 'Décision attendue : publier ou refuser.');
    const publie = b.decision === 'publier';
    await db.tx(async q => {
      await q.query(`UPDATE contenus SET publie = $3, statut = $4, data = data || $5::jsonb, updated_at = clock_timestamp() WHERE collection = $1 AND id = $2 AND owner_id IS NOT NULL`,
        [collection, id, publie, publie ? 'publie' : 'refuse', JSON.stringify(b.motif ? { motif_refus: String(b.motif).slice(0, 300) } : {})]);
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
  const CLES = ['modules', 'fonctions', 'ia_quotas', 'pub_plafonds', 'maintenance', 'contact'];
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
    if (cle === 'modules' || cle === 'fonctions') {
      const ok = cle === 'modules' ? MODULES : FONCTIONS;
      if (!valeur || typeof valeur !== 'object') return fail(400, 'Objet attendu.');
      valeur = Object.fromEntries(Object.entries(valeur).filter(([k, v]) => ok.includes(k) && typeof v === 'boolean' && !(k === 'salleParis' && v)));
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
