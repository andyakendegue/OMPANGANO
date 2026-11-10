/** Importer ou supprimer les contenus d'exemple. Sur le VPS : docker compose exec -T api npx tsx scripts/exemples.ts importer|supprimer */
import { createPgDb } from '../api/src/db.ts';
import { compterExemples, importerExemples, supprimerExemples } from '../api/src/exemples.ts';

const action = process.argv[2];
if (!['importer', 'supprimer', 'compter'].includes(action)) { console.error('Usage : exemples.ts importer|supprimer|compter'); process.exit(1); }
const db = await createPgDb(process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL manquant'); })());
if (action === 'importer') console.log(await importerExemples(db));
else if (action === 'supprimer') console.log({ supprimes: await supprimerExemples(db) });
else console.log({ presents: await compterExemples(db) });
await db.close();
