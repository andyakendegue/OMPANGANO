// L'IA demande un forfait ; sans forfait, quelques questions gratuites par semaine (décision de Capp, 15 nov. 2026).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import type { FournisseurIa } from '../src/ia.ts';
import { droitIa, messageForfaitIa, regleSansFormule, QUESTIONS_IA_GRATUITES_SEMAINE } from '../../../packages/noyau/src/formules.ts';

let db: Db, app: FastifyInstance;
const ia: FournisseurIa = { nom: 'test', repondre: async () => ({ texte: 'Mbolo.', usage: { entree: 100, sortie: 20 }, modele: 'test', simule: false }) };
const storage = { presignPut: async () => '', presignGet: async () => '', remove: async () => {}, put: async () => {}, exists: async () => false } as unknown as MediaStorage;
const verify: TokenVerifier = async token => userFromClaims(JSON.parse(Buffer.from(token, 'base64url').toString()));
const tok = (uid: string, o: { email?: string; verified?: boolean } = {}) => Buffer.from(JSON.stringify({
  iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: uid, email: o.email, email_verified: o.verified ?? false, firebase: { sign_in_provider: 'password' } })).toString('base64url');
const ADMIN = tok('capp', { email: 'andymigoumbi@gmail.com', verified: true });
async function call(method: string, url: string, token?: string, body?: unknown) {
  const res = await app.inject({ method: method as any, url, payload: body as any, headers: token ? { authorization: `Bearer ${token}` } : {} });
  let json: any = null; try { json = res.json(); } catch { json = res.body; }
  return { status: res.statusCode, body: json };
}
let n = 0;
async function user() {
  const uid = 'f' + ++n, token = tok(uid, { email: `${uid}@x.com` });
  await call('GET', '/v1/me', token);
  await call('PATCH', '/v1/me', token, { displayName: uid, birthDate: '1990-01-01' });
  return { uid, token };
}
const regler = (cle: string, valeur: unknown) => call('PUT', `/v1/admin/parametres/${cle}`, ADMIN, { valeur });
const question = (token: string, o: Record<string, unknown> = {}) => call('POST', '/v1/ia/message', token, { message: 'Comment dit-on bonjour ?', ...o });

before(async () => {
  db = await createPgliteDb();
  await runMigrations(db);
  Object.assign(process.env, { MODULES_ACTIFS: 'ompangano,onenji,azeva,ontci,nkala', FONCTIONS_ACTIVES: 'assistantIA' });
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: false, rateLimitMax: 100000, ia, sessionSecret: 'secret-de-test-0123456789abcdef' } as any);
  await regler('ia_quotas', { parJour: 10_000_000, parMois: 100_000_000, parConversation: 100_000 });
  await call('POST', '/v1/admin/contenus/produits/import', ADMIN, { lignes: [{ id: 'abo', titre: 'Forfait', type: 'abonnement', prix_fcfa: 1000, periode: 'mois', publie: 'oui' }], mode: 'ajouter', partiel: true });
});
after(async () => { await app.close(); await db.close(); delete process.env.MODULES_ACTIFS; delete process.env.FONCTIONS_ACTIVES; });

test('règle pure : forfait et personnel sans limite ; sinon N questions par semaine', () => {
  assert.deepEqual(droitIa({ abonne: true, questionsSemaine: 999 }), { ok: true, forfait: true, restantes: null });
  assert.equal(droitIa({ abonne: false, personnel: true, questionsSemaine: 999 }).ok, true);
  assert.deepEqual(droitIa({ abonne: false, questionsSemaine: 0 }), { ok: true, forfait: false, restantes: QUESTIONS_IA_GRATUITES_SEMAINE - 1 });
  assert.deepEqual(droitIa({ abonne: false, questionsSemaine: QUESTIONS_IA_GRATUITES_SEMAINE }), { ok: false, forfait: false, restantes: 0, gratuitesSemaine: QUESTIONS_IA_GRATUITES_SEMAINE });
  assert.equal(droitIa({ abonne: false, questionsSemaine: 0, gratuitesSemaine: 0 }).ok, false, 'les administrateurs peuvent couper les questions gratuites');
  assert.match(messageForfaitIa(5), /5 questions de la semaine/);
  assert.deepEqual(regleSansFormule({ rang_min: 3, plans: ['complet'] } as any), { rang_min: 3 }, 'le rang reste, la formule part');
  assert.deepEqual(regleSansFormule({ plans: ['complet'] } as any), {});
});

test('sans forfait : les questions gratuites de la semaine, puis 402 « forfait » ; le forfait rouvre', async () => {
  await regler('ia_quotas', { parJour: 10_000_000, parMois: 100_000_000, parConversation: 100_000, questionsGratuitesSemaine: 3 });
  const u = await user();
  assert.equal((await call('GET', '/v1/ia/usage', u.token)).body.gratuitesRestantes, 3);
  for (let i = 0; i < 3; i++) {
    const r = await question(u.token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.quota.gratuitesRestantes, 2 - i);
  }
  const refus = await question(u.token);
  assert.equal(refus.status, 402);
  assert.equal(refus.body.code, 'forfait'); assert.equal(refus.body.gratuitesSemaine, 3);
  assert.match(refus.body.error, /formule/);
  // même refus, immédiat, en mode différé (pas de travail lancé) et dans les chats
  const diff = await question(u.token, { asynchrone: true });
  assert.equal(diff.status, 402); assert.equal(diff.body.code, 'forfait');
  const chat = (await call('POST', '/v1/ia/chats', u.token)).body.chat;
  const rc = await call('POST', `/v1/ia/chats/${chat.id}/messages`, u.token, { message: 'Et merci ?' });
  assert.equal(rc.status, 402); assert.equal(rc.body.code, 'forfait');
  assert.equal((await call('GET', '/v1/ia/usage', u.token)).body.gratuitesRestantes, 0);
  // le forfait ouvre l'IA sans compter les questions
  await call('POST', '/v1/admin/droits', ADMIN, { userId: u.uid, type: 'abonnement', produitId: 'abo', jours: 30 });
  const ok = await question(u.token);
  assert.equal(ok.status, 200); assert.equal(ok.body.quota.gratuitesRestantes, null);
  assert.equal((await call('POST', `/v1/ia/chats/${chat.id}/messages`, u.token, { message: 'Et merci ?' })).status, 200);
  assert.equal((await call('GET', '/v1/ia/usage', u.token)).body.forfait, true);
});

test('personnel jamais limité ; les questions de la semaine passée ne comptent plus', async () => {
  await regler('ia_quotas', { parJour: 10_000_000, parMois: 100_000_000, parConversation: 100_000, questionsGratuitesSemaine: 1 });
  for (let i = 0; i < 3; i++) assert.equal((await question(ADMIN)).status, 200);
  const u = await user();
  assert.equal((await question(u.token)).status, 200);
  assert.equal((await question(u.token)).status, 402);
  await db.query(`UPDATE ia_usage SET at = date_trunc('week', clock_timestamp()) - interval '1 day' WHERE user_id = $1`, [u.uid]);
  assert.equal((await question(u.token)).status, 200, 'nouvelle semaine : nouvelles questions gratuites');
});
