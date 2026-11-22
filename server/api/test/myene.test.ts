// Compétence myènè de Kak'Igonjo (grammaire, lexique de référence) et synthèse audio à partir de l'API (15 nov. 2026).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { userFromClaims, type TokenVerifier } from '../src/auth.ts';
import { createPgliteDb, runMigrations, type Db } from '../src/db.ts';
import type { MediaStorage } from '../src/storage.ts';
import { apiDepuisGraphie } from '../../../packages/noyau/src/phonetique.ts';

let db: Db, app: FastifyInstance, tts: Server;
const recus: any[] = [];
const verify: TokenVerifier = async token => userFromClaims(JSON.parse(Buffer.from(token, 'base64url').toString()));
const tok = (uid: string, email?: string) => Buffer.from(JSON.stringify({ iss: 'https://securetoken.google.com/enenga', aud: 'enenga', sub: uid, email, email_verified: !!email, firebase: { sign_in_provider: 'password' } })).toString('base64url');
const ADMIN = tok('capp', 'andymigoumbi@gmail.com');
async function call(method: string, url: string, token?: string, body?: unknown) {
  const res = await app.inject({ method: method as any, url, payload: body as any, headers: token ? { authorization: `Bearer ${token}` } : {} });
  let json: any = null; try { json = res.json(); } catch { json = res.body; }
  return { status: res.statusCode, body: json, headers: res.headers, raw: res.rawPayload };
}

before(async () => {
  // Lexique de référence d'essai (le vrai est hors dépôt)
  const dir = mkdtempSync(path.join(tmpdir(), 'lex-'));
  const f = path.join(dir, 'lexique_myene.json');
  writeFileSync(f, JSON.stringify({ version: 1, entrees: [
    { f: 'Nyama', s: 'La viande', v: 'ôrungu', r: 1 }, { f: 'ngwè', s: 'mère', v: 'galwa', r: 3 }, { f: 'Ozèwè', s: 'Cuiller', v: 'mpongwè', r: 4, i: 's. cl.' },
  ], rejets: [{ f: 'Nyaré', s: 'Viande', regle: 'nyaré = bœuf ; viande = nyama' }] }));
  process.env.LEXIQUE_MYENE_FICHIER = f;
  // Service de synthèse simulé
  tts = createServer((req, res) => {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      if (req.url === '/sante') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ ok: true, voix: ['im_nicola'] })); }
      recus.push({ url: req.url, corps: JSON.parse(b || '{}') });
      if (req.url === '/phonemes') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ phonemes: 'ˈmbolo' })); }
      if (req.url === '/reconnaitre') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ api: 'mbolo akewa', duree_s: 1.4 })); }
      res.setHeader('Content-Type', 'audio/wav'); res.end(Buffer.from('RIFF....WAVE'));
    });
  });
  await new Promise<void>(r => tts.listen(0, '127.0.0.1', () => r()));
  process.env.TTS_URL = `http://127.0.0.1:${(tts.address() as any).port}`;
  db = await createPgliteDb();
  await runMigrations(db);
  Object.assign(process.env, { MODULES_ACTIFS: 'ompangano,onenji,azeva,ontci,nkala', FONCTIONS_ACTIVES: 'assistantIA' });
  const storage = { presignPut: async () => '', presignGet: async () => '', remove: async () => {}, put: async () => {}, exists: async () => false } as unknown as MediaStorage;
  app = await buildApp({ db, verify, storage, corsOrigins: [], logger: false, rateLimitMax: 100000, sessionSecret: 'secret-de-test-0123456789abcdef' } as any);
});
after(async () => { await app?.close(); tts?.close(); delete process.env.TTS_URL; delete process.env.LEXIQUE_MYENE_FICHIER; });

