// Nkorouna (NKR) : achat en FCFA par Mobile Money, dépense, idempotence, solde jamais négatif, transferts fermés par défaut,
// chaîne d'empreintes, détection d'une retouche en base, racine de Merkle et preuve.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import { verifierPreuve, verifierRegistre, racineMerkle, preuveMerkle } from '../src/nkorounaRegistre.ts';

let db: Db, app: FastifyInstance;
const storage: MediaStorage = { presignPut: async () => '', presignGet: async p => p, remove: async () => {}, put: async () => {}, exists: async () => true, get: async () => null };
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
  const uid = 'nk' + ++n, token = tok(uid, { email: `${uid}@x.com` });
  await call('GET', '/v1/me', token);
  await call('PATCH', '/v1/me', token, { displayName: uid, birthDate: '1990-01-01' });
  return { uid, token };
}
async function produit(id: string, data: Record<string, unknown>) {
  await db.query(`INSERT INTO contenus (collection, id, data, publie) VALUES ('produits', $1, $2, true)`, [id, JSON.stringify({ titre: id, ...data })]);
}
/** Achète un pack par Mobile Money en mode simulation (code 0000). */
async function acheterPack(token: string, produitId: string) {
  const p = await call('POST', '/v1/paiements', token, { produitId, operateur: 'airtel', telephone: '+24106000000' });
  assert.equal(p.status, 201, JSON.stringify(p.body));
  assert.equal((await call('POST', `/v1/paiements/${p.body.id}/simuler`, token, { code: '0000' })).status, 200);
  return p.body.id as string;
}

before(async () => {
  db = await createPgliteDb();
  await runMigrations(db);
  Object.assign(process.env, { MOBILEMONEY_FOURNISSEUR: 'simulation', MODULES_ACTIFS: 'ompangano,onenji,azeva,ontci,nkala' });
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: false, rateLimitMax: 100000, sessionSecret: 'secret-de-test-0123456789abcdef' } as any);
  await produit('pack-500', { type: 'nkorouna', prix_fcfa: 1000, nkorouna: 500 });
  await produit('livre-conte', { type: 'achat', prix_nkr: 300, donne_acces: ['conte-pirogue'] });
  await produit('pack-triche', { type: 'nkorouna', prix_fcfa: 1000, nkorouna: 500, prix_nkr: 10 });
});
after(async () => { await app.close(); await db.close(); for (const k of ['MOBILEMONEY_FOURNISSEUR', 'MODULES_ACTIFS', 'NKOROUNA_TRANSFERTS']) delete process.env[k]; });

test('achat en FCFA : le pack crédite les jetons une seule fois', async () => {
  const u = await user();
  assert.equal((await call('GET', '/v1/nkorouna', u.token)).body.solde, 0);
  const id = await acheterPack(u.token, 'pack-500');
  const w = await call('GET', '/v1/nkorouna', u.token);
  assert.equal(w.body.solde, 500); assert.equal(w.body.symbole, 'NKR');
  assert.equal(w.body.mouvements[0].nature, 'achat'); assert.equal(w.body.mouvements[0].montant, 500);
  // Rejouer la confirmation ne recrédite pas
  assert.equal((await call('POST', `/v1/paiements/${id}/simuler`, u.token, { code: '0000' })).status, 200);
  assert.equal((await call('GET', '/v1/nkorouna', u.token)).body.solde, 500);
});

test('dépense : débite, accorde le produit, idempotente, refuse un solde insuffisant', async () => {
  const u = await user();
  await acheterPack(u.token, 'pack-500');
  const d = await call('POST', '/v1/nkorouna/depenser', u.token, { produitId: 'livre-conte', cle: 'achat-livre-0001' });
  assert.equal(d.status, 200, JSON.stringify(d.body)); assert.equal(d.body.solde, 200);
  const droits = await db.query<any>(`SELECT * FROM droits WHERE user_id = $1 AND contenu_id = 'conte-pirogue'`, [u.uid]);
  assert.equal(droits.length, 1); assert.equal(droits[0].source, 'nkorouna');
  const bis = await call('POST', '/v1/nkorouna/depenser', u.token, { produitId: 'livre-conte', cle: 'achat-livre-0001' });
  assert.equal(bis.body.deja, true); assert.equal(bis.body.solde, 200, 'double envoi : un seul débit');
  assert.equal((await db.query(`SELECT * FROM droits WHERE user_id = $1`, [u.uid])).length, 1);
  const trop = await call('POST', '/v1/nkorouna/depenser', u.token, { produitId: 'livre-conte', cle: 'achat-livre-0002' });
  assert.equal(trop.status, 402); assert.equal((await call('GET', '/v1/nkorouna', u.token)).body.solde, 200);
  assert.equal((await call('POST', '/v1/nkorouna/depenser', u.token, { produitId: 'pack-triche', cle: 'triche-00001' })).status, 400, 'un pack ne s\'achète pas en NKR');
});

