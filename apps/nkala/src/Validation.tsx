import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { chargerStatsModeration, type StatsModeration } from '@nkala/noyau';
import { couleursSombres as couleurs } from './theme';

const LIBELLES: [string, string][] = [
  ['approved', '100 % validés'], ['audio_approved_text_revision', 'Voix bonne, écrit à corriger'],
  ['text_approved_audio_revision', 'Écrit bon, voix à refaire'], ['rejected', 'Rejetés'],
];

/** Statistiques des modérations du validateur connecté (aucune autre donnée de l'administration). */
export function StatsModeration_() {
  const [st, setSt] = useState<StatsModeration | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => { chargerStatsModeration().then(setSt).catch(e => setErreur((e as Error).message)); }, []);
  if (erreur) return <Text style={s.erreur}>Indisponible : {erreur}</Text>;
  if (!st) return <ActivityIndicator color={couleurs.ambre} />;
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.titre}>Mes modérations</Text>
      <View style={s.grille}>
        <Stat n={st.total} t="Total" accent /><Stat n={st.aujourdhui} t="Aujourd’hui" /><Stat n={st.septJours} t="7 jours" /><Stat n={st.trenteJours} t="30 jours" />
      </View>
      <View style={s.carte}>
        {LIBELLES.map(([id, nom]) => (
          <View key={id} style={s.ligne}><Text style={s.texte}>{nom}</Text><Text style={s.valeur}>{st.counts[id as keyof typeof st.counts] || 0}</Text></View>
        ))}
        <View style={s.ligne}><Text style={s.texte}>En attente d’examen (file commune)</Text><Text style={s.valeur}>{st.enAttente}</Text></View>
        {st.derniere && <Text style={s.discret}>Dernière modération : {new Date(st.derniere).toLocaleString('fr-FR')}</Text>}
      </View>
    </View>
  );
}

const Stat = ({ n, t, accent }: { n: number; t: string; accent?: boolean }) => (
  <View style={s.stat}><Text style={[s.statValeur, accent && { color: couleurs.ambre }]}>{n.toLocaleString('fr-FR')}</Text><Text style={s.discret}>{t}</Text></View>
);

const s = StyleSheet.create({
  grille: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  stat: { flexGrow: 1, minWidth: 70, backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statValeur: { color: couleurs.texteClair, fontSize: 22, fontWeight: '900' },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  titre: { color: couleurs.texteClair, fontSize: 15, fontWeight: '800' },
  texte: { color: couleurs.texte, fontSize: 14, flexShrink: 1 },
  valeur: { color: couleurs.texteClair, fontSize: 14, fontWeight: '800' },
  discret: { color: couleurs.discret, fontSize: 12 },
  erreur: { color: '#fca5a5', fontSize: 13 },
});