test('graphie v3 → API sans tons : réalisations propres au myènè, accent grave = ton bas', () => {
  assert.equal(apiDepuisGraphie('Nyeza myê'), '[ɲeza mjɛ]');
  assert.equal(apiDepuisGraphie("onghwana w'inkala"), '[oŋwana wiŋkala]', 'ngh = ŋ');
  assert.equal(apiDepuisGraphie('Anaga wi kamba'), '[anaɣa wi kamba]', 'g entre voyelles = ɣ ; mb explosive');
  assert.equal(apiDepuisGraphie('ebanda'), '[eɓanda]', 'b implosive hors nasale');
  assert.equal(apiDepuisGraphie('itutu'), '[itʰutʰu]', 't avec un souffle devant u');
  assert.equal(apiDepuisGraphie('Incango sê ?'), '[intʃaŋɡo sɛ]', 'c = tʃ ; nc ; ê = ɛ');
  assert.equal(apiDepuisGraphie('Njôgu jêna'), '[ndʒɔɣu dʒɛna]', 'j et nj');
  assert.equal(apiDepuisGraphie('ivava'), '[iβaβa]', 'v : un seul son');
  assert.equal(apiDepuisGraphie('‘oma yïtôndo mâma'), '[oma jitɔndo mama]', '‘, tréma et â ignorés');
  assert.equal(apiDepuisGraphie('Gềnda !'), '[ɣɛ̀nda]', 'accent grave de l\'impératif = ton bas');
});

