import { Activite, Apercu, Compte } from '../../src/Profil';
import { Section } from '../../src/Section';

export default function Profil() {
  return (
    <Section titre="Profil" onglets={[
      { id: 'apercu', label: 'Aperçu', contenu: <Apercu /> },
      { id: 'activite', label: 'Mon activité', contenu: <Activite /> },
      { id: 'compte', label: 'Compte & données', contenu: <Compte /> },
    ]} />
  );
}
