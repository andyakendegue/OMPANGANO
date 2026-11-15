/**
 * Sons et tons de l'ôrungu, décrits dans leur propre système (15 nov. 2026, consigne de Capp : jamais par comparaison au français,
 * dont la phonétique est plus pauvre). Chaque son est défini par son articulation et sa notation API, avec sa distribution,
 * et illustré par des mots sourcés donnés avec leur transcription tonale.
 *
 * Sources :
 * - [AMB] Ambouroue 2007, *Éléments de description de l'orungu* (thèse) : voyelles p. 11-12, consonnes p. 12-19, tons p. 52-57 ;
 * - [LEC-ÉCR] Leçons omyènè, « Comment écrire l'Omyènè » (`03_lecons_omyene/02_grammaire_conjugaison/Comment écrire l.docx`) ;
 * - [RÈGLES] `_contexte/REGLES_ECRITURE_LECTURE_MYENE.md` v2.0 (graphie DONDO normalisée, décisions de Capp).
 * La graphie DONDO n'écrit pas les tons (RÈGLES § 3.7) : ils s'apprennent par la transcription phonétique ([AMB]).
 */
export interface ExempleSon { mot?: string; phonetique?: string; sens: string; source: string }
export interface Phoneme {
  /** Notation API (phonème ou réalisation). */
  api: string;
  /** Graphie DONDO normalisée correspondante (RÈGLES § 2-3). */
  graphie: string;
  type: 'voyelle' | 'consonne' | 'semi-consonne';
  /** Définition articulatoire (AMB). */
  articulation: string;
  /** Voyelles : degré d'aperture de 1 (fermée) à 4 (ouverte) et série, pour l'animation des lèvres. */
  aperture?: 1 | 2 | 3 | 4;
  serie?: 'antérieure' | 'postérieure' | 'centrale';
  /** Consonnes : lieu (pour le schéma de la bouche) et mode. */
  lieu?: 'lèvres' | 'lèvres-dents' | 'alvéoles' | 'palais' | 'voile' | 'lèvres-palais' | 'lèvres-voile';
  mode?: string;
  /** Particularité de l'air : implosive (l'air entre) ou aspirée (souffle après l'occlusion). */
  air?: 'implosif' | 'aspiré';
  /** Distribution et règles de réalisation (AMB, RÈGLES). */
  distribution?: string;
  exemples: ExempleSon[];
}

