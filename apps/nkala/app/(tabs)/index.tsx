import { moduleActif } from '@nkala/noyau';
import { Bientot, Section } from '../../src/Section';
import { Classement } from '../../src/Classement';
import { Collecte } from '../../src/Collecte';
import { Ezango } from '../../src/Ezango';

export default function Contribuer() {
  return (
    <Section titre="Nkala" onglets={[
      { id: 'contribuer', label: 'Contribuer', contenu: moduleActif('ompangano') ? <Collecte /> : <Bientot texte="Module désactivé." /> },
      { id: 'ezango', label: 'Ezango', contenu: <Ezango /> },
      { id: 'classement', label: 'Classement', contenu: <Classement /> },
    ]} />
  );
}
