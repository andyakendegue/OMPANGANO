/**
 * Lexique Myènè de l'interface OMPANGANO.
 *
 * Chaque mot affiché à l'utilisateur en langue myènè DOIT venir d'ici,
 * avec sa source. Ne jamais ajouter un mot sans source vérifiable :
 * pas de mot « inventé » ou généré par une IA.
 *
 * Sources :
 *  - [LEC] Leçons omyènè (C. Hombouhiry), DONDO/01_sources_myene/03_lecons_omyene
 *  - [RW]  A. Raponda-Walker, Dictionnaire mpongwè-français
 *  - [AMB] O. Ambouroué, thèse sur l'orungu (2007)
 *  - [EQ]  validé par l'équipe OMPANGANO (locuteur orungu natif)
 *
 * Graphie v3 (Rékanga, règles de référence v3.4, 22 nov. 2026) : Sale, Akewa, Nyeza myê, Ibanga we. Ka mênê !, Onêro… ; impératif sans
 * accent (Yaga ; règles v3.6). Ces mots entrent aussi dans le prompt de Kak'Igonjo (liste « Mots vérifiés ») : jamais de lettre v2 ici.
 */

export interface MotMyene {
  mot: string;
  sens: string;
  source: string;
}

export const MYENE = {
  /** Bonjour (à une personne). */
  MBOLO: { mot: 'Mbolo', sens: 'Bonjour (à une personne)', source: '[LEC] Bonjour ; [RW] p. 284' },
  /** Bonjour (à plusieurs). */
  MBOLUANI: { mot: 'Mbôluani', sens: 'Bonjour (à plusieurs)', source: '[EQ] ; cf. [RW] « Mboloani », [AMB] [mbolwanè]' },
  /** Salut ! Bienvenue (salut d'arrivée). */
  SALE: { mot: 'Sale', sens: "Salut ! / Bienvenue (salut d'arrivée)", source: '[LEC] Bonjour ; Grammaire mpongwè (« Sale ! », salut d’arrivée) ; [EQ]' },
  /** Merci. */
  AKEWA: { mot: 'Akewa', sens: 'Merci', source: "[LEC] Formules de politesse ; [RW] « finiz'akewa », remercier" },
  /** Merci beaucoup. */
  AKEWA_MPOLO: { mot: 'Akewa mpolo', sens: 'Merci beaucoup', source: '[EQ]' },
  /** C'est super ! / C'est bien. */
  MBIAMBIE: { mot: 'Mbiambie', sens: "C'est super ! / C'est bien", source: '[LEC] Les incontournables' },
  /** Au revoir. */
  KA_MENE: { mot: 'Ibanga we. Ka mênê !', sens: 'Au revoir', source: '[LEC] Bonjour' },
  /** Excuse-moi. */
  NYEZA_MYE: { mot: 'Nyeza myê', sens: 'Excuse-moi', source: '[LEC] Formules de politesse ; [EQ]' },
  /** S'il te plaît. */
  KOKOLO: { mot: 'Kôkôlô', sens: "S'il te plaît", source: '[LEC] Formules de politesse' },
  /** Viens ! */
  YAGA: { mot: 'Yaga', sens: 'Viens !', source: '[LEC] Formules de politesse' },
  /** Le livre (aussi : l'école, la loi). */
  EZANGO: { mot: 'Ezango', sens: "Le livre (aussi l'école, la loi)", source: '[RW] « Ezango »' },
  /** La voix. */
  INIOI: { mot: 'Inioï', sens: 'La voix', source: '[EQ] ; cf. [RW] « Inoï »' },
  /** Talent de bien dire, facilité d'élocution. */
  EKAFE: { mot: 'Ekafê', sens: "Talent de bien dire, facilité d'élocution", source: '[RW] « Ekafè »' },
  /** L'aîné, le responsable, l'homme mûr. */
  ONERO: { mot: 'Onêro', sens: "L'aîné, le responsable", source: '[LEC] Les adjectifs ; [RW] « Anèró », les anciens' },
  /** Brave, courageux. */
  MBAGARA: { mot: 'Mbagara', sens: 'Brave, courageux', source: '[RW] « Mbagara »' },
  /** Promesse, engagement, contrat — nom de la plateforme. */
  OMPANGANO: { mot: 'Ompangano', sens: 'Promesse, engagement, accord, contrat', source: "[RW] « Ompangano » ; « pangan'ompangano », faire une promesse" },
  /** Le village — nom de l'application NKALA. */
  NKALA: { mot: 'Nkala', sens: 'Le village', source: '[LEC] La Nature ; [RW] passim' }
} satisfies Record<string, MotMyene>;
