import { 
  QuestionnaireItem, 
  Badge, 
  ClanRegistry, 
  VillageRegistry, 
  TribeName, 
  UserProfile,
  ThematicCategory,
  ThemeDefinition,
  WeeklyChallenge
} from '../types';

export const MYENE_TRIBES: TribeName[] = [
  'Mpongwè',
  'Adyumba',
  'Enenga',
  'Nkomi',
  'Galoa',
  'Ôrungu'
];

// Version du contenu des fiches de clans. À incrémenter après une correction :
// les fiches déjà en base sont alors remplacées par celles-ci (voir mergeOfficialClans).
export const CLAN_CONTENT_VERSION = 2;

export const INITIAL_CLANS: ClanRegistry[] = [
  // --- LISTE OFFICIELLE DES 21 CLANS ÔRUNGU ---
  // Seules les devises (kombo) attestées sont renseignées (source : « Mbuwé ni kombo géré ng’oyènè »,
  // corpus DONDO). Les autres champs restent vides tant qu'aucune source n'est disponible :
  // aucune description inventée.

  {
    id: 'clan-orungu-abulya',
    name: 'Abulya',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '« Avandji n’Abulyé, ignèmbwè imbani imo ! » — Avandji et Abulya, deux sauces à l’huile de palme pareilles : égaux en nombre et en puissance.',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-agalikewa',
    name: 'Agalikewa',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-agenje',
    name: 'Agenje',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '« Agéndjé kombarè » ; « Agenjé wéré penguino » — on n’attend pas les Agenjé.',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-agonjo-awenga',
    name: 'Agônjô - Awenga',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-ajena',
    name: 'Ajena',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-ajiwe',
    name: 'Ajiwè',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-alengonyango',
    name: 'Alèngonyangô',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-ananga',
    name: 'Ananga',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-anombwe',
    name: 'Anômbwè',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-anori',
    name: 'Anori',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '« Anôri ! » — cri de guerre du clan.',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-anuva-azino',
    name: 'Anuva - Azinô',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-avange',
    name: 'Avange',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-avanji',
    name: 'Avanji',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '« Avandji n’Abulyé, ignèmbwè imbani imo ! » — Avandji et Abulya, deux sauces à l’huile de palme pareilles : égaux en nombre et en puissance.',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-aworidela',
    name: 'Awôridèla',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-ayamba',
    name: 'Ayamba',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-ayanji',
    name: 'Ayanji',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '« Omwo-Nyadji, itowa ! » — Fils de Nyandji, tombé du ciel !',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-ayege-avemba',
    name: 'Ayege - Avèmba',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-azandi',
    name: 'Azandi',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-aziza',
    name: 'Aziza',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-azume-aka-abele',
    name: 'Azumè – Aka - Abèlè',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-azuwa-akosa-aworidela',
    name: 'Azuwa – Akôsa - Awôridèla',
    tribe: 'Ôrungu',
    description: '',
    historicalMeaning: '',
    geographicalOrigins: '',
    mottoOrSymbol: '',
    contentVersion: CLAN_CONTENT_VERSION,
    createdAt: '2026-01-01T00:00:00Z'
  }

];

// IDs of obsolete pre-seeded clans (unverified non-Ôrungu seed entries & old Ôrungu placeholders) to purge automatically
const OBSOLETE_SEED_CLAN_IDS = new Set([
  'clan-alamba',
  'clan-amwiri',
  'clan-ilongo-n-adjena',
  'clan-agenje',
  'clan-agwesono',
  'clan-ndiwa',
  'clan-avandji',
  'clan-imvona',
  'clan-ininga',
  'clan-agulamba',
  'clan-ogula',
  'clan-asiga',
  'clan-agwempolo',
  'clan-azowa'
]);

const OBSOLETE_ORUNGU_SEED_NAMES = new Set([
  'alamba',
  'amwiri',
  "ilongo n'adjena",
  'agenjé'
]);

/**
 * Merges the 21 official Ôrungu INITIAL_CLANS into an existing cached or cloud-loaded clan list
 * while purging old unverified pre-seeded clans and preserving any custom/CSV-imported clans.
 */
export function mergeOfficialClans(
  existingClans: ClanRegistry[],
  deletedIds: Set<string> = new Set()
): { merged: ClanRegistry[]; newlyAddedOrUpdated: ClanRegistry[]; removedObsoleteIds: string[] } {
  const removedObsoleteIds: string[] = [];
  const cleanedExisting = existingClans.filter(c => {
    if (deletedIds.has(c.id)) return false;
    const normName = (c.name || '').trim().toLowerCase();
    if (OBSOLETE_SEED_CLAN_IDS.has(c.id) || (c.tribe === 'Ôrungu' && OBSOLETE_ORUNGU_SEED_NAMES.has(normName))) {
      removedObsoleteIds.push(c.id);
      return false;
    }
    return true;
  });

  const byNormName = new Map<string, ClanRegistry>();
  for (const cl of cleanedExisting) {
    const key = `${(cl.tribe || '').trim().toLowerCase()}::${(cl.name || '').trim().toLowerCase()}`;
    byNormName.set(key, cl);
  }

  const newlyAddedOrUpdated: ClanRegistry[] = [];
  for (const official of INITIAL_CLANS) {
    if (deletedIds.has(official.id)) continue;
    const key = `${official.tribe.trim().toLowerCase()}::${official.name.trim().toLowerCase()}`;
    const existing = byNormName.get(key);
    if (!existing) {
      byNormName.set(key, official);
      newlyAddedOrUpdated.push(official);
    } else if ((existing.contentVersion || 0) < CLAN_CONTENT_VERSION) {
      // Fiche ancienne (descriptions générées sans source) : remplacée par la version corrigée
      const corrected: ClanRegistry = {
        ...existing,
        description: official.description || '',
        historicalMeaning: official.historicalMeaning || '',
        geographicalOrigins: official.geographicalOrigins || '',
        mottoOrSymbol: official.mottoOrSymbol || '',
        contentVersion: CLAN_CONTENT_VERSION
      };
      byNormName.set(key, corrected);
      newlyAddedOrUpdated.push(corrected);
    }
  }

  return {
    merged: Array.from(byNormName.values()),
    newlyAddedOrUpdated,
    removedObsoleteIds
  };
}

// Aucun village pré-rempli par défaut tant que l'orthographe exacte n'est pas validée par l'Administration / CSV
export const INITIAL_VILLAGES: VillageRegistry[] = [];

const OBSOLETE_SEED_VILLAGE_IDS = new Set([
  'vil-lambarene',
  'vil-lac-zile',
  'vil-lac-onangue',
  'vil-ashouka',
  'vil-adolinanongo',
  'vil-sainte-anne',
  'vil-omboue',
  'vil-pointe-denis',
  'vil-glass',
  'vil-ozouri',
  'vil-mandji',
  'vil-alumbe',
  'vil-cap-lopez',
  'vil-lac-azingo'
]);

/**
 * Purges old pre-seeded villages from cache/cloud while keeping all villages manually created or imported via CSV.
 */
export function cleanObsoleteSeedVillages(
  existingVillages: VillageRegistry[],
  deletedIds: Set<string> = new Set()
): { cleaned: VillageRegistry[]; removedObsoleteVillageIds: string[] } {
  const removedObsoleteVillageIds: string[] = [];
  const cleaned = existingVillages.filter(v => {
    if (deletedIds.has(v.id)) return false;
    if (OBSOLETE_SEED_VILLAGE_IDS.has(v.id)) {
      removedObsoleteVillageIds.push(v.id);
      return false;
    }
    return true;
  });
  return { cleaned, removedObsoleteVillageIds };
}

export interface TribalDialectMetadata {
  tribe: TribeName;
  dialectCode: string;
  geographicalZone: string;
  historicalOrigins: string;
  orthographicAndTonalTraits: string;
  mottoOrSymbol: string;
}

