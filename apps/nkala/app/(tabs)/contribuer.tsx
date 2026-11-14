import { Redirect, useRouter } from 'expo-router';
import { moduleActif } from '@nkala/noyau';
import { Contribuer } from '../../src/Contribuer';

// Partie contributeur (Ompangano) : onglet de la barre du bas, soumis à l'interrupteur du module comme les autres.
export default function ContribuerEcran() {
  const routeur = useRouter();
  if (!moduleActif('ompangano')) return <Redirect href="/(tabs)" />;
  return <Contribuer retour={() => routeur.back()} />;
}
