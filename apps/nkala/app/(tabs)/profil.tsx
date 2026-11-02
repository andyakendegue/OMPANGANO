import { Bientot, Section } from '../../src/Section';

export default function Profil() {
  return (
    <Section titre="Profil" onglets={[
      { id: 'apercu', label: 'Aperçu', contenu: <Bientot texte="XP, contributions, courbe : à porter depuis UserProfileView.tsx." /> },
      { id: 'activite', label: 'Mon activité', contenu: <Bientot texte="Favoris et mes contributions." /> },
      { id: 'compte', label: 'Compte & données', contenu: <Bientot texte="Filiation, consentement, stockage hors-ligne, déconnexion." /> },
    ]} />
  );
}
