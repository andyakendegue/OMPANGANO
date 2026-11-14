// Annonces de logement : module partagé (validation, certification, complétude, 360, prix, position masquée)
// et API (publication, médias, filtres de distance, lecture publique sans fuite de la position réelle).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import {
  CATALOGUE_LOGEMENT, calculerCertification, calculerCompletude, distanceM, estEquirectangulaire, formaterPrix, positionPublique,
  validerFicheLogement, type FicheLogement, type MediaAnnonce,
} from '../../../packages/noyau/src/logement.ts';

const LIBREVILLE = { lat: 0.4162, lng: 9.4673 };
const decale = (m: number) => ({ lat: LIBREVILLE.lat + m / 111320, lng: LIBREVILLE.lng });
const media = (uid: string, b: string, i: number, o: Partial<MediaAnnonce> = {}): MediaAnnonce =>
  ({ id: `media${i}xx`, type: 'photo', chemin: `annonces/${uid}/${b}/m${i}.jpg`, ordre: i, octets: 200_000, ...o });
function fiche(uid = 'u1', o: Partial<FicheLogement> = {}): FicheLogement {
  const b = 'brouillon1';
  return {
    version: 1, transaction: 'location', typeBien: 'chambre_salon', periode: 'mois', brouillonId: b,
    pieces: { chambres: 1, salons: 1, sallesDeBain: 1, cuisine: 'exterieure' },
    equipements: { gardien_nuit: true, groupe_electrogene: true, forage: true, climatisation: 2, compteur_electricite: 'prepaye', route: 'laterite', zone_inondable: 'parfois' },
    conditions: { cautionMois: 2, avanceMois: 3, fraisVisite: 5000 },
    position: LIBREVILLE, quartier: 'Batterie IV', repere: 'Derrière la pharmacie', consentementOccupants: true,
    medias: [media(uid, b, 1, { cheminVignette: `annonces/${uid}/${b}/m1_v.jpg` }), media(uid, b, 2)],
    ...o,
  };
}

// ------------------------------------------------------------------ module partagé
test('logement : fiche complète valide, copie propre', () => {
  const v = validerFicheLogement({ ...fiche(), inconnu: 1 }, 'u1');
  assert.ok(v.ok, JSON.stringify(!v.ok && v.erreurs));
  assert.equal((v.fiche as any).inconnu, undefined);
  assert.equal(v.fiche.equipements.climatisation, 2);
});

test('logement : refus (équipement inconnu, mauvais type, chemin d\'autrui, 21 photos, latitude, consentement)', () => {
  const refus = (f: unknown, motif: RegExp) => { const v = validerFicheLogement(f, 'u1'); assert.equal(v.ok, false); assert.match((v as any).erreurs.join(' '), motif); };
  refus({ ...fiche(), equipements: { piscine_olympique: true } }, /inconnu/);
  refus({ ...fiche(), equipements: { climatisation: 'beaucoup' } }, /nombre/);
  refus({ ...fiche(), equipements: { compteur_electricite: 'solaire' } }, /choix/);
  refus({ ...fiche(), medias: [media('u2', 'brouillon1', 1)] }, /chemin refusé/);
  refus({ ...fiche(), medias: Array.from({ length: 21 }, (_, i) => media('u1', 'brouillon1', i)) }, /20 au plus/);
  refus({ ...fiche(), position: { lat: 95, lng: 9 } }, /Position/);
  refus({ ...fiche(), consentementOccupants: false }, /consentement/);
  refus({ ...fiche(), medias: [media('u1', 'brouillon1', 1, { type: 'video' })] }, /photo est obligatoire/);
  refus({ ...fiche(), medias: [media('u1', 'brouillon1', 1, { chemin: 'annonces/u1/brouillon1/../x.jpg' })] }, /chemin/);
});

