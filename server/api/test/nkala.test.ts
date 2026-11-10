// Tests de Nkala côté serveur : SMS Twilio (fournisseur simulé), contenus JSON/CSV, progression, parties, IA et jetons,
// publicité, droits, signalisation des cours (4 personnes au plus), supervision.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import type { FournisseurSms } from '../src/sms.ts';
import type { FournisseurIa } from '../src/ia.ts';

let db: Db, app: FastifyInstance;
const envoyes: string[] = [];
const sms: FournisseurSms = { envoyer: async t => { envoyes.push(t); }, verifier: async (_t, c) => c === '123456' };
const ia: FournisseurIa = { nom: 'test', repondre: async ({ messages }) => ({ texte: 'Mbolo ! (' + messages.length + ')', usage: { entree: 100, sortie: 20 }, modele: 'test', simule: false }) };
const fichiers = new Map<string, Uint8Array>();
const storage: MediaStorage = { presignPut: async () => '', presignGet: async p => `https://media.test/get/${p}`, remove: async () => {}, put: async (p, b) => { fichiers.set(p, b); }, exists: async () => true, get: async p => fichiers.get(p) ?? null };
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
async function user(adulte = true) {
  const uid = 'u' + ++n, token = tok(uid, { email: `${uid}@x.com` });
  await call('GET', '/v1/me', token);
  await call('PATCH', '/v1/me', token, { displayName: uid, birthDate: adulte ? '1990-01-01' : '2018-01-01' });
  return { uid, token };
}

before(async () => {
  db = await createPgliteDb();
  await runMigrations(db);
  process.env.MODULES_ACTIFS = 'ompangano,onenji,azeva,ontci,nkala';
  process.env.FONCTIONS_ACTIVES = 'publicite,assistantIA';
  Object.assign(process.env, { ACHATS_FOURNISSEUR: 'simulation', PUSH_FOURNISSEUR: 'simulation', ADMIN_TELEPHONES: '+24100000009' });
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: !!process.env.DEBUG_TESTS, rateLimitMax: 100000, sms, ia, sessionSecret: 'secret-de-test-0123456789abcdef' });
});
after(async () => { await app.close(); await db.close(); for (const k of ['MODULES_ACTIFS', 'FONCTIONS_ACTIVES', 'ACHATS_FOURNISSEUR', 'PUSH_FOURNISSEUR', 'ADMIN_TELEPHONES']) delete process.env[k]; });

test('SMS : numéro normalisé, code vérifié, session utilisable, mauvais code refusé', async () => {
  assert.equal((await call('POST', '/auth/sms/envoyer', undefined, { telephone: 'abc' })).status, 400);
  const e = await call('POST', '/auth/sms/envoyer', undefined, { telephone: '06 12 34 56' });
  assert.equal(e.status, 202); assert.equal(e.body.telephone, '+24106123456'); assert.equal(envoyes.at(-1), '+24106123456');
  assert.equal((await call('POST', '/auth/sms/verifier', undefined, { telephone: '06 12 34 56', code: '000000' })).status, 401);
  const v = await call('POST', '/auth/sms/verifier', undefined, { telephone: '06123456', code: '123456' });
  assert.equal(v.status, 200, JSON.stringify(v.body));
  assert.match(v.body.uid, /^tel_241/);
  const me = await call('GET', '/v1/me', v.body.jeton);
  assert.equal(me.status, 200); assert.equal(me.body.id, v.body.uid);
  assert.notEqual(me.body.role, 'admin', 'un compte SMS n\'est jamais administrateur');
  assert.equal((await call('GET', '/v1/me', v.body.jeton + 'x')).status, 401, 'jeton altéré refusé');
});

test('SMS : limite de demandes par numéro', async () => {
  let dernier = 0;
  for (let i = 0; i < 7; i++) dernier = (await call('POST', '/auth/sms/envoyer', undefined, { telephone: '+24107000001' })).status;
  assert.equal(dernier, 429);
});

