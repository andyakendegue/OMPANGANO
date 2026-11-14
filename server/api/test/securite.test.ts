// Contrôles de sécurité (ISO 27001, voir SECURITE_ISO27001.md) : en-têtes, révocation des sessions SMS,
// révocation non annulable par le client, journal des actions d'administration, routes publiques limitées.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import { creerSession } from '../src/sms.ts';

const SECRET = 'secret-de-test-0123456789abcdef';
let db: Db, app: FastifyInstance;
const storage: MediaStorage = { presignPut: async () => '', presignGet: async p => `https://media.test/${p}`, remove: async () => {}, put: async () => {}, exists: async () => true, get: async () => null };
const verify: TokenVerifier = async token => userFromClaims(JSON.parse(Buffer.from(token, 'base64url').toString()));
const tok = (uid: string, email = `${uid}@x.com`, verified = false) => Buffer.from(JSON.stringify({ iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: uid, email, email_verified: verified, firebase: { sign_in_provider: 'google.com' } })).toString('base64url');
const SUPER = tok('super', 'andymigoumbi@gmail.com', true);
async function call(method: string, url: string, token?: string, body?: unknown) {
  const res = await app.inject({ method: method as any, url, payload: body as any, headers: token ? { authorization: `Bearer ${token}` } : {} });
  let json: any = null; try { json = res.json(); } catch { json = res.body; }
  return { status: res.statusCode, body: json, headers: res.headers };
}

before(async () => {
  db = await createPgliteDb(); await runMigrations(db);
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: false, rateLimitMax: 100000, sessionSecret: SECRET });
});
after(async () => { await app.close(); await db.close(); });

test('sécurité : en-têtes sur toutes les réponses, pas de cache pour les données des comptes', async () => {
  const r = await call('GET', '/v1/me', tok('alice'));
  assert.equal(r.status, 200);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['x-frame-options'], 'DENY');
  assert.equal(r.headers['referrer-policy'], 'no-referrer');
  assert.match(String(r.headers['strict-transport-security']), /max-age=\d+/);
  assert.equal(r.headers['cache-control'], 'no-store');
  const pub = await call('GET', '/health');
  assert.equal(pub.headers['x-content-type-options'], 'nosniff');
});

test('sécurité : une session SMS révoquée est refusée, une nouvelle session fonctionne', async () => {
  const uid = 'tel_24106000001';
  const ancien = await creerSession(SECRET, { uid, telephone: '+24106000001' });
  assert.equal((await call('GET', '/v1/me', ancien)).status, 200);
  // Le client ne peut pas poser ni effacer la date de révocation lui-même
  await call('PATCH', '/v1/me', ancien, { sessionsRevoqueesAvant: null, displayName: 'Test' });
  assert.equal((await call('POST', '/v1/me/sessions/revoquer', ancien)).status, 200);
  await new Promise(r => setTimeout(r, 1100)); // les dates d'émission sont à la seconde
  assert.equal((await call('GET', '/v1/me', ancien)).status, 401, 'ancien jeton refusé');
  const nouveau = await creerSession(SECRET, { uid, telephone: '+24106000001' });
  assert.equal((await call('GET', '/v1/me', nouveau)).status, 200, 'nouveau jeton accepté');
  const patch = await call('PATCH', '/v1/me', nouveau, { sessionsRevoqueesAvant: '2000-01-01T00:00:00.000Z' });
  assert.equal(patch.status, 200);
  assert.equal((await call('GET', '/v1/me', ancien)).status, 401, 'la révocation ne se défait pas par PATCH /v1/me');
});

test('sécurité : session SMS d\'un compte supprimé refusée', async () => {
  const uid = 'tel_24106000002';
  const j = await creerSession(SECRET, { uid, telephone: '+24106000002' });
  assert.equal((await call('GET', '/v1/me', j)).status, 200);
  await db.query(`UPDATE users SET deleted_at = clock_timestamp() WHERE id = $1`, [uid]);
  assert.equal((await call('GET', '/v1/me', j)).status, 401);
});

