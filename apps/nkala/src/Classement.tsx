import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { chargerClassement, niveauPourXp, USER_LEVELS, type LigneClassement } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { MesBadges } from './Recompenses';
import { couleurs } from './theme';

const TRIBUS = ['Toutes', 'Ôrungu', 'Mpongwè', 'Galoa', 'Nkomi', 'Enenga', 'Adyumba'];
const nomTribu = (t: string) => (t === 'Toutes' ? 'Toutes les Tribus' : t);
const MEDAILLES = ['🥇', '🥈', '🥉'];

export function Classement() {
  const { profil } = useAuth();
  const [lignes, setLignes] = useState<LigneClassement[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tribu, setTribu] = useState('Toutes');
  const [nom, setNom] = useState('');

  const charger = useCallback(async () => {
    try { setLignes(await chargerClassement()); setErreur(null); }
    catch (e) { setErreur((e as Error).message); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  // Le serveur trie déjà par XP ; le rang reste celui du classement général, même filtré.
  const rangs = useMemo(() => {
    const m = new Map<string, number>();
    (lignes || []).forEach((l, i) => m.set(l.id, i + 1));
    return m;
  }, [lignes]);

  const visibles = useMemo(() => {
    const q = nom.trim().toLowerCase();
    return (lignes || []).filter(l => (tribu === 'Toutes' || l.tribe === tribu) && (!q || (l.fullName || l.displayName || '').toLowerCase().includes(q)));
  }, [lignes, tribu, nom]);

  const moi = lignes?.find(l => l.id === profil?.id);

  if (!lignes && !erreur) return <ActivityIndicator color={couleurs.ambre} />;
  return (
    <View style={{ gap: 10 }}>
      {erreur && <Text style={s.erreur}>Classement indisponible : {erreur}</Text>}
      <View style={s.entete}>
        <Text style={s.nomJoueur}>{profil?.fullName || profil?.displayName || 'Contributeur Nkala'}</Text>
        <Text style={s.discret}>Niv. {niveauPourXp(profil?.xp || 0).index} · {niveauPourXp(profil?.xp || 0).name}</Text>
        <Text style={s.discret}>Tribu {profil?.tribe || 'Myènè'} • {profil?.villageOfOrigin || 'Village non spécifié'}</Text>
        <Text style={s.xpGrand}>{profil?.xp || 0} Points XP</Text>
        <Text style={s.discret}>Série : {profil?.streakDays || 1} jours</Text>
        {(() => {
          const n = niveauPourXp(profil?.xp || 0);
          const suivant = USER_LEVELS.find(l => l.index === n.index + 1);
          const p = suivant ? Math.min(100, Math.round((((profil?.xp || 0) - n.minXp) / Math.max(1, suivant.minXp - n.minXp)) * 100)) : 100;
          return (<>
            <Text style={s.discret}>Vers le niveau suivant  {suivant ? `${profil?.xp || 0} / ${suivant.minXp} XP` : 'Niveau MAX'}</Text>
            <View style={s.piste}><View style={[s.rempli, { width: `${p}%` }]} /></View>
            <Text style={s.discret}>{n.name}  →  {suivant ? suivant.name : 'Maîtrise Suprême'}</Text>
          </>);
        })()}
      </View>
      <MesBadges />
      <Text style={s.h}>Classement Mondial des Contributeurs</Text>
      <Text style={s.discret}>En direct de l'Ogooué & de l'Estuaire • Transitions de rang dynamiques</Text>
      {moi && <Text style={s.discret}>Votre rang : #{rangs.get(moi.id)}</Text>}
      <TextInput style={s.champ} placeholder="Chercher un contributeur" placeholderTextColor={couleurs.discret} value={nom} onChangeText={setNom} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TRIBUS.map(t => (
          <Pressable key={t} onPress={() => setTribu(t)} style={[s.puce, tribu === t && s.puceActive]}>
            <Text style={[s.puceTexte, tribu === t && { color: '#fff', fontWeight: '700' }]}>{nomTribu(t)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {visibles.slice(0, 100).map(l => {
        const rang = rangs.get(l.id) || 0;
        return (
          <View key={l.id} style={[s.ligne, l.id === profil?.id && s.moi]}>
            <Text style={s.rang}>{rang <= 3 ? MEDAILLES[rang - 1] : `#${rang}`}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.nom} numberOfLines={1}>{l.fullName || l.displayName}</Text>
              <Text style={s.discret} numberOfLines={1}>{[l.tribe, l.villageOfOrigin, l.level].filter(Boolean).join(' · ')}</Text>
            </View>
            <Text style={s.xp}>{l.xp} XP</Text>
          </View>
        );
      })}
      {lignes && visibles.length === 0 && <Text style={s.discret}>Aucun contributeur trouvé.</Text>}
      <Pressable onPress={charger}><Text style={s.lien}>Actualiser le classement</Text></Pressable>
      <MesBadges />
      {visibles.length > 100 && <Text style={s.discret}>100 premiers affichés sur {visibles.length}.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 14, padding: 12 },
  moi: { borderColor: couleurs.ambre },
  rang: { color: couleurs.ambre, fontSize: 16, fontWeight: '800', width: 40, textAlign: 'center' },
  nom: { color: couleurs.texteClair, fontSize: 15, fontWeight: '700' },
  discret: { color: couleurs.discret, fontSize: 12 },
  xp: { color: couleurs.ambre, fontWeight: '800' },
  champ: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, padding: 12, fontSize: 15 },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.carte },
  puceActive: { backgroundColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  entete: { backgroundColor: couleurs.carte, borderColor: couleurs.ambre, borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  nomJoueur: { color: '#fff', fontSize: 18, fontWeight: '800' },
  xpGrand: { color: couleurs.ambre, fontSize: 20, fontWeight: '900' },
  piste: { height: 8, borderRadius: 4, backgroundColor: couleurs.fond, overflow: 'hidden' },
  rempli: { height: 8, backgroundColor: couleurs.ambre },
  h: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 8 },
  lien: { color: couleurs.ambre, textAlign: 'center', fontSize: 13, fontWeight: '600' },
  erreur: { color: '#fca5a5', fontSize: 13 },
});
