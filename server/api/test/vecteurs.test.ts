// Envoi des vecteurs à Qdrant par lots (14 nov. 2026) : un corps de plus de ~3,3 Mo est refusé par Qdrant.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vecteursParDefaut, LOT_POINTS } from '../src/vecteurs.ts';

test('un gros document part en plusieurs envois, chacun sous la limite de Qdrant', async () => {
  const envois: { methode: string; chemin: string; taille: number; points: number }[] = [];
  const avant = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const corps = String(init.body ?? '');
    envois.push({ methode: String(init.method), chemin: new URL(url).pathname, taille: corps.length, points: corps ? (JSON.parse(corps).points?.length ?? 0) : 0 });
    return new Response(JSON.stringify({ result: {} }), { status: 200 });
  }) as typeof fetch;
  try {
    const v = vecteursParDefaut({ VECTOR_URL: 'http://qdrant.test' } as NodeJS.ProcessEnv);
    const points = Array.from({ length: 300 }, (_, i) => ({ id: i + 1, vecteur: Array.from({ length: 1024 }, () => Math.random() * 2 - 1) }));
    await v.remplacer('doc', points);
  } finally { globalThis.fetch = avant; }
  const puts = envois.filter(e => e.methode === 'PUT');
  assert.equal(puts.length, Math.ceil(300 / LOT_POINTS));
  assert.equal(puts.reduce((s, e) => s + e.points, 0), 300);
  assert.ok(puts.every(e => e.taille < 3_355_443), `plus gros envoi : ${Math.max(...puts.map(e => e.taille))} octets`);
  assert.equal(envois[0].chemin, '/collections/nkala_rag/points/delete', "les anciens points du document sont retirés avant l'envoi");
});
