/**
 * Rangs de Nkala : les classes d'âge ôrungu du programme de formation (décision de Capp, 10 nov. 2026).
 * Un seul profil et un seul XP pour tous les modules. Les paliers peuvent être remplacés par la collection « rangs ».
 */
export interface Rang { id: string; nom: string; minXp: number; description: string }

export const RANGS: Rang[] = [
  { id: 'ekei-kei', nom: 'Ekèï-kèï', minXp: 0, description: 'Le tout-petit : premiers pas dans la langue.' },
  { id: 'omwana', nom: 'Omwana', minXp: 200, description: 'L\'enfant, dès un an.' },
  { id: 'iwanjo', nom: 'Iwanjo', minXp: 500, description: 'Le garçon (Isesa pour la fille).' },
  { id: 'olengwani', nom: 'Olèngwani', minXp: 1500, description: 'Le jeune qui apprend les usages.' },
  { id: 'okengele', nom: 'Okengele', minXp: 4000, description: 'Classe d\'âge ôrungu.' },
  { id: 'onerwama', nom: 'Onerwama', minXp: 8000, description: 'La tradition, avant Onèró.' },
  { id: 'onero', nom: 'Onèró', minXp: 15000, description: 'L\'aîné, le responsable.' },
  { id: 'mbolo', nom: 'Mbolo', minXp: 30000, description: 'Le sommet de l\'échelle.' },
];

export interface EtatRang { index: number; rang: Rang; suivant: Rang | null; xpDansRang: number; xpPourSuivant: number; progression: number }

export function rangPourXp(xp: number, rangs: Rang[] = RANGS): EtatRang {
  const x = Math.max(0, Math.floor(xp || 0));
  let index = 0;
  rangs.forEach((r, i) => { if (x >= r.minXp) index = i; });
  const rang = rangs[index], suivant = rangs[index + 1] ?? null;
  const xpDansRang = x - rang.minXp;
  const xpPourSuivant = suivant ? suivant.minXp - rang.minXp : 0;
  return { index, rang, suivant, xpDansRang, xpPourSuivant, progression: suivant ? Math.min(1, xpDansRang / xpPourSuivant) : 1 };
}

/** Rang atteint entre deux totaux d'XP, ou null si on reste dans le même (écran « Nouveau rang »). */
export const nouveauRang = (avant: number, apres: number, rangs: Rang[] = RANGS): Rang | null => {
  const a = rangPourXp(avant, rangs), b = rangPourXp(apres, rangs);
  return b.index > a.index ? b.rang : null;
};
