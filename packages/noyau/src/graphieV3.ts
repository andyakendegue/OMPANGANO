/**
 * Graphie v3 (alphabet de Rékanga) pour les cours : normalisation des lettres et contrôle du contenu affiché.
 * Référence : `_contexte/REGLES_MYENE_REFERENCE_v3.md` (v3.3, 22 nov. 2026) § 2-4 et § 14 ; complément du 22 nov. § 6 ;
 * consigne `14_programme_et_jeux/06_CONSIGNE_code_cursus_v3.md` § 1 et § 3.
 *
 * Protections (consigne § 3) : rien n'est touché entre crochets (transcriptions et tons) ; une lettre isolée n'est jamais
 * « corrigée » par la règle des pronoms (e → ê, o → ô) ; le *mw* n'est jamais converti en *nghw* ici (liste soumise à Capp).
 * Les signes (‘, tréma, accent grave) ne sont jamais posés par cette fonction : seulement les lettres.
 */

/** Version des règles appliquées par ce module. */
export const VERSION_REGLES_V3 = 'DONDO v3.3 (22 nov. 2026)';

/** Lettres et suites qui n'existent plus en v3 (règles § 2.2 : è, é, tch, ts, ȼ, dj, dy, ñ, ṽ, v̂, gh, gn ; h seul). */
export const LETTRES_V2 = /è|é|tch|dj|dy|ṽ|v̂|ñ|ȼ|(?<!n)gh|gn|ts/i;
/** Suites de consonnes v2 rares en français : contrôlées aussi dans les textes français qui citent des mots myènè. */
export const SUITES_V2 = /tch|dj|dy|ṽ|ñ|ȼ|(?<!n)gh/i;

/** Noms d'auteurs : jamais visibles par l'apprenant (complément § 6 ; règles § 1.1, point 5). */
export const AUTEURS = /R[ée]kanga|Ambouroue|Raponda|Walker|Teisser[èe]s|Dubois|Hombouhiry|Gautier|Le Berre|Bushnell|\bWilson\b/i;

/** Termes de spécialiste (complément § 6) : jamais visibles par l'apprenant. */
export const TERMES_SPECIALISTE = [
  'labiale', 'labio', 'palais', 'palatal', 'alvéole', 'alvéolaire', 'implosi', 'aspiré', 'nasale', 'voyelle ouverte', 'voyelle fermée',
  'mi-ouverte', 'mi-fermée', 'haut-abaissé', 'downdrift', 'phonème', 'phonétique', 'transcription', 'classe nominale', 'augment',
  'connectif', 'préfixe', 'morphème', 'causatif', 'applicatif', 'fricative', 'occlusive', 'affriquée', 'bilabiale', 'vélaire',
  'battue', 'latérale', 'semi-consonne', 'API(?!\\p{L})', 'ton ponctuel', 'tons ponctuels', 'modulé',
];
const RX_TERMES = new RegExp(`(?<![\\p{L}])(${TERMES_SPECIALISTE.join('|')})`, 'iu');

/** Transcription entre crochets (ex. [àwáná]) : gardée dans les données pour la voix, jamais affichée. */
export const CROCHETS = /\[[^\]\n]*\]/;

/** Mots français admis dans un champ myènè (noms propres, emprunts laissés en français, règles § 0.3). */
export const FRANCAIS_ADMIS = new Set(['président', 'ministre', 'carrefour', 'château', 'déclin', 'démographique', 'régis', 'midi', 'école', 'télé', 'télévision']);

const NFC = (s: string) => s.normalize('NFC');

/**
 * Lettres v2 → v3 sur un texte **myènè** (règles § 4) : tch → c, ntch → nc, ts → c, dj/dy → j, ndj/ndy → nj, ñ → ngh, ṽ → v,
 * gh → g, gn → ny, è → ê, é → e. Ce qui est entre crochets n'est pas touché. N'applique aucune règle de mot (pronoms, lexique),
 * aucun signe, aucun *mw* → *nghw* : ces passes se font dans l'outil de conversion, avec relecture (consigne § 2-3).
 */
