import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { AlertesModale, compterNonLues } from './Alertes';
import { useAuth } from './AuthProvider';
import { CLE_GUIDE_VU, GuideModale } from './Guide';
import { FaqModale } from './Faq';
import { HorsLigneModale } from './HorsLigne';
import { ecouter } from './evenements';
import { nombreEnAttente } from './fileAttente';
import { couleurs } from './theme';

/** Barre d'actions commune (équivalent de l'en-tête du site web) : guide, FAQ, hors-ligne, état du réseau, alertes. */
export function BarreHaute() {
  const { profil } = useAuth();
  const routeur = useRouter();
  const [guide, setGuide] = useState(false);
  const [apresInscription, setApresInscription] = useState(false);
  const [faq, setFaq] = useState(false);
  const [alertes, setAlertes] = useState(false);
  const [horsLigne, setHorsLigne] = useState(false);
  const [enLigne, setEnLigne] = useState(true);
  const [nonLues, setNonLues] = useState(0);
  const [attente, setAttente] = useState(0);

  const rafraichir = useCallback(async () => { setNonLues(await compterNonLues()); setAttente(await nombreEnAttente()); }, []);
  useEffect(() => { rafraichir(); }, [rafraichir, alertes, horsLigne]);
  useEffect(() => NetInfo.addEventListener(e => setEnLigne(e.isConnected !== false)), []);
  useEffect(() => {
    const a = ecouter('guide', () => setGuide(true)), b = ecouter('faq', () => setFaq(true));
    const c = ecouter('alertes', () => setAlertes(true)), d = ecouter('horsligne', () => setHorsLigne(true));
    return () => { a(); b(); c(); d(); };
  }, []);
  // Premier lancement après l'inscription : le guide s'ouvre une fois.
  useEffect(() => {
    AsyncStorage.getItem(CLE_GUIDE_VU).then(v => { if (!v) { setApresInscription(true); setGuide(true); } }).catch(() => {});
  }, []);

  const aller = (cible: 'contribuer' | 'ezango' | 'classement' | 'profil') => routeur.push(cible === 'profil' ? '/(tabs)/profil' : '/(tabs)');

  return (
    <>
      <View style={s.barre}>
        <Pressable style={s.btn} onPress={() => setGuide(true)} accessibilityLabel="Guide et objectifs"><Text style={s.txt}>🧭 Guide</Text></Pressable>
        <Pressable style={s.btn} onPress={() => setFaq(true)} accessibilityLabel="Ouvrir la FAQ"><Text style={s.txt}>❓ FAQ</Text></Pressable>
        <Pressable style={s.btn} onPress={() => setHorsLigne(true)}><Text style={s.txt}>{enLigne ? '📥 Mode Hors-ligne' : '✈️ Mode Avion'}</Text></Pressable>
        {attente > 0 && <Pressable style={[s.btn, s.sync]} onPress={() => setHorsLigne(true)}><Text style={[s.txt, { color: '#fff7ed' }]}>{attente} sync</Text></Pressable>}
        <View style={{ flex: 1 }} />
        <Text style={[s.etat, { color: enLigne ? '#86efac' : '#fca5a5' }]}>{enLigne ? '● En ligne' : '● Mode Avion'}</Text>
        <Pressable style={s.btn} onPress={() => setAlertes(true)} accessibilityLabel="Centre de notifications">
          <Text style={s.txt}>🔔{nonLues > 0 ? ` ${nonLues}` : ''}</Text>
        </Pressable>
      </View>
      <GuideModale visible={guide} prenom={profil?.fullName?.split(' ')[0]} apresInscription={apresInscription} onClose={() => { setGuide(false); setApresInscription(false); }} onAller={aller} />
      <FaqModale visible={faq} tribu={profil?.tribe} onClose={() => setFaq(false)} />
      <AlertesModale visible={alertes} onClose={() => setAlertes(false)} onChange={rafraichir} />
      <HorsLigneModale visible={horsLigne} onClose={() => setHorsLigne(false)} onChange={rafraichir} />
    </>
  );
}

const s = StyleSheet.create({
  barre: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 8, flexWrap: 'wrap' },
  btn: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  sync: { backgroundColor: '#b45309', borderColor: '#b45309' },
  txt: { color: couleurs.texte, fontSize: 11, fontWeight: '700' },
  etat: { fontSize: 11, fontWeight: '700' },
});
