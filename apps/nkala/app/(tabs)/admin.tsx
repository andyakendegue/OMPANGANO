import { Section } from '../../src/Section';
import { Contenu } from '../../src/AdminContenu';
import { GroupePilotage } from '../../src/AdminOutils';
import { GroupeModeration } from '../../src/AdminFraude';
import { Communaute } from '../../src/AdminCommunaute';

// Quatre groupes comme AdminDashboard.tsx. Les droits sont vérifiés par le serveur ; l'onglet n'est visible que des administrateurs.
// Contenu : fiches, thèmes, clans et villages, import CSV. Communauté : utilisateurs, défis, badges, niveaux XP. Modération : validation vocale, anti-fraude. Pilotage : vue d'ensemble, export CSV, outils base de données (audit en lecture, suppression des doublons de clans/villages sur confirmation).
export default function Administration() {
  return (
    <Section titre="Administration" onglets={[
      { id: 'pilotage', label: 'Pilotage', contenu: <GroupePilotage /> },
      { id: 'moderation', label: 'Modération', contenu: <GroupeModeration /> },
      { id: 'contenu', label: 'Contenu', contenu: <Contenu /> },
      { id: 'communaute', label: 'Communauté', contenu: <Communaute /> },
    ]} />
  );
}