export const TRIBAL_DIALECT_INFO: Record<TribeName, TribalDialectMetadata> = {
  'Ôrungu': {
    tribe: 'Ôrungu',
    dialectCode: 'orungu',
    geographicalZone: 'Delta maritime de l’Ogooué, île Mandji (Port-Gentil), Cap Lopez et lagune d’Ozouri (Ogooué-Maritime).',
    historicalOrigins:
      'Royauté maritime et fluviale fondée autour du delta de l’Ogooué et du Cap Lopez, structurée autour des souverains (Agamwinboni, Rogombé, Ndombi) et des 21 clans historiques.',
    orthographicAndTonalTraits:
      'Cadence maritime régulière, maintien net des groupes pré-nasalisés (mb, nd, ng, mp, nt, nk), élisions vocaliques fluides à la jonction des mots et distinction tonale marquée sur les voyelles ouvertes (è, ô).',
    mottoOrSymbol: 'Royauté maritime du Delta, gardienne des passes et de l’estuaire de l’Ogooué.'
  },
  'Enenga': {
    tribe: 'Enenga',
    dialectCode: 'enenga',
    geographicalZone: 'Moyen-Ogooué, région des grands lacs (Zilé, Onangué, Évaro) et rives de Lambaréné.',
    historicalOrigins:
      'Peuple de maîtres-piroguiers et gardiens des lacs intérieurs du Moyen-Ogooué, intimement liés aux Galoa et aux Adyumba dans l’histoire fluviale.',
    orthographicAndTonalTraits:
      'Inflexion tonale fluviale chantante, conservation de certaines consonnes intervocaliques et richesse lexicale particulière pour la navigation lacustre, les courants et la faune d’eau douce.',
    mottoOrSymbol: 'Maîtres des eaux calmes des lacs et des rapides du Moyen-Ogooué.'
  },
  'Mpongwè': {
    tribe: 'Mpongwè',
    dialectCode: 'mpongwe',
    geographicalZone: 'Rives nord et sud de l’Estuaire du Komo (Libreville, Glass, Louis, Quaben, Pointe-Denis).',
    historicalOrigins:
      'Première variété Omyènè documentée à l’écrit dès le XIXe siècle sur les rives de l’Estuaire du Gabon par les anciens et les linguistes.',
    orthographicAndTonalTraits:
      'Allongement vocalique expressif en finale de phrase, diction urbaine et côtière posée, et variantes consonantiques propres au parler de l’Estuaire.',
    mottoOrSymbol: 'Berceau historique de l’Estuaire du Komo et mémoire diplomatique côtière.'
  },
  'Galoa': {
    tribe: 'Galoa',
    dialectCode: 'galoa',
    geographicalZone: 'Bassin du Moyen-Ogooué, Lambaréné, Adolinanongo et grands lacs du Sud-Ogooué.',
    historicalOrigins:
      'Communauté riveraine majeure du Moyen-Ogooué partageant l’espace lacustre et fluvial avec les Enenga.',
    orthographicAndTonalTraits:
      'Proximité phonologique étroite avec l’Enenga, attaque syllabique franche et mélodie tonale caractéristique des rives du Moyen-Ogooué.',
    mottoOrSymbol: 'Sagesse des rives de l’Ogooué et fraternité des grands lacs.'
  },
  'Nkomi': {
    tribe: 'Nkomi',
    dialectCode: 'nkomi',
    geographicalZone: 'Lagune du Fernan-Vaz (Eliwa Nkomi), Omboué et littoral sud de l’Ogooué-Maritime.',
    historicalOrigins:
      'Peuple lagunaire du Fernan-Vaz organisé autour de l’institution royale du Rè-Nkomi et des sanctuaires d’Omboué.',
    orthographicAndTonalTraits:
      'Sonorités lagunaires distinctives, nuances sur les consonnes fricatives et labiales, et vocabulaire spécialisé des lagunes et de la forêt côtière.',
    mottoOrSymbol: 'Gardiens de la lagune d’Eliwa Nkomi et de la tradition royale du Fernan-Vaz.'
  },
  'Adyumba': {
    tribe: 'Adyumba',
    dialectCode: 'adyumba',
    geographicalZone: 'Lac Azingo et bassin nord des lacs du Moyen-Ogooué.',
    historicalOrigins:
      'Lignée historique apparentée aux Mpongwè ayant migré vers le sanctuaire naturel du lac Azingo où elle a préservé des formes anciennes de l’Omyènè.',
    orthographicAndTonalTraits:
      'Conservation remarquable de tournures et d’inflexions tonales archaïques faisant le pont entre le parler de l’Estuaire (Mpongwè) et celui des Lacs.',
    mottoOrSymbol: 'Sanctuaire du lac Azingo et conservatoire de la parole ancienne.'
  }
};

export function mapDialectToTribeName(dialect?: string): TribeName {
  const clean = (dialect || '').trim().toLowerCase();
  if (clean.includes('orungu') || clean.includes('ôrungu')) return 'Ôrungu';
  if (clean.includes('mpong')) return 'Mpongwè';
  if (clean.includes('galoa') || clean.includes('galwa')) return 'Galoa';
  if (clean.includes('nkomi')) return 'Nkomi';
  if (clean.includes('adyumba') || clean.includes('ajumba')) return 'Adyumba';
  if (clean.includes('enenga')) return 'Enenga';
  return 'Ôrungu';
}

export function mapTribeNameToDialectCode(tribe?: string): string {
  const t = mapDialectToTribeName(tribe);
  return TRIBAL_DIALECT_INFO[t]?.dialectCode || 'orungu';
}

