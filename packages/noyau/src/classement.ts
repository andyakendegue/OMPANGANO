import { api } from './api';
import { avecCache } from './cache';
import type { TribeName } from './types';

export interface LigneClassement {
  id: string;
  displayName: string;
  fullName?: string;
  photoURL?: string;
  tribe?: TribeName | string;
  villageOfOrigin?: string;
  xp: number;
  level: string;
  levelIndex: number;
  contributionsCount: number;
  recordingsCount: number;
  validationsCount: number;
  badgesCount: number;
}

export const chargerClassement = () => avecCache('classement', () => api<LigneClassement[]>('GET', '/v1/leaderboard'));

/** Favoris : liste d'identifiants de fiches portée par le profil (PATCH /v1/me). */
export const enregistrerFavoris = (ids: string[]) => api('PATCH', '/v1/me', { favoriteItemIds: ids });

export function basculerFavori(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
}
