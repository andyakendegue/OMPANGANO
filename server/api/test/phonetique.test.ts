// Sons et tons de l'ôrungu (noyau/phonetique.ts) et formats immersifs des leçons (15 nov. 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONSONNES, PAIRES_TONALES, TONS, VOYELLES, melodie, phonemeDe, exemplesSon } from '../../../packages/noyau/src/phonetique.ts';
import { exerciceNote, etapeDe, jugerReponse, zonesDe, type Exercice } from '../../../packages/noyau/src/lecons.ts';
import { validerLignes } from '../../../packages/noyau/src/contenu/valider.ts';
import { SCHEMAS } from '../../../packages/noyau/src/contenu/schemas.ts';
import { SEEDS } from '../../../packages/noyau/src/contenu/seeds.ts';

test('sept voyelles orales par aperture et série ; ɛ, ɔ, u jamais à l\'initiale ; aucune comparaison au français', () => {
  assert.deepEqual(VOYELLES.map(v => v.api), ['i', 'e', 'ɛ', 'a', 'ɔ', 'o', 'u']);
  for (const api of ['ɛ', 'ɔ', 'u']) assert.match(phonemeDe(api)!.distribution!, /jamais en début de mot/);
  const tout = JSON.stringify([...VOYELLES, ...CONSONNES, ...TONS]);
  assert.doesNotMatch(tout, /comme en français|comme dans « [a-zé]+ »/i, 'les sons se décrivent dans leur propre système');
  for (const p of [...VOYELLES, ...CONSONNES]) { assert.ok(p.articulation.length > 5, p.api); assert.ok(p.exemples.length >= 1 && p.exemples.every(e => e.source), p.api); }
});

test('consonnes propres : implosives, aspirées, labio-palatale ; recherche par API ou graphie', () => {
  assert.equal(phonemeDe('ɓ')!.air, 'implosif');
  assert.equal(phonemeDe('pʰ')!.air, 'aspiré');
  assert.equal(phonemeDe('ṽ')!.api, 'β');
  assert.equal(phonemeDe('ɥ')!.type, 'semi-consonne');
  assert.equal(phonemeDe('inconnu'), null);
});

test('tons : trois ponctuels, deux modulés, pas de montant ; paires indéfini / défini', () => {
  assert.deepEqual(TONS.filter(t => t.type === 'ponctuel').map(t => t.nom), ['haut', 'bas', 'haut-abaissé']);
  assert.ok(!TONS.some(t => t.nom === 'montant'));
  assert.equal(PAIRES_TONALES[0].a.sens, 'un mortier'); assert.equal(PAIRES_TONALES[0].b.sens, 'le mortier');
});

test('mélodie tonale : syllabes et tons d\'après les diacritiques d\'Ambouroue', () => {
  assert.deepEqual(melodie('[àwáná]').map(s => s.ton), ['B', 'H', 'H']);
  assert.deepEqual(melodie('[íla̍sà]').map(s => s.ton), ['H', 'A', 'B']);
  assert.deepEqual(melodie('[nyâ]'), [{ syllabe: 'nyâ', ton: 'HB' }]);
  assert.deepEqual(melodie('[m̀bɛ́rɛ́]').map(s => [s.syllabe, s.ton]), [['m̀', 'B'], ['bɛ́', 'H'], ['rɛ́', 'H']]);
  assert.equal(melodie('[àwáná wínya̍̀]').at(-1)!.ton, 'AB');
});

test('formats immersifs : notation, étapes, zones de scène, exemples', () => {
  const ex = (o: Partial<Exercice>): Exercice => ({ id: 'x', lecon_id: 'l', type: 'son', ...o });
  assert.equal(exerciceNote({ type: 'son' }), false); assert.equal(exerciceNote({ type: 'ton' }), false); assert.equal(exerciceNote({ type: 'tracer' }), false);
  assert.equal(exerciceNote({ type: 'quel_son' }), true); assert.equal(exerciceNote({ type: 'scene' }), true);
  assert.equal(etapeDe({ type: 'scene' }), 'voir'); assert.equal(etapeDe({ type: 'tracer' }), 'ecrire'); assert.equal(etapeDe({ type: 'ton' }), 'ecouter');
  assert.equal(jugerReponse(ex({ type: 'quel_son', reponse: 'ɓ' }), 'ɓ'), true);
  const z = zonesDe(ex({ zones: '[{"x":200,"y":-5,"mot":"nguwu","sens":"hippopotame"},{"x":10,"y":10,"mot":""}]' }));
  assert.deepEqual(z.map(x => [x.mot, x.x, x.y]), [['nguwu', 95, 8]], 'positions bornées, entrées vides écartées');
  assert.deepEqual(exemplesSon(['éréré = un arbre = [èréré] = 🌳']), [{ mot: 'éréré', sens: 'un arbre', phonetique: '[èréré]', illustration: '🌳' }]);
});

test('le contenu d\'exemple des sons et des tons passe le schéma et cite ses sources', () => {
  const s = SCHEMAS.find(x => x.id === 'exercices')!;
  const lignes = SEEDS.exercices as Record<string, any>[];
  assert.deepEqual(validerLignes(s, lignes).erreurs, []);
  const neufs = lignes.filter(l => ['son', 'quel_son', 'ton', 'tracer', 'scene'].includes(l.type));
  assert.ok(neufs.length >= 40);
  assert.ok(neufs.every(l => typeof l.source === 'string' && l.source.length > 5), 'chaque exercice cite sa source');
});
