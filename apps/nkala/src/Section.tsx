import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarreHaute } from './BarreHaute';
import { ecouter, prendreOnglet } from './evenements';
import { Marque, Page, useLarge } from './Fond';
import { couleursSombres as couleurs } from './theme';

export interface SousOnglet { id: string; label: string; contenu: React.ReactNode }

/** Sous-navigation d'une entrée principale (comme CrowdsourceSubNav, AdminDashboard et UserProfileView sur le web). */
export function Section({ titre, onglets }: { titre: string; onglets: SousOnglet[] }) {
  const [actif, setActif] = useState(onglets[0].id);
  const large = useLarge();
  // Un autre écran peut demander l'ouverture d'un sous-onglet (ex. « Enregistrer ma voix » depuis Ikamba).
  useEffect(() => {
    const ids = onglets.map(o => o.id);
    const appliquer = () => { const o = prendreOnglet(ids); if (o) setActif(o); };
    appliquer();
    return ecouter('onglet', appliquer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Page>
      <View style={s.marque}><Marque taille={large ? 44 : 36} /></View>
      <Text style={s.baseline}>Le Programme Éducatif & Crowdsourcing Myènè</Text>
      <Text style={s.titre}>{titre}</Text>
      <BarreHaute mode="barre" />
      {/* Bande à hauteur fixe : sans elle, le défilement horizontal se fait écraser par le contenu du dessous. */}
      <View style={s.bande}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.barre} contentContainerStyle={s.barreContenu}>
          {onglets.map(o => (
            <Pressable key={o.id} accessibilityRole="tab" accessibilityState={{ selected: actif === o.id }} onPress={() => setActif(o.id)} style={[s.puce, actif === o.id && s.puceActive]}>
              <Text numberOfLines={1} style={[s.puceTexte, actif === o.id && { color: couleurs.texteClair, fontWeight: '700' }]}>{o.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: large ? 24 : 16, paddingBottom: 48 }}>{onglets.find(o => o.id === actif)?.contenu}</ScrollView>
    </Page>
  );
}

export const Bientot = ({ texte }: { texte: string }) => (
  <View style={s.carte}><Text style={s.carteTexte}>{texte}</Text></View>
);

const s = StyleSheet.create({
  marque: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  marqueNom: { color: couleurs.texteClair, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  marqueEssaka: { color: '#fff', backgroundColor: couleurs.terre, fontSize: 10, fontWeight: '800', overflow: 'hidden', borderRadius: 4 },
  baseline: { color: couleurs.ambre, fontSize: 11, paddingHorizontal: 16 },
  titre: { color: couleurs.texteClair, fontSize: 20, fontWeight: '800', padding: 16, paddingBottom: 8 },
  bande: { height: 52, flexShrink: 0, flexGrow: 0 },
  barre: { flexGrow: 0, flexShrink: 0, height: 52 },
  barreContenu: { gap: 8, paddingHorizontal: 16, alignItems: 'center', height: 52 },
  puce: { height: 38, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 12, backgroundColor: couleurs.carte, flexShrink: 0 },
  puceActive: { backgroundColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 13, fontWeight: '600' },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 16 },
  carteTexte: { color: couleurs.texte, fontSize: 14, lineHeight: 20 },
});
