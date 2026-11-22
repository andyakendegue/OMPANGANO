// Partie des cours d'Onenji : unité en 9 étapes, variante, accès des leçons et des vidéos, certificats numérotés (13 nov. 2026).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import {
  accesChapitreVideo, accesCompletVideo, etapesCouvertes, exerciceNote, filtrerVariante, finPartieGratuite, jugerReponse, motsDesExercices,
  numeroCertificat, parcoursTermine, repliques, uniteSuivante, type Exercice,
} from '../../../packages/noyau/src/lecons.ts';
import { validerLignes } from '../../../packages/noyau/src/contenu/valider.ts';
import { SCHEMAS } from '../../../packages/noyau/src/contenu/schemas.ts';
import { SEEDS } from '../../../packages/noyau/src/contenu/seeds.ts';

// ------------------------------------------------------------------ noyau
const ex = (o: Partial<Exercice>): Exercice => ({ id: 'x', lecon_id: 'l', type: 'choix', ...o });

test('dictée : formes séparées par « / », ponctuation et casse ignorées, réponse vide refusée', () => {
  const d = ex({ type: 'dictee', reponse: 'Akéwa/Akewa' });
  assert.equal(jugerReponse(d, 'akéwa'), true);
  assert.equal(jugerReponse(d, 'Akewa !'), true);
  assert.equal(jugerReponse(d, 'Mbolo'), false);
  assert.equal(jugerReponse(ex({ type: 'dictee', reponse: '' }), ''), false);
});
test('cartes et jeu non notés ; comprendre noté', () => {
  for (const t of ['cours', 'proverbe', 'culture', 'jouer', 'ecouter', 'dire'] as const) { assert.equal(exerciceNote({ type: t }), false, t); assert.equal(jugerReponse(ex({ type: t, reponse: 'a' }), 'b'), true); }
  assert.equal(exerciceNote({ type: 'comprendre' }), true);
  assert.equal(jugerReponse(ex({ type: 'comprendre', reponse: 'Ibanga wé. Ka mènè !' }), 'Mbolo'), false);
});
test('étapes couvertes par une unité', () => {
  const s = etapesCouvertes([{ type: 'cours', image: 'i.png' }, { type: 'dictee' }, { type: 'proverbe' }, { type: 'jouer' }]);
  assert.deepEqual([...s].sort(), ['ecrire', 'jouer', 'proverbe', 'verifier', 'voir']);
});
test('variante : celle de l\'apprenant, sinon commune, sinon orungu', () => {
  const l: Exercice[] = [
    ex({ id: 'a-or', ordre: 1, dialecte: 'orungu' }), ex({ id: 'a-mp', ordre: 1, dialecte: 'mpongwe' }),
    ex({ id: 'b', ordre: 2 }), ex({ id: 'c-or', ordre: 3, dialecte: 'orungu' }), ex({ id: 'c-co', ordre: 3 }),
  ];
  assert.deepEqual(filtrerVariante(l, 'mpongwe').map(e => e.id), ['a-mp', 'b', 'c-co']);
  assert.deepEqual(filtrerVariante(l).map(e => e.id), ['a-or', 'b', 'c-or']);
  assert.deepEqual(filtrerVariante(l, 'nkomi').map(e => e.id), ['a-or', 'b', 'c-co']);
});
test('carnet de mots et dialogue', () => {
  const m = motsDesExercices([ex({ mot_myene: 'Mbolo', mot_francais: 'Bonjour' }), ex({ mot_myene: 'mbolo', mot_francais: 'Bonjour' }), ex({ mot_myene: 'A ___ B', mot_francais: 'trou' }), ex({ type: 'proverbe', mot_myene: 'P', mot_francais: 'p' })]);
  assert.deepEqual(m.map(x => x.mot), ['Mbolo']);
  assert.deepEqual(repliques('A : Mbolo !\nRécit\nB: Akéwa.'), [{ qui: 'A', dit: 'Mbolo !' }, { qui: null, dit: 'Récit' }, { qui: 'B', dit: 'Akéwa.' }]);
});
test('unité suivante et parcours terminé', () => {
  const P = [{ id: 'p1', titre: 'P1', ordre: 1 }, { id: 'p2', titre: 'P2', ordre: 2 }];
  const U = [{ id: 'u1', parcours_id: 'p1', titre: 'U1', ordre: 1 }, { id: 'u2', parcours_id: 'p1', titre: 'U2', ordre: 2 }, { id: 'u3', parcours_id: 'p2', titre: 'U3', ordre: 1 }];
  assert.equal(uniteSuivante('u1', P, U)?.unite.id, 'u2');
  assert.equal(uniteSuivante('u2', P, U)?.parcours.id, 'p2');
  assert.equal(uniteSuivante('u3', P, U), null);
  assert.equal(parcoursTermine('p1', U, ['u1']), false);
  assert.equal(parcoursTermine('p1', U, ['u1', 'u2']), true);
  assert.equal(parcoursTermine('vide', U, []), false);
  assert.equal(numeroCertificat(42, 2026), 'NKL-2026-000042');
});
test('vidéothèque en streaming (15 nov. 2026) : 1er chapitre gratuit avec pub, suite à la formule, plus jamais d\'achat, réglage vidéo par vidéo', () => {
  const ch = [{ id: 'c1', ordre: 1, debut_s: 0 }, { id: 'c2', ordre: 2, debut_s: 120 }, { id: 'c3', ordre: 3, debut_s: 300 }];
  const court = { id: 'v', categorie: 'Langue', duree_min: 20 };
  assert.equal(accesChapitreVideo(court, ch, 0), 'gratuit_avec_pub');
  assert.equal(accesChapitreVideo(court, ch, 1), 'abonnement');
  assert.equal(finPartieGratuite(court, ch), 120);
  const long = { id: 'w', artisan: 'Pêcheur', duree_min: 90 };
  assert.equal(accesChapitreVideo(long, ch, 2), 'abonnement', 'un cours d\'artisan long ne se vend plus');
  assert.equal(accesCompletVideo(long, ch), 'abonnement');
  assert.equal(accesChapitreVideo({ ...court, niveau_acces: 'achat' }, ch, 2), 'abonnement', '« achat » saisi sur une vidéo vaut « abonnement »');
  assert.equal(accesChapitreVideo(court, [{ ...ch[0] }, { ...ch[1], niveau_acces: 'location' }], 1), 'abonnement');
  assert.equal(accesChapitreVideo({ ...court, niveau_acces: 'libre' }, ch, 2), 'libre');
  assert.equal(finPartieGratuite({ ...court, niveau_acces: 'libre' }, ch), null);
  assert.equal(finPartieGratuite({ ...court, niveau_acces: 'abonnement' }, ch), 0);
  assert.equal(accesChapitreVideo(court, [{ ...ch[0] }, { ...ch[1], niveau_acces: 'libre' }], 1), 'libre');
  assert.equal(accesCompletVideo(court, []), 'gratuit_avec_pub', 'sans chapitre : un seul chapitre gratuit');
});
test('les exemples livrés avec l\'application passent les schémas (exercices, grammaire)', () => {
  for (const c of ['exercices', 'grammaire'] as const) {
    const s = SCHEMAS.find(x => x.id === c)!;
    const r = validerLignes(s, SEEDS[c] as Record<string, unknown>[]);
    assert.deepEqual(r.erreurs, [], c);
  }
});

