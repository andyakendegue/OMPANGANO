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

export const INITIAL_CLANS: ClanRegistry[] = [
  // --- LISTE OFFICIELLE DES 21 CLANS ÔRUNGU ---
  // (Les clans des autres tribus ne sont pas pré-remplis par défaut et s'ajoutent via l'Administration ou l'Import CSV)
  {
    id: 'clan-orungu-abulya',
    name: 'Abulya',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu de l’Île Mandji (Port-Gentil) et du delta maritime de l’Ogooué.',
    historicalMeaning: 'Grande lignée souveraine et historique du royaume Ôrungu (liée aux traditions royales du Re-Nkombe et des grands dignitaires côtiers), dépositaire de l’autorité coutumière sur le littoral Mandji.',
    geographicalOrigins: 'Île Mandji (Port-Gentil), Cap Lopez, Sangatanga et delta maritime de l’Ogooué (province de l’Ogooué-Maritime).',
    mottoOrSymbol: 'Noblesse du littoral Mandji et gardien de la mémoire royale Ôrungu.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-agalikewa',
    name: 'Agalikewa',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu des rives du delta et des chenaux maritimes.',
    historicalMeaning: 'Lignée ancienne Ôrungu garante des alliances claniques, de la jurisprudence coutumière et de la transmission du parler Ôrungu authentique.',
    geographicalOrigins: 'Delta de l’Ogooué, Île Mandji (Port-Gentil) et villages côtiers de l’Ogooué-Maritime.',
    mottoOrSymbol: 'Fidélité aux lois ancestrales et solidarité des rives.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-agenje',
    name: 'Agenje',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu du delta maritime de l’Ogooué, d’Ozouri et des lagunes côtières.',
    historicalMeaning: 'Clan côtier Ôrungu réputé pour sa maîtrise des marées, de la navigation entre fleuve et océan et des chants rituels d’accueil et de bénédiction.',
    geographicalOrigins: 'Delta maritime de l’Ogooué, Ozouri, lagunes côtières et Île Mandji (Ogooué-Maritime).',
    mottoOrSymbol: 'Fraternité des rives et mémoire des ancêtres navigateurs.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-agonjo-awenga',
    name: 'Agônjô - Awenga',
    tribe: 'Ôrungu',
    description: 'Clan double allié officiel Ôrungu (Agônjô - Awenga) du terroir maritime et fluvial.',
    historicalMeaning: 'Lignée confédérée unissant les branches Agônjô et Awenga dans une alliance historique de sang et d’entraide coutumière au sein de la nation Ôrungu.',
    geographicalOrigins: 'Cap Lopez, Île Mandji (Port-Gentil) et embouchures du Bas-Ogooué (Ogooué-Maritime).',
    mottoOrSymbol: 'Union indéfectible des lignées jumelles et force du conseil.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-ajena',
    name: 'Ajena',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu d’Alumbè, de l’Île Mandji et du bas-delta de l’Ogooué.',
    historicalMeaning: 'Illustre lignée Ôrungu dont la tradition orale préserve la généalogie des anciens chefs de terre et des alliances entre les bras du fleuve et l’océan Atlantique.',
    geographicalOrigins: 'Alumbè, Île Mandji (Port-Gentil) et bas-delta de l’Ogooué (province de l’Ogooué-Maritime).',
    mottoOrSymbol: 'Transmission intergénérationnelle et honneur du lignage.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-ajiwe',
    name: 'Ajiwè',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu des terres côtières et insulaires de l’Ogooué-Maritime.',
    historicalMeaning: 'Lignée traditionnelle Ôrungu dépositaire des savoirs rituels, des récits de fondation des campements côtiers et de la sagesse des anciens.',
    geographicalOrigins: 'Île Mandji (Port-Gentil), baies de l’Ogooué-Maritime et chenaux du delta.',
    mottoOrSymbol: 'Constance de l’esprit et respect de la parole donnée.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-alengonyango',
    name: 'Alèngonyangô',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu du littoral et des rivières de l’Ogooué-Maritime.',
    historicalMeaning: 'Lignée matrilinéaire et patrilinéaire prestigieuse de l’espace Ôrungu, gardienne des chants de lignage et des généalogies familiales (Ompangano).',
    geographicalOrigins: 'Littoral de Port-Gentil (Île Mandji), delta de l’Ogooué et rives maritimes.',
    mottoOrSymbol: 'Rayonnement de la maison maternelle et mémoire des anciens.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-ananga',
    name: 'Ananga',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu des rives maritimes et fluviales du Bas-Ogooué.',
    historicalMeaning: 'Clan d’observateurs et de guides coutumiers dont le nom évoque la clairvoyance, la veille sur le terroir et la rectitude morale.',
    geographicalOrigins: 'Delta de l’Ogooué, Île Mandji et côtes de l’Ogooué-Maritime.',
    mottoOrSymbol: 'Clairvoyance des anciens et vigilance sur la communauté.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-anombwe',
    name: 'Anômbwè',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu du delta de l’Ogooué et de l’Île Mandji.',
    historicalMeaning: 'Lignée historique Ôrungu attachée à la préservation des coutumes ancestrales, des alliances matrimoniales et du patrimoine linguistique côtier.',
    geographicalOrigins: 'Île Mandji (Port-Gentil), Cap Lopez et villages du delta de l’Ogooué.',
    mottoOrSymbol: 'Enracinement coutumier et concorde entre les familles.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-anori',
    name: 'Anori',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu des passes maritimes et du delta de l’Ogooué.',
    historicalMeaning: 'Lignée traditionnelle Ôrungu reconnue pour la maîtrise des eaux côtières, le sens de l’hospitalité et la conservation des proverbes anciens.',
    geographicalOrigins: 'Littoral de l’Ogooué-Maritime, Île Mandji et embouchures de l’Ogooué.',
    mottoOrSymbol: 'Sagesse tranquille et droiture du verbe.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-anuva-azino',
    name: 'Anuva - Azinô',
    tribe: 'Ôrungu',
    description: 'Clan double officiel Ôrungu (Anuva - Azinô) de l’Ogooué-Maritime.',
    historicalMeaning: 'Lignée jumelée scellant l’alliance historique des maisons Anuva et Azinô dans la garde des traditions orales et des terres claniques Ôrungu.',
    geographicalOrigins: 'Île Mandji (Port-Gentil), rives du delta de l’Ogooué et littoral atlantique.',
    mottoOrSymbol: 'Fraternité des deux maisons et pérennité du sang.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-avange',
    name: 'Avange',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu du delta et de la côte de l’Ogooué-Maritime.',
    historicalMeaning: 'Clan historique Ôrungu porteur d’une riche tradition d’éloquence lors des grands palabres coutumiers et des cérémonies de filiation.',
    geographicalOrigins: 'Port-Gentil (Île Mandji), Cap Lopez et bras maritimes de l’Ogooué.',
    mottoOrSymbol: 'Maîtrise de la parole juste et équilibre communautaire.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-avanji',
    name: 'Avanji',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu apparenté aux grandes lignées fluvio-maritimes Myènè.',
    historicalMeaning: 'Branche Ôrungu de la grande famille clanique Avanji, témoignant des liens séculaires entre le delta maritime de l’Ogooué et les rives fluviales intérieures.',
    geographicalOrigins: 'Delta maritime de l’Ogooué, Alumbè, Ozouri et Île Mandji (Ogooué-Maritime).',
    mottoOrSymbol: 'Pont vivant entre le fleuve Ogooué et l’océan.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-aworidela',
    name: 'Awôridèla',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu des terres ancestrales de l’Ogooué-Maritime.',
    historicalMeaning: 'Lignée majeure du monde Ôrungu, gardienne des récits généalogiques anciens et des alliances coutumières sur le littoral.',
    geographicalOrigins: 'Île Mandji (Port-Gentil), Sangatanga, Cap Lopez et delta de l’Ogooué.',
    mottoOrSymbol: 'Dignité ancestrale et sauvegarde des racines.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-ayamba',
    name: 'Ayamba',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu du littoral et des chenaux du Bas-Ogooué.',
    historicalMeaning: 'Clan traditionnel Ôrungu dépositaire des savoirs liés à la mer, à la pêche côtière et aux rites de protection de la communauté.',
    geographicalOrigins: 'Delta de l’Ogooué, Île Mandji et côtes de l’Ogooué-Maritime.',
    mottoOrSymbol: 'Harmonie avec l’océan et générosité du terroir.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-ayanji',
    name: 'Ayanji',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu établi dans le bassin maritime de l’Ogooué.',
    historicalMeaning: 'Lignée ancienne Ôrungu reconnue pour la fidélité à la mémoire des aïeux et la transmission rigoureuse des alliances claniques.',
    geographicalOrigins: 'Île Mandji (Port-Gentil), bas-delta de l’Ogooué et lagunes côtières.',
    mottoOrSymbol: 'Honneur des anciens et cohésion de la lignée.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-ayege-avemba',
    name: 'Ayege - Avèmba',
    tribe: 'Ôrungu',
    description: 'Clan double officiel Ôrungu (Ayege - Avèmba) de l’Ogooué-Maritime.',
    historicalMeaning: 'Alliance clanique historique réunissant les lignées Ayege et Avèmba autour d’un même héritage coutumier et spirituel dans le delta de l’Ogooué.',
    geographicalOrigins: 'Cap Lopez, Île Mandji (Port-Gentil) et villages côtiers de l’Ogooué-Maritime.',
    mottoOrSymbol: 'Double racine, même parole et solidarité éternelle.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-azandi',
    name: 'Azandi',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu des rives maritimes et estuariennes de l’Ogooué.',
    historicalMeaning: 'Lignée traditionnelle Ôrungu garante de la paix sociale, des médiations coutumières et de la pureté du vocabulaire cérémoniel.',
    geographicalOrigins: 'Île Mandji (Port-Gentil), delta de l’Ogooué et littoral de l’Ogooué-Maritime.',
    mottoOrSymbol: 'Justice coutumière et paix des foyers.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-aziza',
    name: 'Aziza',
    tribe: 'Ôrungu',
    description: 'Clan officiel Ôrungu du littoral atlantique et du delta de l’Ogooué.',
    historicalMeaning: 'Clan historique Ôrungu célébré pour la préservation des arts oraux, des proverbes marins et de l’histoire des fondateurs de la côte.',
    geographicalOrigins: 'Port-Gentil (Île Mandji), Cap Lopez et delta maritime de l’Ogooué.',
    mottoOrSymbol: 'Mémoire vive et noblesse du cœur.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-azume-aka-abele',
    name: 'Azumè – Aka - Abèlè',
    tribe: 'Ôrungu',
    description: 'Confédération clanique triple officielle Ôrungu (Azumè – Aka - Abèlè).',
    historicalMeaning: 'Grande triade lignagère Ôrungu unissant les branches Azumè, Aka et Abèlè par un pacte coutumier ancestral de fraternité et de partage territorial.',
    geographicalOrigins: 'Delta maritime de l’Ogooué, Île Mandji (Port-Gentil) et terroirs côtiers de l’Ogooué-Maritime.',
    mottoOrSymbol: 'Trois foyers unis dans une seule flamme ancestrale.',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'clan-orungu-azuwa-akosa-aworidela',
    name: 'Azuwa – Akôsa - Awôridèla',
    tribe: 'Ôrungu',
    description: 'Confédération clanique triple officielle Ôrungu (Azuwa – Akôsa - Awôridèla).',
    historicalMeaning: 'Illustre alliance tripartite Ôrungu rassemblant les maisons Azuwa, Akôsa et Awôridèla, gardiennes des généalogies royales et des sanctuaires côtiers.',
    geographicalOrigins: 'Île Mandji (Port-Gentil), Cap Lopez, Sangatanga et delta de l’Ogooué (Ogooué-Maritime).',
    mottoOrSymbol: 'Force du trépied ancestral et unité sacrée du clan.',
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
    } else if (!existing.historicalMeaning || !existing.geographicalOrigins) {
      const enriched: ClanRegistry = {
        ...official,
        ...existing,
        historicalMeaning: existing.historicalMeaning || official.historicalMeaning,
        geographicalOrigins: existing.geographicalOrigins || official.geographicalOrigins,
        mottoOrSymbol: existing.mottoOrSymbol || official.mottoOrSymbol,
        description: existing.description || official.description
      };
      byNormName.set(key, enriched);
      newlyAddedOrUpdated.push(enriched);
    }
  }

  return {
    merged: Array.from(byNormName.values()),
    newlyAddedOrUpdated,
    removedObsoleteIds
  };
}

