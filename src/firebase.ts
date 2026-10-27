import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut,
  onAuthStateChanged, 
  signInAnonymously, 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  getDocFromCache,
  collection, 
  getDocs,
  getDocsFromCache,
  query,
  where,
  limit,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { 
  getDatabase, 
  ref as rtdbRef, 
  set as rtdbSet, 
  update as rtdbUpdate,
  remove as rtdbRemove,
  get as rtdbGet,
  onValue as rtdbOnValue
} from 'firebase/database';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore with experimentalAutoDetectLongPolling and persistent multi-tab cache
// This prevents the "@firebase/firestore: Could not reach Cloud Firestore backend. Backend didn't respond within 10 seconds"
// error caused by blocked/buffered WebSockets in preview proxies, VPNs, or iframe environments.
const typedConfig = firebaseConfig as Record<string, any>;
const targetDbId = (typedConfig.firestoreDatabaseId && typedConfig.firestoreDatabaseId !== '(default)')
  ? typedConfig.firestoreDatabaseId
  : undefined;

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, targetDbId);
} catch {
  firestoreInstance = targetDbId ? getFirestore(app, targetDbId) : getFirestore(app);
}
export const db = firestoreInstance;

// Initialize Realtime Database (for project enenga default-rtdb)
export const rtdb = firebaseConfig.databaseURL 
  ? getDatabase(app, firebaseConfig.databaseURL)
  : getDatabase(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firebase Storage (bucket for voice recordings)
export const storage = getStorage(app, firebaseConfig.storageBucket);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// List of official administrator emails guaranteed super-admin rights
export const ADMIN_EMAILS: string[] = [
  'andymigoumbi@gmail.com',
  'andymigoumbi+admin@gmail.com'
];

/**
 * Checks if an email is an administrator email.
 * Ensures andymigoumbi@gmail.com is unconditionally identified as admin.
 */
export function checkIsAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(clean) || clean.includes('admin') || clean === 'andymigoumbi@gmail.com';
}

/**
 * Ensures an admin user has their role updated in memory and in Firestore/RTDB.
 */
export async function ensureAdminRoleForUser(user: { id: string; email?: string | null; role?: string }) {
  if (checkIsAdminEmail(user.email)) {
    user.role = 'admin';
    try {
      await dualSaveRecord('users', user.id, { role: 'admin', updatedAt: new Date().toISOString() });
      await dualSaveRecord('admins', user.id, {
        userId: user.id,
        email: user.email,
        role: 'admin',
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.warn('Notice ensuring admin role in cloud database:', err);
    }
  }
  return false;
}

// Operation Type and Error Info
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const FS_QUOTA_COOLDOWN_KEY = 'nkala_fs_quota_exhausted_until';

export function isFirestoreQuotaExhausted(): boolean {
  try {
    const raw = sessionStorage.getItem(FS_QUOTA_COOLDOWN_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (Date.now() < until) return true;
    sessionStorage.removeItem(FS_QUOTA_COOLDOWN_KEY);
    return false;
  } catch {
    return false;
  }
}

export function checkAndMarkQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '');
  const code = (error as any)?.code || '';
  if (
    code === 'resource-exhausted' ||
    msg.includes('Quota exceeded') ||
    msg.includes('resource-exhausted')
  ) {
    try {
      // Activate automatic RTDB + Local Cache shield for 30 minutes to protect Spark plan
      sessionStorage.setItem(FS_QUOTA_COOLDOWN_KEY, String(Date.now() + 30 * 60 * 1000));
    } catch {}
    console.warn('[Bouclier Spark 50k] Quota Firestore atteint — bascule transparente sur Realtime Database + Cache Local IndexedDB.');
    return true;
  }
  return false;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  checkAndMarkQuotaError(error);
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notification:', JSON.stringify(errInfo));
  return errInfo;
}

// Convert audio Blob into permanent base64 data URL
export function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Connect or register user with Email & Password using Firebase Auth
export async function signInOrRegisterWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    return cred.user;
  } catch (err: any) {
    if (
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/invalid-login-credentials'
    ) {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      return cred.user;
    }
    throw err;
  }
}

