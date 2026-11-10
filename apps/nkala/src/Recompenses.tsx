import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { chargerBadges, chargerDefis, conditionBadge, defisEnCours, MYENE, progressionDefi, type Badge, type WeeklyChallenge } from '@nkala/noyau';
import { ajouterAlerte, notifierLocal } from './Alertes';
import { useAuth } from './AuthProvider';
import { couleurs, stylesDyn } from './theme';

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
  const debloques = badges.filter(b => miens.has(b.id) || (profil?.xp || 0) >= (b.requiredXp || 99999)).length;
  return (
    <View style={s.carte}>
      <Text style={s.titre}>Vos Badges & Titres Honorifiques Nkala</Text>
      <Text style={s.discret}>{debloques} sur {badges.length} débloqués</Text>
      {badges.map(b => {
        const ok = miens.has(b.id) || (profil?.xp || 0) >= (b.requiredXp || 99999);
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

const s = stylesDyn(() => ({
  fond: { flex: 1, backgroundColor: '#000000cc', justifyContent: 'center', padding: 20 },
  fiche: { backgroundColor: couleurs.carte, borderColor: couleurs.ambre, borderWidth: 2, borderRadius: 24, padding: 20, gap: 10 },
  sur: { color: couleurs.ambre, textAlign: 'center', fontWeight: '900', fontSize: 14 },
  titreC: { color: '#fff', textAlign: 'center', fontWeight: '900', fontSize: 20 },
  ligneC: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: couleurs.fond, borderRadius: 12, padding: 12 },
  valeur: { color: '#fff', fontWeight: '800' },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  bouton2: { borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 14 },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  titre: { color: couleurs.texteClair, fontSize: 15, fontWeight: '800' },
  nom: { color: couleurs.texteClair, fontSize: 14, fontWeight: '700' },
  discret: { color: couleurs.discret, fontSize: 12 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  piste: { height: 8, borderRadius: 4, backgroundColor: couleurs.fond, overflow: 'hidden' },
  rempli: { height: 8, backgroundColor: couleurs.ambre },
}));

/**
 * Annonce ce que les validateurs ont accordé depuis la dernière visite (comme announceRewardsSinceLastVisit du site web) :
 * XP gagnés, et célébration quand un défi hebdomadaire vient d'être accompli.
 */
export function CelebrationDefi({ defis }: { defis: WeeklyChallenge[] }) {
  const { profil } = useAuth();
  const routeur = useRouter();
  const [defi, setDefi] = useState<WeeklyChallenge | null>(null);

  useEffect(() => {
    if (!profil) return;
    const cle = `nkala_derniere_visite_${profil.id}`;
    (async () => {
      let avant: { xp: number; faits: string[] } | null = null;
      try { avant = JSON.parse((await AsyncStorage.getItem(cle)) || 'null'); } catch { /* première visite */ }
      const faits = profil.completedChallenges || [];
      if (avant) {
        const nouveaux = faits.filter(id => !avant!.faits.includes(id));
        const ch = defis.find(d => d.id === nouveaux[0]);
        if (ch) setDefi(ch);
        const gagne = (profil.xp || 0) - (avant.xp || 0);
        if (gagne > 0) {
          const message = `+${gagne} XP depuis votre dernière visite. ${MYENE.AKEWA.mot} !`;
          await ajouterAlerte({ userId: profil.id, type: 'reward', title: `${MYENE.MBIAMBIE.mot} ! Contributions validées`, message });
          notifierLocal(`${MYENE.MBIAMBIE.mot} ! Contributions validées`, message);
        }
      }
      await AsyncStorage.setItem(cle, JSON.stringify({ xp: profil.xp || 0, faits }));
    })();
  }, [profil?.id, profil?.xp, (profil?.completedChallenges || []).length, defis.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!defi) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setDefi(null)}>
      <View style={s.fond}>
        <View style={s.fiche}>
          <Text style={{ fontSize: 56, textAlign: 'center' }}>{defi.badgeRewardIcon || '🏆'}</Text>
          <Text style={s.sur}>Défi Hebdomadaire Accompli !</Text>
          <Text style={s.titreC}>{defi.title}</Text>
          <Text style={s.discret}>Tu as brillamment relevé le défi ! Ton investissement pour préserver et enrichir la langue des ancêtres est récompensé.</Text>
          <View style={s.ligneC}><Text style={s.discret}>Badge Obtenu</Text><Text style={s.valeur}>{defi.badgeRewardIcon} {defi.badgeRewardName}</Text></View>
          <View style={s.ligneC}><Text style={s.discret}>Bonus d’Expérience</Text><Text style={s.valeur}>+{defi.xpReward} XP</Text></View>
          <Pressable style={s.bouton} onPress={() => setDefi(null)}><Text style={s.boutonTexte}>Continuer le crowdsourcing</Text></Pressable>
          <Pressable style={s.bouton2} onPress={() => { setDefi(null); routeur.push('/(tabs)/profil'); }}><Text style={s.boutonTexte}>Voir mon profil</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}
