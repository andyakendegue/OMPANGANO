import { Onenji } from '../../src/Onenji';
import { Section } from '../../src/Section';

export default function Apprendre() {
  return <Section titre="Apprendre" onglets={[{ id: 'jeux', label: 'Jeux', contenu: <Onenji /> }]} />;
}
