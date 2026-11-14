/**
 * Modules natifs facultatifs (SECURITE_ISO27001.md, règle M2).
 * Une mise à jour JavaScript (eas update) atteint aussi les versions installées qui n'ont pas les modules natifs ajoutés depuis :
 * importer un tel module en haut d'un fichier fait alors planter l'app au démarrage. On vérifie donc sa présence, puis on le
 * charge seulement au premier usage. Sans le module, l'usage lève MiseAJourNecessaire (message à afficher), sans planter.
 */
import { Platform, TurboModuleRegistry, NativeModules } from 'react-native';

export class MiseAJourNecessaire extends Error {
  constructor() { super('Cette fonction demande la dernière version de Nkala : mettez l\'application à jour depuis le magasin.'); }
}

/** true si le module natif Expo `nom` est présent dans cette version installée (toujours true sur le web). */
export function moduleNatifPresent(nom: string): boolean {
  if (Platform.OS === 'web') return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo-modules-core');
    return !!requireOptionalNativeModule(nom);
  } catch { return false; }
}

/** true si le module natif React Native `nom` (TurboModule ou ancien pont) est présent. */
export function moduleRnPresent(nom: string): boolean {
  if (Platform.OS === 'web') return true;
  try { return !!(TurboModuleRegistry.get(nom) ?? (NativeModules as Record<string, unknown>)[nom]); } catch { return false; }
}

/** Module chargé au premier accès à l'une de ses propriétés, seulement si `present()` ; sinon MiseAJourNecessaire. */
export function moduleParesseux<T extends object>(present: () => boolean, charger: () => T): T {
  let m: T | undefined;
  return new Proxy({} as T, {
    get(_c, cle) {
      if (!m) { if (!present()) throw new MiseAJourNecessaire(); m = charger(); }
      return (m as Record<string | symbol, unknown>)[cle];
    },
  });
}
