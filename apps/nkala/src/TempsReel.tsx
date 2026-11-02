import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { fetch as fetchFlux } from 'expo/fetch';
import { ecouterModifications } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { donneesChangees } from './donnees';
import { rejouerFile } from './fileAttente';
import { lancerSynchro } from './synchro';

/**
 * Tient les données à jour comme le site web : flux de modifications du serveur (`/v1/events`), relecture à la
 * reconnexion, au retour du réseau, au retour dans l'application et toutes les minutes.
 */
export function TempsReel() {
  const { profil, recharger } = useAuth();
  const connecte = !!profil?.id;

  useEffect(() => {
    if (!connecte) return;
    let enLigne = true;
    const relire = async (catalogue: boolean) => {
      if (!enLigne) return;
      await recharger();
      if (catalogue) await lancerSynchro();
      donneesChangees();
    };

    const arreter = ecouterModifications(
      fetchFlux as never,
      (collection) => {
        if (collection === 'items') lancerSynchro();
        else if (collection === 'users' || collection === 'contributions') recharger().then(donneesChangees);
        else donneesChangees(); // thèmes, clans, villages, défis, badges
      },
      () => relire(true),
    );
    const reseau = NetInfo.addEventListener(e => {
      const retour = !enLigne && e.isConnected !== false;
      enLigne = e.isConnected !== false;
      if (retour) { rejouerFile().finally(() => relire(true)); }
    });
    const appli = AppState.addEventListener('change', st => { if (st === 'active') relire(false); });
    const minute = setInterval(() => { if (AppState.currentState === 'active') relire(true); }, 60_000);
    return () => { arreter(); reseau(); appli.remove(); clearInterval(minute); };
  }, [connecte, recharger]);

  return null;
}
