import { api } from './api';
import type { QuestionnaireItem } from './types';

/**
 * Onenji : apprentissage par le jeu (14_programme_et_jeux/02_jeux_application_NKALA.md).
 * Règle des cours : un nombre de cœurs par défaut, une mauvaise réponse en retire un, les bonnes réponses
 * rapportent des points, les points et le temps rechargent les cœurs. Les valeurs ci-dessous sont des
 * réglages provisoires (le document ne fixe pas les chiffres) : décision de Capp.
 */
export const REGLES = { coeursMax: 5, pointsParBonneReponse: 10, pointsParCoeur: 50, minutesParCoeur: 20 } as const;

export interface EtatJeu {
  coeurs: number;
  points: number;
  /** Points accumulés vers le prochain cœur. */
  reserve: number;
  /** Dernier instant (ms) où le rechargement par le temps a été calculé. */
  horloge: number;
}

export const etatInitial = (maintenant = Date.now()): EtatJeu => ({ coeurs: REGLES.coeursMax, points: 0, reserve: 0, horloge: maintenant });

/** Rechargement par le temps : un cœur toutes les `minutesParCoeur` minutes, jusqu'au maximum. */
export function appliquerTemps(e: EtatJeu, maintenant = Date.now()): EtatJeu {
  if (e.coeurs >= REGLES.coeursMax) return { ...e, horloge: maintenant };
  const periode = REGLES.minutesParCoeur * 60_000;
  const gagnes = Math.floor(Math.max(0, maintenant - e.horloge) / periode);
  if (gagnes <= 0) return e;
  const coeurs = Math.min(REGLES.coeursMax, e.coeurs + gagnes);
  return { ...e, coeurs, horloge: coeurs >= REGLES.coeursMax ? maintenant : e.horloge + gagnes * periode };
}

export function bonneReponse(e: EtatJeu, maintenant = Date.now()): EtatJeu {
  let { coeurs, reserve } = appliquerTemps(e, maintenant);
  reserve += REGLES.pointsParBonneReponse;
  while (reserve >= REGLES.pointsParCoeur && coeurs < REGLES.coeursMax) { reserve -= REGLES.pointsParCoeur; coeurs++; }
  if (coeurs >= REGLES.coeursMax) reserve = Math.min(reserve, REGLES.pointsParCoeur - 1);
  return { coeurs, reserve, points: e.points + REGLES.pointsParBonneReponse, horloge: coeurs >= REGLES.coeursMax ? maintenant : e.horloge };
}

export function mauvaiseReponse(e: EtatJeu, maintenant = Date.now()): EtatJeu {
  const t = appliquerTemps(e, maintenant);
  // La perte du premier cœur démarre l'horloge de rechargement.
  return { ...t, coeurs: Math.max(0, t.coeurs - 1), horloge: t.coeurs >= REGLES.coeursMax ? maintenant : t.horloge };
}

export const peutJouer = (e: EtatJeu) => e.coeurs > 0;

/** Temps (ms) avant le prochain cœur, ou null si les cœurs sont pleins. */
export function attenteCoeur(e: EtatJeu, maintenant = Date.now()): number | null {
  if (e.coeurs >= REGLES.coeursMax) return null;
  return Math.max(0, e.horloge + REGLES.minutesParCoeur * 60_000 - maintenant);
}

// ------------------------------------------------------------------ questions

export type Hasard = () => number;

