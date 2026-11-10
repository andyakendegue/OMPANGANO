import { View } from 'react-native';
import { ProfilEcran } from '../../src/Accueil';
import { useAuth } from '../../src/AuthProvider';
import { ProfilContributeur } from '../../src/Profil';
import { T } from '../../src/kit';
import { ThemeKey, useTheme } from '../../src/Prefs';

export default function Profil() {
  const { profil } = useAuth();
  const { c } = useTheme();
  // Compte, contributions et conditions : écran historique (palette sombre), dans un cadre
  return <ProfilEcran suite={profil ? <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: c.carte }}><View style={{ padding: 12 }}><T v="libelle">Compte et contributions</T></View><ThemeKey><ProfilContributeur /></ThemeKey></View> : null} />;
}
