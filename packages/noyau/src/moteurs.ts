/**
 * Moteurs de jeux d'Azeva (logique pure, sans écran) : pendu, anagrammes, mots mêlés, dictée, plateau avec dé.
 * Les mots viennent des fiches validées du corpus et de la collection « mots_jeux ». Chaque moteur est testé
 * dans server/api/test/noyau.test.ts.
 */
import { melanger, type Hasard } from './azeva';
import { nfc } from './encodage';

export interface MotJeu { id: string; myene: string; francais: string; theme?: string; niveau?: number; audio?: string | null; image?: string | null; dialecte?: string }

/** Lettre de comparaison : minuscule, NFC, sans espace ; les accents sont conservés (ô ≠ o en myènè). */
export const normMot = (t: string) => nfc(t).toLowerCase().replace(/\s+/g, '');
/** Lettres d'un mot en comptant ɛ ɔ ṉ ṽ et les lettres accentuées comme un seul signe. */
export const lettres = (t: string): string[] => Array.from(nfc(t).replace(/[\s'’-]/g, ''));

/** Mots utilisables dans les jeux de lettres : un seul mot de 3 à 12 lettres. */
export const motDeLettres = (m: MotJeu) => { const n = lettres(m.myene).length; return !/\s/.test(m.myene.trim()) && n >= 3 && n <= 12; };

// ------------------------------------------------------------------ pendu
export interface Pendu { mot: MotJeu; lettres: string[]; trouvees: string[]; ratees: string[]; erreursMax: number }
export const nouveauPendu = (mot: MotJeu, erreursMax = 6): Pendu => ({ mot, lettres: lettres(mot.myene).map(l => l.toLowerCase()), trouvees: [], ratees: [], erreursMax });
export function jouerLettre(p: Pendu, lettre: string): Pendu {
  const l = nfc(lettre).toLowerCase();
  if (p.trouvees.includes(l) || p.ratees.includes(l)) return p;
  return p.lettres.includes(l) ? { ...p, trouvees: [...p.trouvees, l] } : { ...p, ratees: [...p.ratees, l] };
}
export const penduGagne = (p: Pendu) => p.lettres.every(l => p.trouvees.includes(l));
export const penduPerdu = (p: Pendu) => p.ratees.length >= p.erreursMax;
/** Affichage : lettres trouvées ou « _ ». */
export const penduMasque = (p: Pendu): string[] => lettres(p.mot.myene).map(l => (p.trouvees.includes(l.toLowerCase()) ? l : '_'));
/** Clavier : lettres des mots proposés (le joueur ne doit pas deviner l'alphabet : seules les lettres du lexique sont proposées avec des leurres). */
export function clavierPendu(p: Pendu, tousMots: MotJeu[], hasard: Hasard = Math.random, taille = 18): string[] {
  const base = new Set(p.lettres);
  const leurres = melanger([...new Set(tousMots.flatMap(m => lettres(m.myene).map(l => l.toLowerCase())))].filter(l => !base.has(l)), hasard);
  return melanger([...base, ...leurres.slice(0, Math.max(0, taille - base.size))], hasard);
}

// ------------------------------------------------------------------ anagrammes
export interface Anagramme { mot: MotJeu; melange: string[]; essai: string[] }
export function nouvelleAnagramme(mot: MotJeu, hasard: Hasard = Math.random): Anagramme {
  const sol = lettres(mot.myene);
  let m = melanger(sol, hasard);
  for (let i = 0; i < 10 && m.join('') === sol.join('') && new Set(sol).size > 1; i++) m = melanger(sol, hasard);
  return { mot, melange: m, essai: [] };
}
/** Indices déjà utilisés dans l'essai ; on ajoute une lettre du cercle par son indice. */
export const anagrammeReussie = (a: Anagramme) => normMot(a.essai.join('')) === normMot(lettres(a.mot.myene).join(''));

// ------------------------------------------------------------------ mots mêlés
export interface MotsMeles { taille: number; grille: string[][]; mots: { mot: string; francais: string; cases: [number, number][] }[]; }
const DIRECTIONS: [number, number][] = [[0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1], [-1, 1]];
export function genererMotsMeles(mots: MotJeu[], taille = 9, hasard: Hasard = Math.random, directions: [number, number][] = DIRECTIONS.slice(0, 3)): MotsMeles {
  const grille: (string | null)[][] = Array.from({ length: taille }, () => Array(taille).fill(null));
  const places: MotsMeles['mots'] = [];
  for (const m of melanger(mots.filter(x => lettres(x.myene).length <= taille), hasard).slice(0, 6)) {
    const ls = lettres(m.myene).map(l => l.toLowerCase());
    for (let essai = 0; essai < 60; essai++) {
      const [dr, dc] = directions[Math.floor(hasard() * directions.length)];
      const r0 = Math.floor(hasard() * taille), c0 = Math.floor(hasard() * taille);
      const cases: [number, number][] = ls.map((_, i) => [r0 + dr * i, c0 + dc * i]);
      if (cases.some(([r, c]) => r < 0 || c < 0 || r >= taille || c >= taille)) continue;
      if (cases.some(([r, c], i) => grille[r][c] !== null && grille[r][c] !== ls[i])) continue;
      cases.forEach(([r, c], i) => { grille[r][c] = ls[i]; });
      places.push({ mot: m.myene, francais: m.francais, cases });
      break;
    }
  }
  const alphabet = [...new Set(mots.flatMap(m => lettres(m.myene).map(l => l.toLowerCase())))];
  const pool = alphabet.length ? alphabet : ['a', 'e', 'o', 'n', 'm'];
  return { taille, grille: grille.map(l => l.map(x => x ?? pool[Math.floor(hasard() * pool.length)])), mots: places };
}
/** Sélection de cases (liste de [r,c]) : renvoie le mot trouvé si elle recouvre exactement un mot, dans un sens ou l'autre. */
export function motTrouve(g: MotsMeles, selection: [number, number][]): string | null {
  const k = (c: [number, number][]) => c.map(x => x.join(',')).join(';');
  const s = k(selection), sr = k([...selection].reverse());
  return g.mots.find(m => { const mk = k(m.cases); return mk === s || mk === sr; })?.mot ?? null;
}
/** Cases alignées entre deux cases (ligne, colonne ou diagonale), ou null si elles ne sont pas alignées. */
export function casesEntre(a: [number, number], b: [number, number]): [number, number][] | null {
  const dr = b[0] - a[0], dc = b[1] - a[1];
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const n = Math.max(Math.abs(dr), Math.abs(dc));
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + Math.sign(dr) * i, a[1] + Math.sign(dc) * i] as [number, number]);
}

// ------------------------------------------------------------------ dictée sonore
export interface Dictee { mot: MotJeu }
/** Note de la dictée : lettres justes à la bonne place / longueur, de 0 à 1 ; accents différents = demi-point. */
export function noterDictee(attendu: string, saisi: string): { note: number; exact: boolean } {
  const a = lettres(attendu).map(l => l.toLowerCase()), s = lettres(saisi).map(l => l.toLowerCase());
  if (!a.length) return { note: 0, exact: false };
  const base = (l: string) => l.normalize('NFD').replace(/[̀-ͯ]/g, '');
  let pts = 0;
  for (let i = 0; i < a.length; i++) { if (s[i] === a[i]) pts += 1; else if (s[i] && base(s[i]) === base(a[i])) pts += 0.5; }
  const note = Math.max(0, pts / Math.max(a.length, s.length));
  return { note, exact: a.join('') === s.join('') };
}

// ------------------------------------------------------------------ plateau (grand jeu avec dé)
export interface CasePlateau { position: number; type: 'neutre' | 'question' | 'bonus' | 'recul' | 'proverbe' | 'arrivee'; texte?: string; effet?: number; motId?: string }
export interface EtatPlateau { position: number; tours: number; fini: boolean; credits: number }
export const lancerDe = (hasard: Hasard = Math.random) => 1 + Math.floor(hasard() * 6);
export function avancerPlateau(e: EtatPlateau, de: number, cases: CasePlateau[]): { etat: EtatPlateau; case: CasePlateau | null } {
  const derniere = Math.max(...cases.map(c => c.position), 0);
  let pos = Math.min(derniere, e.position + de);
  let c = cases.find(x => x.position === pos) ?? null;
  if (c && (c.type === 'bonus' || c.type === 'recul') && c.effet) pos = Math.max(0, Math.min(derniere, pos + c.effet));
  return { etat: { ...e, position: pos, tours: e.tours + 1, fini: pos >= derniere, credits: e.credits }, case: c };
}

// ------------------------------------------------------------------ défi du jour et score
/** Graine stable pour une date (AAAA-MM-JJ) : tous les joueurs ont le même défi le même jour. */
export function graineJour(jour: string): number { let h = 2166136261; for (const c of jour) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function hasardGraine(graine: number): Hasard { let s = graine || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
export const jourLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Choix reproductible d'un élément de liste pour le jour donné. */
export const choixDuJour = <T,>(liste: readonly T[], jour = jourLocal()): T | null => (liste.length ? liste[Math.floor(hasardGraine(graineJour(jour))() * liste.length)] : null);

/** Score d'une partie, recalculé aussi côté serveur : le client ne fait qu'envoyer ses réponses. */
export function scorePartie(o: { bonnes: number; erreurs: number; secondesRestantes?: number; serie?: number }): number {
  return Math.max(0, o.bonnes * 100 - o.erreurs * 25 + Math.min(60, Math.max(0, o.secondesRestantes ?? 0)) + Math.min(5, o.serie ?? 0) * 10);
}
/** Étoiles de 0 à 3 selon la part de bonnes réponses. */
export const etoiles = (bonnes: number, total: number): 0 | 1 | 2 | 3 => { const r = total ? bonnes / total : 0; return r >= 0.9 ? 3 : r >= 0.6 ? 2 : r > 0 ? 1 : 0; };