export function getClanHistoricalAndGeoInfo(
  clan: Partial<ClanRegistry> & { name: string; tribe?: string },
  villages: VillageRegistry[] = []
): {
  historicalMeaning: string;
  geographicalOrigins: string;
  mottoOrSymbol: string;
  associatedVillages: string[];
} {
  const normName = (clan.name || '').trim().toLowerCase();
  const preset = INITIAL_CLANS.find(c => c.name.trim().toLowerCase() === normName);
  const matchedVillages = villages
    .filter(v => (v.clan || '').trim().toLowerCase() === normName)
    .map(v => v.name);

  const tribe = clan.tribe || preset?.tribe || 'Myènè';
  const defaultGeoByTribe: Record<string, string> = {
    'Mpongwè': 'Estuaire du Komo, rives de Libreville (Glass, Baraka, Louis) et Pointe-Denis (province de l’Estuaire).',
    'Enenga': 'Bassin fluvial de Lambaréné, Lac Zilé, Lac Onangué et rives du Moyen-Ogooué.',
    'Galoa': 'Moyen-Ogooué, Adolinanongo, Lambaréné et grands lacs du Sud (Onangué, Ezanga).',
    'Nkomi': 'Lagune du Fernan Vaz (Eliwa Nkomi), Omboué et Sainte-Anne (province de l’Ogooué-Maritime).',
    'Adyumba': 'Rives du Lac Azingo et voies d’eau septentrionales du Moyen-Ogooué.',
    'Ôrungu': 'Île Mandji (Port-Gentil), Cap Lopez, Alumbè, Ozouri et delta maritime de l’Ogooué (Ogooué-Maritime).'
  };

  return {
    historicalMeaning:
      clan.historicalMeaning ||
      preset?.historicalMeaning ||
      clan.description ||
      `Lignée clanique traditionnelle de la tribu ${tribe}, dépositaire des alliances coutumières, de la filiation OMPAGANO et de la transmission orale du parler ${tribe}.`,
    geographicalOrigins:
      clan.geographicalOrigins ||
      preset?.geographicalOrigins ||
      defaultGeoByTribe[tribe] ||
      'Bassin de l’Ogooué, lacs et littoral maritime du Gabon.',
    mottoOrSymbol:
      clan.mottoOrSymbol ||
      preset?.mottoOrSymbol ||
      `Sauvegarde du patrimoine oral et de la mémoire généalogique ${tribe}.`,
    associatedVillages: matchedVillages
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

export const INITIAL_ENENGA_ITEMS: QuestionnaireItem[] = [
  {
    id: 'nkala-enenga-01',
    frenchText: 'Bonjour à tous / Salutations fraternelles',
    myeneText: 'Mbolo vana',
    dialect: 'orungu',
    clan: 'Abulya',
    clans: ['Abulya', 'Agalikewa', 'Agenje', 'Ajena'],
    category: 'salutations',
    contextNotes: "Formule de salutation chaleureuse adressée à plusieurs personnes réunies. 'Mbolo' est la base de salutation universelle Myènè, et 'vana' désigne l'assemblée.",
    imageUrl: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=800&q=80',
    difficulty: 'debutant',
    status: 'active',
    contributionsCount: 14,
    recordingsCount: 12,
    createdBy: 'system_ompagano',
    createdAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 'nkala-enenga-02',
    frenchText: 'Merci beaucoup / Gratitude fraternelle',
    myeneText: 'Na vevi',
    dialect: 'orungu',
    clan: 'Agenje',
    clans: ['Agenje', 'Agônjô - Awenga', 'Ajiwè', 'Ananga'],
    category: 'salutations',
    contextNotes: "'Na vevi' signifie merci. 'Vevi' exprime la reconnaissance et la gratitude cordiale dans la tradition Myènè.",
    imageUrl: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=800&q=80',
    difficulty: 'debutant',
    status: 'active',
    contributionsCount: 22,
    recordingsCount: 19,
    createdBy: 'system_ompagano',
    createdAt: '2026-01-10T10:05:00Z'
  },
  {
    id: 'nkala-enenga-03',
    frenchText: 'La pirogue glisse sur les eaux calmes du lac',
    myeneText: 'Irende si bendi go nongo y’omvwa',
    dialect: 'enenga',
    clan: 'Avanji',
    clans: ['Avanji', 'Avange', 'Anômbwè', 'Anori'],
    category: 'fleuve_peche',
    contextNotes: "La sphère Myènè est intimement liée à la vie sur les lacs et le delta de l'Ogooué. 'Irende' est la pirogue monoxyle creusée dans l'okoumé, véhicule vital des pêcheurs.",
    imageUrl: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80',
    difficulty: 'intermediaire',
    status: 'active',
    contributionsCount: 9,
    recordingsCount: 7,
    createdBy: 'system_ompagano',
    createdAt: '2026-01-12T14:20:00Z'
  },
  {
    id: 'nkala-enenga-04',
    frenchText: 'Le crabe royal d’eau douce (Nkala)',
    myeneText: 'Nkala y’inongo',
    dialect: 'orungu',
    clan: 'Abulya',
    clans: ['Abulya', 'Ajena', 'Awôridèla', 'Ayamba'],
    category: 'fleuve_peche',
    contextNotes: "Nkala donne son nom au projet. Le crabe symbolise la persévérance, la vigilance et la traversée entre terre et eau dans la cosmogonie fluviale et maritime.",
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    difficulty: 'debutant',
    status: 'active',
    contributionsCount: 18,
    recordingsCount: 15,
    createdBy: 'system_ompagano',
    createdAt: '2026-01-14T09:15:00Z'
  },
  {
    id: 'nkala-enenga-05',
    frenchText: 'L’hippopotame souffle au crépuscule',
    myeneText: 'Nguwu e pembi go mpyo',
    dialect: 'enenga',
    clan: 'Ayanji',
    clans: ['Ayanji', 'Anuva - Azinô', 'Alèngonyangô', 'Azandi'],
    category: 'nature_faune',
    contextNotes: "Les rives des lacs et du fleuve abritent les grands troupeaux de nguwu (hippopotames). On observe leurs souffles quand le soleil décline.",
    imageUrl: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80',
    difficulty: 'avance',
    status: 'active',
    contributionsCount: 6,
    recordingsCount: 5,
    createdBy: 'system_ompagano',
    createdAt: '2026-01-15T11:45:00Z'
  },
  {
    id: 'nkala-enenga-06',
    frenchText: 'Le soleil se lève sur la grande forêt',
    myeneText: 'Nkombi yi bendi go mpounga polo',
    dialect: 'orungu',
    clan: 'Agônjô - Awenga',
    clans: ['Agônjô - Awenga', 'Ayege - Avèmba', 'Aziza', 'Abulya'],
    category: 'nature_faune',
    contextNotes: "'Nkombi' est le soleil / le jour. 'Mpounga' désigne l'immense forêt équatoriale dense qui borde le bassin de l'Ogooué.",
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    difficulty: 'intermediaire',
    status: 'active',
    contributionsCount: 11,
    recordingsCount: 10,
    createdBy: 'system_ompagano',
    createdAt: '2026-01-16T16:10:00Z'
  },
  {
    id: 'nkala-enenga-07',
    frenchText: 'Que la paix repose dans ta maison',
    myeneText: 'Oza w’omvwa go nago yâwé',
    dialect: 'orungu',
    clan: 'Azumè – Aka - Abèlè',
    clans: ['Azumè – Aka - Abèlè', 'Azuwa – Akôsa - Awôridèla', 'Agenje', 'Agalikewa'],
    category: 'famille_communaute',
    contextNotes: "Bénédiction traditionnelle Myènè prononcée par les aînés lors des visites familiales et des cérémonies d'accueil.",
    imageUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
    difficulty: 'avance',
    status: 'active',
    contributionsCount: 8,
    recordingsCount: 6,
    createdBy: 'system_ompagano',
    createdAt: '2026-01-18T08:30:00Z'
  },
  {
    id: 'nkala-enenga-08',
    frenchText: 'Les enfants préparent le poisson fumé',
    myeneText: 'Wana wa tongi inyege yi dyosi',
    dialect: 'enenga',
    clan: 'Anômbwè',
    clans: ['Anômbwè', 'Ananga', 'Ajiwè', 'Abulya'],
    category: 'vie_quotidienne',
    contextNotes: "Le poisson fumé au bois aromatique est le pilier culinaire de la cuisine traditionnelle riveraine et côtière Myènè.",
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    difficulty: 'intermediaire',
    status: 'active',
    contributionsCount: 15,
    recordingsCount: 13,
    createdBy: 'system_ompagano',
    createdAt: '2026-01-20T17:00:00Z'
  },
  {
    id: 'nkala-enenga-09',
    frenchText: 'Celui qui écoute les anciens ne s’égare point sur le fleuve',
    myeneText: 'O noki w’abami a za dova go nongo',
    dialect: 'orungu',
    clan: 'Ajena',
    clans: ['Ajena', 'Agônjô - Awenga', 'Avanji', 'Azandi'],
    category: 'proverbes_contes',
    contextNotes: "Proverbe fondamental Myènè valorisant la transmission intergénérationnelle et la mémoire des hauts-fonds du fleuve et de l'estuaire.",
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    difficulty: 'avance',
    status: 'active',
    contributionsCount: 19,
    recordingsCount: 16,
    createdBy: 'system_ompagano',
    createdAt: '2026-01-22T19:30:00Z'
  },
  {
    id: 'nkala-enenga-10',
    frenchText: 'Le tambour appelle à la danse rituelle',
    myeneText: 'Ngoma yi kengi vana g’ezango',
    dialect: 'orungu',
    clan: 'Abulya',
    clans: ['Abulya', 'Agenje', 'Ayamba', 'Awôridèla'],
    category: 'vie_quotidienne',
    contextNotes: "'Ngoma' est le tambour sacré en bois taillé. 'Ezango' est la danse communautaire célébrant les grandes joies et les rites.",
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    difficulty: 'intermediaire',
    status: 'active',
    contributionsCount: 12,
    recordingsCount: 11,
    createdBy: 'system_ompagano',
    createdAt: '2026-01-25T12:00:00Z'
  }
];

export const SYSTEM_BADGES: Badge[] = [
  {
    id: 'badge-genealogie-verifiee',
    title: 'Filiation OMPAGANO',
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
    title: 'Oreille de l’Aîné',
    description: 'A examiné et validé ou corrigé 5 contributions de relecture.',
    icon: '👂',
    requiredValidations: 5,
    category: 'expert'
  },
  {
    id: 'badge-premiere-voix',
    title: 'Première Voix',
    description: 'A enregistré sa toute première prononciation dans la langue des ancêtres.',
    icon: '🎙️',
    requiredRecordings: 1,
    category: 'audio'
  },
  {
    id: 'badge-gardien-lacs',
    title: 'Gardien des Lacs',
    description: 'A maintenu une série de 3 jours consécutifs de fidélité au programme OMPAGANO.',
    icon: '🌊',
    category: 'fidelite'
  },
  {
    id: 'badge-maitre-verbe',
    title: 'Maître du Verbe',
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
    title: 'Mémoire des Rois & Clans',
    description: 'A complété le défi historique : 5 phrases sur les dynasties, clans et rites royaux Ôrungu/Enenga.',
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
    title: 'Pisteur de la Savane',
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
    name: 'Histoire, Clans, Rois & Rites',
    shortName: 'Histoire & Rites',
    icon: '👑',
    description: 'Souverains (Agamwinboni, Rogombé, Ndombi), ancêtre Ngwè-Myènè, clans (Abulia, Alombè, Aganga, Anaga), rites Ombwiri, danses Ivanga et Njembè, lois coutumières (ampanga).',
    keywords: ['clan', 'roi', 'histoire', 'ancetre', 'rite', 'rituel', 'ombwiri', 'ngombi', 'ivanga', 'njembe', 'loi', 'coutume', 'agamwinboni', 'rogombe', 'ndombi', 'orungu', 'mandji', 'bulia', 'lombe', 'ganga', 'naga'],
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
    title: 'Mémoire des Rois & Dynasties',
    description: 'Vérifier ou traduire 5 phrases portant sur les clans, les rois et les rites sacrés.',
    theme: 'clans_histoire_rites',
    targetCount: 5,
    challengeType: 'contributions',
    xpReward: 300,
    badgeRewardId: 'badge-defi-orungu-clans',
    badgeRewardName: 'Mémoire des Rois & Clans',
    badgeRewardIcon: '👑',
    startDate: '2026-10-19T00:00:00Z',
    endDate: '2026-10-26T23:59:59Z',
    isActive: true
  }
];

export const USER_LEVELS = [
  { index: 1, name: 'Initié Curieux', minXp: 0, maxXp: 150, color: '#D97706', description: 'Découvre les sonorités et les premiers mots du patrimoine.' },
  { index: 2, name: 'Conteur des Lagunes', minXp: 150, maxXp: 450, color: '#C85A32', description: 'Reconnaît la finesse des accents et du vocabulaire des lacs et fleuves.' },
  { index: 3, name: 'Gardien du Verbe', minXp: 450, maxXp: 1000, color: '#B84A28', description: 'Enregistre avec justesse et apporte des variantes orthographiques précises.' },
  { index: 4, name: 'Maître de la Parole', minXp: 1000, maxXp: 2500, color: '#881337', description: 'Pilier de la transmission orale respecté par toute la communauté.' },
  { index: 5, name: 'Sage Ancien', minXp: 2500, maxXp: 99999, color: '#581C87', description: 'Autorité vivante sur la langue et les traditions orales Omyènè.' }
];

export function getLevelForXp(xp: number) {
  for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= USER_LEVELS[i].minXp) {
      return USER_LEVELS[i];
    }
  }
  return USER_LEVELS[0];
}

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

