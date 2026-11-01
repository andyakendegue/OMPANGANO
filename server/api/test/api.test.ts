// Tests de l'API OMPANGANO : transposition de tests/rules.test.mjs (règles Firestore / RTDB / Storage).
// Lancer : npm test (dans server/). PostgreSQL est simulé par PGlite : pas besoin de Docker.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';

let db: Db;
let app: FastifyInstance;
const removed: string[] = [];

const storage: MediaStorage = {
  presignPut: async (p, ct, size) => `https://media.test/put/${p}?ct=${ct}&size=${size}`,
  presignGet: async (p) => `https://media.test/get/${p}`,
  remove: async (p) => { removed.push(p); },
  put: async () => {},
  exists: async () => true
};

/** Jeton de test = revendications JSON en base64 ; passe par le vrai contrôle iss / aud / sub / anonyme. */
const verify: TokenVerifier = async (token) => {
  if (token === 'invalide') throw new Error('signature');
  return userFromClaims(JSON.parse(Buffer.from(token, 'base64url').toString()));
};
const tok = (uid: string, o: { email?: string; verified?: boolean; provider?: string; iss?: string; aud?: string } = {}) =>
  Buffer.from(JSON.stringify({
    iss: o.iss ?? 'https://securetoken.google.com/enenga', aud: o.aud ?? 'enenga', sub: uid,
    email: o.email, email_verified: o.verified ?? false, firebase: { sign_in_provider: o.provider ?? 'password' }
  })).toString('base64url');

const SUPER = tok('capp', { email: 'andymigoumbi@gmail.com', verified: true, provider: 'google.com' });

async function call(method: string, url: string, token?: string, body?: unknown) {
  const res = await app.inject({
    method: method as any, url, payload: body as any,
    headers: token ? { authorization: `Bearer ${token}` } : {}
  });
  let json: any = null;
  try { json = res.json(); } catch { /* corps vide */ }
  return { status: res.statusCode, body: json };
}

let seq = 0;
const uniq = (p: string) => `${p}${++seq}`;

/** Crée un utilisateur ayant accepté les conditions. */
async function newUser(prefix = 'u', opts: { role?: 'validator' | 'admin' } = {}) {
  const uid = uniq(prefix);
  const token = tok(uid, { email: `${uid}@x.com` });
  await call('GET', '/v1/me', token);
  await call('PATCH', '/v1/me', token, { displayName: uid, termsAccepted: true, dataUsageAccepted: true, registrationCompleted: true });
  if (opts.role) await call('PATCH', `/v1/users/${uid}`, SUPER, { role: opts.role });
  return { uid, token };
}

async function newItem(extra: Record<string, unknown> = {}) {
  const id = uniq('item');
  const r = await call('PUT', `/v1/items/${id}`, SUPER, { frenchText: 'Merci', myeneText: 'Akéwa', dialect: 'orungu', category: 'vie', theme: 'vie', ...extra });
  assert.equal(r.status, 200);
  return id;
}

async function submit(user: { token: string }, itemId: string, extra: Record<string, unknown> = {}) {
  const r = await call('POST', '/v1/contributions', user.token, { itemId, frenchText: 'Merci', originalMyeneText: 'Akéwa', isSpellingCorrect: true, ...extra });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.id as string;
}

before(async () => {
  db = await createPgliteDb();
  await runMigrations(db);
  app = await buildApp({ db, verify, storage, corsOrigins: ['http://localhost:3000'], rateLimitMax: 100000, logger: false });
  await call('GET', '/v1/me', SUPER);
});
after(async () => { await app.close(); await db.close(); });

// ---------------------------------------------------------------- authentification
test('sans jeton : 401', async () => assert.equal((await call('GET', '/v1/me')).status, 401));
test('jeton invalide : 401', async () => assert.equal((await call('GET', '/v1/me', 'invalide')).status, 401));
test('session anonyme refusée', async () => assert.equal((await call('GET', '/v1/items/x', tok('anon', { provider: 'anonymous' }))).status, 401));
test('mauvais projet (aud / iss) refusé', async () => {
  assert.equal((await call('GET', '/v1/me', tok('z1', { aud: 'autre' }))).status, 401);
  assert.equal((await call('GET', '/v1/me', tok('z2', { iss: 'https://securetoken.google.com/autre' }))).status, 401);
});
test('sub vide refusé', () => assert.throws(() => userFromClaims({ iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: '', firebase: { sign_in_provider: 'password' } })));
test('/health sans jeton', async () => assert.equal((await call('GET', '/health')).status, 200));

