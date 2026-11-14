import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { chargerModules, ecouterModules, versionDesModules } from '@nkala/noyau';

/** Redessine le composant quand un interrupteur change (console, retour dans l'app). Renvoie le numéro de version. */
export const useModules = (): number => useSyncExternalStore(ecouterModules, versionDesModules, versionDesModules);

/** À monter une fois : relit les interrupteurs au démarrage et à chaque retour dans l'application. */
export function useRelectureModules(cle?: string) {
  useEffect(() => { void chargerModules(); }, [cle]);
  useEffect(() => {
    const s = AppState.addEventListener('change', st => { if (st === 'active') void chargerModules(); });
    return () => s.remove();
  }, []);
}
