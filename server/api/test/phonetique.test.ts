// Sons et tons de l'orungu (noyau/phonetique.ts) et formats immersifs des leçons (15 nov. 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONSONNES, PAIRES_TONALES, TONS, VOYELLES, melodie, phonemeDe, exemplesSon, graphieDondo, exempleComplet } from '../../../packages/noyau/src/phonetique.ts';
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

test('inventaire complet des consonnes d\'Ambouroue (p. 12) : chaque son a sa carte, son articulation et un exemple sourcé', () => {
  const ambouroue = ['m', 'n', 'ɲ', 'ŋ', 'ᵐp', 'ᵐb', 'ⁿt', 'ⁿd', 'ᵑk', 'ᵑg', 'ᵐf', 'ⁿc', 'ⁿɟ', 'p', 'pʰ', 'ɓ', 't', 'tʰ', 'ɗ', 'f', 'v', 'β', 's', 'z', 'c', 'l', 'ɾ', 'k', 'ɣ', 'y', 'ɥ', 'w'];
  for (const api of ambouroue) {
    const p = CONSONNES.find(x => x.api === api);
    assert.ok(p, `consonne manquante : ${api}`);
    assert.ok(p!.articulation.length > 5 && p!.exemples.every(e => e.source && (e.mot || e.phonetique)), api);
  }
  const SEEDS_EX = SEEDS.exercices as Record<string, any>[];
  const cartes = new Set(SEEDS_EX.filter(e => e.type === 'son' && e.publie !== false && String(e.lecon_id).startsWith('ntina-')).map(e => e.graphie));
  // v3 : β et v ne font qu'un son, écrit v (Capp, 22 nov. 2026) : une seule carte
  for (const api of ambouroue.filter(a => a !== 'β')) assert.ok(cartes.has(api), `pas de carte de son dans Ntina pour ${api}`);
  assert.equal(phonemeDe('β')!.graphie, phonemeDe('v')!.graphie);
  for (const e of SEEDS_EX.filter(e => e.type === 'son')) assert.ok(phonemeDe(e.graphie), `carte sans son connu : ${e.id}`);
});

