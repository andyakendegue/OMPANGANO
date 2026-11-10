import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, UIManager, View } from 'react-native';
import { chargerClassement, niveauPourXp, USER_LEVELS, type LigneClassement } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { useVersionDonnees } from './donnees';
import { MesBadges } from './Recompenses';
import { couleurs, stylesDyn } from './theme';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

const TRIBUS = ['Toutes', 'Ôrungu', 'Mpongwè', 'Galoa', 'Nkomi', 'Enenga', 'Adyumba'];
const nomTribu = (t: string) => (t === 'Toutes' ? 'Toutes les Ethnies' : t);
interface Retour { rangGagne: number; xpGagne: number; rang: number }

/** Classement : en-tête du contributeur, badges, podium, transitions de rang animées et simulation d'XP (comme LeaderboardAndRewards du site web). */
export function Classement() {
  const { profil } = useAuth();
  const version = useVersionDonnees();
  const [lignes, setLignes] = useState<LigneClassement[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tribu, setTribu] = useState('Toutes');
  const [nom, setNom] = useState('');
  const [boosts, setBoosts] = useState<Record<string, number>>({});
  const [retours, setRetours] = useState<Record<string, Retour>>({});
  const precedent = useRef<Record<string, { rang: number; xp: number }>>({});

  const charger = useCallback(async () => {
    try { setLignes(await chargerClassement()); setErreur(null); } catch (e) { setErreur((e as Error).message); }
  }, []);
  useEffect(() => { charger(); }, [charger, version]);

  const xpMoi = (profil?.xp || 0) + (profil ? boosts[profil.id] || 0 : 0);
  const niveau = niveauPourXp(xpMoi);
  const suivant = USER_LEVELS.find(l => l.index === niveau.index + 1);
  const pct = Math.min(100, Math.max(5, Math.round(((xpMoi - niveau.minXp) / Math.max(1, suivant ? suivant.minXp - niveau.minXp : 1)) * 100)));

  // Fusion du contributeur courant (XP local le plus récent), points simulés, filtres, tri par XP.
  const tries = useMemo(() => {
    const m = new Map<string, LigneClassement>();
    (lignes || []).forEach(l => m.set(l.id, l));
    if (profil) {
      const ex = m.get(profil.id);
      m.set(profil.id, { ...(ex || { id: profil.id, displayName: profil.displayName, level: profil.level, levelIndex: profil.levelIndex, contributionsCount: 0, recordingsCount: 0, validationsCount: 0, badgesCount: 0 }),
        xp: Math.max(ex?.xp || 0, profil.xp || 0), tribe: profil.tribe, villageOfOrigin: profil.villageOfOrigin, fullName: profil.fullName } as LigneClassement);
    }
    const q = nom.trim().toLowerCase();
    return [...m.values()].map(u => { const xp = (u.xp || 0) + (boosts[u.id] || 0); const l = niveauPourXp(xp); return { ...u, xp, level: l.name, levelIndex: l.index }; })
      .filter(u => (tribu === 'Toutes' || u.tribe === tribu) && (!q || (u.fullName || u.displayName || '').toLowerCase().includes(q) || (u.villageOfOrigin || '').toLowerCase().includes(q)))
      .sort((a, b) => (b.xp || 0) - (a.xp || 0));
  }, [lignes, profil, boosts, tribu, nom]);

  // Détection des gains d'XP et des montées de rang : l'indicateur reste 4,2 s, la liste se réordonne avec une animation.
  useEffect(() => {
    const avant = precedent.current; const apres: Record<string, { rang: number; xp: number }> = {}; const nouveaux: Record<string, Retour> = {};
    tries.forEach((u, i) => {
      const rang = i + 1; const p = avant[u.id];
      if (p) { const dx = u.xp - p.xp; const dr = p.rang - rang; if (dx > 0 || dr > 0) nouveaux[u.id] = { rangGagne: Math.max(0, dr), xpGagne: Math.max(0, dx), rang }; }
      apres[u.id] = { rang, xp: u.xp };
    });
    precedent.current = apres;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (Object.keys(nouveaux).length) {
      setRetours(r => ({ ...r, ...nouveaux }));
      const t = setTimeout(() => setRetours(r => { const c = { ...r }; Object.keys(nouveaux).forEach(k => delete c[k]); return c; }), 4200);
      return () => clearTimeout(t);
    }
  }, [tries]);

  const simuler = () => {
    if (tries.length < 2) return;
    const idx = tries.findIndex(u => u.id === profil?.id);
    const cible = idx > 0 ? idx : Math.min(2, tries.length - 1);
    const u = tries[cible]; const dessus = tries[cible - 1];
    if (!u || !dessus) return;
    const besoin = Math.max(50, (dessus.xp || 0) - (u.xp || 0) + 45);
    setBoosts(b => ({ ...b, [u.id]: (b[u.id] || 0) + besoin }));
  };
  const reinitialiser = () => { precedent.current = {}; setRetours({}); setBoosts({}); };

  if (!lignes && !erreur) return <ActivityIndicator color={couleurs.ambre} />;
  const podium = [tries[1], tries[0], tries[2]];
  const nomDe = (u?: { fullName?: string; displayName: string }) => u?.fullName || u?.displayName || '';

  return (
    <View style={{ gap: 10 }}>
      {erreur && <Text style={s.erreur}>Classement indisponible : {erreur}</Text>}
      <View style={s.entete}>
        <Text style={s.niv}>Niv. {niveau.index}</Text>
        <Text style={s.nomJoueur}>{profil?.fullName || profil?.displayName || 'Contributeur Nkala'}</Text>
        <Text style={s.discret}>{niveau.name}</Text>
        <Text style={s.discret}>Ethnie {profil?.tribe || 'Myènè'} • {profil?.villageOfOrigin || 'Village non spécifié'}</Text>
        <Text style={s.xpGrand}>✨ {xpMoi} Points XP</Text>
        <Text style={s.discret}>🔥 Série : {profil?.streakDays || 1} jours</Text>
        <Text style={s.discret}>Vers le niveau suivant  {suivant ? `${xpMoi} / ${suivant.minXp} XP` : 'Niveau MAX'}</Text>
        <View style={s.piste}><View style={[s.rempli, { width: `${pct}%` }]} /></View>
        <View style={s.ligneH}><Text style={s.discret}>{niveau.name}</Text><Text style={s.discret}>{suivant ? suivant.name : 'Maîtrise Suprême'}</Text></View>
      </View>

      <MesBadges />

      <Text style={s.h}>Classement Mondial des Contributeurs</Text>
      <Text style={s.discret}>En direct de l'Ogooué & de l'Estuaire • Transitions de rang dynamiques</Text>
      <View style={s.ligneH}>
        <Pressable style={s.petit} onPress={simuler}><Text style={s.petitTexte}>Simuler montée en rang (+XP)</Text></Pressable>
        {Object.keys(boosts).length > 0 && <Pressable style={s.petit} onPress={reinitialiser}><Text style={s.petitTexte}>Réinitialiser</Text></Pressable>}
      </View>

      <TextInput style={s.champ} placeholder="Chercher un contributeur" placeholderTextColor={couleurs.discret} value={nom} onChangeText={setNom} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TRIBUS.map(t => (
          <Pressable key={t} onPress={() => setTribu(t)} style={[s.puce, tribu === t && s.puceActive]}><Text style={[s.puceTexte, tribu === t && { color: '#fff', fontWeight: '700' }]}>{nomTribu(t)}</Text></Pressable>
        ))}
      </ScrollView>

      {tries.length >= 3 && (
        <View style={s.podium}>
          {podium.map((u, i) => u && (
            <View key={u.id} style={[s.marche, i === 1 && s.premier, retours[u.id] && s.marcheHausse]}>
              <Text style={{ fontSize: 22 }}>{i === 1 ? '👑' : i === 0 ? '🥈' : '🥉'}</Text>
              <Text style={s.nomPodium} numberOfLines={1}>{nomDe(u)}</Text>
              <Text style={s.xp}>{u.xp} XP</Text>
              <Text style={s.discret}>{u.tribe}</Text>
            </View>
          ))}
        </View>
      )}

      {tries.slice(0, 100).map((u, i) => {
        const rang = i + 1; const r = retours[u.id]; const moi = u.id === profil?.id;
        return (
          <View key={u.id} style={[s.ligne, moi && s.moi, r?.rangGagne ? s.hausse : null]}>
            <Text style={s.rang}>{rang <= 3 ? ['🥇', '🥈', '🥉'][rang - 1] : `#${rang}`}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.nom} numberOfLines={1}>{nomDe(u)}{moi ? '  (Vous)' : ''}</Text>
              <Text style={s.discret} numberOfLines={1}>{[u.tribe, u.villageOfOrigin, u.level].filter(Boolean).join(' · ')}</Text>
              {r && <Text style={s.retour}>{r.rangGagne > 0 ? `▲ +${r.rangGagne} rang${r.rangGagne > 1 ? 's' : ''} ` : ''}{r.xpGagne > 0 ? `+${r.xpGagne} XP` : ''}</Text>}
            </View>
            <Text style={s.xp}>{u.xp} XP</Text>
          </View>
        );
      })}
      {lignes && tries.length === 0 && <Text style={s.discret}>Aucun contributeur trouvé.</Text>}
      {tries.length > 100 && <Text style={s.discret}>100 premiers affichés sur {tries.length}.</Text>}
      <Pressable onPress={charger}><Text style={s.lien}>Actualiser le classement</Text></Pressable>
    </View>
  );
}

