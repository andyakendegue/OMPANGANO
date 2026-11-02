import { moduleActif } from '@nkala/noyau';
import { Bientot, Section } from '../../src/Section';
import { Classement } from '../../src/Classement';
import { Collecte } from '../../src/Collecte';
import { Ezango } from '../../src/Ezango';
import { demanderFiche, demanderOnglet, emettre } from '../../src/evenements';
import { Moderation } from '../../src/Admin';
import { useAuth } from '../../src/AuthProvider';

export default function Contribuer() {
  const { profil } = useAuth();
  return (
    <Section titre="Nkala" onglets={[
      { id: 'contribuer', label: 'Contribuer', contenu: moduleActif('ompangano') ? <Collecte onGuide={() => emettre('guide')} /> : <Bientot texte="Module désactivé." /> },
      { id: 'ezango', label: 'Ezango', contenu: <Ezango onContribuer={id => { demanderFiche(id); demanderOnglet('contribuer'); }} /> },
      { id: 'classement', label: 'Classement', contenu: <Classement /> },
      // Les validateurs évaluent ici ; les administrateurs modèrent depuis l'administration.
      ...(profil?.role === 'validator' ? [{ id: 'validation', label: 'Validation', contenu: <Moderation /> }] : []),
    ]} />
  );
}
