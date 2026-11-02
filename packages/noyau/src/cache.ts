import { ApiError } from './api';

/**
 * Copie locale des lectures (clans, villages, thèmes, défis, badges, classement, mes contributions…) : sans réseau,
 * l'application affiche la dernière version connue, comme le site web (IndexedDB). Le stockage est fourni par l'application.
 */
export interface StockageCle { lire(cle: string): Promise<string | null>; ecrire(cle: string, valeur: string): Promise<void> }
let stockage: StockageCle | null = null;
export const configurerCache = (s: StockageCle) => { stockage = s; };

/** Réseau absent ou serveur en panne (et non un refus de droits : celui-là doit rester visible). */
export const estErreurReseau = (e: unknown) => { const st = (e as ApiError)?.status; return typeof st === 'number' && (st === 0 || st >= 500); };

export async function avecCache<T>(cle: string, charger: () => Promise<T>): Promise<T> {
  try {
    const v = await charger();
    stockage?.ecrire(`cache:${cle}`, JSON.stringify(v)).catch(() => {});
    return v;
  } catch (e) {
    if (estErreurReseau(e) && stockage) {
      const c = await stockage.lire(`cache:${cle}`).catch(() => null);
      if (c) return JSON.parse(c) as T;
    }
    throw e;
  }
}
