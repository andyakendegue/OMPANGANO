import { Section } from '../../src/Section';
import { Contenu } from '../../src/AdminContenu';
import { Pilotage } from '../../src/Admin';
import { GroupeModeration } from '../../src/AdminFraude';
import { Communaute } from '../../src/AdminCommunaute';

// Quatre groupes comme AdminDashboard.tsx. Les droits sont vérifiés par le serveur ; l'onglet n'est visible que des administrateurs.
// Contenu : fiches, thèmes, clans et villages, import CSV. Communauté : utilisateurs, défis, badges, niveaux XP. Modération : validation vocale, anti-fraude. Reste : export des réponses.
export default function Administration() {
  return (
    <Section titre="Administration" onglets={[
      { id: 'pilotage', label: 'Pilotage', contenu: <Pilotage /> },
      { id: 'moderation', label: 'Modération', contenu: <GroupeModeration /> },
      { id: 'contenu', label: 'Contenu', contenu: <Contenu /> },
      { id: 'communaute', label: 'Communauté', contenu: <Communaute /> },
    ]} />
  );
}