test('contenus : modèle CSV, vérification, import, lecture publique, références, export', async () => {
  const csv = 'id,titre,ordre,publie\nntina,Ntina,1,oui\nbrouillon,Brouillon,2,non\n';
  assert.equal((await call('POST', '/v1/admin/contenus/parcours/import', (await user()).token, { texte: csv, mode: 'ajouter' })).status, 403);
  const v = await call('POST', '/v1/admin/contenus/parcours/import', ADMIN, { texte: csv, mode: 'verifier' });
  assert.equal(v.status, 200); assert.equal(v.body.valides, 2); assert.equal(v.body.ecritureFaite, false);
  assert.equal((await call('GET', '/pub/contenus/parcours')).body.lignes.length, 0, 'rien n\'est écrit en mode vérifier');
  const i = await call('POST', '/v1/admin/contenus/parcours/import', ADMIN, { texte: csv, mode: 'ajouter' });
  assert.equal(i.body.ecrit, 2);
  const pub = await call('GET', '/pub/contenus/parcours');
  assert.equal(pub.body.lignes.length, 1, 'seuls les contenus publiés sont visibles'); assert.equal(pub.body.lignes[0].id, 'ntina');
  // erreurs : rien n'est écrit sauf mode partiel
  const mauvais = await call('POST', '/v1/admin/contenus/unites/import', ADMIN, { lignes: [{ id: 'u1', parcours_id: 'ntina', titre: 'A', publie: 'oui' }, { id: 'u2', parcours_id: 'x', publie: 'oui' }], mode: 'ajouter' });
  assert.equal(mauvais.body.bloque, true); assert.ok(mauvais.body.erreurs.some((e: any) => e.champ === 'titre'));
  const partiel = await call('POST', '/v1/admin/contenus/unites/import', ADMIN, { lignes: [{ id: 'u1', parcours_id: 'ntina', titre: 'A', publie: 'oui' }, { id: 'u2', parcours_id: 'x', publie: 'oui' }], mode: 'ajouter', partiel: true });
  assert.equal(partiel.body.ecrit, 1);
  const ref = await call('POST', '/v1/admin/contenus/unites/import', ADMIN, { lignes: [{ id: 'u3', parcours_id: 'inconnu', titre: 'B' }], mode: 'verifier' });
  assert.ok(ref.body.avertissements.some((a: any) => /référence inconnue/.test(a.message)));
  // remplacer supprime ce qui n'est plus dans le fichier
  await call('POST', '/v1/admin/contenus/parcours/import', ADMIN, { texte: 'id,titre,publie\nogendo,Ogèndo,oui\n', mode: 'remplacer' });
  assert.deepEqual((await call('GET', '/pub/contenus/parcours')).body.lignes.map((l: any) => l.id), ['ogendo']);
  const exp = await call('GET', '/v1/admin/contenus/parcours/export?format=csv', ADMIN);
  assert.match(exp.body, /ogendo/);
  assert.equal((await call('GET', '/pub/contenus/inconnue')).status, 404);
  const stats = await call('GET', '/v1/admin/contenus', ADMIN);
  assert.ok(stats.body.find((x: any) => x.collection === 'parcours').publies >= 1);
});

test('interrupteurs : la console remplace les variables, la salle des paris reste fermée', async () => {
  const avant = await call('GET', '/pub/modules');
  assert.equal(avant.body.fonctions.assistantIA, true);
  const r = await call('PUT', '/v1/admin/parametres/fonctions', ADMIN, { valeur: { assistantIA: false, salleParis: true } });
  assert.equal(r.status, 200);
  const apres = await call('GET', '/pub/modules');
  assert.equal(apres.body.fonctions.assistantIA, false); assert.equal(apres.body.fonctions.salleParis, false);
  await call('PUT', '/v1/admin/parametres/fonctions', ADMIN, { valeur: { assistantIA: true } });
  assert.equal((await call('PUT', '/v1/admin/parametres/fonctions', (await user()).token, { valeur: {} })).status, 403);
});