// ---------------------------------------------------------------- profils et rôles
test('création de profil : valeurs initiales, rôle user', async () => {
  const { token } = await newUser();
  const me = (await call('GET', '/v1/me', token)).body;
  assert.equal(me.role, 'user'); assert.equal(me.xp, 0); assert.equal(me.levelIndex, 1); assert.deepEqual(me.badges, []);
});

test('un contributeur ne se donne pas le rôle admin ni des XP (champs protégés ignorés)', async () => {
  const { token, uid } = await newUser();
  const r = await call('PATCH', '/v1/me', token, { role: 'admin', xp: 99999, status: 'active', badges: ['x'], contributionsCount: 50, villageOfOrigin: 'Ozouri' });
  assert.equal(r.status, 200);
  assert.equal(r.body.role, 'user'); assert.equal(r.body.xp, 0); assert.deepEqual(r.body.badges, []); assert.equal(r.body.contributionsCount, 0);
  assert.equal(r.body.villageOfOrigin, 'Ozouri');
  assert.equal((await call('PATCH', `/v1/users/${uid}`, token, { role: 'admin' })).status, 403);
  assert.equal((await call('PUT', '/v1/admins/' + uid, token, { role: 'admin' })).status, 403);
});

test('« badminton.admin@… » n\'est pas admin', async () => {
  const t = tok('eve', { email: 'badminton.admin@gmail.com', verified: true });
  assert.equal((await call('GET', '/v1/me', t)).body.role, 'user');
  assert.equal((await call('PUT', '/v1/admins/eve', t, { role: 'admin' })).status, 403);
  assert.equal((await call('PUT', '/v1/items/zz', t, { frenchText: 'x' })).status, 403);
  assert.equal((await call('GET', '/v1/users', t)).status, 403);
});

test('super-administrateur : adresse exacte ET vérifiée seulement', async () => {
  assert.equal((await call('GET', '/v1/me', SUPER)).body.role, 'admin');
  const unverified = tok('faux1', { email: 'andymigoumbi@gmail.com', verified: false });
  assert.equal((await call('GET', '/v1/me', unverified)).body.role, 'user');
  assert.equal((await call('PUT', '/v1/items/zz', unverified, { frenchText: 'x' })).status, 403);
  const lookalike = tok('faux2', { email: 'andymigoumbi@gmail.com.evil.com', verified: true });
  assert.equal((await call('GET', '/v1/me', lookalike)).body.role, 'user');
});

test('création de compte avec XP gonflés : ignorés', async () => {
  const t = tok(uniq('n'), { email: 'n@x.com' });
  await call('GET', '/v1/me', t);
  const r = await call('PATCH', '/v1/me', t, { xp: 500, level: 'Sage Ancien', levelIndex: 5 });
  assert.equal(r.body.xp, 0); assert.equal(r.body.levelIndex, 1);
});

test('un contributeur ne lit ni ne liste les autres profils ; un validateur oui', async () => {
  const a = await newUser(); const b = await newUser(); const v = await newUser('v', { role: 'validator' });
  assert.equal((await call('GET', `/v1/users/${b.uid}`, a.token)).status, 403);
  assert.equal((await call('GET', `/v1/users/${a.uid}`, a.token)).status, 200);
  assert.equal((await call('GET', '/v1/users', a.token)).status, 403);
  assert.equal((await call('GET', '/v1/sync/users', a.token)).status, 403);
  assert.equal((await call('GET', '/v1/users', v.token)).status, 200);
  assert.equal((await call('PATCH', `/v1/users/${a.uid}`, v.token, { role: 'admin' })).status, 403);
});

test('un admin change un rôle, un statut ; rétrograder retire les droits', async () => {
  const u = await newUser();
  assert.equal((await call('PATCH', `/v1/users/${u.uid}`, SUPER, { role: 'admin' })).body.role, 'admin');
  assert.equal((await call('PUT', '/v1/themes/t-' + u.uid, u.token, { name: 'T' })).status, 200);
  await call('PATCH', `/v1/users/${u.uid}`, SUPER, { role: 'user' });
  assert.equal((await call('PUT', '/v1/themes/t2-' + u.uid, u.token, { name: 'T' })).status, 403);
  assert.equal((await call('PATCH', `/v1/users/${u.uid}`, SUPER, { role: 'bidon' })).status, 400);
});

