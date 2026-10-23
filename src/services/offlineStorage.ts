import { OfflineSubmission, QuestionnaireItem, OfflinePackStatus, ClanRegistry, VillageRegistry } from '../types';

const DB_NAME = 'nkala_enenga_offline_db';
const DB_VERSION = 2;
const STORE_PENDING = 'pending_contributions';
const STORE_ITEMS = 'cached_items';
const STORE_MEDIA = 'cached_images';
const STORE_CLANS = 'cached_clans';
const STORE_VILLAGES = 'cached_villages';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB non supporté'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA, { keyPath: 'url' });
      }
      if (!db.objectStoreNames.contains(STORE_CLANS)) {
        db.createObjectStore(STORE_CLANS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_VILLAGES)) {
        db.createObjectStore(STORE_VILLAGES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineContribution(submission: OfflineSubmission): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING, 'readwrite');
      const store = tx.objectStore(STORE_PENDING);
      const req = store.put(submission);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Erreur sauvegarde offline:', err);
  }
}

export async function getPendingOfflineContributions(): Promise<OfflineSubmission[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING, 'readonly');
      const store = tx.objectStore(STORE_PENDING);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Impossible de lire IndexedDB:', err);
    return [];
  }
}

export async function removeOfflineContribution(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING, 'readwrite');
      const store = tx.objectStore(STORE_PENDING);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erreur suppression IndexedDB:', err);
  }
}

export async function cacheItemsLocally(items: QuestionnaireItem[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_ITEMS, 'readwrite');
    const store = tx.objectStore(STORE_ITEMS);
    for (const item of items) {
      store.put(item);
    }
  } catch (err) {
    console.warn('Erreur mise en cache items:', err);
  }
}

export async function getCachedItemsLocally(): Promise<QuestionnaireItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ITEMS, 'readonly');
      const store = tx.objectStore(STORE_ITEMS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function downloadFullOfflinePack(
  items: QuestionnaireItem[],
  onProgress?: (progressPct: number, currentItem: string) => void
): Promise<OfflinePackStatus> {
  const db = await openDatabase();

  await cacheItemsLocally(items);

  let completed = 0;
  for (const item of items) {
    if (onProgress) {
      onProgress(Math.round((completed / items.length) * 100), item.frenchText);
    }

    if (item.imageUrl) {
      try {
        const response = await fetch(item.imageUrl, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          const tx = db.transaction(STORE_MEDIA, 'readwrite');
          const store = tx.objectStore(STORE_MEDIA);
          store.put({ url: item.imageUrl, blob, cachedAt: Date.now() });
        }
      } catch (e) {
        // Fallback for CORS
      }
    }
    completed++;
  }

  const status: OfflinePackStatus = {
    isDownloaded: true,
    itemCount: items.length,
    downloadProgress: 100,
    downloadDate: new Date().toISOString()
  };

  localStorage.setItem('nkala_offline_pack_status', JSON.stringify(status));
  if (onProgress) onProgress(100, 'Téléchargement terminé avec succès !');
  return status;
}

export function getOfflinePackStatus(): OfflinePackStatus {
  try {
    const raw = localStorage.getItem('nkala_offline_pack_status');
    return raw ? JSON.parse(raw) : { isDownloaded: false, itemCount: 0, downloadProgress: 0 };
  } catch {
    return { isDownloaded: false, itemCount: 0, downloadProgress: 0 };
  }
}

export async function clearOfflineStorage(): Promise<void> {
  try {
    const db = await openDatabase();
    const stores = [STORE_PENDING, STORE_ITEMS, STORE_MEDIA, STORE_CLANS, STORE_VILLAGES];
    for (const s of stores) {
      const tx = db.transaction(s, 'readwrite');
      tx.objectStore(s).clear();
    }
    localStorage.removeItem('nkala_offline_pack_status');
  } catch (e) {
    console.warn('Clear offline storage error:', e);
  }
}

export async function cacheClansLocally(clans: ClanRegistry[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_CLANS, 'readwrite');
    const store = tx.objectStore(STORE_CLANS);
    for (const c of clans) store.put(c);
  } catch (e) {
    console.warn('Cache clans error:', e);
  }
}

export async function getCachedClansLocally(): Promise<ClanRegistry[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CLANS, 'readonly');
      const req = tx.objectStore(STORE_CLANS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function cacheVillagesLocally(villages: VillageRegistry[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_VILLAGES, 'readwrite');
    const store = tx.objectStore(STORE_VILLAGES);
    for (const v of villages) store.put(v);
  } catch (e) {
    console.warn('Cache villages error:', e);
  }
}

export async function getCachedVillagesLocally(): Promise<VillageRegistry[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_VILLAGES, 'readonly');
      const req = tx.objectStore(STORE_VILLAGES).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}