/** Les sept voyelles orales de l'ôrungu (AMB p. 11-12) : aperture et série ; pas de voyelle nasale ; pas de voyelle longue en soi. */
export const VOYELLES: Phoneme[] = [
  { api: 'i', graphie: 'i', type: 'voyelle', articulation: 'voyelle antérieure fermée (1er degré d\'aperture)', aperture: 1, serie: 'antérieure',
    exemples: [{ phonetique: '[ìncìnì]', sens: 'des mouches', source: 'AMB p. 12' }, { mot: 'kisini', sens: 'la cuisine', source: 'LEC-ÉCR' }] },
  { api: 'e', graphie: 'é (e)', type: 'voyelle', articulation: 'voyelle antérieure mi-fermée (2e degré)', aperture: 2, serie: 'antérieure',
    distribution: 'Jamais muette (RÈGLES § 2.1).',
    exemples: [{ mot: 'éréré', phonetique: '[èréré]', sens: 'un arbre', source: 'AMB p. 12 ; LEC-ÉCR' }] },
  { api: 'ɛ', graphie: 'è', type: 'voyelle', articulation: 'voyelle antérieure mi-ouverte (3e degré)', aperture: 3, serie: 'antérieure',
    distribution: 'N\'apparaît jamais en début de mot (AMB p. 12).',
    exemples: [{ phonetique: '[òŋɥɛ́ŋgɛ́]', sens: 'un brochet', source: 'AMB p. 12' }, { mot: 'mbèrè', phonetique: '[m̀bɛ́rɛ́]', sens: 'une sardine', source: 'AMB p. 53 ; LEC-ÉCR' }] },
  { api: 'a', graphie: 'a', type: 'voyelle', articulation: 'voyelle centrale ouverte (4e degré)', aperture: 4, serie: 'centrale',
    exemples: [{ mot: 'awana', phonetique: '[àwáná]', sens: 'des enfants', source: 'AMB p. 12 ; LEC-ÉCR' }] },
  { api: 'ɔ', graphie: 'ô', type: 'voyelle', articulation: 'voyelle postérieure mi-ouverte (3e degré), lèvres arrondies', aperture: 3, serie: 'postérieure',
    distribution: 'N\'apparaît jamais en début de mot (AMB p. 12). Chez Teisserès-Dubois, o et ô sont inversés (RÈGLES § 2.1).',
    exemples: [{ mot: 'akôndô', phonetique: '[àkɔ̀ndɔ̀]', sens: 'des bananes plantains', source: 'AMB p. 12 ; LEC-ÉCR' }] },
  { api: 'o', graphie: 'o', type: 'voyelle', articulation: 'voyelle postérieure mi-fermée (2e degré), lèvres arrondies', aperture: 2, serie: 'postérieure',
    exemples: [{ phonetique: '[òɣòló]', sens: 'un pied', source: 'AMB p. 12' }, { mot: 'épokolo', sens: 'le chapeau', source: 'LEC-ÉCR' }] },
  { api: 'u', graphie: 'u', type: 'voyelle', articulation: 'voyelle postérieure fermée (1er degré), lèvres arrondies', aperture: 1, serie: 'postérieure',
    distribution: 'N\'apparaît jamais en début de mot (AMB p. 12). Devant /u/, p et t sont aspirés (AMB p. 13).',
    exemples: [{ phonetique: '[ìncúnú]', sens: 'des fourmis', source: 'AMB p. 12' }, { mot: 'ékuru', sens: 'le hibou', source: 'LEC-ÉCR' }] },
];

