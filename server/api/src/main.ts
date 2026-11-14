import { buildApp } from './app.ts';
import { createFirebaseVerifier } from './auth.ts';
import { loadConfig } from './config.ts';
import { createPgDb, runMigrations } from './db.ts';
import { journaliserErreur } from './erreurs.ts';
import { createS3Storage } from './storage.ts';
import { purgerDonnees } from './donnees.ts';
import { ancrerEtPublier } from './nkorouna.ts';

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

// Exceptions non rattrapées : journalisées pour l'alerte e-mail, puis arrêt (Docker relance le conteneur)
process.on('unhandledRejection', (raison: any) => {
  console.error('promesse rejetée non gérée', raison);
  journaliserErreur(db, { source: 'serveur', message: `promesse rejetée : ${raison?.message || raison}`, stack: raison?.stack }).catch(() => {});
});
process.on('uncaughtException', async (err: any) => {
  console.error('exception non rattrapée', err);
  try { await journaliserErreur(db, { source: 'serveur', message: `exception non rattrapée : ${err?.message || err}`, stack: err?.stack }); } catch {}
  process.exit(1);
});

// Durées de conservation (donnees.ts, DUREES) : purge au démarrage puis toutes les 24 h
const purger = () => purgerDonnees(db).then(d => console.log('Purge des données :', JSON.stringify(d))).catch(e => console.error('purge échouée', e));
setTimeout(purger, 60_000);
const minuteurPurge = setInterval(purger, 24 * 3600_000);

// Ancrage quotidien du registre Nkorouna sur la chaîne (relais NKOROUNA_ANCRAGE_URL) ; sans relais, la racine est seulement calculée
const ancrer = () => ancrerEtPublier(db, process.env, 'systeme').then(r => { if (!('rien' in r)) console.log('Ancrage Nkorouna :', JSON.stringify({ de: (r as any).de, jusqua: (r as any).jusqua, publies: r.publies.length })); }).catch(e => console.error('ancrage Nkorouna échoué', e?.message));
setTimeout(ancrer, 5 * 60_000);
const minuteurAncrage = setInterval(ancrer, 24 * 3600_000);

const stop = async () => { clearInterval(minuteurPurge); clearInterval(minuteurAncrage); await app.close(); await db.close(); process.exit(0); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);

await app.listen({ port: cfg.port, host: '0.0.0.0' });
