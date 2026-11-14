/**
 * Registre des emplacements publicitaires (NKALA_AUDIT_COMPLET.md §10bis.1, REVIVE_ADSERVER.md §3 et §9).
 * Chaque écran déclare ses zones dès sa conception ; rien n'est affiché tant que la régie n'est pas branchée.
 */
export type ZonePub =
  | 'bandeau_accueil' | 'partenaires_culture'
  | 'bandeau_resultats' | 'recompense_coeur' | 'interstitiel_jeux' | 'bandeau_jeux'
  | 'audio_entre_titres' | 'video_entre_clips' | 'bandeau_lecteur' | 'bandeau_catalogue'
  | 'annonce_en_tete' | 'annonce_dans_liste' | 'carte_partenaire'
  | 'bandeau_apprendre' | 'video_igolani' | 'enfants_contextuel';

export type FormatPub = 'bandeau' | 'plein_ecran' | 'audio' | 'video';
export type ProfilAge = 'enfant' | 'ado' | 'adulte';

export const ZONES: Record<ZonePub, { module: 'commun' | 'azeva' | 'ontci' | 'nkala' | 'onenji'; format: FormatPub; hauteur?: number; profils: readonly ProfilAge[] }> = {
  bandeau_accueil: { module: 'commun', format: 'bandeau', hauteur: 50, profils: ['ado', 'adulte'] },
  partenaires_culture: { module: 'commun', format: 'bandeau', hauteur: 50, profils: ['enfant', 'ado', 'adulte'] },
  bandeau_resultats: { module: 'azeva', format: 'bandeau', hauteur: 50, profils: ['ado', 'adulte'] },
  recompense_coeur: { module: 'azeva', format: 'plein_ecran', profils: ['ado', 'adulte'] },
  // Jeux gratuits (décision du 13 nov. 2026) : financés par la publicité sponsorisée entre les écrans et les bannières.
  interstitiel_jeux: { module: 'azeva', format: 'plein_ecran', profils: ['ado', 'adulte'] },
  bandeau_jeux: { module: 'azeva', format: 'bandeau', hauteur: 50, profils: ['ado', 'adulte'] },
  audio_entre_titres: { module: 'ontci', format: 'audio', profils: ['ado', 'adulte'] },
  video_entre_clips: { module: 'ontci', format: 'video', profils: ['ado', 'adulte'] },
  bandeau_lecteur: { module: 'ontci', format: 'bandeau', hauteur: 50, profils: ['ado', 'adulte'] },
  bandeau_catalogue: { module: 'ontci', format: 'bandeau', hauteur: 50, profils: ['ado', 'adulte'] },
  annonce_en_tete: { module: 'nkala', format: 'bandeau', hauteur: 90, profils: ['ado', 'adulte'] },
  annonce_dans_liste: { module: 'nkala', format: 'bandeau', hauteur: 90, profils: ['ado', 'adulte'] },
  carte_partenaire: { module: 'nkala', format: 'bandeau', hauteur: 50, profils: ['ado', 'adulte'] },
  bandeau_apprendre: { module: 'onenji', format: 'bandeau', hauteur: 50, profils: ['ado', 'adulte'] },
  // Vidéothèque Igolani (13 nov. 2026) : annonce avant la partie gratuite d'une vidéo (premier chapitre gratuit avec publicité).
  video_igolani: { module: 'onenji', format: 'plein_ecran', profils: ['ado', 'adulte'] },
  // Décision ouverte (REVIVE_ADSERVER.md §3) : aucun profil tant que Capp n'a pas tranché.
  enfants_contextuel: { module: 'commun', format: 'bandeau', hauteur: 50, profils: [] },
};

export interface ContextePub {
  /** Fonction « publicite » ouverte par le serveur. */
  active: boolean;
  abonne: boolean;
  profil: ProfilAge;
  enLigne: boolean;
  /** Exercice, question, devoir, leçon ou enregistrement de voix en cours : jamais de publicité. */
  activiteEnCours: boolean;
  /** Parties de l'application sans publicité selon les formules de l'utilisateur : « tout » ou des modules (commun, onenji, azeva, ontci, nkala). */
  sansPub?: readonly string[];
}

/** Vrai si la zone peut s'afficher dans ce contexte. Toutes les raisons de s'abstenir sont ici, pas dans les écrans. */
export function zoneAffichable(zone: ZonePub, c: ContextePub): boolean {
  if (!c.active || c.abonne || !c.enLigne || c.activiteEnCours) return false;
  if (c.sansPub && (c.sansPub.includes('tout') || c.sansPub.includes(ZONES[zone].module))) return false;
  return ZONES[zone].profils.includes(c.profil);
}

/** Profil d'âge d'après la date de naissance (AAAA-MM-JJ). Date absente ou illisible : « enfant », donc aucune publicité (prudence). */
export function profilAgeDepuis(naissance: string | undefined, maintenant = Date.now()): ProfilAge {
  const t = naissance ? Date.parse(naissance) : NaN;
  if (Number.isNaN(t)) return 'enfant';
  const ans = (maintenant - t) / (365.2425 * 86_400_000);
  return ans < 13 ? 'enfant' : ans < 18 ? 'ado' : 'adulte';
}

/**
 * Parties sans publicité d'après les formules actives (colonne « sans_pub » de la collection « plans ») : « tout » ou une liste de modules.
 * Une ancienne valeur « oui » vaut « tout ». Décision de Capp (13 nov. 2026) : la publicité se coupe sur tout ou partie de l'application selon le forfait.
 */
export function modulesSansPub(plansActifs: readonly string[], lignesPlans: readonly { id: string; sans_pub?: unknown }[]): string[] {
  const res = new Set<string>();
  for (const l of lignesPlans) {
    if (!plansActifs.includes(l.id)) continue;
    const v = l.sans_pub;
    const liste = Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split('|') : v === true ? ['tout'] : [];
    for (const x of liste.map(y => y.trim().toLowerCase()).filter(Boolean)) res.add(x === 'oui' || x === 'true' ? 'tout' : x);
  }
  return [...res];
}