/**
 * Normalizes a Myènè or French phrase for reliable duplicate detection across imports
 * without altering the stored display text.
 */
export function normalizePhraseComparisonKey(text: string = ''): string {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^["'«»\s]+|["'«»\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds a unique content signature combining normalized Myènè and French texts.
 */
export function buildItemDeduplicationSignature(myeneText: string = '', frenchText: string = ''): string {
  return `${normalizePhraseComparisonKey(myeneText)}||${normalizePhraseComparisonKey(frenchText)}`;
}

/**
 * Ensures any CSV or generated record ID is 100% valid for both Firestore document paths
 * and Firebase Realtime Database keys (cannot contain '.', '$', '#', '[', ']', or '/').
 */
export function sanitizeFirebaseRecordId(rawId: string = ''): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[.$#[\]/\\]+/g, '_')
    .replace(/\s+/g, '_');
  return cleaned || `item_${Date.now()}`;
}

/**
 * Generates a deterministic ID from the phrase content when a CSV row has no explicit ID column,
 * so re-importing the same CSV file always maps to the exact same ID instead of generating random Date.now() IDs.
 */
export function generateDeterministicCsvItemId(
  myeneText: string,
  frenchText: string,
  dialect: string = 'orungu'
): string {
  const signature = `${normalizePhraseComparisonKey(dialect)}|${buildItemDeduplicationSignature(myeneText, frenchText)}`;
  let h1 = 0xdeadbeef ^ signature.length;
  let h2 = 0x41c6ce57 ^ signature.length;
  for (let i = 0; i < signature.length; i++) {
    const ch = signature.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hashHex = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  return `item_csv_${hashHex}`;
}

export interface CsvDeduplicationResult {
  newItemsToImport: QuestionnaireItem[];
  alreadyExistingItems: QuestionnaireItem[];
  internalDuplicatesCount: number;
  totalParsedCount: number;
}

/**
 * Deduplicates parsed CSV items against:
 * 1. All existing items already present in the live production database (matched by ID OR by normalized Myènè+French text),
 *    preserving existing production IDs and contributions.
 * 2. Internal duplicate rows within the CSV file itself.
 */
export function deduplicateParsedCsvItems(
  parsedItems: QuestionnaireItem[],
  existingItems: QuestionnaireItem[]
): CsvDeduplicationResult {
  const existingIds = new Set<string>();
  const existingSignatures = new Set<string>();

  for (const existing of existingItems || []) {
    if (!existing) continue;
    if (existing.id) {
      existingIds.add(existing.id.trim().toLowerCase());
      existingIds.add(sanitizeFirebaseRecordId(existing.id).toLowerCase());
    }
    if (existing.myeneText || existing.frenchText) {
      existingSignatures.add(buildItemDeduplicationSignature(existing.myeneText, existing.frenchText));
    }
  }

  const seenInCsvIds = new Set<string>();
  const seenInCsvSignatures = new Set<string>();

  const newItemsToImport: QuestionnaireItem[] = [];
  const alreadyExistingItems: QuestionnaireItem[] = [];
  let internalDuplicatesCount = 0;

  for (const candidate of parsedItems || []) {
    if (!candidate) continue;
    const safeId = sanitizeFirebaseRecordId(candidate.id);
    const lowerId = safeId.toLowerCase();
    const sig = buildItemDeduplicationSignature(candidate.myeneText, candidate.frenchText);

    // 1. Check if already in production database (by ID or by normalized Myènè + French text)
    if (existingIds.has(lowerId) || existingSignatures.has(sig)) {
      alreadyExistingItems.push(candidate);
      continue;
    }

    // 2. Check if duplicated earlier within the same CSV file
    if (seenInCsvIds.has(lowerId) || seenInCsvSignatures.has(sig)) {
      internalDuplicatesCount++;
      continue;
    }

    seenInCsvIds.add(lowerId);
    seenInCsvSignatures.add(sig);
    newItemsToImport.push({
      ...candidate,
      id: safeId
    });
  }

  return {
    newItemsToImport,
    alreadyExistingItems,
    internalDuplicatesCount,
    totalParsedCount: (parsedItems || []).length
  };
}

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

// Convertit le contenu d'un CSV (Corpus TTS Ôrungu ou format Standard OMPAGANO) en QuestionnaireItem[]
export function parsePhrasesFromCsv(
  csvText: string, 
  defaultDialect: string = 'orungu', 
  existingThemes: ThemeDefinition[] = THEMATIC_CATEGORIES
): QuestionnaireItem[] {
  return parsePhrasesAndDiscoverThemes(csvText, defaultDialect, existingThemes).items;
}

// Générateur de modèle CSV d'importation vierge/documenté
export function generateCsvTemplate(): string {
  return `ID,Module_Thematique,Texte_Orungu_Orthographe,Transcription_API_Tonale,Traduction_Francaise,Cibles_Phonologiques_Grammaticales,Duree_Estimee_Sec
ORU_0001,M1_Oralite_Salutations,"Mbolo ! A wé ré vôvô ?","[m̩bólò ‖ à wé ɾé βɔ́βɔ̀]","Bonjour ! Comment vas-tu ?","Salutations & Intonation",8.2
ORU_0002,M1_Oralite_Salutations,"Owaro-mfélo, ré nyènyo ngôri.","[òwáɾò m̩félò | ɾé ɲɛ́ɲò ŋ̩ɡɔ́ɾì]","Dans la pirogue d'autrui, ne prends pas tes aises.","Proverbe de navigation",8.2
ORU_0003,M2_Quotidien_Alternances_Sandhi,"Omwanto é kol'otondo wami go nkala.","[òmwántò é kólòtóndò wàmì ɣò ŋ̩kálà]","La femme achète mon panier au village.","Élision & Sandhi",8.2
ORU_0004,M5_Histoire_Clans_Rites_Orungu,"Agamwinboni wa bonga ambwaro mpolo go nugo go ntchuwa.","[àɣámwímbónì wá bóŋɡà àmbwàɾò m̩pólò ɣò núɣò ɣò n̩tʃúwà]","Le souverain Agamwinboni prit les grandes pirogues en haute mer.","Navigation & Dynastie",8.2`;
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
