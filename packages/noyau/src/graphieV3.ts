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
export const LETTRES_V2 = /è|é|tch|dj|dy|ṽ|v̂|ñ|ȼ|(?<!n)gh|gn|(?<!\p{L})n?ts/iu;
/** Suites de consonnes v2 rares en français : contrôlées aussi dans les textes français qui citent des mots myènè. */
export const SUITES_V2 = /tch|(?<!a)dj|dy|ṽ|ñ|ȼ|(?<!n)gh/i; // « adjectif » est du français

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

/** Mots admis dans un champ myènè : français (noms propres, emprunts, règles § 0.3) et mots écrits ainsi dans les règles v3.3 (Mandji § 0.6, tôndya § 6.7 : d + ya). */
export const FRANCAIS_ADMIS = new Set(['mandji', 'tôndya', 'président', 'ministre', 'carrefour', 'château', 'déclin', 'démographique', 'régis', 'midi', 'école', 'télé', 'télévision']);

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

export type Ecart = { champ: string; regle: 'lettre_v2' | 'accent_grave' | 'auteur' | 'terme_specialiste' | 'crochets'; extrait: string };

/**
 * L'accent grave de l'impératif (règles § 3, § 6.5) peut tomber sur un e (è) : c'est un signe v3, pas la lettre v2.
 * Il est admis quand il est sur la première voyelle du mot et seul de son espèce (vèra !, wènda !).
 */
export function graveImperatifOte(mot: string): string {
  const voyelle = mot.search(/[aeiouêôàèìòùềồâ]/i);
  return voyelle >= 0 && mot[voyelle].toLowerCase() === 'è' && (mot.match(/è/gi) ?? []).length === 1 ? mot.slice(0, voyelle) + 'e' + mot.slice(voyelle + 1) : mot;
}

const GRAVES: Record<string, string> = { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', ê: 'ề', ô: 'ồ' };
/** Sens français d'un impératif (« râpe ! », « essuie ! ») ; les formules (« Au revoir ! », « Bienvenue ! ») n'en sont pas. */
export const sensImperatif = (sens?: string | null) => /!\s*$/.test(sens ?? '') && !/^(au revoir|bienvenue|merci|bonjour|bonsoir|salut)/i.test((sens ?? '').trim());
/**
 * Règles v3.6 (Capp, 22 nov. 2026, soir) : plus aucun accent grave, l'impératif s'écrit sans signe. La fonction rend le mot
 * tel quel (gardée pour les appels existants) ; l'ancien comportement (accent sur la première voyelle) est désactivé.
 */
export function accentImperatif(mot: string): string {
  return mot;
}
/** Ancien accent de l'impératif (v3.3 à v3.5), pour mémoire et pour lire les anciens textes. */
export function accentImperatifV35(mot: string): string {
  if (/[àèìòùềồ]/.test(mot) || /\s/.test(mot.trim())) return mot;
  const i = [...mot].findIndex(ch => ch.toLowerCase() in GRAVES);
  if (i < 0) return mot;
  const l = [...mot], ch = l[i], g = GRAVES[ch.toLowerCase()];
  l[i] = ch === ch.toUpperCase() ? g.toUpperCase() : g;
  return NFC(l.join(''));
}

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
  // Règles v3.6 : aucun accent grave dans un texte myènè (è, à, ì, ò, ù, ề, ồ).
  if (myene) { const g = mots(t).find(m => /[àèìòùềồ]/i.test(m) && !FRANCAIS_ADMIS.has(m.toLocaleLowerCase('fr')) && !(m.length === 1)); if (g) res.push({ champ, regle: 'accent_grave', extrait: g }); }
  const rx = myene ? LETTRES_V2 : SUITES_V2;
  // Dans un texte français, « tch », « dy », « dj » seuls disent comment se prononce c ou j (règles § 2.2) : admis.
  const fautif = mots(t).find(m => rx.test(graveImperatifOte(m)) && !FRANCAIS_ADMIS.has(m.toLocaleLowerCase('fr')) && !(m.length === 1 && !myene) && !(!myene && /^(tch|dy|dj)$/i.test(m)));
  if (fautif) res.push({ champ, regle: 'lettre_v2', extrait: fautif });
  return res;
}

