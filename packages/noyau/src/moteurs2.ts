/**
 * Moteurs de jeux d'Azeva, suite (logique pure, sans écran) : mots croisés et fléchés, mémoire, syllabes, questions à choix,
 * paires à relier, classement, suites à ordonner, phrases à trous, comptage, rythme, suites de formes, chemin.
 * Aucun contenu ici : tout vient de la manche servie par le serveur. Testé dans server/api/test/moteurs.test.ts.
 */
import { melanger, type Hasard } from './azeva';
import type { ItemJeu } from './difficulte';
import { nfc } from './encodage';
import { lettres, type MotJeu } from './moteurs';

const cle = (t: string) => nfc(t).toLowerCase().replace(/\s+/g, ' ').trim();
const uniques = (l: string[]) => { const vus = new Set<string>(); return l.filter(x => { const k = cle(x); if (!k || vus.has(k)) return false; vus.add(k); return true; }); };

// ------------------------------------------------------------------ mots croisés et mots fléchés
export interface MotGrille { mot: string; francais: string; lettres: string[]; r: number; c: number; sens: 'h' | 'v'; numero: number; /** Case de définition (mots fléchés) : juste avant la première lettre. */ def?: [number, number] }
export interface GrilleMots { taille: number; /** Lettre attendue par case, null = case noire ou de définition. */ cases: (string | null)[][]; mots: MotGrille[]; fleches: boolean }

/**
 * Place les mots en les croisant sur une lettre commune. Règles classiques : pas de lettres collées hors croisement,
 * une case libre avant et après chaque mot. En mots fléchés, la case qui précède le mot est réservée à sa définition.
 */
export function genererGrilleMots(mots: MotJeu[], taille = 9, max = 6, hasard: Hasard = Math.random, fleches = false): GrilleMots {
  const g: (string | null)[][] = Array.from({ length: taille }, () => Array(taille).fill(null));
  const defs = new Set<string>();
  const places: MotGrille[] = [];
  const dans = (r: number, c: number) => r >= 0 && c >= 0 && r < taille && c < taille;
  const lettre = (r: number, c: number) => (dans(r, c) ? g[r][c] : null);
  const candidats = melanger(mots, hasard).map(m => ({ m, ls: lettres(m.myene).map(l => l.toLowerCase()) }))
    .filter(x => x.ls.length >= 2 && x.ls.length <= taille - (fleches ? 1 : 0) && !/\s/.test(x.m.myene.trim()))
    .sort((a, b) => b.ls.length - a.ls.length);
  const vus = new Set<string>();

  const peut = (ls: string[], r: number, c: number, sens: 'h' | 'v', premier: boolean): boolean => {
    const dr = sens === 'v' ? 1 : 0, dc = sens === 'h' ? 1 : 0;
    const fr = r + dr * (ls.length - 1), fc = c + dc * (ls.length - 1);
    if (!dans(r, c) || !dans(fr, fc)) return false;
    const ar = r - dr, ac = c - dc, zr = fr + dr, zc = fc + dc;
    if (lettre(ar, ac) !== null || lettre(zr, zc) !== null) return false;
    if (fleches && (!dans(ar, ac))) return false;
    let croisements = 0;
    for (let i = 0; i < ls.length; i++) {
      const rr = r + dr * i, cc = c + dc * i;
      if (defs.has(`${rr},${cc}`)) return false;
      const deja = g[rr][cc];
      if (deja !== null) { if (deja !== ls[i]) return false; croisements++; continue; }
      // case neuve : aucune lettre collée sur les côtés (perpendiculairement au mot)
      if (lettre(rr + dc, cc + dr) !== null || lettre(rr - dc, cc - dr) !== null) return false;
    }
    if (croisements === ls.length) return false;
    return premier ? true : croisements > 0;
  };
  const poser = (m: MotJeu, ls: string[], r: number, c: number, sens: 'h' | 'v') => {
    const dr = sens === 'v' ? 1 : 0, dc = sens === 'h' ? 1 : 0;
    ls.forEach((l, i) => { g[r + dr * i][c + dc * i] = l; });
    const def: [number, number] | undefined = fleches ? [r - dr, c - dc] : undefined;
    if (def) defs.add(def.join(','));
    places.push({ mot: m.myene, francais: m.francais, lettres: ls, r, c, sens, numero: places.length + 1, def });
  };

  for (const { m, ls } of candidats) {
    if (places.length >= max) break;
    const k = ls.join('');
    if (vus.has(k)) continue;
    if (places.length === 0) {
      const r = Math.floor(taille / 2), c = Math.max(fleches ? 1 : 0, Math.floor((taille - ls.length) / 2));
      if (peut(ls, r, c, 'h', true)) { poser(m, ls, r, c, 'h'); vus.add(k); }
      continue;
    }
    const essais: [number, number, 'h' | 'v'][] = [];
    for (const p of places) {
      const sens: 'h' | 'v' = p.sens === 'h' ? 'v' : 'h';
      p.lettres.forEach((pl, pi) => ls.forEach((l, i) => {
        if (l !== pl) return;
        const pr = p.r + (p.sens === 'v' ? pi : 0), pc = p.c + (p.sens === 'h' ? pi : 0);
        essais.push([sens === 'v' ? pr - i : pr, sens === 'h' ? pc - i : pc, sens]);
      }));
    }
    const ok = melanger(essais, hasard).find(([r, c, s]) => peut(ls, r, c, s, false));
    if (ok) { poser(m, ls, ok[0], ok[1], ok[2]); vus.add(k); }
  }
  return { taille, cases: g, mots: places, fleches };
}

