/** Importe les livres de /opt/bibliotheque. Cron / console : docker exec ompangano-api-1 npx tsx scripts/importer_livres.ts */
import { createPgDb } from '../api/src/db.ts';
import { fournisseurEmbeddingParDefaut } from '../api/src/ia.ts';
import { importerLivres } from '../api/src/livres.ts';

const db = await createPgDb(process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL manquant'); })());
try { const r = await importerLivres(db, fournisseurEmbeddingParDefaut()); console.log(JSON.stringify({ ...r, erreurs: r.erreurs.slice(0, 20) })); }
catch (e) { console.error((e as Error).message); process.exitCode = 1; }
await db.close();