// ------------------------------------------------------------------ API
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
let n = 0;
async function user() {
  const uid = 'c' + ++n, token = tok(uid, { email: `${uid}@x.com` });
  await call('GET', '/v1/me', token);
  await call('PATCH', '/v1/me', token, { displayName: `Élève ${n}`, birthDate: '1990-01-01' });
  return { uid, token };
}
const importer = (collection: string, lignes: unknown[]) => call('POST', `/v1/admin/contenus/${collection}/import`, ADMIN, { lignes, mode: 'ajouter', partiel: true });

before(async () => {
  db = await createPgliteDb();
  await runMigrations(db);
  process.env.MODULES_ACTIFS = 'ompangano,onenji,azeva,ontci,nkala';
  Object.assign(process.env, { MOBILEMONEY_FOURNISSEUR: 'simulation', ACHATS_FOURNISSEUR: 'simulation', PUSH_FOURNISSEUR: 'simulation' });
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: false, rateLimitMax: 100000, sessionSecret: 'secret-de-test-0123456789abcdef' });
  await importer('parcours', [{ id: 'pa', titre: 'Ntina', ordre: 1, publie: 'oui' }]);
  await importer('unites', [{ id: 'pa-u1', parcours_id: 'pa', titre: 'Saluer', ordre: 1, publie: 'oui' }, { id: 'pa-u2', parcours_id: 'pa', titre: 'Être poli', ordre: 2, publie: 'oui' }]);
  await importer('lecons', [{ id: 'pa-l1', unite_id: 'pa-u1', titre: 'Bonjour', publie: 'oui' }, { id: 'pa-l2', unite_id: 'pa-u2', titre: 'Merci', publie: 'oui' }, { id: 'pa-l3', unite_id: 'pa-u2', titre: 'Libre', niveau_acces: 'libre', publie: 'oui' }]);
});
after(async () => { await app.close(); await db.close(); for (const k of ['MODULES_ACTIFS', 'MOBILEMONEY_FOURNISSEUR', 'ACHATS_FOURNISSEUR', 'PUSH_FOURNISSEUR']) delete process.env[k]; });

