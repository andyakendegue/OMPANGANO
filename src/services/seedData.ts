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
  { id: 'clan-agwesono', name: 'Agwesono', tribe: 'Mpongwè', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'clan-avandji', name: 'Avandji', tribe: 'Enenga', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'clan-agulamba', name: 'Agulamba', tribe: 'Galoa', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'clan-asiga', name: 'Asiga', tribe: 'Nkomi', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'clan-azowa', name: 'Azowa', tribe: 'Adyumba', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'clan-ndiwa', name: 'Ndiwa', tribe: 'Mpongwè', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'clan-imvona', name: 'Imvona', tribe: 'Enenga', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'clan-agwempolo', name: 'Agwempolo', tribe: 'Nkomi', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'clan-alamba', name: 'Alamba', tribe: 'Ôrungu', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'clan-ogula', name: 'Ogula', tribe: 'Galoa', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'clan-ininga', name: 'Ininga', tribe: 'Enenga', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'clan-amwiri', name: 'Amwiri', tribe: 'Ôrungu', createdAt: '2026-01-01T00:00:00Z' }
];

export const INITIAL_VILLAGES: VillageRegistry[] = [
  { id: 'vil-lambarene', name: 'Lambaréné (Moyen-Ogooué)', tribe: 'Enenga', region: 'Moyen-Ogooué', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'vil-lac-zile', name: 'Lac Zilé', tribe: 'Enenga', region: 'Lacs du Sud', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'vil-lac-onangue', name: 'Lac Onangué', tribe: 'Enenga', region: 'Lacs du Nord', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'vil-ashouka', name: 'Ashouka', tribe: 'Enenga', region: 'Moyen-Ogooué', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'vil-adolinanongo', name: 'Adolinanongo', tribe: 'Galoa', region: 'Bas-Ogooué', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'vil-sainte-anne', name: 'Sainte-Anne du Fernan Vaz', tribe: 'Nkomi', region: 'Ogooué-Maritime', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'vil-omboue', name: 'Omboué', tribe: 'Nkomi', region: 'Ogooué-Maritime', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'vil-pointe-denis', name: 'Pointe-Denis', tribe: 'Mpongwè', region: 'Estuaire', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'vil-glass', name: 'Glass (Baraka)', tribe: 'Mpongwè', region: 'Estuaire', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'vil-ozouri', name: 'Ozouri', tribe: 'Ôrungu', region: 'Ogooué-Maritime', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'vil-mandji', name: 'Île Mandji (Port-Gentil)', tribe: 'Ôrungu', region: 'Ogooué-Maritime', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'vil-lac-azingo', name: 'Lac Azingo', tribe: 'Adyumba', region: 'Moyen-Ogooué', createdAt: '2026-01-01T00:00:00Z' }
];

export const INITIAL_ENENGA_ITEMS: QuestionnaireItem[] = [
  {
    id: 'nkala-enenga-01',
    frenchText: 'Bonjour à tous / Salutations fraternelles',
    myeneText: 'Mbolo vana',
    dialect: 'enenga',
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
    frenchText: 'Merci beaucoup / Gratitude du cœur',
    myeneText: 'Ayore polo',
    dialect: 'enenga',
    category: 'salutations',
    contextNotes: "'Ayore' signifie merci. 'Polo' accentue la gratitude (beaucoup, grandement). Utilisé après un partage ou un service rendu au village.",
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
    category: 'fleuve_peche',
    contextNotes: "L'Enenga est intimement lié à la vie sur les lacs d'Onangué et de Lambaréné. 'Irende' est la pirogue monoxyle creusée dans l'okoumé, véhicule vital des pêcheurs.",
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
    dialect: 'enenga',
    category: 'fleuve_peche',
    contextNotes: "Nkala donne son nom au projet. Le crabe symbolise la persévérance, la vigilance et la traversée entre terre et eau dans la cosmogonie fluviale.",
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
    category: 'nature_faune',
    contextNotes: "Les rives des lacs autour de Lambaréné abritent les grands troupeaux de nguwu (hippopotames). On observe leurs souffles quand le soleil décline.",
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
    dialect: 'enenga',
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
    dialect: 'enenga',
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
    category: 'vie_quotidienne',
    contextNotes: "Le poisson d'eau douce (carpes, capitaines, mâchoirons) fumé au bois aromatique est le pilier culinaire de la cuisine Enenga.",
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
    dialect: 'enenga',
    category: 'proverbes_contes',
    contextNotes: "Proverbe fondamental Enenga valorisant la transmission intergénérationnelle et la mémoire des hauts-fonds du fleuve.",
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
    dialect: 'enenga',
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

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const myeneText = (myeneIdx >= 0 ? row[myeneIdx] : row[2]) || '';
    const frenchText = (frenchIdx >= 0 ? row[frenchIdx] : row[4]) || '';
    if (!myeneText || !frenchText) continue;

    const rawModule = (moduleIdx >= 0 ? row[moduleIdx] : '') || '';
    const rawId = (idIdx >= 0 ? row[idIdx] : '') || `item-csv-${Date.now()}-${i}`;
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
      dialect: isTtsCorpus ? 'orungu' : defaultDialect,
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
