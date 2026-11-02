import type { UserProfile } from './types';

export type NiveauRisque = 'faible' | 'modere' | 'critique';

/** Copie de calculateSuspicionScore (src/services/seedData.ts) : mêmes règles et mêmes seuils que le web. */
export function analyserSuspicion(user: Partial<UserProfile>, maintenant = Date.now()): { score: number; raisons: string[]; risque: NiveauRisque } {
  let score = 0;
  const raisons: string[] = [];
  const contribs = user.contributionsCount || 0;
  const voix = user.recordingsCount || 0;
  const jours = user.createdAt ? Math.floor((maintenant - new Date(user.createdAt).getTime()) / 86_400_000) : 0;

  if (jours >= 2 && contribs === 0 && voix === 0) { score += 45; raisons.push('Inscrit depuis plus de 48h sans aucune contribution linguistique'); }
  if (!user.paternalClan || !user.maternalClan || user.paternalClan === user.maternalClan) { score += 25; raisons.push('Anomalie généalogique (clans identiques ou absents)'); }
  if (!user.villageOfOrigin || user.villageOfOrigin.length < 3) { score += 20; raisons.push('Village d’origine non spécifié ou invalide'); }
  if (jours >= 5 && contribs < 2) { score += 20; raisons.push('Stagnation prolongée après démarrage'); }

  const n = Math.min(100, score);
  return { score: n, raisons, risque: n >= 60 ? 'critique' : n >= 30 ? 'modere' : 'faible' };
}

export interface ProfilSuspect extends UserProfile { scoreCalcule: number; raisons: string[]; risque: NiveauRisque }

/** Profils avec leur indice : le plus élevé entre l'indice enregistré et l'indice calculé. Triés du plus risqué au moins risqué. */
export function profilsSuspects(users: UserProfile[], maintenant = Date.now()): ProfilSuspect[] {
  return users
    .map(u => { const a = analyserSuspicion(u, maintenant); return { ...u, scoreCalcule: Math.max(u.suspicionScore || 0, a.score), raisons: a.raisons, risque: a.risque }; })
    .sort((a, b) => b.scoreCalcule - a.scoreCalcule);
}
