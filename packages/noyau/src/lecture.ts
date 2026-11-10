/**
 * Bibliothèque virtuelle d'Onenji : découpage d'un livre en chapitres (import) et mini-quiz « complète le texte » (lecture).
 * Logique pure, sans écran ni réseau.
 */

export interface ChapitreLivre { titre: string; texte: string }

export const slugLivre = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'livre';

const TITRE = /^\s*(chapitre|chap\.|livre|partie|acte|sc[èe]ne|pr[ée]face|pr[ée]ambule|introduction|conclusion|[ée]pilogue|prologue)\b[^\n]{0,70}$/i;
const ROMAIN = /^\s*[IVXLC]{1,7}\s*[.\-—]?\s*$/;

/** Coupe un texte long en paragraphes de lecture (au plus `max` caractères), de préférence aux sauts de ligne. */
function morceler(texte: string, max: number): string[] {
  const paras = texte.split(/\n{2,}/);
  const sortie: string[] = []; let cur = '';
  for (const p of paras) {
    if (cur && cur.length + p.length + 2 > max) { sortie.push(cur.trim()); cur = ''; }
    if (p.length > max) { // paragraphe géant : coupe aux phrases
      for (const ph of p.split(/(?<=[.!?…»])\s+/)) { if (cur && cur.length + ph.length + 1 > max) { sortie.push(cur.trim()); cur = ''; } cur += (cur ? ' ' : '') + ph; }
    } else cur += (cur ? '\n\n' : '') + p;
  }
  if (cur.trim()) sortie.push(cur.trim());
  return sortie;
}

/** Détecte les titres de chapitres ; sinon découpe en parties de longueur régulière. */
export function decouperChapitres(brut: string, opts: { cible?: number; max?: number } = {}): ChapitreLivre[] {
  const cible = opts.cible ?? 4500, max = opts.max ?? 7000;
  const texte = brut.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!texte) return [];
  const lignes = texte.split('\n');
  const reperes: { i: number; titre: string }[] = [];
  lignes.forEach((l, i) => {
    const t = l.trim();
    const avantVide = i === 0 || lignes[i - 1].trim() === '';
    if (avantVide && t.length > 0 && t.length <= 80 && (TITRE.test(t) || ROMAIN.test(t))) {
      // « Chapitre I » suivi d'un sous-titre sur la ligne suivante
      const suite = lignes[i + 1]?.trim();
      reperes.push({ i, titre: suite && suite.length < 60 && !/[.!?]$/.test(suite) && /^(chapitre|chap\.)/i.test(t) ? `${t} — ${suite}` : t });
    }
  });
  const chapitres: ChapitreLivre[] = [];
  if (reperes.length >= 2) {
    reperes.forEach((r, k) => {
      const fin = k + 1 < reperes.length ? reperes[k + 1].i : lignes.length;
      const corps = lignes.slice(r.i + 1, fin).join('\n').trim();
      if (corps.length < 80) return;
      const morceaux = morceler(corps, max);
      morceaux.forEach((m, j) => chapitres.push({ titre: morceaux.length > 1 ? `${r.titre} (${j + 1}/${morceaux.length})` : r.titre, texte: m }));
    });
    if (chapitres.length >= 2) return chapitres;
  }
  const morceaux = morceler(texte, cible);
  return morceaux.map((m, i) => ({ titre: `Partie ${i + 1}`, texte: m }));
}

// ------------------------------------------------------------------ quiz à trous
export interface QuestionLecture { enonce: string; options: string[]; bonne: number; mot: string }

function graine(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function alea(seed: number) { let a = seed || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const MOTS_VIDES = new Set(['cependant', 'pendant', 'lorsque', 'puisque', 'quoique', 'toutefois', 'parce', 'alors', 'ainsi', 'encore', 'toujours', 'jamais', 'depuis', 'comme', 'avait', 'étaient', 'avaient', 'était', 'leurs', 'cette', 'cettes', 'ceux', 'celle', 'celles', 'quelque', 'quelques', 'plusieurs', 'chaque', 'tout', 'tous', 'toute', 'toutes']);
export const motsDe = (texte: string) => texte.match(/[\p{L}’'-]+/gu) ?? [];

/** Jusqu'à `n` questions « complète la phrase » tirées du texte lu ; mêmes questions pour un même texte. */
export function quizLecture(texte: string, n = 3): QuestionLecture[] {
  const hasard = alea(graine(texte.slice(0, 400) + texte.length));
  const phrases = texte.replace(/\n+/g, ' ').split(/(?<=[.!?…»])\s+/).map(p => p.trim()).filter(p => p.length >= 50 && p.length <= 220);
  const riche = [...new Set(motsDe(texte).filter(m => m.length >= 6 && !MOTS_VIDES.has(m.toLowerCase())).map(m => m.toLowerCase()))];
  if (phrases.length === 0 || riche.length < 4) return [];
  const ordre = phrases.map((p, i) => ({ p, i, r: hasard() })).sort((a, b) => a.r - b.r);
  const questions: QuestionLecture[] = []; const pris = new Set<string>();
  for (const { p } of ordre) {
    if (questions.length >= n) break;
    const candidats = motsDe(p).slice(2).filter(m => m.length >= 6 && !MOTS_VIDES.has(m.toLowerCase()) && !pris.has(m.toLowerCase()));
    if (!candidats.length) continue;
    const mot = candidats[Math.floor(hasard() * candidats.length)];
    const bas = mot.toLowerCase();
    const proches = riche.filter(m => m !== bas && Math.abs(m.length - bas.length) <= 3);
    const pioche = (proches.length >= 3 ? proches : riche.filter(m => m !== bas)).map(m => ({ m, r: hasard() })).sort((a, b) => a.r - b.r).slice(0, 3).map(x => x.m);
    if (pioche.length < 3) continue;
    const casse = (m: string) => (mot[0] === mot[0].toUpperCase() && mot[0] !== mot[0].toLowerCase() ? m[0].toUpperCase() + m.slice(1) : m);
    const options = [bas, ...pioche].map(casse).map(m => ({ m, r: hasard() })).sort((a, b) => a.r - b.r).map(x => x.m);
    pris.add(bas);
    questions.push({ enonce: p.replace(mot, '_____'), options, bonne: options.indexOf(casse(bas)), mot });
  }
  return questions;
}

/** Temps de lecture estimé en minutes (200 mots par minute). */
export const minutesDeLecture = (texte: string) => Math.max(1, Math.round(motsDe(texte).length / 200));
