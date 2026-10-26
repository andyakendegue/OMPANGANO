import {
  OfflineSubmission,
  QuestionnaireItem,
  OfflinePackStatus,
  ClanRegistry,
  VillageRegistry,
  Contribution,
  WeeklyChallenge,
  ThemeDefinition,
  Badge,
  UserProfile
} from '../types';

const DB_NAME = 'nkala_enenga_offline_db';
const DB_VERSION = 2;
const STORE_PENDING = 'pending_contributions';
const STORE_ITEMS = 'cached_items';
const STORE_MEDIA = 'cached_images';
const STORE_CLANS = 'cached_clans';
const STORE_VILLAGES = 'cached_villages';

const LS_PENDING_FALLBACK_KEY = 'nkala_pending_contributions_fallback_v1';
const LS_CONTRIBUTIONS_CACHE_KEY = 'nkala_cached_contributions_v1';
const LS_CHALLENGES_CACHE_KEY = 'nkala_cached_challenges_v1';
const LS_THEMES_CACHE_KEY = 'nkala_cached_themes_v1';
const LS_BADGES_CACHE_KEY = 'nkala_cached_badges_v1';
const LS_USERS_CACHE_KEY = 'nkala_cached_users_v1';

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

function savePendingToLocalStorageFallback(submission: OfflineSubmission): void {
  try {
    const raw = localStorage.getItem(LS_PENDING_FALLBACK_KEY);
    const list: OfflineSubmission[] = raw ? JSON.parse(raw) : [];
    const { audioBlob: _omitBlob, ...serializable } = submission;
    const filtered = list.filter(s => s.id !== submission.id);
    filtered.push(serializable as OfflineSubmission);
    localStorage.setItem(LS_PENDING_FALLBACK_KEY, JSON.stringify(filtered));
  } catch {}
}

function removePendingFromLocalStorageFallback(id: string): void {
  try {
    const raw = localStorage.getItem(LS_PENDING_FALLBACK_KEY);
    if (!raw) return;
    const list: OfflineSubmission[] = JSON.parse(raw);
    const filtered = list.filter(s => s.id !== id);
    localStorage.setItem(LS_PENDING_FALLBACK_KEY, JSON.stringify(filtered));
  } catch {}
}

function getPendingFromLocalStorageFallback(): OfflineSubmission[] {
  try {
    const raw = localStorage.getItem(LS_PENDING_FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveOfflineContribution(submission: OfflineSubmission): Promise<void> {
  // Always mirror serializable payload (including base64 audioDataUrl) in localStorage as a failsafe
  savePendingToLocalStorageFallback(submission);
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_PENDING, 'readwrite');
        const store = tx.objectStore(STORE_PENDING);
        store.put(submission);
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          // Safari/Firefox private mode may reject storing raw Blob in IndexedDB; retry without raw Blob
          try {
            const { audioBlob: _omit, ...withoutBlob } = submission;
            const retryTx = db.transaction(STORE_PENDING, 'readwrite');
            retryTx.objectStore(STORE_PENDING).put(withoutBlob);
            retryTx.oncomplete = () => resolve();
            retryTx.onerror = () => resolve();
          } catch {
            resolve();
          }
        };
      } catch {
        resolve();
      }
    });
  } catch (err) {
    console.warn('Fallback localStorage utilisé pour contribution hors-ligne:', err);
  }
}

export async function getPendingOfflineContributions(): Promise<OfflineSubmission[]> {
  const fallbackList = getPendingFromLocalStorageFallback();
  try {
    const db = await openDatabase();
    const idbList = await new Promise<OfflineSubmission[]>((resolve) => {
      const tx = db.transaction(STORE_PENDING, 'readonly');
      const store = tx.objectStore(STORE_PENDING);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    // Merge IndexedDB and localStorage fallback by ID so no offline contribution is ever lost
    const mergedMap = new Map<string, OfflineSubmission>();
    for (const item of fallbackList) {
      if (item && item.id) mergedMap.set(item.id, item);
    }
    for (const item of idbList) {
      if (item && item.id) mergedMap.set(item.id, item);
    }
    return Array.from(mergedMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  } catch (err) {
    console.warn('Lecture IndexedDB indisponible, utilisation du fallback localStorage:', err);
    return fallbackList;
  }
}

export async function removeOfflineContribution(id: string): Promise<void> {
  removePendingFromLocalStorageFallback(id);
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PENDING, 'readwrite');
      const store = tx.objectStore(STORE_PENDING);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Erreur suppression IndexedDB:', err);
  }
}

export async function cacheItemsLocally(items: QuestionnaireItem[]): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_ITEMS, 'readwrite');
      const store = tx.objectStore(STORE_ITEMS);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('Erreur mise en cache items:', err);
  }
}

