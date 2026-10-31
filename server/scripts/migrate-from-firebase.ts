/**
 * Migration des données OMPANGANO de Firebase vers le VPS.
 *
 *   npx tsx scripts/migrate-from-firebase.ts --service-account=/chemin/cle.json --dry-run
 *   npx tsx scripts/migrate-from-firebase.ts --service-account=/chemin/cle.json            (insère ce qui manque)
 *   npx tsx scripts/migrate-from-firebase.ts --service-account=/chemin/cle.json --overwrite (bascule finale : Firebase fait foi)
 *   npx tsx scripts/migrate-from-firebase.ts --corpus=../data/corpus_myene/corpus_myene_ANCIEN_mis_a_jour.csv,../data/corpus_myene/corpus_myene_NOUVEAU_35000.csv [--statuts=attestee] [--dry-run]
 *
 * Variables : DATABASE_URL, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (voir .env.example).
 * Le compte de service est lu sur le disque, jamais copié dans git. Rien n'est supprimé côté Firebase.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { loadConfig } from '../api/src/config.ts';
import { createPgDb, runMigrations } from '../api/src/db.ts';
import { createS3Storage } from '../api/src/storage.ts';
import { importItems } from '../api/src/importItems.ts';
import { migrate, type Source } from './migrate-lib.ts';
import { loadCorpusCsv } from './corpus.ts';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const dryRun = !!args['dry-run'];
const log = (m: string) => console.log(m);

const cfg = loadConfig();
const db = await createPgDb(cfg.databaseUrl);
if (!dryRun) await runMigrations(db);
const storage = createS3Storage(cfg.s3);

// ---------------------------------------------------------------- corpus (CSV)
if (args.corpus) {
  const statuts = typeof args.statuts === 'string' ? args.statuts.split(',') : undefined;
  let all: ReturnType<typeof loadCorpusCsv> = [];
  for (const f of String(args.corpus).split(',')) {
    const items = loadCorpusCsv(f.trim(), { statuts });
    log(`${f} : ${items.length} phrase(s) retenue(s)${statuts ? ` (statuts : ${statuts.join(', ')})` : ''}`);
    all = all.concat(items);
  }
  const report = await db.tx(q => importItems(q, all, { dryRun }));
  log(`Import du corpus ${dryRun ? '(à blanc) ' : ''}: ${JSON.stringify(report)}`);
  await db.close();
  process.exit(0);
}

// ---------------------------------------------------------------- Firebase -> VPS
if (typeof args['service-account'] !== 'string') {
  console.error('--service-account=/chemin/vers/cle.json requis (fichier fourni par le propriétaire, jamais dans git).');
  process.exit(1);
}
const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
const { getDatabase } = await import('firebase-admin/database');
const { getStorage } = await import('firebase-admin/storage');
const appCfg = JSON.parse(readFileSync(new URL('../../firebase-applet-config.json', import.meta.url), 'utf8'));
const app = initializeApp({
  credential: cert(JSON.parse(readFileSync(args['service-account'] as string, 'utf8'))),
  databaseURL: appCfg.databaseURL,
  storageBucket: appCfg.storageBucket
});
const fsDb = appCfg.firestoreDatabaseId && appCfg.firestoreDatabaseId !== '(default)' ? getFirestore(app, appCfg.firestoreDatabaseId) : getFirestore(app);

/** Timestamps Firestore -> chaînes ISO (les profils de l'application stockent des chaînes). */
function plain(v: any): any {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
}

const source: Source = {
  async listFirestore(col) {
    const snap = await fsDb.collection(col).get();
    return snap.docs.map(d => ({ ...plain(d.data()), id: d.id }));
  },
  async listRtdb(col) {
    const snap = await getDatabase(app).ref(col).get();
    const val = snap.val();
    if (!val || typeof val !== 'object') return [];
    return Object.entries(val).filter(([, v]) => v && typeof v === 'object').map(([k, v]: [string, any]) => ({ ...v, id: v.id || k }));
  },
  async listStoragePaths(prefix) {
    const [files] = await getStorage(app).bucket().getFiles({ prefix });
    return files.map((f: { name: string }) => f.name).filter((n: string) => !n.endsWith('/'));
  },
  async downloadStorage(path) {
    const f = getStorage(app).bucket().file(path);
    const [buf] = await f.download();
    const [meta] = await f.getMetadata();
    return { body: buf, contentType: meta.contentType || 'audio/webm' };
  }
};

const report = await migrate(db, storage, source, {
  dryRun, overwrite: !!args.overwrite, skipMedia: !!args['skip-media'],
  only: typeof args.only === 'string' ? args.only.split(',') : undefined, log
});
const file = `migration-report${dryRun ? '-a-blanc' : ''}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(file, JSON.stringify(report, null, 2));
console.log(`\nRapport : ${file}`);
if (report.postgresCounts) {
  for (const [c, n] of Object.entries(report.postgresCounts)) {
    const r = report.collections[c];
    console.log(`  ${c.padEnd(14)} fusionnés ${String(r.merged).padStart(6)}  PostgreSQL ${String(n).padStart(6)}${r.merged === n ? '  ✓ identique' : '  ≠ à vérifier'}`);
  }
}
await db.close();
process.exit(0);