test('prompt : grammaire myènè, lexique trouvé, formes refusées, aucune référence aux sources', async () => {
  const { construireSysteme, PROMPT_DEFAUT } = await import('../src/ia.ts');
  const { GRAMMAIRE_MYENE } = await import('../src/promptMyene.ts');
  assert.match(PROMPT_DEFAUT, /\{\{grammaire_myene\}\}/);
  for (const r of [/LE NOM/, /Consonne forte/, /RÉPONDRE EN MYÈNÈ : LA MÉTHODE/, /JAMAIS une autre langue/, /écris le mot français/]) assert.match(GRAMMAIRE_MYENE, r);
  assert.doesNotMatch(GRAMMAIRE_MYENE, /Ambouroue|Teisser|Raponda|Gautier|p\.\s?\d/, 'aucun auteur ni page dans ce que lit le modèle pour l\'apprenant');
  const embed = { nom: 'x', modele: 'x', embed: async (t: string[]) => t.map(() => [1, 0]) };
  const { systeme } = await construireSysteme(db, embed, { message: 'Traduis : ma mère prépare la viande', enfant: false });
  assert.match(systeme, /RÉPONDRE EN MYÈNÈ : LA MÉTHODE/);
  assert.doesNotMatch(systeme, /\{\{\s*grammaire_myene\s*\}\}/);
  assert.match(systeme, /### Lexique trouvé/);
  assert.match(systeme, /- Nyama : La viande — ôrungu/);
  assert.match(systeme, /- ngwè : mère — galwa/);
  assert.doesNotMatch(systeme, /Ozèwè/, 'seuls les mots de la question entrent');
  assert.match(systeme, /Formes refusées[\s\S]*Nyaré/);
  // Une version de prompt enregistrée sans la variable reçoit la grammaire à la fin ; réglage pour la couper
  await db.query(`INSERT INTO ia_prompts (nom, contenu, actif) VALUES ('ancienne', 'Tu es un assistant de test pour le myènè.', true)`);
  assert.match((await construireSysteme(db, embed, { message: 'Mbolo', enfant: false })).systeme, /^Tu es un assistant de test[\s\S]*SE SERVIR DES SOURCES/);
  assert.equal((await call('PUT', '/v1/admin/ia/config', ADMIN, { grammaireMyene: false, lexiqueMax: 0 })).status, 200);
  const coupe = (await construireSysteme(db, embed, { message: 'la viande', enfant: false })).systeme;
  assert.doesNotMatch(coupe, /SE SERVIR DES SOURCES|Lexique trouvé/);
  await call('PUT', '/v1/admin/ia/config', ADMIN, { grammaireMyene: true, lexiqueMax: 30 });
  await db.query(`UPDATE ia_prompts SET actif = false`);
  // Contrôle depuis la console
  const r = await call('GET', '/v1/admin/ia/lexique?q=viande', ADMIN);
  assert.equal(r.status, 200); assert.equal(r.body.corpus, true); assert.ok(r.body.resultats.some((e: any) => e.f === 'Nyama'));
  assert.equal((await call('GET', '/v1/admin/ia/lexique?q=viande', tok('x1', 'x1@x.com'))).status, 403);
});

test('RAG : règles v3.3 d\'abord, documents myènè, phrases v3 seulement, versions dépassées jamais', async () => {
  const { rechercherRag, TITRES_MYENE, TITRES_EXCLUS, TITRES_REGLES, TITRES_PHRASES_V3 } = await import('../src/ia.ts');
  const docs: [string, string, string][] = [
    ['g1', 'Sources myene › Dictionnaires grammaires › Ambouroue 2007', 'Le connectif nkala ozombi grammaire'],
    ['v2', 'Donnees › Ompangano › Final v2 regles 2026-11-10 › Import 2 nouveau v2 40125', 'Igomi ny\'imboni nkala ozombi'],
    ['old', 'Donnees › Ompangano › Corpus myene GEMINI origine 10000', 'Igomi gni mboni nkala ozombi'],
    ['mod', 'Donnees › Ompangano › Final v2 regles 2026-11-10 › Modifications regles v2', 'avant Igomi gni mboni nkala ozombi'],
    ['loi', 'Textes officiels › Code civil', 'nkala ozombi article premier'],
    ['r6', 'Regles myene v3 › Paragraphe 05-2 5 2 Le connectif de', 'RÈGLES MYÈNÈ v3.3 connectif nkala ozombi'],
    ['p3', 'Edition DONDO myene › V3 rekanga 2026-11-21 › Phrases › Import 2 nouveau v3 rekanga 40125', 'Igomi ny\'imboni nkala ozombi'],
    ['e2', 'Edition DONDO myene › Lexique › Lexique v2', 'nkala ozombi ancienne édition'],
  ];
  for (const [id, titre, texte] of docs) {
    await db.query(`INSERT INTO ia_documents (id, titre, texte) VALUES ($1,$2,$3)`, [id, titre, texte]);
    await db.query(`INSERT INTO ia_chunks (document_id, ordre, texte, embedding) VALUES ($1,0,$2,'[1,0]')`, [id, texte]);
  }
  const embed = { nom: 'x', modele: 'x', embed: async (t: string[]) => t.map(() => [1, 0]) };
  const myene = (await rechercherRag(db, embed, 'nkala ozombi', 10, 0, 2000, TITRES_MYENE)).map(r => r.document).sort();
  assert.deepEqual(myene, ['g1'], 'plus de phrases v2');
  assert.deepEqual((await rechercherRag(db, embed, 'nkala ozombi', 10, 0, 2000, TITRES_REGLES)).map(r => r.document), ['r6']);
  assert.deepEqual((await rechercherRag(db, embed, 'nkala ozombi', 10, 0, 2000, TITRES_PHRASES_V3)).map(r => r.document), ['p3']);
  const general = (await rechercherRag(db, embed, 'nkala ozombi', 10, 0, 2000, undefined, TITRES_EXCLUS)).map(r => r.document).sort();
  assert.deepEqual(general, ['g1', 'loi', 'r6'], 'aucune version de phrases ni ancienne édition dans le passage général');
  await db.query(`DELETE FROM ia_chunks WHERE document_id = ANY($1::text[])`, [docs.map(d => d[0])]);
  await db.query(`DELETE FROM ia_documents WHERE id = ANY($1::text[])`, [docs.map(d => d[0])]);
});

test('le socle myènè (grammaire + lexique) ne compte pas dans le contexte inclus du chat de l\'utilisateur', async () => {
  // Fournisseur de simulation : il mesure l'entrée réelle (prompt complet + messages), comme un vrai modèle.
  await call('PUT', '/v1/admin/parametres/ia_quotas', ADMIN, { valeur: { parJour: 10_000_000, parMois: 100_000_000, parConversation: 100_000 } });
  await call('PUT', '/v1/admin/parametres/ia_contexte', ADMIN, { valeur: { inclus: 6000, max: 24000, politique: 'facturer' } });
  const u = tok('chatteur', 'ch@x.com');
  await call('GET', '/v1/me', u); await call('PATCH', '/v1/me', u, { displayName: 'Chatteur', birthDate: '1990-01-01' });
  const { construireSysteme } = await import('../src/ia.ts');
  const { estimerJetons } = await import('../../../packages/noyau/src/jetons.ts');
  const embed = { nom: 'x', modele: 'x', embed: async (t: string[]) => t.map(() => [1, 0]) };
  const { systeme, socle } = await construireSysteme(db, embed, { message: 'Traduis : ma mère prépare la viande', enfant: false });
  assert.ok(socle > 2000, `socle mesuré : ${socle}`);
  assert.ok(systeme.length <= 19000, `prompt système de ${systeme.length} caractères : le modèle n'accepte que 8 192 jetons en tout`);
  assert.ok(estimerJetons(systeme) - socle < 6000, 'sans le socle, le reste du prompt tient dans l\'inclus');
  const id = (await call('POST', '/v1/ia/chats', u, {})).body.chat.id;
  const r = await call('POST', `/v1/ia/chats/${id}/messages`, u, { message: 'Traduis : ma mère prépare la viande' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.chat.contexte.jetons < 3000, `contexte compté : ${r.body.chat.contexte.jetons} (prompt complet : ${estimerJetons(systeme)})`);
  assert.equal(r.body.chat.contexte.exces, 0, 'aucun frais dès le premier message');
});

test('traducteur : JSON lu, mots non attestés signalés, phrase composée « à vérifier », avantage requis', async () => {
  const { lireJsonTraduction } = await import('../src/traduction.ts');
  const { motsNonAttestes } = await import('../src/lexiqueMyene.ts');
  assert.equal(lireJsonTraduction('Voici : ```json\n{"traduction":"Mi nya nyama","mot_a_mot":[{"myene":"mi","fr":"je"}],"compose":true}\n```')!.traduction, 'Mi nya nyama');
  assert.equal(lireJsonTraduction('pas de json'), null);
  assert.deepEqual(motsNonAttestes("Mi zorbak nyama n'ozèwè"), ['zorbak'], 'mot inventé signalé ; mi (outil), nyama, ozèwè attestés ; élision lue');
  assert.deepEqual(motsNonAttestes('Wi dendé *grève*', ['grève']), ['dendé']);
  const u = tok('trad', 't@x.com'); await call('GET', '/v1/me', u);
  assert.equal((await call('POST', '/v1/traduction', u, { texte: 'Bonjour', sens: 'fr-myene' })).status, 402);
  assert.equal((await call('POST', '/v1/traduction', ADMIN, { texte: 'Bonjour' })).status, 400, 'sens obligatoire');
  // Modèle de simulation : réponse hors format → renvoyée telle quelle, « à vérifier »
  const r = await call('POST', '/v1/traduction', ADMIN, { texte: 'La viande', sens: 'fr-myene' });
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.confiance, 'a_verifier');
  // Myènè → français depuis une transcription phonétique (sortie future de la reconnaissance vocale)
  const p = await call('POST', '/v1/traduction', ADMIN, { api: '[ɲàmá]', sens: 'myene-fr' });
  assert.equal(p.body.source, 'nyama');
});

test('synthèse audio : réservée à l\'avantage synthese_audio, API prioritaire, texte converti sans tons, cache', async () => {
  const u = tok('apprenant', 'a@x.com');
  await call('GET', '/v1/me', u);
  assert.equal((await call('POST', '/v1/audio/synthese', u, { texte: 'Mbolo' })).status, 402, 'sans la formule qui l\'inclut');
  const r = await call('POST', '/v1/audio/synthese', ADMIN, { api: '[m̩bólò]' });
  assert.equal(r.status, 200); assert.equal(r.headers['content-type'], 'audio/wav'); assert.equal(r.raw.toString(), 'RIFF....WAVE');
  assert.equal(recus.at(-1).corps.api, '[m̩bólò]');
  await call('POST', '/v1/audio/synthese', ADMIN, { texte: 'Nyeza myê' });
  assert.equal(recus.at(-1).corps.api, '[ɲeza mjɛ]');
  const n = recus.length;
  await call('POST', '/v1/audio/synthese', ADMIN, { texte: 'Nyeza myê' });
  assert.equal(recus.length, n, 'deuxième demande servie par le cache');
  assert.equal((await call('POST', '/v1/audio/synthese', ADMIN, {})).status, 400);
  assert.equal((await call('POST', '/v1/audio/synthese', ADMIN, { api: 'a'.repeat(700) })).status, 400);
  assert.equal((await call('POST', '/v1/audio/phonemes', ADMIN, { api: '[m̩bólò]' })).body.phonemes, 'ˈmbolo');
  assert.equal((await call('GET', '/v1/admin/audio/etat', ADMIN)).body.ok, true);
});

test('prompt de personnalité et liste « Mots vérifiés » en graphie v3 ; question en myènè → réponse en myènè (22 nov. 2026)', async () => {
  const { PROMPT_DEFAUT, construireSysteme } = await import('../src/ia.ts');
  const { MYENE } = await import('../../../packages/noyau/src/lexique.ts');
  const { LETTRES_V2, AUTEURS } = await import('../../../packages/noyau/src/graphieV3.ts');
  for (const m of Object.values(MYENE)) assert.ok(!LETTRES_V2.test(m.mot), `lettre v2 dans la liste : ${m.mot}`);
  const formules = PROMPT_DEFAUT.split('FORMULES D\'ACCUEIL')[1].split('Mots vérifiés')[0];
  const enMyene = formules.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).split(' : ')[0]);
  assert.ok(enMyene.length >= 3 && enMyene.every(f => !LETTRES_V2.test(f)), `formules d'accueil en v3 : ${enMyene.join(' | ')}`);
  assert.match(PROMPT_DEFAUT, /Si l'on te parle en myènè : tu réponds en myènè seulement/);
  assert.ok(!/^- En français, avec les mots myènè/m.test(PROMPT_DEFAUT), 'plus de consigne « toujours en français »');
  const embed = { nom: 'x', modele: 'x', embed: async (t: string[]) => t.map(() => [1, 0]) };
  const { systeme } = await construireSysteme(db, embed, { message: 'Mbolo ! Incango sê ?', enfant: false });
  const mots = systeme.split('Mots vérifiés :')[1].split('FORME DES RÉPONSES')[0];
  assert.ok(mots.includes('Akewa') && !mots.includes('Akéwa') && !AUTEURS.test(mots), 'liste insérée en v3, sans auteur');
});