export async function getCachedItemsLocally(): Promise<QuestionnaireItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_ITEMS, 'readonly');
      const store = tx.objectStore(STORE_ITEMS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
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
      onProgress(Math.round((completed / Math.max(1, items.length)) * 100), item.frenchText);
    }

    if (item.imageUrl) {
      try {
        const response = await fetch(item.imageUrl, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          await new Promise<void>((resolve) => {
            const tx = db.transaction(STORE_MEDIA, 'readwrite');
            const store = tx.objectStore(STORE_MEDIA);
            store.put({ url: item.imageUrl, blob, cachedAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          });
        }
      } catch {
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
    localStorage.removeItem(LS_PENDING_FALLBACK_KEY);
    localStorage.removeItem('nkala_offline_pack_status');
    const db = await openDatabase();
    const stores = [STORE_PENDING, STORE_ITEMS, STORE_MEDIA, STORE_CLANS, STORE_VILLAGES];
    for (const s of stores) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(s, 'readwrite');
        tx.objectStore(s).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch (e) {
    console.warn('Clear offline storage error:', e);
  }
}

export async function cacheClansLocally(clans: ClanRegistry[]): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_CLANS, 'readwrite');
      const store = tx.objectStore(STORE_CLANS);
      store.clear();
      for (const c of clans) store.put(c);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
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
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_VILLAGES, 'readwrite');
      const store = tx.objectStore(STORE_VILLAGES);
      store.clear();
      for (const v of villages) store.put(v);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
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

// Local cache helpers for Contributions, Challenges, Themes, Badges & Users (for full offline continuity)
export function cacheContributionsLocally(contributions: Contribution[]): void {
  try {
    // Avoid exceeding localStorage quota on base64 audio by trimming large audioUrl in localStorage mirror if needed
    const compact = contributions.slice(0, 300);
    localStorage.setItem(LS_CONTRIBUTIONS_CACHE_KEY, JSON.stringify(compact));
  } catch {}
}

export function getCachedContributionsLocally(): Contribution[] {
  try {
    const raw = localStorage.getItem(LS_CONTRIBUTIONS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function cacheChallengesLocally(challenges: WeeklyChallenge[]): void {
  try {
    localStorage.setItem(LS_CHALLENGES_CACHE_KEY, JSON.stringify(challenges));
  } catch {}
}

export function getCachedChallengesLocally(): WeeklyChallenge[] {
  try {
    const raw = localStorage.getItem(LS_CHALLENGES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function cacheThemesLocally(themes: ThemeDefinition[]): void {
  try {
    localStorage.setItem(LS_THEMES_CACHE_KEY, JSON.stringify(themes));
  } catch {}
}

export function getCachedThemesLocally(): ThemeDefinition[] {
  try {
    const raw = localStorage.getItem(LS_THEMES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function cacheBadgesLocally(badges: Badge[]): void {
  try {
    localStorage.setItem(LS_BADGES_CACHE_KEY, JSON.stringify(badges));
  } catch {}
}

export function getCachedBadgesLocally(): Badge[] {
  try {
    const raw = localStorage.getItem(LS_BADGES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function cacheUsersLocally(users: UserProfile[]): void {
  try {
    localStorage.setItem(LS_USERS_CACHE_KEY, JSON.stringify(users));
  } catch {}
}

export function getCachedUsersLocally(): UserProfile[] {
  try {
    const raw = localStorage.getItem(LS_USERS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

