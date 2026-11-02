import { Section } from '../../src/Section';
import { Contenu } from '../../src/AdminContenu';
import { Moderation, Pilotage, Utilisateurs } from '../../src/Admin';

// Quatre groupes comme AdminDashboard.tsx. Les droits sont vérifiés par le serveur ; l'onglet n'est visible que des administrateurs.
// Contenu : fiches, thèmes, clans et villages, import CSV. Restent à porter : défis, badges, niveaux XP, anti-fraude.
export default function Administration() {
  return (
    <Section titre="Administration" onglets={[
      { id: 'pilotage', label: 'Pilotage', contenu: <Pilotage /> },
      { id: 'moderation', label: 'Modération', contenu: <Moderation /> },
      { id: 'contenu', label: 'Contenu', contenu: <Contenu /> },
      { id: 'communaute', label: 'Communauté', contenu: <Utilisateurs /> },
    ]} />
  );
}
