// Bibliothèque servie par morceaux et lecture des réponses du modèle (14 nov. 2026).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import { lireReponseOpenAi } from '../src/ia.ts';

let db: Db, app: FastifyInstance;
const storage: MediaStorage = { presignPut: async () => '', presignGet: async p => `https://media.test/get/${p}`, remove: async () => {}, put: async () => {}, exists: async () => true, get: async () => null };
const verify: TokenVerifier = async token => userFromClaims(JSON.parse(Buffer.from(token, 'base64url').toString()));
const tok = (uid: string, o: { email?: string; verified?: boolean } = {}) => Buffer.from(JSON.stringify({
  iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: uid, email: o.email, email_verified: o.verified ?? false, firebase: { sign_in_provider: 'password' } })).toString('base64url');
const ADMIN = tok('capp', { email: 'andymigoumbi@gmail.com', verified: true });
async function call(method: string, url: string, token?: string, body?: unknown) {
  const res = await app.inject({ method: method as any, url, payload: body as any, headers: token ? { authorization: `Bearer ${token}` } : {} });
  let json: any = null; try { json = res.json(); } catch { json = res.body; }
  return { status: res.statusCode, body: json };
}
const importer = (collection: string, lignes: unknown[]) => call('POST', `/v1/admin/contenus/${collection}/import`, ADMIN, { lignes, mode: 'ajouter', partiel: true });

before(async () => {
  db = await createPgliteDb();
  await runMigrations(db);
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: false, rateLimitMax: 100000, sessionSecret: 'secret-de-test-0123456789abcdef' });
  // Données inventées pour le test (D5).
  const livres = Array.from({ length: 45 }, (_, i) => ({ id: `lv-essai-${i}`, titre: `Livre d'essai ${i}`, auteur: i % 2 ? 'Auteur Pair' : 'Écrivaine Impaire', categorie: i < 40 ? 'Romans' : 'Decrets', minutes: 3, publie: 'oui' }));
  livres.push({ id: 'lv-reserve', titre: 'Livre réservé', auteur: 'X', categorie: 'Romans', minutes: 1, publie: 'oui', niveau_acces: 'abonnement' } as any);
  livres.push({ id: 'lv-perso', titre: 'Livre du personnel', auteur: 'X', categorie: 'Romans', minutes: 1, publie: 'oui', niveau_acces: 'reserve' } as any);
  livres.push({ id: 'lv-vide', titre: 'Sans chapitre', auteur: 'X', categorie: 'Romans', minutes: 0, publie: 'oui' } as any);
  await importer('bibliotheque', livres);
  const rc = await importer('livre_chapitres', [
    { id: 'lv-essai-1-001', livre_id: 'lv-essai-1', titre: 'Un', texte: 'Il était une fois une pirogue sur la lagune.', ordre: 1, publie: 'oui' },
    { id: 'lv-essai-1-002', livre_id: 'lv-essai-1', titre: 'Deux', texte: 'La pirogue revint au village.', ordre: 2, publie: 'oui' },
    { id: 'lv-reserve-001', livre_id: 'lv-reserve', titre: 'Secret', texte: 'Texte réservé aux abonnés.', ordre: 1, publie: 'oui' },
    { id: 'lv-perso-001', livre_id: 'lv-perso', titre: 'Interne', texte: 'Texte du personnel.', ordre: 1, publie: 'oui' },
    ...Array.from({ length: 45 }, (_, i) => i).filter(i => i !== 1).map(i => ({ id: `lv-essai-${i}-001`, livre_id: `lv-essai-${i}`, titre: 'Seul', texte: 'Court.', ordre: 1, publie: 'oui' })),
  ]);
  assert.equal(rc.body.ecrit, 48);
});
after(async () => { await app.close(); await db.close(); });

