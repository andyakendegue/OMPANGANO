/**
 * Niveaux de difficulté des jeux d'Azeva et manches servies par le serveur.
 *
 * Chaque jeu a 1000 niveaux (colonne « niveaux » du jeu pour en changer). La difficulté d'un niveau est CALCULÉE : plus de
 * questions, moins de temps, moins d'erreurs permises, grilles plus grandes, contenus plus difficiles, à mesure que le numéro monte.
 * On ouvre le niveau N+1 en gagnant le niveau N.
 *
 * L'accès se règle par PALIERS (collection « jeux_niveaux ») : une ligne = « à partir du niveau X », avec sa condition
 * (rang du joueur, formule d'abonnement, achat) et, si on veut, des réglages imposés. Sans ligne, huit paliers par défaut
 * suivent les huit rangs. Fonctions pures, partagées par l'application (affichage) et par le serveur (qui seul décide et
 * seul détient le contenu).
 */
import { api } from './api';
import { avecCache } from './cache';
import type { CasePlateau, MotJeu } from './moteurs';
import type { Moteur } from './contenu/schemas';

export const NIVEAUX_PAR_JEU = 1000;
/** Sans compte : essai libre sur les premiers niveaux seulement. */
export const NIVEAUX_INVITE = 5;

/** Palier : s'applique du niveau « niveau » jusqu'au palier suivant. */
export interface NiveauJeu {
  id: string; jeu_id: string; niveau: number; titre: string; description?: string | null;
  rang_min?: number | null; plans?: string[] | null; produit_id?: string | null;
  questions?: number | null; duree_s?: number | null; erreurs_max?: number | null; taille?: number | null; options?: number | null;
  contenu_niveau?: number | null; xp_pct?: number | null;
  /** Vrai quand le palier vient des réglages par défaut (aucune ligne « jeux_niveaux » pour ce jeu). */
  defaut?: boolean;
}
export type Palier = NiveauJeu & { fin: number };

/** Réglages effectifs d'une manche. */
export interface ReglesManche { niveau: number; titre: string; questions: number; dureeS: number; erreursMax: number; taille: number; options: number; contenuNiveau: number; xpPct: number }

const TITRES = ['Éveil', 'Premiers pas', 'Découverte', 'Apprenti', 'Habile', 'Savant', 'Ancien', 'Maître'];
const DEBUTS = [1, 51, 151, 301, 451, 601, 751, 901];
export const nombreNiveaux = (jeu: Record<string, any> | null | undefined) => { const n = Number(jeu?.niveaux); return Number.isInteger(n) && n >= 1 && n <= 5000 ? n : NIVEAUX_PAR_JEU; };

/** Paliers par défaut : huit tranches ouvertes par les huit rangs. Aucune formule ni achat n'est exigé sans décision de l'administration. */
export function paliersParDefaut(jeuId: string, total = NIVEAUX_PAR_JEU): Palier[] {
  const k = total / NIVEAUX_PAR_JEU;
  const debuts = [...new Set(DEBUTS.map(d => Math.max(1, Math.round((d - 1) * k) + 1)))];
  return debuts.map((d, i) => ({ id: `${jeuId}--p${i + 1}`, jeu_id: jeuId, niveau: d, fin: (debuts[i + 1] ?? total + 1) - 1, titre: TITRES[i], rang_min: i + 1, plans: [], produit_id: null, defaut: true }));
}

/** Paliers d'un jeu : les lignes publiées de « jeux_niveaux » (triées, bornées), sinon les paliers par défaut. Le premier palier commence toujours au niveau 1. */
export function paliersDuJeu(jeuId: string, lignes: readonly Record<string, any>[] | null | undefined, total = NIVEAUX_PAR_JEU): Palier[] {
  const l = (lignes ?? []).filter(x => x.jeu_id === jeuId && Number(x.niveau) >= 1 && Number(x.niveau) <= total)
    .map(x => ({ ...x, niveau: Math.floor(Number(x.niveau)) })).sort((a, b) => a.niveau - b.niveau) as NiveauJeu[];
  if (!l.length) return paliersParDefaut(jeuId, total);
  l[0] = { ...l[0], niveau: 1 };
  return l.map((p, i) => ({ ...p, titre: String(p.titre || TITRES[Math.min(i, TITRES.length - 1)]), fin: (l[i + 1]?.niveau ?? total + 1) - 1 }));
}
export const palierDuNiveau = (paliers: Palier[], n: number): Palier => [...paliers].reverse().find(p => p.niveau <= n) ?? paliers[0];

