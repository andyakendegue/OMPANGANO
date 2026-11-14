/**
 * Monté une fois dans app/_layout.tsx : réenregistre les zones au démarrage, surveille app ouverte si besoin,
 * et ouvre l'annonce quand on touche une notification « Vous êtes à proximité ».
 */
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { demanderOuvertureAnnonce, reenregistrerZones, surveillerAppOuverte } from './alertesProximite';

export function EcouteAlertesLogement() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let arreter: () => void = () => {};
    const relancer = async () => { arreter(); await reenregistrerZones(); arreter = await surveillerAppOuverte(); };
    relancer();
    const etat = AppState.addEventListener('change', s => { if (s === 'active') relancer(); else { arreter(); arreter = () => {}; } });
    const ouvrir = (r: Notifications.NotificationResponse | null) => {
      const d = r?.notification.request.content.data as { type?: string; annonceId?: string } | undefined;
      if (d?.type !== 'logement' || !d.annonceId) return;
      demanderOuvertureAnnonce(d.annonceId);
      try { router.navigate('/(tabs)/village'); } catch { /* navigation pas encore prête : l'annonce s'ouvrira à l'arrivée dans le Village */ }
    };
    Notifications.getLastNotificationResponseAsync().then(ouvrir).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(ouvrir);
    return () => { arreter(); etat.remove(); sub.remove(); };
  }, []);
  return null;
}