test('leçons et parties : XP côté serveur, une seule récompense par leçon, plafond, succès', async () => {
  await call('POST', '/v1/admin/contenus/lecons/import', ADMIN, { lignes: [{ id: 'l1', unite_id: 'u1', titre: 'Bonjour', xp: 15, publie: 'oui' }], mode: 'ajouter', partiel: true });
  await call('POST', '/v1/admin/contenus/jeux/import', ADMIN, { lignes: [{ id: 'pendu', salle_id: 's', titre: 'Pendu', moteur: 'pendu', publie: 'oui' }], mode: 'ajouter', partiel: true });
  await call('POST', '/v1/admin/contenus/succes/import', ADMIN, { lignes: [{ id: 's1', titre: 'Première partie', condition: 'parties', seuil: 1, xp: 10, publie: 'oui' }], mode: 'ajouter' });
  const u = await user();
  const l1 = await call('POST', '/v1/progression/lecon', u.token, { leconId: 'l1', bonnes: 4, erreurs: 1 });
  assert.equal(l1.status, 200); assert.equal(l1.body.xpGagne, 15); assert.equal(l1.body.serie, 1);
  const l2 = await call('POST', '/v1/progression/lecon', u.token, { leconId: 'l1', bonnes: 5, erreurs: 0 });
  assert.equal(l2.body.xpGagne, 0, 'pas de double récompense');
  assert.equal((await call('POST', '/v1/progression/lecon', u.token, { leconId: 'nulle', bonnes: 1, erreurs: 0 })).status, 404);
  assert.equal((await call('POST', '/v1/progression/lecon', u.token, { leconId: 'l1', bonnes: 999, erreurs: 0 })).status, 400);
  const p = await call('POST', '/v1/jeux/partie', u.token, { jeuId: 'pendu', bonnes: 5, erreurs: 1, secondesRestantes: 30 });
  assert.equal(p.status, 200); assert.equal(p.body.score, 500 - 25 + 30);
  assert.equal(p.body.succesDebloques.length, 1); assert.ok(p.body.xpGagne >= 10);
  const p2 = await call('POST', '/v1/jeux/partie', u.token, { jeuId: 'pendu', bonnes: 5, erreurs: 0 });
  assert.equal(p2.body.succesDebloques.length, 0, 'un succès ne se débloque qu\'une fois');
  const prog = await call('GET', '/v1/progression', u.token);
  assert.equal(prog.body.parties, 2); assert.ok(prog.body.xp >= 25);
  const u1 = await call('POST', '/v1/progression/unite', u.token, { uniteId: 'u1', bonnes: 4, sur: 5 });
  assert.equal(u1.body.valide, true);
  assert.equal((await call('POST', '/v1/progression/unite', u.token, { uniteId: 'u2', bonnes: 3, sur: 5 })).body.valide, false);
  const cl = await call('GET', '/v1/jeux/classement?portee=semaine', u.token);
  assert.equal(cl.body.classement[0].id, u.uid); assert.equal(cl.body.maPlace, 1);
});

test('IA : désactivée, comptage des jetons, quota, enfants plus limités', async () => {
  const u = await user();
  await call('PUT', '/v1/admin/parametres/fonctions', ADMIN, { valeur: { assistantIA: false } });
  assert.equal((await call('POST', '/v1/ia/message', u.token, { message: 'Mbolo' })).status, 503);
  await call('PUT', '/v1/admin/parametres/fonctions', ADMIN, { valeur: { assistantIA: true } });
  const r = await call('POST', '/v1/ia/message', u.token, { message: 'Comment dit-on merci ?' });
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.usage.entree, 100);
  const us = await call('GET', '/v1/ia/usage', u.token);
  assert.equal(us.body.consommation.jour, 120);
  assert.equal((await call('POST', '/v1/ia/message', u.token, { message: '' })).status, 400);
  await call('PUT', '/v1/admin/parametres/ia_quotas', ADMIN, { valeur: { parJour: 1000, parMois: 100000, parConversation: 1000 } });
  const q = await call('POST', '/v1/ia/message', u.token, { message: 'Encore', conversationId: r.body.conversationId });
  assert.equal(q.status, 429, 'l\'estimation avant envoi dépasse le quota');
  await call('PUT', '/v1/admin/parametres/ia_quotas', ADMIN, { valeur: { parJour: 2000, parMois: 100000, parConversation: 2000 } });
  const enf = await user(false);
  assert.equal((await call('POST', '/v1/ia/message', enf.token, { message: 'Bonjour' })).status, 429, 'quota enfant = ¼ : 500 jetons < estimation');
  await call('PUT', '/v1/admin/parametres/ia_quotas', ADMIN, { valeur: { parJour: 20000, parMois: 300000, parConversation: 8000 } });
});

