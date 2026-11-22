/**
 * Lexique de référence du myènè, consulté à chaque question posée à Kak'Igonjo : pour chaque mot de la question (français ou myènè),
 * les entrées attestées du corpus sont placées dans le prompt système. C'est ce qui permet au modèle de composer des phrases
 * uniquement avec des mots attestés, sans recourir à d'autres langues.
 *
 * Deux sources :
 *  1. le vocabulaire des cours d'Onenji (packages/noyau/contenu/exercices.json, dans le dépôt, déjà relu) ;
 *  2. le lexique consolidé du corpus, construit par server/scripts/construire_lexique_myene.py et copié HORS du dépôt
 *     (ouvrages protégés) dans le dossier du corpus : `${EMBEDDINGS_DIR}/.nkala/lexique_myene.json` (dossier caché, non indexé).
 *     Variable facultative : LEXIQUE_MYENE_FICHIER (chemin complet).
 * Sans le fichier 2, seuls les mots des cours sont proposés : rien ne casse.
 * Aucune entrée transmise au modèle ne porte de nom d'auteur ni de page (règle : aucune référence aux sources pour l'apprenant).
 */
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sansAccents } from './ia.ts';

export interface EntreeLexique { f: string; s: string; v: string; r: number; i?: string }
interface Index { entrees: EntreeLexique[]; parMot: Map<string, number[]>; rejets: { f: string; s: string; regle: string }[]; charge: string; mtime: number }

// Le lexique du corpus est reconstruit depuis le lexique v3 (17_edition_DONDO_myene/v3_rekanga_2026-11-21/01_lexique/) par
// server/scripts/construire_lexique_myene.py ; les cours d'Onênji sont en v3 depuis la conversion du 22 nov. 2026.
const ICI = path.dirname(fileURLToPath(import.meta.url));
const EXERCICES = path.resolve(ICI, '../../../packages/noyau/contenu/exercices.json');
export const fichierLexique = (env = process.env) => env.LEXIQUE_MYENE_FICHIER || path.join(env.EMBEDDINGS_DIR || '/data/embeddings', '.nkala', 'lexique_myene.json');

/** Mots français sans valeur pour la recherche dans les sens. */
const VIDES = new Set(('le la les un une des de du d l au aux et ou en dans sur sous par pour avec sans ce cet cette ces qui que quoi dont est sont etre avoir '
  + 'je tu il elle on nous vous ils elles me te se moi toi lui leur mon ma mes ton ta tes son sa ses notre votre nos vos ne pas plus tres bien '
  + 'comment dit dire dis traduis traduire traduction phrase phrases mot mots myene omyene orungu langue veut veux voudrais peux pourrais '
  + 'faire fait donne donner ecris ecrire stp svp merci quel quelle quels quelles est-ce aussi alors mais donc car voici voila cela ca '
  + 'litt cl caus syn voir sg pl adj adv').split(' '));

/** Forme réduite d'un mot pour l'appariement : sans accents, minuscules, pluriel français simple retiré. */
export const radical = (m: string) => {
  let x = sansAccents(m).replace(/[^a-z0-9ɛɔñ]/g, '');
  if (x.length > 4 && /(s|x)$/.test(x)) x = x.slice(0, -1);
  return x;
};
const mots = (t: string) => sansAccents(t).split(/[^a-z0-9ɛɔñ'’-]+/).flatMap(m => m.split(/['’-]/)).map(radical).filter(m => m.length >= 3 && !VIDES.has(m));

let cache: Index | null = null;

function lireJson(f: string): any { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } }

