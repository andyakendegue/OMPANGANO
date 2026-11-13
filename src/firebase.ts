/**
 * Firebase ne sert plus qu'à l'authentification (Google + e-mail/mot de passe).
 * Les données (profils, phrases, contributions, voix…) sont sur le VPS : ce fichier est une FAÇADE
 * qui garde les noms historiques (dualSaveRecord, smartFetchCollection…) mais parle à l'API
 * (src/data/api.ts). Le cache hors-ligne et la file de modifications restent sur l'appareil.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from './firebaseConfig';
import { signalerErreur } from './services/erreurs';
import { api, ApiError, isPermanentApiError, setTokenProvider, subscribeToEvents } from './data/api';
import { PROTECTED_USER_FIELDS } from '../shared/userSecurity';
import { applyItemsDelta, clearCatalogue, countItems, notifyCatalogueChanged, flushSearchIndex, getCatalogueMetaStrict, loadSyncState, saveSyncState } from './services/itemStore';
import type { QuestionnaireItem } from './types';

// Initialize Firebase App (Auth uniquement)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// L'API reçoit le jeton d'identité Firebase ; un rafraîchissement forcé est demandé après un 401.
setTokenProvider(async (forceRefresh) => {
  try {
    await auth.authStateReady();
    return (await auth.currentUser?.getIdToken(forceRefresh)) ?? null;
  } catch {
    return null;
  }
});

// Adresse du super-administrateur. Indicatif d'affichage seulement : c'est le SERVEUR qui décide des rôles.
export const ADMIN_EMAILS: string[] = ['andymigoumbi@gmail.com'];

export function checkIsAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  // Comparaison EXACTE uniquement : une adresse qui « contient » admin n'est jamais administrateur.
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/** Le rôle administrateur du super-admin est attribué par le serveur à la première requête (/v1/me). */
export async function ensureAdminRoleForUser(user: { id: string; email?: string | null; role?: string }) {
  if (checkIsAdminEmail(user.email)) {
    user.role = 'admin';
    return true;
  }
  return false;
}

// Convert audio Blob into permanent base64 data URL (aperçu local uniquement)
export function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// La connexion se fait uniquement par Google (la connexion e-mail / mot de passe a été retirée).

// Attend que la session Firebase soit prête avant d'appeler l'API
export async function ensureFirebaseAuthSession(): Promise<FirebaseUser | null> {
  try {
    await auth.authStateReady();
  } catch {}
  // Pas de connexion anonyme : le serveur refuse les sessions anonymes.
  if (auth.currentUser && !auth.currentUser.isAnonymous) return auth.currentUser;
  return null;
}

/** Vrai si le serveur a refusé l'opération (droits, données invalides) : inutile de la rejouer. */
export function isPermissionDeniedError(error: unknown): boolean {
  return isPermanentApiError(error);
}

// Retire les valeurs undefined avant l'envoi
export function sanitizeDataForFirebase(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeDataForFirebase(item));
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeDataForFirebase(value);
    }
  }
  return clean;
}

// -------------------------------------------------------------
// PROGRESSION DE LA SYNCHRONISATION (envoi des modifications en attente, téléchargement des données)
// -------------------------------------------------------------
export interface SyncProgress {
  kind: 'upload' | 'download' | null;
  done: number;
  total: number;
}
const IDLE: SyncProgress = { kind: null, done: 0, total: 0 };
let uploadState: { done: number; total: number } | null = null;
const downloadState = new Map<string, { done: number; total: number }>();
const episode = { done: 0 };
let episodeTimer: ReturnType<typeof setTimeout> | null = null;
/** Fin d'une synchronisation : ses fiches restent comptées si une autre suit dans les 5 secondes. */
function endDownload(collectionPath: string, fetched: number) {
  downloadState.delete(collectionPath);
  episode.done += fetched;
  if (episodeTimer) clearTimeout(episodeTimer);
  episodeTimer = setTimeout(() => { episode.done = 0; episodeTimer = null; }, 5000);
  emitProgress();
}
let currentProgress: SyncProgress = IDLE;
const progressListeners = new Set<(p: SyncProgress) => void>();
const queueListeners = new Set<() => void>();
/** En dessous de ce volume le téléchargement est trop rapide pour mériter un indicateur. */
const MIN_DOWNLOAD_TO_SHOW = 500;