// Phrases de départ : toutes tirées de sources vérifiables (leçons omyènè, Raponda-Walker,
// Ambouroué) ou validées par l'équipe. Les anciennes phrases générées par IA (mots inexistants)
// sont listées dans SEED_ITEM_CORRECTIONS pour être remplacées aussi dans la base.
export const INITIAL_ENENGA_ITEMS: QuestionnaireItem[] = [
  {
    id: 'nkala-enenga-01',
    frenchText: 'Bonjour à tous',
    myeneText: 'Mbôluani',
    dialect: 'orungu',
    category: 'salutations',
    contextNotes: 'Salutation adressée à plusieurs personnes. À une seule personne : « Mbolo ». Sources : Raponda-Walker (Mboloani), Ambouroué 2007 pour l\'ôrungu ([mbolwanè]).',
    imageUrl: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=800&q=80',
    difficulty: 'debutant',
    status: 'active',
    contributionsCount: 0,
    recordingsCount: 0,
    createdBy: 'system_ompangano',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z'
  },
  {
    id: 'nkala-enenga-02',
    frenchText: 'Merci',
    myeneText: 'Akéwa',
    dialect: 'orungu',
    category: 'salutations',
    contextNotes: 'Remerciement. « Akéwa mpolo ! » : merci beaucoup. Sources : Leçons omyènè (C. Hombouhiry), Formules de politesse ; Raponda-Walker (finiz\'akewa, remercier).',
    imageUrl: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=800&q=80',
    difficulty: 'debutant',
    status: 'active',
    contributionsCount: 0,
    recordingsCount: 0,
    createdBy: 'system_ompangano',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z'
  },
  {
    id: 'nkala-enenga-03',
    frenchText: 'Dans la pirogue d\'autrui, ne prends pas tes aises',
    myeneText: 'Owaro-mfélo, ré nyènyo ngôri.',
    dialect: 'orungu',
    category: 'fleuve_peche',
    contextNotes: 'Proverbe. Owaro : la pirogue. Source : Leçons omyènè (C. Hombouhiry), Proverbes (chap. 1).',
    imageUrl: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80',
    difficulty: 'avance',
    status: 'active',
    contributionsCount: 0,
    recordingsCount: 0,
    createdBy: 'system_ompangano',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z'
  },
  {
    id: 'nkala-enenga-04',
    frenchText: 'La maison du peuple',
    myeneText: 'Nkala y\'inongo',
    dialect: 'orungu',
    category: 'famille_communaute',
    contextNotes: 'Nkala : le village ; inongo (inôngô) : le peuple, l\'ethnie. Sources : Leçons omyènè (C. Hombouhiry) (La Nature ; généalogie myènè).',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    difficulty: 'debutant',
    status: 'active',
    contributionsCount: 0,
    recordingsCount: 0,
    createdBy: 'system_ompangano',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z'
  },
  {
    id: 'nkala-enenga-05',
    frenchText: 'L\'animal qui a une queue ne traverse pas le feu',
    myeneText: 'Nyam\'okwéndé ré nôg\'ogoni.',
    dialect: 'orungu',
    category: 'nature_faune',
    contextNotes: 'Proverbe : qui a quelque chose à se reprocher évite le danger. Source : Leçons omyènè (C. Hombouhiry), Proverbes.',
    imageUrl: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80',
    difficulty: 'avance',
    status: 'active',
    contributionsCount: 0,
    recordingsCount: 0,
    createdBy: 'system_ompangano',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z'
  },
  {
    id: 'nkala-enenga-06',
    frenchText: 'Le jour s\'est levé, le cauchemar s\'est arrêté',
    myeneText: 'Owendja wa jédji, gnino mbé ya simbi.',
    dialect: 'orungu',
    category: 'vie_quotidienne',
    contextNotes: 'Source : Leçons omyènè (C. Hombouhiry), Phrases traduites en omyènè.',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    difficulty: 'intermediaire',
    status: 'active',
    contributionsCount: 0,
    recordingsCount: 0,
    createdBy: 'system_ompangano',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z'
  },
  {
    id: 'nkala-enenga-07',
    frenchText: 'Le clan n\'a pas de prix',
    myeneText: 'Mbuwé a zé n\'igholo.',
    dialect: 'orungu',
    category: 'famille_communaute',
    contextNotes: 'Proverbe. Mbuwé : le clan (exogamique, issu d\'un ancêtre commun). Source : Leçons omyènè (C. Hombouhiry), Proverbes.',
    imageUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
    difficulty: 'intermediaire',
    status: 'active',
    contributionsCount: 0,
    recordingsCount: 0,
    createdBy: 'system_ompangano',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z'
  },
  {
    id: 'nkala-enenga-08',
    frenchText: 'Le poisson fumé',
    myeneText: 'Ewèrè ézômô',
    dialect: 'orungu',
    category: 'vie_quotidienne',
    contextNotes: 'Ewèrè : le poisson ; ewèrè z\'azanga : le poisson salé. Source : Leçons omyènè (C. Hombouhiry), Les aliments.',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    difficulty: 'debutant',
    status: 'active',
    contributionsCount: 0,
    recordingsCount: 0,
    createdBy: 'system_ompangano',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z'
  },
  {
    id: 'nkala-enenga-09',
    frenchText: 'Le fleuve a fait des détours car il n\'a trouvé personne pour le guider',
    myeneText: 'Oghèningo a ghèndi règhô kôndènè éré dèng\'oma wi tévuna yè',
    dialect: 'orungu',
    category: 'proverbes_contes',
    contextNotes: 'Proverbe : on dévie faute de conseils (tevuna : conseiller, montrer le chemin). Source : Leçons omyènè (C. Hombouhiry), Proverbes.',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    difficulty: 'avance',
    status: 'active',
    contributionsCount: 0,
    recordingsCount: 0,
    createdBy: 'system_ompangano',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z'
  },
  {
    id: 'nkala-enenga-10',
    frenchText: 'Viens danser !',
    myeneText: 'Yaga go dyina !',
    dialect: 'orungu',
    category: 'vie_quotidienne',
    contextNotes: 'Yaga : viens ; go dyina : danser. Source : Leçons omyènè (C. Hombouhiry), Les incontournables.',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    difficulty: 'debutant',
    status: 'active',
    contributionsCount: 0,
    recordingsCount: 0,
    createdBy: 'system_ompangano',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z'
  }
];

/** Anciens textes myènè (générés par IA, incorrects) des phrases de départ, par identifiant. */
export const SEED_ITEM_CORRECTIONS: Record<string, string> = {
  'nkala-enenga-01': 'Mbolo vana',
  'nkala-enenga-02': 'Na vevi',
  'nkala-enenga-03': 'Irende si bendi go nongo y’omvwa',
  'nkala-enenga-04': 'Nkala y’inongo',
  'nkala-enenga-05': 'Nguwu e pembi go mpyo',
  'nkala-enenga-06': 'Nkombi yi bendi go mpounga polo',
  'nkala-enenga-07': 'Oza w’omvwa go nago yâwé',
  'nkala-enenga-08': 'Wana wa tongi inyege yi dyosi',
  'nkala-enenga-09': 'O noki w’abami a za dova go nongo',
  'nkala-enenga-10': 'Ngoma yi kengi vana g’ezango'
};

/**
 * Remplace, dans une liste chargée de la base, les phrases de départ qui portent encore
 * l'ancien texte généré par IA. Renvoie les éléments corrigés (à réécrire par un admin).
 */
export function applySeedItemCorrections(items: QuestionnaireItem[]): { items: QuestionnaireItem[]; corrected: QuestionnaireItem[] } {
  const corrected: QuestionnaireItem[] = [];
  const byId = new Map(INITIAL_ENENGA_ITEMS.map(it => [it.id, it]));
  const next = items.map(it => {
    const oldText = SEED_ITEM_CORRECTIONS[it.id];
    const fixed = byId.get(it.id);
    if (!oldText || !fixed || (it.myeneText || '').trim() !== oldText) return it;
    const updated: QuestionnaireItem = {
      ...it,
      frenchText: fixed.frenchText,
      myeneText: fixed.myeneText,
      dialect: fixed.dialect,
      category: fixed.category,
      contextNotes: fixed.contextNotes,
      difficulty: fixed.difficulty,
      updatedAt: new Date().toISOString()
    };
    corrected.push(updated);
    return updated;
  });
  return { items: next, corrected };
}

/** Anciens titres de badges → nouveaux titres avec le nom myènè (mise à jour de la base par un admin). */
export const BADGE_TITLE_RENAMES: Record<string, { from: string; to: string }> = {
  'badge-premiere-voix': { from: 'Première Voix', to: 'Inioï · Première Voix' },
  'badge-maitre-verbe': { from: 'Maître du Verbe', to: 'Ekafè · Maître du Verbe' },
  'badge-cinq-validations': { from: 'Oreille de l’Aîné', to: 'Onèrô · Oreille de l’Aîné' },
  'badge-defi-faune': { from: 'Pisteur de la Savane', to: 'Mbagara · Pisteur de la Savane' }
};

export const SYSTEM_BADGES: Badge[] = [
  {
    id: 'badge-genealogie-verifiee',
    title: 'Filiation OMPANGANO',
    description: 'A renseigné avec authenticité sa tribu, ses clans paternel et maternel et son village.',
    icon: '📜',
    category: 'genealogie'
  },
  {
    id: 'badge-dix-traductions',
    title: 'Passeur de 10 Mots',
    description: 'A proposé ou enrichi au moins 10 traductions ou variantes orthographiques.',
    icon: '🪶',
    requiredContributions: 10,
    category: 'orthographe'
  },
  {
    id: 'badge-cinq-validations',
    title: 'Onèrô · Oreille de l’Aîné',
    description: 'A examiné et validé ou corrigé 5 contributions de relecture.',
    icon: '👂',
    requiredValidations: 5,
    category: 'expert'
  },
  {
    id: 'badge-premiere-voix',
    title: 'Inioï · Première Voix',
    description: 'A enregistré sa toute première prononciation dans la langue des ancêtres.',
    icon: '🎙️',
    requiredRecordings: 1,
    category: 'audio'
  },
  {
    id: 'badge-gardien-lacs',
    title: 'Gardien des Lacs',
    description: 'A maintenu une série de 3 jours consécutifs de fidélité au programme OMPANGANO.',
    icon: '🌊',
    category: 'fidelite'
  },
  {
    id: 'badge-maitre-verbe',
    title: 'Ekafè · Maître du Verbe',
    description: 'A atteint plus de 1000 points d’expérience pour la sauvegarde de la langue.',
    icon: '👑',
    requiredXp: 1000,
    category: 'expert'
  },
  // Badges des Défis Hebdomadaires
  {
    id: 'badge-defi-pecheur',
    title: 'Maître des Eaux & Pêche',
    description: 'A triomphé du défi hebdomadaire : au moins 5 phrases complétées sur la pêche, le fleuve et les pirogues.',
    icon: '🎣',
    category: 'defi'
  },
  {
    id: 'badge-defi-orungu-clans',
    title: 'Mémoire des Rois & Traditions',
    description: 'A complété le défi historique : 5 phrases sur les souverains, royautés et rites traditionnels Myènè.',
    icon: '👑',
    category: 'defi'
  },
  {
    id: 'badge-defi-voix-or',
    title: 'Écho d’Or Ancestral',
    description: 'A relevé le défi vocal : 3 prononciations sonores authentiques enregistrées.',
    icon: '🎙️',
    category: 'defi'
  },
  {
    id: 'badge-defi-sagesse',
    title: 'Parole des Anciens',
    description: 'A validé ou enrichi 5 proverbes, devinettes ou maximes de sagesse orale.',
    icon: '📜',
    category: 'defi'
  },
  {
    id: 'badge-defi-faune',
    title: 'Mbagara · Pisteur de la Savane',
    description: 'A enrichi 5 expressions relatives à la faune et la grande forêt équatoriale.',
    icon: '🐆',
    category: 'defi'
  }
];

