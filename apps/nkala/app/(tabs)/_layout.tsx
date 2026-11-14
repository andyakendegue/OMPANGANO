import { Tabs } from 'expo-router';
import { moduleActif } from '@nkala/noyau';
import { AssistantFlottant } from '../../src/Assistant';
import { BarreHaute } from '../../src/BarreHaute';
import { BoutiqueFeuille } from '../../src/Boutique';
import { BarreOnglets, FinEnfant, GlobaleProvider, MenuPlus } from '../../src/Globale';
import { LecteurPlein } from '../../src/OntciLecteur';
import { useTheme } from '../../src/Prefs';
import { useModules } from '../../src/useModules';

/** Cinq entrées : Accueil, Apprendre, Jouer, Écouter, Village. Ompangano (contribuer) et le reste sont dans le menu « Plus ». */
export default function Onglets() {
  const { c } = useTheme();
  useModules();
  const cache = { href: null } as const;
  return (
    <GlobaleProvider>
      <Tabs backBehavior="history" tabBar={p => <BarreOnglets {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.fond } }}>
        <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
        <Tabs.Screen name="apprendre" options={{ title: 'Apprendre', href: moduleActif('onenji') ? undefined : null }} />
        <Tabs.Screen name="azeva" options={{ title: 'Jouer', href: moduleActif('azeva') ? undefined : null }} />
        <Tabs.Screen name="ecoute" options={{ title: 'Écouter', href: moduleActif('ontci') ? undefined : null }} />
        <Tabs.Screen name="village" options={{ title: 'Village', href: moduleActif('nkala') ? undefined : null }} />
        <Tabs.Screen name="contribuer" options={{ title: 'Contribuer', href: moduleActif('ompangano') ? undefined : null }} />
        <Tabs.Screen name="profil" options={cache} />
        <Tabs.Screen name="serie" options={cache} />
        <Tabs.Screen name="reglages" options={cache} />
        <Tabs.Screen name="parents" options={cache} />
        <Tabs.Screen name="recherche" options={cache} />
        <Tabs.Screen name="admin" options={cache} />
        <Tabs.Screen name="validation" options={cache} />
      </Tabs>
      <AssistantFlottant />
      <MenuPlus />
      <BoutiqueFeuille />
      <BarreHaute mode="modales" />
      <LecteurPlein />
      <FinEnfant />
    </GlobaleProvider>
  );
}
