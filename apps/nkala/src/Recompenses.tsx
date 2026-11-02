import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { chargerBadges, chargerDefis, conditionBadge, defisEnCours, progressionDefi, type Badge, type WeeklyChallenge } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { couleurs } from './theme';

/** Défi hebdomadaire en cours et progression. La progression est comptée par le serveur à la validation des contributions. */
export function BandeauDefi() {
  const { profil } = useAuth();
  const [defis, setDefis] = useState<WeeklyChallenge[]>([]);
  useEffect(() => { chargerDefis().then(l => setDefis(defisEnCours(l))).catch(() => {}); }, []);
  if (!defis.length) return null;
  return (
    <View style={{ gap: 8 }}>
      {defis.slice(0, 2).map(d => {
        const p = progressionDefi(profil, d);
        return (
          <View key={d.id} style={[s.carte, p.termine && { borderColor: '#22c55e' }]}>
            <Text style={s.titre}>{d.badgeRewardIcon || '🏆'} {d.title}{p.termine ? ' · accompli' : ''}</Text>
            {!!d.description && <Text style={s.discret}>{d.description}</Text>}
            <View style={s.piste}><View style={[s.rempli, { width: `${Math.round((p.fait / Math.max(1, p.cible)) * 100)}%` }]} /></View>
            <Text style={s.discret}>{p.fait} / {p.cible} · +{d.xpReward} XP{d.badgeRewardName ? ` · badge « ${d.badgeRewardName} »` : ''} · jusqu’au {d.endDate?.slice(0, 10)}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Grille des badges : débloqués en couleur, les autres grisés avec leur condition. */
export function MesBadges() {
  const { profil } = useAuth();
  const [badges, setBadges] = useState<Badge[] | null>(null);
  useEffect(() => { chargerBadges().then(setBadges).catch(() => setBadges([])); }, []);
  if (!badges || badges.length === 0) return null;
  const miens = new Set(profil?.badges || []);
  const debloques = badges.filter(b => miens.has(b.id)).length;
  return (
    <View style={s.carte}>
      <Text style={s.titre}>Mes badges ({debloques} sur {badges.length})</Text>
      {badges.map(b => {
        const ok = miens.has(b.id);
        return (
          <View key={b.id} style={[s.ligne, !ok && { opacity: 0.5 }]}>
            <Text style={{ fontSize: 26 }}>{ok ? b.icon : '🔒'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.nom}>{b.title}</Text>
              <Text style={s.discret}>{ok ? b.description : conditionBadge(b)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  titre: { color: couleurs.texteClair, fontSize: 15, fontWeight: '800' },
  nom: { color: couleurs.texteClair, fontSize: 14, fontWeight: '700' },
  discret: { color: couleurs.discret, fontSize: 12 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  piste: { height: 8, borderRadius: 4, backgroundColor: couleurs.fond, overflow: 'hidden' },
  rempli: { height: 8, backgroundColor: couleurs.ambre },
});
