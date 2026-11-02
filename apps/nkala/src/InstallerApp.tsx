import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { couleurs } from './theme';

/**
 * Bouton « Installer l'App » (équivalent de PWAInstallButton du site web) : n'existe que dans la version web d'Expo.
 * Sur iPhone/Android l'application s'installe depuis les magasins, le bouton n'apparaît donc pas.
 */
export function InstallerApp() {
  const [invite, setInvite] = useState<any>(null);
  const [installee, setInstallee] = useState(false);
  const [ios, setIos] = useState(false);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const w: any = globalThis;
    setInstallee(w.matchMedia?.('(display-mode: standalone)').matches || w.navigator?.standalone === true);
    setIos(/iphone|ipad|ipod/.test((w.navigator?.userAgent || '').toLowerCase()));
    const avant = (e: any) => { e.preventDefault(); setInvite(e); };
    const apres = () => { setInstallee(true); setInvite(null); };
    w.addEventListener?.('beforeinstallprompt', avant);
    w.addEventListener?.('appinstalled', apres);
    return () => { w.removeEventListener?.('beforeinstallprompt', avant); w.removeEventListener?.('appinstalled', apres); };
  }, []);

  if (Platform.OS !== 'web' || installee) return null;
  if (!ios && !invite) return null;
  return (
    <>
      <Pressable style={s.btn} accessibilityLabel="Installer Nkala pour un accès rapide et en Mode Avion"
        onPress={async () => { if (ios) setGuide(true); else { await invite.prompt(); setInvite(null); } }}>
        <Text style={s.txt}>{ios ? 'App iOS / Hors-ligne' : "Installer l'App"}</Text>
      </Pressable>
      <Modal visible={guide} transparent animationType="fade" onRequestClose={() => setGuide(false)}>
        <View style={s.fond}>
          <View style={s.fiche}>
            <Text style={s.titre}>Installer sur iPhone / iPad (Mode Avion)</Text>
            <Text style={s.texte}>L'application est déjà mise en cache pour le Mode Avion. Pour l'ouvrir directement depuis votre écran d'accueil sans connexion :</Text>
            <Text style={s.texte}>1. Appuyez sur le bouton Partager dans la barre d'outils de Safari.</Text>
            <Text style={s.texte}>2. Faites défiler et choisissez Sur l'écran d'accueil.</Text>
            <Pressable style={s.ok} onPress={() => setGuide(false)}><Text style={s.okTexte}>Compris</Text></Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  btn: { backgroundColor: couleurs.terre, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  txt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  fond: { flex: 1, backgroundColor: '#000000cc', justifyContent: 'center', padding: 20 },
  fiche: { backgroundColor: couleurs.carte, borderColor: couleurs.ambre, borderWidth: 1, borderRadius: 20, padding: 18, gap: 10 },
  titre: { color: '#fff', fontSize: 16, fontWeight: '800' },
  texte: { color: couleurs.texte, fontSize: 13, lineHeight: 19 },
  ok: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  okTexte: { color: '#fff', fontWeight: '800' },
});
