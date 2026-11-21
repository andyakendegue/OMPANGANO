// Annonces de tous types (lot L1, 18/11/2026) : fiche du catalogue validée par le noyau et refaite par le serveur, quota
// (1 gratuite par mois puis crédit payé), filtres du catalogue, recherche, repositionner, alertes de nouvelles annonces.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import { CATALOGUE_ANNONCES, completudeAnnonce, validerFicheAnnonce, type FicheAnnonce } from '../../../packages/noyau/src/annonces.ts';
import { correspond } from '../src/annoncesGeneriques.ts';

const LBV = { lat: 0.4162, lng: 9.4673 };
const voiture = (uid: string, o: Partial<FicheAnnonce> = {}): FicheAnnonce => ({
  version: 1, categorie: 'auto', sousCategorie: 'voiture', transaction: 'vente', brouillonId: 'brouillonA1', position: LBV, quartier: 'Nzeng-Ayong',
  champs: { marque: 'toyota', modele: 'RAV4', annee: 2015, kilometrage: 120000, carburant: 'diesel', boite: 'automatique', dedouane: true, options: ['clim', 'gps'], etat: 'bon' },
  medias: [{ id: 'photoauto1', type: 'photo', chemin: `annonces/${uid}/brouillonA1/p1.jpg`, ordre: 0, octets: 200000 }],
  ...o,
});

test('noyau : fiche automobile valide, champs hors sous-catégorie ignorés, refus', () => {
  const v = validerFicheAnnonce({ ...voiture('u1'), champs: { ...voiture('u1').champs, reference: 'X12' } }, 'u1');
  assert.ok(v.ok, JSON.stringify(!v.ok && v.erreurs));
  assert.equal(v.fiche.champs.reference, undefined, 'la référence ne vaut que pour les pièces');
  assert.deepEqual(v.fiche.champs.options, ['clim', 'gps']);
  const refus = (f: unknown, motif: RegExp) => { const r = validerFicheAnnonce(f, 'u1'); assert.equal(r.ok, false); assert.match((r as any).erreurs.join(' '), motif); };
  refus({ ...voiture('u1'), categorie: 'fusees' }, /Catégorie inconnue/);
  refus({ ...voiture('u1'), sousCategorie: 'avion' }, /sous-catégorie/);
  refus({ ...voiture('u1'), champs: { carburant: 'charbon' } }, /Carburant/);
  refus({ ...voiture('u1'), champs: { annee: 1800 } }, /Année/);
  refus({ ...voiture('u1'), medias: [] }, /photo est obligatoire/);
  refus({ ...voiture('u1'), medias: [{ ...voiture('u1').medias[0], chemin: 'annonces/u2/brouillonA1/p.jpg' }] }, /chemin refusé/);
  // Emploi : photo facultative, contrat obligatoire
  const emploi = { version: 1, categorie: 'emploi', sousCategorie: 'commerce', transaction: 'offre', brouillonId: 'brouillonE1', position: LBV, champs: {}, medias: [] };
  refus(emploi, /Type de contrat : obligatoire/);
  assert.ok(validerFicheAnnonce({ ...emploi, champs: { contrat: 'cdi' } }, 'u1').ok);
  assert.ok(completudeAnnonce(voiture('u1'), { titre: 'Toyota RAV4 2015', description: 'x'.repeat(90), prix: 9_500_000, telephone: '+24106000000' }) >= 75);
});

test('noyau : catalogue cohérent (ids uniques, options, sous-catégories citées)', () => {
  for (const c of CATALOGUE_ANNONCES) {
    const ids = c.champs.map(x => x.id);
    assert.equal(new Set(ids).size, ids.length, c.id);
    for (const ch of c.champs) {
      if (ch.type === 'choix' || ch.type === 'multi') assert.ok(ch.options?.length, `${c.id}.${ch.id}`);
      for (const s of ch.pour ?? []) assert.ok(c.sousCategories.some(x => x.id === s), `${c.id}.${ch.id} → ${s}`);
    }
  }
});

test('alertes : correspondance (catégorie, sous-catégorie, prix, rayon)', () => {
  const data = { categorie_id: 'auto', titre: 'Toyota RAV4', prix: 9_500_000, fiche: { sousCategorie: 'voiture', transaction: 'vente', quartier: 'Nzeng-Ayong' } };
  assert.equal(correspond({ categorie: 'auto', sc: 'voiture', prix_max: 10_000_000 }, data, LBV), true);
  assert.equal(correspond({ categorie: 'auto', sc: 'moto' }, data, LBV), false);
  assert.equal(correspond({ prix_max: 5_000_000 }, data, LBV), false);
  assert.equal(correspond({ lat: -0.72, lng: 8.78, rayon_km: 5 }, data, LBV), false, 'Port-Gentil trop loin');
  assert.equal(correspond({ q: 'rav4' }, data, LBV), true);
});