test('publicité : zone, enfant, abonné, récompense plafonnée', async () => {
  await call('POST', '/v1/admin/contenus/pub_creations/import', ADMIN, { lignes: [{ id: 'p1', zone: 'bandeau_accueil', texte_alt: 'Annonce', annonceur: 'Test', publie: 'oui' }, { id: 'p2', zone: 'recompense_coeur', texte_alt: 'Récompense', publie: 'oui' }], mode: 'ajouter' });
  const a = await user(), e = await user(false);
  assert.equal((await call('GET', '/v1/pub?zone=bandeau_accueil', a.token)).body.pub.id, 'p1');
  assert.equal((await call('GET', '/v1/pub?zone=bandeau_accueil&activite=1', a.token)).body.pub, null, 'jamais pendant une activité');
  assert.equal((await call('GET', '/v1/pub?zone=bandeau_accueil', e.token)).body.pub, null, 'jamais pour un enfant');
  assert.equal((await call('GET', '/v1/pub?zone=nulle', a.token)).status, 400);
  await call('POST', '/v1/admin/droits', ADMIN, { userId: a.uid, type: 'abonnement', jours: 30 });
  assert.equal((await call('GET', '/v1/pub?zone=bandeau_accueil', a.token)).body.pub, null, 'l\'abonné ne voit plus de publicité');
  const b = await user();
  assert.equal((await call('POST', '/v1/pub/recompense', b.token, { creationId: 'p2', tempsVuMs: 1000 })).status, 400);
  for (let i = 0; i < 3; i++) assert.equal((await call('POST', '/v1/pub/recompense', b.token, { creationId: 'p2', tempsVuMs: 6000 })).body.accorde, true);
  assert.equal((await call('POST', '/v1/pub/recompense', b.token, { creationId: 'p2', tempsVuMs: 6000 })).status, 429, '3 par jour au plus');
  assert.equal((await call('POST', '/v1/pub/recompense', e.token, { creationId: 'p2', tempsVuMs: 6000 })).status, 403, 'jamais pour un enfant');
});

test('droits : accès payant, licence de lecture', async () => {
  await call('POST', '/v1/admin/contenus/cours_artisans/import', ADMIN, { lignes: [{ id: 'c1', titre: 'Cours', artisan: 'A', niveau_acces: 'abonnement', publie: 'oui' }], mode: 'ajouter' });
  const u = await user();
  assert.equal((await call('POST', '/v1/acces/verifier', u.token, { collection: 'cours_artisans', id: 'c1' })).body.autorise, false);
  assert.equal((await call('POST', '/v1/lecture/licence', u.token, { collection: 'cours_artisans', id: 'c1' })).status, 402);
  await call('POST', '/v1/admin/droits', ADMIN, { userId: u.uid, type: 'abonnement', jours: 30 });
  assert.equal((await call('POST', '/v1/acces/verifier', u.token, { collection: 'cours_artisans', id: 'c1' })).body.autorise, true);
  const lic = await call('POST', '/v1/lecture/licence', u.token, { collection: 'cours_artisans', id: 'c1' });
  assert.equal(lic.status, 200); assert.equal(lic.body.filigrane.length, 10);
  assert.equal((await call('POST', '/v1/achats/recu', u.token, {})).status, 400, 'reçu vide refusé');
});

test('annonces : quota mensuel, modération avant publication, lecture publique', async () => {
  const u = await user();
  await call('POST', '/v1/admin/contenus/categories_annonces/import', ADMIN, { lignes: [{ id: 'logement', titre: 'Logement', quota_gratuit: 2, publie: 'oui' }], mode: 'ajouter' });
  const a1 = await call('POST', '/v1/utilisateur/annonces', u.token, { titre: 'Studio', categorie_id: 'logement', prix: 50000 });
  assert.equal(a1.status, 201); assert.equal(a1.body.statut, 'en_attente');
  assert.equal((await call('GET', '/pub/annonces?categorie=logement')).body.length, 0, 'rien avant modération');
  await call('POST', '/v1/utilisateur/annonces', u.token, { titre: 'Maison', categorie_id: 'logement' });
  assert.equal((await call('POST', '/v1/utilisateur/annonces', u.token, { titre: 'Trop', categorie_id: 'logement' })).status, 429);
  assert.equal((await call('POST', '/v1/admin/moderation/annonces/' + a1.body.id, u.token, { decision: 'publier' })).status, 403);
  const file = await call('GET', '/v1/admin/moderation?collection=annonces', ADMIN);
  assert.ok(file.body.length >= 2);
  await call('POST', '/v1/admin/moderation/annonces/' + a1.body.id, ADMIN, { decision: 'publier' });
  assert.equal((await call('GET', '/pub/annonces?categorie=logement')).body.length, 1);
  assert.equal((await call('GET', '/v1/utilisateur/annonces', u.token)).body.length, 2);
});

test('sondages : un vote par compte, résultats publics', async () => {
  await call('POST', '/v1/admin/contenus/sondages/import', ADMIN, { lignes: [{ id: 's1', question: 'Quoi ?', options: 'A|B', publie: 'oui' }], mode: 'ajouter' });
  const u = await user();
  assert.equal((await call('POST', '/v1/sondages/s1/voter', u.token, { choix: 'Z' })).status, 400);
  await call('POST', '/v1/sondages/s1/voter', u.token, { choix: 'A' });
  await call('POST', '/v1/sondages/s1/voter', u.token, { choix: 'B' });
  const r = await call('GET', '/pub/sondages/s1/resultats');
  assert.deepEqual(r.body.resultats, { A: 0, B: 1 }); assert.equal(r.body.total, 1);
});