test('les nouveaux types d\'exercice et la grammaire s\'importent', async () => {
  const r = await importer('exercices', [
    { id: 'x1', lecon_id: 'pa-l1', type: 'dictee', mot_francais: 'Merci', reponse: 'Akéwa', source: '[LEC]', ordre: 1 },
    { id: 'x2', lecon_id: 'pa-l1', type: 'comprendre', texte: 'A : Mbolo !', options: 'Mbolo|Akéwa', reponse: 'Mbolo', source: '[LEC]', ordre: 2 },
    { id: 'x3', lecon_id: 'pa-l1', type: 'proverbe', mot_myene: 'Owaro-mfélo, ré nyènyo ngôri.', source: 'PRV-0001', ordre: 3 },
  ]);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const g = await importer('grammaire', [{ id: 'g1', titre: 'Saluer', contenu: 'Mbolo / Mbôluani', source: '[LEC]', publie: 'oui' }]);
  assert.equal(g.status, 200, JSON.stringify(g.body));
  await importer('grammaire', [{ id: 'g2', titre: 'Sans source', contenu: 'x', publie: 'oui' }]);
  const ids = (await call('GET', '/pub/contenus/grammaire')).body.lignes.map((l: { id: string }) => l.id);
  assert.ok(ids.includes('g1') && !ids.includes('g2'), 'une fiche sans source est refusée');
});

test('accès des leçons côté serveur : cours gratuits sans forfait (15 nov. 2026)', async () => {
  const u = await user();
  const lecon = (id: string) => call('POST', '/v1/progression/lecon', u.token, { leconId: id, bonnes: 3, erreurs: 0 });
  assert.equal((await lecon('pa-l1')).status, 200);
  assert.equal((await lecon('pa-l2')).status, 200, 'deuxième unité : gratuite aussi');
  assert.equal((await lecon('pa-l3')).status, 200);
  await importer('produits', [{ id: 'abo', titre: 'Forfait', type: 'abonnement', prix_fcfa: 1000, periode: 'mois', publie: 'oui' }]);
  await importer('lecons', [{ id: 'pa-perso', unite_id: 'pa-u2', titre: 'Personnel', niveau_acces: 'reserve', publie: 'oui' }]);
  assert.equal((await lecon('pa-perso')).status, 402, 'leçon « reserve » : fermée au public');
});

test('certificat : refusé avant la fin, numéroté une seule fois, vérifiable publiquement', async () => {
  const u = await user();
  assert.equal((await call('POST', '/v1/onenji/certificats', u.token, { parcoursId: 'pa' })).status, 409);
  assert.equal((await call('POST', '/v1/onenji/certificats', u.token, { parcoursId: 'inconnu' })).status, 404);
  await call('POST', '/v1/progression/unite', u.token, { uniteId: 'pa-u1', bonnes: 5, sur: 5 });
  await call('POST', '/v1/progression/unite', u.token, { uniteId: 'pa-u2', bonnes: 4, sur: 5 });
  const c = await call('POST', '/v1/onenji/certificats', u.token, { parcoursId: 'pa' });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  assert.match(c.body.numero, /^NKL-\d{4}-\d{6}$/);
  assert.equal(c.body.titre, 'Ntina'); assert.match(c.body.nom, /^Élève/);
  const bis = await call('POST', '/v1/onenji/certificats', u.token, { parcoursId: 'pa' });
  assert.equal(bis.body.numero, c.body.numero, 'même numéro la deuxième fois');
  assert.equal((await call('GET', '/v1/onenji/certificats', u.token)).body.length, 1);
  const v = await call('GET', `/pub/certificats/${c.body.numero}`);
  assert.equal(v.status, 200); assert.equal(v.body.valide, true); assert.equal(v.body.titre, 'Ntina');
  assert.equal((await call('GET', '/pub/certificats/NKL-2026-999999')).status, 404);
  assert.equal((await call('GET', '/pub/certificats/abc')).status, 400);
});

