/**
 * Moteur de leçons d'Onenji : une leçon est une suite d'exercices ; chaque réponse est jugée ici.
 * Fin de leçon : XP et justesse. Fin d'unité : 4 bonnes réponses sur 5 pour valider.
 */
import { melanger, type Hasard } from './azeva';
import { nfc } from './encodage';
import type { NiveauAcces } from './acces';

/**
 * Types d'exercice. Les sept premiers existaient ; les six suivants complètent l'unité en 9 étapes du programme
 * (écouter, voir, dire, écrire, comprendre, proverbe, culture, jouer, vérifier ; audit Apprendre §8) :
 * - cours : présentation avant les contrôles (image, mot, son, explication), non notée ;
 * - dictee : on entend, on écrit (notée, plusieurs formes acceptées séparées par « / ») ;
 * - comprendre : petit dialogue ou texte (colonne « texte »), puis une question à choix (notée) ;
 * - proverbe et culture : cartes à lire et écouter, non notées ;
 * - jouer : renvoie vers un jeu gratuit d'Azeva (colonne « jeu_id »), non noté.
 */
export type TypeExercice = 'ecouter' | 'associer' | 'ordre' | 'dire' | 'choix' | 'trou' | 'saisie' | 'cours' | 'dictee' | 'comprendre' | 'proverbe' | 'culture' | 'jouer';
export const TYPES_EXERCICE: readonly TypeExercice[] = ['ecouter', 'associer', 'ordre', 'dire', 'choix', 'trou', 'saisie', 'cours', 'dictee', 'comprendre', 'proverbe', 'culture', 'jouer'];
export interface Exercice {
  id: string; lecon_id: string; type: TypeExercice; consigne?: string | null; mot_myene?: string | null; mot_francais?: string | null;
  options?: string[]; reponse?: string | null; indice?: string | null; image?: string | null; audio?: string | null; dialecte?: string | null; source?: string | null; ordre?: number | null;
  /** Texte long : dialogue (« A : … » une réplique par ligne), explication du cours, sens et usage du proverbe, note culturelle. */
  texte?: string | null;
  /** Conseil culturel montré en bulle pendant l'exercice (ex. « c'est la personne visitée qui salue la première »). */
  conseil?: string | null;
  /** Étape « jouer » : jeu d'Azeva proposé. */
  jeu_id?: string | null;
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

/** Types qui ne se notent pas : imitation (écouter, dire) et cartes (cours, proverbe, culture, jouer). */
export const TYPES_NON_NOTES: readonly TypeExercice[] = ['ecouter', 'dire', 'cours', 'proverbe', 'culture', 'jouer'];
const nonNote = (t: TypeExercice) => TYPES_NON_NOTES.includes(t);

/** Ponctuation ignorée dans une réponse écrite (dictée, saisie) : on juge les mots, pas les points. */
const sansPonctuation = (t: string) => cle(t).replace(/[.,;:!?«»"“”()…]/g, ' ').replace(/\s+/g, ' ').trim();

/** Juge une réponse. Les types non notés acceptent toute tentative (la voix n'est pas notée, les cartes se lisent). */
export function jugerReponse(ex: Exercice, reponse: string | string[]): boolean {
  if (nonNote(ex.type)) return true;
  const attendu = ex.reponse ?? '';
  const donne = Array.isArray(reponse) ? reponse.join(' ') : reponse;
  // Réponse écrite (contrôle 5, dictée) : plusieurs formes acceptées, séparées par « / » dans la colonne « reponse » (variantes dialectales).
  if (ex.type === 'saisie' || ex.type === 'dictee') return attendu.split('/').some(a => sansPonctuation(a) === sansPonctuation(donne) && sansPonctuation(a) !== '');
  return cle(donne) === cle(attendu);
}

export interface EtatLecon { index: number; bonnes: number; erreurs: number; termine: boolean; xp: number }
export const nouvelleLecon = (): EtatLecon => ({ index: 0, bonnes: 0, erreurs: 0, termine: false, xp: 0 });
export function avancerLecon(e: EtatLecon, ex: Exercice[], juste: boolean, xpLecon = XP_LECON): EtatLecon {
  const bonnes = e.bonnes + (juste ? 1 : 0), erreurs = e.erreurs + (juste ? 0 : 1), index = e.index + 1;
  const termine = index >= ex.length;
  return { index, bonnes, erreurs, termine, xp: termine ? xpLecon : 0 };
}
/** Exercices notés (imitation et cartes ne comptent ni en bien ni en mal). */
export const exerciceNote = (ex: Pick<Exercice, 'type'>) => !nonNote(ex.type);
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

// ------------------------------------------------------------------ test de niveau (décision de Capp, 13 nov. 2026)
/** Types d'exercice qui se notent (les autres ne servent pas au test). */
export const TYPES_NOTES = ['associer', 'choix', 'ordre', 'trou', 'saisie', 'dictee', 'comprendre'] as const;
export interface QuestionTest { ex: Exercice; parcoursId: string; uniteId: string }
/** Fin du test : 3 erreurs de suite. */
export const TEST_ERREURS_DE_SUITE = 3;

/**
 * Compose le test : de chaque étape (dans l'ordre des parcours), jusqu'à `parEtape` questions notées prises dans ses premières unités,
 * donc une difficulté croissante d'une étape à l'autre. Au plus `maximum` questions (15 par défaut).
 */
export function composerTestNiveau(parcours: Parcours[], unites: Unite[], lecons: Lecon[], exercices: Exercice[], parEtape = 3, maximum = 15): QuestionTest[] {
  const ord = <T extends { ordre?: number | null }>(l: T[]) => [...l].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const notes = new Set<string>(TYPES_NOTES);
  const res: QuestionTest[] = [];
  for (const p of ord(parcours)) {
    const pris: QuestionTest[] = [];
    for (const u of ord(unites.filter(x => x.parcours_id === p.id))) {
      for (const l of ord(lecons.filter(x => x.unite_id === u.id))) {
        for (const ex of ord(exercices.filter(x => x.lecon_id === l.id && notes.has(x.type)))) {
          if (pris.length < parEtape) pris.push({ ex, parcoursId: p.id, uniteId: u.id });
        }
      }
    }
    res.push(...pris);
    if (res.length >= maximum) break;
  }
  return res.slice(0, maximum);
}

/** Le test s'arrête-t-il après ces réponses ? (3 erreurs de suite, ou plus de questions) */
export function testTermine(reponses: boolean[], total: number): boolean {
  if (reponses.length >= total) return true;
  const fin = reponses.slice(-TEST_ERREURS_DE_SUITE);
  return fin.length === TEST_ERREURS_DE_SUITE && fin.every(x => !x);
}

/**
 * Point de départ : la première étape où l'apprenant a eu moins des deux tiers de bonnes réponses (ou n'a pas été interrogé),
 * en commençant à sa première unité. Tout réussi : la dernière étape interrogée. Sans question : la première étape.
 */
export function placementTest(questions: QuestionTest[], reponses: boolean[], parcours: Parcours[], unites: Unite[]): { parcoursId: string; uniteId: string | null } {
  const ord = [...parcours].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const premiereUnite = (pid: string) => [...unites.filter(u => u.parcours_id === pid)].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))[0]?.id ?? null;
  if (!ord.length) return { parcoursId: '', uniteId: null };
  const interroges = ord.filter(p => questions.some(q => q.parcoursId === p.id));
  for (const p of interroges) {
    const idx = questions.map((q, i) => (q.parcoursId === p.id ? i : -1)).filter(i => i >= 0);
    const repondues = idx.filter(i => i < reponses.length);
    const bonnes = repondues.filter(i => reponses[i]).length;
    if (repondues.length === 0 || bonnes * 3 < idx.length * 2) return { parcoursId: p.id, uniteId: premiereUnite(p.id) };
  }
  const derniere = interroges[interroges.length - 1] ?? ord[0];
  const suivante = ord[ord.indexOf(derniere) + 1];
  const cible = suivante && interroges.length ? suivante : derniere;
  return { parcoursId: cible.id, uniteId: premiereUnite(cible.id) };
}

/** Mode enfant : l'étape vient de l'âge (Ntina 3-7, Ogèndo 7-13, Emeno 13-21, Ikôkô 21+). */
export function etapeParAge(age: number): 'ntina' | 'ogendo' | 'emeno' | 'ikoko' {
  return age < 7 ? 'ntina' : age < 13 ? 'ogendo' : age < 21 ? 'emeno' : 'ikoko';
}

/** Accès d'une leçon : la colonne « niveau_acces » si elle est remplie ; sinon la première unité de chaque étape est libre, le reste demande un forfait. */
export function accesLecon(lecon: Lecon, unite: Unite, unitesDuParcours: Unite[]): string {
  if (lecon.niveau_acces) return lecon.niveau_acces;
  const premiere = [...unitesDuParcours].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))[0];
  return premiere && premiere.id === unite.id ? 'libre' : 'abonnement';
}

