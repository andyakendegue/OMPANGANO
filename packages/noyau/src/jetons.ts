/**
 * Comptage des jetons de l'IA (NKALA_AUDIT_COMPLET.md §10bis.3). Types et calculs partagés ; le comptage réel
 * (jetons rapportés par le fournisseur du modèle) et le journal sont faits côté serveur, dans la passerelle IA.
 * Rien ici n'appelle un modèle.
 */
export interface UsageJetons {
  entree: number;
  sortie: number;
  /** Jetons d'entrée servis depuis le cache du préfixe. */
  cache?: number;
}

export const totalJetons = (u: UsageJetons): number => u.entree + u.sortie;

export interface QuotaJetons {
  parJour: number;
  parMois: number;
  parConversation: number;
}

export interface ConsommationJetons { jour: number; mois: number; conversation: number }

export type VerdictQuota =
  | { ok: true; restantJour: number; restantMois: number; alerte: boolean }
  | { ok: false; limite: 'jour' | 'mois' | 'conversation'; restant: 0 };

/** Seuil à partir duquel on prévient l'utilisateur que son quota approche. */
export const SEUIL_ALERTE_QUOTA = 0.8;

/**
 * Vérifie, AVANT l'appel, qu'une requête estimée à `estimation` jetons tient dans les quotas.
 * Le quota le plus strict l'emporte.
 */
export function verifierQuota(q: QuotaJetons, conso: ConsommationJetons, estimation: number): VerdictQuota {
  if (conso.conversation + estimation > q.parConversation) return { ok: false, limite: 'conversation', restant: 0 };
  if (conso.jour + estimation > q.parJour) return { ok: false, limite: 'jour', restant: 0 };
  if (conso.mois + estimation > q.parMois) return { ok: false, limite: 'mois', restant: 0 };
  const restantJour = q.parJour - conso.jour - estimation;
  const restantMois = q.parMois - conso.mois - estimation;
  const alerte = conso.jour + estimation >= q.parJour * SEUIL_ALERTE_QUOTA || conso.mois + estimation >= q.parMois * SEUIL_ALERTE_QUOTA;
  return { ok: true, restantJour, restantMois, alerte };
}

/**
 * Estimation grossière (sans modèle) pour décider de résumer ou de refuser un contexte trop long avant l'envoi.
 * Ce n'est PAS le comptage facturable : celui-ci vient du fournisseur. Marge volontairement prudente (≈ 3 caractères par jeton).
 */
export const estimerJetons = (texte: string): number => Math.ceil(texte.length / 3);
