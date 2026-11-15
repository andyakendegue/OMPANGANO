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

test('graphie DONDO → API sans tons : réalisations propres au myènè', () => {
  assert.equal(apiDepuisGraphie('Nyéza myè'), '[ɲeza mjɛ]');
  assert.equal(apiDepuisGraphie("owana w'inkala"), '[owana wiŋkala]');
  assert.equal(apiDepuisGraphie('Anaga wi kamba'), '[anaɣa wi kamba]', 'g entre voyelles = ɣ ; mb explosive');
  assert.equal(apiDepuisGraphie('ébanda'), '[eɓanda]', 'b implosive hors nasale');
  assert.equal(apiDepuisGraphie('itutu'), '[itʰutʰu]', 't aspirée devant u');
  assert.equal(apiDepuisGraphie('Intchango ṽa ngwè'), '[intʃaŋɡo βa ŋɡwɛ]');
});

test('prompt : grammaire myènè, lexique trouvé, formes refusées, aucune référence aux sources', async () => {
  const { construireSysteme, PROMPT_DEFAUT } = await import('../src/ia.ts');
  const { GRAMMAIRE_MYENE } = await import('../src/promptMyene.ts');
  assert.match(PROMPT_DEFAUT, /\{\{grammaire_myene\}\}/);
  for (const r of [/LE CONNECTIF/, /CONSONNE FORTE ET CONSONNE FAIBLE/, /COMMENT TU COMPOSES/, /JAMAIS une autre langue/, /garde le mot français/]) assert.match(GRAMMAIRE_MYENE, r);
  assert.doesNotMatch(GRAMMAIRE_MYENE, /Ambouroue|Teisser|Raponda|Gautier|p\.\s?\d/, 'aucun auteur ni page dans ce que lit le modèle pour l\'apprenant');
  const embed = { nom: 'x', modele: 'x', embed: async (t: string[]) => t.map(() => [1, 0]) };
  const { systeme } = await construireSysteme(db, embed, { message: 'Traduis : ma mère prépare la viande', enfant: false });
  assert.match(systeme, /COMMENT TU COMPOSES UNE PHRASE/);
  assert.doesNotMatch(systeme, /\{\{\s*grammaire_myene\s*\}\}/);
  assert.match(systeme, /### Lexique trouvé/);
  assert.match(systeme, /- Nyama : La viande — ôrungu/);
  assert.match(systeme, /- ngwè : mère — galwa/);
  assert.doesNotMatch(systeme, /Ozèwè/, 'seuls les mots de la question entrent');
  assert.match(systeme, /Formes refusées[\s\S]*Nyaré/);
  // Une version de prompt enregistrée sans la variable reçoit la grammaire à la fin ; réglage pour la couper
  await db.query(`INSERT INTO ia_prompts (nom, contenu, actif) VALUES ('ancienne', 'Tu es un assistant de test pour le myènè.', true)`);
  assert.match((await construireSysteme(db, embed, { message: 'Mbolo', enfant: false })).systeme, /^Tu es un assistant de test[\s\S]*LE CONNECTIF/);
  assert.equal((await call('PUT', '/v1/admin/ia/config', ADMIN, { grammaireMyene: false, lexiqueMax: 0 })).status, 200);
  const coupe = (await construireSysteme(db, embed, { message: 'la viande', enfant: false })).systeme;
  assert.doesNotMatch(coupe, /LE CONNECTIF|Lexique trouvé/);
  await call('PUT', '/v1/admin/ia/config', ADMIN, { grammaireMyene: true, lexiqueMax: 30 });
  await db.query(`UPDATE ia_prompts SET actif = false`);
  // Contrôle depuis la console
  const r = await call('GET', '/v1/admin/ia/lexique?q=viande', ADMIN);
  assert.equal(r.status, 200); assert.equal(r.body.corpus, true); assert.ok(r.body.resultats.some((e: any) => e.f === 'Nyama'));
  assert.equal((await call('GET', '/v1/admin/ia/lexique?q=viande', tok('x1', 'x1@x.com'))).status, 403);
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
  assert.ok(socle > 3000, `socle mesuré : ${socle}`);
  assert.ok(estimerJetons(systeme) - socle < 6000, 'sans le socle, le reste du prompt tient dans l\'inclus');
  const id = (await call('POST', '/v1/ia/chats', u, {})).body.chat.id;
  const r = await call('POST', `/v1/ia/chats/${id}/messages`, u, { message: 'Traduis : ma mère prépare la viande' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.chat.contexte.jetons < 3000, `contexte compté : ${r.body.chat.contexte.jetons} (prompt complet : ${estimerJetons(systeme)})`);
  assert.equal(r.body.chat.contexte.exces, 0, 'aucun frais dès le premier message');
});

test('synthèse audio : réservée à l\'avantage synthese_audio, API prioritaire, texte converti sans tons, cache', async () => {
  const u = tok('apprenant', 'a@x.com');
  await call('GET', '/v1/me', u);
  assert.equal((await call('POST', '/v1/audio/synthese', u, { texte: 'Mbolo' })).status, 402, 'sans la formule qui l\'inclut');
  const r = await call('POST', '/v1/audio/synthese', ADMIN, { api: '[m̩bólò]' });
  assert.equal(r.status, 200); assert.equal(r.headers['content-type'], 'audio/wav'); assert.equal(r.raw.toString(), 'RIFF....WAVE');
  assert.equal(recus.at(-1).corps.api, '[m̩bólò]');
  await call('POST', '/v1/audio/synthese', ADMIN, { texte: 'Nyéza myè' });
  assert.equal(recus.at(-1).corps.api, '[ɲeza mjɛ]');
  const n = recus.length;
  await call('POST', '/v1/audio/synthese', ADMIN, { texte: 'Nyéza myè' });
  assert.equal(recus.length, n, 'deuxième demande servie par le cache');
  assert.equal((await call('POST', '/v1/audio/synthese', ADMIN, {})).status, 400);
  assert.equal((await call('POST', '/v1/audio/synthese', ADMIN, { api: 'a'.repeat(700) })).status, 400);
  assert.equal((await call('POST', '/v1/audio/phonemes', ADMIN, { api: '[m̩bólò]' })).body.phonemes, 'ˈmbolo');
  assert.equal((await call('GET', '/v1/admin/audio/etat', ADMIN)).body.ok, true);
});