export function melanger<T>(l: readonly T[], hasard: Hasard = Math.random): T[] {
  const a = [...l];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(hasard() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const cle = (t: string) => t.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

/** Fiche utilisable en jeu : active, avec un texte myènè et sa traduction. */
export const jouable = (f: QuestionnaireItem) => f.status !== 'archived' && !!f.myeneText?.trim() && !!f.frenchText?.trim();

export interface Qcm { fiche: QuestionnaireItem; enonce: string; options: string[]; bonne: number }

/**
 * Contrôle 7 : on lit une phrase française, on choisit la bonne phrase myènè parmi `nbOptions`.
 * Les mauvaises réponses viennent du même dialecte, avec un texte et une traduction différents. Null s'il manque de fiches.
 */
export function construireQcm(fiche: QuestionnaireItem, autres: QuestionnaireItem[], nbOptions = 4, hasard: Hasard = Math.random): Qcm | null {
  const bonneCle = cle(fiche.myeneText);
  const vus = new Set([bonneCle]);
  const pool = melanger(autres.filter(f => jouable(f) && f.dialect === fiche.dialect && cle(f.frenchText) !== cle(fiche.frenchText)), hasard);
  const mauvaises: string[] = [];
  for (const f of pool) {
    const k = cle(f.myeneText);
    if (vus.has(k)) continue;
    vus.add(k); mauvaises.push(f.myeneText.trim());
    if (mauvaises.length === nbOptions - 1) break;
  }
  if (mauvaises.length < nbOptions - 1) return null;
  const options = melanger([fiche.myeneText.trim(), ...mauvaises], hasard);
  return { fiche, enonce: fiche.frenchText.trim(), options, bonne: options.indexOf(fiche.myeneText.trim()) };
}

export interface Ordre { fiche: QuestionnaireItem; enonce: string; mots: string[]; solution: string[] }

/** Contrôle 4 : remettre les mots d'une phrase (3 à 8 mots) dans l'ordre. Null si la phrase ne s'y prête pas. */
export function construireOrdre(fiche: QuestionnaireItem, hasard: Hasard = Math.random): Ordre | null {
  const solution = fiche.myeneText.trim().split(/\s+/).filter(Boolean);
  if (solution.length < 3 || solution.length > 8 || new Set(solution.map(cle)).size < 2) return null;
  let mots = melanger(solution, hasard);
  for (let essai = 0; essai < 10 && mots.join(' ') === solution.join(' '); essai++) mots = melanger(solution, hasard);
  if (mots.join(' ') === solution.join(' ')) return null;
  return { fiche, enonce: fiche.frenchText.trim(), mots, solution };
}

/** Un autre ordre est accepté s'il donne exactement la même phrase (mots répétés). */
export const ordreCorrect = (propose: string[], q: Pick<Ordre, 'solution'>) => cle(propose.join(' ')) === cle(q.solution.join(' '));

// ------------------------------------------------------------------ jeux sonores

/** Enregistrement validé d'un locuteur (route /v1/games/audio : voix approuvée et autorisation d'usage donnée). */
export interface ClipAudio { id: string; itemId: string; dialect: string; myeneText: string; frenchText: string; audioUrl: string }

export const chargerClipsAudio = (dialecte: string | null, n = 12) =>
  api<ClipAudio[]>('GET', `/v1/games/audio?limit=${n}${dialecte ? `&dialect=${encodeURIComponent(dialecte)}` : ''}`);

const ficheDuClip = (c: ClipAudio) => ({ id: c.itemId, myeneText: c.myeneText, frenchText: c.frenchText, dialect: c.dialect, status: 'active' }) as QuestionnaireItem;

export interface QcmAudio { clip: ClipAudio; options: string[]; bonne: number }

/** Contrôle 1 : un son est émis, on touche la phrase correspondante. L'énoncé écrit n'est jamais montré. */
export function construireQcmAudio(clip: ClipAudio, autres: QuestionnaireItem[], nbOptions = 4, hasard: Hasard = Math.random): QcmAudio | null {
  const q = construireQcm(ficheDuClip(clip), autres, nbOptions, hasard);
  return q ? { clip, options: q.options, bonne: q.bonne } : null;
}

export interface OrdreAudio extends Ordre { clip: ClipAudio }

/** Dictée sonore : on écoute la phrase puis on remet ses mots dans l'ordre. */
export function construireOrdreAudio(clip: ClipAudio, hasard: Hasard = Math.random): OrdreAudio | null {
  const o = construireOrdre(ficheDuClip(clip), hasard);
  return o ? { ...o, clip } : null;
}