function emitProgress() {
  if (uploadState) currentProgress = { kind: 'upload', ...uploadState };
  else {
    // Les synchronisations qui s'enchaînent (import en cours, signaux rapprochés) forment un seul « épisode » :
    // les fiches déjà reçues restent comptées, le total ne fait que grandir.
    let done = 0, total = 0;
    for (const d of downloadState.values()) { done += d.done; total += d.total; }
    // Le seuil d'affichage porte sur la synchronisation en cours, pas sur l'épisode entier
    const show = total >= MIN_DOWNLOAD_TO_SHOW;
    if (total > 0) { done += episode.done; total += episode.done; }
    currentProgress = show ? { kind: 'download', done, total } : IDLE;
  }
  progressListeners.forEach(cb => cb(currentProgress));
}
export function getSyncProgress(): SyncProgress { return currentProgress; }
export function subscribeSyncProgress(cb: (p: SyncProgress) => void): () => void {
  progressListeners.add(cb);
  cb(currentProgress);
  return () => { progressListeners.delete(cb); };
}
/** Appelé quand la file de modifications change (pour rafraîchir le compteur « N sync »). */
export function subscribeQueueChanged(cb: () => void): () => void {
  queueListeners.add(cb);
  return () => { queueListeners.delete(cb); };
}
const notifyQueueChanged = () => queueListeners.forEach(cb => cb());

export const uploadProgress = {
  start(total: number) { uploadState = { done: 0, total }; emitProgress(); },
  advance() { if (uploadState) { uploadState.done++; emitProgress(); } },
  finish() { uploadState = null; emitProgress(); }
};

// -------------------------------------------------------------
// ÉCRITURES VERS L'API (une seule entrée pour tous les types de données)
// -------------------------------------------------------------
const OWN_PROFILE_KEY = 'nkala_authenticated_user';

function localRoleIsAdmin(): boolean {
  try {
    const raw = localStorage.getItem(OWN_PROFILE_KEY);
    return !!raw && JSON.parse(raw)?.role === 'admin';
  } catch {
    return false;
  }
}

async function saveToApi(collectionPath: string, recordId: string, data: any): Promise<void> {
  const body = sanitizeDataForFirebase(data) || {};
  if (collectionPath === 'leaderboard') return; // classement calculé par le serveur
  if (collectionPath === 'users') {
    const me = auth.currentUser?.uid;
    const touchesProtected = PROTECTED_USER_FIELDS.some(k => k in body);
    // Un admin modifie les champs protégés via /users/:id ; tout autre cas passe par /me (champs protégés ignorés)
    if (recordId === me && !(touchesProtected && localRoleIsAdmin())) {
      await api('PATCH', '/v1/me', body);
    } else {
      await api('PATCH', `/v1/users/${encodeURIComponent(recordId)}`, body);
    }
    return;
  }
  if (collectionPath === 'contributions') {
    await api('POST', '/v1/contributions', { ...body, id: recordId }); // création idempotente (rejeu hors-ligne sans doublon)
    return;
  }
  await api('PUT', `/v1/${encodeURIComponent(collectionPath)}/${encodeURIComponent(recordId)}`, body);
}

async function deleteFromApi(collectionPath: string, recordId: string): Promise<void> {
  if (collectionPath === 'leaderboard') return;
  await api('DELETE', `/v1/${encodeURIComponent(collectionPath)}/${encodeURIComponent(recordId)}`);
}

