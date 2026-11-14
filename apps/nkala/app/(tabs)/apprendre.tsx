import { Redirect } from 'expo-router';
import { moduleActif } from '@nkala/noyau';
import { Onenji } from '../../src/Onenji';

// Onenji : parcours, leçons, cours d'artisans, bibliothèque, Kak'Igonjo, cours à distance. Les jeux sont dans Jouer.
export default function Apprendre() {
  if (!moduleActif('onenji')) return <Redirect href="/(tabs)" />;
  return <Onenji />;
}
