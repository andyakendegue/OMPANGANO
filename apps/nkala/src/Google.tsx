import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from './AuthProvider';
import config from './firebaseConfig';
import { couleurs, stylesDyn } from './theme';

WebBrowser.maybeCompleteAuthSession();

// Identifiants OAuth Google (console Google Cloud, même projet que Firebase). Le client « web » vient de la configuration Firebase.
const WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || (config as any).oAuthClientId || '';
// Clients OAuth des apps Firebase « nkala.essaka.engineering » (projet enenga) : identifiants publics, repris de GoogleService-Info.plist et google-services.json.
const IOS = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '743429299872-ajkolfjbqa3okofhnlou2l1f2k1oi1ue.apps.googleusercontent.com';
const ANDROID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '743429299872-kkn7a3r1fdfobetcqk1r5upfdlte1s4i.apps.googleusercontent.com';

interface Props { surErreur: (m: string | null) => void }

type Etape = null | 'google' | 'connexion' | 'profil';
const LIBELLES: Record<Exclude<Etape, null>, string> = {
  google: 'Connexion à Google…',
  connexion: 'Vérification de ton compte…',
  profil: 'Ouverture de ton profil…',
};

/** Fenêtre d'attente : la connexion Google enchaîne plusieurs échanges (Google, Firebase, profil) qui peuvent prendre quelques secondes. */
function Attente({ etape }: { etape: Etape }) {
  const etapes: Exclude<Etape, null>[] = ['google', 'connexion', 'profil'];
  const i = etape ? etapes.indexOf(etape) : -1;
  return (
    <Modal visible={!!etape} transparent animationType="fade" statusBarTranslucent>
      <View style={a.voile} accessibilityViewIsModal>
        <View style={a.carte} accessibilityRole="progressbar" accessibilityLabel={etape ? LIBELLES[etape] : ''} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={couleurs.ambre} />
          <Text style={a.titre}>{etape ? LIBELLES[etape] : ''}</Text>
          <View style={a.points}>{etapes.map((e, k) => <View key={e} style={[a.point, k <= i && a.pointFait]} />)}</View>
          <Text style={a.sous}>Ne ferme pas l'application.</Text>
        </View>
      </View>
    </Modal>
  );
}

/** Garde l'attente jusqu'à l'ouverture de l'application (l'écran est alors démonté) ou jusqu'à une erreur de profil. */
function useFinAttente(etape: Etape, setEtape: (e: Etape) => void, surErreur: (m: string | null) => void) {
  const { erreurProfil } = useAuth();
  useEffect(() => { if (etape && erreurProfil) setEtape(null); }, [erreurProfil]); // eslint-disable-line react-hooks/exhaustive-deps
  // Garde-fou : jamais plus de 45 s d'attente silencieuse.
  useEffect(() => {
    if (!etape) return;
    const t = setTimeout(() => { setEtape(null); surErreur('La connexion prend trop de temps. Vérifie ta connexion et réessaie.'); }, 45_000);
    return () => clearTimeout(t);
  }, [etape]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function BoutonGoogle({ surErreur }: Props) {
  if (Platform.OS === 'web') return <GoogleWeb surErreur={surErreur} />;
  const identifiant = Platform.OS === 'ios' ? IOS : ANDROID;
  if (!identifiant || !WEB) {
    return (
      <Pressable style={[s.bouton, { opacity: 0.5 }]} onPress={() => surErreur(`Connexion Google non configurée pour ${Platform.OS === 'ios' ? 'iOS' : 'Android'} : renseignez EXPO_PUBLIC_GOOGLE_${Platform.OS === 'ios' ? 'IOS' : 'ANDROID'}_CLIENT_ID (voir NKALA_EXPO.md).`)}>
        <Text style={s.texte}>Continuer avec Google</Text>
      </Pressable>
    );
  }
  return <GoogleNatif surErreur={surErreur} />;
}

function GoogleWeb({ surErreur }: Props) {
  const { googleWeb } = useAuth();
  const [etape, setEtape] = useState<Etape>(null);
  useFinAttente(etape, setEtape, surErreur);
  return (
    <>
      <Pressable style={[s.bouton, !!etape && { opacity: 0.6 }]} disabled={!!etape}
        onPress={async () => { setEtape('google'); surErreur(null); try { await googleWeb(); setEtape('profil'); } catch (e) { setEtape(null); surErreur((e as Error).message); } }}>
        <Text style={s.texte}>Continuer avec Google</Text>
      </Pressable>
      <Attente etape={etape} />
    </>
  );
}

// Chargé seulement quand les identifiants existent : le hook refuse de s'initialiser sans identifiant de la plateforme.
function GoogleNatif({ surErreur }: Props) {
  const { googleJeton } = useAuth();
  const [requete, reponse, ouvrir] = Google.useIdTokenAuthRequest({ webClientId: WEB, iosClientId: IOS || undefined, androidClientId: ANDROID || undefined });
  const [etape, setEtape] = useState<Etape>(null);
  const envoye = useRef<string | null>(null);
  useFinAttente(etape, setEtape, surErreur);

  useEffect(() => {
    if (!reponse) return;
    if (reponse.type === 'success') {
      // Le code est échangé contre le jeton par expo-auth-session : il peut arriver un peu après le retour dans l'app.
      const jeton = reponse.params?.id_token || reponse.authentication?.idToken;
      if (jeton && envoye.current === jeton) return;
      if (jeton) { envoye.current = jeton; setEtape('connexion'); googleJeton(jeton).then(() => setEtape('profil')).catch(e => { setEtape(null); surErreur((e as Error).message); }); }
      else setEtape('connexion');
    } else if (reponse.type === 'error') {
      setEtape(null); surErreur(reponse.error?.message || 'Connexion Google impossible.');
    } else { setEtape(null); } // fenêtre fermée ou annulée
  }, [reponse]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Pressable style={[s.bouton, (!requete || !!etape) && { opacity: 0.6 }]} disabled={!requete || !!etape}
        onPress={async () => { surErreur(null); setEtape('google'); try { const r = await ouvrir(); if (r.type !== 'success') setEtape(null); } catch (e) { setEtape(null); surErreur((e as Error).message); } }}>
        {!requete ? <ActivityIndicator color="#1f1f1f" /> : <Text style={s.texte}>Continuer avec Google</Text>}
      </Pressable>
      <Attente etape={etape} />
    </>
  );
}

const a = stylesDyn(() => ({
  voile: { flex: 1, backgroundColor: 'rgba(23,13,8,0.72)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  carte: { width: '100%', maxWidth: 320, backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 24, padding: 24, alignItems: 'center', gap: 14 },
  titre: { color: couleurs.texteClair, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  sous: { color: couleurs.discret, fontSize: 12, textAlign: 'center' },
  points: { flexDirection: 'row', gap: 8 },
  point: { width: 28, height: 4, borderRadius: 2, backgroundColor: couleurs.bord },
  pointFait: { backgroundColor: couleurs.ambre },
}));

const s = stylesDyn(() => ({
  bouton: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  texte: { color: '#1f1f1f', fontWeight: '700', fontSize: 15 },
}));
