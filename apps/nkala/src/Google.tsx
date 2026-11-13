import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
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
  const [occupe, setOccupe] = useState(false);
  return (
    <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} disabled={occupe}
      onPress={async () => { setOccupe(true); surErreur(null); try { await googleWeb(); } catch (e) { surErreur((e as Error).message); } finally { setOccupe(false); } }}>
      <Text style={s.texte}>Continuer avec Google</Text>
    </Pressable>
  );
}

// Chargé seulement quand les identifiants existent : le hook refuse de s'initialiser sans identifiant de la plateforme.
function GoogleNatif({ surErreur }: Props) {
  const { googleJeton } = useAuth();
  const [requete, reponse, ouvrir] = Google.useIdTokenAuthRequest({ webClientId: WEB, iosClientId: IOS || undefined, androidClientId: ANDROID || undefined });

  useEffect(() => {
    if (reponse?.type === 'success') {
      const jeton = reponse.params?.id_token;
      if (jeton) googleJeton(jeton).catch(e => surErreur((e as Error).message));
      else surErreur('Google n’a pas renvoyé de jeton d’identité.');
    } else if (reponse?.type === 'error') {
      surErreur(reponse.error?.message || 'Connexion Google impossible.');
    }
  }, [reponse]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Pressable style={[s.bouton, !requete && { opacity: 0.6 }]} disabled={!requete} onPress={() => { surErreur(null); ouvrir(); }}>
      <Text style={s.texte}>Continuer avec Google</Text>
    </Pressable>
  );
}

const s = stylesDyn(() => ({
  bouton: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  texte: { color: '#1f1f1f', fontWeight: '700', fontSize: 15 },
}));
