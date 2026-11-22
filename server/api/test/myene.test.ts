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
