// Cursus Onenji restructuré (audit et décision de Capp, 21 nov. 2026) : 14_programme_et_jeux/04_audit_cursus_Onenji_Nkala.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEEDS } from '../../../packages/noyau/src/contenu/seeds.ts';
import { departAdulte, grouperParPalier, ordreDepuis, uniteSuivante, TYPES_NOTES, type Parcours, type Unite } from '../../../packages/noyau/src/lecons.ts';

const P = SEEDS.parcours as unknown as Parcours[];
const U = (SEEDS.unites as Record<string, any>[]).filter(u => u.publie !== false) as unknown as Unite[];
const L = SEEDS.lecons as Record<string, any>[];
const E = SEEDS.exercices as Record<string, any>[];
const ord = <X extends { ordre?: number | null }>(l: X[]) => [...l].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
const exDe = (uid: string) => { const ids = new Set(L.filter(l => l.unite_id === uid).map(l => l.id)); return E.filter(e => ids.has(e.lecon_id)); };

test('les quatre étapes de la vie restent les mêmes', () => {
  assert.deepEqual(ord(P).map(p => p.id), ['ntina', 'ogendo', 'emeno', 'ikoko']);
});

test('Ntina : trois paliers dans l\'ordre, sans écrit avant le palier 3, leçons courtes', () => {
  const ntina = ord(U.filter(u => u.parcours_id === 'ntina'));
  const paliers = ntina.map(u => u.palier);
  assert.deepEqual([...paliers].sort(), paliers, 'paliers croissants');
  assert.deepEqual(grouperParPalier(ntina).map(g => g.titre?.slice(0, 8)), ['Palier 1', 'Palier 2', 'Palier 3']);
  for (const u of ntina.filter(u => (u.palier ?? 0) < 3)) {
    const ex = exDe(u.id);
    assert.ok(!ex.some(e => ['dictee', 'saisie', 'tracer', 'son', 'quel_son'].includes(e.type)), `${u.id} : pas d'écrit ni de phonétique`);
    assert.ok(ex.some(e => e.type === 'dire'), `${u.id} : l'enfant parle`);
    assert.ok(ex.some(e => e.type === 'jouer'), `${u.id} : un jeu`);
    for (const l of L.filter(l => l.unite_id === u.id)) assert.ok(E.filter(e => e.lecon_id === l.id).length <= 14, `${l.id} trop longue pour 3-5 ans`);
  }
  for (const id of ['ntina-u6', 'ntina-u7', 'ntina-u8', 'ntina-u9', 'ntina-u10', 'ntina-u11']) assert.ok(ntina.some(u => u.id === id), id);
});

test('chaque unité publiée a au moins cinq questions de contrôle (4 sur 5)', () => {
  for (const u of U) { const n = exDe(u.id).filter(e => (TYPES_NOTES as readonly string[]).includes(e.type)).length; assert.ok(n >= 5, `${u.id} : ${n}`); }
});

test('la phonétique passe dans Ogèndo, sans perte ; la colonne grammaticale suit', () => {
  const og = ord(U.filter(u => u.parcours_id === 'ogendo')).map(u => u.id);
  assert.deepEqual(og.slice(0, 3), ['ntina-u3', 'ntina-u4', 'ogendo-u6']);
  for (const l of ['ntina-l4', 'ntina-l6', 'ntina-l7', 'ntina-l8', 'ogendo-l1', 'ogendo-l2']) assert.equal(L.find(x => x.id === l)?.unite_id, 'ntina-u3', l);
  assert.ok(E.filter(e => /^ntina-l(9|1[0-4])$/.test(e.lecon_id)).length >= 250, '« Dire juste » garde ses exercices');
  const gram = exDe('ogendo-u6');
  for (const forme of ['Mi nya', 'Ma nyéni', 'Mi bé nya', "Wé bel'intchango ndé ?"]) assert.ok(gram.some(e => e.mot_myene === forme || e.reponse === forme), forme);
  assert.ok(!gram.some(e => e.reponse === 'a dyani' || e.mot_myene === 'a dyani'), 'forme rejetée par Capp : seulement comme mauvaise réponse');
});

test('l\'adulte qui débute commence à Ikôkô puis rejoint Ogèndo, sans repasser par Ntina', () => {
  const placeAuDebut = { parcoursId: 'ntina', uniteId: 'ntina-u1' };
  assert.deepEqual(departAdulte(placeAuDebut, P, U), { parcoursId: 'ikoko', uniteId: 'ikoko-u1' });
  assert.deepEqual(departAdulte({ parcoursId: 'ogendo', uniteId: 'ntina-u3' }, P, U), { parcoursId: 'ogendo', uniteId: 'ntina-u3' }, 'placé plus loin : inchangé');
  assert.equal(uniteSuivante('ikoko-u1', P, U)?.unite.id, 'ntina-u3');
  const chemin = ordreDepuis('ikoko-u1', P, U);
  assert.deepEqual(chemin.slice(0, 3), ['ikoko-u1', 'ntina-u3', 'ntina-u4']);
  assert.ok(chemin.indexOf('ogendo-u5') < chemin.indexOf('ntina-u1'), 'Ntina n\'arrive qu\'après tout le reste');
  assert.deepEqual(ordreDepuis(null, P, U).slice(0, 2), ['ntina-u1', 'ntina-u2']);
});

test('corrections de Capp du 21 nov. 2026 appliquées aux nombres', () => {
  const t = JSON.stringify(E.map(e => [e.mot_myene, e.options, e.reponse]));
  assert.ok(!t.includes("m'itondo"), 'agom\'ambani m\'itondo remplacé');
  assert.ok(!t.includes('igomi gni mboni'), 'forme remplacée le 10 nov.');
});
