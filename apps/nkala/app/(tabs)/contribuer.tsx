import { useRouter } from 'expo-router';
import { Contribuer } from '../../src/Contribuer';

export default function ContribuerEcran() {
  const routeur = useRouter();
  return <Contribuer retour={() => routeur.back()} />;
}