/** Cases d'un mot de la grille. */
export const casesDuMot = (m: MotGrille): [number, number][] => m.lettres.map((_, i) => [m.r + (m.sens === 'v' ? i : 0), m.c + (m.sens === 'h' ? i : 0)]);
/** La grille est juste quand chaque case à lettre porte la bonne lettre (saisie : « r,c » -> lettre). */
export function grilleReussie(g: GrilleMots, saisie: Record<string, string>): boolean {
  return g.cases.every((ligne, r) => ligne.every((l, c) => l === null || cle(saisie[`${r},${c}`] ?? '') === l));
}
export const motGrilleReussi = (m: MotGrille, saisie: Record<string, string>) => casesDuMot(m).every(([r, c], i) => cle(saisie[`${r},${c}`] ?? '') === m.lettres[i]);
/** Lettres proposées au clavier : celles de la grille, plus quelques leurres tirés des autres mots. */
export function clavierGrille(g: GrilleMots, tousMots: MotJeu[], hasard: Hasard = Math.random, leurres = 4): string[] {
  const base = new Set(g.mots.flatMap(m => m.lettres));
  const autres = melanger([...new Set(tousMots.flatMap(m => lettres(m.myene).map(l => l.toLowerCase())))].filter(l => !base.has(l)), hasard).slice(0, leurres);
  return [...base, ...autres].sort((a, b) => a.localeCompare(b, 'fr'));
}

// ------------------------------------------------------------------ mémoire (paires de cartes mot / traduction)
export interface CarteMemoire { cle: string; texte: string; face: 'myene' | 'francais' }
export function nouvelleMemoire(mots: MotJeu[], paires: number, hasard: Hasard = Math.random): CarteMemoire[] {
  const vus = new Set<string>();
  const tirage = melanger(mots, hasard).filter(m => { const k = cle(m.francais); if (vus.has(k)) return false; vus.add(k); return true; }).slice(0, paires);
  return melanger(tirage.flatMap(m => [{ cle: m.id, texte: m.myene, face: 'myene' as const }, { cle: m.id, texte: m.francais, face: 'francais' as const }]), hasard);
}