// ------------------------------------------------------------------ unité en 9 étapes (programme ; audit Apprendre §8)
export type EtapeUnite = 'ecouter' | 'voir' | 'dire' | 'ecrire' | 'comprendre' | 'proverbe' | 'culture' | 'jouer' | 'verifier';
export const ETAPES_UNITE: { id: EtapeUnite; label: string }[] = [
  { id: 'ecouter', label: 'Écouter' }, { id: 'voir', label: 'Voir' }, { id: 'dire', label: 'Dire' }, { id: 'ecrire', label: 'Écrire' },
  { id: 'comprendre', label: 'Comprendre' }, { id: 'proverbe', label: 'Proverbe' }, { id: 'culture', label: 'Culture' }, { id: 'jouer', label: 'Jouer' }, { id: 'verifier', label: 'Vérifier' },
];
/** Étape du programme à laquelle appartient un exercice. */
export function etapeDe(ex: Pick<Exercice, 'type' | 'image'>): EtapeUnite {
  switch (ex.type) {
    case 'ecouter': return 'ecouter';
    case 'cours': return ex.image ? 'voir' : 'ecouter';
    case 'associer': return 'voir';
    case 'dire': return 'dire';
    case 'dictee': case 'saisie': return 'ecrire';
    case 'comprendre': case 'ordre': case 'trou': return 'comprendre';
    case 'proverbe': return 'proverbe';
    case 'culture': return 'culture';
    case 'jouer': return 'jouer';
    default: return 'verifier';
  }
}
/** Étapes couvertes par les exercices d'une unité (le contrôle de fin d'unité compte pour « vérifier » dès qu'il y a des questions notées). */
export function etapesCouvertes(exercices: Pick<Exercice, 'type' | 'image'>[]): Set<EtapeUnite> {
  const s = new Set<EtapeUnite>(exercices.map(etapeDe));
  if (exercices.some(exerciceNote)) s.add('verifier');
  return s;
}