test('cours à distance : quatre personnes au plus par groupe, signaux acheminés', async () => {
  const [h, b, c, d, e] = [await user(), await user(), await user(), await user(), await user()];
  const s = await call('POST', '/v1/appels', h.token, { titre: 'Classe' });
  const id = s.body.id;
  for (const x of [b, c, d]) assert.equal((await call('POST', `/v1/appels/${id}/rejoindre`, x.token)).status, 200);
  const plein = await call('POST', `/v1/appels/${id}/rejoindre`, e.token);
  assert.equal(plein.status, 409); assert.match(plein.body.error, /4 personnes/);
  assert.equal((await call('POST', `/v1/appels/${id}/signal`, e.token, { a: h.uid, data: {} })).status, 403, 'un non-membre ne peut rien envoyer');
  await call('POST', `/v1/appels/${id}/signal`, b.token, { a: h.uid, data: { sdp: 'offre' } });
  const lu = await call('GET', `/v1/appels/${id}?depuis=0`, h.token);
  assert.equal(lu.body.membres.length, 4); assert.equal(lu.body.signaux.length, 1);
  assert.equal((await call('GET', `/v1/appels/${id}?depuis=0`, c.token)).body.signaux.length, 0, 'un signal n\'est lu que par son destinataire');
  await call('POST', `/v1/appels/${id}/quitter`, d.token);
  assert.equal((await call('POST', `/v1/appels/${id}/rejoindre`, e.token)).status, 200, 'une place libérée est reprenable');
  assert.ok((await call('GET', '/v1/appels/ice', h.token)).body.iceServers.length >= 1);
});

test('supervision : indicateurs et branchements', async () => {
  assert.equal((await call('GET', '/v1/admin/supervision', (await user()).token)).status, 403);
  const s = await call('GET', '/v1/admin/supervision', ADMIN);
  assert.equal(s.status, 200, JSON.stringify(s.body)); assert.ok(s.body.utilisateurs.total > 0); assert.ok(s.body.ia.requetes_7j >= 1);
  assert.equal(s.body.branchements.ia, false);
  const sr = await call('GET', '/v1/admin/supervision/series?jours=7', ADMIN);
  assert.equal(sr.status, 200, JSON.stringify(sr.body)); assert.equal(sr.body.inscriptions.length, 7);
  const j = await call('GET', '/v1/admin/journal', ADMIN);
  assert.ok(j.body.length > 0);
});

test('duels : un seul score par joueur, deux joueurs au plus, résultat partagé', async () => {
  const [a, b, c] = [await user(), await user(), await user()];
  const d = await call('POST', '/v1/duels', a.token);
  assert.equal(d.status, 201);
  assert.equal((await call('POST', `/v1/duels/${d.body.id}/jouer`, a.token, { score: 5000 })).status, 400, 'score plausible');
  const r1 = await call('POST', `/v1/duels/${d.body.id}/jouer`, a.token, { score: 200 });
  assert.equal(r1.body.termine, false);
  assert.equal((await call('POST', `/v1/duels/${d.body.id}/jouer`, a.token, { score: 300 })).status, 409, 'un seul score par joueur');
  const r2 = await call('POST', `/v1/duels/${d.body.id}/jouer`, b.token, { score: 300 });
  assert.equal(r2.body.termine, true); assert.equal(r2.body.scores[a.uid], 200);
  assert.equal((await call('POST', `/v1/duels/${d.body.id}/jouer`, c.token, { score: 100 })).status, 409, 'duel complet');
  assert.equal((await call('GET', `/v1/duels/${d.body.id}`, c.token)).body.seed, d.body.seed);
  assert.equal((await call('GET', '/v1/duels/introuvable', a.token)).status, 404);
});

test('administrateur désigné par numéro (ADMIN_TELEPHONES) après connexion SMS', async () => {
  const v = await call('POST', '/auth/sms/verifier', undefined, { telephone: '+24100000009', code: '123456' });
  assert.equal(v.status, 200);
  assert.equal((await call('GET', '/v1/admin/supervision', v.body.jeton)).status, 200);
  const autre = await call('POST', '/auth/sms/verifier', undefined, { telephone: '+24100000008', code: '123456' });
  assert.equal((await call('GET', '/v1/admin/supervision', autre.body.jeton)).status, 403);
});

