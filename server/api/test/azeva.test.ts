// Azeva côté serveur : contenu des jeux privé (servi manche par manche), 1000 niveaux, paliers par rang / formule / achat, jeton de manche.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import { importerExemples, dossierExemples } from '../src/exemples.ts';
import { creerJetonManche, lireJetonManche } from '../src/azeva.ts';
import { accesAuNiveau, paliersDuJeu, paliersParDefaut, reglesNiveau, NIVEAUX_PAR_JEU } from '../../../packages/noyau/src/difficulte.ts';
import { genererGrilleMots, grilleReussie, casesDuMot, nouvelleMemoire, questionItem, nouvellesSuites, suiteReussie, lireRythme, rythmeJuste, couperTrou, tracerChemin, PAS, positionZone } from '../../../packages/noyau/src/moteurs2.ts';

let db: Db, app: FastifyInstance;
const storage: MediaStorage = { presignPut: async () => '', presignGet: async p => `https://media.test/${p}`, remove: async () => {}, put: async () => {}, exists: async () => true, get: async () => null };
const verify: TokenVerifier = async token => userFromClaims(JSON.parse(Buffer.from(token, 'base64url').toString()));
const tok = (uid: string) => Buffer.from(JSON.stringify({ iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: uid, email: `${uid}@x.com`, email_verified: false, firebase: { sign_in_provider: 'password' } })).toString('base64url');
async function call(method: string, url: string, token?: string, body?: unknown) {
  const res = await app.inject({ method: method as any, url, payload: body as any, headers: token ? { authorization: `Bearer ${token}` } : {} });
  let json: any = null; try { json = res.json(); } catch { json = res.body; }
  return { status: res.statusCode, body: json };
}

before(async () => {
  db = await createPgliteDb(); await runMigrations(db);
  await importerExemples(db, dossierExemples());
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: false, rateLimitMax: 100000, sessionSecret: 'secret-de-test-0123456789abcdef' });
});
after(async () => { await app.close(); await db.close(); });

test('azeva : le contenu des jeux ne se lit jamais en bloc', async () => {
  for (const c of ['mots_jeux', 'jeux_items', 'plateau']) assert.equal((await call('GET', `/pub/contenus/${c}`)).status, 403, c);
  const v = await call('GET', '/pub/contenus');
  assert.ok(!('mots_jeux' in v.body.versions) && !('jeux_items' in v.body.versions));
  assert.equal((await call('GET', '/pub/contenus/jeux')).status, 200, 'la liste des jeux (sans contenu) reste publique');
});

test('azeva : manche servie par niveau, essai sans compte limité, niveau suivant après victoire', async () => {
  const m1 = await call('POST', '/pub/jeux/touche-ta-tete/manche', undefined, { niveau: 1, dialecte: 'orungu' });
  assert.equal(m1.status, 200, JSON.stringify(m1.body));
  assert.equal(m1.body.moteur, 'zones'); assert.ok(m1.body.items.length >= 3); assert.ok(m1.body.jeton);
  assert.ok(m1.body.items.length < 17 || m1.body.regles.questions * 3 + 6 >= 17, 'jamais toute la banque si elle dépasse le tirage');
  assert.deepEqual((await call('POST', '/pub/jeux/touche-ta-tete/manche', undefined, { niveau: 1 })).body.items.map((i: any) => i.id), m1.body.items.map((i: any) => i.id), 'même niveau, même contenu');
  assert.equal((await call('POST', '/pub/jeux/touche-ta-tete/manche', undefined, { niveau: 6 })).status, 401, 'sans compte : 5 niveaux');
  assert.equal((await call('POST', '/pub/jeux/touche-ta-tete/manche', undefined, { niveau: 1001 })).status, 404);

  const t = tok('joueur1'); await call('GET', '/v1/me', t);
  assert.equal((await call('POST', '/v1/jeux/touche-ta-tete/manche', t, { niveau: 2 })).status, 409, 'il faut gagner le niveau 1');
  const m = await call('POST', '/v1/jeux/touche-ta-tete/manche', t, { niveau: 1 });
  const p = await call('POST', '/v1/jeux/partie', t, { jeuId: 'touche-ta-tete', bonnes: 4, erreurs: 0, manche: m.body.jeton });
  assert.equal(p.status, 200, JSON.stringify(p.body)); assert.equal(p.body.niveau, 1); assert.equal(p.body.niveauxGagnes['touche-ta-tete'], 1);
  assert.equal((await call('POST', '/v1/jeux/touche-ta-tete/manche', t, { niveau: 2 })).status, 200);
  const n = await call('GET', '/v1/jeux/touche-ta-tete/niveaux', t);
  assert.equal(n.body.total, NIVEAUX_PAR_JEU); assert.equal(n.body.atteint, 1); assert.equal(n.body.paliers.length, 8);
  // Une partie sans jeton (ou avec le jeton d'un autre jeu) ne fait pas avancer au-delà du niveau 1.
  const autre = await call('POST', '/v1/jeux/partie', t, { jeuId: 'touche-ta-tete', bonnes: 4, erreurs: 0, manche: 'faux.jeton' });
  assert.equal(autre.body.niveau, 1);
});