test('logement : certification (3 médias pris dans l\'app à moins de 150 m, dont une vidéo ou une 360)', () => {
  const pris = (i: number, m: number, type: MediaAnnonce['type'] = 'photo') => media('u1', 'brouillon1', i, { type, capturedInApp: true, capturedLat: decale(m).lat, capturedLng: decale(m).lng });
  assert.equal(calculerCertification({ position: LIBREVILLE, medias: [pris(1, 10), pris(2, 50), pris(3, 80, 'video')] }), true);
  assert.equal(calculerCertification({ position: LIBREVILLE, medias: [pris(1, 10), pris(2, 50), pris(3, 400, 'video')] }), false, 'un média à 400 m');
  assert.equal(calculerCertification({ position: LIBREVILLE, medias: [pris(1, 10), pris(2, 20), pris(3, 30)] }), false, 'que des photos');
  const galerie = [1, 2, 3].map(i => media('u1', 'brouillon1', i, { type: i === 3 ? 'pano360' : 'photo' }));
  assert.equal(calculerCertification({ position: LIBREVILLE, medias: galerie }), false, 'médias de galerie');
});

test('logement : complétude, 360, prix, position masquée', () => {
  const minimale = calculerCompletude({ transaction: 'location', typeBien: 'chambre', medias: [], equipements: {} }, {});
  assert.ok(minimale < 20, `minimale ${minimale}`);
  const b = 'brouillon1';
  const complete = calculerCompletude(fiche('u1', { medias: [1, 2, 3, 4, 5].map(i => media('u1', b, i)).concat(media('u1', b, 6, { type: 'video' }), media('u1', b, 7, { type: 'pano360' })) }),
    { titre: 'Chambre-salon à Batterie IV', description: 'x'.repeat(100), prix: 80000, telephone: '+241 06 12 34 56' });
  assert.equal(complete, 100);
  assert.equal(estEquirectangulaire(4000, 2000), true);
  assert.equal(estEquirectangulaire(5760, 2880), true);
  assert.equal(estEquirectangulaire(4000, 3000), false);
  assert.equal(formaterPrix(350000, 'mois'), '350 000 FCFA / mois');
  assert.equal(formaterPrix(15000000, 'total'), '15 000 000 FCFA');
  const f = { position: LIBREVILLE, masquee: true };
  const p1 = positionPublique(f, 'ann_1'), p2 = positionPublique(f, 'ann_1');
  assert.deepEqual(p1, p2, 'déterministe');
  for (const id of ['a', 'b', 'c', 'ann_xyz', 'ann_123']) { const d = distanceM(LIBREVILLE, positionPublique(f, id)); assert.ok(d >= 99 && d <= 301, `${id} : ${d}`); }
  assert.deepEqual(positionPublique({ position: LIBREVILLE }, 'x'), LIBREVILLE);
});

