/**
 * Contenus d'exemple : importés dans la base (marqués `exemple: true`) pour que l'application soit utilisable dès le départ, et supprimables
 * en un geste depuis la console (Contenus > Contenus d'exemple) ou par `scripts/exemples.ts supprimer`.
 * Les fichiers sont ceux de contenu/exemples/ (copiés dans l'image Docker). Seuls des mots du lexique sourcé y figurent.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Queryable } from './db.ts';
import { journaliser, type Ctx } from './ctx.ts';

const ici = dirname(fileURLToPath(import.meta.url));
export const dossierExemples = (env = process.env) => env.EXEMPLES_DIR || [join(ici, '..', '..', '..', 'contenu', 'exemples'), join(ici, '..', '..', 'contenu', 'exemples'), '/app/contenu/exemples'].find(existsSync) || '';

export async function importerExemples(q: Queryable, dossier = dossierExemples()): Promise<{ collections: number; lignes: number }> {
  if (!dossier || !existsSync(dossier)) throw new Error('Dossier des exemples introuvable.');
  let lignes = 0, collections = 0;
  for (const f of readdirSync(dossier).filter(x => x.endsWith('.json')).sort()) {
    const collection = f.replace(/\.json$/, '');
    const rows = JSON.parse(readFileSync(join(dossier, f), 'utf8')) as Record<string, any>[];
    let n = 0;
    for (const l of rows) {
      const publie = l.publie !== false;
      const r = await q.query(`INSERT INTO contenus (collection, id, data, publie, statut) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (collection, id) DO NOTHING RETURNING id`,
        [collection, l.id, JSON.stringify({ ...l, exemple: true }), publie, publie ? 'publie' : 'brouillon']);
      n += r.length;
    }
    if (n) { collections++; lignes += n; }
  }
  return { collections, lignes };
}

export async function supprimerExemples(q: Queryable): Promise<number> {
  return (await q.query(`DELETE FROM contenus WHERE data->>'exemple' = 'true' AND owner_id IS NULL RETURNING id`)).length;
}

export const compterExemples = async (q: Queryable) => Number((await q.query<any>(`SELECT count(*) AS n FROM contenus WHERE data->>'exemple' = 'true' AND owner_id IS NULL AND deleted_at IS NULL`))[0].n);

export function registerExemples({ app, db, fail, acteur, notify }: Ctx) {
  const admin = async (req: any) => { const a = await acteur(req); if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.'); return a; };
  app.get('/v1/admin/exemples', async (req) => { await admin(req); return { presents: await compterExemples(db), disponibles: !!dossierExemples() }; });
  app.post('/v1/admin/exemples/importer', async (req) => {
    const a = await admin(req);
    try { const r = await db.tx(async q => { const x = await importerExemples(q); await journaliser(q, a.auth.uid, 'exemples_importes', undefined, x); return x; }); notify('contenus'); return r; }
    catch (e) { return fail(500, (e as Error).message); }
  });
  app.delete('/v1/admin/exemples', async (req) => {
    const a = await admin(req);
    const n = await db.tx(async q => { const k = await supprimerExemples(q); await journaliser(q, a.auth.uid, 'exemples_supprimes', undefined, { lignes: k }); return k; });
    notify('contenus');
    return { supprimes: n };
  });
}
