// Le client du navigateur (src/data/api.ts) contre une vraie API en écoute : jeton, erreurs, flux SSE, URL médias.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import { api, ApiError, isPermanentApiError, resolveMediaUrl, setTokenProvider, subscribeToEvents, uploadMedia, API_URL } from '../../../src/data/api.ts';

let db: Db; let app: FastifyInstance;
const verify: TokenVerifier = async (t) => userFromClaims(JSON.parse(Buffer.from(t, 'base64url').toString()));
const tok = (uid: string, email?: string, verified = false) => Buffer.from(JSON.stringify({
  iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: uid, email, email_verified: verified, firebase: { sign_in_provider: 'password' }
})).toString('base64url');

before(async () => {
  db = await createPgliteDb(); await runMigrations(db);
  app = await buildApp({
    db, verify, corsOrigins: ['http://localhost:3000'], logger: false, rateLimitMax: 100000,
    storage: { presignPut: async (p) => `${API_URL}/health?put=${p}`, presignGet: async (p) => `https://media.test/${p}`, remove: async () => {}, put: async () => {}, exists: async () => true }
  });
  await app.listen({ port: 3001, host: '127.0.0.1' });
});
after(async () => { await app.close(); await db.close(); });

test('client : jeton ajouté, rafraîchi après 401, erreurs typées', async () => {
  let calls = 0;
  setTokenProvider(async (force) => { calls++; return force ? tok('u1', 'u1@x.com') : 'périmé'; });
  const me = await api('GET', '/v1/me');
  assert.equal(me.id, 'u1'); assert.equal(me.role, 'user'); assert.equal(calls, 2);
  setTokenProvider(async () => tok('u1', 'u1@x.com'));
  await assert.rejects(api('PUT', '/v1/items/x', { a: 1 }), (e: ApiError) => e.status === 403 && isPermanentApiError(e));
  setTokenProvider(async () => null);
  await assert.rejects(api('GET', '/v1/me'), (e: ApiError) => e.status === 401);
});

test('client : flux SSE — l\'admin modifie un item, l\'utilisateur est prévenu', async () => {
  setTokenProvider(async () => tok('u2', 'u2@x.com'));
  const seen: string[] = [];
  const stop = subscribeToEvents(c => seen.push(c));
  await new Promise(r => setTimeout(r, 400));
  setTokenProvider(async () => tok('capp', 'andymigoumbi@gmail.com', true));
  await api('PUT', '/v1/items/sse1', { frenchText: 'a', myeneText: 'b' });
  for (let i = 0; i < 20 && !seen.includes('items'); i++) await new Promise(r => setTimeout(r, 100));
  stop();
  assert.ok(seen.includes('items'), `signaux reçus : ${seen.join(',')}`);
});

test('client : URL média présignée mise en cache ; envoi présigné', async () => {
  setTokenProvider(async () => tok('u3', 'u3@x.com'));
  assert.equal(await resolveMediaUrl('media:recordings/u3/a.webm'), 'https://media.test/recordings/u3/a.webm');
  assert.equal(await resolveMediaUrl('https://exemple.org/x.mp3'), 'https://exemple.org/x.mp3');
  assert.equal(await uploadMedia('recordings/u3/a.webm', new Blob([new Uint8Array(10)]), 'audio/webm'), false); // PUT sur /health : refusé, donc false
});
