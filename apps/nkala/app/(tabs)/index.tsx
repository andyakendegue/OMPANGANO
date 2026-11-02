import { moduleActif } from '@nkala/noyau';
import { Bientot, Section } from '../../src/Section';
import { Collecte } from '../../src/Collecte';

export default function Contribuer() {
  return (
    <Section titre="Nkala" onglets={[
      { id: 'contribuer', label: 'Contribuer', contenu: moduleActif('ompangano') ? <Collecte /> : <Bientot texte="Module désactivé." /> },
      { id: 'ezango', label: 'Ezango', contenu: <Bientot texte="Vocabulaire : à porter depuis VocabularyExplorer.tsx (expo-sqlite)." /> },
      { id: 'classement', label: 'Classement', contenu: <Bientot texte="Classement et badges : à porter depuis LeaderboardAndRewards.tsx." /> },
    ]} />
  );
}
