import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { PlusJakartaSans_400Regular, PlusJakartaSans_400Regular_Italic, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { useModules, useRelectureModules } from '../src/useModules';
import { AuthProvider, useAuth } from '../src/AuthProvider';
import { FetesProvider } from '../src/Fetes';
import { ToastProvider } from '../src/kit';
import { LecteurProvider } from '../src/Lecteur';
import { MiseAJour } from '../src/MiseAJour';
import { Notifications_ } from '../src/Notifications';
// Alertes de proximité des logements : la tâche de géorepérage doit être définie au chargement du JavaScript.
import '../src/logement/alertesProximite';
import { EcouteAlertesLogement } from '../src/logement/EcouteAlertes';
import { PrefsProvider, usePrefs } from '../src/Prefs';
import { ProgresProvider } from '../src/Progres';
import { TempsReel } from '../src/TempsReel';
import { sombre } from '../src/theme';
import { SplashAnime } from '../src/SplashAnime';

// Démarrage : l'image fixe de l'écran natif ne reste que le temps de charger le JavaScript, puis l'écran animé (SplashAnime)
// prend le relais à la même place jusqu'à ce que l'app soit prête (polices, session, profil, préférences).
SplashScreen.preventAutoHideAsync().catch(() => {});
let splashCache = false;
const cacherSplashNatif = () => { if (splashCache) return; splashCache = true; SplashScreen.hideAsync().catch(() => {}); };
setTimeout(cacherSplashNatif, 8_000);

/** Pendant le chargement, sous l'écran animé : un simple fond. */
const Attente = () => <View style={{ flex: 1, backgroundColor: sombre.fond }} />;

function Pile({ auPret }: { auPret: () => void }) {
  const { pret, profil, invite } = useAuth();
  const { prefs, pret: prefsPretes, palette, clair } = usePrefs();
  // Interrupteurs de modules côté serveur : relus au démarrage, à la connexion et au retour dans l'app ; hors-ligne, les valeurs de départ restent.
  useRelectureModules(profil?.id);
  useModules();
  const prete = pret && prefsPretes;
  useEffect(() => { if (prete) auPret(); }, [prete, auPret]);
  if (!prete) return <Attente />;
  const connecte = !!profil;
  // Le profil existe dès la première connexion ; la filiation et les consentements doivent être renseignés avant d'entrer.
  const inscrit = connecte && !!profil?.registrationCompleted;
  const entree = prefs.entreeVue;
  const dedans = entree && (inscrit || (invite && !connecte));
  return (
    <>
      <StatusBar style={clair ? 'dark' : 'light'} backgroundColor={palette.fond} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.fond } }}>
        <Stack.Protected guard={!entree}><Stack.Screen name="entree" /></Stack.Protected>
        <Stack.Protected guard={dedans && (prefs.autorisationsVues || !inscrit)}><Stack.Screen name="(tabs)" /></Stack.Protected>
        <Stack.Protected guard={entree && inscrit && !prefs.autorisationsVues}><Stack.Screen name="autorisations" /></Stack.Protected>
        <Stack.Protected guard={entree && connecte && !inscrit}><Stack.Screen name="inscription" /></Stack.Protected>
        <Stack.Protected guard={entree && !connecte && !invite}><Stack.Screen name="connexion" /></Stack.Protected>
      </Stack>
    </>
  );
}

export default function Racine() {
  const [polices] = useFonts({ Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, PlusJakartaSans_400Regular, PlusJakartaSans_400Regular_Italic, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold });
  const [prete, setPrete] = useState(false);
  const auPret = useCallback(() => setPrete(true), []);
  // Garde-fou : l'écran animé s'efface au plus tard au bout de 15 s.
  useEffect(() => { const t = setTimeout(auPret, 15_000); return () => clearTimeout(t); }, [auPret]);
  const splash = <SplashAnime visible={!(polices && prete)} auPremierAffichage={cacherSplashNatif} />;
  if (!polices) return <View style={{ flex: 1, backgroundColor: sombre.fond }}>{splash}</View>;
  return (
    <PrefsProvider>
      <ToastProvider>
        <AuthProvider>
          <FetesProvider>
            <ProgresProvider>
              <LecteurProvider>
                <TempsReel />
                <Notifications_ /><EcouteAlertesLogement />
                <MiseAJour />
                <Pile auPret={auPret} />
                {splash}
              </LecteurProvider>
            </ProgresProvider>
          </FetesProvider>
        </AuthProvider>
      </ToastProvider>
    </PrefsProvider>
  );
}
