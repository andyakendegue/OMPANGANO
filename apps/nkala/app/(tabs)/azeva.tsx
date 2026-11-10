import { Redirect } from 'expo-router';
import { moduleActif } from '@nkala/noyau';
import { Azeva } from '../../src/Azeva';

// Azeva : salle de jeux. La salle des paris reste fermée (interrupteur serveur, dossier juridique à réunir).
export default function AzevaEcran() {
  if (!moduleActif('azeva')) return <Redirect href="/(tabs)" />;
  return <Azeva />;
}
