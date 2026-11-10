/** Réindexe tous les documents du RAG (après un changement de modèle d'embedding ou de base vectorielle). docker exec ompangano-api-1 npx tsx scripts/reindexer_rag.ts */
import { createPgDb } from '../api/src/db.ts';
import { configIa, fournisseurEmbeddingParDefaut, indexerDocument } from '../api/src/ia.ts';

const db = await createPgDb(process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL manquant'); })());
const embed = fournisseurEmbeddingParDefaut();
const cfg = await configIa(db);
const docs = await db.query<{ id: string }>(`SELECT id FROM ia_documents`);
let morceaux = 0;
for (const d of docs) morceaux += await indexerDocument(db, embed, d.id, cfg);
console.log(JSON.stringify({ documents: docs.length, morceaux, embedding: embed.nom }));
await db.close();