export const THEMATIC_CATEGORIES: ThemeDefinition[] = [
  {
    id: 'peche_navigation',
    name: 'Pêche, Eaux & Navigation',
    shortName: 'Pêche & Eaux',
    icon: '🛶',
    description: 'Pirogues (owaro / ambwaro), pagaies (nkavi), campements (mbôgô), pêcheurs (olôwisi), poissons (éwèrè), fleuve Ogooué et mer (ntchuwa).',
    keywords: ['peche', 'poisson', 'pirogue', 'pagaie', 'mer', 'fleuve', 'ogooue', 'ruisseau', 'sardine', 'crabe', 'eau', 'mbogo', 'owaro', 'nkavi', 'ntchuwa', 'nongo', 'nugo', 'maree'],
    color: '#0284C7'
  },
  {
    id: 'chasse_faune_nature',
    name: 'Faune, Chasse & Forêt',
    shortName: 'Faune & Chasse',
    icon: '🐆',
    description: 'Animaux de la forêt (iga), chasseurs (ombèna), porcs-épics (ngomba), chèvres (mboni), chiens (mbwa), poules (ndjôgôni), gibier.',
    keywords: ['chasse', 'foret', 'chasseur', 'animal', 'animaux', 'chevre', 'chien', 'poule', 'porc-epic', 'hippopotame', 'papillon', 'oiseau', 'gibier', 'arbre', 'iga', 'ombena', 'ngomba', 'mboni', 'mbwa'],
    color: '#15803D'
  },
  {
    id: 'clans_histoire_rites',
    name: 'Histoire, Royautés, Traditions & Rites',
    shortName: 'Histoire & Rites',
    icon: '👑',
    description: 'Souverains (Agamwinboni, Rogombé, Ndombi), ancêtre Ngwè-Myènè, histoire des 6 tribus Myènè, rites Ombwiri, danses Ivanga et Njembè, lois coutumières (ampanga).',
    keywords: ['roi', 'histoire', 'ancetre', 'rite', 'rituel', 'ombwiri', 'ngombi', 'ivanga', 'njembe', 'loi', 'coutume', 'agamwinboni', 'rogombe', 'ndombi', 'orungu', 'mandji'],
    color: '#B45309'
  },
  {
    id: 'cuisine_agriculture',
    name: 'Alimentation, Cuisine & Récoltes',
    shortName: 'Cuisine & Récoltes',
    icon: '🍲',
    description: 'Cuisine (kisini), bananes plantains (ikôndô), bâtons de manioc (oguma), ignames (égwa), oranges (ilasa), œufs (iké), plats mijotés (énambo).',
    keywords: ['cuisine', 'cuisinier', 'manioc', 'banane', 'plantain', 'igname', 'orange', 'oeuf', 'plat', 'repas', 'feu', 'bois', 'kisini', 'onambisi', 'oguma', 'ikondo', 'itoto', 'egwa', 'ilasa', 'ike'],
    color: '#C2410C'
  },
  {
    id: 'vie_quotidienne_famille',
    name: 'Vie Quotidienne, Habitat & Parenté',
    shortName: 'Vie Quotidienne',
    icon: '🏡',
    description: 'Le village (nkala), la maison (nago), la famille, pagnes (onamba), chapeaux (épokolo), accueil des hôtes (agènda).',
    keywords: ['village', 'maison', 'femme', 'homme', 'enfant', 'aine', 'oncle', 'pagne', 'chapeau', 'chemise', 'hachette', 'couteau', 'nago', 'nkala', 'omwanto', 'onome', 'omwana', 'onero', 'onamba'],
    color: '#9333EA'
  },
  {
    id: 'oralite_proverbes_sagesse',
    name: 'Proverbes, Devinettes & Oralité',
    shortName: 'Proverbes & Sagesse',
    icon: '📜',
    description: 'Salutations (Mbolo), devinettes traditionnelles (Tô tôngè), paroles d’anciens, maximes et contes de vie.',
    keywords: ['salutation', 'proverbe', 'devinette', 'conte', 'sagesse', 'parole', 'mbolo', 'to tonge', 'dialogue', 'conseil', 'elombe', 'igamba', 'kamba'],
    color: '#D97706'
  },
  {
    id: 'artisanat_outils',
    name: 'Outils, Vannerie & Artisanat',
    shortName: 'Outils & Artisanat',
    icon: '🧺',
    description: 'Paniers (otondo), fibres de rotin (ozono), machettes (okwara), couteaux (swaka), gargoulettes (ogulu).',
    keywords: ['panier', 'machette', 'couteau', 'hachette', 'rotin', 'gargoulette', 'forge', 'artisan', 'tissage', 'otondo', 'okwara', 'swaka', 'menda', 'ozono', 'ogulu'],
    color: '#E11D48'
  },
  {
    id: 'numeration_mesures',
    name: 'Numération, Nombres & Calcul',
    shortName: 'Numération',
    icon: '🔢',
    description: 'Comptage traditionnel de 1 à 100 (môri, mbani, ntcharo, nayi, otani... nkama) et accords des classes nominales.',
    keywords: ['compter', 'nombre', 'un', 'deux', 'trois', 'quatre', 'cinq', 'dix', 'vingt', 'cent', 'mori', 'mbani', 'ntcharo', 'nayi', 'otani', 'orowa', 'igomi', 'nkama', 'tanguna'],
    color: '#4F46E5'
  }
];

export function createThemeFromModuleName(moduleName: string): ThemeDefinition {
  let cleanName = moduleName.replace(/^[Mm]\d+[_:\s-]*/, '').replace(/[_]+/g, ' ').trim();
  if (!cleanName) cleanName = moduleName;

  const slug = cleanName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const id = `theme_${slug || Date.now()}`;
  
  let icon = '🏷️';
  let color = '#2563EB';

  const lower = cleanName.toLowerCase();
  if (lower.includes('plante') || lower.includes('botanique') || lower.includes('foret') || lower.includes('arbre')) {
    icon = '🌿';
    color = '#16A34A';
  } else if (lower.includes('etoile') || lower.includes('astronomie') || lower.includes('ciel') || lower.includes('lune')) {
    icon = '✨';
    color = '#4F46E5';
  } else if (lower.includes('musique') || lower.includes('danse') || lower.includes('chant')) {
    icon = '🪘';
    color = '#D97706';
  } else if (lower.includes('soin') || lower.includes('medecine') || lower.includes('guerison')) {
    icon = '🩺';
    color = '#0D9488';
  } else if (lower.includes('mer') || lower.includes('eau') || lower.includes('ocean')) {
    icon = '🌊';
    color = '#0284C7';
  } else if (lower.includes('guerre') || lower.includes('arme') || lower.includes('defense')) {
    icon = '🛡️';
    color = '#DC2626';
  } else if (lower.includes('histoire') || lower.includes('roi') || lower.includes('rite')) {
    icon = '👑';
    color = '#B45309';
  }

  const keywords = cleanName.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  return {
    id,
    name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
    shortName: cleanName.split(' ').slice(0, 3).join(' '),
    icon,
    description: `Thème extrait du corpus : ${cleanName}`,
    keywords,
    color,
    isCustom: true,
    createdAt: new Date().toISOString()
  };
}

