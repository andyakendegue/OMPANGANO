import type { TribeName } from './types';

// Copie de MYENE_TRIBES, mapDialectToTribeName et mapTribeNameToDialectCode (src/services/seedData.ts) : à garder identiques.
export const MYENE_TRIBES: TribeName[] = ['Mpongwè', 'Adyumba', 'Enenga', 'Nkomi', 'Galoa', 'Ôrungu'];

export function tribuDuDialecte(dialecte?: string): TribeName {
  const c = (dialecte || '').trim().toLowerCase();
  if (c.includes('orungu') || c.includes('ôrungu')) return 'Ôrungu';
  if (c.includes('mpong')) return 'Mpongwè';
  if (c.includes('galoa') || c.includes('galwa')) return 'Galoa';
  if (c.includes('nkomi')) return 'Nkomi';
  if (c.includes('adyumba') || c.includes('ajumba')) return 'Adyumba';
  if (c.includes('enenga')) return 'Enenga';
  return 'Ôrungu';
}

/** Code de dialecte proposé par défaut pour une tribu (variante tribale). */
export const CODE_DIALECTE_TRIBU: Record<TribeName, string> = {
  'Mpongwè': 'mpongwe', 'Adyumba': 'adyumba', 'Enenga': 'enenga', 'Nkomi': 'nkomi', 'Galoa': 'galoa', 'Ôrungu': 'orungu',
};
export const dialecteDeLaTribu = (tribu?: string) => CODE_DIALECTE_TRIBU[tribuDuDialecte(tribu)];

/** Variante tribale proposée à l'étape 1 (mêmes libellés que la liste du site web). */
export const VARIANTES_TRIBALES: [string, string][] = [
  ['enenga', 'Ethnie Enenga (Lambaréné & Lacs)'], ['mpongwe', 'Ethnie Mpongwè (Estuaire / Libreville)'], ['galwa', 'Ethnie Galwa (Lambaréné fleuve)'],
  ['nkomi', 'Ethnie Nkomi (Fernan Vaz)'], ['orungu', 'Ethnie Ôrungu (Port-Gentil)'], ['adyumba', 'Ethnie Adyumba (Lac Azingo)'],
];

/** Nuances du sens français (étape 2). */
export const NUANCES_SENS: { id: 'correction_sens' | 'autre_tournure' | 'sens_secondaire'; label: string; desc: string }[] = [
  { id: 'correction_sens', label: '🎯 Signification plus exacte', desc: 'Le sens affiché est imprécis' },
  { id: 'autre_tournure', label: '🔄 Autre tournure française', desc: 'Reformulation plus naturelle' },
  { id: 'sens_secondaire', label: '🌿 Sens secondaire / figuré', desc: 'Sens caché, littéral ou proverbe' },
];