test('IA : prompts versionnés, documents, RAG, essai, réglages, RunPod simulé', async () => {
  const u = await user();
  assert.equal((await call('GET', '/v1/admin/ia/etat', u.token)).status, 403);
  const e = await call('GET', '/v1/admin/ia/etat', ADMIN);
  assert.equal(e.body.embedding.nom, 'simulation'); assert.equal(e.body.runpod.simule, true);
  const doc = await call('POST', '/v1/admin/ia/documents', ADMIN, { titre: 'Pêche', source: '[TEST]', texte: 'Le poisson capitaine se pêche à la lagune de Port-Gentil avec un filet. La pirogue part avant l\'aube.\n\nLe sel sert à conserver le poisson fumé.' });
  assert.equal(doc.status, 201); assert.ok(doc.body.chunks >= 1);
  await call('POST', '/v1/admin/ia/documents', ADMIN, { titre: 'Musique', texte: 'La rumba gabonaise utilise la guitare et le balafon pendant les fêtes de village.' });
  const r = await call('POST', '/v1/admin/ia/rag/rechercher', ADMIN, { requete: 'comment pêcher le poisson avec un filet' });
  assert.equal(r.body.resultats[0].titre, 'Pêche');
  const t = await call('POST', '/v1/admin/ia/tester', ADMIN, { message: 'comment pêcher le poisson ?' });
  assert.equal(t.status, 200); assert.ok(t.body.systeme.includes('### Contexte')); assert.ok(t.body.systeme.includes('Mbolo')); assert.ok(t.body.contexte.length >= 1);
  const p1 = await call('POST', '/v1/admin/ia/prompts', ADMIN, { nom: 'v1', contenu: 'Tu es un assistant de test pour Nkala. Réponds court. Lexique : {{lexique}}', activer: true });
  assert.equal(p1.status, 201);
  const t2 = await call('POST', '/v1/admin/ia/tester', ADMIN, { message: 'Bonjour' });
  assert.ok(t2.body.systeme.startsWith('Tu es un assistant de test'));
  assert.equal((await call('POST', '/v1/admin/ia/prompts', ADMIN, { contenu: 'court' })).status, 400);
  await call('POST', '/v1/admin/ia/prompts/defaut', ADMIN);
  assert.ok((await call('POST', '/v1/admin/ia/tester', ADMIN, { message: 'Bonjour' })).body.systeme.includes('Ozangué'));
  await call('PUT', '/v1/admin/ia/config', ADMIN, { ragActif: false, topK: 2, temperature: 5 });
  const cfg = (await call('GET', '/v1/admin/ia/etat', ADMIN)).body.config;
  assert.equal(cfg.ragActif, false); assert.equal(cfg.topK, 2); assert.equal(cfg.temperature, 0.3, 'valeur hors bornes ignorée');
  assert.ok(!(await call('POST', '/v1/admin/ia/tester', ADMIN, { message: 'poisson filet' })).body.systeme.includes('### Contexte'), 'RAG coupé');
  await call('PUT', '/v1/admin/ia/config', ADMIN, { ragActif: true });
  await call('DELETE', `/v1/admin/ia/documents/${doc.body.id}`, ADMIN);
  assert.equal((await call('GET', '/v1/admin/ia/documents', ADMIN)).body.length, 1);
  const rp = await call('GET', '/v1/admin/runpod/etat', ADMIN);
  assert.equal(rp.body.simule, true); assert.ok(rp.body.pods.length >= 1);
  assert.equal((await call('POST', '/v1/admin/runpod/pods/pod-sim-1/stop', ADMIN)).body.ok, true);
  assert.equal((await call('POST', '/v1/admin/runpod/pods/x/danse', ADMIN)).status, 400);
});

