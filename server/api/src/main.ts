import { buildApp } from './app.ts';
import { createFirebaseVerifier } from './auth.ts';
import { loadConfig } from './config.ts';
import { createPgDb, runMigrations } from './db.ts';
import { createS3Storage } from './storage.ts';

const cfg = loadConfig();
const db = await createPgDb(cfg.databaseUrl);
const applied = await runMigrations(db);
if (applied.length) console.log('Migrations appliquées :', applied.join(', '));

const app = await buildApp({
  db,
  verify: createFirebaseVerifier(),
  storage: createS3Storage(cfg.s3),
  corsOrigins: cfg.corsOrigins
});

const stop = async () => { await app.close(); await db.close(); process.exit(0); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);

await app.listen({ port: cfg.port, host: '0.0.0.0' });