test('licence vidéo : partie gratuite sans formule Igolani, vidéo entière avec, passage de lecture compté, aucune vente de vidéo', async () => {
  await importer('cours_artisans', [{ id: 'v1', titre: 'Langue', categorie: 'Langue', duree_min: 20, publie: 'oui' }, { id: 'v2', titre: 'Libre', niveau_acces: 'libre', publie: 'oui' }, { id: 'v3', titre: 'Réservée', niveau_acces: 'abonnement', publie: 'oui' }]);
  await importer('chapitres', [{ id: 'v1-c1', cours_id: 'v1', titre: 'Début', debut_s: 0, ordre: 1 }, { id: 'v1-c2', cours_id: 'v1', titre: 'Suite', debut_s: 90, ordre: 2 }]);
  const u = await user();
  const lic = (id: string, t = u.token) => call('POST', '/v1/lecture/licence', t, { collection: 'cours_artisans', id });
  const a = await lic('v1');
  assert.equal(a.status, 200, JSON.stringify(a.body)); assert.equal(a.body.limiteS, 90); assert.equal(a.body.avecPub, true);
  assert.equal((await lic('v2')).body.limiteS, null);
  assert.equal((await lic('v3')).status, 402, 'sans partie gratuite : refus');
  // un abonnement qui n'ouvre pas Igolani ne suffit plus (streaming : formules qui incluent Igolani, Premium compris)
  await call('POST', '/v1/admin/droits', ADMIN, { userId: u.uid, type: 'abonnement', produitId: 'abo', jours: 30 });
  assert.equal((await lic('v1')).body.limiteS, 90);
  await importer('plans', [{ id: 'videos', titre: 'Vidéos', igolani: 'oui', publie: 'oui' }]);
  await importer('produits', [{ id: 'abo-videos', titre: 'Formule vidéos', type: 'abonnement', prix_fcfa: 1500, periode: 'mois', plan_id: 'videos', publie: 'oui' }]);
  await call('POST', '/v1/admin/droits', ADMIN, { userId: u.uid, type: 'abonnement', produitId: 'abo-videos', jours: 30 });
  const b = await lic('v1');
  assert.equal(b.body.limiteS, null); assert.equal(b.body.avecPub, false);
  assert.equal((await call('GET', '/v1/droits', u.token)).body.igolani, true);
  // minutes regardées : la licence ouvre un passage ; le battement ajoute le temps écoulé (plafonné)
  assert.match(b.body.passage, /^lp_[0-9a-f]{18}$/);
  await db.query(`UPDATE lecture_passages SET dernier = dernier - interval '30 seconds' WHERE id = $1`, [b.body.passage]);
  const bat = await call('POST', '/v1/lecture/battement', u.token, { passage: b.body.passage });
  assert.equal(bat.status, 200); assert.ok(bat.body.secondes >= 29 && bat.body.secondes <= 45, String(bat.body.secondes));
  assert.equal((await call('POST', '/v1/lecture/battement', ADMIN, { passage: b.body.passage })).status, 404, 'passage d\'un autre compte');
  // aucune vente de vidéo à l'unité : produit masqué et refusé partout
  await importer('produits', [{ id: 'video-unite', titre: 'Une vidéo', type: 'achat', prix_fcfa: 3000, prix_nkr: 1400, donne_acces: 'v1', publie: 'oui' }]);
  assert.ok(!(await call('GET', '/pub/produits')).body.produits.some((p: any) => p.id === 'video-unite'));
  assert.equal((await call('POST', '/v1/nkorouna/depenser', u.token, { produitId: 'video-unite', cle: 'cle-video-0001' })).status, 410);
  // temps par module : premier battement du jour, puis temps écoulé plafonné
  assert.equal((await call('POST', '/v1/temps', u.token, { module: 'igolani' })).status, 200);
  assert.equal((await call('POST', '/v1/temps', u.token, { module: 'inconnu' })).status, 400);
});

