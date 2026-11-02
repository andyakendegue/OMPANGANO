import { Bientot, Section } from '../../src/Section';

// Groupes identiques à AdminDashboard.tsx. Réservé aux administrateurs (garde à brancher avec l'authentification).
const groupe = (t: string) => <Bientot texte={`${t} : à porter depuis AdminDashboard.tsx.`} />;

export default function Administration() {
  return (
    <Section titre="Administration" onglets={[
      { id: 'pilotage', label: 'Pilotage', contenu: groupe("Vue d'ensemble") },
      { id: 'moderation', label: 'Modération', contenu: groupe('Validation vocale, réponses et export, anti-fraude') },
      { id: 'contenu', label: 'Contenu', contenu: groupe('Fiches, thèmes, clans et villages, import CSV') },
      { id: 'communaute', label: 'Communauté', contenu: groupe('Utilisateurs, défis, badges, niveaux XP') },
    ]} />
  );
}
