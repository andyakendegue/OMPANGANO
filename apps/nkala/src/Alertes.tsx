import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { EcranModal } from './ui';
import { couleurs, stylesDyn } from './theme';

// Historique des alertes de l'application (équivalent de NotificationService.addInAppNotification du site web).
const CLE = 'nkala_inapp_alerts';
const CLE_RAPPEL = 'nkala_daily_reminder';

export interface Alerte { id: string; userId: string; title: string; message: string; type: string; read: boolean; createdAt: string }

export async function lireAlertes(): Promise<Alerte[]> {
  try { return JSON.parse((await AsyncStorage.getItem(CLE)) || '[]'); } catch { return []; }
}
export async function ajouterAlerte(a: Omit<Alerte, 'id' | 'read' | 'createdAt'> & Partial<Alerte>) {
  const liste = await lireAlertes();
  const nouvelle: Alerte = { id: `a-${Date.now()}`, read: false, createdAt: new Date().toISOString(), ...a };
  await AsyncStorage.setItem(CLE, JSON.stringify([nouvelle, ...liste].slice(0, 50)));
}
export async function toutLu() {
  await AsyncStorage.setItem(CLE, JSON.stringify((await lireAlertes()).map(a => ({ ...a, read: true }))));
}
export async function compterNonLues() { return (await lireAlertes()).filter(a => !a.read).length; }

export async function notifierLocal(titre: string, corps: string) {
  if (Platform.OS === 'web') return;
  try { await Notifications.scheduleNotificationAsync({ content: { title: titre, body: corps }, trigger: null }); } catch { /* autorisation refusée */ }
}

/** « Notifications & Rappels Quotidiens » : autorisation, test, rappel quotidien programmé, historique. */
export function AlertesModale({ visible, onClose, onChange }: { visible: boolean; onClose: () => void; onChange?: () => void }) {
  const [liste, setListe] = useState<Alerte[]>([]);
  const [autorisee, setAutorisee] = useState(false);
  const [heure, setHeure] = useState('18:30');
  const [actif, setActif] = useState(false);
  const [enregistre, setEnregistre] = useState(false);

  const charger = useCallback(async () => {
    setListe(await lireAlertes());
    if (Platform.OS !== 'web') setAutorisee((await Notifications.getPermissionsAsync()).granted);
    try { const r = JSON.parse((await AsyncStorage.getItem(CLE_RAPPEL)) || '{}'); if (r.heure) setHeure(r.heure); setActif(!!r.actif); } catch { /* valeurs par défaut */ }
  }, []);
  useEffect(() => { if (visible) charger(); }, [visible, charger]);

  const activer = async () => { if (Platform.OS !== 'web') setAutorisee((await Notifications.requestPermissionsAsync()).granted); };
  const tester = () => notifierLocal('Nkala', 'Les notifications fonctionnent. Akéwa !');

  const programmer = async () => {
    const [h, m] = heure.split(':').map(n => parseInt(n, 10));
    await AsyncStorage.setItem(CLE_RAPPEL, JSON.stringify({ heure, actif }));
    if (Platform.OS !== 'web') {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (actif && Number.isFinite(h) && Number.isFinite(m)) {
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Nkala', body: 'Validez 2 expressions et enregistrez votre voix pour maintenir votre série active.' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m },
        });
      }
    }
    setEnregistre(true); setTimeout(() => setEnregistre(false), 2000);
  };

  return (
    <EcranModal visible={visible} titre="Notifications & Rappels Quotidiens" sousTitre="Gardez le lien régulier avec l'apprentissage de la langue Myènè" onClose={onClose}>
      <View style={s.carte}>
        <View style={s.ligne}><Text style={s.titre}>Notifications Push</Text><Text style={autorisee ? s.ok : s.discret}>{autorisee ? 'Autorisées' : 'Non activées'}</Text></View>
        {!autorisee && <Pressable style={s.bouton} onPress={activer}><Text style={s.boutonTexte}>Activer les notifications</Text></Pressable>}
        <Pressable style={s.bouton2} onPress={tester}><Text style={s.boutonTexte}>Tester une notification maintenant</Text></Pressable>
      </View>

      <View style={s.carte}>
        <View style={s.ligne}><Text style={s.titre}>Rappel Quotidien Personnalisé</Text><Switch value={actif} onValueChange={setActif} trackColor={{ true: couleurs.terre }} /></View>
        <Text style={s.discret}>Une notification discrète vous invitera à valider 2 expressions et enregistrer votre voix pour maintenir votre série active.</Text>
        <View style={s.ligne}>
          <TextInput style={s.champ} value={heure} onChangeText={setHeure} placeholder="18:30" placeholderTextColor={couleurs.discret} keyboardType="numbers-and-punctuation" maxLength={5} />
          <Pressable style={s.bouton} onPress={programmer}><Text style={s.boutonTexte}>{enregistre ? 'Enregistré !' : 'Programmer'}</Text></Pressable>
        </View>
      </View>

      <View style={s.ligne}>
        <Text style={s.titre}>Historique des alertes</Text>
        <Pressable onPress={async () => { await toutLu(); await charger(); onChange?.(); }}><Text style={s.lien}>Tout marquer comme lu</Text></Pressable>
      </View>
      {liste.length === 0 && <Text style={s.discret}>Aucune alerte pour l'instant. Vos récompenses apparaîtront ici.</Text>}
      {liste.map(a => (
        <View key={a.id} style={[s.carte, !a.read && { borderColor: couleurs.ambre }]}>
          <Text style={s.titre}>{a.title}</Text>
          <Text style={s.texte}>{a.message}</Text>
          <Text style={s.discret}>{new Date(a.createdAt).toLocaleString('fr-FR')}</Text>
        </View>
      ))}
    </EcranModal>
  );
}

const s = stylesDyn(() => ({
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  titre: { color: couleurs.texteClair, fontSize: 15, fontWeight: '800', flexShrink: 1 },
  texte: { color: couleurs.texte, fontSize: 13 },
  discret: { color: couleurs.discret, fontSize: 12 },
  ok: { color: '#86efac', fontSize: 12, fontWeight: '700' },
  lien: { color: couleurs.ambre, fontSize: 12, fontWeight: '700' },
  champ: { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 10, color: couleurs.texteClair, padding: 10, width: 90, textAlign: 'center' },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  bouton2: { borderColor: couleurs.bord, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 13 },
}));