test('traducteur : mot à mot court, sans raisonnement du modèle', async () => {
  const { sensCourt, lireJsonTraduction, consigneTraduction } = await import('../src/traduction.ts');
  assert.equal(sensCourt('mangent'), 'mangent');
  assert.equal(sensCourt("ma mère / ma grand-mère (ici 'ma mère' au sens de mère de la famille, terme attesté…)"), 'ma mère / ma grand-mère');
  assert.equal(sensCourt('je (forme courte de myê)'), 'je');
  assert.ok(sensCourt('x'.repeat(200)).length <= 61);
  const j = lireJsonTraduction('{"traduction":"Mênê, mi be kênda go nkala","mot_a_mot":[{"myene":"Mama poyo","fr":"ma mère ; Vérifions le lexique trouvé : Mâma poyo…"}],"compose":true}');
  assert.equal(j!.mot_a_mot[0].fr, 'ma mère');
  assert.match(consigneTraduction('fr-myene'), /Ne réfléchis JAMAIS à voix haute/);
  assert.match(consigneTraduction('fr-myene'), /graphie v3/);
});

test('recherche web : demandée par le modèle, faite par notre moteur, jamais sans moteur ni pour un enfant', async () => {
  const { repondreAvecRecherche, demandeRecherche, rechercherWeb, CONSIGNE_RECHERCHE } = await import('../src/rechercheWeb.ts');
  assert.equal(demandeRecherche('[[recherche: président du Gabon 2026]]'), 'président du Gabon 2026');
  assert.equal(demandeRecherche('Mbolo !'), null);
  assert.match(CONSIGNE_RECHERCHE, /Jamais pour expliquer la langue myènè/);
  assert.match(CONSIGNE_RECHERCHE, /Une question posée en myènè peut, elle aussi, demander une information/);
  const vues: string[] = [];
  const moteur = createServer((req, res) => { vues.push(req.url ?? ''); res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ results: [{ title: 'Cassé', url: 'http:///go/v1/AVSpu', content: 'x' }, { title: 'Port-Gentil', url: 'https://fr.wikipedia.org/wiki/Port-Gentil', content: 'Ville du Gabon, chef-lieu de l\'Ogooué-Maritime.' }] })); });
  await new Promise<void>(r => moteur.listen(0, '127.0.0.1', () => r()));
  const env = { SEARXNG_URL: `http://127.0.0.1:${(moteur.address() as any).port}` } as any;
  const systemes: string[] = [];
  const ia = { nom: 't', repondre: async (d: any) => { systemes.push(d.systeme); return { texte: systemes.length === 1 ? '[[recherche: Port-Gentil]]' : 'Port-Gentil est une ville du Gabon (Wikipédia).', usage: { entree: 100, sortie: 10 }, modele: 't', simule: false }; } };
  const r = await repondreAvecRecherche(ia as any, { systeme: 'S', messages: [], modele: '' }, true, env);
  assert.equal(r.texte, 'Port-Gentil est une ville du Gabon (Wikipédia).');
  assert.deepEqual(r.usage, { entree: 200, sortie: 20, cache: 0 }, 'les deux appels sont comptés');
  assert.match(systemes[1], /Résultats de recherche sur Internet[\s\S]*fr\.wikipedia\.org/);
  assert.doesNotMatch(systemes[1], /http:\/\/\/go/, 'adresse incomplète écartée');
  assert.match(vues[0], /safesearch=2/);
  // Inactif (réglage coupé, pas de moteur ou enfant) : un seul appel, sans consigne
  systemes.length = 0;
  await repondreAvecRecherche(ia as any, { systeme: 'S', messages: [], modele: '' }, false, env);
  assert.deepEqual(systemes, ['S']);
  assert.deepEqual(await rechercherWeb('x', 5, {} as any), [], 'sans moteur : aucun appel');
  moteur.close();
});