test('planning des cours à distance : création, inscription par code (4 au plus), entrée à l\'heure', async () => {
  const hote = await user(), b = await user(), c2 = await user(), d = await user(), e = await user();
  assert.equal((await call('POST', '/v1/appels/planning', hote.token, { titre: 'X', debut: new Date(Date.now() + 600_000).toISOString() })).status, 403, 'un élève ne crée pas de cours');
  assert.equal((await call('POST', '/v1/appels', hote.token, { titre: 'X' })).status, 403, 'salle immédiate : administrateurs seulement');
  await call('POST', '/v1/admin/professeurs', ADMIN, { userId: hote.uid });
  const bientot = new Date(Date.now() + 5 * 60_000).toISOString();
  assert.equal((await call('POST', '/v1/appels/planning', hote.token, { titre: 'Saluer', debut: '2000-01-01T00:00:00Z' })).status, 400);
  const p = await call('POST', '/v1/appels/planning', hote.token, { titre: 'Saluer', debut: bientot, dureeMin: 45 });
  assert.equal(p.status, 201, JSON.stringify(p.body)); assert.match(p.body.code, /^[0-9a-f]{8}$/); assert.equal(p.body.inscrits, 1); assert.equal(p.body.ouvert, true);
  assert.equal((await call('POST', `/v1/appels/planning/${p.body.code}/entrer`, b.token)).status, 403, 'pas inscrit');
  for (const u of [b, c2, d]) assert.equal((await call('POST', `/v1/appels/planning/${p.body.code}/inscrire`, u.token)).status, 200);
  assert.equal((await call('POST', `/v1/appels/planning/${p.body.code}/inscrire`, e.token)).status, 409, 'complet');
  assert.equal((await call('GET', '/v1/appels/planning', b.token)).body.length, 1);
  const s = await call('POST', `/v1/appels/planning/${p.body.code}/entrer`, b.token);
  assert.equal(s.status, 200); assert.equal(s.body.id, p.body.code);
  assert.equal((await call('POST', `/v1/appels/${p.body.code}/rejoindre`, e.token)).status, 403, 'salle prévue : pas d\'entrée par le code seul');
  const tard = await call('POST', '/v1/appels/planning', hote.token, { titre: 'Plus tard', debut: new Date(Date.now() + 86_400_000).toISOString() });
  assert.equal((await call('POST', `/v1/appels/planning/${tard.body.code}/entrer`, hote.token)).status, 425);
  await call('POST', `/v1/appels/planning/${tard.body.code}/desinscrire`, hote.token);
  assert.equal((await call('GET', `/v1/appels/planning/${tard.body.code}`, hote.token)).status, 404, 'l\'hôte annule le cours');
});

test('exercices de toutes les leçons servis sans compte (cours gratuits) ; « reserve » au personnel ; adresse des vidéos retirée', async () => {
  await importer('exercices', [{ id: 'g-1', lecon_id: 'pa-l1', type: 'choix', options: 'a|b', reponse: 'a', source: 'x', ordre: 1 }, { id: 'p-1', lecon_id: 'pa-l2', type: 'choix', options: 'a|b', reponse: 'a', source: 'x', ordre: 1 }, { id: 'r-1', lecon_id: 'pa-perso', type: 'choix', options: 'a|b', reponse: 'a', source: 'x', ordre: 1 }]);
  const ids = (r: any) => r.body.lignes.map((l: { id: string }) => l.id);
  const invite = await call('GET', '/pub/onenji/exercices');
  { const anc = await call('GET', '/pub/contenus/exercices'); assert.equal(anc.status, 200, 'versions 0.1.x'); assert.ok(ids(anc).includes('g-1') && ids(anc).includes('p-1'), 'versions 0.1.x : toutes les leçons'); }
  assert.ok(ids(invite).includes('g-1') && ids(invite).includes('p-1') && !ids(invite).includes('r-1'), 'sans compte : toutes les leçons sauf « reserve »');
  const u = await user();
  assert.ok(ids(await call('GET', '/v1/onenji/exercices', u.token)).includes('p-1'), 'compte sans forfait : leçon ouverte');
  assert.ok(!ids(await call('GET', '/v1/onenji/exercices', u.token)).includes('r-1'));
  assert.ok(ids(await call('GET', '/v1/onenji/exercices', ADMIN)).includes('r-1'), 'personnel : tout');
  await importer('cours_artisans', [{ id: 'v-url', titre: 'Avec adresse', video_url: 'https://exemple.test/v.m3u8', publie: 'oui' }]);
  const v = (await call('GET', '/pub/contenus/cours_artisans')).body.lignes.find((l: any) => l.id === 'v-url');
  assert.equal(v.video_url, undefined); assert.equal(v.video, true);
  assert.equal((await call('POST', '/v1/lecture/licence', u.token, { collection: 'cours_artisans', id: 'v-url' })).body.videoUrl, 'https://exemple.test/v.m3u8');
});

