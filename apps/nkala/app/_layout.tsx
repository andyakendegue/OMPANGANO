import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { PlusJakartaSans_400Regular, PlusJakartaSans_400Regular_Italic, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { chargerModules } from '@nkala/noyau';
import { AuthProvider, useAuth } from '../src/AuthProvider';
import { FetesProvider } from '../src/Fetes';
import { ToastProvider } from '../src/kit';
import { LecteurProvider } from '../src/Lecteur';
import { MiseAJour } from '../src/MiseAJour';
import { Notifications_ } from '../src/Notifications';
import { PrefsProvider, usePrefs } from '../src/Prefs';
import { ProgresProvider } from '../src/Progres';
import { TempsReel } from '../src/TempsReel';
import { sombre } from '../src/theme';

function Pile() {
  const { pret, profil, invite } = useAuth();
  const { prefs, pret: prefsPretes, palette, clair } = usePrefs();
  // Interrupteurs de modules côté serveur : relus au démarrage et à la connexion ; hors-ligne, les valeurs de départ restent.
  const [, forcer] = useState(0);
  useEffect(() => { chargerModules().then(ok => ok && forcer(n => n + 1)); }, [profil?.id]);
  if (!pret || !prefsPretes) {
    return <View style={{ flex: 1, backgroundColor: sombre.fond, justifyContent: 'center' }}><ActivityIndicator color={sombre.accent} /></View>;
  }
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
  if (!polices) return <View style={{ flex: 1, backgroundColor: sombre.fond, justifyContent: 'center' }}><ActivityIndicator color={sombre.accent} /></View>;
  return (
    <PrefsProvider>
      <ToastProvider>
        <AuthProvider>
          <FetesProvider>
            <ProgresProvider>
              <LecteurProvider>
                <TempsReel />
                <Notifications_ />
                <MiseAJour />
                <Pile />
              </LecteurProvider>
            </ProgresProvider>
          </FetesProvider>
        </AuthProvider>
      </ToastProvider>
    </PrefsProvider>
  );
}