const borne = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v)));
const impose = (v: unknown): number | null => { const n = Number(v); return v != null && v !== '' && Number.isFinite(n) && n >= 0 ? n : null; };
const BASE: Record<string, number> = { ogoni: 3, pendu: 3, anagramme: 3, mots_meles: 4, mots_croises: 3, mots_fleches: 3, memoire: 3, syllabes: 3, dictee: 3, qcm: 4, ordre: 4, plateau: 6, quiz: 4, relier: 3, classer: 5, sequence: 1, trous: 3, compter: 4, rythme: 3, zones: 4, suites: 3, chemin: 4 };
const PLAFOND: Record<string, number> = { ogoni: 8, pendu: 8, anagramme: 8, mots_meles: 8, mots_croises: 7, mots_fleches: 7, memoire: 8, syllabes: 8, dictee: 8, qcm: 12, ordre: 10, plateau: 12, quiz: 12, relier: 7, classer: 14, sequence: 4, trous: 10, compter: 12, rythme: 8, zones: 12, suites: 10, chemin: 12 };
/** Secondes accordées par question quand le temps devient limité (à partir du deuxième quart des niveaux). */
const SECONDES: Record<string, number> = { ogoni: 40, pendu: 40, anagramme: 30, mots_meles: 40, mots_croises: 60, mots_fleches: 60, memoire: 20, syllabes: 25, dictee: 0, qcm: 18, ordre: 30, plateau: 0, quiz: 18, relier: 14, classer: 9, sequence: 45, trous: 20, compter: 14, rythme: 0, zones: 12, suites: 18, chemin: 10 };

/**
 * Réglages du niveau n (1 à total) : progression continue, avec les valeurs imposées par le palier quand il en a.
 * `d` va de 0 (niveau 1) à 1 (dernier niveau) ; la montée est plus rapide au début (racine), pour que les 100 premiers niveaux se sentent.
 */
export function reglesNiveau(moteur: string, n: number, palier: NiveauJeu | null | undefined, total = NIVEAUX_PAR_JEU, dureeJeu = 0): ReglesManche {
  const niveau = borne(n, 1, total);
  const d = total > 1 ? Math.sqrt((niveau - 1) / (total - 1)) : 0;
  const base = BASE[moteur] ?? 4, plafond = PLAFOND[moteur] ?? 10;
  const questions = impose(palier?.questions) || borne(base + d * (plafond - base), 1, 30);
  let duree = impose(palier?.duree_s);
  if (duree === null) {
    const parQ = SECONDES[moteur] ?? 0;
    if (dureeJeu > 0) duree = Math.max(12, dureeJeu * (1.3 - 0.9 * d));            // jeu chronométré dès le début : le temps se resserre
    else if (parQ > 0 && d >= 0.3) duree = questions * parQ * (1.6 - 1.1 * d);      // sinon le chronomètre apparaît vers le niveau 90
    else duree = 0;
  }
  return {
    niveau, titre: `Niveau ${niveau}`,
    questions,
    dureeS: borne(duree, 0, 900),
    erreursMax: impose(palier?.erreurs_max) ? borne(impose(palier?.erreurs_max)!, 2, 8) : borne(7 - 4 * d, 3, 7),
    taille: impose(palier?.taille) ? borne(impose(palier?.taille)!, 5, 13) : borne(6 + 6 * d, 6, 12),
    options: impose(palier?.options) ? borne(impose(palier?.options)!, 2, 6) : borne(3 + 3 * d, 3, 6),
    contenuNiveau: impose(palier?.contenu_niveau) ? borne(impose(palier?.contenu_niveau)!, 1, 9) : borne(1 + 2.4 * d, 1, 3),
    xpPct: impose(palier?.xp_pct) ? borne(impose(palier?.xp_pct)!, 50, 400) : borne(100 + 200 * d, 100, 300),
  };
}

// ------------------------------------------------------------------ accès à un niveau
/** Ce que possède le joueur : rang (1 à 8), formules actives, formule complète, achats (identifiants de produits ou de contenus). */
export interface ProfilNiveau { rang: number; plans: readonly string[]; tout: boolean; achats: readonly string[] }
export type DecisionNiveau = { ok: true } | { ok: false; motif: 'rang_requis'; rangMin: number } | { ok: false; motif: 'plan_requis'; plans: string[] } | { ok: false; motif: 'achat_requis'; produitId: string; plans: string[] }
  | { ok: false; motif: 'niveau_precedent'; atteint: number } | { ok: false; motif: 'compte_requis' };

/**
 * Accès à un palier. Le rang doit être atteint. Ensuite, si le palier cite des formules ou un produit, il faut l'un des deux :
 * une des formules (ou la formule complète), ou l'achat du produit (ou du palier lui-même).
 */
/** Tous les jeux sont gratuits (13 nov. 2026). Mettre à false réactiverait les paliers payants. */
export const JEUX_GRATUITS = true;