test('régie : annonceur, campagne, création, statut, fil sponsorisé, statistiques', async () => {
  const an = await call('POST', '/v1/admin/regie/annonceurs', ADMIN, { nom: 'Boulangerie Test' });
  const ca = await call('POST', '/v1/admin/regie/campagnes', ADMIN, { annonceur_id: an.body.id, nom: 'Lancement', plafond_jour: 1000 });
  assert.equal((await call('POST', '/v1/admin/regie/campagnes', ADMIN, { annonceur_id: 'nul', nom: 'x' })).status, 404);
  await call('POST', '/v1/admin/regie/creations', ADMIN, { zone: 'annonce_dans_liste', campagne_id: ca.body.id, texte_alt: 'Pain frais', titre: 'Pain frais tous les matins', annonceur: 'Boulangerie Test', format: 'natif', cta: 'Appeler', lien: 'https://exemple.ga' });
  const u = await user();
  assert.equal((await call('GET', '/v1/pub/fil?zone=annonce_dans_liste', u.token)).body.pubs.length, 0, 'campagne en brouillon : rien servi');
  await call('POST', `/v1/admin/regie/campagnes/${ca.body.id}/statut`, ADMIN, { statut: 'active' });
  const f = await call('GET', '/v1/pub/fil?zone=annonce_dans_liste&n=3', u.token);
  assert.equal(f.body.pubs.length >= 1, true); assert.equal(f.body.pubs[0].cta, 'Appeler'); assert.equal(f.body.pubs[0].format, 'natif');
  await call('POST', '/v1/pub/evenement', u.token, { type: 'affichage', creationId: f.body.pubs[0].id, zone: 'annonce_dans_liste' });
  await call('POST', '/v1/pub/evenement', u.token, { type: 'clic', creationId: f.body.pubs[0].id, zone: 'annonce_dans_liste' });
  const camps = await call('GET', '/v1/admin/regie/campagnes', ADMIN);
  const k = camps.body.find((x: any) => x.id === ca.body.id); assert.equal(k.affichages, 1); assert.equal(k.clics, 1);
  assert.ok((await call('GET', '/v1/admin/regie/stats?jours=7', ADMIN)).body.length >= 1);
  const enf = await user(false);
  assert.equal((await call('GET', '/v1/pub/fil?zone=annonce_dans_liste', enf.token)).body.pubs.length, 0, 'jamais pour un enfant');
  const sync = await call('POST', '/v1/admin/regie/revive/synchroniser', ADMIN);
  assert.equal(sync.body.simule, true); assert.equal(sync.body.campagnes, 1); assert.equal(sync.body.creations, 0, 'création sans image : non envoyée');
  await call('POST', `/v1/admin/regie/campagnes/${ca.body.id}/statut`, ADMIN, { statut: 'pause' });
  assert.equal((await call('GET', '/v1/pub/fil?zone=annonce_dans_liste', u.token)).body.pubs.length, 0, 'campagne en pause : plus servie');
  assert.equal((await call('GET', '/v1/admin/regie/etat', ADMIN)).body.revive.simule, true);
});

test('notifications poussées : jeton, envoi simulé, ciblage, historique', async () => {
  const u = await user();
  assert.equal((await call('POST', '/v1/push/jeton', u.token, { jeton: 'pas-un-jeton' })).status, 400);
  assert.equal((await call('POST', '/v1/push/jeton', u.token, { jeton: 'ExponentPushToken[abcdefghijklmnop]', plateforme: 'ios' })).status, 204);
  assert.equal((await call('POST', '/v1/admin/push/envoyer', u.token, { titre: 'a', corps: 'b', cible: { tous: true } })).status, 403);
  const e = await call('POST', '/v1/admin/push/envoyer', ADMIN, { titre: 'Garde', corps: 'Pharmacies de garde ce soir', cible: { tous: true } });
  assert.equal(e.body.simule, true); assert.ok(e.body.destinataires >= 1);
  assert.equal((await call('POST', '/v1/admin/push/envoyer', ADMIN, { titre: 'x', corps: 'y', cible: { userIds: ['inconnu'] } })).body.destinataires, 0);
  assert.equal((await call('POST', '/v1/admin/push/envoyer', ADMIN, { titre: '', corps: 'y' })).status, 400);
  assert.ok((await call('GET', '/v1/admin/push/historique', ADMIN)).body.length >= 2);
});