export function classifyThematicCategory(
  moduleOrCategory: string = '', 
  text: string = '',
  knownThemes: ThemeDefinition[] = THEMATIC_CATEGORIES
): string {
  const norm = (moduleOrCategory + ' ' + text).toLowerCase();
  const trimmedMod = moduleOrCategory.toLowerCase().trim();

  // 1. Direct match with ID, Name or ShortName of dynamic/known themes
  for (const th of knownThemes) {
    if (th.id.toLowerCase() === trimmedMod ||
        th.name.toLowerCase() === trimmedMod ||
        th.shortName.toLowerCase() === trimmedMod) {
      return th.id;
    }
  }

  // 2. Keyword match against known themes
  for (const th of knownThemes) {
    if (th.keywords && th.keywords.some(kw => kw && norm.includes(kw.toLowerCase()))) {
      return th.id;
    }
  }
  
  if (norm.includes('peche') || norm.includes('pêche') || norm.includes('owaro') || norm.includes('nkavi') || norm.includes('mbôgô') || norm.includes('mbogo') || norm.includes('poisson') || norm.includes('sardine') || norm.includes('fleuve') || norm.includes('ogooué') || norm.includes('ogooue') || norm.includes('ruisseau') || norm.includes('tortue marine') || norm.includes('maree') || norm.includes('ntchuwa') || norm.includes('nugo')) {
    return 'peche_navigation';
  }
  if (norm.includes('faune') || norm.includes('chasse') || norm.includes('ombèna') || norm.includes('ombena') || norm.includes('ngomba') || norm.includes('mboni') || norm.includes('chevre') || norm.includes('chèvre') || norm.includes('chien') || norm.includes('poule') || norm.includes('porc-epic') || norm.includes('porc-épic') || norm.includes('hippopotame') || norm.includes('papillon') || norm.includes('gibier')) {
    return 'chasse_faune_nature';
  }
  if (norm.includes('clan') || norm.includes('mbuwé') || norm.includes('mbuwe') || norm.includes('ombwiri') || norm.includes('ivanga') || norm.includes('njembe') || norm.includes('ngombi') || norm.includes('roi') || norm.includes('agamwinboni') || norm.includes('rogombé') || norm.includes('rogombe') || norm.includes('ndombi') || norm.includes('histoire') || norm.includes('coutumiere') || norm.includes('ampanga') || norm.includes('rite')) {
    return 'clans_histoire_rites';
  }
  if (norm.includes('cuisine') || norm.includes('manioc') || norm.includes('banane') || norm.includes('plantain') || norm.includes('igname') || norm.includes('orange') || norm.includes('oeuf') || norm.includes('œuf') || norm.includes('plat') || norm.includes('kisini') || norm.includes('oguma') || norm.includes('ikondo') || norm.includes('ikôndô') || norm.includes('egwa') || norm.includes('égwa') || norm.includes('repas') || norm.includes('onambisi')) {
    return 'cuisine_agriculture';
  }
  if (norm.includes('numeration') || norm.includes('numération') || norm.includes('tanguna') || norm.includes('compter') || norm.includes('môri') || norm.includes('mbani') || norm.includes('ntcharo') || norm.includes('igomi') || norm.includes('nkama')) {
    return 'numeration_mesures';
  }
  if (norm.includes('proverbe') || norm.includes('devinette') || norm.includes('to tonge') || norm.includes('tô tôngè') || norm.includes('salutation') || norm.includes('mbolo') || norm.includes('oralite') || norm.includes('oralité')) {
    return 'oralite_proverbes_sagesse';
  }
  if (norm.includes('outil') || norm.includes('panier') || norm.includes('machette') || norm.includes('couteau') || norm.includes('hachette') || norm.includes('rotin') || norm.includes('gargoulette') || norm.includes('otondo') || norm.includes('okwara') || norm.includes('swaka') || norm.includes('ozono') || norm.includes('ogulu')) {
    return 'artisanat_outils';
  }
  
  return 'vie_quotidienne_famille';
}

export const INITIAL_WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'defi-peche-semaine',
    title: 'Pêcheurs du Fleuve & des Lagunes',
    description: 'Contribuer sur 5 phrases liées à la pêche, aux pirogues et à l’Ogooué cette semaine.',
    theme: 'peche_navigation',
    targetCount: 5,
    challengeType: 'contributions',
    xpReward: 250,
    badgeRewardId: 'badge-defi-pecheur',
    badgeRewardName: 'Maître des Eaux & Pêche',
    badgeRewardIcon: '🎣',
    startDate: '2026-10-19T00:00:00Z',
    endDate: '2026-10-26T23:59:59Z',
    isActive: true
  },
  {
    id: 'defi-voix-orungu',
    title: 'La Voix des Anciens',
    description: 'Enregistrer votre prononciation audio sur 3 expressions pour enrichir le corpus vocal.',
    theme: 'all',
    targetCount: 3,
    challengeType: 'recordings',
    xpReward: 200,
    badgeRewardId: 'badge-defi-voix-or',
    badgeRewardName: 'Écho d’Or Ancestral',
    badgeRewardIcon: '🎙️',
    startDate: '2026-10-19T00:00:00Z',
    endDate: '2026-10-26T23:59:59Z',
    isActive: true
  },
  {
    id: 'defi-clans-histoire',
    title: 'Mémoire des Rois & Traditions',
    description: 'Vérifier ou traduire 5 phrases portant sur l’histoire des tribus, les rois et les rites sacrés.',
    theme: 'clans_histoire_rites',
    targetCount: 5,
    challengeType: 'contributions',
    xpReward: 300,
    badgeRewardId: 'badge-defi-orungu-clans',
    badgeRewardName: 'Mémoire des Rois & Traditions',
    badgeRewardIcon: '👑',
    startDate: '2026-10-19T00:00:00Z',
    endDate: '2026-10-26T23:59:59Z',
    isActive: true
  }
];

export { USER_LEVELS, getLevelForXp } from '../../shared/levels';

export function calculateSuspicionScore(user: Partial<UserProfile>): { score: number; reasons: string[]; riskLevel: 'faible' | 'modere' | 'critique' } {
  let score = 0;
  const reasons: string[] = [];

  const contribs = user.contributionsCount || 0;
  const recordings = user.recordingsCount || 0;
  const daysSinceCreation = user.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 3600 * 24)) : 0;

  if (daysSinceCreation >= 2 && contribs === 0 && recordings === 0) {
    score += 45;
    reasons.push('Inscrit depuis plus de 48h sans aucune contribution linguistique');
  }

  if (!user.paternalClan || !user.maternalClan || user.paternalClan === user.maternalClan) {
    score += 25;
    reasons.push('Anomalie généalogique (clans identiques ou absents)');
  }

  if (!user.villageOfOrigin || user.villageOfOrigin.length < 3) {
    score += 20;
    reasons.push('Village d’origine non spécifié ou invalide');
  }

  if (daysSinceCreation >= 5 && contribs < 2) {
    score += 20;
    reasons.push('Stagnation prolongée après démarrage');
  }

  const normalized = Math.min(100, score);
  let riskLevel: 'faible' | 'modere' | 'critique' = 'faible';
  if (normalized >= 60) riskLevel = 'critique';
  else if (normalized >= 30) riskLevel = 'modere';

  return { score: normalized, reasons, riskLevel };
}

// Parseur CSV robuste supportant les guillemets et les virgules internes
export function parseCSVRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export {
  normalizePhraseComparisonKey,
  buildItemDeduplicationSignature,
  sanitizeFirebaseRecordId,
  generateDeterministicCsvItemId,
  deduplicateParsedCsvItems
} from '../../shared/csvDedup';
export type { CsvDeduplicationResult } from '../../shared/csvDedup';
import { sanitizeFirebaseRecordId, normalizePhraseComparisonKey, buildItemDeduplicationSignature, generateDeterministicCsvItemId } from '../../shared/csvDedup';
import type { CsvDeduplicationResult } from '../../shared/csvDedup';