/** Consonnes et semi-consonnes de l'ôrungu (AMB p. 12-19), regroupées par particularité. */
export const CONSONNES: Phoneme[] = [
  { api: 'ɓ', graphie: 'b', type: 'consonne', articulation: 'occlusive bilabiale sonore implosive', lieu: 'lèvres', mode: 'occlusive implosive', air: 'implosif',
    distribution: 'Les occlusives sonores sont implosives partout, sauf après une nasale où elles sont explosives (mb) (AMB p. 13).',
    exemples: [{ mot: 'ébanda', phonetique: '[èɓándá]', sens: 'une peau', source: 'AMB p. 13 ; LEC-ÉCR' }] },
  { api: 'ɗ', graphie: 'd', type: 'consonne', articulation: 'occlusive apico-alvéolaire sonore implosive', lieu: 'alvéoles', mode: 'occlusive implosive', air: 'implosif',
    distribution: 'Implosive partout sauf après une nasale (nd) (AMB p. 13).',
    exemples: [{ phonetique: '[ɗènà]', sens: 'pleurer', source: 'AMB p. 14' }] },
  { api: 'pʰ', graphie: 'p', type: 'consonne', articulation: 'occlusive bilabiale sourde aspirée', lieu: 'lèvres', mode: 'occlusive aspirée', air: 'aspiré',
    distribution: 'Aspirée devant /u/, non aspirée ailleurs (AMB p. 13).',
    exemples: [{ phonetique: '[pʰúpʰú]', sens: 'blanc', source: 'AMB p. 13' }] },
  { api: 'tʰ', graphie: 't', type: 'consonne', articulation: 'occlusive apico-alvéolaire sourde aspirée', lieu: 'alvéoles', mode: 'occlusive aspirée', air: 'aspiré',
    distribution: 'Aspirée devant /u/ (AMB p. 13).',
    exemples: [{ phonetique: '[ìtʰútʰú]', sens: 'du vin de palme', source: 'AMB p. 14' }] },
  { api: 'β', graphie: 'ṽ', type: 'consonne', articulation: 'fricative bilabiale sonore : les deux lèvres se rapprochent sans se fermer', lieu: 'lèvres', mode: 'fricative',
    distribution: 'Réalisée [v] par certains jeunes citadins ; la communauté admet [β] (AMB p. 15). Graphie ṽ : décision de Capp (RÈGLES § 2.2).',
    exemples: [{ mot: 'iṽaṽa', phonetique: '[ìβàβá]', sens: 'une aile', source: 'AMB p. 13 ; LEC-ÉCR (« ivava ») ; graphie RÈGLES § 2.2' }] },
  { api: 'ɣ', graphie: 'g', type: 'consonne', articulation: 'fricative dorso-vélaire sonore ; réalisée occlusive [g] après une nasale', lieu: 'voile', mode: 'fricative',
    distribution: '[g] et [ɣ] sont deux réalisations du même phonème /g/ : [g] après une nasale, [ɣ] partout ailleurs (AMB p. 18).',
    exemples: [{ phonetique: '[òɣèɥé]', sens: 'un banquet', source: 'AMB p. 14' }, { mot: 'go', sens: 'là-bas', source: 'LEC-ÉCR' }] },
  { api: 'ɾ', graphie: 'r', type: 'consonne', articulation: 'battue apico-alvéolaire : la pointe de la langue frappe une fois les alvéoles', lieu: 'alvéoles', mode: 'battue',
    exemples: [{ phonetique: '[ɾéré]', sens: 'des arbres', source: 'AMB p. 14' }] },
  { api: 'ŋ', graphie: 'ñ', type: 'consonne', articulation: 'nasale dorso-vélaire', lieu: 'voile', mode: 'nasale',
    distribution: 'Phonème à part entière : aussi à l\'initiale et devant voyelle (AMB p. 17-18).',
    exemples: [{ phonetique: '[ŋòmbá]', sens: 'un porc-épic', source: 'AMB p. 14' }] },
  { api: 'ɲ', graphie: 'ny', type: 'consonne', articulation: 'nasale dorso-palatale, réalisation de la suite n + y', lieu: 'palais', mode: 'nasale',
    distribution: 'Graphie ny (AMB p. 17 ; décision de Capp, RÈGLES § 2.2).',
    exemples: [{ mot: 'nyama', phonetique: '[nyàmà]', sens: 'un animal', source: 'AMB p. 17' }, { mot: 'nyéza myè', sens: 'excuse-moi', source: 'LEC-ÉCR' }] },
  { api: 'c', graphie: 'tch', type: 'consonne', articulation: 'affriquée dorso-palatale sourde', lieu: 'palais', mode: 'affriquée',
    exemples: [{ phonetique: '[cwàná]', sens: 'une marmite', source: 'AMB p. 14' }, { mot: 'intchango', sens: 'les nouvelles', source: 'LEC-ÉCR' }] },
  { api: 'ⁿc', graphie: 'ntch', type: 'consonne', articulation: 'affriquée dorso-palatale sourde mi-nasale', lieu: 'palais', mode: 'affriquée mi-nasale',
    exemples: [{ phonetique: '[ìncózó]', sens: 'des chaussures', source: 'AMB p. 14' }] },
  { api: 'ⁿɟ', graphie: 'ndj', type: 'consonne', articulation: 'affriquée dorso-palatale sonore mi-nasale', lieu: 'palais', mode: 'affriquée mi-nasale',
    exemples: [{ phonetique: '[ìnjìnà]', sens: 'des gorilles', source: 'AMB p. 14' }] },
  { api: 'ᵐp · ᵐb · ᵐf · ⁿt · ⁿd · ᵑk · ᵑg', graphie: 'mp · mb · mf · nt · nd · nk · ng', type: 'consonne', articulation: 'mi-nasales : nasale et occlusive forment une seule consonne, au même lieu d\'articulation', mode: 'mi-nasale',
    distribution: 'On ne coupe jamais une syllabe entre la nasale et la consonne : mpè-mba, ô-nwa-ntô (RÈGLES § 2.2).',
    exemples: [{ phonetique: '[àmpázá]', sens: 'des jumeaux', source: 'AMB p. 13' }, { phonetique: '[ìmbòmí]', sens: 'des calebasses', source: 'AMB p. 13' }, { phonetique: '[ìŋkàmbí]', sens: 'des antilopes', source: 'AMB p. 14' }, { mot: 'ngôma', sens: 'le tam-tam', source: 'LEC-ÉCR' }] },
  { api: 'ɥ', graphie: 'w (devant i, e, ɛ, y)', type: 'semi-consonne', articulation: 'semi-consonne labio-palatale : réalisation de /w/ devant une voyelle antérieure ou /y/', lieu: 'lèvres-palais', mode: 'continue',
    exemples: [{ phonetique: '[òyɥé]', sens: 'un cheveu blanc', source: 'AMB p. 14' }, { phonetique: '[òrɥé]', sens: 'un cheveu', source: 'AMB p. 18' }] },
  { api: 'w', graphie: 'w', type: 'semi-consonne', articulation: 'semi-consonne labio-vélaire ; aussi réalisation de /u/, /o/, /ɔ/ devant une voyelle', lieu: 'lèvres-voile', mode: 'continue',
    exemples: [{ phonetique: '[wáwó]', sens: 'eux', source: 'AMB p. 14' }] },
  { api: 'y', graphie: 'y', type: 'semi-consonne', articulation: 'semi-consonne dorso-palatale ; aussi réalisation de /i/ devant une voyelle', lieu: 'palais', mode: 'continue',
    exemples: [{ phonetique: '[òyàβí]', sens: 'une feuille', source: 'AMB p. 14' }] },
  { api: 'h', graphie: 'h', type: 'consonne', articulation: 'souffle, la langue collée au palais (description de la leçon ; absent de l\'inventaire d\'Ambouroue)', lieu: 'palais', mode: 'fricative',
    exemples: [{ mot: 'handi', sens: 'la jalousie', source: 'LEC-ÉCR' }] },
];