test('logement : catalogue (ids uniques, options, icônes Ionicons)', () => {
  const ids = CATALOGUE_LOGEMENT.groupes.flatMap(g => g.items.map(i => i.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const i of CATALOGUE_LOGEMENT.groupes.flatMap(g => g.items)) if (i.type === 'option') assert.ok(i.options?.length, i.id);
  const glyphes = JSON.parse(readFileSync(new URL('../../../apps/nkala/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json', import.meta.url), 'utf8'));
  const icones = [...CATALOGUE_LOGEMENT.typesDeBien.map(t => t.icon), ...CATALOGUE_LOGEMENT.groupes.map(g => g.icon), ...CATALOGUE_LOGEMENT.groupes.flatMap(g => g.items.map(i => i.icon))];
  assert.deepEqual(icones.filter(i => !(i in glyphes)), []);
  for (const f of CATALOGUE_LOGEMENT.filtresCles) assert.ok(ids.includes(f), f);
});

// ------------------------------------------------------------------ API
let db: Db, app: FastifyInstance;
const absents = new Set<string>();
const storage: MediaStorage = { presignPut: async p => `https://media.test/put/${p}`, presignGet: async p => `https://media.test/get/${p}`, remove: async () => {}, put: async () => {}, exists: async p => !absents.has(p) };
const verify: TokenVerifier = async token => userFromClaims(JSON.parse(Buffer.from(token, 'base64url').toString()));
const tok = (uid: string, o: { email?: string; verified?: boolean } = {}) => Buffer.from(JSON.stringify({
  iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: uid, email: o.email, email_verified: o.verified ?? false, firebase: { sign_in_provider: 'password' } })).toString('base64url');
const ADMIN = tok('capp', { email: 'andymigoumbi@gmail.com', verified: true });
async function call(method: string, url: string, token?: string, body?: unknown) {
  const res = await app.inject({ method: method as any, url, payload: body as any, headers: token ? { authorization: `Bearer ${token}` } : {} });
  let json: any = null; try { json = res.json(); } catch { json = res.body; }
  return { status: res.statusCode, body: json, headers: res.headers };
}
async function user(uid: string) { const token = tok(uid, { email: `${uid}@x.com` }); await call('GET', '/v1/me', token); await call('PATCH', '/v1/me', token, { displayName: uid, birthDate: '1990-01-01' }); return token; }

before(async () => {
  db = await createPgliteDb();
  await runMigrations(db);
  process.env.MODULES_ACTIFS = 'ompangano,onenji,azeva,ontci,nkala';
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: !!process.env.DEBUG_TESTS, rateLimitMax: 100000, sessionSecret: 'secret-de-test-0123456789abcdef' });
  await call('POST', '/v1/admin/contenus/categories_annonces/import', ADMIN, { lignes: [{ id: 'logement', titre: 'Logement', quota_gratuit: 10, publie: 'oui' }, { id: 'divers', titre: 'Divers', quota_gratuit: 10, publie: 'oui' }], mode: 'ajouter' });
});
after(async () => { await app.close(); await db.close(); delete process.env.MODULES_ACTIFS; });

test('API logement : refus sans jeton (401) et entrées invalides (400)', async () => {
  assert.equal((await call('POST', '/v1/media/upload-url', undefined, { path: 'annonces/x/brouillon1/a.jpg', contentType: 'image/jpeg', size: 10 })).status, 401);
  assert.equal((await call('POST', '/v1/utilisateur/annonces', undefined, { titre: 'x', categorie_id: 'logement', logement: {} })).status, 401);
  assert.equal((await call('PUT', '/v1/utilisateur/annonces/ann_x', undefined, { prix: 1 })).status, 401);
  assert.equal((await call('GET', '/v1/admin/moderation?collection=annonces', await user('lg0'))).status, 403);
  const t = await user('lg00');
  assert.equal((await call('POST', '/v1/media/upload-url', t, { path: 'annonces/lg00/brouillon1/a.jpg', contentType: 'image/jpeg' })).status, 400, 'taille absente');
  assert.equal((await call('POST', '/v1/utilisateur/annonces', t, { titre: 'x', categorie_id: 'logement', logement: { transaction: 'troc' } })).status, 400);
});

test('API logement : envoi de médias (chemin, type, taille)', async () => {
  const t = await user('lg1');
  const url = (path: string, contentType: string, size: number) => call('POST', '/v1/media/upload-url', t, { path, contentType, size });
  assert.equal((await url('annonces/lg1/brouillon1/a.jpg', 'image/jpeg', 2_000_000)).status, 200);
  assert.equal((await url('annonces/lg1/brouillon1/v.mp4', 'video/mp4', 40 * 1024 * 1024)).status, 200);
  assert.equal((await url('annonces/lg1/brouillon1/w.mp4', 'video/mp4', 60 * 1024 * 1024)).status, 413);
  assert.equal((await url('annonces/autre/brouillon1/a.jpg', 'image/jpeg', 1000)).status, 403);
  assert.equal((await url('annonces/lg1/brouillon1/a.pdf', 'application/pdf', 1000)).status, 400);
  assert.equal((await url('annonces/lg1/../x/a.jpg', 'image/jpeg', 1000)).status, 403);
  assert.equal((await call('GET', '/v1/media/url?path=annonces/lg1/brouillon1/a.jpg', t)).status, 200, 'l\'auteur relit son brouillon');
  assert.equal((await call('GET', '/v1/media/url?path=annonces/lg1/brouillon1/a.jpg', await user('lg1b'))).status, 403);
});