test('transferts fermés par défaut, plafonnés une fois ouverts', async () => {
  const a = await user(), b = await user();
  await acheterPack(a.token, 'pack-500');
  assert.equal((await call('POST', '/v1/nkorouna/transferer', a.token, { vers: b.uid, montant: 10, cle: 'envoi-000001' })).status, 403);
  process.env.NKOROUNA_TRANSFERTS = 'oui'; process.env.NKOROUNA_TRANSFERT_MAX_JOUR = '100';
  try {
    const t = await call('POST', '/v1/nkorouna/transferer', a.token, { vers: b.uid, montant: 60, cle: 'envoi-000002' });
    assert.equal(t.status, 200, JSON.stringify(t.body)); assert.equal(t.body.solde, 440);
    assert.equal((await call('GET', '/v1/nkorouna', b.token)).body.solde, 60);
    assert.equal((await call('POST', '/v1/nkorouna/transferer', a.token, { vers: b.uid, montant: 60, cle: 'envoi-000003' })).status, 429);
  } finally { delete process.env.NKOROUNA_TRANSFERTS; delete process.env.NKOROUNA_TRANSFERT_MAX_JOUR; }
});

test('administration : bonus, annulation, gel ; réservé aux administrateurs', async () => {
  const u = await user();
  assert.equal((await call('POST', '/v1/admin/nkorouna/ajuster', u.token, { userId: u.uid, montant: 50, motif: 'test', cle: 'bonus-000001' })).status, 403);
  const b = await call('POST', '/v1/admin/nkorouna/ajuster', ADMIN, { userId: u.uid, montant: 50, motif: 'Concours de contes', cle: 'bonus-000001' });
  assert.equal(b.status, 200, JSON.stringify(b.body)); assert.equal(b.body.solde, 50);
  await call('POST', '/v1/admin/nkorouna/geler', ADMIN, { userId: u.uid, gele: true });
  await produit('petit', { type: 'achat', prix_nkr: 5 });
  assert.equal((await call('POST', '/v1/nkorouna/depenser', u.token, { produitId: 'petit', cle: 'gele-000001' })).status, 423);
  await call('POST', '/v1/admin/nkorouna/geler', ADMIN, { userId: u.uid, gele: false });
  const an = await call('POST', `/v1/admin/nkorouna/annuler/${b.body.mouvement}`, ADMIN, { motif: 'Erreur de saisie' });
  assert.equal(an.status, 200, JSON.stringify(an.body));
  assert.equal((await call('GET', '/v1/nkorouna', u.token)).body.solde, 0);
  assert.equal((await call('POST', `/v1/admin/nkorouna/annuler/${b.body.mouvement}`, ADMIN, { motif: 'Encore' })).body.deja, true, 'une seule annulation');
});

test('registre : chaîne valide, somme nulle, ancrage et preuve de Merkle ; retouche en base interdite', async () => {
  const v = await verifierRegistre(db);
  assert.ok(v.ok, v.erreurs.join('\n')); assert.ok(v.mouvements >= 6);
  const anc = await call('POST', '/v1/admin/nkorouna/ancrer', ADMIN);
  assert.equal(anc.status, 200); assert.equal(anc.body.de, 1); assert.equal(anc.body.jusqua, v.mouvements); assert.equal(anc.body.reseau, 'aucun');
  assert.equal((await call('POST', '/v1/admin/nkorouna/ancrer', ADMIN)).body.rien, true);
  const pub = await call('GET', '/pub/nkorouna');
  assert.equal(pub.body.ancrages[0].racine, anc.body.racine);
  assert.equal(pub.body.enCirculation, pub.body.emisContreFcfa + pub.body.offerts - pub.body.depenses);
  const m = (await db.query<any>(`SELECT id FROM nkr_mouvements WHERE rang = 3`))[0];
  const p = await call('GET', `/pub/nkorouna/preuve/${m.id}`);
  assert.ok(verifierPreuve(p.body.hash, p.body.preuve, p.body.ancrage.racine), 'la preuve redonne la racine publiée');
  await assert.rejects(db.query(`UPDATE nkr_mouvements SET montant = 999999 WHERE rang = 1`), /contre-écriture/);
  await assert.rejects(db.query(`DELETE FROM nkr_mouvements WHERE rang = 1`), /contre-écriture/);
  // Un solde trafiqué directement est repéré
  await db.query(`UPDATE nkr_comptes SET solde = solde + 1000 WHERE id = 'u:nk1'`);
  const casse = await verifierRegistre(db);
  assert.equal(casse.ok, false); assert.ok(casse.erreurs.some(e => e.includes('u:nk1')));
  await db.query(`UPDATE nkr_comptes SET solde = solde - 1000 WHERE id = 'u:nk1'`);
});

test('Merkle : preuves valides pour chaque feuille, nombre impair compris', () => {
  for (const taille of [1, 2, 3, 5, 8, 13]) {
    const f = Array.from({ length: taille }, (_, i) => String(i).padStart(64, 'a'));
    const r = racineMerkle(f);
    for (let i = 0; i < taille; i++) assert.ok(verifierPreuve(f[i], preuveMerkle(f, i), r), `taille ${taille}, feuille ${i}`);
    assert.equal(verifierPreuve('f'.repeat(64), preuveMerkle(f, 0), r), taille === 0);
  }
});
