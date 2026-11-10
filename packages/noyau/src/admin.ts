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

export interface StatsModeration {
  total: number;
  counts: Partial<Record<ContributionStatus, number>>;
  enAttente: number;
  validationsCount: number;
  aujourdhui: number; septJours: number; trenteJours: number;
  derniere: string | null;
}

/** Statistiques des modérations du validateur connecté. */
export const chargerStatsModeration = () => api<StatsModeration>('GET', '/v1/me/moderation-stats');

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

export const TRANCHES_AGE: [string, string][] = [
  ['moins18', 'Moins de 18 ans'], ['18-25', '18–25 ans'], ['26-35', '26–35 ans'], ['36-50', '36–50 ans'],
  ['51-65', '51–65 ans'], ['66plus', '66 ans et plus'], ['inconnu', 'Âge inconnu'],
];

export interface FiltreUtilisateurs { page?: number; limit?: number; q?: string; ethnie?: string; age?: string; role?: string; status?: string }
export interface PageUtilisateurs { items: UserProfile[]; total: number; page: number; pages: number; limit: number }

/** Liste paginée et filtrée côté serveur (ethnie, tranche d'âge, rôle, compte, recherche). */
export function chargerUtilisateursPage(f: FiltreUtilisateurs) {
  const p = new URLSearchParams({ page: String(f.page || 1), limit: String(f.limit || 30) });
  for (const k of ['q', 'ethnie', 'age', 'role', 'status'] as const) if (f[k]) p.set(k, f[k]!);
  return api<PageUtilisateurs>('GET', `/v1/users?${p}`);
}

export interface SegmentsCommunaute {
  total: number; parEthnie: Record<string, number>; parAge: Record<string, number>; croise: Record<string, Record<string, number>>;
}
export const chargerSegments = () => api<SegmentsCommunaute>('GET', '/v1/users/segments');

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

export interface GroupeStats { contributions: number; approuvees: number; enregistrements: number; heures: number; heuresApprouvees: number; contributeurs: number }
export interface StatsContributions extends GroupeStats {
  parStatut: Record<string, number>;
  periode: { aujourdhui: number; septJours: number; trenteJours: number };
  questions: { total: number; avecContribution: number; avecContributionApprouvee: number };
  parEthnie: Record<string, GroupeStats>;
  parTheme: Record<string, GroupeStats>;
  parJour: { jour: string; n: number }[];
  topContributeurs: { nom: string; contributions: number; heures: number }[];
}
/** Statistiques des contributions (administrateurs) : volumes, heures enregistrées, questions couvertes. */
export const chargerStatsContributions = () => api<StatsContributions>('GET', '/v1/admin/contribution-stats');

/** 1,5 h → « 1 h 30 » ; moins d'une heure → « 25 min ». */
export function formaterHeures(h: number): string {
  const min = Math.round(h * 60);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}