export function accesNiveau(n: Pick<NiveauJeu, 'id' | 'rang_min' | 'plans' | 'produit_id'>, p: ProfilNiveau | null | undefined): DecisionNiveau {
  const rangMin = Number(n.rang_min) || 0;
  if (rangMin > 1 && (p?.rang ?? 1) < rangMin) return { ok: false, motif: 'rang_requis', rangMin };
  // Décision de Capp (13 nov. 2026) : tous les jeux sont gratuits. Les colonnes « plans » et « produit_id » des jeux et des paliers sont ignorées ;
  // seuls le rang et la progression (niveau précédent gagné) ouvrent les niveaux. Les jeux sont financés par la publicité.
  if (JEUX_GRATUITS) return { ok: true };
  const plans = (n.plans ?? []).filter(Boolean), produit = n.produit_id || '';
  if (!plans.length && !produit) return { ok: true };
  if (p?.tout || plans.some(x => p?.plans.includes(x))) return { ok: true };
  if (produit && (p?.achats.includes(produit) || p?.achats.includes(n.id))) return { ok: true };
  return produit ? { ok: false, motif: 'achat_requis', produitId: produit, plans: [...plans] } : { ok: false, motif: 'plan_requis', plans: [...plans] };
}

/** Accès au niveau n : il faut avoir gagné le niveau n-1 (`atteint` = plus haut niveau gagné), puis remplir la condition du palier. Sans compte : les premiers niveaux seulement. */
export function accesAuNiveau(n: number, paliers: Palier[], atteint: number, p: ProfilNiveau | null | undefined, invite = false): DecisionNiveau {
  if (invite && n > NIVEAUX_INVITE) return { ok: false, motif: 'compte_requis' };
  if (n > atteint + 1) return { ok: false, motif: 'niveau_precedent', atteint };
  return accesNiveau(palierDuNiveau(paliers, n), p);
}

export const texteRefus = (r: DecisionNiveau, rangs?: { nom: string }[]): string => r.ok ? '' :
  r.motif === 'rang_requis' ? `S'ouvre au rang ${rangs?.[r.rangMin - 1]?.nom ?? r.rangMin}` : r.motif === 'plan_requis' ? 'Avec une formule d\'abonnement' :
  r.motif === 'achat_requis' ? (r.plans.length ? 'À acheter, ou avec une formule' : 'À acheter') : r.motif === 'compte_requis' ? 'Avec un compte' : `Gagne d'abord le niveau ${r.atteint + 1}`;

// ------------------------------------------------------------------ manche servie par le serveur
export interface ItemJeu { id: string; enonce: string; reponse: string; leurres: string[]; groupe?: string | null; ordre?: number | null; niveau?: number | null; indice?: string | null; image?: string | null; audio?: string | null; extra?: Record<string, any> | null }
export interface FicheJeu { id: string; myene: string; francais: string }
export interface Manche {
  /** Jeton signé par le serveur : à renvoyer avec le résultat (il porte le jeu, le niveau et le nombre de questions). */
  jeton: string; jeuId: string; moteur: Moteur; regles: ReglesManche; palier: string;
  mots: MotJeu[]; items: ItemJeu[]; fiches: FicheJeu[]; cases: CasePlateau[];
}
export interface EtatNiveaux { total: number; atteint: number; invite: boolean; paliers: (Palier & { acces: DecisionNiveau })[] }

/**
 * Demande une manche au serveur. Hors ligne, la dernière manche reçue pour ce niveau est rejouée depuis le cache de l'appareil
 * (principe de l'application : ce qui a été chargé reste utilisable sans réseau). Le code de l'application, lui, ne contient aucun contenu.
 */
export const ouvrirManche = (jeuId: string, niveau: number, dialecte: string, connecte: boolean) =>
  avecCache(`manche:${jeuId}:${niveau}:${dialecte}`, () => api<Manche>('POST', `${connecte ? '/v1' : '/pub'}/jeux/${encodeURIComponent(jeuId)}/manche`, { niveau, dialecte }));
export const chargerNiveaux = (jeuId: string, connecte: boolean) =>
  avecCache(`niveaux:${jeuId}:${connecte ? 'compte' : 'invite'}`, () => api<EtatNiveaux>('GET', `${connecte ? '/v1' : '/pub'}/jeux/${encodeURIComponent(jeuId)}/niveaux`));

/** Précharge en arrière-plan les prochains niveaux (5 par défaut) pour pouvoir continuer sans réseau. Les niveaux refusés sont ignorés. */
export async function prechargerManches(jeuId: string, depuis: number, dialecte: string, connecte: boolean, combien = 5, total = NIVEAUX_PAR_JEU) {
  for (let n = depuis; n < depuis + combien && n <= total; n++) {
    try { await ouvrirManche(jeuId, n, dialecte, connecte); } catch { break; }
  }
}

export interface QuestionDuel { enonce: string; options: string[]; bonne: number }
export const questionsDuel = (id: string) => api<{ questions: QuestionDuel[] }>('GET', `/v1/duels/${encodeURIComponent(id)}/questions`);