test('azeva : paliers d\'Ogoni (jeux gratuits : rang et progression seulement)', async () => {
  const t = tok('joueur2'); await call('GET', '/v1/me', t);
  const n = await call('GET', '/v1/jeux/pendu/niveaux', t);
  assert.equal(n.body.paliers.length, 6);
  const p5 = n.body.paliers.find((p: any) => p.niveau === 501);
  // Jeux gratuits (13 nov. 2026) : un palier marqué « achat » ou « formule » ne demande plus rien ; seuls le rang et la progression comptent.
  assert.notEqual(p5.acces.motif, 'achat_requis');
  await db.query(`INSERT INTO progression (user_id, data) VALUES ('joueur2', '{"niveauxGagnes":{"pendu":500}}') ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data`);
  await db.query(`UPDATE users SET xp = 5000 WHERE id = 'joueur2'`);
  const m = await call('POST', '/v1/jeux/pendu/manche', t, { niveau: 501 });
  assert.equal(m.status, 200, JSON.stringify(m.body)); assert.equal(m.body.palier, 'Feu des anciens');
});

test('jeton de manche : signé, lié au compte, expirant', () => {
  const j = creerJetonManche('s', { j: 'pendu', n: 3, q: 12, x: 150, e: Date.now() + 1000, u: 'a' });
  assert.equal(lireJetonManche('s', j, 'a')?.n, 3);
  assert.equal(lireJetonManche('s', j, 'b'), null); assert.equal(lireJetonManche('autre', j, 'a'), null);
  assert.equal(lireJetonManche('s', creerJetonManche('s', { j: 'pendu', n: 3, q: 12, x: 150, e: Date.now() - 1, u: 'a' }), 'a'), null);
});

test('difficulté : 1000 niveaux qui montent, paliers par défaut et imposés', () => {
  const r1 = reglesNiveau('quiz', 1, null), r500 = reglesNiveau('quiz', 500, null), r1000 = reglesNiveau('quiz', 1000, null);
  assert.ok(r1.questions <= r500.questions && r500.questions <= r1000.questions);
  assert.ok(r1.options <= r1000.options); assert.ok(r1.xpPct < r1000.xpPct);
  assert.equal(r1.dureeS, 0, 'pas de chronomètre au début'); assert.ok(r1000.dureeS > 0);
  assert.ok(reglesNiveau('ogoni', 1, null).erreursMax > reglesNiveau('ogoni', 1000, null).erreursMax, 'moins de bûches à la fin');
  assert.equal(reglesNiveau('ogoni', 900, { id: 'x', jeu_id: 'x', niveau: 801, titre: 'x', erreurs_max: 3 }).erreursMax, 3);
  const d = paliersParDefaut('j');
  assert.equal(d.length, 8); assert.equal(d[0].niveau, 1); assert.equal(d.at(-1)!.fin, 1000);
  const p = paliersDuJeu('j', [{ jeu_id: 'j', niveau: 5, titre: 'A' }, { jeu_id: 'j', niveau: 200, titre: 'B', plans: ['complet'] }]);
  assert.equal(p[0].niveau, 1, 'le premier palier commence au niveau 1'); assert.equal(p[0].fin, 199);
  assert.equal(accesAuNiveau(250, p, 249, { rang: 8, plans: [], tout: false, achats: [] }).ok, true, 'jeux gratuits : la formule du palier est ignorée');
  assert.equal(accesAuNiveau(250, p, 249, { rang: 1, plans: ['complet'], tout: false, achats: [] }).ok, true);
  assert.equal(accesAuNiveau(6, p, 5, null, true).ok, false, 'invité : 5 niveaux');
});

test('moteurs : grilles croisées, mémoire, questions, suites, rythme, trous, chemin, zones', () => {
  const mots = ['nago', 'odo', 'ogoni', 'tavulu', 'kisini', 'owaro', 'iga', 'ntsuwa'].map((m, i) => ({ id: String(i), myene: m, francais: 'f' + i }));
  const g = genererGrilleMots(mots, 9, 6, Math.random, false);
  assert.ok(g.mots.length >= 2);
  const saisie: Record<string, string> = {};
  for (const m of g.mots) casesDuMot(m).forEach(([r, c], i) => { saisie[`${r},${c}`] = m.lettres[i]; });
  assert.ok(grilleReussie(g, saisie));
  const f = genererGrilleMots(mots, 9, 6, Math.random, true);
  for (const m of f.mots) { assert.ok(m.def); assert.equal(f.cases[m.def![0]][m.def![1]], null, 'case de définition vide'); }
  assert.equal(nouvelleMemoire(mots, 4).length, 8);
  const items = ['a', 'b', 'c', 'd'].map(x => ({ id: x, enonce: 'E' + x, reponse: 'R' + x, leurres: [] }));
  const q = questionItem(items[0], items, 4)!; assert.equal(q.options[q.bonne], 'Ra'); assert.equal(new Set(q.options).size, q.options.length);
  const s = nouvellesSuites(items.map((x, i) => ({ ...x, groupe: 'g', ordre: i + 1 })), 1)[0];
  assert.ok(suiteReussie(s, s.solution.map(x => x.id))); assert.ok(!suiteReussie(s, [...s.solution].reverse().map(x => x.id)));
  assert.ok(rythmeJuste(lireRythme('G-D-G'), ['G', 'D', 'G'])); assert.deepEqual(couperTrou('Nago ___ (trois)'), { avant: 'Nago', apres: '(trois)', trou: true });
  const c = tracerChemin(5, 6, ['haut', 'bas', 'gauche', 'droite']);
  const fin = c.chemin.reduce((p, d) => [p[0] + PAS[d][0], p[1] + PAS[d][1]] as [number, number], c.depart);
  assert.deepEqual(fin, c.arrivee);
  assert.deepEqual(positionZone({ id: 'z', enonce: 'Ewondjo', reponse: 'tete', leurres: [] }), { x: 50, y: 10 });
});
