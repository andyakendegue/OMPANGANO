/**
 * Cours à distance d'Onenji (décisions de Capp, 14 nov. 2026) : seuls les administrateurs et les professeurs créent des salles ;
 * un administrateur peut désigner le professeur d'un cours. Le prix d'une séance ne se choisit pas : il vient du tarif générique
 * réglé par les administrateurs (paramètre « cours_distance »), selon la durée. L'élève paie sa place par Mobile Money, sauf si
 * une de ses formules est dans « plans_inclus ».
 */
export interface TarifCoursDistance {
  /** Prix d'une heure de cours, en FCFA (0 = cours gratuits). */
  prix_heure_fcfa: number;
  /** Prix minimal d'une séance, en FCFA. */
  minimum_fcfa: number;
  /** Formules d'abonnement qui incluent les cours à distance (identifiants de « plans »). */
  plans_inclus: string[];
}
export const TARIF_COURS_DEFAUT: TarifCoursDistance = { prix_heure_fcfa: 0, minimum_fcfa: 0, plans_inclus: [] };

/** Prix d'une séance : proportionnel à la durée, arrondi aux 50 FCFA, jamais sous le minimum (0 si le tarif horaire est 0). */
export function prixSeance(t: Partial<TarifCoursDistance> | null | undefined, dureeMin: number): number {
  const h = Math.max(0, Math.floor(Number(t?.prix_heure_fcfa) || 0));
  if (!h) return 0;
  const brut = Math.round((h * Math.max(0, dureeMin)) / 60 / 50) * 50;
  return Math.max(Math.max(0, Math.floor(Number(t?.minimum_fcfa) || 0)), brut);
}

/** Nettoie un tarif envoyé par la console ; null si invalide. */
export function validerTarifCours(v: unknown): TarifCoursDistance | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const ent = (x: unknown) => (Number.isInteger(Number(x)) && Number(x) >= 0 && Number(x) <= 1_000_000 ? Number(x) : NaN);
  const h = ent(o.prix_heure_fcfa ?? 0), m = ent(o.minimum_fcfa ?? 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const plans = Array.isArray(o.plans_inclus) ? o.plans_inclus.filter((x): x is string => typeof x === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(x)).slice(0, 50) : [];
  return { prix_heure_fcfa: h, minimum_fcfa: m, plans_inclus: plans };
}

/** Identifiant de « produit » d'un paiement de séance (paiements Mobile Money) : « seance:<code> ». */
export const PRODUIT_SEANCE = 'seance:';
export const codeDeSeance = (produitId: string) => (produitId.startsWith(PRODUIT_SEANCE) ? produitId.slice(PRODUIT_SEANCE.length) : null);