test('achats : offres publiques, reçu simulé, abonnement sans publicité, reçu unique, magasins non configurés', async () => {
  await call('POST', '/v1/admin/contenus/produits/import', ADMIN, { lignes: [{ id: 'abo', titre: 'Plus', type: 'abonnement', prix_fcfa: 1500, periode: 'mois', publie: 'oui' }, { id: 'cours1', titre: 'Cours', type: 'achat', donne_acces: 'c9', publie: 'oui' }], mode: 'ajouter' });
  const offres = await call('GET', '/pub/produits');
  assert.equal(offres.body.mode, 'simulation'); assert.equal(offres.body.produits.length, 2);
  const u = await user();
  await call('POST', '/v1/admin/contenus/pub_creations/import', ADMIN, { lignes: [{ id: 'pb', zone: 'bandeau_accueil', texte_alt: 'x', publie: 'oui' }], mode: 'ajouter' });
  assert.ok((await call('GET', '/v1/pub?zone=bandeau_accueil', u.token)).body.pub);
  assert.equal((await call('POST', '/v1/achats/recu', u.token, { magasin: 'simulation', produitId: 'abo', recu: 'faux' })).status, 400);
  const r = await call('POST', '/v1/achats/recu', u.token, { magasin: 'simulation', produitId: 'abo', recu: 'simule:achat-0001' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await call('POST', '/v1/achats/recu', u.token, { magasin: 'simulation', produitId: 'abo', recu: 'simule:achat-0001' })).status, 409, 'reçu déjà utilisé');
  assert.equal((await call('GET', '/v1/droits', u.token)).body.abonne, true);
  assert.equal((await call('GET', '/v1/pub?zone=bandeau_accueil', u.token)).body.pub, null, 'abonné : plus de publicité');
  await call('POST', '/v1/achats/recu', u.token, { magasin: 'simulation', produitId: 'cours1', recu: 'simule:achat-0002' });
  assert.ok((await call('GET', '/v1/droits', u.token)).body.achats.includes('c9'));
  assert.equal((await call('POST', '/v1/achats/recu', u.token, { magasin: 'apple', produitId: 'abo', recu: 'x' })).status, 501);
  assert.equal((await call('POST', '/v1/achats/recu', u.token, { magasin: 'google', produitId: 'abo', recu: 'x' })).status, 501);
  assert.equal((await call('POST', '/v1/achats/recu', u.token, { magasin: 'simulation', produitId: 'nul', recu: 'simule:achat-0003' })).status, 404);
});

test('médias chiffrés : licence → liste HLS réécrite → clé AES-128 ; jeton absent ou d\'un autre contenu refusé', async () => {
  const { cleContenu } = await import('../src/media.ts');
  await call('POST', '/v1/admin/contenus/titres/import', ADMIN, { lignes: [{ id: 'secret1', album_id: 'a', titre: 'Titre protégé', niveau_acces: 'abonnement', protege: 'oui', publie: 'oui' }, { id: 'secret2', album_id: 'a', titre: 'Autre', niveau_acces: 'libre', protege: 'oui', publie: 'oui' }], mode: 'ajouter', partiel: true });
  fichiers.set('media/titres/secret1/index.m3u8', Buffer.from('#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-KEY:METHOD=AES-128,URI="{{CLE}}"\n#EXTINF:6.0,\nseg00001.ts\n#EXTINF:6.0,\nseg00002.ts\n#EXT-X-ENDLIST\n'));
  const u = await user();
  assert.equal((await call('POST', '/v1/lecture/licence', u.token, { collection: 'titres', id: 'secret1' })).status, 402, 'sans abonnement');
  await call('POST', '/v1/admin/droits', ADMIN, { userId: u.uid, type: 'abonnement', jours: 30 });
  const lic = await call('POST', '/v1/lecture/licence', u.token, { collection: 'titres', id: 'secret1' });
  assert.equal(lic.status, 200); assert.equal(lic.body.protection.segmentsChiffres, true); assert.match(lic.body.urlHls, /\/media\/hls\/titres\/secret1\.m3u8\?t=/);
  const chemin = lic.body.urlHls.replace(/^https?:\/\/[^/]+/, '');
  const pl = await app.inject({ method: 'GET', url: chemin });
  assert.equal(pl.statusCode, 200); assert.match(pl.headers['content-type'] as string, /mpegurl/);
  assert.match(pl.body, /URI="https?:\/\/[^"]+\/media\/cle\/titres\/secret1\?t=/); assert.match(pl.body, /https:\/\/media\.test\/get\/media\/titres\/secret1\/seg00001\.ts/); assert.ok(!pl.body.includes('{{CLE}}'));
  const cleUrl = /URI="([^"]+)"/.exec(pl.body)![1].replace(/^https?:\/\/[^/]+/, '');
  const cle = await app.inject({ method: 'GET', url: cleUrl });
  assert.equal(cle.statusCode, 200); assert.equal(cle.rawPayload.length, 16);
  assert.deepEqual(cle.rawPayload, cleContenu('secret-de-test-0123456789abcdef', 'titres', 'secret1'));
  assert.equal(cle.headers['cache-control'], 'no-store');
  assert.equal((await app.inject({ method: 'GET', url: '/media/hls/titres/secret1.m3u8' })).statusCode, 403, 'sans licence');
  assert.equal((await app.inject({ method: 'GET', url: cleUrl.replace('secret1', 'secret2') })).statusCode, 403, 'licence d\'un autre contenu');
  assert.equal((await app.inject({ method: 'GET', url: '/media/cle/titres/secret1?t=abc' })).statusCode, 403, 'jeton falsifié');
  assert.equal((await call('POST', '/v1/lecture/licence', u.token, { collection: 'titres', id: 'secret2' })).body.urlHls !== null, true);
});
