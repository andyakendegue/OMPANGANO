import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut,
  onAuthStateChanged, 
  signInAnonymously, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
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
  collection, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { 
  getDatabase, 
  ref as rtdbRef, 
  set as rtdbSet, 
  update as rtdbUpdate,
  remove as rtdbRemove,
  get as rtdbGet,
  child as rtdbChild
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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

// Connect user with phone number using real Firebase Auth account (guaranteeing genuine Firebase session)
export async function signInWithPhoneBridge(phoneNumber: string): Promise<FirebaseUser> {
  const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
  const internalEmail = `tel_${cleanDigits}@ompagano.ga`;
  const internalPassword = `ompa_${cleanDigits}_gab_2026!`;

  try {
    const cred = await signInWithEmailAndPassword(auth, internalEmail, internalPassword);
    return cred.user;
  } catch (err: any) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
      try {
        const cred = await createUserWithEmailAndPassword(auth, internalEmail, internalPassword);
        return cred.user;
      } catch (createErr: any) {
        console.warn('Notice creating phone bridge account:', createErr);
        // Fallback to anonymous if email creation fails
        const anonCred = await signInAnonymously(auth);
        return anonCred.user;
      }
    }
    // Attempt anonymous fallback
    const anonCred = await signInAnonymously(auth);
    return anonCred.user;
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
    // Anonymous auth might be disabled in Firebase Console; user must sign in via Google/Phone
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

  // 1. Write to Firestore (only if authenticated to prevent Missing or insufficient permissions)
  if (activeUser) {
    try {
      await setDoc(doc(db, collectionPath, recordId), sanitized, { merge: true });
      fsOk = true;
      console.info(`✓ Synchronisé Firestore avec succès: ${collectionPath}/${recordId}`);
    } catch (err) {
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
        console.warn(`[Batch Import] Fallback unitaire sur le lot ${start}-${start + chunk.length}:`, batchErr);
        for (const entry of chunk) {
          const safeId = String(entry.id || '').trim().replace(/[.$#[\]/\\]+/g, '_');
          if (!safeId) continue;
          const sanitized = sanitizeDataForFirebase(entry.data);
          rtdbChunkPayload[safeId] = sanitized;
          try {
            await setDoc(doc(db, collectionPath, safeId), sanitized, { merge: true });
          } catch (singleErr) {
            console.warn(`[Batch Import] Mise en file d'attente hors-ligne pour ${collectionPath}/${safeId}:`, singleErr);
            queueOfflineAdminMutation({ type: 'save', collectionPath, recordId: safeId, data: sanitized });
          }
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

  if (activeUser) {
    try {
      await deleteDoc(doc(db, collectionPath, recordId));
      fsOk = true;
      console.info(`✓ Supprimé de Firestore: ${collectionPath}/${recordId}`);
    } catch (err) {
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

  // If Firestore delete failed, queue for replay when back online
  if (!fsOk) {
    queueOfflineAdminMutation({ type: 'delete', collectionPath, recordId });
  }

  return { firestore: fsOk, rtdb: rtdbOk };
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

// Validate connection on boot (non-blocking, timeout-safe)
export async function testFirestoreConnection(): Promise<boolean> {
  if (!auth.currentUser) {
    // Before login, do not attempt protected reads to avoid permission errors
    return true;
  }
  try {
    const checkPromise = getDoc(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 3000)
    );
    await Promise.race([checkPromise, timeoutPromise]);
    console.info('Connexion Firestore active et vérifiée.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Mode hors-ligne actif ou client déconnecté.');
    }
    return false;
  }
}

export { 
  signInWithPopup, 
  fbSignOut, 
  onAuthStateChanged, 
  signInAnonymously, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
};
export type { ConfirmationResult };
