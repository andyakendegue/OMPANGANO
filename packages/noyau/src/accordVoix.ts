/**
 * Usage de la voix et accord parental (décision de Capp, 22 nov. 2026) : la voix d'un mineur n'est enregistrée, envoyée à un
 * correcteur, réécoutée par d'autres ni utilisée pour entraîner des modèles (reconnaissance des sons, voix) qu'avec l'accord
 * de son parent ou représentant légal, nommé. Règle unique, appliquée par l'app (avant l'envoi) et par le serveur (à la réception
 * et à chaque réutilisation). Date de naissance inconnue = mineur (prudence).
 */
export const VERSION_ACCORD_PARENTAL = 'accord-parental-voix-v1-2026-11-22';

/** Texte de l'accord, montré au parent et gardé tel quel dans le profil (version ci-dessus). */
export const TEXTE_ACCORD_PARENTAL =
  "Je suis le parent ou le représentant légal de ce contributeur mineur. J'autorise Essaka Engineering à enregistrer sa voix dans Nkala, " +
  "à la faire écouter par un correcteur, à l'utiliser dans l'application et à s'en servir pour entraîner ses modèles d'intelligence artificielle " +
  "(reconnaissance des sons et voix de la langue myènè). Je peux retirer cet accord à tout moment depuis le profil : ses enregistrements " +
  'ne seront alors plus utilisés.';

export interface ProfilVoix {
  termsAccepted?: boolean;
  dataUsageAccepted?: boolean;
  consentVoiceUsage?: boolean;
  birthDate?: string;
  legalGuardianName?: string;
  parentalVoiceConsent?: boolean;
}

/** Âge en années révolues (null si la date est absente ou invalide). */
export function ageEnAnnees(dateNaissance?: string | null, maintenant = Date.now()): number | null {
  if (!dateNaissance || !/^\d{4}-\d{2}-\d{2}/.test(dateNaissance)) return null;
  const d = new Date(dateNaissance.slice(0, 10) + 'T00:00:00Z'), n = new Date(maintenant);
  if (Number.isNaN(d.getTime())) return null;
  let age = n.getUTCFullYear() - d.getUTCFullYear();
  if (n.getUTCMonth() < d.getUTCMonth() || (n.getUTCMonth() === d.getUTCMonth() && n.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

/** Mineur, ou âge inconnu (traité comme mineur). */
export const estMineur = (dateNaissance?: string | null, maintenant = Date.now()) => { const a = ageEnAnnees(dateNaissance, maintenant); return a === null || a < 18; };

/** La voix de ce contributeur peut-elle être enregistrée et utilisée ? */
export function voixAutorisee(p: ProfilVoix | null | undefined, maintenant = Date.now()): boolean {
  if (!p || !p.termsAccepted || !p.dataUsageAccepted || p.consentVoiceUsage === false) return false;
  if (!estMineur(p.birthDate, maintenant)) return true;
  return p.parentalVoiceConsent === true && !!(p.legalGuardianName ?? '').trim();
}

/** Condition SQL équivalente (profil dans `alias.data`) : pour les requêtes du serveur qui réutilisent des voix. */
export const SQL_VOIX_AUTORISEE = (alias: string) => `(COALESCE(${alias}.data->>'consentVoiceUsage', 'true') <> 'false'
  AND (COALESCE(${alias}.data->>'parentalVoiceConsent', 'false') = 'true' AND COALESCE(${alias}.data->>'legalGuardianName', '') <> ''
       OR (${alias}.data->>'birthDate' ~ '^\\d{4}-\\d{2}-\\d{2}' AND left(${alias}.data->>'birthDate', 10)::date <= (current_date - interval '18 years'))))`;
