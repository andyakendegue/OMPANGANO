import { View } from 'react-native';
import { ProfilEcran } from '../../src/Accueil';
import { useAuth } from '../../src/AuthProvider';
import { ProfilContributeur } from '../../src/Profil';
import { T } from '../../src/kit';

export default function Profil() {
  const { profil } = useAuth();
  // Compte, contributions et conditions : écran historique (palette sombre), dans un cadre
  return <ProfilEcran suite={profil ? <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: '#170D08' }}><View style={{ padding: 12 }}><T v="libelle" couleur="#A8826D">Compte et contributions</T></View><ProfilContributeur /></View> : null} />;
}
