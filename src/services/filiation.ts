/** Valeur choisie quand la personne ne connaît pas son clan ou son village : elle compte comme une réponse. */
export const JE_NE_SAIS_PAS = 'Je ne sais pas';

/** Anciennes valeurs « vides » (placeholders) : elles ne comptent pas comme une réponse */
const VIDES = new Set(['', 'non précisé', 'non precise', 'non rattaché', 'non rattache', 'à définir']);

const vide = (v?: string | null) => VIDES.has((v || '').trim().toLowerCase());

/** La filiation (clan paternel, clan maternel, village d'origine) est obligatoire. « Je ne sais pas » est une réponse valide. */
export function filiationIncomplete(u?: { paternalClan?: string; maternalClan?: string; villageOfOrigin?: string } | null): boolean {
  return !u || vide(u.paternalClan) || vide(u.maternalClan) || vide(u.villageOfOrigin);
}