test('classement public : seulement les champs publics', async () => {
  const u = await newUser();
  await call('PATCH', '/v1/me', u.token, { contact: '+241000', birthDate: '1990-01-01', tribe: 'Ôrungu', villageOfOrigin: 'Port-Gentil' });
  const board = (await call('GET', '/v1/leaderboard', u.token)).body as any[];
  const mine = board.find(e => e.id === u.uid);
  assert.ok(mine);
  assert.equal(mine.villageOfOrigin, 'Port-Gentil');
  for (const k of ['contact', 'birthDate', 'email', 'role', 'status', 'paternalClan', 'electronicSignature']) assert.ok(!(k in mine), `${k} ne doit pas être public`);
});

// ---------------------------------------------------------------- contributions
test('contribution : toujours « pending », userId pris du jeton, sans récompense', async () => {
  const a = await newUser(); const b = await newUser();
  const item = await newItem();
  const r = await call('POST', '/v1/contributions', a.token, { itemId: item, userId: b.uid, status: 'approved', rewardedXp: 500, frenchText: 'x', originalMyeneText: 'y', isSpellingCorrect: true });
  assert.equal(r.status, 201);
  assert.equal(r.body.userId, a.uid); assert.equal(r.body.status, 'pending'); assert.equal(r.body.rewardedXp, 0);
});

test('contribution sans consentement ou compte suspendu : refusée', async () => {
  const t = tok(uniq('nc'), { email: 'nc@x.com' });
  await call('GET', '/v1/me', t);
  assert.equal((await call('POST', '/v1/contributions', t, { itemId: 'i', frenchText: 'x' })).status, 403);
  const s = await newUser();
  await call('PATCH', `/v1/users/${s.uid}`, SUPER, { status: 'suspended' });
  assert.equal((await call('POST', '/v1/contributions', s.token, { itemId: 'i', frenchText: 'x' })).status, 403);
});

test('rejeu hors-ligne : même identifiant = pas de doublon ; identifiant d\'un autre refusé', async () => {
  const a = await newUser(); const b = await newUser();
  const id = uniq('cid');
  assert.equal((await call('POST', '/v1/contributions', a.token, { id, itemId: 'i', frenchText: 'x' })).status, 201);
  assert.equal((await call('POST', '/v1/contributions', a.token, { id, itemId: 'i', frenchText: 'x' })).status, 201);
  const sync = (await call('GET', '/v1/sync/contributions', a.token)).body.records.filter((c: any) => c.id === id);
  assert.equal(sync.length, 1);
  assert.equal((await call('POST', '/v1/contributions', b.token, { id, itemId: 'i', frenchText: 'x' })).status, 409);
});

test('contributeur supprime sa contribution en attente, pas celle d\'un autre ni une validée', async () => {
  const a = await newUser(); const b = await newUser(); const v = await newUser('v', { role: 'validator' });
  const item = await newItem();
  const c1 = await submit(a, item); const c2 = await submit(a, item);
  assert.equal((await call('DELETE', `/v1/contributions/${c1}`, b.token)).status, 403);
  assert.equal((await call('DELETE', `/v1/contributions/${c1}`, a.token)).status, 204);
  await call('POST', `/v1/contributions/${c2}/validate`, v.token, { status: 'approved' });
  assert.equal((await call('DELETE', `/v1/contributions/${c2}`, a.token)).status, 403);
});

test('validation : un contributeur simple ne peut pas valider', async () => {
  const a = await newUser(); const b = await newUser();
  const c = await submit(a, await newItem());
  assert.equal((await call('POST', `/v1/contributions/${c}/validate`, b.token, { status: 'approved' })).status, 403);
});

test('personne ne valide sa propre contribution (validateur ni admin)', async () => {
  const v = await newUser('v', { role: 'validator' });
  const c = await submit(v, await newItem());
  assert.equal((await call('POST', `/v1/contributions/${c}/validate`, v.token, { status: 'approved' })).status, 403);
  await call('GET', '/v1/me', SUPER);
  await call('PATCH', '/v1/me', SUPER, { termsAccepted: true, dataUsageAccepted: true });
  const c2 = await submit({ token: SUPER }, await newItem());
  assert.equal((await call('POST', `/v1/contributions/${c2}/validate`, SUPER, { status: 'approved' })).status, 403);
});

