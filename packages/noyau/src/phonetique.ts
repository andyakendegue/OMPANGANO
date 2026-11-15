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
  // ---- inventaire complet d'Ambouroue (p. 12-14) : occlusives non implosives, nasales, fricatives, latérale, mi-nasales une à une
  { api: 'p', graphie: 'p', type: 'consonne', articulation: 'occlusive bilabiale sourde, sans aspiration', lieu: 'lèvres', mode: 'occlusive',
    distribution: 'Non aspirée partout, sauf devant /u/ où elle devient [pʰ] (AMB p. 13).',
    exemples: [{ mot: 'épokolo', sens: 'le chapeau', source: 'LEC-ÉCR' }] },
  { api: 't', graphie: 't', type: 'consonne', articulation: 'occlusive apico-alvéolaire sourde, sans aspiration', lieu: 'alvéoles', mode: 'occlusive',
    distribution: 'Non aspirée partout, sauf devant /u/ où elle devient [tʰ] (AMB p. 13). Consonne forte : sa forme faible est r (tènda → e ga rènde, RÈGLES § 6.3).',
    exemples: [{ phonetique: '[ìtòtò]', sens: 'une banane douce', source: 'AMB p. 14' }] },
  { api: 'k', graphie: 'k', type: 'consonne', articulation: 'occlusive dorso-vélaire sourde', lieu: 'voile', mode: 'occlusive',
    distribution: 'Il n\'existe pas d\'implosive dorso-vélaire (AMB p. 13). Consonne forte : sa forme faible est g (kènda → gènda !, ogèndo, RÈGLES § 6.3 ; AMB p. 177-179).',
    exemples: [{ phonetique: '[kàŋgà]', sens: 'frire', source: 'AMB p. 14' }, { mot: 'go koula', sens: 'puiser', source: 'LEC-ÉCR' }] },
  { api: 'm', graphie: 'm', type: 'consonne', articulation: 'nasale bilabiale : les lèvres fermées, l\'air passe par le nez', lieu: 'lèvres', mode: 'nasale',
    exemples: [{ phonetique: '[àmání]', sens: 'des mauvaises herbes', source: 'AMB p. 13' }, { mot: 'maniza !', sens: 'termine !', source: 'LEC-ÉCR' }] },
  { api: 'n', graphie: 'n', type: 'consonne', articulation: 'nasale apico-alvéolaire : la pointe de la langue aux alvéoles, l\'air passe par le nez', lieu: 'alvéoles', mode: 'nasale',
    distribution: 'n + y se réalise [ɲ] (graphie ny) (AMB p. 17).',
    exemples: [{ phonetique: '[ònɛ́mɛ́]', sens: 'une langue', source: 'AMB p. 14' }] },
  { api: 'f', graphie: 'f', type: 'consonne', articulation: 'fricative labio-dentale sourde : la lèvre inférieure contre les dents du haut', lieu: 'lèvres-dents', mode: 'fricative',
    distribution: 'Consonne forte : à l\'impératif, au passé éloigné et au subjonctif, elle passe à w ou v (fanga « craindre » → wanga ! ou vanga ! « crains », AMB p. 15-16).',
    exemples: [{ phonetique: '[èfú]', sens: 'une couverture', source: 'AMB p. 13 ; LEC-ÉCR (« éfu »)' }] },
  { api: 'v', graphie: 'v', type: 'consonne', articulation: 'fricative labio-dentale sonore : la lèvre inférieure contre les dents du haut, avec la voix', lieu: 'lèvres-dents', mode: 'fricative',
    distribution: 'Phonème distinct de /β/ (ṽ) et de /w/ : il distingue l\'impératif des verbes en f de celui des verbes en ɓ : [vàlá] « laisse » (de [fàlà]) / [wàlá] « rends visite » (de [ɓàlà]) (AMB p. 16-17). Prononcer [v] à la place de [β] (ìvúvà pour ìβúβà, « le genou ») est une variante de jeunes citadins que la communauté n\'admet pas (AMB p. 15).',
    exemples: [{ phonetique: '[vàlá]', sens: 'laisse', source: 'AMB p. 16' }, { phonetique: '[vèmá]', sens: 'trompe-toi', source: 'AMB p. 15' }] },
  { api: 's', graphie: 's', type: 'consonne', articulation: 'fricative apico-alvéolaire sourde ; elle reste sourde entre deux voyelles', lieu: 'alvéoles', mode: 'fricative',
    distribution: 'Toujours sourde, même entre deux voyelles (RÈGLES § 2.2). Consonne forte : sa forme faible est z (sumina → a zumini, RÈGLES § 6.3).',
    exemples: [{ phonetique: '[èβèlèsè]', sens: 'un foulard', source: 'AMB p. 14' }, { mot: 'sônô', sens: 'la semaine', source: 'LEC-ÉCR' }] },
  { api: 'z', graphie: 'z', type: 'consonne', articulation: 'fricative apico-alvéolaire sonore', lieu: 'alvéoles', mode: 'fricative',
    exemples: [{ phonetique: '[òzózí]', sens: 'un pilon', source: 'AMB p. 14' }] },
  { api: 'l', graphie: 'l', type: 'consonne', articulation: 'latérale apico-alvéolaire : la pointe de la langue aux alvéoles, l\'air passe sur les côtés', lieu: 'alvéoles', mode: 'latérale',
    distribution: 'Forme faible de d (déna → za lénigi ; dimbina → limbine, RÈGLES § 6.3).',
    exemples: [{ phonetique: '[òlóló]', sens: 'une papaye', source: 'AMB p. 14' }] },
  { api: 'ᵐp', graphie: 'mp', type: 'consonne', articulation: 'mi-nasale bilabiale sourde : m et p ne forment qu\'une consonne', lieu: 'lèvres', mode: 'mi-nasale',
    distribution: 'On ne coupe jamais la syllabe entre la nasale et la consonne : mpè-mba (RÈGLES § 2.2).',
    exemples: [{ phonetique: '[àmpázá]', sens: 'des jumeaux', source: 'AMB p. 13' }, { mot: 'ompuna', sens: 'l\'odeur', source: 'LEC-ÉCR' }] },
  { api: 'ᵐb', graphie: 'mb', type: 'consonne', articulation: 'mi-nasale bilabiale sonore : après la nasale, le b est explosif (non implosif)', lieu: 'lèvres', mode: 'mi-nasale',
    distribution: 'Seule place où b n\'est pas implosif : après une nasale (AMB p. 13).',
    exemples: [{ phonetique: '[ìmbòmí]', sens: 'des calebasses', source: 'AMB p. 13' }, { mot: 'mbina', sens: 'le pou', source: 'LEC-ÉCR' }] },
  { api: 'ᵐf', graphie: 'mf', type: 'consonne', articulation: 'mi-nasale labio-dentale sourde', lieu: 'lèvres-dents', mode: 'mi-nasale',
    exemples: [{ phonetique: '[ìmfèlíní]', sens: 'des manières de mettre', source: 'AMB p. 13 ; LEC-ÉCR (« imfélini »)' }] },
  { api: 'ⁿt', graphie: 'nt', type: 'consonne', articulation: 'mi-nasale apico-alvéolaire sourde', lieu: 'alvéoles', mode: 'mi-nasale',
    exemples: [{ phonetique: '[ìntímbé]', sens: 'des planches', source: 'AMB p. 14' }] },
  { api: 'ⁿd', graphie: 'nd', type: 'consonne', articulation: 'mi-nasale apico-alvéolaire sonore : après la nasale, le d est explosif (non implosif)', lieu: 'alvéoles', mode: 'mi-nasale',
    exemples: [{ phonetique: '[ìndèndéndè]', sens: 'des libellules', source: 'AMB p. 14' }] },
  { api: 'ᵑk', graphie: 'nk', type: 'consonne', articulation: 'mi-nasale dorso-vélaire sourde', lieu: 'voile', mode: 'mi-nasale',
    exemples: [{ phonetique: '[ìŋkàmbí]', sens: 'des antilopes', source: 'AMB p. 14' }, { mot: 'nkôla', sens: 'la montre ; la coquille', source: 'LEC-ÉCR' }] },
  { api: 'ᵑg', graphie: 'ng', type: 'consonne', articulation: 'mi-nasale dorso-vélaire sonore : seule place où g est occlusif', lieu: 'voile', mode: 'mi-nasale',
    distribution: '[g] n\'apparaît qu\'après une nasale ; partout ailleurs, /g/ se réalise [ɣ] (AMB p. 18).',
    exemples: [{ phonetique: '[ìŋgóŋgó]', sens: 'une boîte', source: 'AMB p. 14' }, { mot: 'ngôma', sens: 'le tam-tam', source: 'LEC-ÉCR' }] },
  { api: 'dʒ', graphie: 'dj', type: 'consonne', articulation: 'affriquée palatale sonore', lieu: 'palais', mode: 'affriquée',
    distribution: 'Graphie dj des leçons omyènè (RÈGLES § 2.2). L\'inventaire d\'Ambouroue pour l\'ôrungu n\'a pas d\'affriquée sonore hors nasale (p. 13) : réalisation à confirmer par le relecteur.',
    exemples: [{ mot: 'djôgôni', sens: 'la poule', source: 'LEC-ÉCR' }] },
  { api: 'dʲ', graphie: 'dy', type: 'consonne', articulation: 'occlusive sonore palatalisée : d et y en un seul son', lieu: 'palais', mode: 'occlusive palatalisée',
    distribution: 'Graphie dy (RÈGLES § 2.2). Consonne forte : sa forme faible est y (jola → yola !, RÈGLES § 6.3). Absente de l\'inventaire d\'Ambouroue : à confirmer par le relecteur.',
    exemples: [{ mot: 'go dyèna', sens: 'voir', source: 'LEC-ÉCR' }] },
  { api: 'ᵐp · ᵐb · ᵐf · ⁿt · ⁿd · ᵑk · ᵑg', graphie: 'mp · mb · mf · nt · nd · nk · ng', type: 'consonne', articulation: 'famille des mi-nasales : nasale et occlusive forment une seule consonne, au même lieu d\'articulation', mode: 'mi-nasale',
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

/**
 * Exemples supplémentaires (Ambouroue 2007, p. 17-18, 53-55 et annexe 1 « valeur pertinente des phonèmes », p. 361-371) :
 * au moins trois mots par son quand le corpus les donne, pour répéter et mémoriser. Écriture tirée de la transcription (graphieDondo).
 */
const EXEMPLES_AMBOUROUE: Record<string, ExempleSon[]> = {
  'i': [{ phonetique: '[ìɗó]', sens: 'une pierre', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[ípì]', sens: 'le pangolin', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[zìzá]', sens: 'essuie !', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[ɣìlá]', sens: 'râpe !', source: 'AMB p. 361 (annexe 1)' }],
  'e': [{ phonetique: '[ɥèndá]', sens: 'fâche-toi !', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[βèɾá]', sens: 'fuis !', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[òɥénjà]', sens: 'la journée', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[ɣèɾá]', sens: 'partage !', source: 'AMB p. 361 (annexe 1)' }],
  'ɛ': [{ phonetique: '[mɛ̀ná]', sens: 'avale !', source: 'AMB p. 362 (annexe 1)' }, { phonetique: '[èɾɛ́mí]', sens: 'une hache', source: 'AMB p. 362 (annexe 1)' }, { phonetique: '[βɛ̀ɾá]', sens: 'imite !', source: 'AMB p. 362 (annexe 1)' }, { phonetique: '[ìɥɛ́nɛ̀]', sens: 'le sein', source: 'AMB p. 361 (annexe 1)' }],
  'a': [{ phonetique: '[ípà]', sens: 'la récompense', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[òɣá]', sens: 'un roi', source: 'AMB p. 362 (annexe 1)' }, { phonetique: '[òɗá]', sens: 'une jachère', source: 'AMB p. 362 (annexe 1)' }, { phonetique: '[βàná]', sens: 'sculpte !', source: 'AMB p. 363 (annexe 1)' }],
  'ɔ': [{ phonetique: '[zɔ̀zá]', sens: 'plaide !', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[mɔ̀ná]', sens: 'observe !', source: 'AMB p. 362 (annexe 1)' }, { phonetique: '[òɣɔ́]', sens: 'un bras', source: 'AMB p. 362 (annexe 1)' }, { phonetique: '[βɔ̀ná]', sens: 'regarde !', source: 'AMB p. 363 (annexe 1)' }],
  'o': [{ phonetique: '[òɗó]', sens: 'un lit', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[ɣòɾá]', sens: 'attache !', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[èɾómí]', sens: 'un apôtre', source: 'AMB p. 362 (annexe 1)' }, { phonetique: '[nòɣá]', sens: 'construis !', source: 'AMB p. 362 (annexe 1)' }],
  'u': [{ phonetique: '[ɣùlá]', sens: 'puise (de l\'eau) !', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[βùɾá]', sens: 'plie !', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[nùɣá]', sens: 'pagaie !', source: 'AMB p. 362 (annexe 1)' }, { phonetique: '[òɣú]', sens: 'une chenille', source: 'AMB p. 362 (annexe 1)' }],
  'p': [{ phonetique: '[èpóŋgò]', sens: 'la gorge', source: 'AMB p. 363 (annexe 1)' }, { phonetique: '[èpá]', sens: 'un os', source: 'AMB p. 363 (annexe 1)' }, { phonetique: '[òpá]', sens: 'une lutte', source: 'AMB p. 363 (annexe 1)' }, { phonetique: '[épà]', sens: 'l\'os', source: 'AMB p. 363 (annexe 1)' }],
  'pʰ': [{ phonetique: '[àmpʰúnì]', sens: 'l\'écume', source: 'AMB p. 364 (annexe 1)' }, { phonetique: '[pʰúsì]', sens: 'un chat', source: 'AMB p. 364 (annexe 1)' }],
  'ɓ': [{ phonetique: '[òɓá]', sens: 'un manguier', source: 'AMB p. 364 (annexe 1)' }, { phonetique: '[ìɓémbè]', sens: 'la colombe', source: 'AMB p. 364 (annexe 1)' }, { phonetique: '[òɓémbè]', sens: 'le sifflet', source: 'AMB p. 364 (annexe 1)' }, { phonetique: '[èɓóŋgò]', sens: 'le tabouret', source: 'AMB p. 363 (annexe 1)' }],
  'm': [{ phonetique: '[òmá]', sens: 'une personne', source: 'AMB p. 364 (annexe 1)' }, { phonetique: '[òmóndò]', sens: 'la lisière', source: 'AMB p. 365 (annexe 1)' }, { phonetique: '[mónjà]', sens: 'la feuille de raphia', source: 'AMB p. 365 (annexe 1)' }],
  'β': [{ phonetique: '[èβá]', sens: 'un bocal', source: 'AMB p. 363 (annexe 1)' }, { phonetique: '[ìβóŋgò]', sens: 'le large', source: 'AMB p. 365 (annexe 1)' }, { phonetique: '[òβónò]', sens: 'la ruse', source: 'AMB p. 365 (annexe 1)' }, { phonetique: '[èβóɾà]', sens: 'la blessure', source: 'AMB p. 365 (annexe 1)' }],
  'f': [{ phonetique: '[òfá]', sens: 'une arête', source: 'AMB p. 363 (annexe 1)' }, { phonetique: '[ófè]', sens: 'le voleur', source: 'AMB p. 365 (annexe 1)' }, { phonetique: '[èfáɾò]', sens: 'la coquetterie', source: 'AMB p. 365 (annexe 1)' }],
  'v': [{ phonetique: '[ìfévà]', sens: 'la laideur', source: 'AMB p. 366 (annexe 1)' }, { phonetique: '[vèlá]', sens: 'mets !', source: 'AMB p. 366 (annexe 1)' }, { phonetique: '[wávàlì]', sens: 'ils ont abandonné (il y a longtemps)', source: 'AMB p. 366 (annexe 1)' }],
  't': [{ phonetique: '[ótà]', sens: 'l\'unité', source: 'AMB p. 366 (annexe 1)' }, { phonetique: '[ítà]', sens: 'la chasse', source: 'AMB p. 366 (annexe 1)' }, { phonetique: '[òtándò]', sens: 'le brancard', source: 'AMB p. 366 (annexe 1)' }, { phonetique: '[ìté]', sens: 'des tiges de raphia', source: 'AMB p. 366 (annexe 1)' }],
  'tʰ': [{ phonetique: '[òtʰútʰù]', sens: 'la fumée', source: 'AMB p. 366 (annexe 1)' }, { phonetique: '[òtʰúmbà]', sens: 'la ceinture', source: 'AMB p. 366 (annexe 1)' }],
  'ɗ': [{ phonetique: '[óɗà]', sens: 'la jachère', source: 'AMB p. 366 (annexe 1)' }, { phonetique: '[òɗándò]', sens: 'l\'ambiance', source: 'AMB p. 367 (annexe 1)' }, { phonetique: '[íɗò]', sens: 'la pierre', source: 'AMB p. 367 (annexe 1)' }, { phonetique: '[ìɗándùnò]', sens: 'la rédemption', source: 'AMB p. 367 (annexe 1)' }],
  'n': [{ phonetique: '[ínà]', sens: 'le nom', source: 'AMB p. 367 (annexe 1)' }, { phonetique: '[nómbà]', sens: 'la montagne', source: 'AMB p. 368 (annexe 1)' }, { phonetique: '[ìnínà]', sens: 'l\'ombre', source: 'AMB p. 370 (annexe 1)' }],
  's': [{ phonetique: '[ísà]', sens: 'le maïs', source: 'AMB p. 366 (annexe 1)' }, { phonetique: '[ásà]', sens: 'les épis de maïs', source: 'AMB p. 368 (annexe 1)' }, { phonetique: '[èsíŋgà]', sens: 'le gazon', source: 'AMB p. 367 (annexe 1)' }, { phonetique: '[òsɛ́ɣɛ̀]', sens: 'l\'intestin', source: 'AMB p. 368 (annexe 1)' }],
  'z': [{ phonetique: '[ózò]', sens: 'le visage', source: 'AMB p. 368 (annexe 1)' }, { phonetique: '[òzónò]', sens: 'le rotin', source: 'AMB p. 365 (annexe 1)' }, { phonetique: '[ìzáŋgà]', sens: 'le terrain', source: 'AMB p. 368 (annexe 1)' }, { phonetique: '[òzɛ́ɣɛ̀]', sens: 'le sable blanc', source: 'AMB p. 368 (annexe 1)' }],
  'l': [{ phonetique: '[èlíŋgà]', sens: 'la robe', source: 'AMB p. 367 (annexe 1)' }, { phonetique: '[òlándò]', sens: 'la rive', source: 'AMB p. 366 (annexe 1)' }, { phonetique: '[òlálà]', sens: 'la palme', source: 'AMB p. 370 (annexe 1)' }, { phonetique: '[ɣòlá]', sens: 'achète !', source: 'AMB p. 370 (annexe 1)' }],
  'ɾ': [{ phonetique: '[ɾòká]', sens: 'creuse !', source: 'AMB p. 369 (annexe 1)' }, { phonetique: '[ìɾínà]', sens: 'le plant', source: 'AMB p. 370 (annexe 1)' }, { phonetique: '[òɾálà]', sens: 'la claie', source: 'AMB p. 370 (annexe 1)' }, { phonetique: '[èɾóɾà]', sens: 'l\'épouse', source: 'AMB p. 365 (annexe 1)' }],
  'k': [{ phonetique: '[ékà]', sens: 'le banc', source: 'AMB p. 363 (annexe 1)' }, { phonetique: '[ókò]', sens: 'le roseau', source: 'AMB p. 367 (annexe 1)' }, { phonetique: '[ìké]', sens: 'un œuf', source: 'AMB p. 366 (annexe 1)' }, { phonetique: '[ɣòká]', sens: 'appelle !', source: 'AMB p. 369 (annexe 1)' }],
  'ɣ': [{ phonetique: '[òɣá]', sens: 'un roi', source: 'AMB p. 363 (annexe 1)' }, { phonetique: '[íɣà]', sens: 'la forêt', source: 'AMB p. 369 (annexe 1)' }, { phonetique: '[òɣáŋgà]', sens: 'le médecin', source: 'AMB p. 369 (annexe 1)' }, { phonetique: '[ìɣónà]', sens: 'la taille', source: 'AMB p. 367 (annexe 1)' }],
  'ŋ': [{ phonetique: '[ŋómbà]', sens: 'le porc-épic', source: 'AMB p. 368 (annexe 1)' }, { phonetique: '[ŋáŋgò]', sens: 'le médicament', source: 'AMB p. 369 (annexe 1)' }, { phonetique: '[àŋándì]', sens: 'l\'anxiété', source: 'AMB p. 369 (annexe 1)' }],
  'ɲ': [{ phonetique: '[nyémbí]', sens: 'un chanteur', source: 'AMB p. 17' }, { phonetique: '[nyɔ̀nì]', sens: 'un oiseau', source: 'AMB p. 17' }],
  'y': [{ phonetique: '[òyómbò]', sens: 'le parfum', source: 'AMB p. 370 (annexe 1)' }, { phonetique: '[yáŋgò]', sens: 'les livres', source: 'AMB p. 369 (annexe 1)' }, { phonetique: '[òyɛ́ŋgɛ̀]', sens: 'l\'herbe coupante', source: 'AMB p. 370 (annexe 1)' }],
  'w': [{ phonetique: '[òwáŋgà]', sens: 'l\'aurore', source: 'AMB p. 371 (annexe 1)' }, { phonetique: '[òwánjà]', sens: 'le flanc', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[ìwóŋgò]', sens: 'le fond, la base', source: 'AMB p. 365 (annexe 1)' }, { phonetique: '[wàlá]', sens: 'rends visite !', source: 'AMB p. 366 (annexe 1)' }],
  'ɥ': [{ phonetique: '[òɥéɣà]', sens: 'l\'épaule', source: 'AMB p. 371 (annexe 1)' }, { phonetique: '[èɥíɾì]', sens: 'le ventre', source: 'AMB p. 371 (annexe 1)' }, { phonetique: '[èɥɛ́ɾɛ̀]', sens: 'le poisson', source: 'AMB p. 371 (annexe 1)' }, { phonetique: '[ɥínó]', sens: 'celui-ci', source: 'AMB p. 53' }],
  'ᵐp': [{ phonetique: '[àmpʰúnì]', sens: 'l\'écume', source: 'AMB p. 364 (annexe 1)' }],
  'ᵐb': [{ phonetique: '[m̀bɛ́ɾɛ́]', sens: 'une sardine', source: 'AMB p. 53' }, { phonetique: '[nómbà]', sens: 'la montagne', source: 'AMB p. 368 (annexe 1)' }, { phonetique: '[òyómbò]', sens: 'le parfum', source: 'AMB p. 370 (annexe 1)' }, { phonetique: '[òmbɥíɾí]', sens: 'un génie', source: 'AMB p. 18' }],
  'ⁿt': [{ phonetique: '[òŋwántò]', sens: 'une femme', source: 'AMB p. 18' }, { phonetique: '[ántò]', sens: 'les femmes', source: 'AMB p. 55' }],
  'ⁿd': [{ phonetique: '[òmóndò]', sens: 'la lisière', source: 'AMB p. 365 (annexe 1)' }, { phonetique: '[òtóndò]', sens: 'le panier', source: 'AMB p. 367 (annexe 1)' }, { phonetique: '[òlándò]', sens: 'la rive', source: 'AMB p. 366 (annexe 1)' }],
  'ᵑk': [{ phonetique: '[ìŋkɛ́mà]', sens: 'les singes', source: 'AMB p. 55' }],
  'ᵑg': [{ phonetique: '[èpóŋgò]', sens: 'la gorge', source: 'AMB p. 363 (annexe 1)' }, { phonetique: '[èlíŋgà]', sens: 'la robe', source: 'AMB p. 367 (annexe 1)' }, { phonetique: '[yáŋgò]', sens: 'les livres', source: 'AMB p. 369 (annexe 1)' }, { phonetique: '[òwáŋgà]', sens: 'l\'aurore', source: 'AMB p. 371 (annexe 1)' }],
  'c': [{ phonetique: '[cwánà]', sens: 'la marmite', source: 'AMB p. 55' }],
  'ⁿɟ': [{ phonetique: '[òɥénjà]', sens: 'la journée', source: 'AMB p. 361 (annexe 1)' }, { phonetique: '[mónjà]', sens: 'la feuille de raphia', source: 'AMB p. 365 (annexe 1)' }, { phonetique: '[òwánjà]', sens: 'le flanc', source: 'AMB p. 361 (annexe 1)' }],
};
for (const p of [...VOYELLES, ...CONSONNES]) {
  const deja = new Set(p.exemples.map(e => e.phonetique ?? e.mot));
  for (const e of EXEMPLES_AMBOUROUE[p.api] ?? []) if (!deja.has(e.phonetique)) { p.exemples.push(e); deja.add(e.phonetique); }
}

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
// ------------------------------------------------------------------ graphie DONDO tirée d'une transcription
/**
 * Graphie DONDO normalisée d'un mot dont le corpus ne donne que la transcription d'Ambouroue (RÈGLES § 2.1-2.2) :
 * les tons ne s'écrivent pas ; ɛ → è, ɔ → ô, e → é ; ɓ → b, ɗ → d, pʰ → p, tʰ → t, β → ṽ, ɣ → g, ɾ → r, ŋg → ng,
 * ŋk → nk, ŋw → nw (ô-nwa-ntô, RÈGLES § 2.2), ŋ → ñ, ɲ → ny, c → tch (n + c → ntch), j → dj (n + j → ndj), ɥ → w. Ce n'est pas un mot inventé :
 * c'est le même mot, écrit avec l'alphabet de tous les jours. Exemples : [àkɔ̀ndɔ̀] → akôndô, [ìβàβá] → iṽaṽa.
 */
const TONS_DIACRITIQUES = /[̀́̂̌̍̄]/g;
export function graphieDondo(transcription?: string | null): string {
  let t = (transcription ?? '').replace(/^\s*\[|\]\s*$/g, '').normalize('NFD').replace(TONS_DIACRITIQUES, '');
  t = t.replace(/pʰ/g, 'p').replace(/tʰ/g, 't').replace(/ʰ/g, '')
    .replace(/ŋg/g, 'ng').replace(/ŋk/g, 'nk').replace(/ŋw/g, 'nw').replace(/ŋ/g, 'ñ').replace(/ɲ/g, 'ny')
    .replace(/ɓ/g, 'b').replace(/ɗ/g, 'd').replace(/β/g, 'ṽ').replace(/ɣ/g, 'g').replace(/ɾ/g, 'r').replace(/ɥ/g, 'w')
    .replace(/c/g, 'tch').replace(/j/g, 'dj')
    .replace(/ɛ/g, 'è').replace(/ɔ/g, 'ô').replace(/e(?!̀)/g, 'é');
  return t.normalize('NFC');
}
/** Exemple complet pour l'apprenant : écriture, transcription (tons) et sens ; l'écriture vient de la transcription quand le corpus ne la donne pas. */
export function exempleComplet(e: { mot?: string | null; phonetique?: string | null; sens: string }): { mot: string; phonetique: string | null; sens: string; ecritureDeduite: boolean } {
  const mot = (e.mot ?? '').trim();
  if (mot || !e.phonetique) return { mot, phonetique: e.phonetique ?? null, sens: e.sens, ecritureDeduite: false };
  return { mot: graphieDondo(e.phonetique), phonetique: e.phonetique, sens: e.sens, ecritureDeduite: true };
}

/** Position de la première occurrence d'une graphie dans un mot (sans tenir compte des majuscules) ; -1 si absente. */
export function positionSon(mot: string, graphie: string): number {
  return mot.toLocaleLowerCase('fr').normalize('NFC').indexOf(graphie.toLocaleLowerCase('fr').normalize('NFC'));
}
