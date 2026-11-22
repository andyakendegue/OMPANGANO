// Contenu affiché à l'apprenant (consigne 14_programme_et_jeux/06_CONSIGNE_code_cursus_v3.md, § 1 et lot 1) :
// aucune lettre v2 (è, é, tch, dj, dy, ṽ, ñ, gh…) dans le myènè, aucun nom d'auteur, aucun terme de spécialiste,
// aucune transcription entre crochets. Les plafonds ne peuvent que baisser ; ils passent à zéro avec la conversion v3 (lot 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEEDS } from '../../../packages/noyau/src/contenu/seeds.ts';
import { controlerAffiche, ecartsExercice, ecartsTitres, lettresV3, sansSignes, type Ecart } from '../../../packages/noyau/src/graphieV3.ts';

const PLAFONDS: Record<Ecart['regle'], number> = { lettre_v2: 0, accent_grave: 0, terme_specialiste: 0, crochets: 0, auteur: 0 };

function tousLesEcarts() {
  const r: (Ecart & { id: string })[] = [];
  for (const e of (SEEDS.exercices as Record<string, any>[]).filter(e => e.publie !== false)) for (const x of ecartsExercice(e)) r.push({ ...x, id: e.id }); // retirés : jamais servis
  for (const c of ['parcours', 'unites', 'lecons'] as const) for (const e of (SEEDS as any)[c] as Record<string, any>[]) for (const x of ecartsTitres(e)) r.push({ ...x, id: e.id });
  return r;
}

test('contenu affiché : écarts sous les plafonds (lettres v2, auteurs, termes de spécialiste, crochets)', () => {
  const r = tousLesEcarts();
  for (const regle of Object.keys(PLAFONDS) as Ecart['regle'][]) {
    const l = r.filter(x => x.regle === regle);
    assert.ok(l.length <= PLAFONDS[regle], `${regle} : ${l.length} > ${PLAFONDS[regle]} — ${l.slice(0, 8).map(x => `${x.id}/${x.champ} « ${x.extrait} »`).join(' ; ')}`);
  }
});

test('contrôleur : repère chaque catégorie, laisse passer le v3 et le français', () => {
  assert.equal(controlerAffiche('m', 'Akéwa', true)[0]?.regle, 'lettre_v2');
  assert.equal(controlerAffiche('m', 'Akewa', true).length, 0);
  assert.equal(controlerAffiche('m', "Wê bel'incango nde ?", true).length, 0);
  assert.equal(controlerAffiche('m', 'Ndjôgu', true)[0]?.regle, 'lettre_v2');
  assert.equal(controlerAffiche('m', 'nghomba', true).length, 0, 'ngh est une lettre v3');
  assert.equal(controlerAffiche('m', 'vèra', true)[0]?.regle, 'accent_grave', 'règles v3.6 : plus d\'accent grave (vêra)');
  assert.equal(controlerAffiche('m', 'vêra', true).length, 0);
  assert.equal(controlerAffiche('m', 'rerè', true)[0]?.regle, 'accent_grave', 'è : jamais en v3.6');
  assert.equal(controlerAffiche('m', 'Ogholo', true)[0]?.regle, 'lettre_v2');
  assert.equal(controlerAffiche('t', 'Écoute et répète.', false).length, 0, 'é du français admis');
  assert.equal(controlerAffiche('t', 'Le mot « intchango »', false)[0]?.regle, 'lettre_v2', 'tch cité dans un texte français');
  assert.equal(controlerAffiche('t', "Selon Ambouroue, p. 38", false)[0]?.regle, 'auteur');
  assert.equal(controlerAffiche('t', 'Le b est implosif.', false)[0]?.regle, 'terme_specialiste');
  assert.equal(controlerAffiche('t', 'On entend [àwáná].', false)[0]?.regle, 'crochets');
  assert.equal(controlerAffiche('t', 'Une apiculture', false).length, 0, 'API seulement comme mot entier');
});

test('lettres v3 : conversion des lettres seulement, crochets intouchés, pas de règle de mot', () => {
  assert.equal(lettresV3('Intchango sè ?'), 'Incango sê ?');
  assert.equal(lettresV3('Ndjôgu'), 'Njôgu');
  assert.equal(lettresV3('iṽaṽa'), 'ivava');
  assert.equal(lettresV3('ñomba'), 'nghomba');
  assert.equal(lettresV3('Ogholo'), 'Ogolo');
  assert.equal(lettresV3('Ntsuwa'), 'Ncuwa');
  assert.equal(lettresV3("epokol'ignango"), "epokol'inyango");
  assert.equal(lettresV3('éréré = un arbre = [èréré]'), 'erere = un arbre = [èréré]', 'transcription protégée');
  assert.equal(lettresV3('e'), 'e', 'une lettre isolée reste e');
  assert.equal(lettresV3('Omwana'), 'Omwana', 'mw → nghw : jamais sans réponse de Capp');
});

test('dictées : sans les signes (‘, tréma, accent grave), les lettres restent', () => {
  assert.equal(sansSignes('‘nkambi'), 'nkambi');
  assert.equal(sansSignes('Gềnda godêwa !'), 'Gênda godêwa !');
  assert.equal(sansSignes('yïtôndo'), 'yitôndo');
  assert.equal(sansSignes('Và myê aningo'), 'Va myê aningo');
});

test('dictée : signes tolérés tant que la leçon ne les enseigne pas, exigés sinon ; les lettres v3 restent exigées', async () => {
  const { jugerReponse } = await import('../../../packages/noyau/src/lecons.ts');
  const d = { id: 'd', lecon_id: 'l', type: 'dictee' as const, reponse: 'Gềnda godêwa !' };
  assert.equal(jugerReponse(d, 'Gênda godêwa'), true, 'accent grave absent : toléré');
  assert.equal(jugerReponse({ ...d, exiger_signes: true }, 'Gênda godêwa'), false, 'leçon qui enseigne l\'impératif : exigé');
  assert.equal(jugerReponse({ ...d, exiger_signes: true }, 'Gềnda godêwa'), true);
  assert.equal(jugerReponse({ ...d, reponse: '‘nkambi' }, 'nkambi'), true, '‘ absent : toléré');
  assert.equal(jugerReponse(d, 'Genda godewa'), false, 'ê exigé : c\'est une lettre');
});
