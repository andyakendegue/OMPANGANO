/**
 * Actions que Kak'Igonjo peut proposer dans le chat : changer un réglage de l'app ou ouvrir un écran.
 * Le modèle les écrit à la fin de sa réponse sous la forme `[[action {"type":"reglage","cle":"theme","valeur":"sombre"}]]`.
 * Le serveur les extrait, les valide (liste fermée) et les retire du texte ; l'app les affiche en boutons et ne les applique
 * qu'après un toucher de l'utilisateur. Jamais : paiements, code parental, limite de jeu, administration.
 */

/** Réglages modifiables par l'assistant, avec leurs valeurs permises (les mêmes que l'écran Réglages). */
export const REGLAGES_IA = {
  theme: { libelle: 'Affichage', valeurs: { auto: 'comme le téléphone', clair: 'clair', sombre: 'sombre' } },
  mode: { libelle: 'Mode', valeurs: { adulte: 'adulte', enfant: 'enfant', facile: 'lecture facile' } },
  animations: { libelle: 'Animations', valeurs: { completes: 'complètes', legeres: 'légères', aucune: 'aucune' } },
  sons: { libelle: 'Sons', valeurs: { true: 'activés', false: 'coupés' } },
  vibrations: { libelle: 'Vibrations', valeurs: { true: 'activées', false: 'coupées' } },
  rappel: { libelle: 'Rappel doux', valeurs: { '18:00': '18 h', '19:00': '19 h', '20:00': '20 h', null: 'aucun' } },
} as const;
export type CleReglageIa = keyof typeof REGLAGES_IA;

/** Écrans que l'assistant peut ouvrir (chemins expo-router) et le module dont ils dépendent. */
export const ECRANS_IA = {
  accueil: { chemin: '/', libelle: "l'accueil" },
  apprendre: { chemin: '/apprendre', libelle: 'les leçons (Onenji)', module: 'onenji' },
  azeva: { chemin: '/azeva', libelle: 'les jeux (Azeva)', module: 'azeva' },
  ecoute: { chemin: '/ecoute', libelle: "l'écoute (Ontci)", module: 'ontci' },
  village: { chemin: '/village', libelle: 'le village', module: 'nkala' },
  serie: { chemin: '/serie', libelle: 'ta série' },
  profil: { chemin: '/profil', libelle: 'ton profil' },
  reglages: { chemin: '/reglages', libelle: 'les réglages' },
  recherche: { chemin: '/recherche', libelle: 'la recherche' },
} as const;
export type EcranIa = keyof typeof ECRANS_IA;

export type ActionIa =
  | { type: 'reglage'; cle: CleReglageIa; valeur: string | boolean | null; libelle: string }
  | { type: 'ouvrir'; ecran: EcranIa; libelle: string };

export interface CadreActions {
  /** Utilisateur enfant (âge ou mode enfant) : pas de changement de mode. */
  enfant: boolean;
  /** Modules actifs ; un écran dont le module est éteint n'est pas proposé. */
  modules?: Record<string, boolean>;
}

const MOTIF = /\[\[\s*action\s*(\{[^\]]{0,300}\})\s*\]\]/g;
export const MAX_ACTIONS = 3;

/** Valide une action proposée ; null si elle sort de la liste permise. */
export function validerAction(brut: unknown, cadre: CadreActions): ActionIa | null {
  if (!brut || typeof brut !== 'object') return null;
  const a = brut as Record<string, unknown>;
  if (a.type === 'reglage' && typeof a.cle === 'string' && Object.hasOwn(REGLAGES_IA, a.cle)) {
    const cle = a.cle as CleReglageIa;
    if (cle === 'mode' && cadre.enfant) return null;
    const valeurs = REGLAGES_IA[cle].valeurs as Record<string, string>;
    const k = String(a.valeur);
    if (!Object.hasOwn(valeurs, k)) return null;
    const valeur = k === 'true' ? true : k === 'false' ? false : k === 'null' ? null : k;
    return { type: 'reglage', cle, valeur, libelle: `${REGLAGES_IA[cle].libelle} : ${valeurs[k]}` };
  }
  if (a.type === 'ouvrir' && typeof a.ecran === 'string' && Object.hasOwn(ECRANS_IA, a.ecran)) {
    const ecran = a.ecran as EcranIa;
    const e = ECRANS_IA[ecran] as { libelle: string; module?: string };
    if (e.module && cadre.modules && cadre.modules[e.module] === false) return null;
    return { type: 'ouvrir', ecran, libelle: `Ouvrir ${e.libelle}` };
  }
  return null;
}

/** Retire les balises d'action du texte et renvoie les actions valides (sans doublon, 3 au plus). */
export function extraireActions(texte: string, cadre: CadreActions): { texte: string; actions: ActionIa[] } {
  const actions: ActionIa[] = [];
  const vues = new Set<string>();
  for (const m of texte.matchAll(MOTIF)) {
    let brut: unknown;
    try { brut = JSON.parse(m[1]); } catch { continue; }
    const a = validerAction(brut, cadre);
    if (!a) continue;
    const cle = a.type === 'reglage' ? `r:${a.cle}` : `o:${a.ecran}`;
    if (vues.has(cle) || actions.length >= MAX_ACTIONS) continue;
    vues.add(cle); actions.push(a);
  }
  return { texte: texte.replace(MOTIF, '').replace(/\n{3,}/g, '\n\n').trim(), actions };
}

/** Consigne donnée au modèle : comment proposer une action. */
export function consigneActions(cadre: CadreActions): string {
  const reglages = (Object.keys(REGLAGES_IA) as CleReglageIa[]).filter(k => !(k === 'mode' && cadre.enfant))
    .map(k => `${k} (${Object.keys(REGLAGES_IA[k].valeurs).join(' | ')})`).join(' ; ');
  const ecrans = (Object.keys(ECRANS_IA) as EcranIa[]).filter(k => validerAction({ type: 'ouvrir', ecran: k }, cadre)).join(', ');
  return `\n\n### Actions dans l'application
Quand l'utilisateur te demande de régler l'application ou d'aller quelque part, ou quand c'est vraiment utile pour l'aider à avancer, tu peux proposer jusqu'à ${MAX_ACTIONS} actions. Écris chacune seule sur une ligne, tout à la fin de ta réponse, exactement sous cette forme :
[[action {"type":"reglage","cle":"theme","valeur":"sombre"}]]
[[action {"type":"ouvrir","ecran":"apprendre"}]]
Réglages permis : ${reglages}. Écrans permis : ${ecrans}.
L'utilisateur verra un bouton et décidera lui-même : dis-lui ce que l'action fera, ne prétends jamais l'avoir faite. Rien d'autre n'est possible (pas de paiement, pas de code parental, pas de limite de temps) : si on te le demande, explique où le faire dans l'application.`;
}
