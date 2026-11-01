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
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { api, ApiError, isPermanentApiError, setTokenProvider, subscribeToEvents } from './data/api';
import { PROTECTED_USER_FIELDS } from '../shared/userSecurity';

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

// Connexion OU création de compte par e-mail, selon le choix EXPLICITE de l'utilisateur.
export async function signInOrRegisterWithEmail(
  email: string,
  password: string,
  mode: 'login' | 'register' = 'login'
): Promise<FirebaseUser> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const cred = mode === 'register'
      ? await createUserWithEmailAndPassword(auth, cleanEmail, password)
      : await signInWithEmailAndPassword(auth, cleanEmail, password);
    return cred.user;
  } catch (err: any) {
    const code = String(err?.code || '');
    let message = "Impossible d'établir la connexion par e-mail.";
    if (code === 'auth/email-already-in-use') {
      message = 'Un compte existe déjà avec cette adresse. Décochez « Je crée un nouveau compte » pour vous connecter.';
    } else if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      message = 'Adresse e-mail ou mot de passe incorrect. Pas encore de compte ? Cochez « Je crée un nouveau compte ».';
    } else if (code === 'auth/weak-password') {
      message = 'Mot de passe trop faible (6 caractères minimum).';
    } else if (code === 'auth/too-many-requests') {
      message = 'Trop de tentatives. Réessayez dans quelques minutes.';
    } else if (code === 'auth/network-request-failed') {
      message = 'Pas de connexion Internet.';
    }
    const wrapped = new Error(message) as Error & { code?: string };
    wrapped.code = code;
    throw wrapped;
  }
}

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
      const remaining: OfflineAdminMutation[] = [];

      for (const mut of pending) {
        try {
          if (mut.type === 'save' && mut.data) {
            await saveToApi(mut.collectionPath, mut.recordId, mut.data);
          } else if (mut.type === 'delete') {
            await deleteFromApi(mut.collectionPath, mut.recordId);
          }
          successCount++;
        } catch (replayErr) {
          if (isPermanentApiError(replayErr)) {
            console.warn(`✗ [Sync Replay Refusé] ${mut.collectionPath}/${mut.recordId} abandonné (${(replayErr as ApiError).message}).`);
            continue;
          }
          console.warn(`✗ [Sync Replay Échec] ${mut.collectionPath}/${mut.recordId}, conservé en attente:`, replayErr);
          remaining.push(mut);
        }
      }

      try {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
      } catch {}

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

    for (;;) {
      const qs = new URLSearchParams({ limit: '2000' });
      if (cursor) qs.set('since', cursor);
      if (sentEpoch) qs.set('epoch', sentEpoch);
      const page = await api<{ records: (T & { deletedAt?: string })[]; cursor: string | null; hasMore: boolean; epoch?: string; reset?: boolean }>(
        'GET', `/v1/sync/${encodeURIComponent(collectionPath)}?${qs}`
      );
      // Les données ont été remises à zéro côté serveur : le cache local est abandonné
      if (page.reset && !wasReset) { map.clear(); wasReset = true; }
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
    if (cursor) setLastCollectionSyncTimestamp(collectionPath, cursor);
    return { items: Array.from(map.values()), source: delta ? 'api-delta' : 'api-full', firestoreReadsUsed: 0 };
  } catch (err) {
    console.warn(`Synchronisation de ${collectionPath} impossible, cache local utilisé :`, err);
    return { items: localCachedItems, source: 'local-only', firestoreReadsUsed: 0 };
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
  const unsubscribe = subscribeToEvents((collection) => {
    if (stopped) return;
    if (collection === 'metrics') { readMetrics(); return; }
    clearTimeout(timers[collection]);
    timers[collection] = setTimeout(() => {
      if (!stopped) callbacks.onCollectionVersionChanged(collection, new Date().toISOString());
    }, 400);
  });

  return () => {
    stopped = true;
    unsubscribe();
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
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
};
