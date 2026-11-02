import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import type { QuestionnaireItem } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { catalogue } from './catalogue';
import { couleurs } from './theme';

const PAGE = 40;
const DIALECTES: [string | null, string][] = [
  [null, 'Tous'], ['orungu', 'Ôrungu'], ['mpongwe', 'Mpongwè'], ['galoa', 'Galwa'],
  ['nkomi', 'Nkomi'], ['enenga', 'Enenga'], ['adyumba', 'Adyumba'],
];

/** Explorateur de vocabulaire : lit le catalogue local par pages de 40 fiches (mémoire réduite pour les téléphones modestes). */
export function Ezango() {
  const { profil, favori } = useAuth();
  const favoris = profil?.favoriteItemIds || [];
  const [texte, setTexte] = useState('');
  const [requete, setRequete] = useState('');
  const [dialecte, setDialecte] = useState<string | null>(null);
  const [seulementFavoris, setSeulementFavoris] = useState(false);
  const [fiches, setFiches] = useState<QuestionnaireItem[]>([]);
  const [fin, setFin] = useState(false);
  const [charge, setCharge] = useState(false);
  const generation = useRef(0);

  // Recherche différée : pas de requête à chaque frappe.
  useEffect(() => {
    const t = setTimeout(() => setRequete(texte), 300);
    return () => clearTimeout(t);
  }, [texte]);

  const lire = useCallback(async (decalage: number) => {
    const g = ++generation.current;
    setCharge(true);
    const lot = seulementFavoris
      ? (await catalogue.parIds(favoris)).filter(f => (!dialecte || f.dialect === dialecte) && (!requete || `${f.frenchText} ${f.myeneText}`.toLowerCase().includes(requete.toLowerCase())))
      : await catalogue.rechercher({ dialecte, texte: requete, limite: PAGE, decalage });
    if (g !== generation.current) return;
    setFiches(prev => (decalage === 0 ? lot : [...prev, ...lot]));
    setFin(seulementFavoris || lot.length < PAGE);
    setCharge(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialecte, requete, seulementFavoris, favoris.length]);

  useEffect(() => { lire(0); }, [lire]);

  return (
    <View style={{ gap: 10 }}>
      <TextInput style={s.champ} placeholder="Chercher un mot (français ou myènè)" placeholderTextColor={couleurs.discret}
        value={texte} onChangeText={setTexte} autoCorrect={false} autoCapitalize="none" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pressable onPress={() => setSeulementFavoris(!seulementFavoris)} style={[s.puce, seulementFavoris && s.puceActive]}>
          <Text style={[s.puceTexte, seulementFavoris && s.puceTexteActif]}>★ Favoris ({favoris.length})</Text>
        </Pressable>
        {DIALECTES.map(([code, nom]) => (
          <Pressable key={nom} onPress={() => setDialecte(code)} style={[s.puce, dialecte === code && s.puceActive]}>
            <Text style={[s.puceTexte, dialecte === code && s.puceTexteActif]}>{nom}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={fiches}
        keyExtractor={f => f.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const aime = favoris.includes(item.id);
          return (
            <View style={s.carte}>
              <View style={{ flex: 1 }}>
                <Text style={s.myene}>{item.myeneText}</Text>
                {!!item.phoneticApi && <Text style={s.discret}>[{item.phoneticApi}]</Text>}
                <Text style={s.francais}>{item.frenchText}</Text>
                <Text style={s.discret}>{String(item.dialect)} · {item.theme || item.category}</Text>
              </View>
              <Pressable onPress={() => favori(item.id)} hitSlop={10} accessibilityLabel={aime ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                <Text style={{ fontSize: 24, color: aime ? couleurs.ambre : couleurs.discret }}>{aime ? '★' : '☆'}</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={charge ? null : <Text style={s.discret}>Aucune fiche trouvée.</Text>}
      />
      {charge && <ActivityIndicator color={couleurs.ambre} />}
      {!fin && !charge && fiches.length > 0 && (
        <Pressable style={s.suite} onPress={() => lire(fiches.length)}><Text style={s.suiteTexte}>Voir plus</Text></Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  champ: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, padding: 12, fontSize: 15 },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.carte },
  puceActive: { backgroundColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  puceTexteActif: { color: '#fff', fontWeight: '700' },
  carte: { flexDirection: 'row', gap: 10, backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 14, padding: 12 },
  myene: { color: couleurs.ambre, fontSize: 18, fontWeight: '800' },
  francais: { color: couleurs.texteClair, fontSize: 15, marginTop: 2 },
  discret: { color: couleurs.discret, fontSize: 12, marginTop: 2 },
  suite: { backgroundColor: couleurs.carte, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderColor: couleurs.bord, borderWidth: 1 },
  suiteTexte: { color: couleurs.ambre, fontWeight: '700' },
});
