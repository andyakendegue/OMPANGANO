// Voix des mineurs : accord du parent ou représentant légal pour enregistrer et utiliser la voix, y compris pour entraîner
// les modèles (décision de Capp, 22 nov. 2026). Règle unique : packages/noyau/src/accordVoix.ts.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import { ageEnAnnees, estMineur, voixAutorisee, TEXTE_ACCORD_PARENTAL } from '../../../packages/noyau/src/accordVoix.ts';
import { validerInscription, profilDepuisInscription, type FormInscription } from '../../../packages/noyau/src/inscription.ts';

let db: Db, app: FastifyInstance;
const verify: TokenVerifier = async token => userFromClaims(JSON.parse(Buffer.from(token, 'base64url').toString()));
const tok = (uid: string) => Buffer.from(JSON.stringify({ iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: uid, email: `${uid}@x.com`, email_verified: true, firebase: { sign_in_provider: 'password' } })).toString('base64url');
const storage = { presignPut: async () => 'https://s3.test/put', presignGet: async () => '', remove: async () => {}, put: async () => {}, exists: async () => true } as unknown as MediaStorage;
async function call(method: string, url: string, token?: string, body?: unknown) {
  const res = await app.inject({ method: method as any, url, payload: body as any, headers: token ? { authorization: `Bearer ${token}` } : {} });
  let json: any = null; try { json = res.json(); } catch { json = res.body; }
  return { status: res.statusCode, body: json };
}
before(async () => {
  db = await createPgliteDb(); await runMigrations(db);
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: false, rateLimitMax: 100000, sessionSecret: 'secret-de-test-0123456789abcdef' } as any);
});
after(async () => { await app.close(); });

const AUJ = Date.parse('2026-11-22T12:00:00Z');
const base: FormInscription = { nomComplet: 'Enfant Test', contact: '+24100000000', dateNaissance: '2014-05-01', lieuNaissance: 'Mandji', tribu: 'Orungu', clanPaternel: 'A', clanMaternel: 'B', village: 'V', conditions: true, donnees: true, voix: true, image: false };

test('règle : âge, mineur (date inconnue = mineur), voix autorisée seulement avec l\'accord du parent nommé', () => {
  assert.equal(ageEnAnnees('2008-11-22', AUJ), 18); assert.equal(ageEnAnnees('2008-11-23', AUJ), 17); assert.equal(ageEnAnnees(''), null);
  assert.equal(estMineur('2008-11-23', AUJ), true); assert.equal(estMineur('1990-01-01', AUJ), false); assert.equal(estMineur(undefined), true);
  const ok = { termsAccepted: true, dataUsageAccepted: true };
  assert.equal(voixAutorisee({ ...ok, birthDate: '1990-01-01' }, AUJ), true, 'adulte');
  assert.equal(voixAutorisee({ ...ok, birthDate: '1990-01-01', consentVoiceUsage: false }, AUJ), false, 'adulte qui refuse');
  assert.equal(voixAutorisee({ ...ok, birthDate: '2014-05-01', legalGuardianName: 'Marie, mère' }, AUJ), false, 'mineur avec parent nommé mais sans accord');
  assert.equal(voixAutorisee({ ...ok, birthDate: '2014-05-01', parentalVoiceConsent: true }, AUJ), false, 'accord sans parent nommé');
  assert.equal(voixAutorisee({ ...ok, birthDate: '2014-05-01', parentalVoiceConsent: true, legalGuardianName: 'Marie, mère' }, AUJ), true);
  assert.equal(voixAutorisee({ ...ok }, AUJ), false, 'date inconnue : traité comme mineur');
  assert.match(TEXTE_ACCORD_PARENTAL, /entraîner ses modèles/); assert.match(TEXTE_ACCORD_PARENTAL, /retirer cet accord à tout moment/);
});

test('formulaire : date exigée pour la voix ; mineur → parent nommé et accord parental pour la voix ; profil enregistré', () => {
  assert.match(validerInscription({ ...base, dateNaissance: '' })!, /date de naissance/);
  assert.match(validerInscription({ ...base })!, /parent ou représentant légal sont obligatoires/);
  assert.match(validerInscription({ ...base, tuteur: 'Marie, mère' })!, /accord de son parent/);
  assert.equal(validerInscription({ ...base, tuteur: 'Marie, mère', accordParental: true }), null);
  assert.equal(validerInscription({ ...base, tuteur: 'Marie, mère', voix: false }), null, 'sans la voix, pas d\'accord parental à donner');
  assert.equal(validerInscription({ ...base, dateNaissance: '1990-01-01' }), null, 'adulte');
  const p = profilDepuisInscription({ ...base, tuteur: 'Marie, mère', accordParental: true }, new Date(AUJ));
  assert.equal(p.parentalVoiceConsent, true); assert.equal(p.parentalConsentAt, '2026-11-22T12:00:00.000Z'); assert.match(p.parentalConsentVersion!, /accord-parental-voix-v1/);
  assert.equal(profilDepuisInscription({ ...base, dateNaissance: '1990-01-01' }).parentalVoiceConsent, undefined);
});

test('serveur : enregistrement refusé pour un mineur sans accord parental, accepté avec l\'accord', async () => {
  const t = tok('mineur1');
  await call('GET', '/v1/me', t);
  await call('PATCH', '/v1/me', t, { displayName: 'M', birthDate: '2014-05-01', termsAccepted: true, dataUsageAccepted: true, consentVoiceUsage: true, legalGuardianName: 'Marie, mère' });
  const url = { path: 'recordings/mineur1/a.m4a', contentType: 'audio/mp4', size: 1000 };
  const refus = await call('POST', '/v1/media/upload-url', t, url);
  assert.equal(refus.status, 403); assert.match(refus.body.error ?? refus.body.message ?? JSON.stringify(refus.body), /accord de son parent/);
  assert.equal((await call('POST', '/v1/contributions', t, { audioStoragePath: 'recordings/mineur1/a.m4a', audioMimeType: 'audio/mp4' })).status, 403);
  assert.equal((await call('POST', '/v1/contributions', t, { comment: 'texte seul' })).status, 201, 'une contribution sans voix reste possible');
  await call('PATCH', '/v1/me', t, { parentalVoiceConsent: true });
  assert.equal((await call('POST', '/v1/media/upload-url', t, url)).status, 200);
  assert.equal((await call('POST', '/v1/contributions', t, { audioStoragePath: 'recordings/mineur1/a.m4a', audioMimeType: 'audio/mp4' })).status, 201);
});