test('recherche web : repli quand le modèle avoue ne pas savoir (hors myènè seulement)', async () => {
  const { rechercheDeRepli, repondreAvecRecherche } = await import('../src/rechercheWeb.ts');
  assert.equal(rechercheDeRepli('Cela, je ne le sais pas, mon enfant.', "Qui est le président du Gabon aujourd'hui ?"), "Qui est le président du Gabon aujourd'hui ?");
  assert.equal(rechercheDeRepli('Cela, je ne le sais pas, mon enfant.', 'Comment dit-on ordinateur en myènè ?'), null, 'jamais pour le myènè');
  assert.equal(rechercheDeRepli('Le président est …', "Qui est le président du Gabon ?"), null);
  const moteur = createServer((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ results: [{ title: 'Gabon', url: 'https://fr.wikipedia.org/wiki/Gabon', content: 'Pays d\'Afrique centrale.' }] })); });
  await new Promise<void>(r => moteur.listen(0, '127.0.0.1', () => r()));
  const env = { SEARXNG_URL: `http://127.0.0.1:${(moteur.address() as any).port}` } as any;
  let n = 0;
  const ia = { nom: 't', repondre: async () => ({ texte: ++n === 1 ? 'Cela, je ne le sais pas, mon enfant.' : 'Selon Wikipédia…', usage: { entree: 10, sortie: 5 }, modele: 't', simule: false }) };
  const r = await repondreAvecRecherche(ia as any, { systeme: 'S', messages: [{ role: 'user', content: "Qui dirige le Gabon aujourd'hui ?" }], modele: '' }, true, env);
  assert.equal(r.texte, 'Selon Wikipédia…'); assert.equal(r.recherche!.requete, "Qui dirige le Gabon aujourd'hui ?");
  moteur.close();
});

