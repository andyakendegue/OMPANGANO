import { loadConfig } from './config.ts';
import { createPgDb, runMigrations } from './db.ts';

const url = process.env.DATABASE_URL || loadConfig().databaseUrl;
const db = await createPgDb(url);
const applied = await runMigrations(db);
console.log(applied.length ? `Migrations appliquées : ${applied.join(', ')}` : 'Base déjà à jour.');
await db.close();
