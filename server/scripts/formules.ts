/** Crée les formules Oma, Inina et Anyambiè si elles manquent. Sur le VPS : docker exec ompangano-api-1 npx tsx scripts/formules.ts */
import { createPgDb } from '../api/src/db.ts';
import { initialiserFormules } from '../api/src/achats.ts';

const db = await createPgDb(process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL manquant'); })());
try { console.log({ crees: await db.tx(q => initialiserFormules(q, 'script')) }); }
finally { await db.close(); }