test('API logement : publication, calculs du serveur, modération, filtres, position masquée', async () => {
  const t = await user('lg2');
  const base = { titre: 'Chambre-salon à Batterie IV', description: 'Calme, proche du marché.', prix: 80000, ville: 'Libreville', telephone: '+24106123456', categorie_id: 'logement' };
  // Le client prétend « certifiée » et « 100 » : ignoré
  const a1 = await call('POST', '/v1/utilisateur/annonces', t, { ...base, logement: { ...fiche('lg2'), certifiee: true, completude: 100 } });
  assert.equal(a1.status, 201, JSON.stringify(a1.body));
  assert.equal(a1.body.statut, 'en_attente');
  assert.equal(a1.body.logement.certifiee, false);
  assert.ok(a1.body.logement.completude < 100 && a1.body.logement.completude > 40, String(a1.body.logement.completude));

  const bad = await call('POST', '/v1/utilisateur/annonces', t, { ...base, logement: { ...fiche('lg2'), typeBien: 'chateau' } });
  assert.equal(bad.status, 400); assert.ok(Array.isArray(bad.body.erreurs));
  assert.equal((await call('POST', '/v1/utilisateur/annonces', t, { titre: 'Vélo', categorie_id: 'divers', prix: 30000 })).status, 201, 'ancien format accepté');
  absents.add('annonces/lg2/brouillon1/m2.jpg');
  const manquant = await call('POST', '/v1/utilisateur/annonces', t, { ...base, logement: fiche('lg2') });
  assert.equal(manquant.status, 400); assert.match(manquant.body.error, /introuvables/);
  absents.clear();

  // Loin (Port-Gentil), avec 360 ; et une annonce masquée
  const loin = await call('POST', '/v1/utilisateur/annonces', t, { ...base, titre: 'Villa à Port-Gentil', prix: 500000, logement: { ...fiche('lg2'), typeBien: 'villa', pieces: { chambres: 4 }, equipements: { piscine: true }, position: { lat: -0.7193, lng: 8.7815 },
    medias: [media('lg2', 'brouillon1', 1), media('lg2', 'brouillon1', 3, { type: 'pano360', largeur: 4096, hauteur: 2048 })] } });
  assert.equal(loin.status, 201, JSON.stringify(loin.body));
  const vrai = { lat: 0.4201, lng: 9.4701 };
  const cache = await call('POST', '/v1/utilisateur/annonces', t, { ...base, titre: 'Studio discret', logement: { ...fiche('lg2'), masquee: true, position: vrai } });
  assert.equal(cache.status, 201);
  assert.equal(cache.body.logement.position, undefined);

  // Rien de public avant modération ; la file de modération montre les médias signés et la position réelle
  assert.equal((await call('GET', '/pub/annonces?categorie=logement')).body.length, 0);
  const file = await call('GET', '/v1/admin/moderation?collection=annonces', ADMIN);
  const mc = file.body.find((x: any) => x.id === cache.body.id);
  assert.deepEqual(mc.logement.positionReelle, vrai);
  assert.match(mc.logement.medias[0].url, /^https:\/\/media\.test\/get\/annonces\/lg2\//);
  for (const a of [a1, loin, cache]) assert.equal((await call('POST', `/v1/admin/moderation/annonces/${a.body.id}`, ADMIN, { decision: 'publier' })).status, 200);

  // Distance
  const pres = await call('GET', `/pub/annonces?categorie=logement&lat=${LIBREVILLE.lat}&lng=${LIBREVILLE.lng}&rayon_km=2&tri=distance`);
  assert.equal(pres.status, 200);
  assert.match(String(pres.headers['cache-control']), /private/);
  const ids = pres.body.map((x: any) => x.id);
  assert.ok(ids.includes(a1.body.id) && !ids.includes(loin.body.id), JSON.stringify(ids));
  assert.equal(typeof pres.body[0].distance_m, 'number');
  assert.equal(pres.body[0].id, a1.body.id, 'la plus proche d\'abord');
  assert.ok(pres.body[0].logement.couvertureUrl, 'couverture signée');
  // Filtres
  const ids2 = async (q: string) => (await call('GET', `/pub/annonces?categorie=logement&${q}`)).body.map((x: any) => x.id);
  assert.deepEqual(await ids2('chambres_min=3'), [loin.body.id]);
  assert.deepEqual(await ids2('avec360=1'), [loin.body.id]);
  assert.ok((await ids2('equip=groupe_electrogene')).includes(a1.body.id));
  assert.ok(!(await ids2('equip=groupe_electrogene')).includes(loin.body.id));
  assert.deepEqual(await ids2('type=villa'), [loin.body.id]);
  assert.deepEqual((await ids2('tri=-prix'))[0], loin.body.id);
  assert.deepEqual(await ids2('prix_min=100000'), [loin.body.id]);

  // Position réelle de l'annonce masquée : nulle part dans les réponses publiques
  const tout = JSON.stringify((await call('GET', '/pub/annonces?categorie=logement')).body) + JSON.stringify((await call('GET', `/pub/annonces/${cache.body.id}`)).body)
    + JSON.stringify((await call('GET', `/pub/annonces?categorie=logement&lat=${vrai.lat}&lng=${vrai.lng}&rayon_km=1`)).body);
  assert.ok(!tout.includes(`"lat":${vrai.lat},`) && !tout.includes(`"lng":${vrai.lng}}`), 'position réelle absente');
  assert.ok(!tout.includes('data_privee') && !tout.includes('positionReelle'));
  // Aucune position de prise de vue dans les réponses publiques (règle D2)
  const pris = await call('POST', '/v1/utilisateur/annonces', t, { ...base, titre: 'Pris sur place', logement: { ...fiche('lg2'), masquee: true, position: vrai,
    medias: [media('lg2', 'brouillon1', 1, { capturedInApp: true, capturedLat: vrai.lat, capturedLng: vrai.lng })] } });
  assert.equal(pris.status, 201);
  assert.ok(!JSON.stringify(pris.body).includes('capturedLat'), 'pas de position de média dans la réponse');
  await call('POST', `/v1/admin/moderation/annonces/${pris.body.id}`, ADMIN, { decision: 'publier' });
  assert.ok(!JSON.stringify((await call('GET', `/pub/annonces/${pris.body.id}`)).body).includes('capturedLat'));
  const enBase = await db.query<any>(`SELECT data_privee FROM contenus WHERE id = $1`, [pris.body.id]);
  assert.deepEqual(enBase[0].data_privee.positionsMedias.media1xx, vrai, 'gardée à part pour le modérateur');
  const det = await call('GET', `/pub/annonces/${cache.body.id}`);
  assert.equal(det.status, 200);
  const d = distanceM(vrai, det.body.logement.positionPublique); assert.ok(d >= 99 && d <= 301, String(d));
  assert.equal((await call('GET', '/pub/annonces/inexistante')).status, 404);

  // Modification par l'auteur : repasse en relecture
  const mod = await call('PUT', `/v1/utilisateur/annonces/${a1.body.id}`, t, { prix: 75000, logement: { ...fiche('lg2'), conditions: { cautionMois: 1 } } });
  assert.equal(mod.status, 200, JSON.stringify(mod.body));
  assert.equal(mod.body.statut, 'en_attente');
  assert.ok(!(await ids2('')).includes(a1.body.id));
  assert.equal((await call('PUT', `/v1/utilisateur/annonces/${a1.body.id}`, await user('lg3'), { prix: 1 })).status, 404, 'pas l\'annonce d\'un autre');

  // Refus : médias notés pour effacement
  await call('POST', `/v1/admin/moderation/annonces/${a1.body.id}`, ADMIN, { decision: 'refuser', motif: 'Photos floues' });
  const e = await db.query<any>(`SELECT count(*)::int AS n FROM medias_annonces_a_effacer WHERE annonce_id = $1`, [a1.body.id]);
  assert.ok(e[0].n >= 2);
});
