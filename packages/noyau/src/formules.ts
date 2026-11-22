/**
 * Ce qui est gratuit et ce qui demande un forfait (décision de Capp, 15 nov. 2026) :
 * - les cours d'Onênji (Inenga : leçons, contrôles, test de niveau) sont gratuits ;
 * - la bibliothèque est gratuite ;
 * - Igôlani (la vidéothèque) et les cours d'artisans : en streaming seulement (15 nov. 2026), jamais à l'unité ; le premier
 *   chapitre est gratuit avec publicité, la suite s'ouvre avec une formule qui inclut Igôlani (Premium les inclut tous) ;
 * - seuls les cours avec un professeur (masterclass) se paient à la séance ;
 * - l'IA (Kak'Igonjo et tout ce qui appelle le modèle) demande un forfait ; sans forfait, quelques questions gratuites
 *   chaque semaine pour la découvrir.
 * Le serveur reste seul juge ; l'application s'en sert pour l'affichage.
 */

import type { Decision } from './acces';

/** Questions gratuites à l'IA par semaine sans forfait (réglable par les administrateurs : `ia_quotas.questionsGratuitesSemaine`). */
export const QUESTIONS_IA_GRATUITES_SEMAINE = 5;

/**
 * Règle d'un contenu gratuit : seul le rang (progression) peut encore le retenir ; le niveau d'accès payant et les formules
 * (« plans ») ne s'appliquent plus aux cours ni à la bibliothèque.
 */
export const regleSansFormule = (x: { rang_min?: unknown } | null | undefined): { rang_min?: number } => {
  const r = Number(x?.rang_min);
  return Number.isFinite(r) && r > 0 ? { rang_min: r } : {};
};

/**
 * Avantages réglables formule par formule dans la console (colonne « avantages » des formules), en plus de l'accès à l'IA
 * (colonne « ia »), des vidéos d'Igôlani (« igolani ») et des parties sans publicité (« sans_pub »). Décision de Capp du
 * 15 nov. 2026 : formules Oma, Inina, Anyambiè. Premium (« tout ») donne tous les avantages.
 */
export const AVANTAGES = [
  { id: 'traducteur', libelle: 'Traducteur automatique', module: 'traducteur' },
  { id: 'synthese_audio', libelle: 'Outils de synthèse audio', module: 'onenji' },
  { id: 'musique_hors_ligne', libelle: 'Musique hors ligne (téléchargements)', module: 'ontci' },
  { id: 'replay', libelle: 'Replay de la télévision et de la radio', module: 'ontci' },
  { id: 'photos_360', libelle: 'Photos 360° dans les annonces', module: 'nkala' },
] as const;
export type Avantage = typeof AVANTAGES[number]['id'];
export type ModeIa = 'aucune' | 'limitee' | 'complete';
/** Le compte a-t-il cet avantage (personnel compris) ? */
export const aAvantage = (d: { avantages?: readonly string[] | null; role?: string } | null | undefined, cle: Avantage) =>
  ['admin', 'validator'].includes(d?.role ?? '') || !!d?.avantages?.includes(cle);
/** Meilleur accès à l'IA parmi plusieurs formules. */
export const meilleurIa = (a: ModeIa, b: ModeIa): ModeIa => (a === 'complete' || b === 'complete' ? 'complete' : a === 'limitee' || b === 'limitee' ? 'limitee' : 'aucune');

export interface EtatIa {
  /** Abonnement en cours (ancien comportement : un abonnement sans formule précisée ouvre l'IA complète). */
  abonne: boolean;
  /** Accès à l'IA donné par les formules actives ; prioritaire sur `abonne` quand il est renseigné. */
  ia?: ModeIa;
  /** Questions par semaine d'une formule à IA limitée (la plus généreuse des formules actives). */
  questionsFormule?: number | null;
  /** Personnel (administrateur, modérateur, validateur) : jamais limité par le forfait. */
  personnel?: boolean;
  /** Questions déjà posées depuis le début de la semaine (lundi 0 h). */
  questionsSemaine: number;
  /** Questions gratuites par semaine ; à défaut, QUESTIONS_IA_GRATUITES_SEMAINE. */
  gratuitesSemaine?: number;
}

export type DroitIa =
  | { ok: true; forfait: true; restantes: null }
  | { ok: true; forfait: false; restantes: number }
  | { ok: false; forfait: false; restantes: 0; gratuitesSemaine: number };