// ------------------------------------------------------------------ syllabes (« a-kôn-dô »)
export interface Syllabes { item: ItemJeu; solution: string[]; morceaux: string[] }
export function nouvellesSyllabes(item: ItemJeu, autres: ItemJeu[], hasard: Hasard = Math.random, leurres = 2): Syllabes | null {
  const solution = item.reponse.split('-').map(s => s.trim()).filter(Boolean);
  if (solution.length < 2) return null;
  const pool = melanger(uniques(autres.filter(a => a.id !== item.id).flatMap(a => a.reponse.split('-').map(s => s.trim()))).filter(s => !solution.some(x => cle(x) === cle(s))), hasard).slice(0, leurres);
  return { item, solution, morceaux: melanger([...solution, ...pool], hasard) };
}
export const syllabesReussies = (s: Syllabes, essai: string[]) => cle(essai.join('')) === cle(s.solution.join(''));

// ------------------------------------------------------------------ question à choix (quiz, trous, compter, suites, zones, chemin)
export interface QuestionItem { item: ItemJeu; options: string[]; bonne: number }
/** Bonne réponse + leurres de la ligne, complétés par les réponses des autres lignes ; null s'il n'y a pas au moins 2 choix. */
export function questionItem(item: ItemJeu, autres: ItemJeu[], nbOptions = 4, hasard: Hasard = Math.random): QuestionItem | null {
  const faux = uniques([...melanger(item.leurres ?? [], hasard), ...melanger(autres.filter(a => a.id !== item.id).map(a => a.reponse), hasard)]).filter(x => cle(x) !== cle(item.reponse)).slice(0, Math.max(1, nbOptions - 1));
  if (!faux.length) return null;
  const options = melanger([item.reponse, ...faux], hasard);
  return { item, options, bonne: options.findIndex(o => cle(o) === cle(item.reponse)) };
}
/** Réponse écrite acceptée : même texte, sans tenir compte de la casse ni des espaces en trop. */
export const reponseEcriteJuste = (attendu: string, saisi: string) => cle(attendu) === cle(saisi);

// ------------------------------------------------------------------ relier (deux colonnes)
export interface Relier { gauche: { id: string; texte: string; image?: string | null; audio?: string | null }[]; droite: { id: string; texte: string }[] }
export function nouveauRelier(items: ItemJeu[], paires: number, hasard: Hasard = Math.random): Relier {
  const vusG = new Set<string>(), vusD = new Set<string>();
  const t = melanger(items, hasard).filter(i => { const a = cle(i.enonce), b = cle(i.reponse); if (vusG.has(a) || vusD.has(b)) return false; vusG.add(a); vusD.add(b); return true; }).slice(0, paires);
  return { gauche: t.map(i => ({ id: i.id, texte: i.enonce, image: i.image, audio: i.audio })), droite: melanger(t.map(i => ({ id: i.id, texte: i.reponse })), hasard) };
}
/** Les mots servent aussi de paires (mot myènè ↔ traduction). */
export const motsEnItems = (mots: MotJeu[]): ItemJeu[] => mots.map(m => ({ id: m.id, enonce: m.myene, reponse: m.francais, leurres: [], image: m.image, audio: m.audio }));

// ------------------------------------------------------------------ classer (ranger chaque élément dans sa catégorie)
export interface Classer { categories: string[]; elements: ItemJeu[] }
export function nouveauClasser(items: ItemJeu[], nb: number, hasard: Hasard = Math.random): Classer {
  const elements = melanger(items, hasard).slice(0, nb);
  return { categories: uniques(items.map(i => i.reponse)).sort((a, b) => a.localeCompare(b, 'fr')), elements };
}