test('consonnes propres : implosives, aspirées, labio-palatale ; recherche par API ou graphie', () => {
  assert.equal(phonemeDe('ɓ')!.air, 'implosif');
  assert.equal(phonemeDe('pʰ')!.air, 'aspiré');
  assert.equal(phonemeDe('β')!.graphie, 'v', 'v3 : un seul son, écrit v');
  assert.equal(phonemeDe('dʒ')!.graphie, 'j'); assert.equal(phonemeDe('dʲ')!.graphie, 'j', 'une seule carte j');
  for (const p of [...VOYELLES, ...CONSONNES]) assert.ok(p.geste && !/implosi|aspir|palat|alvéol|nasale|fricativ|occlusi/i.test(p.geste), `${p.api} : description pour l'élève sans terme de spécialiste`);
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

test('graphie v3 tirée de la transcription : mêmes graphies que les leçons, sans tons', () => {
  const attendu: [string, string][] = [['[àkɔ̀ndɔ̀]', 'akôndô'], ['[ìβàβá]', 'ivava'], ['[àwáná]', 'awana'], ['[èɾéɾé]', 'erere'], ['[m̀bɛ́ɾɛ́]', 'mbêrê'],
    ['[èpóko̍lò]', 'epokolo'], ['[èɓándá]', 'ebanda'], ['[ɗènà]', 'dena'], ['[nyàmà]', 'nyama'], ['[ìncózó]', 'incozo'], ['[ìnjìnà]', 'injina'],
    ['[ŋòmbá]', 'nghomba'], ['[ìŋkàmbí]', 'inkambi'], ['[òŋwántò]', 'onghwanto'], ['[àwánà wínya̍̀]', 'awana winya']];
  for (const [t, g] of attendu) assert.equal(graphieDondo(t), g, t);
  assert.deepEqual(exempleComplet({ phonetique: '[òɣá]', sens: 'un roi' }), { mot: 'oga', phonetique: '[òɣá]', sens: 'un roi', ecritureDeduite: true });
  assert.equal(exempleComplet({ mot: 'kisini', sens: 'la cuisine' }).ecritureDeduite, false);
});

test('chaque mot appris porte son écriture, sa transcription et son sens ; plus de deux exemples par son quand le corpus les donne', () => {
  const lignes = SEEDS.exercices as Record<string, any>[];
  for (const e of lignes.filter(e => e.phonetique)) {
    assert.ok(e.mot_myene, `écriture manquante : ${e.id}`);
    assert.ok(e.mot_francais, `sens manquant : ${e.id}`);
  }
  for (const p of [...VOYELLES, ...CONSONNES]) for (const e of p.exemples) assert.ok(exempleComplet(e).mot, `${p.api} : exemple sans écriture`);
  const avecTrois = [...VOYELLES, ...CONSONNES].filter(p => p.exemples.filter(e => e.phonetique).length >= 3).length;
  assert.ok(avecTrois >= 35, `seulement ${avecTrois} sons avec trois exemples transcrits`);
  const repeter = lignes.filter(e => String(e.lecon_id).match(/^ntina-l(9|1[0-4])$/));
  assert.ok(repeter.length >= 250, 'unité « Dire juste » : beaucoup de mots à répéter');
  for (const e of repeter.filter(e => e.type === 'choix')) assert.ok(e.options.includes(e.reponse), e.id);
});

test('objets du quotidien, espace, temps, nombres : unités du programme, mots sourcés, nombres corrigés par Capp', () => {
  const U = SEEDS.unites as Record<string, any>[], L = SEEDS.lecons as Record<string, any>[], E = SEEDS.exercices as Record<string, any>[];
  for (const id of ['ntina-u5', 'ogendo-u2', 'ogendo-u3', 'ogendo-u4', 'ogendo-u5']) assert.ok(U.some(u => u.id === id), id);
  const nouvelles = new Set(L.filter(l => ['ntina-u5', 'ntina-u13', 'ogendo-u2', 'ogendo-u3', 'ogendo-u4', 'ogendo-u5'].includes(l.unite_id)).map(l => l.id)); // 6-10 et « compter les choses » : palier 3 (21 nov. 2026)
  const mots = E.filter(e => nouvelles.has(e.lecon_id) && e.type === 'ecouter');
  assert.ok(mots.length >= 150);
  for (const e of mots) { assert.ok(e.mot_myene && e.mot_francais && e.source, e.id); if (e.phonetique) assert.equal(graphieDondo(e.phonetique).replace(/é/g, 'e'), e.mot_myene.toLowerCase().replace(/é/g, 'e').replace(/[’']/g, ''), e.id); }
  const nb = Object.fromEntries(mots.filter(e => e.lecon_id === 'ntina-l15' || e.lecon_id === 'ntina-l16').map(e => [e.mot_francais, e.mot_myene]));
  assert.deepEqual([nb.trois, nb.sept, nb.huit], ['ncaro', 'orwagenomo', 'enanayi'], 'formes corrigées (Leçon 13, corrections du 31 oct. 2026), en graphie v3');
  assert.ok(!JSON.stringify(mots).includes('mbongo'), 'mot écarté par Capp');
});

test('aucune référence aux documents sources dans ce que voit l\'apprenant (décision de Capp, 15 nov. 2026)', async () => {
  const REF = /Ambouroue|\bAMB\b|RÈGLES|Teisser|Raponda|Le Berre|\[LEC\]|LEC-ÉCR|décision de Capp|relecteur|\bp\. ?\d|§/;
  for (const p of [...VOYELLES, ...CONSONNES]) for (const t of [p.articulation, p.distribution ?? '']) assert.doesNotMatch(t, REF, `${p.api} : ${t}`);
  for (const t of TONS) assert.doesNotMatch(`${t.description}`, REF, t.nom);
  const champs = ['consigne', 'texte', 'conseil', 'indice', 'mot_francais', 'mot_myene', 'options', 'reponse', 'zones'];
  for (const e of SEEDS.exercices as Record<string, any>[]) for (const c of champs) if (e[c] != null) assert.doesNotMatch(JSON.stringify(e[c]), REF, `${e.id}.${c}`);
  const { readFileSync } = await import('node:fs');
  for (const f of ['OnenjiLecon.tsx', 'OnenjiImmersif.tsx', 'OnenjiGrammaire.tsx', 'KakIgonjoCours.tsx']) {
    const code = readFileSync(new URL(`../../../apps/nkala/src/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(code, /Source : \$\{|\.source \?/, `${f} affiche encore une source`);
  }
});
