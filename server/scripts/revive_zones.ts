/** Crée le site « Nkala » et les zones dans Revive. Sur le VPS : docker compose exec -T api npx tsx scripts/revive_zones.ts */
import { createPgDb } from '../api/src/db.ts';
import { clientRevive, creerZonesRevive } from '../api/src/regie.ts';

const db = await createPgDb(process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL manquant'); })());
console.log(JSON.stringify(await creerZonesRevive(db, clientRevive()), null, 1));
await db.close();
