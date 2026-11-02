import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarreHaute } from './BarreHaute';
import { ecouter, prendreOnglet } from './evenements';
import { couleurs } from './theme';

export interface SousOnglet { id: string; label: string; contenu: React.ReactNode }

/** Sous-navigation d'une entrée principale (comme CrowdsourceSubNav, AdminDashboard et UserProfileView sur le web). */
export function Section({ titre, onglets }: { titre: string; onglets: SousOnglet[] }) {
  const [actif, setActif] = useState(onglets[0].id);
  // Un autre écran peut demander l'ouverture d'un sous-onglet (ex. « Enregistrer ma voix » depuis Ezango).
  useEffect(() => {
    const ids = onglets.map(o => o.id);
    const appliquer = () => { const o = prendreOnglet(ids); if (o) setActif(o); };
    appliquer();
    return ecouter('onglet', appliquer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={s.page}>
      <View style={s.marque}><Text style={s.marqueNom}>Nkala</Text><Text style={s.marqueEssaka}> ESSAKA </Text></View>
      <Text style={s.baseline}>Le Programme Éducatif & Crowdsourcing Myènè</Text>
      <Text style={s.titre}>{titre}</Text>
      <BarreHaute />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.barre} contentContainerStyle={{ gap: 8 }}>
        {onglets.map(o => (
          <Pressable key={o.id} onPress={() => setActif(o.id)} style={[s.puce, actif === o.id && s.puceActive]}>
            <Text style={[s.puceTexte, actif === o.id && { color: couleurs.texteClair, fontWeight: '700' }]}>{o.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 16 }}>{onglets.find(o => o.id === actif)?.contenu}</ScrollView>
    </View>
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
  page: { flex: 1, backgroundColor: couleurs.fond },
  titre: { color: couleurs.texteClair, fontSize: 20, fontWeight: '800', padding: 16, paddingBottom: 8 },
  barre: { flexGrow: 0, paddingHorizontal: 16, paddingBottom: 8 },
  puce: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: couleurs.carte },
  puceActive: { backgroundColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 13, fontWeight: '600' },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 16 },
  carteTexte: { color: couleurs.texte, fontSize: 14, lineHeight: 20 },
});
