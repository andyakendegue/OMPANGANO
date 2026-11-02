import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { estAdmin } from '@nkala/noyau';
import { useAuth } from '../../src/AuthProvider';
import { couleurs } from '../../src/theme';

// Trois entrées, comme sur le web : Contribuer, Administration, Profil.
export default function Onglets() {
  const { profil } = useAuth();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: couleurs.fond, borderTopColor: couleurs.bord },
      tabBarActiveTintColor: couleurs.ambre,
      tabBarInactiveTintColor: couleurs.discret,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Contribuer', tabBarIcon: ({ color, size }) => <Ionicons name="mic" color={color} size={size} /> }} />
      <Tabs.Screen name="admin" options={{ href: estAdmin(profil?.role) ? undefined : null, title: 'Administration', tabBarIcon: ({ color, size }) => <Ionicons name="shield" color={color} size={size} /> }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
    </Tabs>
  );
}