// « comprendre » : la question porte sur le sens, ses réponses sont en français.
const TYPES_OPTIONS_MYENE = new Set(['choix', 'trou', 'ordre', 'quel_son', 'montre']);

/** Tous les écarts d'un exercice, champ par champ (seuls les champs affichés à l'apprenant sont contrôlés). */
export function ecartsExercice(e: Record<string, any>): Ecart[] {
  const r: Ecart[] = [];
  const optionsMyene = TYPES_OPTIONS_MYENE.has(e.type) && Array.isArray(e.options) && !e.options.every((o: string) => /^\s*\d+\s*$/.test(String(o)));
  r.push(...controlerAffiche('mot_myene', e.mot_myene, true));
  r.push(...controlerAffiche('graphie', e.graphie, true));
  for (const o of Array.isArray(e.options) ? e.options : []) {
    if (e.type === 'son' || (e.type === 'ton' && String(o).includes('='))) { const [mot, sens] = String(o).split('=').map(x => x.trim()); r.push(...controlerAffiche('options', mot, true), ...controlerAffiche('options', sens, false)); }
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

/**
 * Formes refusées (règles v3.3 § 12, « Erreurs à ne pas refaire ») : forme fautive → forme juste. Sert au contrôleur des
 * réponses en myènè de Kak'Igonjo et des données (fine-tuning : 100 % des phrases passent le contrôleur).
 */
export const ERREURS_A_EVITER: { faux: RegExp; juste: string }[] = [
  { faux: /\ba va\b/i, juste: 'a veni' },
  { faux: /\ba jani\b/i, juste: 'a yano' },
  { faux: /\bbe luwo me\b/i, juste: 'Mênê midi, mi be nya' },
  { faux: /\bw'si\b|\bgo si\b/i, juste: 'Président wi Gabon ; go Chine' },
  { faux: /\bIncango nde w[êe] bele\b/i, juste: "Wê bel'incango nde ?" },
  { faux: /^\s*Nde\s*,/i, juste: 'Ndo, …' },
  { faux: /\bsa ntch[ée] yazo\b/i, juste: "Incango s'ince" },
  { faux: /\bagom'(ambani|araro|anayi|atani) m'/i, juste: "Igomi ny'itondo ambani" },
  { faux: /\bIgomi gni\b/i, juste: "Igomi ny'imboni" },
  { faux: /\bmbongo\b/i, juste: 'nkambi' },
  { faux: /\b[oô]mwana\b/i, juste: 'onghwana' },
  { faux: /\banaga pyezo\b/i, juste: 'anaga wa vïezo iyoma' },
  { faux: /\bonghwant'iwami\b/i, juste: "onghwant'wami" },
  // Règles v3.4 (Capp, 22 nov. 2026, soir) : re… pa = action finie, jamais un état ; Ibanga we ; phrase relevée incompréhensible.
  { faux: /\bre v[ôo]v[ôo] pa\b/i, juste: 'Myê re vôvô' },
  { faux: /\bIbanga w[êè](?!\p{L})/iu, juste: 'Ibanga we' },
  { faux: /\bre nya go nce y[êe]re\b/i, juste: '(phrase incompréhensible : ne pas construire à la volée)' },
];

/** Contrôle d'un texte écrit en myènè (réponse du modèle, phrase de données) : lettres v3 et formes refusées du § 12. */
export function controlerMyene(texte: string): { ok: boolean; ecarts: string[] } {
  const t = NFC(texte ?? '');
  const ecarts: string[] = [];
  for (const m of mots(t)) if (LETTRES_V2.test(graveImperatifOte(m)) && !FRANCAIS_ADMIS.has(m.toLocaleLowerCase('fr'))) ecarts.push(`lettre v2 : ${m}`);
  for (const e of ERREURS_A_EVITER) if (e.faux.test(t)) ecarts.push(`forme refusée (juste : ${e.juste})`);
  return { ok: !ecarts.length, ecarts };
}
