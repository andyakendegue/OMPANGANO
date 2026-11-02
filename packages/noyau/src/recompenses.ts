import { lireCollection, enregistrerElement, nouvelId, supprimerElement } from './contenu';
import type { Badge, UserProfile, WeeklyChallenge } from './types';

export const chargerBadges = () => lireCollection<Badge & { id: string }>('badges' as any) as Promise<Badge[]>;
export const chargerDefis = () => lireCollection<WeeklyChallenge & { id: string }>('challenges' as any) as Promise<WeeklyChallenge[]>;

export const CATEGORIES_BADGE: [string, string][] = [
  ['defi', 'Défis'], ['orthographe', 'Textes'], ['audio', 'Voix'], ['expert', 'Expertise'], ['fidelite', 'Fidélité'], ['genealogie', 'Filiation'],
];

export const TYPES_DEFI: [WeeklyChallenge['challengeType'], string][] = [
  ['contributions', 'Contributions'], ['recordings', 'Voix'], ['validations', 'Validations'], ['all', 'Toutes actions'],
];

export const enregistrerBadge = (b: Badge) => enregistrerElement('badges' as any, b.id, { ...b, updatedAt: new Date().toISOString() });
export const supprimerBadge = (id: string) => supprimerElement('badges' as any, id);
export const enregistrerDefi = (d: WeeklyChallenge) => enregistrerElement('challenges' as any, d.id, d);
export const supprimerDefi = (id: string) => supprimerElement('challenges' as any, id);

export function nouveauBadge(f: Omit<Badge, 'id' | 'createdAt' | 'isCustom'>): Badge {
  return { ...f, id: nouvelId('badge'), isCustom: true, createdAt: new Date().toISOString() };
}

const jour = (d: Date) => d.toISOString().slice(0, 10);

export function nouveauDefi(f: Omit<WeeklyChallenge, 'id' | 'startDate' | 'endDate' | 'isActive'> & { debut?: string; fin?: string }): WeeklyChallenge {
  const maintenant = new Date();
  const { debut, fin, ...reste } = f;
  return {
    ...reste,
    id: nouvelId('defi'),
    startDate: debut || jour(maintenant),
    endDate: fin || jour(new Date(maintenant.getTime() + 7 * 86_400_000)),
    isActive: true,
  };
}

/** AAAA-MM-JJ valide ? */
export const dateValide = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Défis actifs et dans leur période (la fin est incluse). */
export function defisEnCours(defis: WeeklyChallenge[], maintenant = new Date()): WeeklyChallenge[] {
  const j = jour(maintenant);
  return defis.filter(d => d.isActive && (!d.startDate || d.startDate.slice(0, 10) <= j) && (!d.endDate || d.endDate.slice(0, 10) >= j));
}

export function progressionDefi(profil: Pick<UserProfile, 'weeklyProgress' | 'completedChallenges'> | null | undefined, d: WeeklyChallenge) {
  const fait = Math.min(profil?.weeklyProgress?.[d.id] || 0, d.targetCount);
  return { fait, cible: d.targetCount, termine: !!profil?.completedChallenges?.includes(d.id) || fait >= d.targetCount };
}

/** Condition chiffrée d'un badge, en clair. */
export function conditionBadge(b: Badge): string {
  const c: string[] = [];
  if (b.requiredXp) c.push(`${b.requiredXp} XP`);
  if (b.requiredContributions) c.push(`${b.requiredContributions} contributions`);
  if (b.requiredRecordings) c.push(`${b.requiredRecordings} voix`);
  if (b.requiredValidations) c.push(`${b.requiredValidations} validations`);
  return c.length ? c.join(' · ') : 'Attribué selon une règle spéciale';
}
