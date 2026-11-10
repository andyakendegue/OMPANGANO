import { Redirect } from 'expo-router';
import { moduleActif } from '@nkala/noyau';
import { Village } from '../../src/Village';

export default function VillageEcran() {
  if (!moduleActif('nkala')) return <Redirect href="/(tabs)" />;
  return <Village />;
}
