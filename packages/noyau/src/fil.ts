/**
 * Publications sponsorisées dans les listes (modèle des réseaux sociaux) : les créations sont glissées entre les éléments,
 * jamais en tête de liste ni en fin, jamais deux de suite, et l'application affiche toujours la mention « Publicité ».
 */
export type ElementFil<T> = { type: 'item'; item: T; cle: string } | { type: 'pub'; pub: PubFil; cle: string };
export interface PubFil { id: string; zone: string; image: string | null; lien: string | null; titre: string | null; texte_alt: string; annonceur: string | null; cta?: string | null; format?: string }

/** `premier` : nombre d'éléments avant la première publicité ; `intervalle` : éléments entre deux publicités. */
export function melangerPubs<T>(items: readonly T[], pubs: readonly PubFil[], cleDe: (i: T, n: number) => string = (_, n) => String(n), o: { premier?: number; intervalle?: number } = {}): ElementFil<T>[] {
  const premier = Math.max(1, o.premier ?? 2), intervalle = Math.max(2, o.intervalle ?? 5);
  const sortie: ElementFil<T>[] = [];
  let p = 0, depuis = 0, seuil = premier;
  items.forEach((item, n) => {
    sortie.push({ type: 'item', item, cle: cleDe(item, n) });
    depuis++;
    // pas de publicité si c'est le dernier élément : une liste ne finit jamais par une publicité
    if (pubs.length && depuis >= seuil && n < items.length - 1) {
      const pub = pubs[p % pubs.length]; p++;
      sortie.push({ type: 'pub', pub, cle: `pub-${p}-${pub.id}` });
      depuis = 0; seuil = intervalle;
    }
  });
  return sortie;
}