// ------------------------------------------------------------------ suites à remettre en ordre (frise, conte, devise, classes d'âge)
export interface Suite { groupe: string; titre: string; solution: ItemJeu[]; melange: ItemJeu[] }
export function nouvellesSuites(items: ItemJeu[], nb: number, hasard: Hasard = Math.random): Suite[] {
  const par = new Map<string, ItemJeu[]>();
  for (const i of items) { const g = i.groupe || 'suite'; par.set(g, [...(par.get(g) ?? []), i]); }
  const suites: Suite[] = [];
  for (const [groupe, l] of melanger([...par.entries()], hasard)) {
    const solution = [...l].sort((a, b) => (Number(a.ordre) || 0) - (Number(b.ordre) || 0));
    if (solution.length < 3) continue;
    let m = melanger(solution, hasard);
    for (let i = 0; i < 10 && m.every((x, k) => x.id === solution[k].id); i++) m = melanger(solution, hasard);
    suites.push({ groupe, titre: solution[0].indice || groupe, solution, melange: m });
    if (suites.length >= nb) break;
  }
  return suites;
}
export const suiteReussie = (s: Suite, ordre: string[]) => ordre.length === s.solution.length && ordre.every((id, i) => id === s.solution[i].id || cle(s.solution.find(x => x.id === id)?.enonce ?? '') === cle(s.solution[i].enonce));

// ------------------------------------------------------------------ phrase à trous
/** Coupe l'énoncé autour du premier « ___ » (deux soulignés ou plus). */
export function couperTrou(enonce: string): { avant: string; apres: string; trou: boolean } {
  const m = /_{2,}/.exec(enonce);
  return m ? { avant: enonce.slice(0, m.index).trimEnd(), apres: enonce.slice(m.index + m[0].length).trimStart(), trou: true } : { avant: enonce, apres: '', trou: false };
}

// ------------------------------------------------------------------ compter, rythme, suites de formes, chemin
/** Nombre à compter (1 à 20) lu dans l'énoncé d'une ligne ; null si l'énoncé n'est pas un nombre. */
export const nombreACompter = (i: ItemJeu): number | null => { const n = Number(String(i.enonce).trim()); return Number.isInteger(n) && n >= 1 && n <= 20 ? n : null; };

export const FRAPPES = ['G', 'D', 'C', 'B'] as const;
export type Frappe = typeof FRAPPES[number];
/** Rythme « G-D-G-G » : suite de frappes (G = tambour grave, D = tambour aigu, C = claquement, B = bois). */
export const lireRythme = (reponse: string): Frappe[] => reponse.toUpperCase().split(/[\s,\-|]+/).filter((x): x is Frappe => (FRAPPES as readonly string[]).includes(x));
export const rythmeJuste = (attendu: Frappe[], joue: Frappe[]) => attendu.length === joue.length && attendu.every((f, i) => f === joue[i]);

export const FORMES = ['rond', 'carre', 'triangle', 'losange', 'etoile', 'croix'] as const;
/** Élément d'une suite : forme, avec une couleur (rouge, jaune, bleu, vert, noir, blanc) et une taille facultatives : « rond:rouge:grand ». */
export interface Jeton { forme: string; couleur?: string; taille?: string; inconnu?: boolean; brut: string }
export function lireJeton(brut: string): Jeton {
  const t = brut.trim();
  if (t === '?') return { forme: '?', inconnu: true, brut: t };
  const [forme, couleur, taille] = t.toLowerCase().split(':');
  return { forme, couleur: couleur || undefined, taille: taille || undefined, brut: t };
}
export const lireSuiteFormes = (enonce: string): Jeton[] => enonce.split('|').map(lireJeton).filter(j => j.forme);
export const estJetonForme = (brut: string) => (FORMES as readonly string[]).includes(brut.trim().toLowerCase().split(':')[0]);