const s = stylesDyn(() => ({
  entete: { backgroundColor: couleurs.carte, borderColor: couleurs.ambre, borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  niv: { color: '#451a03', backgroundColor: couleurs.ambre, alignSelf: 'flex-start', fontWeight: '900', fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  nomJoueur: { color: '#fff', fontSize: 18, fontWeight: '800' },
  xpGrand: { color: couleurs.ambre, fontSize: 20, fontWeight: '900' },
  piste: { height: 8, borderRadius: 4, backgroundColor: couleurs.fond, overflow: 'hidden' },
  rempli: { height: 8, backgroundColor: couleurs.ambre },
  ligneH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  h: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 8 },
  petit: { borderColor: couleurs.ambre, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  petitTexte: { color: '#fde047', fontSize: 12, fontWeight: '800' },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  marche: { flex: 1, backgroundColor: couleurs.carte, borderColor: '#b4530966', borderWidth: 1, borderRadius: 14, padding: 10, alignItems: 'center', gap: 2 },
  premier: { paddingVertical: 16, borderColor: couleurs.ambre, borderWidth: 2, backgroundColor: '#381a0b' },
  marcheHausse: { borderColor: '#34d399', borderWidth: 2 },
  nomPodium: { color: '#fff', fontWeight: '800', fontSize: 12 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e1008', borderColor: '#381c0e', borderWidth: 1, borderRadius: 14, padding: 12 },
  moi: { backgroundColor: '#c85a3240', borderColor: couleurs.terre },
  hausse: { backgroundColor: '#022c2280', borderColor: '#34d399' },
  rang: { color: couleurs.ambre, fontSize: 16, fontWeight: '800', width: 40, textAlign: 'center' },
  nom: { color: couleurs.texteClair, fontSize: 15, fontWeight: '700' },
  retour: { color: '#6ee7b7', fontSize: 11, fontWeight: '800' },
  discret: { color: couleurs.discret, fontSize: 12 },
  xp: { color: couleurs.ambre, fontWeight: '800' },
  champ: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, padding: 12, fontSize: 15 },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.carte },
  puceActive: { backgroundColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  lien: { color: couleurs.ambre, textAlign: 'center', fontSize: 13, fontWeight: '600' },
  erreur: { color: '#fca5a5', fontSize: 13 },
}));
