import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CATEGORIES_FAQ, FAQ_CONTRIBUTION, type CategorieFaq } from '@nkala/noyau';
import { EcranModal } from './ui';
import { couleurs } from './theme';

/** Foire aux questions : mêmes questions et mêmes réponses que le site web (textes générés depuis le web). */
export function FaqModale({ visible, tribu, filtreTribu, onFiltreTribu, onClose }: {
  visible: boolean; tribu?: string; filtreTribu?: string; onFiltreTribu?: (t: string) => void; onClose: () => void;
}) {
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState<'all' | CategorieFaq>('all');
  const [ouverts, setOuverts] = useState<Set<string>>(new Set());

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return FAQ_CONTRIBUTION.filter(f => {
      if (categorie !== 'all' && f.category !== categorie) return false;
      if (!q) return true;
      return [f.question, f.shortSummary, ...f.answerParagraphs, ...f.tags, ...(f.examples || []).flatMap(e => [e.label, e.detail])].join(' ').toLowerCase().includes(q);
    });
  }, [recherche, categorie]);

  const basculer = (id: string) => setOuverts(o => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <EcranModal visible={visible} titre="Guide & Règles de Contribution en Langue Omyènè" sousTitre="Foire Aux Questions (FAQ) Règles officielles de contribution Myènè" onClose={onClose}>
      <Text style={s.p}>Consultez les règles linguistiques (Ethnies vs Clans, orthographe, sens français et voix) ou recherchez un mot-clé en temps réel.</Text>

      <View style={s.note}>
        <Text style={s.noteTitre}>Rappel Linguistique Essentiel : Ethnies vs Clans</Text>
        <Text style={s.p}>
          Les différences orthographiques, phonétiques et tonales en Myènè concernent uniquement les 6 Ethnies (Mpongwè, Adyumba, Enenga, Nkomi, Galoa, Ôrungu) et jamais les Clans. Les questions sont donc exclusivement filtrées par Ethnie et par Thème.
        </Text>
        {!!tribu && !!onFiltreTribu && (
          <Pressable onPress={() => { onFiltreTribu(filtreTribu === tribu ? 'all' : tribu); onClose(); }} style={s.bouton}>
            <Text style={s.boutonTexte}>{filtreTribu === tribu ? `Filtre actif : Ethnie ${tribu}` : `Filtrer par mon ethnie (${tribu})`}</Text>
          </Pressable>
        )}
      </View>

      <TextInput style={s.champ} value={recherche} onChangeText={setRecherche} autoCapitalize="none"
        placeholder="Rechercher en temps réel dans la FAQ (ex: ethnie, clan, ton, orthographe, sens français, micro, hors-ligne...)" placeholderTextColor={couleurs.discret} />

      <View style={s.pile}>
        {CATEGORIES_FAQ.map(c => (
          <Pressable key={c.id} onPress={() => setCategorie(c.id)} style={[s.puce, categorie === c.id && s.puceActive]}>
            <Text style={[s.puceTexte, categorie === c.id && { color: '#fff', fontWeight: '700' }]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={s.pile}>
        <Pressable onPress={() => setOuverts(new Set(resultats.map(r => r.id)))}><Text style={s.lien}>Tout déplier</Text></Pressable>
        <Pressable onPress={() => setOuverts(new Set())}><Text style={s.lien}>Tout replier</Text></Pressable>
      </View>

      {recherche.trim() !== '' && (
        <Text style={s.discret}>Résultat{resultats.length > 1 ? 's' : ''} pour « {recherche.trim()} » : {resultats.length} question{resultats.length > 1 ? 's' : ''} trouvée{resultats.length > 1 ? 's' : ''}</Text>
      )}
      {resultats.length === 0 && <Text style={s.p}>Aucune question ne correspond à votre recherche.</Text>}

      {resultats.map(f => {
        const ouvert = ouverts.has(f.id);
        return (
          <View key={f.id} style={[s.carte, f.isImportantRule && { borderColor: couleurs.ambre }]}>
            <Pressable onPress={() => basculer(f.id)}>
              <Text style={s.question}>{f.isImportantRule ? '★ ' : ''}{f.question}</Text>
              {!ouvert && <Text style={s.discret}>{f.shortSummary}</Text>}
            </Pressable>
            {ouvert && (
              <View style={{ gap: 8, marginTop: 6 }}>
                {f.answerParagraphs.map((p, i) => <Text key={i} style={s.p}>{p}</Text>)}
                {f.examples?.map((e, i) => (
                  <View key={i} style={s.exemple}><Text style={s.exLabel}>{e.label}</Text><Text style={s.p}>{e.detail}</Text></View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </EcranModal>
  );
}

const s = StyleSheet.create({
  p: { color: couleurs.texte, fontSize: 14, lineHeight: 21 },
  discret: { color: couleurs.discret, fontSize: 12, marginTop: 2 },
  note: { backgroundColor: couleurs.carte, borderColor: couleurs.ambre, borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  noteTitre: { color: couleurs.ambre, fontWeight: '800', fontSize: 14 },
  champ: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 14, color: couleurs.texteClair, padding: 12, fontSize: 13 },
  pile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1 },
  puceActive: { backgroundColor: couleurs.terre, borderColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  lien: { color: couleurs.ambre, fontSize: 13, fontWeight: '700' },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 13 },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 14, padding: 12 },
  question: { color: couleurs.texteClair, fontSize: 15, fontWeight: '800' },
  exemple: { backgroundColor: couleurs.fond, borderRadius: 10, padding: 10, gap: 2 },
  exLabel: { color: couleurs.ambre, fontSize: 12, fontWeight: '800' },
});
