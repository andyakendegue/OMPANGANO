// Lot 1 bis (consigne 14_programme_et_jeux/06_CONSIGNE_code_cursus_v3.md) : prompt de Qwen rédigé à partir des règles de référence v3.3,
// corpus RAG (règles d'abord, rang de chaque source), lexique v3, contrôleur des réponses en myènè.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRAMMAIRE_MYENE, VERSION_GRAMMAIRE } from '../src/promptMyene.ts';
import { etiquetteSource, TITRES_EXCLUS, TITRES_MYENE, TITRES_PHRASES_V3, TITRES_REGLES } from '../src/ia.ts';
import { controlerMyene, AUTEURS } from '../../../packages/noyau/src/graphieV3.ts';

test('prompt : version v3.3, aucune référence, aucune lettre v2 dans les exemples', () => {
  assert.match(VERSION_GRAMMAIRE, /^DONDO v3\.[34]/);
  assert.ok(!AUTEURS.test(GRAMMAIRE_MYENE), 'aucun nom d\'auteur');
  assert.ok(!/\bp\. ?\d/.test(GRAMMAIRE_MYENE), 'aucun numéro de page');
  // Les lettres v2 n'apparaissent que dans les sections qui expliquent comment lire un texte ancien et les erreurs à éviter.
  const exemples = GRAMMAIRE_MYENE.split('LIRE UN TEXTE ÉCRIT AUTREMENT')[0] + GRAMMAIRE_MYENE.split('LE NOM\n')[1].split('ERREURS À NE JAMAIS REFAIRE')[0];
  assert.ok(!/ntcharo|intchango|Akéwa|Nyéza|ṽ[a-z]|[a-z]ñ|ñ[a-z]|(?<!\p{L})(myè|wé|zé|né)(?!\p{L})/u.test(exemples), 'exemples en v3');
});

test('prompt : règle des sources (§ 1.1), méthode (§ 13), liste de contrôle (§ 14) et formes validées', () => {
  for (const x of ['Ce qu\'une seule source donne s\'applique', 'Le rang ne joue qu\'en cas de désaccord', 'RÉPONDRE EN MYÈNÈ : LA MÉTHODE', 'LISTE DE CONTRÔLE',
    'Question en myènè → réponse en myènè', 'A bya', 'A byeni', 'A wyeni', 'Myê re nya pa njôgôni', 'Ê re bye', 'Ê pa bya', 'Myê be nya',
    'onghwana', "igomi ny'itondo ambani", "igomi ni ncaro y'inago", "agom'awani n'otani y'itondo", 'anaga wa vïezo iyoma', "onghwant'wami", 'Wulinya myê', 'awê'])
    assert.ok(GRAMMAIRE_MYENE.includes(x), x);
});

test('RAG : règles en premier, données v3 seulement, rang de chaque source', () => {
  assert.deepEqual(TITRES_REGLES, ['Regles myene v3%']);
  assert.ok(TITRES_PHRASES_V3[0].includes('V3 rekanga'));
  assert.ok(!TITRES_MYENE.some(t => /v2/.test(t)), 'plus de phrases v2');
  assert.ok(TITRES_EXCLUS.includes('Donnees › Ompangano%') && TITRES_EXCLUS.includes('Edition DONDO myene%'));
  assert.equal(etiquetteSource('Regles myene v3 › Paragraphe 06-2 Les temps').rang, 0);
  assert.equal(etiquetteSource('Sources myene › Dictionnaires grammaires › Ambouroue 2007').rang, 2);
  assert.equal(etiquetteSource('Sources myene › Dictionnaires grammaires › Raponda-Walker 1995 Dictionnaire Mpongwe-Francais').rang, 3);
  assert.equal(etiquetteSource('Sources myene › Lecons omyene › Vocabulaire › La Nature').rang, 4);
  assert.match(etiquetteSource('Sources myene › Lecons omyene › X').libelle, /ancienne graphie/);
  assert.match(etiquetteSource('Edition DONDO myene › V3 rekanga 2026-11-21 › Phrases › Import 2 nouveau v3 rekanga 40125').libelle, /jamais une autorité/);
});

test('contrôleur : les phrases de référence de Capp passent, les erreurs du § 12 sont arrêtées', () => {
  for (const p of ["Ôrungu wi ny'ewêrê.", "A pyez'iyoma, anaga wa vïezo iyoma.", 'Myê re nya pa njôgôni.', "Igomi ni ncaro y'inago.", "Wê bel'incango nde ?", 'Ê re bye. Ê pa bya.', 'Mênê ozangue ê be dwana byambie go Mandji.'])
    assert.deepEqual(controlerMyene(p), { ok: true, ecarts: [] }, p);
  for (const p of ['Ê a va', 'Omwana', "Agom'ambani m'itondo", 'Incango nde wê bele ?', 'Intchango sè ?', 'Mi be luwo me nya'])
    assert.equal(controlerMyene(p).ok, false, p);
});

test('budget : le prompt de base reste court et le contexte est coupé au budget (modèle à 8 192 jetons)', async () => {
  const { CONFIG_IA_DEFAUT, PROMPT_DEFAUT } = await import('../src/ia.ts');
  assert.ok(GRAMMAIRE_MYENE.length + PROMPT_DEFAUT.length < 12000, `grammaire ${GRAMMAIRE_MYENE.length} + prompt ${PROMPT_DEFAUT.length}`);
  assert.ok(CONFIG_IA_DEFAUT.budgetSysteme <= 20000, '≈ 3,4 caractères par jeton : 19 000 caractères laissent la place à l\'historique et à la réponse');
});

test('v3.4 (Capp, 22 nov. 2026, soir) : salutations et réponses, re… pa, Ibanga we, aucune phrase construite à la volée', async () => {
  for (const x of ['Incango sê ?, Wê re vôvô ?, Incugu si nda ! demandent comment on va', 'Incango mbiambie', 'Incango vôvô', 'Du vôvô. Go nduani. Akewa',
    'Wulinya myê, awê buta mya nde ?', 're… pa = action finie, jamais un état', 'Awa toli ? — He, ma toli.', 'Ibanga we. Ka mênê !', 'Jamais de phrase construite à la volée'])
    assert.ok(GRAMMAIRE_MYENE.includes(x), x);
  assert.ok(!GRAMMAIRE_MYENE.includes('Ibanga wê. Ka'), 'Ibanga we, jamais wê');
  for (const p of ['Myê re vôvô pa.', 'Ibanga wê. Ka mênê !', 'Myê re nya go nce yêre.']) assert.equal(controlerMyene(p).ok, false, p);
  for (const p of ['Incango mbiambie.', 'Myê re vôvô. Akewa.', 'Du vôvô. Go nduani. Akewa.', 'Ibanga we. Ka mênê !', 'Mere tolapa.']) assert.deepEqual(controlerMyene(p), { ok: true, ecarts: [] }, p);
  const { MYENE } = await import('../../../packages/noyau/src/lexique.ts');
  assert.equal(MYENE.KA_MENE.mot, 'Ibanga we. Ka mênê !');
});
