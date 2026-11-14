// Recherche hybride du RAG (mots-clés + vecteurs, 14 nov. 2026). Textes inventés pour le test (D5), sauf la traduction française
// d'un proverbe du recueil DONDO (PRV-0075) utilisée comme cible.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import { motsCles, sansAccents } from '../src/ia.ts';

let db: Db, app: FastifyInstance;
const storage: MediaStorage = { presignPut: async () => '', presignGet: async p => `https://media.test/get/${p}`, remove: async () => {}, put: async () => {}, exists: async () => true, get: async () => null };
const verify: TokenVerifier = async token => userFromClaims(JSON.parse(Buffer.from(token, 'base64url').toString()));
const ADMIN = Buffer.from(JSON.stringify({ iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: 'capp', email: 'andymigoumbi@gmail.com', email_verified: true, firebase: { sign_in_provider: 'password' } })).toString('base64url');
const USER = Buffer.from(JSON.stringify({ iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: 'u1', email: 'u1@x.com', email_verified: false, firebase: { sign_in_provider: 'password' } })).toString('base64url');
async function call(method: string, url: string, token?: string, body?: unknown) {
  const res = await app.inject({ method: method as any, url, payload: body as any, headers: token ? { authorization: `Bearer ${token}` } : {} });
  let json: any = null; try { json = res.json(); } catch { json = res.body; }
  return { status: res.statusCode, body: json };
}

before(async () => {
  db = await createPgliteDb();
  await runMigrations(db);
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: false, rateLimitMax: 100000, sessionSecret: 'secret-de-test-0123456789abcdef' });
  const doc = (id: string, titre: string, texte: string) => call('POST', '/v1/admin/ia/documents', ADMIN, { id, titre, texte, source: 'test' });
  assert.equal((await doc('dico', 'Dictionnaire scanné (essai)', 'Akè, risée. Eau courante, eau de source, puiser de l\'eau, verser l\'eau, eau salée. Gruger, briser avec les dents. Voilà deux jours.')).status, 201);
  assert.equal((await doc('prov', 'Proverbes (essai)', 'Le fleuve a fait des détours car il n\'a trouvé personne pour le guider. On ne poursuit pas deux lièvres à la fois.')).status, 201);
  assert.equal((await doc('roman', 'Un roman (essai)', 'La soupe à midi et point de nuits à passer sur l\'eau. Le capitaine regardait la mer.')).status, 201);
});
after(async () => { await app.close(); await db.close(); });

test('mots-clés : accents, mots vides et tournures de demande retirés, synonymes ajoutés', () => {
  assert.equal(sansAccents('Rivière ÉCLAIRÉE ɛɔ'), 'riviere eclairee eo');
  const m = motsCles('Donne moi un proverbe en myènè qui parle de rivière');
  assert.ok(m.includes('proverbe') && m.includes('riviere') && m.includes('fleuve'));
  assert.ok(!m.includes('donne') && !m.includes('myene') && !m.includes('parle'));
});

test('« un proverbe qui parle de rivière » : le recueil de proverbes passe devant le dictionnaire bruité', async () => {
  const r = await call('POST', '/v1/admin/ia/rag/rechercher', ADMIN, { requete: 'Donne moi un proverbe en myènè qui parle de rivière' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.resultats[0].document, 'prov');
  assert.ok(r.body.resultats[0].motsCles !== undefined, 'trouvé aussi par ses mots-clés');
  assert.equal((await call('POST', '/v1/admin/ia/rag/rechercher', USER, { requete: 'x' })).status, 403);
  assert.equal((await call('POST', '/v1/admin/ia/rag/rechercher', undefined, { requete: 'x' })).status, 401);
  assert.equal((await call('POST', '/v1/admin/ia/rag/rechercher', ADMIN, { requete: '' })).status, 400);
});
