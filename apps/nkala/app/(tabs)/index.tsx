import { moduleActif } from '@nkala/noyau';
import { Bientot, Section } from '../../src/Section';

export default function Contribuer() {
  return (
    <Section titre="Nkala" onglets={[
      { id: 'contribuer', label: 'Contribuer', contenu: <Bientot texte={moduleActif('ompangano') ? 'Collecte Ompangano : à porter depuis src/components/CrowdsourceCard.tsx.' : 'Module désactivé.'} /> },
      { id: 'ezango', label: 'Ezango', contenu: <Bientot texte="Vocabulaire : à porter depuis VocabularyExplorer.tsx (expo-sqlite)." /> },
      { id: 'classement', label: 'Classement', contenu: <Bientot texte="Classement et badges : à porter depuis LeaderboardAndRewards.tsx." /> },
    ]} />
  );
}