test('liste paginée, recherche sans accents, rayon, livres sans chapitre exclus', async () => {
  const p0 = await call('GET', '/pub/bibliotheque?n=30');
  assert.equal(p0.status, 200); assert.equal(p0.body.total, 47, '45 + les deux marqués, pas le livre sans chapitre'); assert.equal(p0.body.livres.length, 30);
  assert.equal(p0.body.livres[0].fichier, undefined, 'champs techniques non envoyés');
  assert.equal((await call('GET', '/pub/bibliotheque?n=30&page=1')).body.livres.length, 17);
  assert.equal((await call('GET', '/pub/bibliotheque?q=ecrivaine%20impaire')).body.total, 23);
  assert.equal((await call('GET', '/pub/bibliotheque?rayon=Decrets')).body.total, 5);
  assert.deepEqual((await call('GET', '/pub/bibliotheque?ids=lv-essai-3,lv-essai-4')).body.livres.map((l: any) => l.id).sort(), ['lv-essai-3', 'lv-essai-4']);
  const r = await call('GET', '/pub/bibliotheque/rayons');
  assert.deepEqual(r.body.rayons[0], { rayon: 'Romans', n: 42 }); assert.equal(r.body.total, 47);
});

test('fiche sans texte, chapitre un par un ; bibliothèque gratuite (15 nov. 2026), sauf livre « reserve »', async () => {
  const f = await call('GET', '/pub/bibliotheque/lv-essai-1');
  assert.equal(f.status, 200); assert.deepEqual(f.body.chapitres.map((c: any) => [c.id, c.mots]), [['lv-essai-1-001', 7], ['lv-essai-1-002', 5]]);
  assert.equal(f.body.chapitres[0].texte, undefined);
  const c = await call('GET', '/pub/bibliotheque/lv-essai-1/chapitres/lv-essai-1-002');
  assert.equal(c.status, 200); assert.equal(c.body.chapitre.texte, 'La pirogue revint au village.');
  assert.equal((await call('GET', '/pub/bibliotheque/lv-essai-2/chapitres/lv-essai-1-002')).status, 404, 'chapitre d\'un autre livre');
  assert.equal((await call('GET', '/pub/bibliotheque/inconnu')).status, 404);
  assert.equal((await call('GET', '/pub/bibliotheque/a%20b')).status, 400);
  assert.equal((await call('GET', '/pub/bibliotheque/lv-reserve/chapitres/lv-reserve-001')).status, 200, 'gratuit, même marqué « abonnement », sans compte');
  assert.equal((await call('GET', '/v1/bibliotheque/lv-reserve/chapitres/lv-reserve-001')).status, 401, 'route /v1 sans jeton : compte exigé par la route elle-même');
  const u = tok('lecteur', { email: 'lecteur@x.com' }); await call('GET', '/v1/me', u);
  assert.equal((await call('GET', '/v1/bibliotheque/lv-reserve/chapitres/lv-reserve-001', u)).status, 200, 'sans forfait');
  assert.equal((await call('GET', '/pub/bibliotheque/lv-perso/chapitres/lv-perso-001')).status, 401, 'livre du personnel : sans compte');
  assert.equal((await call('GET', '/v1/bibliotheque/lv-perso/chapitres/lv-perso-001', u)).status, 403, 'livre du personnel : utilisateur');
  assert.equal((await call('GET', '/v1/bibliotheque/lv-perso/chapitres/lv-perso-001', ADMIN)).status, 200, 'personnel');
  assert.equal((await call('GET', '/pub/contenus/livre_chapitres')).status, 403, 'plus de lecture en bloc');
});

test('réponse du modèle : directe, en tableau (relais RunPod) ou sous « output »', () => {
  const corps = { choices: [{ message: { content: 'Mbolo !' }, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 2 } };
  for (const brut of [corps, [corps], { output: [corps] }, { output: corps }]) assert.equal(lireReponseOpenAi(brut).choices[0].message.content, 'Mbolo !');
  assert.deepEqual(lireReponseOpenAi(null), {});
});
