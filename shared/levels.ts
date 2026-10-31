/** Niveaux des contributeurs. Partagé entre l'application et l'API. */
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
