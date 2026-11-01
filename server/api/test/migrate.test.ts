// Migration Firebase -> VPS : fusion Firestore/RTDB, audio, idempotence, essai à blanc, corpus CSV.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import { importItems } from '../src/importItems.ts';
import { migrate, mergeSources, normalizeRtdbValue, type Source } from '../../scripts/migrate-lib.ts';
import { loadCorpusCsv } from '../../scripts/corpus.ts';

let db: Db;
const files = new Map<string, { body: Uint8Array; ct: string }>();
const storage: MediaStorage = {
  presignPut: async () => '', presignGet: async () => '', remove: async () => {},
  put: async (p, body, ct) => { files.set(p, { body, ct }); },
  exists: async (p) => files.has(p)
};

const b64 = Buffer.from('RIFFfaux-audio').toString('base64');
const FS: Record<string, any[]> = {
  users: [
    { id: 'alice', email: 'Alice@X.com', displayName: 'Alice', role: 'user', xp: 150, level: 'Conteur des Lagunes', levelIndex: 2, badges: ['b1'], contributionsCount: 3, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z', tribe: 'Ôrungu' },
    { id: 'bob', displayName: 'Bob (Firestore, ancien)', role: 'user', xp: 10, updatedAt: '2026-01-01T00:00:00Z' },
    { id: 'adm', displayName: 'Admin', role: 'user', xp: 0 },
    { id: 'u-mboumba', displayName: 'Mboumba Éric (démo)', xp: 1420 }
  ],
  admins: [{ id: 'adm', role: 'admin' }],
  items: [{ id: 'item_1', sourceRef: 'ITEM_001', frenchText: 'Merci', myeneText: 'Akéwa', dialect: 'orungu', category: 'vie', createdAt: '2026-01-01T00:00:00Z' }],
  contributions: [
    { id: 'c_storage', userId: 'alice', itemId: 'item_1', status: 'approved', rewardedXp: 120, audioStoragePath: 'recordings/alice/item_1_1.webm', audioUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/recordings%2Falice%2Fitem_1_1.webm?alt=media', createdAt: '2026-02-01T00:00:00Z' },
    { id: 'c_b64', userId: 'alice', itemId: 'item_1', status: 'pending', audioUrl: `data:audio/webm;base64,${b64}`, createdAt: '2026-02-02T00:00:00Z' },
    { id: 'c_text', userId: 'bob', itemId: 'item_1', status: 'pending', createdAt: '2026-02-03T00:00:00Z' },
    { id: 'c_sans_user', status: 'pending' },
    { id: 'c_demo', userId: 'u-kombila', status: 'approved' }
  ],
  clans: [{ id: 'azizet', name: 'Azizet' }], villages: [], themes: [], badges: [{ id: 'b1', title: 'B' }], challenges: [], metrics: [{ id: 'seed_status', isSeeded: true }]
};
const RT: Record<string, any[]> = {
  users: [
    { id: 'bob', displayName: 'Bob (RTDB, récent)', role: 'validator', xp: 40, updatedAt: '2026-06-01T00:00:00Z', badges: { 0: 'b1', 1: 'b2' } },
    { id: 'alice', displayName: 'Alice RTDB égalité', updatedAt: '2026-05-01T00:00:00Z' },
    { id: 'carol', displayName: 'Carol (RTDB seule)', badges: null }
  ],
  contributions: [{ id: 'c_text', userId: 'bob', itemId: 'item_1', status: 'approved', updatedAt: '2026-07-01T00:00:00Z', validatedAt: '2026-07-01T00:00:00Z' }]
};
const source: Source = {
  listFirestore: async c => FS[c] || [],
  listRtdb: async c => RT[c] || [],
  listStoragePaths: async () => ['recordings/alice/item_1_1.webm', 'recordings/alice/orphelin.webm'],
  downloadStorage: async () => ({ body: new Uint8Array([1, 2, 3]), contentType: 'audio/webm' })
};

before(async () => { db = await createPgliteDb(); await runMigrations(db); });
after(async () => { await db.close(); });

test('fusion : le plus récent gagne, Firestore à égalité, tableaux RTDB normalisés', () => {
  const m = mergeSources(FS.users, RT.users.map(d => normalizeRtdbValue(d)));
  const byId = Object.fromEntries(m.map(x => [x.doc.id, x.doc]));
  assert.equal(byId.bob.displayName, 'Bob (RTDB, récent)');
  assert.deepEqual(byId.bob.badges, ['b1', 'b2']);
  assert.equal(byId.alice.displayName, 'Alice'); // égalité -> Firestore
  assert.deepEqual(byId.carol.badges, []);
  assert.equal(m.length, 5); // (le profil fictif de démo est écarté plus tard, par migrate())
});

test('essai à blanc : rien n\'est écrit, comptes annoncés', async () => {
  const r = await migrate(db, storage, source, { dryRun: true });
  assert.equal(r.collections.users.merged, 4);
  assert.equal(r.collections.contributions.written, 3); // sans userId exclue
  assert.equal(files.size, 0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM users'))[0].n, 0);
});

test('migration complète : comptes identiques, audio copié et décodé, rôle admin', async () => {
  const r = await migrate(db, storage, source, {});
  for (const c of ['users', 'items', 'contributions', 'clans', 'badges', 'metrics', 'admins']) {
    assert.equal(r.postgresCounts![c], r.collections[c].written, `${c} : écrits = PostgreSQL`);
    assert.deepEqual(r.collections[c].errors, []);
  }
  assert.equal(r.postgresCounts!.users, 4); assert.equal(r.postgresCounts!.contributions, 3);
  assert.ok(files.has('recordings/alice/item_1_1.webm') && files.has('recordings/alice/orphelin.webm'));
  assert.equal(r.media.base64Decoded, 1);
  const b = files.get('recordings/alice/c_b64_migre.webm');
  assert.equal(Buffer.from(b!.body).toString(), 'RIFFfaux-audio');
  const rows = await db.query<any>(`SELECT id, audio_storage_path, status, rewarded_xp FROM contributions ORDER BY id`);
  assert.equal(rows.find(x => x.id === 'c_b64').audio_storage_path, 'recordings/alice/c_b64_migre.webm');
  assert.equal(rows.find(x => x.id === 'c_storage').rewarded_xp, 120);
  assert.equal(rows.find(x => x.id === 'c_text').status, 'approved'); // version RTDB plus récente
  const u = await db.query<any>(`SELECT id, role, email, xp, level_index FROM users ORDER BY id`);
  assert.equal(u.find(x => x.id === 'adm').role, 'admin');
  assert.equal(u.find(x => x.id === 'alice').email, 'alice@x.com');
  assert.equal(u.find(x => x.id === 'bob').role, 'validator');
});

test('idempotent : relancer ne duplique rien ni n\'écrase les données vivantes', async () => {
  await db.query(`UPDATE users SET xp = 999 WHERE id = 'alice'`);
  const r = await migrate(db, storage, source, {});
  assert.equal(r.collections.users.written, 0); assert.equal(r.collections.users.skippedExisting, 4);
  assert.equal(r.postgresCounts!.users, 4);
  assert.equal((await db.query<any>(`SELECT xp FROM users WHERE id='alice'`))[0].xp, 999);
  const o = await migrate(db, storage, source, { overwrite: true });
  assert.equal((await db.query<any>(`SELECT xp FROM users WHERE id='alice'`))[0].xp, 150); // bascule finale : Firebase fait foi
  assert.equal(o.postgresCounts!.users, 4);
});

test('corpus réel : ANCIEN (10 000) + NOUVEAU (35 000), filtre par statut, relance sans doublon', async () => {
  const base = new URL('../../../data/corpus_myene/', import.meta.url).pathname;
  const ancien = loadCorpusCsv(base + 'corpus_myene_ANCIEN_mis_a_jour.csv');
  const nouveau = loadCorpusCsv(base + 'corpus_myene_NOUVEAU_35000.csv');
  assert.equal(ancien.length, 10000); assert.equal(nouveau.length, 35000);
  assert.equal((nouveau[0] as any).corpusMeta.statut, 'attestee');
  assert.ok((nouveau[0] as any).corpusMeta.source_page);

  const blanc = await importItems(db, [...ancien, ...nouveau], { dryRun: true });
  assert.equal((await db.query<any>(`SELECT count(*)::int AS n FROM items WHERE source_ref LIKE 'NEW\\_%'`))[0].n, 0); // l'essai à blanc n'écrit rien

  const r1 = await importItems(db, [...ancien, ...nouveau]);
  assert.equal(r1.created + r1.unchanged + r1.updated + r1.internalDuplicates, 45000);
  const n1 = (await db.query<any>(`SELECT count(*)::int AS n FROM items WHERE deleted_at IS NULL`))[0].n;
  assert.equal(n1, blanc.created + 1); // + l'item de la migration test
  const r2 = await importItems(db, [...ancien, ...nouveau]);
  assert.equal(r2.created, 0);
  assert.equal((await db.query<any>(`SELECT count(*)::int AS n FROM items WHERE deleted_at IS NULL`))[0].n, n1);
  const sample = await db.query<any>(`SELECT data FROM items WHERE source_ref = 'NEW_00001'`);
  assert.equal(sample[0].data.corpusMeta.statut, 'attestee');
  console.log(`      corpus : ${r1.created} créées, ${r1.internalDuplicates} doublons internes, ${r1.unchanged} déjà présentes (essai à blanc : ${blanc.created})`);

  const att = loadCorpusCsv(base + 'corpus_myene_NOUVEAU_35000.csv', { statuts: ['attestee'] });
  assert.equal(att.length, 5754);
});
