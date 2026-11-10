/**
 * Notifications : rappel doux quotidien (planifié sur l'appareil, à l'heure choisie), alerte hebdomadaire de pharmacie de garde, et notifications poussées
 * (jeton Expo envoyé au serveur ; envoi depuis la console). Rien n'est demandé tant que l'utilisateur n'a pas autorisé (écran d'autorisations).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { chargerContenu, enregistrerJetonPush } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { usePrefs } from './Prefs';

export const CLE_GARDE = 'nkala_garde_alerte';
const ID_RAPPEL = 'nkala-rappel', ID_GARDE = 'nkala-garde';

if (Platform.OS !== 'web') Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

async function permis() { try { return (await Notifications.getPermissionsAsync()).granted; } catch { return false; } }

export async function programmerRappel(heure: string | null) {
  if (Platform.OS === 'web') return;
  try { await Notifications.cancelScheduledNotificationAsync(ID_RAPPEL); } catch { /* aucun */ }
  if (!heure || !(await permis())) return;
  const [h, m] = heure.split(':').map(Number);
  const textes = (await chargerContenu('messages').catch(() => ({ lignes: [] as { type?: string; texte?: string }[] }))).lignes.filter(x => x.type === 'rappel' && x.texte);
  const corps = textes.length ? String(textes[Math.floor(Math.random() * textes.length)].texte) : 'Ta série t\'attend. Une leçon de trois minutes ?';
  await Notifications.scheduleNotificationAsync({ identifier: ID_RAPPEL, content: { title: 'Nkala', body: corps }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m } });
}

/** Alerte du lundi à 18 h : « pharmacies de garde de la semaine ». */
export async function programmerAlerteGarde(actif: boolean) {
  await AsyncStorage.setItem(CLE_GARDE, actif ? '1' : '0').catch(() => {});
  if (Platform.OS === 'web') return;
  try { await Notifications.cancelScheduledNotificationAsync(ID_GARDE); } catch { /* aucune */ }
  if (!actif || !(await permis())) return;
  await Notifications.scheduleNotificationAsync({ identifier: ID_GARDE, content: { title: 'Pharmacies de garde', body: 'Le planning de la semaine est dans Village.' }, trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 18, minute: 0 } });
}

export function Notifications_() {
  const { profil } = useAuth();
  const { prefs } = usePrefs();
  useEffect(() => { if (prefs.autorisationsVues) programmerRappel(prefs.mode === 'enfant' ? null : prefs.rappel); }, [prefs.rappel, prefs.autorisationsVues, prefs.mode]);
  useEffect(() => { if (prefs.autorisationsVues) AsyncStorage.getItem(CLE_GARDE).then(v => programmerAlerteGarde(v === '1')).catch(() => {}); }, [prefs.autorisationsVues]);
  // Jeton de notification poussée : seulement si l'autorisation est déjà donnée, sur un vrai appareil, avec un compte
  useEffect(() => {
    if (Platform.OS === 'web' || !profil || prefs.mode === 'enfant') return;
    (async () => {
      try {
        if (!(await permis())) return;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
        if (!projectId) return; // sans projet EAS, pas de jeton (les rappels locaux fonctionnent quand même)
        const j = await Notifications.getExpoPushTokenAsync({ projectId });
        await enregistrerJetonPush(j.data, Platform.OS);
      } catch { /* simulateur ou réseau : sans importance */ }
    })();
  }, [profil?.id, prefs.autorisationsVues, prefs.mode]);
  return null;
}
