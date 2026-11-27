/**
 * Journal en mémoire des échanges avec le modèle, pour la console (Diagnostic Qwen) : chaque appel HTTP au relais
 * (durée, attente dans la file RunPod, calcul, reprise) et chaque travail différé (étapes, code final).
 * Rien n'est écrit en base ; un redémarrage de l'API le vide. Aucun texte de question ni de réponse n'y est gardé.
 */
export interface MesureAppel {
  at: number; ms: number; status: number | null; tour: number;
  /** Numéro du travail RunPod et temps passés dans la file / en calcul, quand le relais les donne (en-têtes X-Runpod-*). */
  job?: string; attenteRunpodMs?: number; calculMs?: number;
  entree?: number; sortie?: number; reveil?: boolean; reprise?: number; erreur?: string;
}
export interface BilanTravail { id: string; uid: string; route: string; debut: number; ms: number; code: number; etapes: { nom: string; a: number }[]; erreur?: string }

const MAX = 200;
const appels: MesureAppel[] = [];
const bilans: BilanTravail[] = [];
const ajouter = <T>(l: T[], x: T) => { l.unshift(x); if (l.length > MAX) l.length = MAX; };

export const noterAppel = (m: MesureAppel) => ajouter(appels, m);
export const noterBilan = (b: BilanTravail) => ajouter(bilans, b);
export const journalIa = () => ({ appels: [...appels], travaux: [...bilans] });