test('sécurité : changement de rôle et suppression inscrits au journal d\'administration', async () => {
  await call('GET', '/v1/me', SUPER);
  await call('GET', '/v1/me', tok('bob'));
  assert.equal((await call('PATCH', '/v1/users/bob', tok('bob'), { role: 'admin' })).status, 403, 'un utilisateur ne se promeut pas');
  assert.equal((await call('PATCH', '/v1/users/bob', SUPER, { role: 'validator' })).status, 200);
  const j = await db.query<any>(`SELECT par, action, cible, detail FROM journal_admin WHERE action = 'utilisateur_modifie' AND cible = 'bob'`);
  assert.equal(j.length, 1);
  assert.equal(j[0].par, 'super');
  const d = typeof j[0].detail === 'string' ? JSON.parse(j[0].detail) : j[0].detail;
  assert.deepEqual(d.role, { avant: 'user', apres: 'validator' });
  assert.equal((await call('POST', '/v1/admin/users/bob/sessions/revoquer', tok('bob'))).status, 403);
  assert.equal((await call('POST', '/v1/admin/users/bob/sessions/revoquer', SUPER)).status, 200);
});

test('sécurité : les routes publiques sont soumises à la limite de débit', async () => {
  const petit = await buildApp({ db, verify, storage, corsOrigins: [], logger: false, rateLimitMax: 3, sessionSecret: SECRET });
  try {
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await petit.inject({ method: 'GET', url: '/pub/modules' })).statusCode);
    assert.ok(codes.includes(429), `codes reçus : ${codes.join(',')}`);
    assert.equal((await petit.inject({ method: 'GET', url: '/health' })).statusCode, 200, 'la sonde de santé n\'est jamais limitée');
  } finally { await petit.close(); }
});

// ------------------------------------------------------------------ données personnelles (P1)
import { purgerDonnees, empreinteCompte } from '../src/donnees.ts';

test('données : export complet du compte, limité à 3 par heure', async () => {
  const t = tok('carla');
  await call('GET', '/v1/me', t);
  await db.query(`INSERT INTO progression (user_id, data) VALUES ('carla', '{"points":5}')`);
  const e = await call('GET', '/v1/me/donnees', t);
  assert.equal(e.status, 200);
  assert.equal(e.body.compte, 'carla');
  assert.equal(e.body.profil.id, 'carla');
  assert.equal(e.body.progression.length, 1);
  assert.match(String(e.headers['content-disposition']), /attachment/);
  await call('GET', '/v1/me/donnees', t); await call('GET', '/v1/me/donnees', t);
  assert.equal((await call('GET', '/v1/me/donnees', t)).status, 429);
  assert.equal((await call('GET', '/v1/me/donnees')).status, 401);
});

