/**
 * Coffre des secrets de l'appareil (jeton de session SMS…) : trousseau iOS / Keystore Android via expo-secure-store,
 * jamais en clair dans AsyncStorage (ISO 27001 A.8.24, voir SECURITE_ISO27001.md).
 * Les anciennes versions de l'app (sans le module natif) reçoivent les mises à jour JavaScript : on retombe alors sur
 * AsyncStorage au lieu de planter. Sur le web, pas de trousseau : AsyncStorage (localStorage).
 * Une valeur déjà stockée en clair est déplacée dans le trousseau à sa première lecture.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type Trousseau = {
  getItemAsync(cle: string): Promise<string | null>;
  setItemAsync(cle: string, valeur: string, o?: Record<string, unknown>): Promise<void>;
  deleteItemAsync(cle: string): Promise<void>;
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY?: unknown;
};

let trousseau: Trousseau | null | undefined;
function lireTrousseau(): Trousseau | null {
  if (trousseau !== undefined) return trousseau;
  trousseau = null;
  if (Platform.OS === 'web') return trousseau;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo-modules-core');
    if (requireOptionalNativeModule('ExpoSecureStore')) trousseau = require('expo-secure-store') as Trousseau;
  } catch { trousseau = null; }
  return trousseau;
}

/** Le secret ne quitte pas l'appareil (pas de sauvegarde iCloud) et reste lisible en arrière-plan après le premier déverrouillage. */
const options = (t: Trousseau) => (t.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY !== undefined ? { keychainAccessible: t.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY } : {});

export async function lireSecret(cle: string): Promise<string | null> {
  const t = lireTrousseau();
  if (!t) return AsyncStorage.getItem(cle);
  const v = await t.getItemAsync(cle);
  if (v !== null) return v;
  const ancien = await AsyncStorage.getItem(cle);
  if (ancien !== null) {
    await t.setItemAsync(cle, ancien, options(t));
    await AsyncStorage.removeItem(cle);
  }
  return ancien;
}

export async function ecrireSecret(cle: string, valeur: string): Promise<void> {
  const t = lireTrousseau();
  if (!t) return AsyncStorage.setItem(cle, valeur);
  await t.setItemAsync(cle, valeur, options(t));
  await AsyncStorage.removeItem(cle).catch(() => {});
}

export async function effacerSecret(cle: string): Promise<void> {
  const t = lireTrousseau();
  await Promise.all([t?.deleteItemAsync(cle).catch(() => {}), AsyncStorage.removeItem(cle).catch(() => {})]);
}