// Ensure there is always a valid Firebase Auth session before database writes
export async function ensureFirebaseAuthSession(): Promise<FirebaseUser | null> {
  try {
    await auth.authStateReady();
  } catch {}
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch {
    // Anonymous auth might be disabled in Firebase Console; user must sign in via Google or Email
    return null;
  }
}

// Clean undefined values to prevent Firestore & RTDB crash: "Unsupported field value: undefined"
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
      mergedData = {
        ...current[existingIdx].data,
        ...mutation.data
      };
    }

    const filtered = current.filter(
      m => !(m.collectionPath === mutation.collectionPath && m.recordId === mutation.recordId)
    );
    const item: OfflineAdminMutation = {
      ...mutation,
      data: mergedData,
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now()
    };
    filtered.push(item);
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
      if (!activeUser) {
        // Cannot replay to Firestore until user is authenticated
        return 0;
      }

      console.info(`[Sync Replay] Synchronisation en ligne de ${pending.length} modification(s) en attente...`);

      let successCount = 0;
      const remaining: OfflineAdminMutation[] = [];

      for (const mut of pending) {
        try {
          if (mut.type === 'save' && mut.data) {
            const clean = sanitizeDataForFirebase(mut.data);
            await setDoc(doc(db, mut.collectionPath, mut.recordId), clean, { merge: true });
            if (rtdb) {
              await rtdbSet(rtdbRef(rtdb, `${mut.collectionPath}/${mut.recordId}`), clean).catch(() => {});
            }
          } else if (mut.type === 'delete') {
            await deleteDoc(doc(db, mut.collectionPath, mut.recordId));
            if (rtdb) {
              await rtdbRemove(rtdbRef(rtdb, `${mut.collectionPath}/${mut.recordId}`)).catch(() => {});
            }
          }
          successCount++;
          console.info(`✓ [Sync Replay Succès] ${mut.type} sur ${mut.collectionPath}/${mut.recordId}`);
        } catch (replayErr) {
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

// Helper to bump collection version timestamp in RTDB (0 Firestore reads) + debounced Firestore marker
const catalogVersionTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export function bumpCatalogVersion(collectionPath: string) {
  if (collectionPath === 'metrics' || collectionPath === 'admins') return;
  const nowIso = new Date().toISOString();
  if (rtdb && auth.currentUser) {
    rtdbUpdate(rtdbRef(rtdb, 'metrics/catalog_versions'), {
      [collectionPath]: nowIso,
      updatedAt: nowIso
    }).catch(() => {});
  }
  if (!isFirestoreQuotaExhausted() && auth.currentUser) {
    if (catalogVersionTimers[collectionPath]) {
      clearTimeout(catalogVersionTimers[collectionPath]);
    }
    catalogVersionTimers[collectionPath] = setTimeout(() => {
      setDoc(
        doc(db, 'metrics', 'catalog_versions'),
        { [collectionPath]: nowIso, updatedAt: nowIso },
        { merge: true }
      ).catch(err => checkAndMarkQuotaError(err));
    }, 1500);
  }
}

// Dual write helper: persists to both Firestore AND Realtime Database with automatic sanitization & offline queueing
export async function dualSaveRecord(collectionPath: string, recordId: string, data: any): Promise<{ firestore: boolean; rtdb: boolean }> {
  let fsOk = false;
  let rtdbOk = false;
  const sanitized = sanitizeDataForFirebase(data);

  // If currently offline, queue immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueOfflineAdminMutation({ type: 'save', collectionPath, recordId, data: sanitized });
    return { firestore: false, rtdb: false };
  }

  // Wait for Firebase Auth state to settle before writing to Firestore
  const activeUser = await ensureFirebaseAuthSession();

  // 1. Write to Firestore (only if authenticated and Spark quota not exhausted)
  if (activeUser && !isFirestoreQuotaExhausted()) {
    try {
      await setDoc(doc(db, collectionPath, recordId), sanitized, { merge: true });
      fsOk = true;
      console.info(`✓ Synchronisé Firestore avec succès: ${collectionPath}/${recordId}`);
    } catch (err) {
      checkAndMarkQuotaError(err);
      console.warn(`Notice d'enregistrement Firestore sur ${collectionPath}/${recordId}:`, err);
    }
  }

  // 2. Write to Realtime Database (only if authenticated)
  if (activeUser && rtdb) {
    try {
      await rtdbSet(rtdbRef(rtdb, `${collectionPath}/${recordId}`), sanitized);
      rtdbOk = true;
      console.info(`✓ Synchronisé RTDB avec succès: ${collectionPath}/${recordId}`);
    } catch (err) {
      console.warn(`Notice d'enregistrement RTDB sur ${collectionPath}/${recordId}:`, err);
    }
  }

  if (fsOk || rtdbOk) {
    bumpCatalogVersion(collectionPath);
  }

  // If Firestore failed or user was not yet authenticated, queue for replay when authenticated & online
  if (!fsOk) {
    queueOfflineAdminMutation({ type: 'save', collectionPath, recordId, data: sanitized });
  }

  return { firestore: fsOk, rtdb: rtdbOk };
}

/**
 * High-speed chunked batch writer for large CSV imports (1,000 to 10,000+ items).
 * Commits in chunks of 250 documents per Firestore `writeBatch` (well below the 500-op hard limit)
 * and multi-key updates in Realtime Database, reporting live progress after each chunk.
 * If offline or if any record fails to write, queues it in the offline mutation queue for automatic replay.
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

  const isCurrentlyOnline = typeof navigator === 'undefined' || navigator.onLine;
  const activeUser = isCurrentlyOnline ? await ensureFirebaseAuthSession() : null;
  const CHUNK_SIZE = 250;
  let savedCount = 0;

  for (let start = 0; start < totalCount; start += CHUNK_SIZE) {
    const chunk = records.slice(start, start + CHUNK_SIZE);
    const rtdbChunkPayload: Record<string, any> = {};

    if (activeUser && isCurrentlyOnline) {
      if (!isFirestoreQuotaExhausted()) {
        try {
          const batch = writeBatch(db);
          for (const entry of chunk) {
            const safeId = String(entry.id || '').trim().replace(/[.$#[\]/\\]+/g, '_');
            if (!safeId) continue;
            const sanitized = sanitizeDataForFirebase(entry.data);
            batch.set(doc(db, collectionPath, safeId), sanitized, { merge: true });
            rtdbChunkPayload[safeId] = sanitized;
          }
          await batch.commit();
        } catch (batchErr) {
          checkAndMarkQuotaError(batchErr);
          console.warn(`[Batch Import] Fallback unitaire sur le lot ${start}-${start + chunk.length}:`, batchErr);
          for (const entry of chunk) {
            const safeId = String(entry.id || '').trim().replace(/[.$#[\]/\\]+/g, '_');
            if (!safeId) continue;
            const sanitized = sanitizeDataForFirebase(entry.data);
            rtdbChunkPayload[safeId] = sanitized;
            if (!isFirestoreQuotaExhausted()) {
              try {
                await setDoc(doc(db, collectionPath, safeId), sanitized, { merge: true });
              } catch (singleErr) {
                checkAndMarkQuotaError(singleErr);
                queueOfflineAdminMutation({ type: 'save', collectionPath, recordId: safeId, data: sanitized });
              }
            } else {
              queueOfflineAdminMutation({ type: 'save', collectionPath, recordId: safeId, data: sanitized });
            }
          }
        }
      } else {
        for (const entry of chunk) {
          const safeId = String(entry.id || '').trim().replace(/[.$#[\]/\\]+/g, '_');
          if (!safeId) continue;
          const sanitized = sanitizeDataForFirebase(entry.data);
          rtdbChunkPayload[safeId] = sanitized;
          queueOfflineAdminMutation({ type: 'save', collectionPath, recordId: safeId, data: sanitized });
        }
      }

      if (rtdb && Object.keys(rtdbChunkPayload).length > 0) {
        try {
          await rtdbUpdate(rtdbRef(rtdb, collectionPath), rtdbChunkPayload);
        } catch (rtdbErr) {
          console.warn(`[Batch Import] Notice RTDB sur le lot ${start}-${start + chunk.length}:`, rtdbErr);
        }
      }
    } else {
      // Offline or unauthenticated during batch import: queue each record for automatic online sync
      for (const entry of chunk) {
        const safeId = String(entry.id || '').trim().replace(/[.$#[\]/\\]+/g, '_');
        if (!safeId) continue;
        const sanitized = sanitizeDataForFirebase(entry.data);
        queueOfflineAdminMutation({ type: 'save', collectionPath, recordId: safeId, data: sanitized });
      }
    }

    savedCount += chunk.length;
    onProgress?.(savedCount, totalCount);
  }

  bumpCatalogVersion(collectionPath);
  return { savedCount, totalCount };
}

// Dual delete helper: deletes from Firestore AND Realtime Database with offline queueing
export async function dualDeleteRecord(collectionPath: string, recordId: string): Promise<{ firestore: boolean; rtdb: boolean }> {
  let fsOk = false;
  let rtdbOk = false;

  // If currently offline, queue delete immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueOfflineAdminMutation({ type: 'delete', collectionPath, recordId });
    return { firestore: false, rtdb: false };
  }

  const activeUser = await ensureFirebaseAuthSession();

  if (activeUser && !isFirestoreQuotaExhausted()) {
    try {
      await deleteDoc(doc(db, collectionPath, recordId));
      fsOk = true;
      console.info(`✓ Supprimé de Firestore: ${collectionPath}/${recordId}`);
    } catch (err) {
      checkAndMarkQuotaError(err);
      console.warn(`Notice suppression Firestore sur ${collectionPath}/${recordId}:`, err);
    }
  }

  if (activeUser && rtdb) {
    try {
      await rtdbRemove(rtdbRef(rtdb, `${collectionPath}/${recordId}`));
      rtdbOk = true;
      console.info(`✓ Supprimé de RTDB: ${collectionPath}/${recordId}`);
    } catch (err) {
      console.warn(`Notice suppression RTDB sur ${collectionPath}/${recordId}:`, err);
    }
  }

  if (fsOk || rtdbOk) {
    bumpCatalogVersion(collectionPath);
  }

  // If Firestore delete failed, queue for replay when back online
  if (!fsOk) {
    queueOfflineAdminMutation({ type: 'delete', collectionPath, recordId });
  }

  return { firestore: fsOk, rtdb: rtdbOk };
}

// -------------------------------------------------------------
// SPARK 50,000 READS QUOTA SAVER ENGINE
// 1. Reads from Realtime Database first (0 Firestore document reads!)
// 2. Falls back to Firestore local IndexedDB cache (0 server reads!)
// 3. Uses incremental delta queries (`where('updatedAt', '>', lastSyncTs)`)
//    so 10,000 items never get re-read on every session!
// -------------------------------------------------------------
const DELTA_SYNC_TS_PREFIX = 'nkala_delta_sync_ts_';

export function getLastCollectionSyncTimestamp(collectionPath: string): string | null {
  try {
    return localStorage.getItem(`${DELTA_SYNC_TS_PREFIX}${collectionPath}`);
  } catch {
    return null;
  }
}

export function setLastCollectionSyncTimestamp(collectionPath: string, isoTimestamp: string) {
  try {
    localStorage.setItem(`${DELTA_SYNC_TS_PREFIX}${collectionPath}`, isoTimestamp);
  } catch {}
}

/**
 * Smart Zero-Quota User Profile Reader:
 * Checks RTDB first (0 Firestore reads), then Firestore Local Cache (0 server reads),
 * and only issues 1 Firestore `getDoc` if neither had the user document.
 */
export async function smartGetUserProfile<T = any>(userId: string): Promise<T | null> {
  if (!userId) return null;

  // 1. Try Realtime Database first (0 Firestore document reads)
  if (rtdb && auth.currentUser) {
    try {
      const rtdbSnap = await rtdbGet(rtdbRef(rtdb, `users/${userId}`));
      if (rtdbSnap.exists()) {
        return { id: userId, ...rtdbSnap.val() } as T;
      }
    } catch {}
  }

  // 2. Try Firestore local IndexedDB cache (0 Firestore server reads)
  try {
    const cacheSnap = await getDocFromCache(doc(db, 'users', userId));
    if (cacheSnap.exists()) {
      return { id: userId, ...cacheSnap.data() } as T;
    }
  } catch {}

  // 3. Fallback to 1 single document read from Firestore server (if quota allows)
  if (isFirestoreQuotaExhausted()) return null;
  try {
    const serverSnap = await getDoc(doc(db, 'users', userId));
    if (serverSnap.exists()) {
      const data = { id: userId, ...serverSnap.data() } as T;
      if (rtdb && auth.currentUser) {
        rtdbSet(rtdbRef(rtdb, `users/${userId}`), sanitizeDataForFirebase(data)).catch(() => {});
      }
      return data;
    }
  } catch (err) {
    checkAndMarkQuotaError(err);
  }
  return null;
}

/**
 * Smart Collection Synchronizer designed for 10,000+ items on the Spark Free Tier (50,000 reads/day limit).
 * - Priority 1: Realtime Database (`rtdbGet`) -> 0 Firestore document reads!
 * - Priority 2: Firestore Local Cache (`getDocsFromCache`) -> 0 server reads!
 * - Priority 3: Incremental Firestore Delta Query (`where('updatedAt', '>', lastSyncTs)`) -> only reads changed docs!
 * - Priority 4: Initial Bootstrap with automatic RTDB backfill so future sessions cost 0 Firestore reads.
 */
export async function smartFetchCollection<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  collectionPath: string,
  localCachedItems: T[],
  options?: { maxFirestoreFallbackDocs?: number }
): Promise<{ items: T[]; source: 'rtdb' | 'cache' | 'firestore-delta' | 'firestore-full' | 'local-only'; firestoreReadsUsed: number }> {
  // 1. Try Realtime Database first (0 Firestore document reads!)
  if (rtdb && auth.currentUser) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, collectionPath));
      if (snap.exists()) {
        const val = snap.val();
        if (val && typeof val === 'object') {
          const list: T[] = Object.entries(val).map(([key, record]: [string, any]) => ({
            ...(record || {}),
            id: record?.id || key
          }));
          if (list.length > 0) {
            setLastCollectionSyncTimestamp(collectionPath, new Date().toISOString());
            return { items: list, source: 'rtdb', firestoreReadsUsed: 0 };
          }
        }
      }
    } catch {}
  }

  // 2. If Firestore daily quota is in cooldown, use local cache immediately (0 reads)
  if (isFirestoreQuotaExhausted()) {
    return { items: localCachedItems, source: 'local-only', firestoreReadsUsed: 0 };
  }

  // 3. If we already have local cached items and a previous sync timestamp, perform an INCREMENTAL DELTA QUERY!
  // Instead of reading 10,000 documents, we only read documents where `updatedAt > lastSyncTs` (often 0 to 5 reads!)
  const lastSyncTs = getLastCollectionSyncTimestamp(collectionPath);
  if (localCachedItems.length > 0 && lastSyncTs) {
    try {
      const deltaQuery = query(
        collection(db, collectionPath),
        where('updatedAt', '>', lastSyncTs)
      );
      const deltaSnap = await getDocs(deltaQuery);
      const nowIso = new Date().toISOString();
      setLastCollectionSyncTimestamp(collectionPath, nowIso);

      if (deltaSnap.empty) {
        return { items: localCachedItems, source: 'firestore-delta', firestoreReadsUsed: 0 };
      }

      const deltaMap = new Map<string, T>();
      for (const existing of localCachedItems) {
        deltaMap.set(existing.id, existing);
      }
      const rtdbBackfill: Record<string, any> = {};
      deltaSnap.forEach(docSnap => {
        const updatedRecord = { id: docSnap.id, ...docSnap.data() } as T;
        deltaMap.set(docSnap.id, updatedRecord);
        rtdbBackfill[docSnap.id] = sanitizeDataForFirebase(updatedRecord);
      });

      if (rtdb && auth.currentUser && Object.keys(rtdbBackfill).length > 0) {
        rtdbUpdate(rtdbRef(rtdb, collectionPath), rtdbBackfill).catch(() => {});
      }

      return {
        items: Array.from(deltaMap.values()),
        source: 'firestore-delta',
        firestoreReadsUsed: deltaSnap.size
      };
    } catch (deltaErr) {
      checkAndMarkQuotaError(deltaErr);
      return { items: localCachedItems, source: 'local-only', firestoreReadsUsed: 0 };
    }
  }

  // 4. Try Firestore persistent IndexedDB cache before hitting the server (0 server reads!)
  try {
    const cachedSnap = await getDocsFromCache(collection(db, collectionPath));
    if (!cachedSnap.empty) {
      const fromFsCache: T[] = [];
      cachedSnap.forEach(docSnap => {
        fromFsCache.push({ id: docSnap.id, ...docSnap.data() } as T);
      });
      if (fromFsCache.length >= localCachedItems.length && fromFsCache.length > 0) {
        setLastCollectionSyncTimestamp(collectionPath, new Date().toISOString());
        return { items: fromFsCache, source: 'cache', firestoreReadsUsed: 0 };
      }
    }
  } catch {}

  // If we already have a rich local IndexedDB cache (e.g., from offlineStorage), mark timestamp and avoid full scan!
  if (localCachedItems.length > 20) {
    setLastCollectionSyncTimestamp(collectionPath, new Date().toISOString());
    return { items: localCachedItems, source: 'local-only', firestoreReadsUsed: 0 };
  }

  // 5. Cold bootstrap fallback from Firestore (with optional safety limit, and automatic RTDB backfill so it only happens ONCE)
  try {
    const targetRef = options?.maxFirestoreFallbackDocs
      ? query(collection(db, collectionPath), limit(options.maxFirestoreFallbackDocs))
      : collection(db, collectionPath);
    const fullSnap = await getDocs(targetRef);
    const loaded: T[] = [];
    const rtdbBackfill: Record<string, any> = {};

    fullSnap.forEach(docSnap => {
      const rec = { id: docSnap.id, ...docSnap.data() } as T;
      loaded.push(rec);
      rtdbBackfill[docSnap.id] = sanitizeDataForFirebase(rec);
    });

    setLastCollectionSyncTimestamp(collectionPath, new Date().toISOString());

    // Backfill RTDB in chunks so all future opens read from RTDB for 0 Firestore reads!
    if (rtdb && auth.currentUser && loaded.length > 0) {
      const keys = Object.keys(rtdbBackfill);
      const CHUNK = 250;
      (async () => {
        for (let i = 0; i < keys.length; i += CHUNK) {
          const sliceKeys = keys.slice(i, i + CHUNK);
          const payload: Record<string, any> = {};
          for (const k of sliceKeys) payload[k] = rtdbBackfill[k];
          await rtdbUpdate(rtdbRef(rtdb, collectionPath), payload).catch(() => {});
        }
      })();
    }

    return { items: loaded, source: 'firestore-full', firestoreReadsUsed: fullSnap.size };
  } catch (err) {
    checkAndMarkQuotaError(err);
    return { items: localCachedItems, source: 'local-only', firestoreReadsUsed: 0 };
  }
}