// ------------------------------------------------------------------ variante (dialecte) de l'apprenant
/** Variante par défaut : ôrungu (audit §8.3). Les autres sont étiquetées. */
export const VARIANTE_DEFAUT = 'orungu';
const codeVariante = (d?: string | null) => {
  const c = nfc(d ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (!c) return '';
  if (c.includes('orungu')) return 'orungu';
  if (c.includes('mpong')) return 'mpongwe';
  if (c.includes('galoa') || c.includes('galwa')) return 'galwa';
  if (c.includes('nkomi')) return 'nkomi';
  if (c.includes('adyumba') || c.includes('ajumba')) return 'adyumba';
  if (c.includes('enenga')) return 'enenga';
  return c;
};
/**
 * Garde, pour chaque position (colonne « ordre ») d'une leçon, l'exercice de la variante choisie ; à défaut celui sans dialecte (commun),
 * puis celui en ôrungu, puis le premier. Un auteur peut ainsi donner plusieurs variantes d'un même exercice à la même position.
 */
export function filtrerVariante<T extends Pick<Exercice, 'lecon_id' | 'ordre' | 'dialecte'>>(exercices: T[], variante: string = VARIANTE_DEFAUT): T[] {
  const v = codeVariante(variante) || VARIANTE_DEFAUT;
  const groupes = new Map<string, T[]>();
  const sansOrdre: T[] = [];
  for (const e of exercices) {
    if (e.ordre === null || e.ordre === undefined || Number.isNaN(Number(e.ordre))) { sansOrdre.push(e); continue; }
    const k = `${e.lecon_id}#${Number(e.ordre)}`;
    groupes.set(k, [...(groupes.get(k) ?? []), e]);
  }
  const choisis: T[] = [];
  for (const g of groupes.values()) {
    if (g.length === 1) { choisis.push(g[0]); continue; }
    choisis.push(g.find(e => codeVariante(e.dialecte) === v) ?? g.find(e => !codeVariante(e.dialecte)) ?? g.find(e => codeVariante(e.dialecte) === VARIANTE_DEFAUT) ?? g[0]);
  }
  const garde = new Set<T>([...choisis, ...sansOrdre]);
  return exercices.filter(e => garde.has(e));
}

// ------------------------------------------------------------------ carnet de mots nourri par les leçons
export interface MotLecon { mot: string; sens: string; source?: string | null; dialecte?: string | null; audio?: string | null }
/** Mots myènè d'une liste d'exercices (avec leur traduction), sans doublon ; les phrases à trous sont ignorées. */
export function motsDesExercices(exercices: Exercice[]): MotLecon[] {
  const vus = new Set<string>(); const res: MotLecon[] = [];
  for (const e of exercices) {
    const mot = (e.mot_myene ?? '').trim(), sens = (e.mot_francais ?? '').trim();
    if (!mot || !sens || /_{2,}/.test(mot) || e.type === 'proverbe' || e.type === 'culture') continue;
    const k = cle(mot); if (vus.has(k)) continue; vus.add(k);
    res.push({ mot, sens, source: e.source ?? null, dialecte: e.dialecte ?? null, audio: e.audio ?? null });
  }
  return res;
}

/** Dialogue de l'étape « comprendre » : une réplique par ligne, « Nom : texte » (sans nom : narration). */
export function repliques(texte?: string | null): { qui: string | null; dit: string }[] {
  return (texte ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const m = /^([^:]{1,24})\s*:\s*(.+)$/.exec(l);
    return m ? { qui: m[1].trim(), dit: m[2].trim() } : { qui: null, dit: l };
  });
}

