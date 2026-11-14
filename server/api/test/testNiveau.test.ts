// Test de niveau d'Onenji et accès des leçons (décisions du 13 nov. 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composerTestNiveau, testTermine, placementTest, etapeParAge, accesLecon, type Exercice, type Lecon, type Parcours, type Unite } from '../../../packages/noyau/src/lecons.ts';
import { accesNiveau } from '../../../packages/noyau/src/difficulte.ts';
import { modulesSansPub, zoneAffichable } from '../../../packages/noyau/src/publicite.ts';

const P: Parcours[] = [{ id: 'ntina', titre: 'Ntina', ordre: 1 }, { id: 'ogendo', titre: 'Ogèndo', ordre: 2 }, { id: 'emeno', titre: 'Emeno', ordre: 3 }];
const U: Unite[] = P.flatMap(p => [1, 2].map(n => ({ id: `${p.id}-u${n}`, parcours_id: p.id, titre: `U${n}`, ordre: n })));
const L: Lecon[] = U.map(u => ({ id: `${u.id}-l1`, unite_id: u.id, titre: 'L', ordre: 1 }));
const X: Exercice[] = L.flatMap(l => [1, 2, 3].map(n => ({ id: `${l.id}-e${n}`, lecon_id: l.id, type: (n === 1 ? 'ecouter' : 'choix') as Exercice['type'], ordre: n })));

test('le test prend 3 questions notées par étape, dans l\'ordre', () => {
  const q = composerTestNiveau(P, U, L, X);
  assert.equal(q.length, 9);
  assert.deepEqual(q.map(x => x.parcoursId), ['ntina', 'ntina', 'ntina', 'ogendo', 'ogendo', 'ogendo', 'emeno', 'emeno', 'emeno']);
  assert.ok(q.every(x => x.ex.type !== 'ecouter'));
});
test('arrêt après 3 erreurs de suite', () => {
  assert.equal(testTermine([true, false, false], 9), false);
  assert.equal(testTermine([true, false, false, false], 9), true);
});
test('placement : première étape sous les deux tiers', () => {
  const q = composerTestNiveau(P, U, L, X);
  assert.deepEqual(placementTest(q, [true, true, true, true, false, false, false], P, U), { parcoursId: 'ogendo', uniteId: 'ogendo-u1' });
  assert.deepEqual(placementTest(q, [false, false, false], P, U), { parcoursId: 'ntina', uniteId: 'ntina-u1' });
  assert.equal(placementTest(q, Array(9).fill(true), P, U).parcoursId, 'emeno');
  assert.equal(placementTest([], [], P, U).parcoursId, 'ntina');
});
test('étape par âge', () => { assert.equal(etapeParAge(5), 'ntina'); assert.equal(etapeParAge(10), 'ogendo'); assert.equal(etapeParAge(30), 'ikoko'); });
test('première unité libre, la suite au forfait', () => {
  const us = U.filter(u => u.parcours_id === 'ntina');
  assert.equal(accesLecon(L[0], us[0], us), 'libre');
  assert.equal(accesLecon(L[1], us[1], us), 'abonnement');
  assert.equal(accesLecon({ ...L[1], niveau_acces: 'achat' }, us[1], us), 'achat');
});
test('jeux gratuits : formule et achat ignorés, rang gardé', () => {
  assert.deepEqual(accesNiveau({ id: 'x', rang_min: 0, plans: ['plus'], produit_id: 'p1' }, { rang: 1, plans: [], tout: false, achats: [] }), { ok: true });
  assert.equal(accesNiveau({ id: 'x', rang_min: 3, plans: [], produit_id: null }, { rang: 1, plans: [], tout: false, achats: [] }).ok, false);
});
test('publicité coupée selon le forfait', () => {
  const s = modulesSansPub(['a', 'b'], [{ id: 'a', sans_pub: ['azeva'] }, { id: 'b', sans_pub: 'ontci|onenji' }, { id: 'c', sans_pub: 'tout' }]);
  assert.deepEqual(s.sort(), ['azeva', 'onenji', 'ontci']);
  assert.deepEqual(modulesSansPub(['c'], [{ id: 'c', sans_pub: 'oui' }]), ['tout']);
  const ctx = { active: true, abonne: false, profil: 'adulte' as const, enLigne: true, activiteEnCours: false };
  assert.equal(zoneAffichable('bandeau_jeux', { ...ctx, sansPub: ['ontci'] }), true);
  assert.equal(zoneAffichable('bandeau_jeux', { ...ctx, sansPub: ['azeva'] }), false);
  assert.equal(zoneAffichable('bandeau_accueil', { ...ctx, sansPub: ['tout'] }), false);
});