/** Peut-on poser une question à l'IA maintenant ? `restantes` compte les questions gratuites qui resteront APRÈS celle-ci. */
export function droitIa(e: EtatIa): DroitIa {
  if (e.personnel || e.ia === 'complete' || (e.ia === undefined && e.abonne)) return { ok: true, forfait: true, restantes: null };
  const gratuit = Number.isFinite(e.gratuitesSemaine) && (e.gratuitesSemaine as number) >= 0 ? Math.floor(e.gratuitesSemaine as number) : QUESTIONS_IA_GRATUITES_SEMAINE;
  // Formule à IA limitée : son nombre de questions par semaine (jamais moins que sans formule).
  const g = e.ia === 'limitee' ? Math.max(gratuit, Math.floor(Number(e.questionsFormule) || 0)) : gratuit;
  const deja = Math.max(0, Math.floor(e.questionsSemaine) || 0);
  if (deja >= g) return { ok: false, forfait: false, restantes: 0, gratuitesSemaine: g };
  return { ok: true, forfait: false, restantes: g - deja - 1 };
}

/** Message affiché quand les questions gratuites de la semaine sont épuisées. */
export const messageForfaitIa = (gratuites: number) =>
  `Tu as posé tes ${gratuites} question${gratuites > 1 ? 's' : ''} de la semaine. Pour aller plus loin, choisis une formule qui inclut Kak'Igonjo ; tes questions reviennent lundi.`;

/**
 * Peut-on regarder une partie de vidéo d'Igôlani ? Streaming seulement : « libre » et « gratuit_avec_pub » pour tous ;
 * « abonnement » avec une formule qui ouvre Igôlani (`droits.igolani`) ; « reserve » pour le personnel. Aucun achat à l'unité.
 */
export function peutRegarderVideo(niveau: string, droits: { igolani?: boolean; role?: string } | null | undefined, personnel = false): Decision {
  if (personnel) return { ok: true, avecPub: false };
  if (niveau === 'libre') return { ok: true, avecPub: false };
  if (niveau === 'gratuit_avec_pub') return { ok: true, avecPub: !droits?.igolani };
  if (niveau === 'reserve') return ['admin', 'validator'].includes(droits?.role ?? '') ? { ok: true, avecPub: false } : { ok: false, motif: 'role_requis' };
  return droits?.igolani ? { ok: true, avecPub: false } : { ok: false, motif: 'abonnement_requis' };
}

// ------------------------------------------------------------------ les trois formules (décision de Capp du 15 nov. 2026)
/** Réglages d'une formule (collection « plans ») : tout est modifiable dans la console (Formules). */
export interface ReglagesFormule {
  id: string; titre: string; ordre?: number; tout?: boolean; igolani?: boolean; sans_pub?: string[];
  ia?: ModeIa; ia_questions_semaine?: number | null; avantages?: string[]; description?: string;
}
/**
 * Formules par défaut : chaque palier reprend le précédent. Oma : IA limitée, sans publicité (musique et annonces comprises) ;
 * Inina : + cours vidéo (Igôlani), musique hors ligne, photos 360° ; Anyambiè : tout, assistant IA complet, traducteur
 * automatique, synthèse audio, replay de la télévision et de la radio. Prix mensuels de départ : 5 000, 10 000, 20 000 F CFA.
 */
export const FORMULES_PAR_DEFAUT: { plan: ReglagesFormule; prix_fcfa: number }[] = [
  { plan: { id: 'oma', titre: 'Oma', ordre: 1, ia: 'limitee', ia_questions_semaine: 30, sans_pub: ['tout'], igolani: false, avantages: [] }, prix_fcfa: 5000 },
  { plan: { id: 'inina', titre: 'Inina', ordre: 2, ia: 'limitee', ia_questions_semaine: 30, sans_pub: ['tout'], igolani: true, avantages: ['musique_hors_ligne', 'photos_360'] }, prix_fcfa: 10_000 },
  { plan: { id: 'anyambie', titre: 'Anyambiè', ordre: 3, tout: true, ia: 'complete', sans_pub: ['tout'], igolani: true, avantages: AVANTAGES.map(a => a.id) }, prix_fcfa: 20_000 },
];
/** Ce que donne une formule, en phrases courtes, d'après ses réglages (boutique) : la description suit la console. */
export function avantagesFormule(p: Partial<ReglagesFormule> | null | undefined): string[] {
  if (!p) return [];
  const r: string[] = [];
  const ia = p.tout ? 'complete' : p.ia ?? 'aucune';
  if (ia === 'complete') r.push('Kak\'Igonjo, l\'assistant IA, sans limite de questions');
  else if (ia === 'limitee') r.push(`Kak'Igonjo : ${Math.max(Number(p.ia_questions_semaine) || 0, QUESTIONS_IA_GRATUITES_SEMAINE)} questions par semaine`);
  const sp = Array.isArray(p.sans_pub) ? p.sans_pub : [];
  if (p.tout || sp.includes('tout') || (sp as unknown) === 'oui') r.push('Aucune publicité : application, musique, annonces');
  else if (sp.length) r.push(`Sans publicité : ${sp.join(', ')}`);
  if (p.tout || p.igolani) r.push('Tous les cours vidéo d\'Igôlani, en streaming');
  const av = p.tout ? AVANTAGES.map(a => a.id) : (p.avantages ?? []);
  for (const a of AVANTAGES) if (av.includes(a.id)) r.push(a.libelle);
  return r;
}
