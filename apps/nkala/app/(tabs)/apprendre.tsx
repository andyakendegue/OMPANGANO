import { Redirect } from 'expo-router';
import { estAdmin, moduleActif } from '@nkala/noyau';
import { useAuth } from '../../src/AuthProvider';
import { Onenji } from '../../src/Onenji';
import { Section } from '../../src/Section';

// Modules nés de la fusion Nkala / Onenji / Ontci : réservés aux administrateurs. Les autres utilisateurs ne voient que la partie contributeur.
export default function Apprendre() {
  const { profil } = useAuth();
  if (!estAdmin(profil?.role) || !moduleActif('onenji')) return <Redirect href="/(tabs)" />;
  return <Section titre="Apprendre" onglets={[{ id: 'jeux', label: 'Jeux', contenu: <Onenji /> }]} />;
}
