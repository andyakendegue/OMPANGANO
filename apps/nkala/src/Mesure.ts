/**
 * Mesure du temps passé par module (décision de Capp du 15 nov. 2026 : répartition des abonnements et fonds des créateurs).
 * Un battement par minute pour l'onglet affiché, l'application au premier plan ; le serveur compte et plafonne.
 * Un écran ouvert par-dessus un onglet (vidéothèque Igolani, Kak'Igonjo, Contribuer) remplace son module le temps qu'il est ouvert :
 * une minute n'est jamais comptée deux fois. Aucune donnée n'est envoyée sans compte.
 */
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { battementModule } from '@nkala/noyau';
import { useAuth } from './AuthProvider';

export type ModuleMesure = 'onenji' | 'igolani' | 'azeva' | 'ontci' | 'nkala' | 'ompangano' | 'kakigonjo';

const surcharges: ModuleMesure[] = [];

/** Onglet d'un module : compte une minute par minute affichée (module remplacé par l'écran ouvert par-dessus, s'il y en a un). */
export function useTempsOnglet(module: ModuleMesure) {
  const { profil } = useAuth();
  useFocusEffect(useCallback(() => {
    if (!profil) return undefined;
    const battre = () => { if (AppState.currentState === 'active') battementModule(surcharges[surcharges.length - 1] ?? module).catch(() => {}); };
    battre();
    const t = setInterval(battre, 60_000);
    return () => clearInterval(t);
  }, [profil?.id, module])); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Écran ouvert par-dessus un onglet : son temps compte pour ce module tant qu'il est ouvert. */
export function useSurchargeModule(module: ModuleMesure, actif = true) {
  useEffect(() => {
    if (!actif) return undefined;
    surcharges.push(module);
    return () => { const i = surcharges.lastIndexOf(module); if (i >= 0) surcharges.splice(i, 1); };
  }, [module, actif]);
}
