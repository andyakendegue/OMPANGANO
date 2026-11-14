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

// ------------------------------------------------------------------ contexte d'un chat, excès et coûts
/**
 * Contexte d'un chat = tout ce qui est renvoyé au modèle à chaque message : consigne, documents du RAG, échanges précédents et
 * nouvelle question. Il grossit à chaque tour ; c'est lui, et non le nombre de messages, qui fait le coût.
 */
export interface ReglesContexte {
  /** Jetons de contexte compris dans l'offre, par chat. Au-delà, le chat est « en excès ». */
  inclus: number;
  /** Plafond absolu (fenêtre du modèle moins la réponse) : au-delà, le chat est plein et il faut en ouvrir un autre. */
  max: number;
  /** Que faire en excès : refuser, laisser continuer en comptant des frais, ou seulement mesurer. */
  politique: 'bloquer' | 'facturer' | 'suivre';
}
export const REGLES_CONTEXTE_DEFAUT: ReglesContexte = { inclus: 6000, max: 24000, politique: 'facturer' };

export interface TarifIa {
  devise: string;
  /** Ce que le modèle nous coûte, par million de jetons. */
  entreeParMillion: number; sortieParMillion: number; cacheParMillion: number;
  /** Frais supplémentaires comptés à l'utilisateur, par millier de jetons de contexte au-delà de l'inclus, à chaque message. */
  excesParMillier: number;
}
/** Valeurs d'exemple : à régler dans la console d'après le prix réel du modèle. */
export const TARIF_IA_DEFAUT: TarifIa = { devise: 'FCFA', entreeParMillion: 300, sortieParMillion: 900, cacheParMillion: 30, excesParMillier: 2 };

export type NiveauContexte = 'ok' | 'alerte' | 'exces' | 'plein';
export interface EtatContexte { jetons: number; inclus: number; max: number; exces: number; taux: number; niveau: NiveauContexte }

/** Où en est un chat : `jetons` = contexte du prochain envoi (mesuré ou estimé). */
export function etatContexte(r: ReglesContexte, jetons: number): EtatContexte {
  const exces = Math.max(0, jetons - r.inclus);
  const niveau: NiveauContexte = jetons >= r.max ? 'plein' : exces > 0 ? 'exces' : jetons >= r.inclus * SEUIL_ALERTE_QUOTA ? 'alerte' : 'ok';
  return { jetons, inclus: r.inclus, max: r.max, exces, taux: r.inclus > 0 ? jetons / r.inclus : 0, niveau };
}

const arrondi = (n: number) => Math.round(n * 10000) / 10000;

/** Coût réel d'un appel au modèle (les jetons servis par le cache sont comptés à leur prix, pas à celui de l'entrée). */
export function coutAppel(t: TarifIa, u: UsageJetons): number {
  const cache = Math.min(u.cache ?? 0, u.entree);
  return arrondi(((u.entree - cache) * t.entreeParMillion + cache * t.cacheParMillion + u.sortie * t.sortieParMillion) / 1_000_000);
}

/** Frais supplémentaires d'un message envoyé avec `contexte` jetons : seule la part au-delà de l'inclus est comptée. */
export function fraisExces(t: TarifIa, r: ReglesContexte, contexte: number): { jetons: number; frais: number } {
  const jetons = Math.max(0, contexte - r.inclus);
  return { jetons, frais: r.politique === 'facturer' ? arrondi((jetons * t.excesParMillier) / 1000) : 0 };
}
