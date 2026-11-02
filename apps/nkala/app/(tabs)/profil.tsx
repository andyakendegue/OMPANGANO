import { ProfilContributeur } from '../../src/Profil';
import { Section } from '../../src/Section';

export default function Profil() {
  return <Section titre="Profil" onglets={[{ id: 'profil', label: 'Mon profil', contenu: <ProfilContributeur /> }]} />;
}
