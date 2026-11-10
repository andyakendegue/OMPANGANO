import { Redirect } from 'expo-router';
import { moduleActif } from '@nkala/noyau';
import { Ontci } from '../../src/Ontci';

export default function Ecoute() {
  if (!moduleActif('ontci')) return <Redirect href="/(tabs)" />;
  return <Ontci />;
}
