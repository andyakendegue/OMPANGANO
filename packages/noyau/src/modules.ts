// Interrupteurs de fonctionnalités : chaque module de Nkala se publie séparément.
// Les valeurs ci-dessous sont les valeurs de départ ; le serveur (GET /v1/modules) les remplace
// sans republier l'application (voir chargerModules).
import { api, obtenirJeton } from './api';

export type ModuleId = 'ompangano' | 'onenji' | 'azeva' | 'ontci' | 'nkala' | 'traducteur';

export const MODULES: Record<ModuleId, { label: string; actif: boolean }> = {
  ompangano: { label: 'Ompangano (collecte)', actif: true },
  onenji: { label: 'Onenji (apprendre)', actif: true },
  azeva: { label: 'Azeva (salle de jeux)', actif: true },
  ontci: { label: 'Ontci (écoute)', actif: true }, // onglet « bientôt » visible, comme avant
  nkala: { label: 'Nkala (village : annuaire, annonces, services)', actif: true },
  traducteur: { label: 'Traducteur', actif: false },
};

/** Fonctions à l'intérieur d'un module, coupables séparément (réponse du serveur : { modules, fonctions }). */
export const FONCTIONS_DEFAUT = {
  publicite: false,        // régie publicitaire (EmplacementPub)
  achats: false,           // achats intégrés et abonnements (Verrou)
  assistantIA: false,      // assistant IA d'Onenji (passerelle à jetons)
  salleParis: false,       // salle des paris d'Azeva : reste false tant que le dossier juridique n'est pas réuni
} as const;
export type FonctionId = keyof typeof FONCTIONS_DEFAUT;
const fonctions: Record<FonctionId, boolean> = { ...FONCTIONS_DEFAUT };

export const moduleActif = (id: ModuleId): boolean => MODULES[id].actif;
export const fonctionActive = (id: FonctionId): boolean => fonctions[id];

export interface ReponseModules {
  modules?: Partial<Record<ModuleId, boolean>>;
  fonctions?: Partial<Record<FonctionId, boolean>>;
  /** Modules ouverts seulement parce que la personne connectée est administratrice (mode essai). */
  essai?: ModuleId[];
}
let essai = new Set<ModuleId>();
/** Vrai si le module n'est visible que pour les administrateurs (essai avant ouverture au public). */
export const moduleEnEssai = (id: ModuleId): boolean => essai.has(id);

// Abonnés prévenus à chaque changement d'interrupteur (barre d'onglets, assistant…), sans attendre un redémarrage.
const abonnes = new Set<() => void>();
let versionModules = 0;
/** S'abonne aux changements d'interrupteurs ; renvoie la fonction de désabonnement. */
export function ecouterModules(f: () => void): () => void { abonnes.add(f); return () => { abonnes.delete(f); }; }
/** Numéro qui change à chaque application d'une réponse du serveur (pour useSyncExternalStore). */
export const versionDesModules = (): number => versionModules;

/** Applique une réponse du serveur ; les clés inconnues sont ignorées (un ancien client reste valide). */
export function appliquerModules(r: ReponseModules | null | undefined): void {
  if (!r) return;
  const avant = JSON.stringify([MODULES, fonctions, [...essai]]);
  essai = new Set((r.essai ?? []).filter(id => id in MODULES));
  for (const id of Object.keys(MODULES) as ModuleId[]) {
    const v = r.modules?.[id];
    if (typeof v === 'boolean') MODULES[id].actif = v;
  }
  for (const id of Object.keys(fonctions) as FonctionId[]) {
    const v = r.fonctions?.[id];
    if (typeof v === 'boolean') fonctions[id] = v;
  }
  // La salle des paris ne s'ouvre jamais sans que le module Azeva le soit.
  if (!MODULES.azeva.actif) fonctions.salleParis = false;
  if (JSON.stringify([MODULES, fonctions, [...essai]]) !== avant) { versionModules++; abonnes.forEach(f => f()); }
}

/** Interroge le serveur ; en cas d'échec (hors-ligne), les valeurs de départ ou les dernières reçues restent. */
/** Connecté : /v1/modules, qui ajoute les modules en essai pour les administrateurs ; sinon (ou en cas de refus) /pub/modules. */
export async function chargerModules(): Promise<boolean> {
  try {
    const jeton = await obtenirJeton().catch(() => null);
    if (jeton) {
      try { appliquerModules(await api<ReponseModules>('GET', '/v1/modules')); return true; }
      catch { /* compte suspendu, ancien serveur… : repli sur la route publique */ }
    }
    appliquerModules({ essai: [], ...(await api<ReponseModules>('GET', '/pub/modules')) });
    return true;
  } catch { return false; }
}