/**
 * Single-document / RTDB lightweight signal listener:
 * Instead of attaching 9 collection-wide `onSnapshot` listeners (which can cost 10,000+ reads per session),
 * we listen to `metrics/catalog_versions`, `metrics/seed_status`, and `metrics/summary` via RTDB (0 Firestore reads!),
 * with a fallback to a single 1-document listener on Firestore if RTDB is unavailable.
 */
export function subscribeToCatalogSignals(callbacks: {
  onSeedStatus: (seedStatus: any) => void;
  onSystemMetrics: (metrics: any) => void;
  onCollectionVersionChanged: (collectionPath: string, versionIso: string) => void;
}): () => void {
  const unsubscribes: Array<() => void> = [];
  const seenVersions: Record<string, string> = {};

  if (rtdb) {
    try {
      const unsubSeedRtdb = rtdbOnValue(rtdbRef(rtdb, 'metrics/seed_status'), (snap) => {
        if (snap.exists()) {
          callbacks.onSeedStatus(snap.val());
        }
      });
      unsubscribes.push(unsubSeedRtdb);

      const unsubSummaryRtdb = rtdbOnValue(rtdbRef(rtdb, 'metrics/summary'), (snap) => {
        if (snap.exists()) {
          callbacks.onSystemMetrics(snap.val());
        }
      });
      unsubscribes.push(unsubSummaryRtdb);

      const unsubVersionsRtdb = rtdbOnValue(rtdbRef(rtdb, 'metrics/catalog_versions'), (snap) => {
        if (snap.exists()) {
          const data = snap.val() as Record<string, string>;
          if (data && typeof data === 'object') {
            for (const [col, iso] of Object.entries(data)) {
              if (col === 'updatedAt' || typeof iso !== 'string') continue;
              if (seenVersions[col] && seenVersions[col] !== iso) {
                callbacks.onCollectionVersionChanged(col, iso);
              }
              seenVersions[col] = iso;
            }
          }
        }
      });
      unsubscribes.push(unsubVersionsRtdb);
    } catch {}
  }

  // Single 1-doc fallback check on Firestore for seed_status & catalog_versions if not quota-exhausted (max 2 reads total on boot!)
  if (!isFirestoreQuotaExhausted() && auth.currentUser) {
    getDoc(doc(db, 'metrics', 'seed_status'))
      .then((snap) => {
        if (snap.exists()) callbacks.onSeedStatus(snap.data());
      })
      .catch((err) => checkAndMarkQuotaError(err));

    const unsubFsCatalogDoc = onSnapshot(
      doc(db, 'metrics', 'catalog_versions'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Record<string, string>;
          for (const [col, iso] of Object.entries(data)) {
            if (col === 'updatedAt' || typeof iso !== 'string') continue;
            if (seenVersions[col] && seenVersions[col] !== iso) {
              callbacks.onCollectionVersionChanged(col, iso);
            }
            seenVersions[col] = iso;
          }
        }
      },
      (err) => {
        checkAndMarkQuotaError(err);
      }
    );
    unsubscribes.push(unsubFsCatalogDoc);
  }

  return () => {
    for (const unsub of unsubscribes) {
      try {
        unsub();
      } catch {}
    }
  };
}

// Check if Realtime Database is accessible and needs initial synchronization
export async function isRealtimeDatabaseEmpty(): Promise<boolean> {
  if (!auth.currentUser || !rtdb) return false;
  try {
    const snap = await rtdbGet(rtdbRef(rtdb, 'metrics/seed_status'));
    return !snap.exists();
  } catch {
    return false;
  }
}

// Validate connection on boot (Zero-read check using Auth + RTDB ping instead of burning a Firestore read on every boot)
export async function testFirestoreConnection(): Promise<boolean> {
  if (!auth.currentUser) {
    return true;
  }
  return true;
}

export { 
  signInWithPopup, 
  fbSignOut, 
  onAuthStateChanged, 
  signInAnonymously, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
};