export type Direction = 'haut' | 'bas' | 'gauche' | 'droite';
export const DIRECTIONS4: Direction[] = ['haut', 'bas', 'gauche', 'droite'];
export const lireDirection = (t: string): Direction | null => { const k = cle(t).normalize('NFD').replace(/[̀-ͯ]/g, ''); return k === 'haut' || k === 'devant' || k === 'avant' ? 'haut' : k === 'bas' || k === 'derriere' || k === 'arriere' ? 'bas' : k === 'gauche' ? 'gauche' : k === 'droite' ? 'droite' : null; };
export const PAS: Record<Direction, [number, number]> = { haut: [-1, 0], bas: [1, 0], gauche: [0, -1], droite: [0, 1] };
/** Chemin sans retour en arrière dans une grille : suite de directions qui reste dans les bornes, en n'utilisant que les directions permises. */
export function tracerChemin(taille: number, pas: number, permises: Direction[], hasard: Hasard = Math.random): { depart: [number, number]; chemin: Direction[]; arrivee: [number, number] } {
  const inverse: Record<Direction, Direction> = { haut: 'bas', bas: 'haut', gauche: 'droite', droite: 'gauche' };
  const depart: [number, number] = [Math.floor(taille / 2), Math.floor(taille / 2)];
  let pos = depart, dernier: Direction | null = null;
  const chemin: Direction[] = [];
  const vus = new Set([pos.join(',')]);
  for (let i = 0; i < pas; i++) {
    const choix = melanger(permises, hasard).filter(d => { const n = [pos[0] + PAS[d][0], pos[1] + PAS[d][1]]; return d !== (dernier ? inverse[dernier] : null) && n[0] >= 0 && n[1] >= 0 && n[0] < taille && n[1] < taille && !vus.has(n.join(',')); });
    if (!choix.length) break;
    const d = choix[0];
    pos = [pos[0] + PAS[d][0], pos[1] + PAS[d][1]]; vus.add(pos.join(',')); chemin.push(d); dernier = d;
  }
  return { depart, chemin, arrivee: pos };
}

// ------------------------------------------------------------------ zones (toucher la bonne partie d'une scène)
/** Zones du dessin intégré « corps » : centre en pourcentage de la largeur et de la hauteur du dessin. */
export const ZONES_CORPS: Record<string, { x: number; y: number; nom: string }> = {
  cheveux: { x: 50, y: 4, nom: 'les cheveux' }, tete: { x: 50, y: 10, nom: 'la tête' }, oeil: { x: 45.5, y: 10.5, nom: 'l\'œil' }, oreille: { x: 60, y: 11, nom: 'l\'oreille' },
  nez: { x: 50, y: 12.5, nom: 'le nez' }, bouche: { x: 50, y: 15.5, nom: 'la bouche' }, menton: { x: 50, y: 18, nom: 'le menton' }, cou: { x: 50, y: 21.5, nom: 'le cou' },
  epaule: { x: 33, y: 26, nom: 'l\'épaule' }, poitrine: { x: 50, y: 31, nom: 'la poitrine' }, bras: { x: 27, y: 36, nom: 'le bras' }, coude: { x: 74.5, y: 41, nom: 'le coude' },
  ventre: { x: 50, y: 43, nom: 'le ventre' }, nombril: { x: 50, y: 46.5, nom: 'le nombril' }, main: { x: 22, y: 55, nom: 'la main' }, doigt: { x: 79, y: 59, nom: 'le doigt' },
  hanche: { x: 37, y: 52, nom: 'la hanche' }, cuisse: { x: 42, y: 62, nom: 'la cuisse' }, genou: { x: 58, y: 71, nom: 'le genou' }, jambe: { x: 42, y: 80, nom: 'la jambe' },
  talon: { x: 62, y: 93, nom: 'le talon' }, pied: { x: 40, y: 95, nom: 'le pied' },
};
/** Position d'une zone : coordonnées de la ligne (extra.x, extra.y) si elles existent, sinon celles du dessin intégré. */
export function positionZone(i: ItemJeu): { x: number; y: number } | null {
  const x = Number(i.extra?.x), y = Number(i.extra?.y);
  if (Number.isFinite(x) && Number.isFinite(y) && i.extra?.x != null) return { x, y };
  const z = ZONES_CORPS[cle(i.reponse).normalize('NFD').replace(/[̀-ͯ]/g, '')];
  return z ? { x: z.x, y: z.y } : null;
}
