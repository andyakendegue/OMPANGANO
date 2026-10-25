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
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc,
  deleteDoc,
  getDoc,
  getDocFromServer,
  collection,
  getDocs
} from 'firebase/firestore';
import { 
  getDatabase, 
  ref as rtdbRef, 
  set as rtdbSet, 
  remove as rtdbRemove,
  get as rtdbGet,
  child as rtdbChild
} from 'firebase/database';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore with the specific firestoreDatabaseId if configured, or default
const typedConfig = firebaseConfig as Record<string, any>;
export const db = (typedConfig.firestoreDatabaseId && typedConfig.firestoreDatabaseId !== '(default)')
  ? getFirestore(app, typedConfig.firestoreDatabaseId)
  : getFirestore(app);

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

// Operation Type and Error Info conforming strictly to Firebase Integration Skill
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

// Ensure there is always a valid Firebase Auth session before database writes
export async function ensureFirebaseAuthSession(): Promise<FirebaseUser | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.warn('Notice establishing anonymous Firebase session:', err);
    return null;
  }
}

// Dual write helper: persists to both Firestore AND Realtime Database
export async function dualSaveRecord(collectionPath: string, recordId: string, data: any): Promise<{ firestore: boolean; rtdb: boolean }> {
  let fsOk = false;
  let rtdbOk = false;

  // 1. Write to Firestore
  try {
    await setDoc(doc(db, collectionPath, recordId), data, { merge: true });
    fsOk = true;
  } catch (err) {
    console.warn(`Firestore save error on ${collectionPath}/${recordId}:`, err);
  }

  // 2. Write to Realtime Database
  try {
    if (rtdb) {
      await rtdbSet(rtdbRef(rtdb, `${collectionPath}/${recordId}`), data);
      rtdbOk = true;
    }
  } catch (err) {
    console.warn(`RTDB save error on ${collectionPath}/${recordId}:`, err);
  }

  return { firestore: fsOk, rtdb: rtdbOk };
}

// Dual delete helper
export async function dualDeleteRecord(collectionPath: string, recordId: string): Promise<{ firestore: boolean; rtdb: boolean }> {
  let fsOk = false;
  let rtdbOk = false;

  try {
    await deleteDoc(doc(db, collectionPath, recordId));
    fsOk = true;
  } catch (err) {
    console.warn(`Firestore delete error on ${collectionPath}/${recordId}:`, err);
  }

  try {
    if (rtdb) {
      await rtdbRemove(rtdbRef(rtdb, `${collectionPath}/${recordId}`));
      rtdbOk = true;
    }
  } catch (err) {
    console.warn(`RTDB delete error on ${collectionPath}/${recordId}:`, err);
  }

  return { firestore: fsOk, rtdb: rtdbOk };
}

// Validate connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
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
  signInWithPhoneNumber 
};
export type { ConfirmationResult };