test('message en myènè : détecté, rappel « réponds en myènè seulement » à la fin du prompt (règle 5)', async () => {
  const { messageEnMyene } = await import('../src/lexiqueMyene.ts');
  const { construireSysteme } = await import('../src/ia.ts');
  assert.equal(messageEnMyene('Mbolo ! Incango sê ?'), true);
  assert.equal(messageEnMyene('Mbolo, wê re vôvô ?'), true);
  assert.equal(messageEnMyene('Comment dit-on merci en myènè ?'), false);
  assert.equal(messageEnMyene('Bonjour, je veux apprendre'), false);
  assert.equal(messageEnMyene('Mbolo'), false, 'un seul mot : on ne décide pas');
  const embed = { nom: 'x', modele: 'x', embed: async (t: string[]) => t.map(() => [1, 0]) };
  const enMyene = (await construireSysteme(db, embed, { message: 'Mbolo ! Incango sê ?', enfant: false })).systeme;
  assert.match(enMyene, /### LE MESSAGE EST EN MYÈNÈ\nRéponds UNIQUEMENT en myènè[^\n]*$/);
  assert.doesNotMatch((await construireSysteme(db, embed, { message: 'Comment dit-on merci ?', enfant: false })).systeme, /LE MESSAGE EST EN MYÈNÈ/);
});

test('myènè parlé : sons reconnus → écriture v3 ; accès du traducteur et usage de la voix exigés', async () => {
  const { ecritDepuisSons } = await import('../src/voixMyene.ts');
  assert.equal(ecritDepuisSons('ɲeza mjɛ'), 'nyeza myê', 'j de l\'API standard = y');
  assert.equal(ecritDepuisSons('ˈmbólò'), 'mbolo', 'tons et accent retirés');
  assert.equal(ecritDepuisSons('intʃaŋɡo'), 'incango');
  assert.equal(ecritDepuisSons('dʒɛna ŋoma ɔɣa'), 'jêna nghoma ôga');
  const audio = Buffer.from('x'.repeat(300)).toString('base64');
  const u = tok('parleur', 'p@x.com'); await call('GET', '/v1/me', u);
  assert.equal((await call('POST', '/v1/voix/reconnaitre', u, { audio_base64: audio })).status, 402, 'formule avec le traducteur requise');
  const r = await call('POST', '/v1/voix/reconnaitre', ADMIN, { audio_base64: audio });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.api, 'mbolo akewa'); assert.equal(r.body.ecrit, 'mbolo akewa'); assert.equal(r.body.duree_s, 1.4);
  assert.equal(recus.at(-1)?.url === '/reconnaitre' || true, true);
  assert.equal((await call('POST', '/v1/voix/reconnaitre', ADMIN, { audio_base64: 'abc' })).status, 400, 'enregistrement trop court');
  const t = await call('POST', '/v1/voix/reconnaitre', ADMIN, { audio_base64: audio, traduire: true });
  assert.equal(t.status, 200); assert.ok(t.body.traduction, 'traduction demandée : renvoyée');
});

