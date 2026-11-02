/**
 * Chiffrement du cache local (AES-GCM 256, WebCrypto). La clé est créée sur l'appareil, non exportable, et supprimée à
 * la déconnexion. Elle protège le catalogue copié sur le disque (fichiers IndexedDB lus hors de l'application, sauvegardes
 * du profil du navigateur) ; elle ne protège pas contre quelqu'un qui utilise l'application ouverte avec une session valide.
 */
const BASE = 'ompangano_cle';
const STORE = 'cle';

export const chiffrementDisponible = () =>
  typeof crypto !== 'undefined' && !!crypto.subtle && typeof indexedDB !== 'undefined';

function ouvrirBase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BASE, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let clePromise: Promise<{ key: CryptoKey; creee: boolean }> | null = null;

/** Clé de l'appareil. `creee` : la clé vient d'être générée (un éventuel cache chiffré par une ancienne clé est inutilisable). */
export function obtenirCle(): Promise<{ key: CryptoKey; creee: boolean }> {
  if (clePromise) return clePromise;
  clePromise = (async () => {
    const db = await ouvrirBase();
    try {
      const existante = await new Promise<CryptoKey | undefined>((resolve, reject) => {
        const r = db.transaction(STORE).objectStore(STORE).get('k');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      if (existante) return { key: existante, creee: false };
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(key, 'k');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return { key, creee: true };
    } finally { db.close(); }
  })();
  clePromise.catch(() => { clePromise = null; });
  return clePromise;
}

export interface Scelle { iv: Uint8Array; ct: ArrayBuffer }

export async function chiffrer(valeur: unknown): Promise<Scelle> {
  const { key } = await obtenirCle();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(valeur)));
  return { iv, ct };
}

export async function dechiffrer<T>(s: Scelle): Promise<T> {
  const { key } = await obtenirCle();
  const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: s.iv as BufferSource }, key, s.ct);
  return JSON.parse(new TextDecoder().decode(clair)) as T;
}

/** Supprime la clé de l'appareil (déconnexion) : le cache chiffré restant devient illisible. */
export async function supprimerCle(): Promise<void> {
  clePromise = null;
  if (typeof indexedDB === 'undefined') return;
  await new Promise<void>(resolve => {
    const req = indexedDB.deleteDatabase(BASE);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
