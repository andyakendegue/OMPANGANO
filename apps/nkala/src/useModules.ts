import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { chargerModules, ecouterModules, versionDesModules } from '@nkala/noyau';

/** Redessine le composant quand un interrupteur change (console, retour dans l'app). Renvoie le numéro de version. */
export const useModules = (): number => useSyncExternalStore(ecouterModules, versionDesModules, versionDesModules);

/** Intervalle de relecture des interrupteurs, pour tous (connecté ou non, application ou web). */
export const RELECTURE_MODULES_MS = 30_000;

/**
 * À monter une fois : relit les interrupteurs au démarrage, à chaque retour dans l'application, et toutes les 30 s tant que
 * l'application est au premier plan. Un menu activé ou désactivé dans la console se propage ainsi à toutes les installations
 * et au web, même sans compte ; les comptes connectés le reçoivent aussitôt par le flux des modifications (TempsReel).
 */
export function useRelectureModules(cle?: string) {
  useEffect(() => { void chargerModules(); }, [cle]);
  useEffect(() => {
    const s = AppState.addEventListener('change', st => { if (st === 'active') void chargerModules(); });
    const t = setInterval(() => { if (AppState.currentState === 'active') void chargerModules(); }, RELECTURE_MODULES_MS);
    return () => { s.remove(); clearInterval(t); };
  }, []);
}