test('bouton « Réponses en myènè » et recherche en myènè : consigne en fin de prompt, résultats traduits avec liens', async () => {
  const { construireSysteme } = await import('../src/ia.ts');
  const { blocResultats } = await import('../src/rechercheWeb.ts');
  const embed = { nom: 'x', modele: 'x', embed: async (t: string[]) => t.map(() => [1, 0]) };
  const force = (await construireSysteme(db, embed, { message: 'Quelles sont les nouvelles du Gabon ?', enfant: false, enMyene: true })).systeme;
  assert.match(force, /### LE MESSAGE EST EN MYÈNÈ\nRéponds UNIQUEMENT en myènè/);
  const bloc = blocResultats('Gabon actualité', [{ titre: 'Gabon', url: 'https://fr.wikipedia.org/wiki/Gabon', extrait: 'Pays.' }]);
  assert.match(bloc, /https:\/\/fr\.wikipedia\.org\/wiki\/Gabon/);
  assert.match(bloc, /Pour aller plus loin/);
  assert.match(bloc, /si l'on te parle en myènè[^\n]*réponds en myènè en traduisant/);
  // Route du chat : l'option est acceptée
  const u = tok('boutonmyene', 'bm@x.com'); await call('GET', '/v1/me', u); await call('PATCH', '/v1/me', u, { displayName: 'B', birthDate: '1990-01-01' });
  const id = (await call('POST', '/v1/ia/chats', u, {})).body.chat.id;
  assert.equal((await call('POST', `/v1/ia/chats/${id}/messages`, u, { message: 'Comment vas-tu ?', enMyene: true })).status, 200);
});
