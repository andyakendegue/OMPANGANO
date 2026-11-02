import { api } from './api';
import type { Contribution, ContributionStatus } from './types';

export const chargerMesContributions = () => api<Contribution[]>('GET', '/v1/me/contributions');

/** Seules les contributions en attente peuvent être retirées par leur auteur (règle du serveur). */
export const supprimerContribution = (id: string) => api('DELETE', `/v1/contributions/${encodeURIComponent(id)}`);

export const LIBELLE_STATUT: Record<ContributionStatus, string> = {
  pending: 'En attente',
  approved: 'Validée',
  rejected: 'Refusée',
  needs_revision: 'À réviser',
  audio_approved_text_revision: 'Voix validée, texte à revoir',
  text_approved_audio_revision: 'Texte validé, voix à refaire',
};

export interface JourContributions { jour: string; total: number; voix: number }

/** Contributions par jour sur les `jours` derniers jours (le jour courant en dernier). */
export function serieQuotidienne(contributions: Pick<Contribution, 'createdAt' | 'audioUrl'>[], jours: number, maintenant = new Date()): JourContributions[] {
  const m = new Map<string, JourContributions>();
  for (let i = jours - 1; i >= 0; i--) {
    const d = new Date(maintenant.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    m.set(d, { jour: d, total: 0, voix: 0 });
  }
  for (const c of contributions) {
    const j = m.get((c.createdAt || '').slice(0, 10));
    if (!j) continue;
    j.total++;
    if (c.audioUrl) j.voix++;
  }
  return [...m.values()];
}
