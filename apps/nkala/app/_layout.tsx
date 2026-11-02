import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/AuthProvider';
import { couleurs } from '../src/theme';

function Pile() {
  const { pret, profil } = useAuth();
  if (!pret) {
    return <View style={{ flex: 1, backgroundColor: couleurs.fond, justifyContent: 'center' }}><ActivityIndicator color={couleurs.ambre} /></View>;
  }
  // Pas de connexion anonyme : sans session, seul l'écran de connexion est accessible.
  const connecte = !!profil;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={connecte}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!connecte}>
        <Stack.Screen name="connexion" />
      </Stack.Protected>
    </Stack>
  );
}

export default function Racine() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Pile />
    </AuthProvider>
  );
}