// ------------------------------------------------------------------ unité suivante
/** Première unité (dans l'ordre du parcours) qui suit `uniteId`, ou celle du parcours suivant. */
export function uniteSuivante(uniteId: string, parcours: Parcours[], unites: Unite[]): { unite: Unite; parcours: Parcours } | null {
  const ord = <X extends { ordre?: number | null }>(l: X[]) => [...l].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const liste: { unite: Unite; parcours: Parcours }[] = [];
  for (const p of ord(parcours)) for (const u of ord(unites.filter(x => x.parcours_id === p.id))) liste.push({ unite: u, parcours: p });
  const i = liste.findIndex(x => x.unite.id === uniteId);
  return i >= 0 && i + 1 < liste.length ? liste[i + 1] : null;
}

// ------------------------------------------------------------------ certificat numéroté
/** Numéro lisible d'un certificat : NKL-AAAA-000123 (le serveur attribue le rang). */
export const numeroCertificat = (rang: number, annee: number) => `NKL-${annee}-${String(Math.max(1, Math.floor(rang))).padStart(6, '0')}`;
export const NUMERO_CERTIFICAT = /^NKL-\d{4}-\d{6}$/;
/** Toutes les unités d'un parcours sont-elles validées ? (condition du certificat) */
export const parcoursTermine = (parcoursId: string, unites: Pick<Unite, 'id' | 'parcours_id'>[], validees: readonly string[]) => {
  const u = unites.filter(x => x.parcours_id === parcoursId);
  return u.length > 0 && u.every(x => validees.includes(x.id));
};

