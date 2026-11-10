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
import { ecouter, emettre } from './evenements';
import { nombreEnAttente } from './fileAttente';
import { InstallerApp } from './InstallerApp';
import { useCatalogueEnChargement, useEtatSync } from './syncEtat';
import { couleurs, stylesDyn } from './theme';

/** Barre d'actions commune (équivalent de l'en-tête du site web) : guide, FAQ, hors-ligne, état du réseau, alertes. */
/**
 * mode « complet » : barre et fenêtres (ancien comportement) ; « barre » : boutons seuls (ils demandent l'ouverture par évènement) ;
 * « modales » : fenêtres seules, montées une fois pour toute l'application (menu Plus, accueil).
 */
export function BarreHaute({ mode = 'complet' }: { mode?: 'complet' | 'barre' | 'modales' }) {
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
  const sync = useEtatSync();
  const enChargement = useCatalogueEnChargement();

  const rafraichir = useCallback(async () => { setNonLues(await compterNonLues()); setAttente(await nombreEnAttente()); }, []);
  useEffect(() => { rafraichir(); }, [rafraichir, alertes, horsLigne]);
  useEffect(() => NetInfo.addEventListener(e => setEnLigne(e.isConnected !== false)), []);
  useEffect(() => {
    if (mode === 'barre') return;
    const a = ecouter('guide', () => setGuide(true)), b = ecouter('faq', () => setFaq(true));
    const c = ecouter('alertes', () => setAlertes(true)), d = ecouter('horsligne', () => setHorsLigne(true));
    return () => { a(); b(); c(); d(); };
  }, [mode]);
  // Premier lancement après l'inscription : le guide s'ouvre une fois.
  useEffect(() => {
    if (mode === 'barre' || !profil) return;
    AsyncStorage.getItem(CLE_GUIDE_VU).then(v => { if (!v) { setApresInscription(true); setGuide(true); } }).catch(() => {});
  }, [mode, profil?.id]);

  const aller = (cible: 'contribuer' | 'ezango' | 'classement' | 'profil') => routeur.push(cible === 'profil' ? '/(tabs)/profil' : '/(tabs)');

  const barre = (
      <View style={s.barre}>
        <InstallerApp />
        <Pressable style={s.btn} onPress={() => (mode === 'barre' ? emettre('guide') : setGuide(true))} accessibilityLabel="Guide et objectifs"><Text style={s.txt}>🧭 Guide</Text></Pressable>
        <Pressable style={s.btn} onPress={() => (mode === 'barre' ? emettre('faq') : setFaq(true))} accessibilityLabel="Ouvrir la FAQ"><Text style={s.txt}>❓ FAQ</Text></Pressable>
        <Pressable style={s.btn} onPress={() => (mode === 'barre' ? emettre('horsligne') : setHorsLigne(true))}><Text style={s.txt}>{enLigne ? '📥 Mode Hors-ligne' : '✈️ Mode Avion'}</Text></Pressable>
        {enChargement && !sync.genre && <View style={[s.btn, s.progres]}><Text style={[s.txt, { color: '#99f6e4' }]}>Chargement…</Text></View>}
        {sync.genre === 'telechargement' && <View style={[s.btn, s.progres]}><Text style={[s.txt, { color: '#99f6e4' }]}>Téléchargement {sync.fait.toLocaleString('fr-FR')} / {sync.total.toLocaleString('fr-FR')}</Text></View>}
        {sync.genre === 'envoi' && <View style={[s.btn, s.progres]}><Text style={[s.txt, { color: '#99f6e4' }]}>{Math.max(sync.total - sync.fait, 0)} restant{sync.total - sync.fait > 1 ? 's' : ''}</Text></View>}
        {attente > 0 && !sync.genre && <Pressable style={[s.btn, s.sync]} onPress={() => (mode === 'barre' ? emettre('horsligne') : setHorsLigne(true))}><Text style={[s.txt, { color: '#fff7ed' }]}>{attente} sync</Text></Pressable>}
        <View style={{ flex: 1 }} />
        <Text style={[s.etat, { color: enLigne ? '#86efac' : '#fca5a5' }]}>{enLigne ? '● En ligne' : '● Mode Avion'}</Text>
        <Pressable style={s.btn} onPress={() => (mode === 'barre' ? emettre('alertes') : setAlertes(true))} accessibilityLabel="Centre de notifications">
          <Text style={s.txt}>🔔{nonLues > 0 ? ` ${nonLues}` : ''}</Text>
        </Pressable>
      </View>
  );
  const modales = (
    <>
      <GuideModale visible={guide} prenom={profil?.fullName?.split(' ')[0]} apresInscription={apresInscription} onClose={() => { setGuide(false); setApresInscription(false); }} onAller={aller} />
      <FaqModale visible={faq} tribu={profil?.tribe} onClose={() => setFaq(false)} />
      <AlertesModale visible={alertes} onClose={() => setAlertes(false)} onChange={rafraichir} />
      <HorsLigneModale visible={horsLigne} onClose={() => setHorsLigne(false)} onChange={rafraichir} />
    </>
  );
  return mode === 'barre' ? barre : mode === 'modales' ? modales : <>{barre}{modales}</>;
}

const s = stylesDyn(() => ({
  barre: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 8, flexWrap: 'wrap' },
  btn: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  progres: { backgroundColor: '#0f3d3a', borderColor: '#14b8a6' },
  sync: { backgroundColor: '#b45309', borderColor: '#b45309' },
  txt: { color: couleurs.texte, fontSize: 11, fontWeight: '700' },
  etat: { fontSize: 11, fontWeight: '700' },
}));