// Convertit le contenu d'un CSV en QuestionnaireItem[] et extrait dynamiquement les nouveaux thèmes
export function parsePhrasesAndDiscoverThemes(
  csvText: string, 
  defaultDialect: string = 'orungu',
  existingThemes: ThemeDefinition[] = THEMATIC_CATEGORIES
): { items: QuestionnaireItem[]; newDiscoveredThemes: ThemeDefinition[] } {
  const rows = parseCSVRows(csvText);
  if (rows.length < 2) return { items: [], newDiscoveredThemes: [] };

  const headers = rows[0].map(h => h.toLowerCase().replace(/[\s_]+/g, ''));
  
  // Detection TTS Corpus schema (ID, Module_Thematique, Texte_Orungu_Orthographe, Transcription_API_Tonale, Traduction_Francaise, ...)
  const isTtsCorpus = headers.some(h => h.includes('orungu') || h.includes('texte') || h.includes('modulethematique'));

  const idIdx = headers.findIndex(h => h === 'id' || h.includes('identifiant'));
  const moduleIdx = headers.findIndex(h => h.includes('module') || h.includes('theme') || h.includes('categorie'));
  const myeneIdx = headers.findIndex(h => h.includes('orungu') || h.includes('myene') || h.includes('texte') || h.includes('langue'));
  const frenchIdx = headers.findIndex(h => h.includes('francais') || h.includes('francaise') || h.includes('traduction') || h.includes('french'));
  const apiIdx = headers.findIndex(h => h.includes('api') || h.includes('tonale') || h.includes('phonetique'));
  const targetIdx = headers.findIndex(h => h.includes('cible') || h.includes('grammatical') || h.includes('phonologique'));
  const durationIdx = headers.findIndex(h => h.includes('duree') || h.includes('sec'));
  const contextIdx = headers.findIndex(h => h.includes('note') || h.includes('contexte') || h.includes('explication'));
  const imageIdx = headers.findIndex(h => h.includes('image') || h.includes('photo') || h.includes('url'));
  const diffIdx = headers.findIndex(h => h.includes('difficulte') || h.includes('niveau'));

  const fallbackImages = [
    'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
  ];

  const results: QuestionnaireItem[] = [];
  const dynamicThemesMap = new Map<string, ThemeDefinition>();
  existingThemes.forEach(th => dynamicThemesMap.set(th.id.toLowerCase(), th));

  const newDiscoveredThemes: ThemeDefinition[] = [];
  const targetDialect = isTtsCorpus ? 'orungu' : defaultDialect;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const myeneText = (myeneIdx >= 0 ? row[myeneIdx] : row[2]) || '';
    const frenchText = (frenchIdx >= 0 ? row[frenchIdx] : row[4]) || '';
    if (!myeneText || !frenchText) continue;

    const rawModule = (moduleIdx >= 0 ? row[moduleIdx] : '') || '';
    const explicitCsvId = idIdx >= 0 && row[idIdx] ? row[idIdx].trim() : '';
    const rawId = explicitCsvId
      ? sanitizeFirebaseRecordId(explicitCsvId)
      : generateDeterministicCsvItemId(myeneText, frenchText, targetDialect);
    const phonetic = apiIdx >= 0 ? row[apiIdx] : undefined;
    const target = targetIdx >= 0 ? row[targetIdx] : undefined;
    const duration = durationIdx >= 0 ? parseFloat(row[durationIdx]) || 8.2 : 8.2;
    const context = (contextIdx >= 0 ? row[contextIdx] : '') || (target ? `Cibles : ${target}` : `Module : ${rawModule || 'Corpus Myènè'}`);
    const img = (imageIdx >= 0 && row[imageIdx]) ? row[imageIdx] : fallbackImages[i % fallbackImages.length];
    
    let diff: 'debutant' | 'intermediaire' | 'avance' = 'intermediaire';
    if (diffIdx >= 0 && row[diffIdx]) {
      const d = row[diffIdx].toLowerCase();
      if (d.includes('deb')) diff = 'debutant';
      else if (d.includes('ava')) diff = 'avance';
    } else {
      if (myeneText.length < 35) diff = 'debutant';
      else if (myeneText.length > 70) diff = 'avance';
    }

    // Determine theme or dynamically register new theme from CSV
    let themeId = '';
    const allKnown = Array.from(dynamicThemesMap.values());
    
    // Check if rawModule represents an entirely new custom theme
    const cleanRawModule = rawModule.replace(/^[Mm]\d+[_:\s-]*/, '').replace(/[_]+/g, ' ').trim();
    if (cleanRawModule && cleanRawModule.length > 2) {
      const directMatch = allKnown.find(th => 
        th.id.toLowerCase() === rawModule.toLowerCase().trim() ||
        th.name.toLowerCase() === cleanRawModule.toLowerCase() ||
        th.shortName.toLowerCase() === cleanRawModule.toLowerCase()
      );

      if (directMatch) {
        themeId = directMatch.id;
      } else {
        // Classify with keywords first
        const heuristicTheme = classifyThematicCategory(rawModule, frenchText + ' ' + myeneText, allKnown);
        if (heuristicTheme && heuristicTheme !== 'vie_quotidienne_famille') {
          themeId = heuristicTheme;
        } else {
          // It's a novel custom module from the CSV! Create and register new ThemeDefinition
          const newTheme = createThemeFromModuleName(rawModule);
          if (!dynamicThemesMap.has(newTheme.id.toLowerCase())) {
            dynamicThemesMap.set(newTheme.id.toLowerCase(), newTheme);
            newDiscoveredThemes.push(newTheme);
          }
          themeId = newTheme.id;
        }
      }
    } else {
      themeId = classifyThematicCategory(rawModule, frenchText + ' ' + myeneText, allKnown);
    }

    results.push({
      id: rawId,
      // Numérotation d'origine du fichier (ex. ORU_0001) : permet de METTRE À JOUR la phrase
      // lors d'un nouvel envoi du même fichier corrigé, au lieu de créer un doublon.
      sourceRef: explicitCsvId || undefined,
      frenchText,
      myeneText,
      dialect: targetDialect,
      category: themeId,
      theme: themeId,
      moduleThematique: rawModule,
      phoneticApi: phonetic,
      grammaticalTarget: target,
      durationSec: duration,
      contextNotes: context,
      imageUrl: img,
      difficulty: diff,
      status: 'active',
      contributionsCount: 0,
      recordingsCount: 0,
      createdBy: 'admin_csv_import',
      createdAt: new Date().toISOString()
    });
  }

  return { items: results, newDiscoveredThemes };
}

// Convertit le contenu d'un CSV (Corpus TTS Ôrungu ou format Standard OMPANGANO) en QuestionnaireItem[]
export function parsePhrasesFromCsv(
  csvText: string, 
  defaultDialect: string = 'orungu', 
  existingThemes: ThemeDefinition[] = THEMATIC_CATEGORIES
): QuestionnaireItem[] {
  return parsePhrasesAndDiscoverThemes(csvText, defaultDialect, existingThemes).items;
}

// Générateur de modèle CSV d'importation vierge/documenté
export function generateCsvTemplate(): string {
  // Exemples tirés des leçons omyènè (C. Hombouhiry). La transcription API est laissée vide :
  // elle doit être saisie par un locuteur ou un linguiste, jamais devinée.
  return `ID,Module_Thematique,Texte_Orungu_Orthographe,Transcription_API_Tonale,Traduction_Francaise,Cibles_Phonologiques_Grammaticales,Duree_Estimee_Sec
ORU_0001,M1_Oralite_Salutations,"Mbolo ! A wéré vôvô ?","","Bonjour ! Comment vas-tu ?","Salutations & Intonation",8.2
ORU_0002,M1_Oralite_Salutations,"Owaro-mfélo, ré nyènyo ngôri.","","Dans la pirogue d'autrui, ne prends pas tes aises.","Proverbe de navigation",8.2
ORU_0003,M2_Quotidien_Alternances_Sandhi,"Va myè aningo","","Donne-moi de l'eau","Impératif",4
ORU_0004,M6_Oralite_Proverbes,"Ngow' orové azongo mbani","","On ne poursuit pas deux cochons sauvages dans une savane.","Proverbe",8.2`;
}

// =========================================================================
// IMPORTATION CSV & DÉDUPLICATION POUR LES CLANS ET LES VILLAGES
// =========================================================================

function normalizeTribeName(raw: string, fallback: string = 'Enenga'): string {
  const s = (raw || '').trim().toLowerCase();
  if (!s) return fallback;
  if (s.includes('orungu') || s.includes('ôrungu')) return 'Ôrungu';
  if (s.includes('mpongw')) return 'Mpongwè';
  if (s.includes('enenga') || s.includes('eninga')) return 'Enenga';
  if (s.includes('galoa') || s.includes('galwa')) return 'Galoa';
  if (s.includes('nkomi')) return 'Nkomi';
  if (s.includes('adyumba') || s.includes('ajumba')) return 'Adyumba';
  // Match exact from MYENE_TRIBES or return trimmed string
  const found = MYENE_TRIBES.find(t => t.toLowerCase() === s);
  return found || raw.trim();
}

