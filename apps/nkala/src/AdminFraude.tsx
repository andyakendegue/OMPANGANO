import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  chargerBadges, chargerUtilisateurs, LIBELLE_COMPTE, modifierUtilisateur, niveauPourXp, profilsSuspects, USER_LEVELS,
  type AccountStatus, type Badge, type ProfilSuspect, type UserProfile,
} from '@nkala/noyau';
import { Moderation } from './Admin';
import { couleurs } from './theme';

const avertir = (t: string, m: string) => (Platform.OS === 'web' ? (globalThis as any).alert?.(`${t}\n${m}`) : Alert.alert(t, m));

// ---------------------------------------------------------------- Groupe Modération : validation vocale + anti-fraude

export function GroupeModeration() {
  const [r, setR] = useState<'voix' | 'fraude'>('voix');
  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {([['voix', 'Validation vocale'], ['fraude', 'Anti-fraude']] as const).map(([id, nom]) => (
          <Pressable key={id} onPress={() => setR(id)} style={[s.puce, r === id && s.puceActive]}><Text style={[s.puceTexte, r === id && s.puceTexteActif]}>{nom}</Text></Pressable>
        ))}
      </ScrollView>
      {r === 'voix' ? <Moderation /> : <AntiFraude />}
    </View>
  );
}

function useUtilisateurs() {
  const [liste, setListe] = useState<UserProfile[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => { chargerUtilisateurs().then(setListe).catch(e => setErreur((e as Error).message)); }, []);
  return { liste, setListe, erreur };
}

export function AntiFraude() {
  const { liste, setListe, erreur } = useUtilisateurs();
  const [filtre, setFiltre] = useState<'tous' | 'modere' | 'critique'>('modere');
  const [q, setQ] = useState('');

  const suspects = useMemo(() => profilsSuspects(liste || []), [liste]);
  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return suspects.filter(u => {
      if (filtre === 'critique' && u.risque !== 'critique') return false;
      if (filtre === 'modere' && u.risque === 'faible') return false;
      return !t || `${u.fullName} ${u.displayName} ${u.tribe} ${u.villageOfOrigin}`.toLowerCase().includes(t);
    });
  }, [suspects, filtre, q]);

  const changer = async (u: ProfilSuspect, status: AccountStatus) => {
    try {
      const maj = await modifierUtilisateur(u.id, { status });
      setListe(l => l && l.map(x => (x.id === u.id ? { ...x, ...maj } : x)));
    } catch (e) { avertir('Modification impossible', (e as Error).message); }
  };

  if (erreur) return <Text style={s.danger}>Indisponible : {erreur}</Text>;
  if (!liste) return <ActivityIndicator color={couleurs.ambre} />;
  return (
    <View style={{ gap: 10 }}>
      <View style={[s.carte, { borderColor: '#ef4444' }]}>
        <Text style={s.danger}>Profils inactifs ou douteux</Text>
        <Text style={s.discret}>Nkala est réservé aux contributeurs authentiques de la communauté myènè. L’indice combine l’inactivité, les clans et le village déclarés.</Text>
      </View>
      <TextInput style={s.champ} placeholder="Nom, ethnie, village…" placeholderTextColor={couleurs.discret} value={q} onChangeText={setQ} />
      <View style={s.pile}>
        {([['tous', 'Tous'], ['modere', 'Risque modéré +'], ['critique', 'Critique']] as const).map(([id, nom]) => (
          <Pressable key={id} onPress={() => setFiltre(id)} style={[s.puce, filtre === id && s.puceActive]}><Text style={[s.puceTexte, filtre === id && s.puceTexteActif]}>{nom}</Text></Pressable>
        ))}
      </View>
      <Text style={s.discret}>{visibles.length} profil(s) sur {liste.length}</Text>
      {visibles.slice(0, 40).map(u => (
        <View key={u.id} style={[s.carte, u.risque === 'critique' && { borderColor: '#ef4444' }, u.risque === 'modere' && { borderColor: '#f59e0b' }]}>
          <View style={s.ligneSimple}>
            <Text style={s.nom} numberOfLines={1}>{u.fullName || u.displayName}</Text>
            <Text style={[s.score, { color: u.scoreCalcule >= 60 ? '#ef4444' : u.scoreCalcule >= 30 ? '#f59e0b' : '#22c55e' }]}>{u.scoreCalcule}/100</Text>
          </View>
          <Text style={s.discret}>{u.contact || u.email || 'contact non renseigné'} · {u.tribe || 'ethnie inconnue'} · {LIBELLE_COMPTE[u.status]}</Text>
          <Text style={s.texte}>Clans : {u.paternalClan || 'N/A'} / {u.maternalClan || 'N/A'} · Village : {u.villageOfOrigin || 'non déclaré'}</Text>
          <Text style={s.texte}>{u.contributionsCount || 0} contributions · {u.recordingsCount || 0} voix</Text>
          {u.raisons.map((r, i) => <Text key={i} style={s.alerte}>• {r}</Text>)}
          <View style={s.ligneSimple}>
            {u.status !== 'active' && <Pressable onPress={() => changer(u, 'active')}><Text style={s.lien}>Réactiver</Text></Pressable>}
            {u.status !== 'flagged' && <Pressable onPress={() => changer(u, 'flagged')}><Text style={s.lienOr}>Signaler</Text></Pressable>}
            {u.status !== 'suspended' && <Pressable onPress={() => changer(u, 'suspended')}><Text style={s.danger}>Suspendre</Text></Pressable>}
          </View>
        </View>
      ))}
      {visibles.length > 40 && <Text style={s.discret}>40 premiers affichés : affinez la recherche.</Text>}
    </View>
  );
}