// -------------------------------------------------------------
// OFFLINE RESILIENCE: MUTATIONS QUEUE FOR ADMIN ADDS & DELETES
// -------------------------------------------------------------
export interface OfflineAdminMutation {
  id: string;
  type: 'save' | 'delete';
  collectionPath: string;
  recordId: string;
  data?: any;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'nkala_offline_admin_mutations';

export function getOfflineAdminMutations(): OfflineAdminMutation[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineAdminMutation(mutation: Omit<OfflineAdminMutation, 'id' | 'timestamp'>) {
  try {
    const current = getOfflineAdminMutations();
    const existingIdx = current.findIndex(
      m => m.collectionPath === mutation.collectionPath && m.recordId === mutation.recordId
    );

    let mergedData = mutation.data;
    if (
      existingIdx >= 0 &&
      current[existingIdx].type === 'save' &&
      mutation.type === 'save' &&
      current[existingIdx].data &&
      typeof current[existingIdx].data === 'object' &&
      mutation.data &&
      typeof mutation.data === 'object'
    ) {
      mergedData = { ...current[existingIdx].data, ...mutation.data };
    }

    const filtered = current.filter(
      m => !(m.collectionPath === mutation.collectionPath && m.recordId === mutation.recordId)
    );
    filtered.push({
      ...mutation,
      data: mergedData,
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now()
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
    notifyQueueChanged();
    console.info(`[Offline Queue] Action mise en file d'attente hors-ligne: ${mutation.type.toUpperCase()} ${mutation.collectionPath}/${mutation.recordId}`);
  } catch (err) {
    console.warn('Notice file d attente hors-ligne:', err);
  }
}

let activeReplayPromise: Promise<number> | null = null;

export async function replayPendingOfflineAdminMutations(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 0;
  }
  if (activeReplayPromise) {
    return activeReplayPromise;
  }

  activeReplayPromise = (async () => {
    try {
      const pending = getOfflineAdminMutations();
      if (pending.length === 0) return 0;

      const activeUser = await ensureFirebaseAuthSession();
      if (!activeUser) return 0; // pas de session : on réessaiera

      console.info(`[Sync Replay] Synchronisation en ligne de ${pending.length} modification(s) en attente...`);

      let successCount = 0;
      /** Collections acceptant l'écriture groupée (POST /:collection/batch) : 500 modifications par requête. */
      const BATCHABLE = new Set(['items', 'clans', 'villages', 'themes', 'badges', 'challenges', 'metrics']);
      const dropMany = (ids: Set<string>) => {
        try {
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(getOfflineAdminMutations().filter(m => !ids.has(m.id))));
        } catch {}
        notifyQueueChanged();
      };
      uploadProgress.start(pending.length);
      try {
        for (let i = 0; i < pending.length; ) {
          const mut = pending[i];
          // Suite de sauvegardes consécutives dans la même collection : une seule requête
          let run: OfflineAdminMutation[] = [mut];
          if (mut.type === 'save' && mut.data && BATCHABLE.has(mut.collectionPath)) {
            run = [];
            for (let j = i; j < pending.length && run.length < 500; j++) {
              const m = pending[j];
              if (m.type === 'save' && m.data && m.collectionPath === mut.collectionPath) run.push(m);
              else break;
            }
          }
          try {
            if (mut.type === 'save' && mut.data && BATCHABLE.has(mut.collectionPath)) {
              try {
                await api('POST', `/v1/${encodeURIComponent(mut.collectionPath)}/batch`, {
                  records: run.map(m => ({ ...sanitizeDataForFirebase(m.data), id: m.recordId }))
                });
              } catch (batchErr) {
                if (!isPermanentApiError(batchErr)) throw batchErr;
                // Lot refusé : on isole les éléments un par un
                for (const m of run) {
                  try { await saveToApi(m.collectionPath, m.recordId, m.data); }
                  catch (e) { if (!isPermanentApiError(e)) throw e; }
                }
              }
            } else if (mut.type === 'save' && mut.data) {
              await saveToApi(mut.collectionPath, mut.recordId, mut.data);
            } else if (mut.type === 'delete') {
              await deleteFromApi(mut.collectionPath, mut.recordId);
            }
            successCount += run.length;
            dropMany(new Set(run.map(m => m.id)));
          } catch (replayErr) {
            if (isPermanentApiError(replayErr)) {
              console.warn(`✗ [Sync Replay Refusé] ${mut.collectionPath}/${mut.recordId} abandonné (${(replayErr as ApiError).message}).`);
              dropMany(new Set(run.map(m => m.id)));
            } else {
              // Réseau, surcharge ou erreur serveur : le reste attend la prochaine synchronisation
              console.warn(`✗ [Sync Replay Échec] ${mut.collectionPath}/${mut.recordId}, le reste est conservé en attente:`, replayErr);
              break;
            }
          }
          for (let k = 0; k < run.length; k++) uploadProgress.advance();
          i += run.length;
        }
      } finally {
        uploadProgress.finish();
      }

      return successCount;
    } finally {
      activeReplayPromise = null;
    }
  })();

  return activeReplayPromise;
}

/** Conservé pour compatibilité : le serveur signale lui-même les modifications (flux /v1/events). */
export function bumpCatalogVersion(_collectionPath: string) {}

export async function dualSaveRecord(collectionPath: string, recordId: string, data: any): Promise<{ firestore: boolean; rtdb: boolean }> {
  const sanitized = sanitizeDataForFirebase(data);

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueOfflineAdminMutation({ type: 'save', collectionPath, recordId, data: sanitized });
    return { firestore: false, rtdb: false };
  }

  const activeUser = await ensureFirebaseAuthSession();
  if (!activeUser) {
    queueOfflineAdminMutation({ type: 'save', collectionPath, recordId, data: sanitized });
    return { firestore: false, rtdb: false };
  }

  try {
    await saveToApi(collectionPath, recordId, sanitized);
    return { firestore: true, rtdb: true };
  } catch (err) {
    if (isPermanentApiError(err)) {
      console.warn(`Écriture refusée sur ${collectionPath}/${recordId} :`, (err as ApiError).message);
      return { firestore: false, rtdb: false };
    }
    console.warn(`Écriture différée sur ${collectionPath}/${recordId} :`, err);
    queueOfflineAdminMutation({ type: 'save', collectionPath, recordId, data: sanitized });
    return { firestore: false, rtdb: false };
  }
}

/**
 * Écriture groupée pour les gros imports (CSV de 10 000 à 45 000 phrases) : lots de 500,
 * progression après chaque lot. Hors-ligne ou lot en échec réseau : mis en file pour rejeu automatique.
 */
export async function dualBatchSaveRecords(
  collectionPath: string,
  records: Array<{ id: string; data: any }>,
  onProgress?: (savedCount: number, totalCount: number) => void
): Promise<{ savedCount: number; totalCount: number }> {
  const totalCount = records.length;
  if (totalCount === 0) {
    onProgress?.(0, 0);
    return { savedCount: 0, totalCount: 0 };
  }

  const online = typeof navigator === 'undefined' || navigator.onLine;
  const activeUser = online ? await ensureFirebaseAuthSession() : null;
  const CHUNK_SIZE = 500;
  let savedCount = 0;

  for (let start = 0; start < totalCount; start += CHUNK_SIZE) {
    const chunk = records
      .slice(start, start + CHUNK_SIZE)
      .map(r => ({ id: String(r.id || '').trim().replace(/[.$#[\]/\\]+/g, '_'), data: sanitizeDataForFirebase(r.data) }))
      .filter(r => r.id);

    let sent = false;
    if (activeUser && chunk.length > 0) {
      try {
        await api('POST', `/v1/${encodeURIComponent(collectionPath)}/batch`, { records: chunk.map(r => ({ ...r.data, id: r.id })) });
        sent = true;
      } catch (err) {
        if (isPermanentApiError(err)) {
          console.warn(`[Batch Import] Lot refusé (${(err as ApiError).message})`);
          sent = true; // inutile de le rejouer
        } else {
          console.warn(`[Batch Import] Lot ${start}-${start + chunk.length} mis en attente :`, err);
        }
      }
    }
    if (!sent) {
      for (const r of chunk) queueOfflineAdminMutation({ type: 'save', collectionPath, recordId: r.id, data: r.data });
    }

    savedCount += chunk.length;
    onProgress?.(savedCount, totalCount);
  }

  return { savedCount, totalCount };
}

export async function dualDeleteRecord(collectionPath: string, recordId: string): Promise<{ firestore: boolean; rtdb: boolean }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueOfflineAdminMutation({ type: 'delete', collectionPath, recordId });
    return { firestore: false, rtdb: false };
  }
  const activeUser = await ensureFirebaseAuthSession();
  if (!activeUser) {
    queueOfflineAdminMutation({ type: 'delete', collectionPath, recordId });
    return { firestore: false, rtdb: false };
  }
  try {
    await deleteFromApi(collectionPath, recordId);
    return { firestore: true, rtdb: true };
  } catch (err) {
    if (isPermanentApiError(err)) {
      console.warn(`Suppression refusée sur ${collectionPath}/${recordId} :`, (err as ApiError).message);
      return { firestore: false, rtdb: false };
    }
    queueOfflineAdminMutation({ type: 'delete', collectionPath, recordId });
    return { firestore: false, rtdb: false };
  }
}

// -------------------------------------------------------------
// SYNCHRONISATION INCRÉMENTALE
// 1er lancement : téléchargement complet paginé. Ensuite : seulement les modifications
// depuis le dernier curseur (suppressions comprises : deletedAt retire l'élément du cache local).
// -------------------------------------------------------------
const SYNC_CURSOR_PREFIX = 'ompangano_sync_cursor_';

function cursorKey(collectionPath: string): string {
  return `${SYNC_CURSOR_PREFIX}${auth.currentUser?.uid || 'anon'}_${collectionPath}`;
}

export function getLastCollectionSyncTimestamp(collectionPath: string): string | null {
  try {
    return localStorage.getItem(cursorKey(collectionPath));
  } catch {
    return null;
  }
}

export function setLastCollectionSyncTimestamp(collectionPath: string, cursor: string) {
  try {
    localStorage.setItem(cursorKey(collectionPath), cursor);
  } catch {}
}

function getStoredEpoch(collectionPath: string): string | null {
  try { return localStorage.getItem(`${cursorKey(collectionPath)}_epoch`); } catch { return null; }
}
function setStoredEpoch(collectionPath: string, epoch: string) {
  try { localStorage.setItem(`${cursorKey(collectionPath)}_epoch`, epoch); } catch {}
}

/** Profil d'un utilisateur : le sien (créé avec les valeurs initiales s'il n'existe pas) ou, pour l'équipe, celui d'un autre. */
export async function smartGetUserProfile<T = any>(userId: string): Promise<T | null> {
  if (!userId) return null;
  try {
    if (userId === auth.currentUser?.uid) return await api<T>('GET', '/v1/me');
    return await api<T>('GET', `/v1/users/${encodeURIComponent(userId)}`);
  } catch (err) {
    if ((err as ApiError)?.status === 404) return null;
    throw err;
  }
}

export async function smartFetchCollection<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  collectionPath: string,
  localCachedItems: T[],
  _options?: { maxFirestoreFallbackDocs?: number }
): Promise<{ items: T[]; source: 'api-delta' | 'api-full' | 'local-only'; firestoreReadsUsed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { items: localCachedItems, source: 'local-only', firestoreReadsUsed: 0 };
  }
  try {
    // Classement public : liste courte, relue en entier
    if (collectionPath === 'leaderboard') {
      const entries = await api<T[]>('GET', '/v1/leaderboard');
      return { items: entries, source: 'api-full', firestoreReadsUsed: 0 };
    }

    const stored = getLastCollectionSyncTimestamp(collectionPath);
    let sentEpoch = getStoredEpoch(collectionPath);
    // Cache vide malgré un curseur (données effacées) : on repart de zéro
    const delta = !!stored && localCachedItems.length > 0;
    const map = new Map<string, T>(delta ? localCachedItems.map(i => [i.id, i]) : []);
    let cursor: string | null = delta ? stored : null;
    let epoch = sentEpoch;
    let wasReset = false;
    let fetched = 0;
    let announcedTotal = 0;

    for (;;) {
      const qs = new URLSearchParams({ limit: '2000' });
      if (cursor) qs.set('since', cursor);
      if (sentEpoch) qs.set('epoch', sentEpoch);
      const page = await api<{ records: (T & { deletedAt?: string })[]; cursor: string | null; hasMore: boolean; epoch?: string; reset?: boolean; total?: number }>(
        'GET', `/v1/sync/${encodeURIComponent(collectionPath)}?${qs}`
      );
      // Les données ont été remises à zéro côté serveur : le cache local est abandonné
      if (page.reset && !wasReset) { map.clear(); wasReset = true; }
      // `total` = fiches restantes à partir de cette page : l'estimation suit un import qui continue pendant le téléchargement
      if (typeof page.total === 'number') announcedTotal = Math.max(announcedTotal, fetched + page.total);
      fetched += page.records.length;
      announcedTotal = Math.max(announcedTotal, fetched);
      if (announcedTotal) { downloadState.set(collectionPath, { done: fetched, total: announcedTotal }); emitProgress(); }
      if (page.epoch) { epoch = page.epoch; sentEpoch = page.epoch; }
      for (const rec of page.records) {
        if (rec.deletedAt) map.delete(rec.id);
        else map.set(rec.id, rec);
      }
      if (page.cursor) cursor = page.cursor;
      else if (page.reset) cursor = null;
      if (!page.hasMore) break;
    }
    if (epoch) setStoredEpoch(collectionPath, epoch);
    downloadState.delete(collectionPath); emitProgress();
    if (cursor) setLastCollectionSyncTimestamp(collectionPath, cursor);
    return { items: Array.from(map.values()), source: delta ? 'api-delta' : 'api-full', firestoreReadsUsed: 0 };
  } catch (err) {
    downloadState.delete(collectionPath); emitProgress();
    console.warn(`Synchronisation de ${collectionPath} impossible, cache local utilisé :`, err);
    return { items: localCachedItems, source: 'local-only', firestoreReadsUsed: 0 };
  }
}

/**
 * Synchronisation du catalogue des phrases, page par page, directement dans IndexedDB : les 45 000 fiches
 * ne sont jamais réunies en mémoire. Chaque page téléchargée est écrite (et son curseur enregistré) avant la
 * suivante : une coupure de réseau ou un onglet fermé par le téléphone reprend là où elle s'était arrêtée.
 * `cleanPage` nettoie une page (corrections, fiches supprimées en local) avant son écriture.
 */
/** Vrai tant que la première synchronisation du catalogue de la session n'est pas terminée (réussie, échouée ou hors ligne). */
let catalogueSettled = false;
const settledListeners = new Set<() => void>();
export const isCatalogueSettled = () => catalogueSettled;
export function subscribeCatalogueSettled(cb: () => void): () => void {
  settledListeners.add(cb);
  return () => { settledListeners.delete(cb); };
}
function markCatalogueSettled() {
  if (catalogueSettled) return;
  catalogueSettled = true;
  settledListeners.forEach(cb => cb());
}

/** À appeler à la déconnexion : la prochaine connexion repasse par l'écran de chargement du catalogue. */
export function resetCatalogueSettled() {
  catalogueSettled = false;
}

/** Vrai pendant un téléchargement complet du catalogue (appareil vide ou reprise d'un téléchargement interrompu) */
let initialDownload = false;
export const isInitialDownload = () => initialDownload;

/**
 * Ordre de présentation des fiches : les moins répondues d'abord (tous contributeurs confondus).
 * Mémorisé 5 minutes ; `null` si le serveur est injoignable (l'appelant se rabat sur les contributions connues).
 */
let ordreCache: { at: number; rang: Map<string, number> } | null = null;
export async function fetchItemsOrder(): Promise<Map<string, number> | null> {
  if (ordreCache && Date.now() - ordreCache.at < 5 * 60_000) return ordreCache.rang;
  try {
    const { ids } = await api<{ ids: string[] }>('GET', '/v1/items/ordre');
    if (!Array.isArray(ids)) return null;
    const rang = new Map<string, number>();
    ids.forEach((id, i) => rang.set(id, i));
    ordreCache = { at: Date.now(), rang };
    return rang;
  } catch { return null; }
}
export const forgetItemsOrder = () => { ordreCache = null; };

const PRIO_KEY = 'ompangano_prio_download';
let catalogueSyncRun: Promise<{ changed: number; ok: boolean }> | null = null;
let catalogueSyncAgain = false;
export function syncItemsIntoCatalogue(
  cleanPage: (records: QuestionnaireItem[]) => QuestionnaireItem[]
): Promise<{ changed: number; ok: boolean }> {
  // Une seule synchronisation à la fois : les appels simultanés (démarrage, signal temps réel, minuteur,
  // retour sur l'onglet) rejoignent celle en cours, suivie d'un seul passage si un signal est arrivé entre-temps.
  if (catalogueSyncRun) { catalogueSyncAgain = true; return catalogueSyncRun; }
  catalogueSyncRun = (async () => {
    try {
      let result = await runCatalogueSync(cleanPage);
      while (catalogueSyncAgain && result.ok) {
        catalogueSyncAgain = false;
        const next = await runCatalogueSync(cleanPage);
        result = { changed: result.changed + next.changed, ok: next.ok };
      }
      return result;
    } finally { catalogueSyncRun = null; catalogueSyncAgain = false; initialDownload = false; markCatalogueSettled(); }
  })();
  return catalogueSyncRun;
}

async function runCatalogueSync(
  cleanPage: (records: QuestionnaireItem[]) => QuestionnaireItem[]
): Promise<{ changed: number; ok: boolean }> {
  const collectionPath = 'items';
  if (typeof navigator !== 'undefined' && !navigator.onLine) { markCatalogueSettled(); return { changed: 0, ok: false }; }
  const PAGE = 500; // pages modestes : peu de mémoire à la fois, reprise fine
  const PAGE_PRIO = 1000; // premier téléchargement : moins d'allers-retours sur un réseau lent
  try {
    let stored = getLastCollectionSyncTimestamp(collectionPath);
    let sentEpoch = getStoredEpoch(collectionPath);
    // Lecture impossible du catalogue local : on n'en déduit JAMAIS « vide » (cela déclencherait un téléchargement complet)
    const have = (await getCatalogueMetaStrict()).total;
    const uid = auth.currentUser?.uid || 'anon';
    if (!stored && have > 0) {
      // Stockage léger effacé mais catalogue présent : on reprend depuis l'état gardé dans la base
      const st = await loadSyncState();
      if (st && st.uid === uid) {
        if (st.cursor) { stored = st.cursor; setLastCollectionSyncTimestamp(collectionPath, st.cursor); }
        if (st.epoch && !sentEpoch) { sentEpoch = st.epoch; setStoredEpoch(collectionPath, st.epoch); }
        if (!st.cursor && st.prio) { try { localStorage.setItem(PRIO_KEY, JSON.stringify(st.prio)); } catch {} }
      }
    }
    let cursor: string | null = stored && have > 0 ? stored : null;
    let freshStore = !cursor && have === 0;
    let announcedTotal = 0;
    let fetched = 0;
    let changed = 0;
    let pagesDone = 0;
    // Premier téléchargement (ou reprise d'un premier téléchargement interrompu) : les fiches les moins répondues d'abord.
    // Le curseur des synchronisations par différences n'est enregistré qu'à la fin ; `prio` garde la position de reprise.
    let prio = !cursor;
    let prioOffset = 0;
    let deltaCursor: string | null = null;
    if (prio) {
      try {
        const saved = JSON.parse(localStorage.getItem(PRIO_KEY) || 'null');
        if (saved && typeof saved.offset === 'number' && saved.delta) { prioOffset = saved.offset; deltaCursor = saved.delta; fetched = prioOffset; }
      } catch {}
      if (!deltaCursor && have > 0) { prio = false; } // base partielle sans reprise connue : ordre habituel
    }
    // L'interface n'attend que si cet appareil n'a encore rien : une reprise garde l'application utilisable
    // (les fiches les moins répondues, téléchargées d'abord, sont déjà là)
    if (prio) initialDownload = true;
    type SyncPage = { records: (QuestionnaireItem & { deletedAt?: string })[]; cursor: string | null; hasMore: boolean; epoch?: string; reset?: boolean; total?: number; deltaCursor?: string | null; nextOffset?: number };
    const fetchPage = (): Promise<SyncPage> => {
      const qs = new URLSearchParams({ limit: String(prio ? PAGE_PRIO : PAGE) });
      if (prio) { qs.set('order', 'rarete'); qs.set('offset', String(prioOffset)); }
      else if (cursor) qs.set('since', cursor);
      if (sentEpoch) qs.set('epoch', sentEpoch);
      return api<SyncPage>('GET', `/v1/sync/${collectionPath}?${qs}`);
    };
    // Premier téléchargement : la page suivante est demandée pendant que la précédente est enregistrée
    // (le réseau lent et le traitement local se recouvrent au lieu de s'additionner)
    let ahead: Promise<SyncPage> | null = null;
    for (;;) {
      const page = await (ahead ?? fetchPage());
      ahead = null;
      if (prio && page.hasMore && typeof page.nextOffset === 'number' && page.deltaCursor) {
        const saveOffset = prioOffset;
        prioOffset = page.nextOffset;
        ahead = fetchPage();
        ahead.catch(() => {});
        prioOffset = saveOffset;
      }
      // Données remises à zéro côté serveur : le catalogue local est vidé avant d'écrire
      if (page.reset) { await clearCatalogue({ silent: true }); freshStore = true; setLastCollectionSyncTimestamp(collectionPath, ''); }
      // `total` = fiches restantes à partir de cette page : l'estimation suit un import qui continue pendant le téléchargement
      if (typeof page.total === 'number') announcedTotal = Math.max(announcedTotal, fetched + page.total);
      fetched += page.records.length;
      announcedTotal = Math.max(announcedTotal, fetched);
      if (announcedTotal) { downloadState.set(collectionPath, { done: fetched, total: announcedTotal }); emitProgress(); }
      if (page.epoch) sentEpoch = page.epoch;

      const removed: string[] = [];
      const upserts: QuestionnaireItem[] = [];
      for (const rec of page.records) {
        if (rec.deletedAt) removed.push(rec.id);
        else upserts.push(rec);
      }
      const cleaned = cleanPage(upserts);
      // Une fiche écartée par le nettoyage (supprimée en local, doublon) ne doit pas rester d'une synchro précédente
      const kept = new Set(cleaned.map(i => i.id));
      for (const u of upserts) if (!kept.has(u.id)) removed.push(u.id);
      await applyItemsDelta(cleaned, removed, { silent: true, knownEmpty: freshStore && removed.length === 0 });
      changed += cleaned.length + removed.length;

      if (prio) {
        if (typeof page.nextOffset === 'number' && page.deltaCursor) {
          prioOffset = page.nextOffset;
          if (!deltaCursor) deltaCursor = page.deltaCursor;
          try { localStorage.setItem(PRIO_KEY, JSON.stringify({ offset: prioOffset, delta: deltaCursor })); } catch {}
          if (page.epoch) setStoredEpoch(collectionPath, page.epoch);
          if (!page.hasMore) {
            cursor = deltaCursor;
            setLastCollectionSyncTimestamp(collectionPath, cursor);
            try { localStorage.removeItem(PRIO_KEY); } catch {}
          }
        } else {
          // Ancien serveur : il a répondu dans l'ordre habituel, on continue ainsi
          prio = false;
          if (page.cursor) cursor = page.cursor;
          if (page.epoch) setStoredEpoch(collectionPath, page.epoch);
          if (cursor) setLastCollectionSyncTimestamp(collectionPath, cursor);
        }
      } else {
        if (page.cursor) cursor = page.cursor;
        else if (page.reset) cursor = null;
        if (page.epoch) setStoredEpoch(collectionPath, page.epoch);
        if (cursor) setLastCollectionSyncTimestamp(collectionPath, cursor);
      }
      void saveSyncState({
        uid, cursor, epoch: sentEpoch,
        prio: prio && deltaCursor && page.hasMore ? { offset: prioOffset, delta: deltaCursor } : null
      });
      // Les premières fiches apparaissent à l'écran sans attendre la fin du téléchargement
      if (++pagesDone % 8 === 1) notifyCatalogueChanged(false);
      if (!page.hasMore) break;
      // Laisse respirer l'interface entre deux pages
      await new Promise(r => setTimeout(r, 0));
    }
    await flushSearchIndex();
    endDownload(collectionPath, fetched);
    notifyCatalogueChanged(true);
    return { changed, ok: true };
  } catch (err) {
    endDownload(collectionPath, 0);
    console.warn('Synchronisation du catalogue impossible, copie locale conservée :', err);
    if (typeof navigator === 'undefined' || navigator.onLine) signalerErreur(`Synchronisation du catalogue impossible : ${(err as any)?.message || err}`, (err as any)?.stack, { categorie: 'synchro-catalogue' });
    return { changed: 0, ok: false };
  }
}

/**
 * Signaux de modification : statut du catalogue et métriques (lus une fois), puis flux /v1/events
 * qui prévient quand une collection a changé (remplace metrics/catalog_versions).
 */
export function subscribeToCatalogSignals(callbacks: {
  onSeedStatus: (seedStatus: any) => void;
  onSystemMetrics: (metrics: any) => void;
  onCollectionVersionChanged: (collectionPath: string, versionIso: string) => void;
}): () => void {
  let stopped = false;

  const readMetrics = async () => {
    try {
      const page = await api<{ records: any[] }>('GET', '/v1/sync/metrics?limit=100');
      for (const rec of page.records) {
        if (rec.deletedAt) continue;
        if (rec.id === 'seed_status') callbacks.onSeedStatus(rec);
        else if (rec.id === 'summary') callbacks.onSystemMetrics(rec);
      }
    } catch {}
  };
  readMetrics();

  // Plusieurs signaux rapprochés pour une même collection ne déclenchent qu'une relecture
  const timers: Record<string, ReturnType<typeof setTimeout>> = {};
  const notifyChanged = (collection: string) => {
    clearTimeout(timers[collection]);
    timers[collection] = setTimeout(() => {
      if (!stopped) callbacks.onCollectionVersionChanged(collection, new Date().toISOString());
    }, 400);
  };
  const SYNCED = ['items', 'clans', 'villages', 'challenges', 'themes', 'badges', 'contributions', 'users'];
  // Relecture de tout (modifications seulement : léger) : reconnexion, retour sur l'onglet, retour du réseau, filet périodique
  let lastFullCheck = 0;
  const checkAll = (minGapMs = 15_000) => {
    if (stopped || Date.now() - lastFullCheck < minGapMs) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    lastFullCheck = Date.now();
    readMetrics();
    SYNCED.forEach(notifyChanged);
  };

  const unsubscribe = subscribeToEvents((collection) => {
    if (stopped) return;
    if (collection === 'metrics') { readMetrics(); return; }
    notifyChanged(collection);
  }, () => checkAll(0));

  const onVisible = () => { if (document.visibilityState === 'visible') checkAll(); };
  const onOnline = () => checkAll(0);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  window.addEventListener('focus', onVisible);
  // Filet de sécurité si le flux temps réel est coupé sans que l'appareil s'en aperçoive (réseau mobile, mise en veille)
  const poll = setInterval(() => { if (document.visibilityState === 'visible') checkAll(55_000); }, 60_000);

  return () => {
    stopped = true;
    unsubscribe();
    clearInterval(poll);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('focus', onVisible);
    Object.values(timers).forEach(clearTimeout);
  };
}

/** Le serveur est-il joignable ? (aucune donnée lue) */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await api('GET', '/health');
    return true;
  } catch {
    return false;
  }
}

export {
  signInWithPopup,
  fbSignOut,
  onAuthStateChanged
};