function makeClanDeterministicId(tribe: string, name: string): string {
  const slugTribe = (tribe || 'myene')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const slugName = (name || 'clan')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `clan-${slugTribe}-${slugName}`;
}

function makeVillageDeterministicId(tribe: string, name: string): string {
  const slugTribe = (tribe || 'myene')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const slugName = (name || 'village')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `vil-${slugTribe}-${slugName}`;
}

/**
 * Parse un fichier CSV ou texte tabulé de Clans.
 * Colonnes supportées (avec ou sans en-tête) :
 * Nom_Clan (ou Clan / Name), Tribu (ou Tribe), Description, Signification_Historique, Origines_Geographiques, Devise_Symbole
 */
export function parseClansFromCsv(csvText: string, defaultTribe: string = 'Enenga'): ClanRegistry[] {
  const rows = parseCSVRows(csvText);
  if (rows.length === 0) return [];

  const firstRowLower = rows[0].map(c => c.toLowerCase().trim());
  const hasHeader = firstRowLower.some(h =>
    h.includes('clan') ||
    h.includes('nom') ||
    h.includes('name') ||
    h.includes('tribu') ||
    h.includes('tribe') ||
    h.includes('signification') ||
    h.includes('origine')
  );

  let idxName = 0;
  let idxTribe = 1;
  let idxDesc = 2;
  let idxHist = 3;
  let idxGeo = 4;
  let idxMotto = 5;

  if (hasHeader) {
    idxName = firstRowLower.findIndex(h => h.includes('nom') || h === 'clan' || h.includes('clan_name') || h === 'name');
    idxTribe = firstRowLower.findIndex(h => h.includes('tribu') || h.includes('tribe') || h.includes('dialect'));
    idxDesc = firstRowLower.findIndex(h => h.includes('desc'));
    idxHist = firstRowLower.findIndex(h => h.includes('hist') || h.includes('signification') || h.includes('sens'));
    idxGeo = firstRowLower.findIndex(h => h.includes('geo') || h.includes('origine') || h.includes('terroir') || h.includes('region'));
    idxMotto = firstRowLower.findIndex(h => h.includes('devise') || h.includes('symbole') || h.includes('motto'));
    if (idxName === -1) idxName = 0;
  }

  const startIdx = hasHeader ? 1 : 0;
  const results: ClanRegistry[] = [];
  const seenKeys = new Set<string>();

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Support 1-column list of clan names
    const rawName = (row[idxName] || row[0] || '').replace(/^[•\-*]\s*/, '').trim();
    if (!rawName) continue;

    const rawTribe = idxTribe >= 0 && row[idxTribe] ? row[idxTribe] : defaultTribe;
    const tribe = normalizeTribeName(rawTribe, defaultTribe);
    const key = `${tribe.toLowerCase()}::${rawName.toLowerCase()}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const description = idxDesc >= 0 && row[idxDesc] ? row[idxDesc].trim() : undefined;
    const historicalMeaning = idxHist >= 0 && row[idxHist] ? row[idxHist].trim() : undefined;
    const geographicalOrigins = idxGeo >= 0 && row[idxGeo] ? row[idxGeo].trim() : undefined;
    const mottoOrSymbol = idxMotto >= 0 && row[idxMotto] ? row[idxMotto].trim() : undefined;

    results.push({
      id: makeClanDeterministicId(tribe, rawName),
      name: rawName,
      tribe,
      description,
      historicalMeaning,
      geographicalOrigins,
      mottoOrSymbol,
      createdAt: new Date().toISOString()
    });
  }

  return results;
}

export function deduplicateParsedCsvClans(
  parsedClans: ClanRegistry[],
  existingClans: ClanRegistry[]
): { newClansToImport: ClanRegistry[]; skippedCount: number } {
  const existingKeys = new Set<string>();
  const existingIds = new Set<string>();

  for (const cl of existingClans) {
    existingIds.add(cl.id.toLowerCase());
    existingKeys.add(`${(cl.tribe || '').trim().toLowerCase()}::${(cl.name || '').trim().toLowerCase()}`);
  }

  const newClansToImport: ClanRegistry[] = [];
  let skippedCount = 0;

  for (const item of parsedClans) {
    const key = `${(item.tribe || '').trim().toLowerCase()}::${(item.name || '').trim().toLowerCase()}`;
    if (existingIds.has(item.id.toLowerCase()) || existingKeys.has(key)) {
      skippedCount++;
      continue;
    }
    existingIds.add(item.id.toLowerCase());
    existingKeys.add(key);
    newClansToImport.push(item);
  }

  return { newClansToImport, skippedCount };
}

export function generateClansCsvTemplate(): string {
  return `Nom_Clan,Tribu,Description,Signification_Historique,Origines_Geographiques,Devise_Symbole
"NomDuClan1","Enenga","Clan traditionnel Enenga","Lignée historique des rives de l'Ogooué","Lambaréné et Moyen-Ogooué","Gardiens du fleuve"
"NomDuClan2","Galoa","Clan traditionnel Galoa","Orateurs et gardiens des traditions lacustres","Lacs du Sud et Moyen-Ogooué","Maîtrise du verbe"
"NomDuClan3","Mpongwè","Clan traditionnel Mpongwè","Lignée côtière de l'Estuaire","Estuaire du Komo","Hospitalité et sagesse"`;
}

/**
 * Parse un fichier CSV ou texte tabulé de Villages.
 * Colonnes supportées (avec ou sans en-tête) :
 * Nom_Village (ou Village / Name), Tribu (ou Tribe), Clan_Rattachement (ou Clan, optionnel), Region_Province (ou Region)
 */
export function parseVillagesFromCsv(csvText: string, defaultTribe: string = 'Ôrungu'): VillageRegistry[] {
  const rows = parseCSVRows(csvText);
  if (rows.length === 0) return [];

  const firstRowLower = rows[0].map(c => c.toLowerCase().trim());
  const hasHeader = firstRowLower.some(h =>
    h.includes('village') ||
    h.includes('nom') ||
    h.includes('name') ||
    h.includes('tribu') ||
    h.includes('tribe') ||
    h.includes('clan') ||
    h.includes('region') ||
    h.includes('province')
  );

  let idxName = 0;
  let idxTribe = 1;
  let idxClan = 2;
  let idxRegion = 3;

  if (hasHeader) {
    idxName = firstRowLower.findIndex(h => h.includes('village') || h.includes('nom') || h === 'name');
    idxTribe = firstRowLower.findIndex(h => h.includes('tribu') || h.includes('tribe'));
    idxClan = firstRowLower.findIndex(h => h.includes('clan'));
    idxRegion = firstRowLower.findIndex(h => h.includes('region') || h.includes('province') || h.includes('zone') || h.includes('localisation'));
    if (idxName === -1) idxName = 0;
  }

  const startIdx = hasHeader ? 1 : 0;
  const results: VillageRegistry[] = [];
  const seenKeys = new Set<string>();

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawName = (row[idxName] || row[0] || '').replace(/^[•\-*]\s*/, '').trim();
    if (!rawName) continue;

    const rawTribe = idxTribe >= 0 && row[idxTribe] ? row[idxTribe] : defaultTribe;
    const tribe = normalizeTribeName(rawTribe, defaultTribe);

    const key = `${tribe.toLowerCase()}::${rawName.toLowerCase()}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const rawClan = idxClan >= 0 && row[idxClan] ? row[idxClan].trim() : '';
    const rawRegion = idxRegion >= 0 && row[idxRegion] ? row[idxRegion].trim() : '';

    results.push({
      id: makeVillageDeterministicId(tribe, rawName),
      name: rawName,
      tribe,
      clan: rawClan || 'Non rattaché',
      region: rawRegion || undefined,
      createdAt: new Date().toISOString()
    });
  }

  return results;
}