test('validation : points attribués au contributeur, compteur du validateur', async () => {
  const a = await newUser(); const v = await newUser('v', { role: 'validator' });
  const c = await submit(a, await newItem());
  const r = await call('POST', `/v1/contributions/${c}/validate`, v.token, { status: 'approved', validatorNotes: 'ok' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.contribution.status, 'approved');
  assert.equal(r.body.contribution.rewardedXp, 50); // texte seul
  assert.equal(r.body.contributor.xp, 50); assert.equal(r.body.contributor.contributionsCount, 1);
  assert.equal(r.body.validator.validationsCount, 1);
  assert.equal((await call('GET', '/v1/me', a.token)).body.xp, 50);
});

test('un renvoi de validation ne compte pas deux fois', async () => {
  const a = await newUser(); const v = await newUser('v', { role: 'validator' });
  const c = await submit(a, await newItem());
  await call('POST', `/v1/contributions/${c}/validate`, v.token, { status: 'approved' });
  const again = await call('POST', `/v1/contributions/${c}/validate`, v.token, { status: 'approved' });
  assert.equal(again.body.contributor.xp, 50); assert.equal(again.body.contributor.contributionsCount, 1);
  assert.equal(again.body.validator.validationsCount, 1);
  // deux validations simultanées : toujours un seul comptage
  const c2 = await submit(a, await newItem());
  const v2 = await newUser('v', { role: 'validator' });
  await Promise.all([call('POST', `/v1/contributions/${c2}/validate`, v.token, { status: 'approved' }), call('POST', `/v1/contributions/${c2}/validate`, v2.token, { status: 'approved' })]);
  assert.equal((await call('GET', '/v1/me', a.token)).body.xp, 100);
});

test('un rejet après approbation retire les points', async () => {
  const a = await newUser(); const v = await newUser('v', { role: 'validator' });
  const c = await submit(a, await newItem());
  await call('POST', `/v1/contributions/${c}/validate`, v.token, { status: 'approved' });
  const r = await call('POST', `/v1/contributions/${c}/validate`, v.token, { status: 'rejected' });
  assert.equal(r.body.contributor.xp, 0); assert.equal(r.body.contributor.contributionsCount, 0);
});

test('avec audio : 120 XP + enregistrement compté ; suppression par un admin retire les points et l\'audio', async () => {
  const a = await newUser(); const v = await newUser('v', { role: 'validator' });
  const path = `recordings/${a.uid}/i_1.webm`;
  const c = await submit(a, await newItem(), { audioStoragePath: path, audioMimeType: 'audio/webm' });
  const r = await call('POST', `/v1/contributions/${c}/validate`, v.token, { status: 'approved' });
  assert.equal(r.body.contributor.xp, 120); assert.equal(r.body.contributor.recordingsCount, 1);
  assert.equal((await call('DELETE', `/v1/contributions/${c}`, v.token)).status, 403); // un validateur n'est pas admin
  assert.equal((await call('DELETE', `/v1/contributions/${c}`, SUPER)).status, 204);
  const me = (await call('GET', '/v1/me', a.token)).body;
  assert.equal(me.xp, 0); assert.equal(me.recordingsCount, 0);
  assert.ok(removed.includes(path));
});

test('audio dans le dossier d\'un autre refusé à la création de contribution', async () => {
  const a = await newUser(); const b = await newUser();
  const r = await call('POST', '/v1/contributions', a.token, { itemId: 'i', frenchText: 'x', audioStoragePath: `recordings/${b.uid}/x.webm` });
  assert.equal(r.status, 400);
});

test('un défi hebdomadaire terminé donne XP et badge, une seule fois par contribution', async () => {
  const a = await newUser(); const v = await newUser('v', { role: 'validator' });
  const chId = uniq('ch');
  await call('PUT', `/v1/challenges/${chId}`, SUPER, { title: 'D', theme: 'all', targetCount: 1, challengeType: 'all', xpReward: 30, badgeRewardId: 'b-def', isActive: true, startDate: '', endDate: '' });
  const c = await submit(a, await newItem());
  const r1 = await call('POST', `/v1/contributions/${c}/validate`, v.token, { status: 'approved' });
  assert.equal(r1.body.contributor.xp, 80); assert.ok(r1.body.contributor.badges.includes('b-def'));
  const r2 = await call('POST', `/v1/contributions/${c}/validate`, v.token, { status: 'approved' });
  assert.equal(r2.body.contributor.xp, 80);
  await call('DELETE', `/v1/challenges/${chId}`, SUPER);
});

// ---------------------------------------------------------------- médias
test('envoi audio : dossier personnel seulement, audio seulement, 15 Mo maximum', async () => {
  const a = await newUser(); const b = await newUser();
  const up = (token: string, body: any) => call('POST', '/v1/media/upload-url', token, body);
  const ok = await up(a.token, { path: `recordings/${a.uid}/i1_1.webm`, contentType: 'audio/webm;codecs=opus', size: 1000 });
  assert.equal(ok.status, 200); assert.match(ok.body.uploadUrl, /recordings\//); assert.equal(ok.body.expiresIn, 600);
  assert.equal((await up(a.token, { path: `recordings/${b.uid}/i1_1.webm`, contentType: 'audio/webm', size: 1000 })).status, 403);
  assert.equal((await up(a.token, { path: `recordings/${a.uid}/x.html`, contentType: 'text/html', size: 1000 })).status, 400);
  assert.equal((await up(a.token, { path: `recordings/${a.uid}/big.webm`, contentType: 'audio/webm', size: 16 * 1024 * 1024 })).status, 413);
  assert.equal((await up(a.token, { path: `recordings/${a.uid}/../${b.uid}/x.webm`, contentType: 'audio/webm', size: 10 })).status, 403);
  assert.equal((await up(a.token, { path: 'images/x.png', contentType: 'image/png', size: 10 })).status, 403); // images : admin
  assert.equal((await up(SUPER, { path: 'images/x.png', contentType: 'image/png', size: 10 })).status, 200);
  assert.equal((await up(SUPER, { path: 'images/x.png', contentType: 'audio/webm', size: 10 })).status, 400);
  assert.equal((await call('GET', `/v1/media/url?path=recordings/${a.uid}/i1_1.webm`, b.token)).status, 200);
  assert.equal((await call('GET', '/v1/media/url?path=../etc/passwd', b.token)).status, 400);
});

// ---------------------------------------------------------------- catalogue, import, synchro
test('catalogue : un contributeur lit mais ne modifie pas ; il peut ajouter un clan, pas le modifier', async () => {
  const a = await newUser();
  const item = await newItem();
  assert.equal((await call('PUT', `/v1/items/${item}`, a.token, { myeneText: 'x' })).status, 403);
  assert.equal((await call('DELETE', `/v1/items/${item}`, a.token)).status, 403);
  const clan = uniq('clan');
  assert.equal((await call('PUT', `/v1/clans/${clan}`, a.token, { name: 'Azizet', tribe: 'Ôrungu' })).status, 200);
  assert.equal((await call('PUT', `/v1/clans/${clan}`, a.token, { name: 'Autre' })).status, 403);
  assert.equal((await call('PUT', `/v1/badges/${uniq('b')}`, a.token, { title: 'x' })).status, 403);
});

test('import : même numéro = mise à jour, sinon création, sans doublon', async () => {
  const mk = (ref: string, my: string, fr: string) => ({ id: ref, sourceRef: ref, myeneText: my, frenchText: fr, dialect: 'orungu', category: 'vie', contextNotes: '', imageUrl: '', difficulty: 'debutant', status: 'active', contributionsCount: 0, recordingsCount: 0, createdBy: 'x', createdAt: '' });
  const u = await newUser();
  assert.equal((await call('POST', '/v1/items/import', u.token, { items: [] })).status, 403);
  const r1 = await call('POST', '/v1/items/import', SUPER, { items: [mk('IMP_1', 'Mbolo', 'Bonjour'), mk('IMP_2', 'Ndjembe', 'Le fleuve'), mk('IMP_1', 'Mbolo', 'Bonjour')] });
  assert.equal(r1.body.created, 2); assert.equal(r1.body.internalDuplicates, 1);
  const r2 = await call('POST', '/v1/items/import', SUPER, { items: [mk('IMP_1', 'Mbolo', 'Bonjour'), mk('IMP_2', 'Ndjembe !', 'Le fleuve')] });
  assert.equal(r2.body.created, 0); assert.equal(r2.body.updated, 1); assert.equal(r2.body.unchanged, 1);
  const all = (await call('GET', '/v1/sync/items?limit=5000', u.token)).body.records.filter((i: any) => String(i.sourceRef).startsWith('IMP_'));
  assert.equal(all.length, 2);
  assert.equal(all.find((i: any) => i.sourceRef === 'IMP_2').myeneText, 'Ndjembe !');
});

test('synchro incrémentale : pages, suppressions logiques, curseur', async () => {
  const u = await newUser();
  const ids = [await newItem(), await newItem(), await newItem()];
  const first = (await call('GET', '/v1/sync/items?limit=1000', u.token)).body;
  const cursor = first.cursor as string;
  assert.ok(cursor.includes('|'));
  const second = (await call('GET', `/v1/sync/items?since=${encodeURIComponent(cursor)}`, u.token)).body;
  assert.equal(second.records.length, 0);
  await call('DELETE', `/v1/items/${ids[0]}`, SUPER);
  await call('PUT', `/v1/items/${ids[1]}`, SUPER, { myeneText: 'Modifié' });
  const third = (await call('GET', `/v1/sync/items?since=${encodeURIComponent(cursor)}`, u.token)).body;
  const del = third.records.find((r: any) => r.id === ids[0]);
  assert.ok(del.deletedAt);
  assert.equal(third.records.find((r: any) => r.id === ids[1]).myeneText, 'Modifié');
  // pagination
  const p1 = (await call('GET', '/v1/sync/items?limit=2', u.token)).body;
  assert.equal(p1.records.length, 2); assert.equal(p1.hasMore, true);
  const p2 = (await call('GET', `/v1/sync/items?limit=2&since=${encodeURIComponent(p1.cursor)}`, u.token)).body;
  assert.ok(p2.records.length >= 1);
  assert.ok(!p2.records.some((r: any) => p1.records.some((q: any) => q.id === r.id)));
  assert.equal((await call('GET', '/v1/sync/inconnue', u.token)).status, 404);
});

test('CORS : seuls les domaines du site', async () => {
  const ok = await app.inject({ method: 'OPTIONS', url: '/v1/me', headers: { origin: 'http://localhost:3000', 'access-control-request-method': 'GET' } });
  assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:3000');
  const ko = await app.inject({ method: 'OPTIONS', url: '/v1/me', headers: { origin: 'https://evil.example', 'access-control-request-method': 'GET' } });
  assert.equal(ko.headers['access-control-allow-origin'], undefined);
});

test('le seed initial n\'est jamais écrasé par un import CSV ni par une écriture en masse', async () => {
  const id = uniq('seed');
  await call('PUT', `/v1/items/${id}`, SUPER, { frenchText: 'Bonjour', myeneText: 'Mbôluani', sourceRef: id.toUpperCase(), dialect: 'enenga', category: 'vie', createdBy: 'system_ompangano' });
  const mk = (extra: object) => ({ id, sourceRef: id.toUpperCase(), frenchText: 'Bonjour', myeneText: 'ÉCRASÉ', dialect: 'orungu', category: 'vie', contextNotes: '', imageUrl: '', difficulty: 'debutant', status: 'active', contributionsCount: 0, recordingsCount: 0, createdBy: 'admin_csv_import', createdAt: '', ...extra });
  await call('POST', '/v1/items/import', SUPER, { items: [mk({})] });
  await call('POST', '/v1/items/batch', SUPER, { records: [mk({})] });
  const read = async () => (await call('GET', '/v1/sync/items?limit=5000', SUPER)).body.records.find((i: any) => i.id === id);
  assert.equal((await read()).myeneText, 'Mbôluani');
  assert.equal((await read()).createdBy, 'system_ompangano');
  // une modification manuelle d'un admin reste possible, et le seed peut se corriger lui-même
  await call('PUT', `/v1/items/${id}`, SUPER, { myeneText: 'Mbôluani !' });
  assert.equal((await read()).myeneText, 'Mbôluani !');
  await call('POST', '/v1/items/batch', SUPER, { records: [{ id, myeneText: 'Mbôluani ?', createdBy: 'system_ompangano' }] });
  assert.equal((await read()).myeneText, 'Mbôluani ?');
  // même texte myènè que le seed, autre traduction, autre numéro : pas de doublon
  const dupId = uniq('dup');
  const dup = mk({ id: dupId, sourceRef: dupId.toUpperCase(), frenchText: 'Autre traduction', myeneText: 'Mbôluani ?' });
  const r = await call('POST', '/v1/items/import', SUPER, { items: [dup] });
  assert.equal(r.body.created, 0);
  await call('POST', '/v1/items/batch', SUPER, { records: [dup] });
  const all = (await call('GET', '/v1/sync/items?limit=5000', SUPER)).body.records;
  assert.ok(!all.some((i: any) => i.id === dupId), 'le doublon du seed ne doit pas être créé');
});
