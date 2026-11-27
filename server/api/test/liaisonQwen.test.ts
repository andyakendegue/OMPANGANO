// Liaison API → relais du modèle (26 nov. 2026) : réponse enveloppée, mesures RunPod au journal, reprise sur 503, réveil unique, vecteur unique.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { embeddingMemorise, fournisseurIaParDefaut } from '../src/ia.ts';
import { journalIa } from '../src/diagnosticIa.ts';

let srv: http.Server, base = '';
let mode: 'ok' | '503-puis-ok' | 'lent' = 'ok', deja503 = false;
const recus: { auth?: string; corps: any }[] = [];

before(async () => {
  srv = http.createServer((req, res) => {
    let b = '';
    req.on('data', c => { b += c; });
    req.on('end', () => {
      recus.push({ auth: req.headers.authorization, corps: JSON.parse(b) });
      if (mode === '503-puis-ok' && !deja503) { deja503 = true; res.writeHead(503); res.end('Runpod /run failed'); return; }
      const envoyer = () => {
        res.writeHead(200, { 'content-type': 'application/json', 'x-runpod-job': 'job-1', 'x-runpod-delay-ms': '80000', 'x-runpod-execution-ms': '1200' });
        // Forme enveloppée du relais vLLM serverless : [ {choices…} ]
        res.end(JSON.stringify([{ choices: [{ message: { content: 'Mbolo' }, finish_reason: 'stop' }], usage: { prompt_tokens: 50, completion_tokens: 3 }, model: 'qwen' }]));
      };
      if (mode === 'lent') setTimeout(envoyer, 600); else envoyer();
    });
  });
  await new Promise<void>(ok => srv.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/v1`;
});
after(() => new Promise<void>(ok => srv.close(() => ok())));

const fournisseur = () => fournisseurIaParDefaut({ IA_FOURNISSEUR: 'openai', IA_BASE_URL: base, IA_API_KEY: 'jeton-relais', IA_MODELE: 'runpod-vllm', IA_DELAI_APPEL_S: '30' });
const demande = { systeme: 'Sois bref.', messages: [{ role: 'user' as const, content: 'Mbolo' }], modele: '' };

test('relais : réponse enveloppée lue, jeton envoyé, attente et calcul RunPod notés au journal', async () => {
  mode = 'ok';
  const r = await fournisseur().repondre(demande);
  assert.deepEqual([r.texte, r.usage.entree, r.usage.sortie, r.modele], ['Mbolo', 50, 3, 'qwen']);
  assert.equal(recus.at(-1)?.auth, 'Bearer jeton-relais');
  assert.equal(recus.at(-1)?.corps.model, 'runpod-vllm');
  const m = journalIa().appels[0];
  assert.deepEqual([m.status, m.job, m.attenteRunpodMs, m.calculMs, m.entree, m.sortie], [200, 'job-1', 80000, 1200, 50, 3]);
});

test('relais momentanément indisponible (503) : une reprise, puis la réponse', async () => {
  mode = '503-puis-ok'; deja503 = false;
  const r = await fournisseur().repondre(demande);
  assert.equal(r.texte, 'Mbolo');
  const [apres, avant] = journalIa().appels;
  assert.deepEqual([avant.status, apres.status, apres.reprise], [503, 200, 1]);
  assert.match(avant.erreur ?? '', /Runpod \/run failed/);
});

test('réveil : un seul à la fois, plus aucun tant que le worker vient de répondre', async () => {
  mode = 'lent';
  const p = fournisseur();
  assert.equal(p.reveiller?.(), true, 'aucune activité : le réveil part');
  assert.equal(p.reveiller?.(), false, 'un réveil est déjà en cours');
  await new Promise(ok => setTimeout(ok, 900));
  assert.equal(recus.at(-1)?.corps.max_tokens, 1, 'question minuscule');
  const e = p.etat?.();
  assert.equal(e?.dernierReveil?.ok, true); assert.equal(e?.reveilEnCours, false);
  assert.equal(journalIa().appels[0].reveil, true, 'le réveil est marqué au journal');
  assert.equal(p.reveiller?.(), false, 'le worker vient de répondre : il est éveillé');
});

test('recherche dans le corpus : un seul calcul de vecteur pour la même question', async () => {
  let appels = 0;
  const e = embeddingMemorise({ nom: 'x', modele: 'x', embed: async t => { appels++; return t.map(() => [1, 0]); } });
  await Promise.all([e.embed(['mbolo']), e.embed(['mbolo']), e.embed(['mbolo']), e.embed(['akewa'])]);
  assert.equal(appels, 2);
});