// ---------------------------------------------------------------- Niveaux XP et badges d'un utilisateur

export function NiveauxXp() {
  const { liste, setListe, erreur } = useUtilisateurs();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [q, setQ] = useState('');
  const [choisi, setChoisi] = useState<UserProfile | null>(null);
  useEffect(() => { chargerBadges().then(setBadges).catch(() => {}); }, []);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (liste || []).filter(u => t && `${u.fullName} ${u.displayName} ${u.email}`.toLowerCase().includes(t)).slice(0, 15);
  }, [liste, q]);

  if (erreur) return <Text style={s.danger}>Indisponible : {erreur}</Text>;
  if (!liste) return <ActivityIndicator color={couleurs.ambre} />;
  if (choisi) {
    return <EditionNiveau u={choisi} badges={badges} surFerme={() => setChoisi(null)}
      surSauve={maj => { setListe(l => l && l.map(x => (x.id === maj.id ? { ...x, ...maj } : x))); setChoisi(null); }} />;
  }
  return (
    <View style={{ gap: 10 }}>
      <View style={s.carte}>
        <Text style={s.titre}>Niveaux traditionnels</Text>
        {USER_LEVELS.map(l => <Text key={l.index} style={s.texte}>{l.index}. {l.name} · dès {l.minXp} XP</Text>)}
      </View>
      <TextInput style={s.champ} placeholder="Chercher un contributeur à promouvoir" placeholderTextColor={couleurs.discret} value={q} onChangeText={setQ} autoCapitalize="none" />
      {visibles.map(u => (
        <Pressable key={u.id} style={s.carte} onPress={() => setChoisi(u)}>
          <Text style={s.nom}>{u.fullName || u.displayName}</Text>
          <Text style={s.discret}>{u.level} · {u.xp} XP · {u.badges?.length || 0} badge(s)</Text>
        </Pressable>
      ))}
    </View>
  );
}

function EditionNiveau({ u, badges, surFerme, surSauve }: { u: UserProfile; badges: Badge[]; surFerme: () => void; surSauve: (u: UserProfile) => void }) {
  const [niveau, setNiveau] = useState(u.levelIndex || niveauPourXp(u.xp).index);
  const [xp, setXp] = useState(String(u.xp || 0));
  const [miens, setMiens] = useState<string[]>(u.badges || []);
  const [occupe, setOccupe] = useState(false);

  const basculer = (id: string) => setMiens(m => (m.includes(id) ? m.filter(x => x !== id) : [...m, id]));
  const enregistrer = async () => {
    setOccupe(true);
    try {
      const xpNum = Math.max(0, Math.trunc(Number(xp) || 0));
      const patch: Record<string, unknown> = { levelIndex: niveau, badges: miens };
      if (xpNum !== (u.xp || 0)) patch.xp = xpNum;
      surSauve(await modifierUtilisateur(u.id, patch));
    } catch (e) { avertir('Enregistrement impossible', (e as Error).message); setOccupe(false); }
  };

  return (
    <View style={s.carte}>
      <Text style={s.titre}>{u.fullName || u.displayName}</Text>
      <Text style={s.etiquette}>Niveau traditionnel</Text>
      <View style={s.pile}>
        {USER_LEVELS.map(l => (
          <Pressable key={l.index} onPress={() => setNiveau(l.index)} style={[s.puce, niveau === l.index && s.puceActive]}><Text style={[s.puceTexte, niveau === l.index && s.puceTexteActif]}>{l.index}. {l.name}</Text></Pressable>
        ))}
      </View>
      <Text style={s.etiquette}>Points XP</Text>
      <TextInput style={s.champ} value={xp} onChangeText={setXp} keyboardType="number-pad" />
      <Text style={s.etiquette}>Badges ({miens.length})</Text>
      <View style={s.pile}>
        {badges.map(b => (
          <Pressable key={b.id} onPress={() => basculer(b.id)} style={[s.puce, miens.includes(b.id) && s.puceActive]}><Text style={[s.puceTexte, miens.includes(b.id) && s.puceTexteActif]}>{b.icon} {b.title}</Text></Pressable>
        ))}
        {badges.length === 0 && <Text style={s.discret}>Aucun badge défini.</Text>}
      </View>
      <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} onPress={enregistrer} disabled={occupe}><Text style={s.boutonTexte}>Enregistrer</Text></Pressable>
      <Pressable onPress={surFerme}><Text style={[s.lien, { textAlign: 'center' }]}>Annuler</Text></Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  titre: { color: couleurs.texteClair, fontSize: 15, fontWeight: '800' },
  nom: { color: couleurs.texteClair, fontSize: 15, fontWeight: '700', flex: 1 },
  texte: { color: couleurs.texte, fontSize: 13 },
  discret: { color: couleurs.discret, fontSize: 12 },
  etiquette: { color: couleurs.texte, fontSize: 12, fontWeight: '700', marginTop: 4 },
  alerte: { color: '#fca5a5', fontSize: 12 },
  score: { fontSize: 18, fontWeight: '900' },
  ligneSimple: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  pile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  champ: { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, padding: 12, fontSize: 14 },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 13 },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1 },
  puceActive: { backgroundColor: couleurs.terre, borderColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  puceTexteActif: { color: '#fff', fontWeight: '700' },
  lien: { color: couleurs.ambre, fontSize: 13, fontWeight: '700' },
  lienOr: { color: '#fbbf24', fontSize: 13, fontWeight: '700' },
  danger: { color: '#fca5a5', fontSize: 13, fontWeight: '700' },
});