// ------------------------------------------------------------------ API
let db: Db, app: FastifyInstance;
const storage: MediaStorage = { presignPut: async p => `https://media.test/put/${p}`, presignGet: async p => `https://media.test/get/${p}`, remove: async () => {}, put: async () => {}, exists: async () => true };
const verify: TokenVerifier = async token => userFromClaims(JSON.parse(Buffer.from(token, 'base64url').toString()));
const tok = (uid: string, o: { email?: string; verified?: boolean } = {}) => Buffer.from(JSON.stringify({
  iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: uid, email: o.email, email_verified: o.verified ?? false, firebase: { sign_in_provider: 'password' } })).toString('base64url');
const ADMIN = tok('capp', { email: 'andymigoumbi@gmail.com', verified: true });
async function call(method: string, url: string, token?: string, body?: unknown) {
  const res = await app.inject({ method: method as any, url, payload: body as any, headers: token ? { authorization: `Bearer ${token}` } : {} });
  let json: any = null; try { json = res.json(); } catch { json = res.body; }
  return { status: res.statusCode, body: json };
}
async function user(uid: string) { const t = tok(uid, { email: `${uid}@x.com` }); await call('GET', '/v1/me', t); await call('PATCH', '/v1/me', t, { displayName: uid, birthDate: '1990-01-01' }); return t; }
const base = { titre: 'Toyota RAV4 2015 diesel', description: 'Très bon état, entretien suivi.', prix: 9_500_000, ville: 'Libreville', telephone: '+24106000001', categorie_id: 'auto' };

before(async () => {
  db = await createPgliteDb();
  await runMigrations(db);
  Object.assign(process.env, { MODULES_ACTIFS: 'ompangano,onenji,azeva,ontci,nkala', PUSH_FOURNISSEUR: 'simulation' });
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: !!process.env.DEBUG_TESTS, rateLimitMax: 100000, sessionSecret: 'secret-de-test-0123456789abcdef' });
});
after(async () => { await app.close(); await db.close(); delete process.env.MODULES_ACTIFS; delete process.env.PUSH_FOURNISSEUR; });

test('API : refus sans jeton et réglage réservé aux administrateurs', async () => {
  assert.equal((await call('GET', '/v1/annonces/quota')).status, 401);
  assert.equal((await call('POST', '/v1/annonces/alertes', undefined, { filtres: { categorie: 'auto' } })).status, 401);
  assert.equal((await call('POST', '/v1/utilisateur/annonces/x/repositionner')).status, 401);
  assert.equal((await call('PUT', '/v1/admin/parametres/annonces', await user('n1'), { valeur: { gratuites_mois: 9 } })).status, 403);
});

test('API : 1 annonce gratuite par mois, puis crédit payé (500 F)', async () => {
  const t = await user('q1');
  const qa = await call('GET', '/v1/annonces/quota', t);
  assert.deepEqual([qa.body.gratuites_mois, qa.body.utilisees, qa.body.credits, qa.body.prix_fcfa], [1, 0, 0, 500]);
  assert.equal((await call('POST', '/v1/utilisateur/annonces', t, { ...base, fiche: voiture('q1') })).status, 201);
  const refus = await call('POST', '/v1/utilisateur/annonces', t, { ...base, titre: 'Deuxième', fiche: voiture('q1') });
  assert.equal(refus.status, 402); assert.equal(refus.body.code, 'quota'); assert.equal(refus.body.quota.prix_fcfa, 500);
  // Crédit acheté (le produit « annonce-supplementaire » donne un crédit) puis consommé
  await db.query(`INSERT INTO annonces_credits (user_id, source, reference) VALUES ('q1', 'test', 'r1')`);
  const payee = await call('POST', '/v1/utilisateur/annonces', t, { ...base, titre: 'Deuxième', fiche: voiture('q1') });
  assert.equal(payee.status, 201, JSON.stringify(payee.body)); assert.equal(payee.body.payee_credit, true);
  assert.equal((await call('GET', '/v1/annonces/quota', t)).body.credits, 0);
  assert.equal((await call('POST', '/v1/utilisateur/annonces', t, { ...base, titre: 'Troisième', fiche: voiture('q1') })).status, 402);
  // Fiche invalide : refusée sans consommer le quota d'un autre
  assert.equal((await call('POST', '/v1/utilisateur/annonces', await user('q2'), { ...base, fiche: { ...voiture('q2'), champs: { carburant: 'charbon' } } })).status, 400);
  assert.equal((await call('POST', '/v1/utilisateur/annonces', await user('q3'), { ...base, categorie_id: 'equipement', fiche: voiture('q3') })).status, 400, 'catégorie différente de la fiche');
});

