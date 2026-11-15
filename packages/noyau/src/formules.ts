/**
 * Ce qui est gratuit et ce qui demande un forfait (décision de Capp, 15 nov. 2026) :
 * - les cours d'Onenji (Inenga : leçons, contrôles, test de niveau) sont gratuits ;
 * - la bibliothèque est gratuite ;
 * - Igolani (la vidéothèque) garde son réglage vidéo par vidéo (`accesChapitreVideo`) ;
 * - l'IA (Kak'Igonjo et tout ce qui appelle le modèle) demande un forfait ; sans forfait, quelques questions gratuites
 *   chaque semaine pour la découvrir.
 * Le serveur reste seul juge ; l'application s'en sert pour l'affichage.
 */

/** Questions gratuites à l'IA par semaine sans forfait (réglable par les administrateurs : `ia_quotas.questionsGratuitesSemaine`). */
export const QUESTIONS_IA_GRATUITES_SEMAINE = 5;

/**
 * Règle d'un contenu gratuit : seul le rang (progression) peut encore le retenir ; le niveau d'accès payant et les formules
 * (« plans ») ne s'appliquent plus aux cours ni à la bibliothèque.
 */
export const regleSansFormule = (x: { rang_min?: unknown } | null | undefined): { rang_min?: number } => {
  const r = Number(x?.rang_min);
  return Number.isFinite(r) && r > 0 ? { rang_min: r } : {};
};

export interface EtatIa {
  /** Abonnement en cours. */
  abonne: boolean;
  /** Personnel (administrateur, modérateur, validateur) : jamais limité par le forfait. */
  personnel?: boolean;
  /** Questions déjà posées depuis le début de la semaine (lundi 0 h). */
  questionsSemaine: number;
  /** Questions gratuites par semaine ; à défaut, QUESTIONS_IA_GRATUITES_SEMAINE. */
  gratuitesSemaine?: number;
}

export type DroitIa =
  | { ok: true; forfait: true; restantes: null }
  | { ok: true; forfait: false; restantes: number }
  | { ok: false; forfait: false; restantes: 0; gratuitesSemaine: number };

/** Peut-on poser une question à l'IA maintenant ? `restantes` compte les questions gratuites qui resteront APRÈS celle-ci. */
export function droitIa(e: EtatIa): DroitIa {
  if (e.abonne || e.personnel) return { ok: true, forfait: true, restantes: null };
  const g = Number.isFinite(e.gratuitesSemaine) && (e.gratuitesSemaine as number) >= 0 ? Math.floor(e.gratuitesSemaine as number) : QUESTIONS_IA_GRATUITES_SEMAINE;
  const deja = Math.max(0, Math.floor(e.questionsSemaine) || 0);
  if (deja >= g) return { ok: false, forfait: false, restantes: 0, gratuitesSemaine: g };
  return { ok: true, forfait: false, restantes: g - deja - 1 };
}

/** Message affiché quand les questions gratuites de la semaine sont épuisées. */
export const messageForfaitIa = (gratuites: number) =>
  `Tu as posé tes ${gratuites} question${gratuites > 1 ? 's' : ''} gratuite${gratuites > 1 ? 's' : ''} de la semaine. Kak'Igonjo est inclus dans le forfait ; tes questions gratuites reviennent lundi.`;
