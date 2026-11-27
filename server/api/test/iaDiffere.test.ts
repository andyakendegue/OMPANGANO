// Réponses différées de l'assistant (réveil d'un worker serverless) et ordre d'indexation du RAG (14 nov. 2026).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import type { FournisseurIa } from '../src/ia.ts';
import { ordonnerParPriorite } from '../src/dossier.ts';

let db: Db, app: FastifyInstance;
let lenteur = 0, panne = false;
const ia: FournisseurIa = { nom: 'test', repondre: async () => {
  await new Promise(r => setTimeout(r, lenteur));
  if (panne) throw new Error('test : réponse vide (forme inconnue)');
  return { texte: 'Mbolo !', usage: { entree: 10, sortie: 3 }, modele: 'test', simule: false };
} };
const storage: MediaStorage = { presignPut: async () => '', presignGet: async p => `https://media.test/get/${p}`, remove: async () => {}, put: async () => {}, exists: async () => true, get: async () => null };
const verify: TokenVerifier = async token => userFromClaims(JSON.parse(Buffer.from(token, 'base64url').toString()));
const tok = (uid: string) => Buffer.from(JSON.stringify({ iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: uid, email: `${uid}@x.com`, email_verified: false, firebase: { sign_in_provider: 'password' } })).toString('base64url');
async function call(method: string, url: string, token?: string, body?: unknown) {
  const res = await app.inject({ method: method as any, url, payload: body as any, headers: token ? { authorization: `Bearer ${token}` } : {} });
  let json: any = null; try { json = res.json(); } catch { json = res.body; }
  return { status: res.statusCode, body: json };
}
const attendre = async (id: string, token: string) => {
  for (let i = 0; i < 400; i++) { const r = await call('GET', `/v1/ia/travaux/${id}`, token); if (r.body?.statut !== 'en_cours') return r; await new Promise(ok => setTimeout(ok, 30)); }
  throw new Error('travail jamais terminé');
};

before(async () => {
  db = await createPgliteDb();
  await runMigrations(db);
  process.env.FONCTIONS_ACTIVES = 'assistantIA';
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: false, rateLimitMax: 100000, ia, sessionSecret: 'secret-de-test-0123456789abcdef' });
});
after(async () => { await app.close(); await db.close(); delete process.env.FONCTIONS_ACTIVES; });

test('question simple : 202 tout de suite, « en cours » pendant le réveil, puis la réponse', async () => {
  const u = tok('attente1'); await call('GET', '/v1/me', u);
  lenteur = 2000;
  const d = await call('POST', '/v1/ia/message', u, { message: 'Mbolo', asynchrone: true });
  assert.equal(d.status, 202, 'réponse avant la fin du modèle (2 s)'); assert.match(d.body.travail, /^tr_[0-9a-f]{18}$/);
  const enCours = await call('GET', `/v1/ia/travaux/${d.body.travail}`, u);
  assert.equal(enCours.body.statut, 'en_cours');
  const fin = await attendre(d.body.travail, u);
  assert.equal(fin.status, 200); assert.equal(fin.body.statut, 'fini'); assert.equal(fin.body.reponse, 'Mbolo !');
  const relu = await call('GET', `/v1/ia/travaux/${d.body.travail}`, u);
  assert.deepEqual([relu.status, relu.body.reponse], [200, 'Mbolo !'], 'une relève perdue ou rejouée retrouve la même réponse');
  lenteur = 0;
});

test('chat : réponse différée enregistrée, panne du modèle relayée en 502, saisie vide refusée tout de suite', async () => {
  const u = tok('attente2'); await call('GET', '/v1/me', u);
  const c = (await call('POST', '/v1/ia/chats', u, { titre: 'Essai' })).body.chat;
  assert.equal((await call('POST', `/v1/ia/chats/${c.id}/messages`, u, { message: '  ', asynchrone: true })).status, 400);
  const d = await call('POST', `/v1/ia/chats/${c.id}/messages`, u, { message: 'Un proverbe ?', asynchrone: true });
  assert.equal(d.status, 202);
  const fin = await attendre(d.body.travail, u);
  assert.equal(fin.body.reponse, 'Mbolo !');
  assert.deepEqual((await call('GET', `/v1/ia/chats/${c.id}`, u)).body.messages.map((m: any) => m.content ?? m.contenu), ['Un proverbe ?', 'Mbolo !']);
  panne = true;
  const p = await call('POST', `/v1/ia/chats/${c.id}/messages`, u, { message: 'Encore ?', asynchrone: true });
  const ko = await attendre(p.body.travail, u);
  assert.equal(ko.status, 502); assert.match(ko.body.error, /ne répond pas/);
  assert.equal((await call('GET', `/v1/ia/chats/${c.id}`, u)).body.messages.length, 2, 'aucune bulle vide enregistrée');
  panne = false;
});