test('API : filtres du catalogue, recherche, distance, repositionner, alertes', async () => {
  await call('PUT', '/v1/admin/parametres/annonces', ADMIN, { valeur: { gratuites_mois: 100, repositionner_jours: 0 } });
  const t = await user('f1'), veilleur = await user('f2');
  const al = await call('POST', '/v1/annonces/alertes', veilleur, { nom: 'Voitures diesel', filtres: { categorie: 'auto', sc: 'voiture', prix_max: 12_000_000 } });
  assert.equal(al.status, 201);
  assert.equal((await call('POST', '/v1/annonces/alertes', veilleur, { filtres: { categorie: 'fusees' } })).status, 400);
  const diesel = await call('POST', '/v1/utilisateur/annonces', t, { ...base, fiche: voiture('f1') });
  const essence = await call('POST', '/v1/utilisateur/annonces', t, { ...base, titre: 'Hyundai i10 essence', prix: 3_000_000, fiche: voiture('f1', { champs: { marque: 'hyundai', annee: 2012, carburant: 'essence', boite: 'manuelle', etat: 'usage' }, position: { lat: -0.7193, lng: 8.7815 } }) });
  const moto = await call('POST', '/v1/utilisateur/annonces', t, { ...base, titre: 'Moto Bajaj', prix: 600_000, fiche: voiture('f1', { sousCategorie: 'moto', champs: { marque: 'bajaj', annee: 2020 } }) });
  for (const a of [diesel, essence, moto]) { assert.equal(a.status, 201, JSON.stringify(a.body)); assert.equal((await call('POST', `/v1/admin/moderation/annonces/${a.body.id}`, ADMIN, { decision: 'publier' })).status, 200); }
  const notif = await db.query<any>(`SELECT derniere_notif FROM annonces_alertes WHERE id = $1`, [al.body.id]);
  assert.ok(notif[0].derniere_notif, 'alerte déclenchée à la publication');
  const ids = async (q: string) => (await call('GET', `/pub/annonces?categorie=auto&${q}`)).body.map((x: any) => x.id);
  assert.deepEqual(await ids('f_carburant=essence'), [essence.body.id]);
  assert.deepEqual(await ids('sc=moto'), [moto.body.id]);
  assert.deepEqual((await ids('f_annee_min=2014')).sort(), [diesel.body.id, moto.body.id].sort());
  assert.deepEqual(await ids('f_options=gps'), [diesel.body.id]);
  assert.deepEqual(await ids('q=hyundai'), [essence.body.id]);
  assert.ok(!(await ids(`lat=${LBV.lat}&lng=${LBV.lng}&rayon_km=10`)).includes(essence.body.id), 'Port-Gentil hors du rayon');
  const pub = (await call('GET', `/pub/annonces/${diesel.body.id}`)).body;
  assert.match(pub.fiche.medias[0].url, /^https:\/\/media\.test\/get\//); assert.ok(pub.fiche.couvertureUrl);
  // Repositionner : la plus ancienne remonte en tête
  assert.equal((await call('POST', `/v1/utilisateur/annonces/${diesel.body.id}/repositionner`, t)).status, 200);
  assert.equal((await ids(''))[0], diesel.body.id);
  assert.equal((await call('POST', `/v1/utilisateur/annonces/${diesel.body.id}/repositionner`, veilleur)).status, 404, 'pas l\'annonce d\'un autre');
  // Alertes : liste, désactivation, suppression
  assert.equal((await call('GET', '/v1/annonces/alertes', veilleur)).body.length, 1);
  assert.equal((await call('PATCH', `/v1/annonces/alertes/${al.body.id}`, veilleur, { actif: false })).status, 200);
  assert.equal((await call('DELETE', `/v1/annonces/alertes/${al.body.id}`, veilleur)).status, 204);
  assert.equal((await call('GET', '/v1/annonces/alertes', veilleur)).body.length, 0);
});