export interface Ton { nom: string; notation: string; marque: string; type: 'ponctuel' | 'modulé'; description: string; exemples: ExempleSon[] }
/** Tons de l'ôrungu (AMB p. 52-57) : trois ponctuels, deux modulés rares ; le ton montant n'est jamais réalisé. */
export const TONS: Ton[] = [
  { nom: 'haut', notation: 'H', marque: '́', type: 'ponctuel', description: 'Voix haute.', exemples: [{ phonetique: '[mɛ́nɛ́]', sens: 'demain', source: 'AMB p. 53' }, { phonetique: '[òɾámbáká]', sens: 'une racine', source: 'AMB p. 53' }] },
  { nom: 'bas', notation: 'B', marque: '̀', type: 'ponctuel', description: 'Voix basse.', exemples: [{ phonetique: '[òmàmbà]', sens: 'un serpent', source: 'AMB p. 53' }, { phonetique: '[swàkà]', sens: 'un couteau', source: 'AMB p. 53' }] },
  { nom: 'haut-abaissé', notation: 'A', marque: '̍', type: 'ponctuel', description: 'Niveau intermédiaire entre le haut et le bas.', exemples: [{ phonetique: '[íla̍sà]', sens: 'l\'orange', source: 'AMB p. 53' }, { phonetique: '[éze̍nì]', sens: 'le débarcadère', source: 'AMB p. 53' }] },
  { nom: 'descendant', notation: 'HB', marque: '̂', type: 'modulé', description: 'Commence haut et finit bas sur la même syllabe (infinitifs de type A, certaines formes conjuguées, « combien », « tout »).', exemples: [{ phonetique: '[nyâ]', sens: 'manger', source: 'AMB p. 53' }, { phonetique: '[pâ]', sens: 'donner', source: 'AMB p. 53' }] },
  { nom: 'haut abaissé-bas', notation: 'AB', marque: '̍̀', type: 'modulé', description: 'Niveau intermédiaire puis bas sur la même syllabe (thème « combien », présent, passé proche et passé négatif des verbes CV).', exemples: [{ phonetique: '[àwáná wínya̍̀]', sens: 'les enfants mangent', source: 'AMB p. 55' }] },
];
/** Le ton porte la grammaire : indéfini et défini, nom et forme verbale (AMB p. 55-56). */
export const PAIRES_TONALES: { a: ExempleSon; b: ExempleSon }[] = [
  { a: { phonetique: '[èzó]', sens: 'un mortier', source: 'AMB p. 56' }, b: { phonetique: '[ézò]', sens: 'le mortier', source: 'AMB p. 56' } },
  { a: { phonetique: '[èzàlìnà]', sens: 'un peigne', source: 'AMB p. 56' }, b: { phonetique: '[èzálìnà]', sens: 'le peigne', source: 'AMB p. 56' } },
  { a: { phonetique: '[pá]', sens: 'des os', source: 'AMB p. 56' }, b: { phonetique: '[pâ]', sens: 'donner (type A)', source: 'AMB p. 56' } },
];