function construire(): Index {
  const entrees: EntreeLexique[] = [];
  // 1) cours d'Onenji : paires mot myènè / sens, déjà normalisées et relues
  const ex = lireJson(EXERCICES);
  const vus = new Set<string>();
  if (Array.isArray(ex)) for (const e of ex) {
    const f = String(e?.mot_myene ?? '').trim(), s = String(e?.mot_francais ?? '').trim();
    if (!f || !s || f.length > 80) continue;
    const k = `${f.toLowerCase()}|${s.toLowerCase()}`;
    if (vus.has(k)) continue;
    vus.add(k);
    entrees.push({ f, s, v: 'orungu (cours)', r: 0.5 });
  }
  // 2) lexique consolidé du corpus (hors dépôt)
  const fichier = fichierLexique();
  const lex = lireJson(fichier);
  let mtime = 0;
  try { mtime = statSync(fichier).mtimeMs; } catch { /* absent */ }
  if (lex?.entrees) for (const e of lex.entrees as EntreeLexique[]) if (e?.f && e?.s) entrees.push({ f: e.f, s: e.s, v: e.v, r: Number(e.r) || 4, ...(e.i ? { i: e.i } : {}) });
  const parMot = new Map<string, number[]>();
  entrees.forEach((e, n) => {
    for (const m of new Set([...mots(e.s), ...mots(e.f).map(x => 'mye:' + x)])) {
      const l = parMot.get(m); if (l) l.push(n); else parMot.set(m, [n]);
    }
  });
  return { entrees, parMot, rejets: Array.isArray(lex?.rejets) ? lex.rejets : [], charge: lex ? fichier : '', mtime };
}

/** Index en mémoire, reconstruit si le fichier du lexique a changé (copie d'une nouvelle version sur le serveur). */
export function indexLexique(): Index {
  let mtime = 0;
  try { mtime = statSync(fichierLexique()).mtimeMs; } catch { /* absent */ }
  if (!cache || cache.mtime !== mtime) cache = construire();
  return cache;
}

/**
 * Entrées utiles pour une question : un mot de la question qui figure dans le sens (français) ou dans la forme (myènè).
 * Classement : nombre de mots trouvés, sûreté de la source (validé > cours > orungu > galwa > mpongwè), sens court (vraie définition).
 */
export function chercherLexique(question: string, max = 30): EntreeLexique[] {
  const idx = indexLexique();
  const qm = [...new Set(mots(question))].slice(0, 30);
  const score = new Map<number, number>();
  for (const m of qm) {
    for (const n of idx.parMot.get(m) ?? []) score.set(n, (score.get(n) ?? 0) + 1);
    for (const n of idx.parMot.get('mye:' + m) ?? []) score.set(n, (score.get(n) ?? 0) + 1.5);
  }
  // Chaque mot de la question garde au moins ses meilleures entrées (sinon un mot fréquent écrase les autres).
  const choisis = new Set<number>();
  const rang = (n: number) => { const e = idx.entrees[n]; return -(score.get(n) ?? 0) * 10 + e.r + Math.min(e.s.length, 160) / 80; };
  for (const m of qm) {
    const l = [...(idx.parMot.get(m) ?? []), ...(idx.parMot.get('mye:' + m) ?? [])].sort((a, b) => rang(a) - rang(b)).slice(0, 4);
    l.forEach(n => choisis.add(n));
  }
  [...score.keys()].sort((a, b) => rang(a) - rang(b)).slice(0, max).forEach(n => choisis.add(n));
  return [...choisis].sort((a, b) => rang(a) - rang(b)).slice(0, max).map(n => idx.entrees[n]);
}

/** Bloc du prompt système : entrées trouvées + formes refusées concernées. Vide si rien n'est trouvé. */
export function blocLexique(question: string, max = 30): string {
  const t = chercherLexique(question, max);
  const qm = new Set(mots(question));
  const rej = indexLexique().rejets.filter(r => mots(r.s + ' ' + r.f).some(m => qm.has(m)));
  if (!t.length && !rej.length) return '';
  let b = '\n\n### Lexique trouvé pour cette question (mots attestés ; seuls mots myènè que tu peux employer en plus de la liste vérifiée)\n'
    + t.map(e => `- ${e.f}${e.i ? ` [${e.i}]` : ''} : ${e.s} — ${e.v}`).join('\n');
  if (rej.length) b += '\nFormes refusées (ne jamais les employer) :\n' + rej.map(r => `- ${r.f} : ${r.regle}`).join('\n');
  return b;
}