export function lettresV3(texte?: string | null): string {
  const s = NFC(texte ?? '');
  return s.split(/(\[[^\]\n]*\])/).map((part, i) => i % 2 ? part : convertirLettres(part)).join('');
}
function convertirLettres(s: string): string {
  const paires: [RegExp, string][] = [
    [/ntch/g, 'nc'], [/Ntch/g, 'Nc'], [/tch/g, 'c'], [/Tch/g, 'C'],
    [/nts(?=[aeiouêôâ])/g, 'nc'], [/Nts(?=[aeiouêôâ])/g, 'Nc'], [/(?<![\p{L}])ts(?=[aeiouêôâ])/gu, 'c'], [/(?<![\p{L}])Ts(?=[aeiouêôâ])/gu, 'C'],
    [/nd[jy]/g, 'nj'], [/Nd[jy]/g, 'Nj'], [/d[jy]/g, 'j'], [/D[jy]/g, 'J'],
    [/gh/g, 'g'], [/Gh/g, 'G'], [/gn/g, 'ny'], [/Gn/g, 'Ny'], // avant ñ → ngh, qui produit un gh voulu
    [/ñ/g, 'ngh'], [/Ñ/g, 'Ngh'], [/v̂|ṽ/g, 'v'], [/V̂|Ṽ/g, 'V'], [/ȼ/g, 'c'], [/Ȼ/g, 'C'],
    [/è/g, 'ê'], [/È/g, 'Ê'], [/é/g, 'e'], [/É/g, 'E'],
  ];
  let t = s;
  for (const [a, b] of paires) t = t.replace(a, b);
  return NFC(t);
}

/**
 * Forme sans les signes de Rékanga (‘ indéfini, tréma, accent grave) ni apostrophe typographique : sert à tolérer leur absence
 * dans les dictées tant que l'élève ne les a pas appris (consigne, lot 2). Les lettres (ê, ô, c, j…) restent exigées.
 */
export function sansSignes(texte?: string | null): string {
  return NFC((texte ?? '').replace(/[‘’]/g, (m) => m === '’' ? "'" : '').normalize('NFD').replace(/[̀̈]/g, '')).trim();
}

export type Ecart = { champ: string; regle: 'lettre_v2' | 'auteur' | 'terme_specialiste' | 'crochets'; extrait: string };

/** Mots d'un texte (lettres et diacritiques), pour ignorer les mots français admis. */
const mots = (s: string) => s.match(/[\p{L}\p{M}'’‘-]+/gu) ?? [];

/**
 * Contrôle d'un texte affiché à l'apprenant. `myene` : le champ est en myènè (toutes les lettres v2 sont interdites) ;
 * sinon (texte français), seules les suites v2 rares en français (tch, dj, dy, ṽ, ñ, gh) sont signalées.
 */
export function controlerAffiche(champ: string, texte: string | null | undefined, myene: boolean): Ecart[] {
  const t = NFC(String(texte ?? ''));
  if (!t.trim()) return [];
  const res: Ecart[] = [];
  const a = t.match(AUTEURS); if (a) res.push({ champ, regle: 'auteur', extrait: a[0] });
  const s = t.match(RX_TERMES); if (s) res.push({ champ, regle: 'terme_specialiste', extrait: s[1] });
  const c = t.match(CROCHETS); if (c) res.push({ champ, regle: 'crochets', extrait: c[0] });
  const rx = myene ? LETTRES_V2 : SUITES_V2;
  const fautif = mots(t).find(m => rx.test(m) && !FRANCAIS_ADMIS.has(m.toLocaleLowerCase('fr')) && !(m.length === 1 && !myene));
  if (fautif) res.push({ champ, regle: 'lettre_v2', extrait: fautif });
  return res;
}

const TYPES_OPTIONS_MYENE = new Set(['choix', 'trou', 'ordre', 'comprendre', 'quel_son', 'montre']);

/** Tous les écarts d'un exercice, champ par champ (seuls les champs affichés à l'apprenant sont contrôlés). */
export function ecartsExercice(e: Record<string, any>): Ecart[] {
  const r: Ecart[] = [];
  const optionsMyene = TYPES_OPTIONS_MYENE.has(e.type) && Array.isArray(e.options) && !e.options.every((o: string) => /^\s*\d+\s*$/.test(String(o)));
  r.push(...controlerAffiche('mot_myene', e.mot_myene, true));
  r.push(...controlerAffiche('graphie', e.graphie, true));
  for (const o of Array.isArray(e.options) ? e.options : []) {
    if (e.type === 'son') { const [mot, sens] = String(o).split('=').map(x => x.trim()); r.push(...controlerAffiche('options', mot, true), ...controlerAffiche('options', sens, false)); }
    else r.push(...controlerAffiche('options', o, optionsMyene));
  }
  const reponseMyene = optionsMyene || e.type === 'dictee';
  for (const rep of String(e.reponse ?? '').split('/')) r.push(...controlerAffiche('reponse', rep, reponseMyene));
  for (const z of Array.isArray(e.zones) ? e.zones : []) r.push(...controlerAffiche('zones', z?.mot, true), ...controlerAffiche('zones', z?.sens, false));
  for (const k of ['consigne', 'mot_francais', 'indice', 'texte', 'conseil']) r.push(...controlerAffiche(k, e[k], false));
  return r;
}

/** Écarts des titres et descriptions (parcours, unités, leçons). */
export function ecartsTitres(x: Record<string, any>): Ecart[] {
  return ['titre', 'titre_myene', 'description', 'palier_titre'].flatMap(k => controlerAffiche(k, x[k], false));
}