export const PHONEMES: Phoneme[] = [...VOYELLES, ...CONSONNES];
/** Son par sa notation API ou sa graphie DONDO. */
export const phonemeDe = (cle?: string | null) => { const k = (cle ?? '').trim(); return PHONEMES.find(p => p.api === k) ?? PHONEMES.find(p => p.graphie === k) ?? null; };

// ------------------------------------------------------------------ mélodie tonale (pour le dessin des tons)
export type Hauteur = 'H' | 'A' | 'B' | 'HB' | 'AB';
const VOY = 'aeiouɛɔəɨʉ';
/**
 * Découpe une transcription phonétique ([àwáná]) en syllabes portant chacune son ton, d'après les diacritiques d'Ambouroue :
 * aigu = H, grave = B, trait vertical = A, circonflexe = HB, trait vertical + grave = AB. Une voyelle sans marque n'a pas de ton noté.
 */
export function melodie(transcription: string): { syllabe: string; ton: Hauteur | null }[] {
  const t = transcription.replace(/[[\]]/g, '').normalize('NFD');
  const res: { syllabe: string; ton: Hauteur | null }[] = [];
  let courant = '';
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    courant += ch;
    // Nasale syllabique qui porte un ton ([m̀bɛ́rɛ́]) : elle forme sa propre syllabe.
    const nasaleTonale = 'mnŋ'.includes(ch) && i + 1 < t.length && /[\u0300\u0301\u0302\u030D]/.test(t[i + 1]);
    if (VOY.includes(ch.toLowerCase()) || nasaleTonale) {
      let marques = '';
      while (i + 1 < t.length && /[̀-ͯ]/.test(t[i + 1])) { marques += t[++i]; courant += t[i]; }
      const ton: Hauteur | null = marques.includes('̍') && marques.includes('̀') ? 'AB' : marques.includes('̍') ? 'A' : marques.includes('̂') ? 'HB' : marques.includes('́') ? 'H' : marques.includes('̀') ? 'B' : null;
      res.push({ syllabe: courant.normalize('NFC'), ton });
      courant = '';
    }
  }
  if (courant.trim() && res.length) res[res.length - 1].syllabe += courant.normalize('NFC');
  else if (courant.trim()) res.push({ syllabe: courant.normalize('NFC'), ton: null });
  return res.filter(s => s.syllabe.trim());
}

/**
 * Exemples d'une carte « son » fournis par le contenu : colonne `options`, une entrée par mot,
 * « mot = sens = transcription = illustration » (les deux derniers facultatifs). Ex. « éréré = un arbre = [èréré] = 🌳 ».
 */
export function exemplesSon(options?: string[] | null): { mot: string; sens: string; phonetique: string | null; illustration: string | null }[] {
  return (options ?? []).map(o => o.split('=').map(x => x.trim())).filter(p => p[0]).map(([mot, sens, ph, ill]) => ({ mot, sens: sens ?? '', phonetique: ph || null, illustration: ill || null }));
}
/** Position de la première occurrence d'une graphie dans un mot (sans tenir compte des majuscules) ; -1 si absente. */
export function positionSon(mot: string, graphie: string): number {
  return mot.toLocaleLowerCase('fr').normalize('NFC').indexOf(graphie.toLocaleLowerCase('fr').normalize('NFC'));
}
