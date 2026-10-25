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
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.warn('Notice establishing anonymous Firebase session:', err);
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

// Dual write helper: persists to both Firestore AND Realtime Database with automatic sanitization
export async function dualSaveRecord(collectionPath: string, recordId: string, data: any): Promise<{ firestore: boolean; rtdb: boolean }> {
  let fsOk = false;
  let rtdbOk = false;
  const sanitized = sanitizeDataForFirebase(data);

  // 1. Write to Firestore
  try {
    await setDoc(doc(db, collectionPath, recordId), sanitized, { merge: true });
    fsOk = true;
    console.info(`✓ Synchronisé Firestore avec succès: ${collectionPath}/${recordId}`);
  } catch (err) {
    console.error(`✗ Erreur d'enregistrement Firestore sur ${collectionPath}/${recordId}:`, err);
  }

  // 2. Write to Realtime Database
  try {
    if (rtdb) {
      await rtdbSet(rtdbRef(rtdb, `${collectionPath}/${recordId}`), sanitized);
      rtdbOk = true;
      console.info(`✓ Synchronisé RTDB avec succès: ${collectionPath}/${recordId}`);
    }
  } catch (err) {
    console.error(`✗ Erreur d'enregistrement RTDB sur ${collectionPath}/${recordId}:`, err);
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
    console.info(`✓ Supprimé de Firestore: ${collectionPath}/${recordId}`);
  } catch (err) {
    console.error(`✗ Erreur suppression Firestore sur ${collectionPath}/${recordId}:`, err);
  }

  try {
    if (rtdb) {
      await rtdbRemove(rtdbRef(rtdb, `${collectionPath}/${recordId}`));
      rtdbOk = true;
      console.info(`✓ Supprimé de RTDB: ${collectionPath}/${recordId}`);
    }
  } catch (err) {
    console.error(`✗ Erreur suppression RTDB sur ${collectionPath}/${recordId}:`, err);
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
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
};
export type { ConfirmationResult };
