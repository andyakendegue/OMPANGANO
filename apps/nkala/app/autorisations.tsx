import { useState } from 'react';
import { Platform, View } from 'react-native';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { Bouton, Carte, Ecran, Ic, Puce, T, useToast } from '../src/kit';
import { usePrefs, useTheme } from '../src/Prefs';

/** Écran 09 : micro (contribuer, dire à voix haute) et rappels doux. Chaque autorisation est facultative et peut être refusée. */
export default function Autorisations() {
  const { regler, prefs } = usePrefs();
  const { c } = useTheme();
  const toast = useToast();
  const [micro, setMicro] = useState<boolean | null>(null);
  const [notifs, setNotifs] = useState<boolean | null>(null);
  const demanderMicro = async () => { try { setMicro((await requestRecordingPermissionsAsync()).granted); } catch { setMicro(false); } };
  const demanderNotifs = async () => { try { setNotifs((await Notifications.requestPermissionsAsync()).granted); } catch { setNotifs(false); toast('Les rappels ne sont pas disponibles ici.', 'info'); } };
  return (
    <Ecran>
      <T v="titre">Deux petites autorisations</T>
      <T v="corps">Rien n'est obligatoire. Tu peux continuer sans, et changer d'avis dans les réglages de ton téléphone.</T>
      <Carte><View style={{ padding: 18, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Ic nom="micro" taille={26} couleur={c.accent} /><T v="carte">Microphone</T></View>
        <T v="petit">Pour enregistrer ta voix et répéter les mots à voix haute. Jamais utilisé en dehors de ces moments.</T>
        <Bouton label={micro === null ? 'Autoriser le micro' : micro ? 'Micro autorisé' : 'Refusé : tu pourras réessayer'} variante={micro ? 'ambre' : 'fantome'} petit onPress={demanderMicro} desactive={micro === true} />
      </View></Carte>
      <Carte><View style={{ padding: 18, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Ic nom="cloche" taille={26} couleur={c.accent} /><T v="carte">Rappel doux</T></View>
        <T v="petit">Une notification au plus par jour, à l'heure choisie, sans reproche si tu l'oublies.</T>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[['18:00', '18 h'], ['19:00', '19 h'], ['20:00', '20 h'], [null, 'Aucun']].map(([v, l]) => <Puce key={String(l)} label={String(l)} actif={prefs.rappel === v} onPress={() => regler({ rappel: v as string | null })} />)}
        </View>
        {Platform.OS !== 'web' && <Bouton label={notifs === null ? 'Autoriser les notifications' : notifs ? 'Notifications autorisées' : 'Refusé'} variante="fantome" petit onPress={demanderNotifs} desactive={notifs === true} />}
      </View></Carte>
      <Bouton label="Continuer" onPress={() => regler({ autorisationsVues: true })} />
    </Ecran>
  );
}
