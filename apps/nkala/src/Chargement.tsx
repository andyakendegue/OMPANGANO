import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useEtatSync } from './syncEtat';

/** Bandeau de chargement du catalogue : jamais de « 0 » ni de page vide pendant que les fiches arrivent. */
export function Chargement({ compact }: { compact?: boolean }) {
  const sync = useEtatSync();
  const pct = sync.genre === 'telechargement' && sync.total > 0 ? Math.min(100, Math.round((sync.fait / sync.total) * 100)) : null;
  return (
    <View style={[s.boite, compact ? { padding: 10 } : { padding: 20, alignItems: 'center' }]} accessibilityRole="progressbar" accessibilityLabel="Chargement des questions">
      <View style={s.ligne}>
        <ActivityIndicator color="#99f6e4" size="small" />
        <Text style={s.texte}>
          Chargement des questions…{sync.genre === 'telechargement' ? ` ${sync.fait.toLocaleString('fr-FR')} / ${sync.total.toLocaleString('fr-FR')}` : ''}
        </Text>
      </View>
      {!compact && <Text style={s.aide}>Les questions arrivent, elles s'afficheront ici dans un instant. Merci de patienter.</Text>}
      <View style={s.piste}><View style={[s.rempli, { width: pct === null ? '33%' : `${pct}%` }]} /></View>
    </View>
  );
}

const s = StyleSheet.create({
  boite: { backgroundColor: '#0f3d3a99', borderColor: '#14b8a666', borderWidth: 1, borderRadius: 16, gap: 8 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  texte: { color: '#99f6e4', fontSize: 12, fontWeight: '700' },
  aide: { color: '#99f6e4cc', fontSize: 11, textAlign: 'center' },
  piste: { height: 6, borderRadius: 3, backgroundColor: '#0006', overflow: 'hidden', alignSelf: 'stretch' },
  rempli: { height: '100%', backgroundColor: '#14b8a6' },
});