test('professeurs et tarif générique : l\'admin nomme et désigne, le prix vient du tarif, la place se paie par Mobile Money', async () => {
  const prof = await user(), eleve = await user(), autre = await user();
  assert.equal((await call('POST', '/v1/admin/professeurs', prof.token, { userId: prof.uid })).status, 403, 'nommer : administrateurs seulement');
  assert.equal((await call('POST', '/v1/admin/professeurs', ADMIN, { userId: prof.uid })).status, 201);
  assert.equal((await call('GET', '/v1/appels/moi', prof.token)).body.peutAnimer, true);
  assert.equal((await call('GET', '/v1/appels/moi', eleve.token)).body.peutAnimer, false);
  assert.equal((await call('PUT', '/v1/admin/parametres/cours_distance', prof.token, { valeur: { prix_heure_fcfa: 1 } })).status, 403, 'le professeur ne fixe pas le tarif');
  assert.equal((await call('PUT', '/v1/admin/parametres/cours_distance', ADMIN, { valeur: { prix_heure_fcfa: -5 } })).status, 400);
  assert.equal((await call('PUT', '/v1/admin/parametres/cours_distance', ADMIN, { valeur: { prix_heure_fcfa: 2000, minimum_fcfa: 500, plans_inclus: ['complet'] } })).status, 200);
  const debut = new Date(Date.now() + 5 * 60_000).toISOString();
  assert.equal((await call('POST', '/v1/appels/planning', prof.token, { titre: 'X', debut, professeurId: autre.uid })).status, 403, 'un professeur ne désigne pas un autre');
  assert.equal((await call('POST', '/v1/appels/planning', ADMIN, { titre: 'X', debut, professeurId: autre.uid })).status, 400, 'pas professeur');
  const c = await call('POST', '/v1/appels/planning', ADMIN, { titre: 'Saluer', debut, dureeMin: 90, professeurId: prof.uid, prixFcfa: 1 });
  assert.equal(c.status, 201, JSON.stringify(c.body)); assert.equal(c.body.prixFcfa, 3000, '1 h 30 à 2000 FCFA/h, prix envoyé ignoré');
  assert.equal((await call('GET', '/v1/appels/planning', prof.token)).body[0].hote, true, 'le professeur désigné anime');
  const i = await call('POST', `/v1/appels/planning/${c.body.code}/inscrire`, eleve.token);
  assert.equal(i.status, 402); assert.equal(i.body.paiement.produitId, `seance:${c.body.code}`); assert.equal(i.body.paiement.prixFcfa, 3000);
  const pay = await call('POST', '/v1/paiements', eleve.token, { produitId: `seance:${c.body.code}`, operateur: 'airtel', telephone: '+24106112233' });
  assert.equal(pay.status, 201, JSON.stringify(pay.body)); assert.equal(pay.body.instructions.montant, 3000);
  assert.equal((await call('POST', `/v1/paiements/${pay.body.id}/simuler`, eleve.token, { code: '0000' })).status, 200);
  const apres = (await call('GET', `/v1/appels/planning/${c.body.code}`, eleve.token)).body;
  assert.equal(apres.inscrit, true); assert.equal(apres.inscrits, 2);
  assert.equal((await call('POST', `/v1/appels/planning/${c.body.code}/desinscrire`, prof.token)).status, 409, 'élève payant : seul un admin annule');
  const court = await call('POST', '/v1/appels/planning', prof.token, { titre: 'Court', debut, dureeMin: 15 });
  assert.equal(court.body.prixFcfa, 500, 'minimum');
});