test('travaux : propres au compte, 401 sans jeton, deux en cours au plus, ancien mode direct conservé', async () => {
  const u = tok('attente3'), autre = tok('attente4'); await call('GET', '/v1/me', u); await call('GET', '/v1/me', autre);
  lenteur = 1500;
  const a1 = await call('POST', '/v1/ia/message', u, { message: 'Un', asynchrone: true });
  const a2 = await call('POST', '/v1/ia/message', u, { message: 'Deux', asynchrone: true });
  assert.equal((await call('POST', '/v1/ia/message', u, { message: 'Trois', asynchrone: true })).status, 429);
  assert.equal((await call('GET', `/v1/ia/travaux/${a1.body.travail}`, autre)).status, 404, 'travail d\'un autre compte');
  assert.equal((await call('GET', `/v1/ia/travaux/${a1.body.travail}`)).status, 401);
  assert.equal((await call('GET', '/v1/ia/travaux/abc', u)).status, 404);
  await attendre(a1.body.travail, u); await attendre(a2.body.travail, u);
  lenteur = 0;
  const direct = await call('POST', '/v1/ia/message', u, { message: 'Direct' });
  assert.equal(direct.status, 200); assert.equal(direct.body.reponse, 'Mbolo !');
});

test('indexation : sources myènè et documents travaillés d\'abord, puis ordre alphabétique', () => {
  const f = ['02_theses/a.pdf', '09_documents_pedagogiques/01_proverbes/proverbes.json', '01_sources_myene/x.docx', '05_egypte/b.pdf', '17_edition_DONDO_myene/c.md', '01_sources_myeneX/faux.txt'];
  assert.deepEqual(ordonnerParPriorite(f), ['09_documents_pedagogiques/01_proverbes/proverbes.json', '17_edition_DONDO_myene/c.md', '01_sources_myene/x.docx', '01_sources_myeneX/faux.txt', '02_theses/a.pdf', '05_egypte/b.pdf']);
  assert.deepEqual(ordonnerParPriorite(f, '05_egypte'), ['05_egypte/b.pdf', '01_sources_myene/x.docx', '01_sources_myeneX/faux.txt', '02_theses/a.pdf', '09_documents_pedagogiques/01_proverbes/proverbes.json', '17_edition_DONDO_myene/c.md']);
});

test('travail trop long : clos en 504, place libérée, étape visible pendant l\'attente', async () => {
  const u = tok('attente5'); await call('GET', '/v1/me', u);
  process.env.IA_DUREE_MAX_TRAVAIL_S = '1';
  lenteur = 2500;
  const a1 = await call('POST', '/v1/ia/message', u, { message: 'Un', asynchrone: true });
  const a2 = await call('POST', '/v1/ia/message', u, { message: 'Deux', asynchrone: true });
  await new Promise(ok => setTimeout(ok, 300));
  const enCours = await call('GET', `/v1/ia/travaux/${a1.body.travail}`, u);
  assert.equal(enCours.body.statut, 'en_cours'); assert.equal(enCours.body.etape, 'modèle', 'étape atteinte : le modèle');
  const fin = await attendre(a1.body.travail, u);
  assert.equal(fin.status, 504); assert.match(fin.body.error, /pas pu répondre à temps/);
  await attendre(a2.body.travail, u);
  delete process.env.IA_DUREE_MAX_TRAVAIL_S;
  lenteur = 0;
  assert.equal((await call('POST', '/v1/ia/message', u, { message: 'Trois', asynchrone: true })).status, 202, 'les deux places sont libérées');
  const diag = await call('GET', '/v1/admin/ia/diagnostic', u);
  assert.equal(diag.status, 403, 'diagnostic réservé aux administrateurs');
});
