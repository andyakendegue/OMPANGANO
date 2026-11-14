// Numéro des examinateurs des magasins : code fixe pour ce seul numéro, les autres passent par le fournisseur normal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avecNumeroExaminateur, type FournisseurSms } from '../src/sms.ts';

function faux() {
  const appels: string[] = [];
  const f: FournisseurSms = { async envoyer(t) { appels.push('envoi ' + t); }, async verifier(t, c) { appels.push('verif ' + t); return c === '111111'; } };
  return { f, appels };
}
const env = { REVUE_TELEPHONE: '+241 09 99 99 99', REVUE_CODE: '482915', REVUE_JUSQU_AU: new Date(Date.now() + 7 * 86400_000).toISOString() } as NodeJS.ProcessEnv;

test('le numéro examinateur se connecte avec son code, sans SMS', async () => {
  const { f, appels } = faux();
  const s = avecNumeroExaminateur(f, env);
  await s.envoyer('+24109999999');
  assert.equal(await s.verifier('+24109999999', '482915'), true);
  assert.equal(await s.verifier('+24109999999', '111111'), false);
  assert.equal(await s.verifier('+24109999999', '48291'), false);
  assert.deepEqual(appels, []);
});

test('les autres numéros passent par le fournisseur', async () => {
  const { f, appels } = faux();
  const s = avecNumeroExaminateur(f, env);
  await s.envoyer('+24106123456');
  assert.equal(await s.verifier('+24106123456', '482915'), false);
  assert.equal(await s.verifier('+24106123456', '111111'), true);
  assert.equal(appels.length, 3);
});

test('sans configuration valide, rien ne change', async () => {
  const { f } = faux();
  assert.equal(avecNumeroExaminateur(f, {} as NodeJS.ProcessEnv), f);
  assert.equal(avecNumeroExaminateur(f, { REVUE_TELEPHONE: '+24109999999', REVUE_CODE: '12' } as NodeJS.ProcessEnv), f);
  assert.equal(avecNumeroExaminateur(f, { REVUE_TELEPHONE: 'abc', REVUE_CODE: '482915' } as NodeJS.ProcessEnv), f);
});

test('le numéro examinateur exige une date de fin proche et s\'éteint après', async () => {
  const { f } = faux();
  assert.equal(avecNumeroExaminateur(f, { ...env, REVUE_JUSQU_AU: undefined }), f, 'sans date : désactivé');
  assert.equal(avecNumeroExaminateur(f, { ...env, REVUE_JUSQU_AU: new Date(Date.now() + 90 * 86400_000).toISOString() }), f, 'plus de 45 jours : désactivé');
  let t = Date.now();
  const s = avecNumeroExaminateur(f, env, () => t);
  assert.equal(await s.verifier('+24109999999', '482915'), true);
  t += 8 * 86400_000;
  assert.equal(await s.verifier('+24109999999', '482915'), false, 'après la date : passe par le fournisseur normal');
});
