import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { initializeAuth, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { configurerApi, setTokenProvider } from '@nkala/noyau';
import config from './firebase.config.json';

// Même projet Firebase que le web (authentification seulement ; les données sont sur le VPS).
const app = getApps().length ? getApp() : initializeApp(config);

// getReactNativePersistence n'existe que dans le paquet React Native de Firebase (absent des types).
const getReactNativePersistence = (FirebaseAuth as any).getReactNativePersistence as (s: typeof AsyncStorage) => FirebaseAuth.Persistence;

// Sur mobile la session est conservée dans AsyncStorage ; sur le web, persistance du navigateur.
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : (() => {
      try { return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
      catch { return getAuth(app); }
    })();

configurerApi(process.env.EXPO_PUBLIC_API_URL || 'https://api-ompangano.essaka.engineering');

setTokenProvider(async (forceRefresh) => {
  try {
    await auth.authStateReady();
    return (await auth.currentUser?.getIdToken(forceRefresh)) ?? null;
  } catch {
    return null;
  }
});
