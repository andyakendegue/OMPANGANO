/**
 * Moteur de leçons d'Onenji : une leçon est une suite d'exercices ; chaque réponse est jugée ici.
 * Fin de leçon : XP et justesse. Fin d'unité : 4 bonnes réponses sur 5 pour valider.
 */
import { melanger, type Hasard } from './azeva';
import { nfc } from './encodage';

export type TypeExercice = 'ecouter' | 'associer' | 'ordre' | 'dire' | 'choix';
export interface Exercice {
  id: string; lecon_id: string; type: TypeExercice; consigne?: string | null; mot_myene?: string | null; mot_francais?: string | null;
  options?: string[]; reponse?: string | null; indice?: string | null; image?: string | null; audio?: string | null; dialecte?: string | null; source?: string | null; ordre?: number | null;
}
export interface Lecon { id: string; unite_id: string; titre: string; titre_myene?: string | null; duree_min?: number | null; xp?: number | null; mode?: string | null; niveau_acces?: string | null; ordre?: number | null }
export interface Unite { id: string; parcours_id: string; titre: string; titre_myene?: string | null; description?: string | null; ordre?: number | null }
export interface Parcours { id: string; titre: string; titre_myene?: string | null; etape_vie?: string | null; cycle?: number | null; description?: string | null; couleur?: string | null; image?: string | null; ordre?: number | null }

const cle = (t: string) => nfc(t).toLowerCase().replace(/\s+/g, ' ').trim();
export const XP_LECON = 15;
export const SEUIL_UNITE = { bonnes: 4, sur: 5 } as const;

/** Options affichées d'un exercice : bonne réponse + leurres, dans un ordre mélangé (sauf « ordre » : mots mélangés). */
export function optionsDe(ex: Exercice, hasard: Hasard = Math.random): string[] {
  const base = ex.options && ex.options.length ? ex.options : ex.reponse ? [ex.reponse] : [];
  if (ex.type === 'ordre') {
    const mots = ex.options && ex.options.length ? ex.options : (ex.reponse ?? '').split(/\s+/).filter(Boolean);
    let m = melanger(mots, hasard);
    for (let i = 0; i < 8 && m.join(' ') === mots.join(' ') && mots.length > 1; i++) m = melanger(mots, hasard);
    return m;
  }
  const avecBonne = ex.reponse && !base.some(o => cle(o) === cle(ex.reponse!)) ? [...base, ex.reponse] : base;
  return melanger(avecBonne, hasard);
}

/** Juge une réponse. « ecouter » et « dire » sont des exercices d'imitation : toute tentative est acceptée (la voix n'est pas notée). */
export function jugerReponse(ex: Exercice, reponse: string | string[]): boolean {
  if (ex.type === 'ecouter' || ex.type === 'dire') return true;
  const attendu = ex.reponse ?? '';
  const donne = Array.isArray(reponse) ? reponse.join(' ') : reponse;
  return cle(donne) === cle(attendu);
}

export interface EtatLecon { index: number; bonnes: number; erreurs: number; termine: boolean; xp: number }
export const nouvelleLecon = (): EtatLecon => ({ index: 0, bonnes: 0, erreurs: 0, termine: false, xp: 0 });
export function avancerLecon(e: EtatLecon, ex: Exercice[], juste: boolean, xpLecon = XP_LECON): EtatLecon {
  const bonnes = e.bonnes + (juste ? 1 : 0), erreurs = e.erreurs + (juste ? 0 : 1), index = e.index + 1;
  const termine = index >= ex.length;
  return { index, bonnes, erreurs, termine, xp: termine ? xpLecon : 0 };
}
/** Justesse en pourcentage sur les exercices notés. */
export const justesse = (e: Pick<EtatLecon, 'bonnes' | 'erreurs'>) => { const t = e.bonnes + e.erreurs; return t ? Math.round((e.bonnes / t) * 100) : 100; };

export interface ProgressionOnenji { leconsTerminees: Record<string, { justesse: number; le: string }>; unitesValidees: string[]; xp: number; serie: number; derniereActivite: string | null; recordSerie: number; jours: string[] }
export const progressionVide = (): ProgressionOnenji => ({ leconsTerminees: {}, unitesValidees: [], xp: 0, serie: 0, derniereActivite: null, recordSerie: 0, jours: [] });

const veille = (jour: string) => { const d = new Date(jour + 'T12:00:00'); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** Série quotidienne : +1 si l'activité d'hier existe, 1 si la série est rompue, inchangée le même jour. Un jour de repos est protégé par `reposProtege`. */
export function majSerie(p: ProgressionOnenji, jour: string, reposProtege = false): ProgressionOnenji {
  if (p.derniereActivite === jour) return p;
  const hier = veille(jour);
  const avantHier = veille(hier);
  const continue_ = p.derniereActivite === hier || (reposProtege && p.derniereActivite === avantHier);
  const serie = continue_ ? p.serie + 1 : 1;
  return { ...p, serie, recordSerie: Math.max(p.recordSerie, serie), derniereActivite: jour, jours: [...new Set([...p.jours, jour])].slice(-120) };
}
export function terminerLecon(p: ProgressionOnenji, lecon: Lecon, e: EtatLecon, jour: string): ProgressionOnenji {
  const deja = p.leconsTerminees[lecon.id];
  const base = majSerie(p, jour);
  return { ...base, xp: base.xp + (deja ? 0 : e.xp), leconsTerminees: { ...base.leconsTerminees, [lecon.id]: { justesse: Math.max(deja?.justesse ?? 0, justesse(e)), le: jour } } };
}
export const uniteValidee = (bonnes: number, sur: number) => sur >= 1 && bonnes / sur >= SEUIL_UNITE.bonnes / SEUIL_UNITE.sur;

/** Une leçon est ouverte si la précédente de la même unité est terminée (la première est toujours ouverte). */
export function leconOuverte(lecons: Lecon[], id: string, p: ProgressionOnenji): boolean {
  const l = [...lecons].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const i = l.findIndex(x => x.id === id);
  return i <= 0 || !!p.leconsTerminees[l[i - 1].id];
}
export const progressionUnite = (lecons: Lecon[], p: ProgressionOnenji) => lecons.length ? lecons.filter(l => p.leconsTerminees[l.id]).length / lecons.length : 0;
