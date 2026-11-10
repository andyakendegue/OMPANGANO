import { Redirect } from 'expo-router';
import { estAdmin, estValidateur } from '@nkala/noyau';
import { useAuth } from '../../src/AuthProvider';
import { Section } from '../../src/Section';
import { Moderation } from '../../src/Admin';
import { StatsModeration_ } from '../../src/Validation';

// Espace du validateur : sa file de modération et les statistiques de ses modérations, rien d'autre.
// (Les administrateurs ont la modération dans « Administration ».) Les droits sont vérifiés par le serveur.
export default function Validation() {
  const { profil } = useAuth();
  if (!estValidateur(profil?.role) || estAdmin(profil?.role)) return <Redirect href="/(tabs)" />;
  return (
    <Section titre="Validation" onglets={[
      { id: 'file', label: 'File de modération', contenu: <Moderation /> },
      { id: 'stats', label: 'Mes statistiques', contenu: <StatsModeration_ /> },
    ]} />
  );
}
