import { StyleSheet } from 'react-native';

/**
 * Jetons de conception de Nkala (canevas Design « Toutes les vues de l'app mobile », planche « Jetons pour le code »).
 * `couleurs` reste l'ancienne palette sombre utilisée par les écrans de contribution et d'administration ;
 * les nouveaux écrans lisent `useTheme()` (Prefs.tsx) et s'adaptent au thème clair ou sombre.
 */
export interface Palette {
  fond: string; fond2: string; carte: string; carteHaut: string; carteBas: string; bord: string; bordAmbre: string;
  texte: string; fort: string; discret: string; accent: string; squelette: string; verre: string; succes: string; erreur: string;
  halo1: string; halo2: string; surAccent: string;
  /** Teinte d'accent de chaque module. */
  modules: { ompangano: string; onenji: string; azeva: string; ontci: string; nkala: string };
}

export const sombre: Palette = {
  fond: '#170D08', fond2: '#1A0F0A', carte: '#27150C', carteHaut: 'rgba(46,26,17,0.92)', carteBas: 'rgba(28,16,11,0.97)', bord: '#4A2412',
  bordAmbre: 'rgba(217,119,6,0.22)', texte: '#FED7AA', fort: '#FDFAF7', discret: '#A8826D', accent: '#F59E0B', squelette: '#2E1A11',
  verre: 'rgba(23,13,8,0.78)', succes: '#22C55E', erreur: '#EF4444', halo1: 'rgba(200,90,50,0.30)', halo2: 'rgba(245,158,11,0.16)', surAccent: '#170D08',
  modules: { ompangano: '#D9693F', onenji: '#F59E0B', azeva: '#FDE047', ontci: '#FED7AA', nkala: '#C85A32' },
};

export const clair: Palette = {
  fond: '#FDFAF7', fond2: '#F7EEE6', carte: '#FBF2EA', carteHaut: '#FFF9F4', carteBas: '#F7EADF', bord: '#EAD3C2',
  bordAmbre: 'rgba(180,83,9,0.25)', texte: '#27150C', fort: '#170D08', discret: '#76503F', accent: '#B45309', squelette: '#F0DFD2',
  verre: 'rgba(253,250,247,0.86)', succes: '#15803D', erreur: '#B91C1C', halo1: 'rgba(200,90,50,0.14)', halo2: 'rgba(245,158,11,0.18)', surAccent: '#FDFAF7',
  modules: { ompangano: '#B84A28', onenji: '#B45309', azeva: '#A16207', ontci: '#7C2D12', nkala: '#B84A28' },
};

/** Ancienne palette sombre, figée : console d'administration et espace du validateur (outils internes, toujours sombres). */
export const couleursSombres = {
  fond: '#170d08', carte: '#27150c', bord: '#4a2412', terre: '#c85a32', ambre: '#f59e0b',
  texte: '#fed7aa', texteClair: '#ffffff', discret: '#a8826d',
};

// Palette courante des anciens écrans : fixée par PrefsProvider à chaque rendu, lue à l'affichage (getters) et par stylesDyn.
let courante: Palette | null = null;
let version = 0;
export function definirPaletteCourante(p: Palette) { if (courante !== p) { courante = p; version++; } }
const pal = () => courante ?? sombre;

/** Anciens écrans de contribution : mêmes noms que l'ancienne palette, mais qui suivent le thème clair ou sombre. */
export const couleurs = {
  get fond() { return pal().fond; }, get carte() { return pal().carte; }, get bord() { return pal().bord; },
  get terre() { return pal() === sombre ? '#c85a32' : '#B84A28'; }, get ambre() { return pal().accent; },
  get texte() { return pal().texte; }, get texteClair() { return pal().fort; }, get discret() { return pal().discret; },
};

/** Équivalent de StyleSheet.create dont les valeurs se recalculent quand le thème change (les écrans sont remontés par ThemeKey). */
export function stylesDyn<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(fabrique: () => T | StyleSheet.NamedStyles<T>): T {
  let v = -1; let cache: any;
  return new Proxy({} as T, { get(_, k) { if (v !== version) { cache = StyleSheet.create(fabrique() as any); v = version; } return cache[k as string]; } });
}

export const marque = {
  brique: '#B84A28', terre: '#C85A32', ambre: '#F59E0B', ambreFonce: '#D97706', bronze: '#B45309', rougeSombre: '#7C2D12', brun: '#3B1D10', jaune: '#FDE047', teal: '#0D9488',
};

export const degrades = {
  brique: ['#B84A28', '#A84125', '#99381B'] as const,
  ambre: ['#F59E0B', '#E58C08', '#D97706'] as const,
  flamme: ['#F59E0B', '#C85A32'] as const,
  lecteur: ['#5A2414', '#3B1D10'] as const,
};

export const rayons = { xs: 9, sm: 12, md: 16, lg: 20, xl: 24, fiche: 28, ecran: 46, pilule: 999 };
export const espaces = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 };
export const tactile = { minimum: 44, barreBasse: 88, bouton: 54 };

/** Familles de polices chargées au démarrage (Outfit pour les titres, Plus Jakarta Sans pour le texte). */
export const polices = {
  titre: 'Outfit_600SemiBold', titreGras: 'Outfit_700Bold', titreMoyen: 'Outfit_500Medium',
  corps: 'PlusJakartaSans_400Regular', corpsMoyen: 'PlusJakartaSans_500Medium', corpsGras: 'PlusJakartaSans_600SemiBold', corpsTresGras: 'PlusJakartaSans_700Bold',
  italique: 'PlusJakartaSans_400Regular_Italic',
};

export const texte = {
  titre: { fontFamily: polices.titre, fontSize: 28, lineHeight: 31, letterSpacing: -0.5 },
  sousTitre: { fontFamily: polices.titre, fontSize: 20, lineHeight: 24, letterSpacing: -0.2 },
  carte: { fontFamily: polices.titre, fontSize: 16, lineHeight: 20 },
  corps: { fontFamily: polices.corps, fontSize: 15, lineHeight: 21 },
  petit: { fontFamily: polices.corps, fontSize: 13, lineHeight: 18 },
  libelle: { fontFamily: polices.corpsGras, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  myene: { fontFamily: polices.italique },
};

export const ombres = {
  carte: { shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 15, shadowOffset: { width: 0, height: 14 }, elevation: 6 },
  bouton: { shadowColor: '#B84A28', shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
};

/** Mouvement : durées en ms ; sur téléphone modeste, onde et 20 confettis au plus, flamme et rebonds coupés. */
export const mouvement = { appui: 120, apparition: 260, fiche: 300, onde: 1100, flamme: 1600, pulsation: 1800, confettisMax: 34, confettisModeste: 20 };