/** Mots-outils de la grammaire (pronoms, marques de temps, particules, formules) : toujours connus. */
const OUTILS = ('mi ma mya my myè myé wé we wa é e a ayè zé ze za zwa azwè azwé nwé nwe né ne na nwa anwè wi wawo awè bé be go g gô ni n ga pa i re ré '
  + 'zélé zele wéré were ndô ndo kondènè sé se nde nd ndé w y z ny m s mbolo mbôluani akéwa mpolo salé nyéza izami iyami izô iyô izè iyè izazo iyazo izani iyani izawo iyawo '
  + 'igomi agom ambani araro anayi atani nkama ntozèni'
  // graphie v3 (règles de référence v3.3, 22 nov. 2026)
  + ' myê wê ê zê nwê awê ayê azwê anwê wao akewa sale nyeza izê iyê ntozêni ncaro ezele ndo sê gwe mya ïnde').split(' ');

let formes: { cle: string; ensemble: Set<string> } | null = null;
/** Le mot (graphie DONDO) est-il attesté : lexique, cours, mots fixés de la grammaire ? Comparaison sans accents ni majuscules. */
export function formeConnue(mot: string): boolean {
  const idx = indexLexique();
  const cle = `${idx.entrees.length}:${idx.mtime}`;
  if (!formes || formes.cle !== cle) {
    const ensemble = new Set<string>(OUTILS.map(radicalMyene));
    for (const e of idx.entrees) for (const m of e.f.split(/[\s,;:!?.()«»"…/]+/)) for (const p of m.split(/['’]/)) { const r = radicalMyene(p); if (r) ensemble.add(r); }
    formes = { cle, ensemble };
  }
  const r = radicalMyene(mot);
  return !r || formes.ensemble.has(r);
}
const radicalMyene = (m: string) => sansAccents(m).replace(/[^a-z0-9ɛɔñ]/g, '');

/** Mots myènè d'un texte qui ne sont pas attestés (les mots entre astérisques, gardés en français, sont ignorés). */
export function motsNonAttestes(texte: string, francaisGardes: string[] = []): string[] {
  const garde = new Set(francaisGardes.flatMap(f => f.split(/\s+/)).map(radicalMyene));
  const sans = texte.replace(/\*[^*]+\*/g, ' ');
  const vus = new Set<string>(), sortie: string[] = [];
  for (const brut of sans.split(/[\s,;:!?.()«»"…/—–-]+/)) for (const m of brut.split(/['’]/)) {
    const r = radicalMyene(m);
    if (!r || /^\d+$/.test(r) || garde.has(r) || vus.has(r)) continue;
    vus.add(r);
    if (!formeConnue(m)) sortie.push(m);
  }
  return sortie;
}

/** Mots français courants : un message qui en contient est du français, même avec quelques mots myènè. */
let francais: Set<string> | null = null;
// Construit au premier usage (import circulaire avec ia.ts : sansAccents n'existe pas encore au chargement du module).
const FRANCAIS_MOTS = (('le la les un une des de du et ou en dans sur pour avec que qui quoi comment pourquoi est sont je tu il elle nous vous ils elles '
  + 'mon ma mes ton ta tes son sa ses ce cette ces pas ne plus tres bien dit dire veut bonjour merci oui non quel quelle quels quelles traduis traduire '
  + 'mot mots phrase myene myènè langue aujourd hui demain hier').split(' '));
const FRANCAIS = () => (francais ??= new Set(FRANCAIS_MOTS.map(radicalMyene)));
/**
 * Le message est-il écrit en myènè ? (au moins 2 mots, au moins 60 % reconnus dans le lexique ou la grammaire, et pas plus d'un mot
 * français courant). Sert à rappeler au modèle de répondre en myènè seulement (règle 5 des règles de référence v3.3).
 */
export function messageEnMyene(message: string): boolean {
  const mots = message.split(/[\s,;:!?.()«»"…/—–-]+/).flatMap(m => m.split(/['’]/)).map(radicalMyene).filter(m => m.length >= 2 && !/^\d+$/.test(m));
  if (mots.length < 2) return false;
  const fr = FRANCAIS();
  const nbFr = mots.filter(m => fr.has(m)).length;
  const myene = mots.filter(m => !fr.has(m) && formeConnue(m)).length;
  return nbFr <= 1 && myene / mots.length >= 0.6;
}

export const etatLexique = () => { const i = indexLexique(); return { entrees: i.entrees.length, corpus: !!i.charge, fichier: fichierLexique() }; };