// ------------------------------------------------------------------ Igolani : accès vidéo par vidéo (décision de Capp, 13 nov. 2026, 0 h 53)
/** Cours d'artisans « long » : vendu à l'achat par défaut (au-delà de cette durée totale, en minutes). */
export const DUREE_COURS_LONG_MIN = 60;
export interface CoursVideo { id: string; niveau_acces?: string | null; categorie?: string | null; artisan?: string | null; duree_min?: number | string | null }
export interface ChapitreVideo { id: string; ordre?: number | string | null; debut_s?: number | string | null; niveau_acces?: string | null }
const estArtisan = (c: CoursVideo) => String(c.categorie || (c.artisan ? 'Artisans' : '')).toLowerCase().startsWith('artisan');
/**
 * Accès d'un chapitre d'une vidéo de la vidéothèque :
 * - colonne « niveau_acces » du chapitre si remplie, sinon celle de la vidéo (réglage vidéo par vidéo) ;
 * - sinon, règle par défaut : premier chapitre gratuit avec publicité, la suite au forfait, et à l'achat pour un cours d'artisan long.
 * Une vidéo sans chapitre se traite comme un seul chapitre (donc gratuit avec publicité par défaut).
 */
export function accesChapitreVideo(cours: CoursVideo, chapitres: ChapitreVideo[], index: number): NiveauAcces {
  const ch = [...chapitres].sort((a, b) => (Number(a.ordre) || 0) - (Number(b.ordre) || 0))[index];
  if (ch?.niveau_acces) return ch.niveau_acces as NiveauAcces;
  if (cours.niveau_acces) return cours.niveau_acces as NiveauAcces;
  if (index <= 0) return 'gratuit_avec_pub';
  return estArtisan(cours) && (Number(cours.duree_min) || 0) >= DUREE_COURS_LONG_MIN ? 'achat' : 'abonnement';
}
/** Accès le plus exigeant de la vidéo (celui de ses chapitres après le premier) : ce qu'il faut pour tout regarder. */
export function accesCompletVideo(cours: CoursVideo, chapitres: ChapitreVideo[]): NiveauAcces {
  const n = Math.max(1, chapitres.length);
  const ordre: NiveauAcces[] = ['libre', 'gratuit_avec_pub', 'essai', 'abonnement', 'location', 'achat', 'reserve'];
  let pire: NiveauAcces = accesChapitreVideo(cours, chapitres, 0);
  for (let i = 1; i < n; i++) { const a = accesChapitreVideo(cours, chapitres, i); if (ordre.indexOf(a) > ordre.indexOf(pire)) pire = a; }
  return pire;
}
/**
 * Seconde où s'arrête la partie gratuite : début du premier chapitre dont l'accès n'est ni « libre » ni « gratuit_avec_pub ».
 * null = toute la vidéo est gratuite.
 */
export function finPartieGratuite(cours: CoursVideo, chapitres: ChapitreVideo[]): number | null {
  const ch = [...chapitres].sort((a, b) => (Number(a.ordre) || 0) - (Number(b.ordre) || 0));
  for (let i = 0; i < Math.max(1, ch.length); i++) {
    const a = accesChapitreVideo(cours, ch, i);
    if (a !== 'libre' && a !== 'gratuit_avec_pub') return i === 0 ? 0 : Math.max(0, Number(ch[i]?.debut_s) || 0);
  }
  return null;
}
