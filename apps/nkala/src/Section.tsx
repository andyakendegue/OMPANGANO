import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { couleurs } from './theme';

export interface SousOnglet { id: string; label: string; contenu: React.ReactNode }

/** Sous-navigation d'une entrée principale (comme CrowdsourceSubNav, AdminDashboard et UserProfileView sur le web). */
export function Section({ titre, onglets }: { titre: string; onglets: SousOnglet[] }) {
  const [actif, setActif] = useState(onglets[0].id);
  return (
    <View style={s.page}>
      <Text style={s.titre}>{titre}</Text>
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
  page: { flex: 1, backgroundColor: couleurs.fond },
  titre: { color: couleurs.texteClair, fontSize: 20, fontWeight: '800', padding: 16, paddingBottom: 8 },
  barre: { flexGrow: 0, paddingHorizontal: 16, paddingBottom: 8 },
  puce: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: couleurs.carte },
  puceActive: { backgroundColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 13, fontWeight: '600' },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 16 },
  carteTexte: { color: couleurs.texte, fontSize: 14, lineHeight: 20 },
});
