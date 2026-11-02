import { api } from './api';
import type { AccountStatus, Contribution, ContributionStatus, UserProfile, UserRole } from './types';

// ------------------------------------------------------------------ modération

export interface FileModeration {
  records: Contribution[];
  /** Nombre de contributions par statut (toutes pages confondues). */
  counts: Partial<Record<ContributionStatus, number>>;
}

export const chargerFileModeration = (status: ContributionStatus | 'all' = 'pending', limite = 30, decalage = 0) =>
  api<FileModeration>('GET', `/v1/admin/contributions?status=${status}&limit=${limite}&offset=${decalage}`);

export type VerdictOrthographe = 'correct' | 'incorrect';
export type VerdictPrononciation = 'correct' | 'incorrect' | 'no_audio';

/** Statut final selon les deux verdicts (mêmes règles que ValidatorWorkspace sur le web). */
export function statutDepuisVerdicts(o: VerdictOrthographe, p: VerdictPrononciation): ContributionStatus {
  if (o === 'correct' && (p === 'correct' || p === 'no_audio')) return 'approved';
  if (o === 'incorrect' && p === 'correct') return 'audio_approved_text_revision';
  if (o === 'correct' && p === 'incorrect') return 'text_approved_audio_revision';
  return 'rejected';
}

export const evaluerContribution = (id: string, o: VerdictOrthographe, p: VerdictPrononciation, notes = '') =>
  api('POST', `/v1/contributions/${encodeURIComponent(id)}/validate`, {
    status: statutDepuisVerdicts(o, p),
    spellingVerdict: o,
    pronunciationVerdict: p,
    validatorNotes: notes,
  });

// ------------------------------------------------------------------ utilisateurs

export const chargerUtilisateurs = () => api<UserProfile[]>('GET', '/v1/users');

export const modifierUtilisateur = (id: string, patch: { role?: UserRole; status?: AccountStatus }) =>
  api<UserProfile>('PATCH', `/v1/users/${encodeURIComponent(id)}`, patch);

export const LIBELLE_ROLE: Record<UserRole, string> = { user: 'Contributeur', validator: 'Validateur', admin: 'Administrateur' };
export const LIBELLE_COMPTE: Record<AccountStatus, string> = { active: 'Actif', flagged: 'Signalé', suspended: 'Suspendu' };

// ------------------------------------------------------------------ médias

const cacheMedia = new Map<string, { url: string; jusqu: number }>();

/** « media:recordings/uid/x.m4a » -> URL de lecture présignée (mise en cache). */
export async function resoudreMedia(valeur: string): Promise<string> {
  if (!valeur) return valeur;
  const chemin = valeur.startsWith('media:') ? valeur.slice(6) : /^(recordings|images)\//.test(valeur) ? valeur : '';
  if (!chemin) return valeur;
  const hit = cacheMedia.get(chemin);
  if (hit && hit.jusqu > Date.now()) return hit.url;
  const { url, expiresIn } = await api<{ url: string; expiresIn: number }>('GET', `/v1/media/url?path=${encodeURIComponent(chemin)}`);
  cacheMedia.set(chemin, { url, jusqu: Date.now() + Math.max(60, expiresIn - 300) * 1000 });
  return url;
}