export function deduplicateParsedCsvVillages(
  parsedVillages: VillageRegistry[],
  existingVillages: VillageRegistry[]
): { newVillagesToImport: VillageRegistry[]; skippedCount: number } {
  const existingKeys = new Set<string>();
  const existingIds = new Set<string>();

  for (const v of existingVillages) {
    existingIds.add(v.id.toLowerCase());
    existingKeys.add(`${(v.tribe || '').trim().toLowerCase()}::${(v.name || '').trim().toLowerCase()}`);
  }

  const newVillagesToImport: VillageRegistry[] = [];
  let skippedCount = 0;

  for (const item of parsedVillages) {
    const key = `${(item.tribe || '').trim().toLowerCase()}::${(item.name || '').trim().toLowerCase()}`;
    if (existingIds.has(item.id.toLowerCase()) || existingKeys.has(key)) {
      skippedCount++;
      continue;
    }
    existingIds.add(item.id.toLowerCase());
    existingKeys.add(key);
    newVillagesToImport.push(item);
  }

  return { newVillagesToImport, skippedCount };
}

export function generateVillagesCsvTemplate(): string {
  return `Nom_Village,Tribu,Clan_Rattachement,Region_Province
"Ozouri","Ôrungu","Agenje","Ogooué-Maritime"
"Alumbè","Ôrungu","Ajena","Ogooué-Maritime"
"NomDuVillageEnenga","Enenga","","Moyen-Ogooué"`;
}

// =========================================================================
// ASSAINISSEMENT & ANTI-POLLUTION DE LA BASE DE DONNÉES (AUDIT & NETTOYAGE)
// =========================================================================

export const DEMO_MOCK_USER_IDS = new Set([
  'u-mboumba',
  'u-kombila',
  'u-suspect-1',
  'u-suspect-2'
]);

const LEGACY_UNVERIFIED_CLAN_NAMES = new Set([
  'agwesono',
  'ndiwa',
  'avandji',
  'imvona',
  'ininga',
  'agulamba',
  'ogula',
  'asiga',
  'agwempolo',
  'azowa',
  'alamba',
  'amwiri',
  "ilongo n'adjena",
  'agenjé'
]);

/**
 * Nettoie les références aux anciens clans non vérifiés sur les fiches initiales
 * et déduplique les fiches par contenu (dialecte + texte Myènè + traduction française).
 */
export function sanitizeAndDeduplicateItems(
  existingItems: QuestionnaireItem[],
  _validClans: ClanRegistry[],
  deletedItemIds: Set<string> = new Set()
): {
  cleanedItems: QuestionnaireItem[];
  updatedItemsToSave: QuestionnaireItem[];
  duplicateItemIdsToRemove: string[];
} {
  const presetMap = new Map(INITIAL_ENENGA_ITEMS.map(it => [it.id, it]));

  const updatedItemsToSave: QuestionnaireItem[] = [];
  const duplicateItemIdsToRemove: string[] = [];
  const byContentKey = new Map<string, QuestionnaireItem>();

  for (const rawItem of existingItems) {
    if (!rawItem || !rawItem.id || deletedItemIds.has(rawItem.id)) continue;

    let item = { ...rawItem };
    let wasModified = false;

    // Règle linguistique stricte : les questions ne sont jamais catégorisées par clan (uniquement par Tribu/Dialecte et Thème).
    if (item.clan !== undefined || item.clans !== undefined) {
      delete item.clan;
      delete item.clans;
      wasModified = true;
    }

    const preset = presetMap.get(item.id);
    if (preset && item.dialect !== preset.dialect) {
      item = {
        ...item,
        dialect: preset.dialect
      };
      wasModified = true;
    }

    const contentKey = `${(item.dialect || '').trim().toLowerCase()}::${(item.myeneText || '').trim().toLowerCase()}::${(item.frenchText || '').trim().toLowerCase()}`;
    const alreadySeen = byContentKey.get(contentKey);

    if (!alreadySeen) {
      byContentKey.set(contentKey, item);
      if (wasModified) {
        updatedItemsToSave.push(item);
      }
    } else {
      // Garde la fiche ayant le plus de contributions ou l'ID canonique
      const keepNew = (item.contributionsCount || 0) > (alreadySeen.contributionsCount || 0);
      if (keepNew) {
        duplicateItemIdsToRemove.push(alreadySeen.id);
        byContentKey.set(contentKey, item);
        if (wasModified) {
          updatedItemsToSave.push(item);
        }
      } else {
        if (item.id !== alreadySeen.id) {
          duplicateItemIdsToRemove.push(item.id);
        }
      }
    }
  }

  return {
    cleanedItems: Array.from(byContentKey.values()),
    updatedItemsToSave,
    duplicateItemIdsToRemove
  };
}

/**
 * Audit complet et nettoyage anti-pollution des Clans, Villages, Fiches et Utilisateurs fictifs.
 */
export function auditAndSanitizeDatabaseState(params: {
  items: QuestionnaireItem[];
  clans: ClanRegistry[];
  villages: VillageRegistry[];
  usersList: UserProfile[];
  deletedItemIds?: Set<string>;
  deletedClanIds?: Set<string>;
  deletedVillageIds?: Set<string>;
}): {
  cleanedClans: ClanRegistry[];
  clansToSave: ClanRegistry[];
  clanIdsToRemove: string[];
  cleanedVillages: VillageRegistry[];
  villageIdsToRemove: string[];
  cleanedItems: QuestionnaireItem[];
  itemsToSave: QuestionnaireItem[];
  itemIdsToRemove: string[];
  cleanedUsers: UserProfile[];
  demoUserIdsToRemove: string[];
} {
  const deletedClanIds = params.deletedClanIds || new Set<string>();
  const deletedVillageIds = params.deletedVillageIds || new Set<string>();
  const deletedItemIds = params.deletedItemIds || new Set<string>();

  // 1. Clans : purge les anciens clans de seed + déduplique par (tribu + nom)
  const { merged: mergedClans, newlyAddedOrUpdated: clansToSave, removedObsoleteIds } = mergeOfficialClans(
    params.clans,
    deletedClanIds
  );
  const keptClanIds = new Set(mergedClans.map(c => c.id));
  const duplicateClanIds = params.clans
    .filter(c => !keptClanIds.has(c.id))
    .map(c => c.id);
  const clanIdsToRemove = Array.from(new Set([...removedObsoleteIds, ...duplicateClanIds]));

  // 2. Villages : purge les 14 anciens villages de seed + déduplique par (tribu + nom)
  const { cleaned: nonObsoleteVillages, removedObsoleteVillageIds } = cleanObsoleteSeedVillages(
    params.villages,
    deletedVillageIds
  );
  const villageByNormKey = new Map<string, VillageRegistry>();
  const duplicateVillageIds: string[] = [];
  for (const v of nonObsoleteVillages) {
    const key = `${(v.tribe || '').trim().toLowerCase()}::${(v.name || '').trim().toLowerCase()}`;
    if (!villageByNormKey.has(key)) {
      villageByNormKey.set(key, v);
    } else {
      const existing = villageByNormKey.get(key)!;
      if (existing.id !== v.id) {
        duplicateVillageIds.push(v.id);
      }
    }
  }
  const cleanedVillages = Array.from(villageByNormKey.values());
  const villageIdsToRemove = Array.from(new Set([...removedObsoleteVillageIds, ...duplicateVillageIds]));

  // 3. Items : nettoie les références d'anciens clans et déduplique
  const {
    cleanedItems,
    updatedItemsToSave: itemsToSave,
    duplicateItemIdsToRemove: itemIdsToRemove
  } = sanitizeAndDeduplicateItems(params.items, mergedClans, deletedItemIds);

  // 4. Utilisateurs : retire les 4 profils fictifs de démo s'ils sont présents
  const demoUserIdsToRemove: string[] = [];
  const cleanedUsers = params.usersList.filter(u => {
    if (DEMO_MOCK_USER_IDS.has(u.id)) {
      demoUserIdsToRemove.push(u.id);
      return false;
    }
    return true;
  });

  return {
    cleanedClans: mergedClans,
    clansToSave,
    clanIdsToRemove,
    cleanedVillages,
    villageIdsToRemove,
    cleanedItems,
    itemsToSave,
    itemIdsToRemove,
    cleanedUsers,
    demoUserIdsToRemove
  };
}

