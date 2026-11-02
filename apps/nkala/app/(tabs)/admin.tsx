import { Bientot, Section } from '../../src/Section';
import { Moderation, Pilotage, Utilisateurs } from '../../src/Admin';

// Quatre groupes comme AdminDashboard.tsx. Les droits sont vérifiés par le serveur ; l'onglet n'est visible que des administrateurs.
// Chaque groupe a ici sa rubrique principale ; les autres rubriques du web arrivent ensuite.
export default function Administration() {
  return (
    <Section titre="Administration" onglets={[
      { id: 'pilotage', label: 'Pilotage', contenu: <Pilotage /> },
      { id: 'moderation', label: 'Modération', contenu: <Moderation /> },
      { id: 'contenu', label: 'Contenu', contenu: <Bientot texte="Fiches, thèmes, clans et villages, import CSV : à porter depuis AdminDashboard.tsx." /> },
      { id: 'communaute', label: 'Communauté', contenu: <Utilisateurs /> },
    ]} />
  );
}
