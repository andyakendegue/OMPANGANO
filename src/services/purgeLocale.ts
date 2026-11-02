/**
 * Déconnexion : tout ce que l'application a gardé sur l'appareil est supprimé (catalogue, contributions en cache,
 * file hors ligne, profil, préférences, clé de chiffrement, caches du navigateur). Seul l'identifiant anonyme de
 * navigateur des statistiques est conservé (visiteurs uniques). La prochaine connexion retélécharge tout.
 */
import { deleteCatalogueDatabase } from './itemStore';
import { resetCatalogueSettled, forgetItemsOrder } from '../firebase';
import { VISITOR_KEY } from './statistiques';
import { supprimerCle } from './chiffrement';

const BASES = ['nkala_enenga_offline_db'];

function supprimerBase(nom: string): Promise<void> {
  return new Promise(resolve => {
    try {
      const req = indexedDB.deleteDatabase(nom);
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    } catch { resolve(); }
  });
}

export async function purgerDonneesLocales(): Promise<void> {
  let vid: string | null = null;
  try { vid = localStorage.getItem(VISITOR_KEY); } catch {}
  try { localStorage.clear(); } catch {}
  try { if (vid) localStorage.setItem(VISITOR_KEY, vid); } catch {}
  try { sessionStorage.clear(); } catch {}
  await Promise.all([
    deleteCatalogueDatabase().catch(() => {}),
    supprimerCle().catch(() => {}),
    ...BASES.map(supprimerBase),
    (async () => {
      try {
        if (typeof caches !== 'undefined') await Promise.all((await caches.keys()).map(k => caches.delete(k)));
      } catch {}
    })()
  ]);
  forgetItemsOrder();
  resetCatalogueSettled();
}