test('données : suppression du compte (confirmation, voix effacées, textes anonymisés, jetons refusés)', async () => {
  const uid = 'dede';
  const auth = (iat: number) => Buffer.from(JSON.stringify({ iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: uid, email: 'dede@x.com', email_verified: true, auth_time: iat, firebase: { sign_in_provider: 'google.com' } })).toString('base64url');
  const t = auth(Math.floor(Date.now() / 1000) - 60);
  await call('GET', '/v1/me', t);
  await db.query(`INSERT INTO contributions (id, item_id, user_id, status, audio_storage_path, data) VALUES ('c-voix','i1',$1,'approved','audio/dede.m4a','{"userDisplayName":"Dédé","userTribe":"orungu"}'), ('c-texte','i2',$1,'approved',NULL,'{"userDisplayName":"Dédé"}')`, [uid]);
  await db.query(`INSERT INTO progression (user_id, data) VALUES ($1, '{}')`, [uid]);
  await db.query(`INSERT INTO visit_sessions (id, visitor_id, ip, user_id) VALUES ('sess-dede-1','vis-dede-1','1.2.3.4',$1)`, [uid]);
  assert.equal((await call('DELETE', '/v1/me', t, {})).status, 400, 'confirmation exigée');
  const r = await call('DELETE', '/v1/me', t, { confirmation: 'SUPPRIMER' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await db.query(`SELECT 1 FROM users WHERE id = $1`, [uid])).length, 0, 'profil effacé');
  assert.equal((await db.query(`SELECT 1 FROM progression WHERE user_id = $1`, [uid])).length, 0);
  const voix = (await db.query<any>(`SELECT user_id, audio_storage_path, deleted_at FROM contributions WHERE id = 'c-voix'`))[0];
  assert.equal(voix.audio_storage_path, null); assert.ok(voix.deleted_at); assert.equal(voix.user_id, 'anonyme');
  const texte = (await db.query<any>(`SELECT user_id, deleted_at, data FROM contributions WHERE id = 'c-texte'`))[0];
  assert.equal(texte.user_id, 'anonyme'); assert.equal(texte.deleted_at, null); assert.equal(texte.data.userDisplayName, 'Anonyme');
  assert.equal((await db.query<any>(`SELECT user_id FROM visit_sessions WHERE id = 'sess-dede-1'`))[0].user_id, null);
  assert.equal((await db.query(`SELECT 1 FROM comptes_supprimes WHERE empreinte = $1`, [empreinteCompte(uid)])).length, 1);
  assert.equal((await call('GET', '/v1/me', t)).status, 401, 'ancien jeton refusé : pas de recréation du compte');
  await new Promise(res => setTimeout(res, 1100));
  assert.equal((await call('GET', '/v1/me', auth(Math.floor(Date.now() / 1000)))).status, 200, 'nouvelle inscription possible');
});

test('données : le super-administrateur ne se supprime pas depuis l\'app', async () => {
  assert.equal((await call('DELETE', '/v1/me', SUPER, { confirmation: 'SUPPRIMER' })).status, 400);
});

test('données : purge selon les durées de conservation', async () => {
  await db.query(`INSERT INTO visit_sessions (id, visitor_id, ip, started_at) VALUES ('vieille-ip','v1','5.6.7.8', clock_timestamp() - interval '40 days'), ('tres-vieille','v2','5.6.7.9', clock_timestamp() - interval '500 days'), ('recente','v3','5.6.7.10', clock_timestamp())`);
  await db.query(`INSERT INTO sms_essais (genre, cle, at) VALUES ('envoi','x', clock_timestamp() - interval '45 days')`);
  const d = await purgerDonnees(db);
  assert.ok(d.ip_visites >= 1 && d.visites >= 1 && d.essais_sms >= 1, JSON.stringify(d));
  const v = await db.query<any>(`SELECT id, ip FROM visit_sessions WHERE id IN ('vieille-ip','tres-vieille','recente') ORDER BY id`);
  assert.deepEqual(v.map(x => [x.id, x.ip]), [['recente', '5.6.7.10'], ['vieille-ip', null]]);
});

test('admins par SMS : droits seulement pour une connexion de moins de 12 h', async () => {
  const { SignJWT } = await import('jose');
  const uid = 'tel_24106000099';
  const jeton = (iat: number) => new SignJWT({ tel: '+24106000099' }).setProtectedHeader({ alg: 'HS256' }).setSubject(uid).setIssuer('nkala-sms').setIssuedAt(iat).setExpirationTime(iat + 30 * 86400).sign(new TextEncoder().encode(SECRET));
  const maintenant = Math.floor(Date.now() / 1000);
  await call('GET', '/v1/me', await jeton(maintenant));
  await db.query(`INSERT INTO admins (id, data) VALUES ($1, '{"role":"admin"}') ON CONFLICT (id) DO NOTHING`, [uid]);
  assert.equal((await call('GET', '/v1/admin/supervision', await jeton(maintenant - 60))).status, 200, 'connexion récente : admin');
  assert.equal((await call('GET', '/v1/admin/supervision', await jeton(maintenant - 13 * 3600))).status, 403, 'connexion ancienne : plus admin');
});
