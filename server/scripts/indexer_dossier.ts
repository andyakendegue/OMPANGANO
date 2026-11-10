/** Indexation du dossier de référence du RAG. Cron : docker exec ompangano-api-1 npx tsx scripts/indexer_dossier.ts cron */
import { createPgDb } from '../api/src/db.ts';
import { synchroniserDossier } from '../api/src/dossier.ts';
import { fournisseurEmbeddingParDefaut } from '../api/src/ia.ts';

const db = await createPgDb(process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL manquant'); })());
try {
  const r = await synchroniserDossier(db, fournisseurEmbeddingParDefaut(), process.argv[2] || 'script');
  console.log(JSON.stringify({ ...r, erreurs: r.erreurs.slice(0, 20) }));
  process.exitCode = r.erreurs.length && !(r.ajoutes + r.modifies + r.inchanges) ? 1 : 0;
} catch (e) { console.error((e as Error).message); process.exitCode = 1; }
await db.close();
