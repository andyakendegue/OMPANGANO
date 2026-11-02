import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MYENE, type BlocTexte } from '@nkala/noyau';
import { couleurs } from './theme';

/** Fenêtre plein écran avec titre, bouton Fermer et contenu défilant (équivalent des modales du site web). */
export function EcranModal({ visible, titre, sousTitre, onClose, children }: {
  visible: boolean; titre: string; sousTitre?: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={s.page}>
        <View style={s.entete}>
          <View style={{ flex: 1 }}>
            <Text style={s.titre}>{titre}</Text>
            {!!sousTitre && <Text style={s.sous}>{sousTitre}</Text>}
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fermer"><Text style={s.fermer}>✕</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>{children}</ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const reemplacer = (t: string, vars: Record<string, string>) =>
  t.replace(/\{\{([^}]*)\}\}/g, (_, k: string) => {
    const cle = k.trim();
    if (cle in vars) return vars[cle];
    const m = /^MYENE\.([A-Z_]+)\.mot$/.exec(cle); // mots du lexique myènè sourcé
    return m && (MYENE as Record<string, { mot: string }>)[m[1]] ? (MYENE as Record<string, { mot: string }>)[m[1]].mot : '';
  });

/** Affiche des blocs de texte extraits du site web (textes/*.ts). Les {{variables}} sont remplacées. */
export function BlocsTexte({ blocs, vars = {}, onBouton }: { blocs: BlocTexte[]; vars?: Record<string, string>; onBouton?: (texte: string) => void }) {
  return (
    <View style={{ gap: 10 }}>
      {blocs.map((b, i) => {
        const t = reemplacer(b.texte, vars);
        if (b.type.startsWith('h')) return <Text key={i} style={s.h}>{t}</Text>;
        if (b.type === 'li') return <Text key={i} style={s.p}>• {t}</Text>;
        if (b.type === 'label') return <Text key={i} style={s.etiquette}>{t}</Text>;
        if (b.type === 'button') {
          if (!onBouton || t.includes('<')) return null; // boutons d'envoi : gérés par l'écran appelant
          return <Pressable key={i} onPress={() => onBouton(t)} style={s.bouton}><Text style={s.boutonTexte}>{t}</Text></Pressable>;
        }
        return <Text key={i} style={s.p}>{t}</Text>;
      })}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.fond },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomColor: couleurs.bord, borderBottomWidth: 1 },
  titre: { color: couleurs.texteClair, fontSize: 18, fontWeight: '800' },
  sous: { color: couleurs.ambre, fontSize: 12, marginTop: 2 },
  fermer: { color: couleurs.texte, fontSize: 22, paddingHorizontal: 6 },
  h: { color: couleurs.texteClair, fontSize: 16, fontWeight: '800', marginTop: 6 },
  p: { color: couleurs.texte, fontSize: 14, lineHeight: 21 },
  bouton: { backgroundColor: couleurs.carte, borderColor: couleurs.terre, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  boutonTexte: { color: couleurs.ambre, fontWeight: '800', fontSize: 14 },
  etiquette: { color: couleurs.ambre, fontSize: 13, fontWeight: '700' },
});
