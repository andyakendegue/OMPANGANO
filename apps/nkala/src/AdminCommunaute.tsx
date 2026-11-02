import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CATEGORIES_BADGE, chargerBadges, chargerDefis, conditionBadge, dateValide, enregistrerBadge, enregistrerDefi,
  nouveauBadge, nouveauDefi, supprimerBadge, supprimerDefi, TYPES_DEFI, type Badge, type WeeklyChallenge,
} from '@nkala/noyau';
import { Utilisateurs } from './Admin';
import { couleurs } from './theme';

const avertir = (t: string, m: string) => (Platform.OS === 'web' ? (globalThis as any).alert?.(`${t}\n${m}`) : Alert.alert(t, m));
const confirmer = (titre: string, msg: string, ok: () => void) => {
  if (Platform.OS === 'web') { if ((globalThis as any).confirm?.(`${titre}\n${msg}`)) ok(); return; }
  Alert.alert(titre, msg, [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: ok }]);
};
const entier = (t: string) => Math.max(0, Math.trunc(Number(t) || 0));

type Rubrique = 'utilisateurs' | 'defis' | 'badges';

export function Communaute() {
  const [r, setR] = useState<Rubrique>('utilisateurs');
  const rubriques: [Rubrique, string][] = [['utilisateurs', 'Utilisateurs'], ['defis', 'Défis'], ['badges', 'Badges']];
  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {rubriques.map(([id, nom]) => (
          <Pressable key={id} onPress={() => setR(id)} style={[s.puce, r === id && s.puceActive]}>
            <Text style={[s.puceTexte, r === id && s.puceTexteActif]}>{nom}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {r === 'utilisateurs' && <Utilisateurs />}
      {r === 'defis' && <Defis />}
      {r === 'badges' && <Badges />}
    </View>
  );
}

// ---------------------------------------------------------------- Défis

function Defis() {
  const [liste, setListe] = useState<WeeklyChallenge[] | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [edition, setEdition] = useState<WeeklyChallenge | 'nouveau' | null>(null);

  const charger = useCallback(async () => {
    try { setListe(await chargerDefis()); setBadges(await chargerBadges()); }
    catch (e) { avertir('Défis indisponibles', (e as Error).message); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const sauver = async (d: WeeklyChallenge) => {
    try { await enregistrerDefi(d); setEdition(null); charger(); }
    catch (e) { avertir('Enregistrement impossible', (e as Error).message); }
  };
  const basculer = (d: WeeklyChallenge) => sauver({ ...d, isActive: !d.isActive });

  if (edition) return <FormulaireDefi depart={edition === 'nouveau' ? null : edition} badges={badges} surSauver={sauver} surAnnuler={() => setEdition(null)} />;
  if (!liste) return <ActivityIndicator color={couleurs.ambre} />;
  return (
    <View style={{ gap: 10 }}>
      <View style={s.ligneSimple}>
        <Text style={s.discret}>{liste.length} défi(s)</Text>
        <Pressable style={s.petitBouton} onPress={() => setEdition('nouveau')}><Text style={s.boutonTexte}>+ Nouveau défi</Text></Pressable>
      </View>
      {liste.map(d => (
        <View key={d.id} style={s.carte}>
          <View style={s.ligneSimple}>
            <Text style={s.nom} numberOfLines={1}>{d.badgeRewardIcon || '🏆'} {d.title}</Text>
            <Text style={d.isActive ? s.ok : s.discret}>{d.isActive ? 'Actif' : 'Inactif'}</Text>
          </View>
          <Text style={s.texte}>{d.description}</Text>
          <Text style={s.discret}>{d.targetCount} × {TYPES_DEFI.find(t => t[0] === d.challengeType)?.[1] || d.challengeType} · thème {d.theme || 'tous'} · +{d.xpReward} XP · {d.startDate?.slice(0, 10)} → {d.endDate?.slice(0, 10)}</Text>
          <View style={s.ligneSimple}>
            <Pressable onPress={() => basculer(d)}><Text style={s.lien}>{d.isActive ? 'Désactiver' : 'Activer'}</Text></Pressable>
            <Pressable onPress={() => setEdition(d)}><Text style={s.lien}>Modifier</Text></Pressable>
            <Pressable onPress={() => confirmer('Supprimer ce défi ?', d.title, async () => { await supprimerDefi(d.id).catch(e => avertir('Suppression impossible', e.message)); charger(); })}><Text style={s.danger}>Supprimer</Text></Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

function FormulaireDefi({ depart, badges, surSauver, surAnnuler }: {
  depart: WeeklyChallenge | null; badges: Badge[]; surSauver: (d: WeeklyChallenge) => void; surAnnuler: () => void;
}) {
  const [titre, setTitre] = useState(depart?.title || '');
  const [description, setDescription] = useState(depart?.description || '');
  const [theme, setTheme] = useState(depart?.theme || '');
  const [cible, setCible] = useState(String(depart?.targetCount ?? 5));
  const [type, setType] = useState<WeeklyChallenge['challengeType']>(depart?.challengeType || 'contributions');
  const [xp, setXp] = useState(String(depart?.xpReward ?? 50));
  const [badgeId, setBadgeId] = useState(depart?.badgeRewardId || '');
  const [debut, setDebut] = useState(depart?.startDate?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [fin, setFin] = useState(depart?.endDate?.slice(0, 10) || new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10));
  const [erreur, setErreur] = useState<string | null>(null);

  const valider = () => {
    if (!titre.trim()) return setErreur('Le titre est obligatoire.');
    if (entier(cible) < 1) return setErreur('L’objectif doit être d’au moins 1.');
    if (!dateValide(debut) || !dateValide(fin)) return setErreur('Dates au format AAAA-MM-JJ.');
    if (fin < debut) return setErreur('La fin précède le début.');
    const b = badges.find(x => x.id === badgeId);
    const base = { title: titre.trim(), description: description.trim(), theme: theme.trim(), targetCount: entier(cible), challengeType: type, xpReward: entier(xp), badgeRewardId: b?.id || '', badgeRewardName: b?.title || '', badgeRewardIcon: b?.icon || '🏆' };
    surSauver(depart ? { ...depart, ...base, startDate: debut, endDate: fin } : nouveauDefi({ ...base, debut, fin }));
  };

  return (
    <View style={s.carte}>
      <Text style={s.titre}>{depart ? 'Modifier le défi' : 'Nouveau défi'}</Text>
      <TextInput style={s.champ} placeholder="Titre" placeholderTextColor={couleurs.discret} value={titre} onChangeText={setTitre} />
      <TextInput style={s.champ} placeholder="Description" placeholderTextColor={couleurs.discret} value={description} onChangeText={setDescription} multiline />
      <TextInput style={s.champ} placeholder="Thème (identifiant, vide = tous)" placeholderTextColor={couleurs.discret} value={theme} onChangeText={setTheme} autoCapitalize="none" />
      <View style={s.ligne2}>
        <TextInput style={[s.champ, { flex: 1 }]} placeholder="Objectif" placeholderTextColor={couleurs.discret} value={cible} onChangeText={setCible} keyboardType="number-pad" />
        <TextInput style={[s.champ, { flex: 1 }]} placeholder="XP" placeholderTextColor={couleurs.discret} value={xp} onChangeText={setXp} keyboardType="number-pad" />
      </View>
      <View style={s.ligne2}>
        <TextInput style={[s.champ, { flex: 1 }]} placeholder="Début AAAA-MM-JJ" placeholderTextColor={couleurs.discret} value={debut} onChangeText={setDebut} autoCapitalize="none" />
        <TextInput style={[s.champ, { flex: 1 }]} placeholder="Fin AAAA-MM-JJ" placeholderTextColor={couleurs.discret} value={fin} onChangeText={setFin} autoCapitalize="none" />
      </View>
      <Text style={s.etiquette}>Type d’action comptée</Text>
      <View style={s.pile}>
        {TYPES_DEFI.map(([v, nom]) => (
          <Pressable key={v} onPress={() => setType(v)} style={[s.puce, type === v && s.puceActive]}><Text style={[s.puceTexte, type === v && s.puceTexteActif]}>{nom}</Text></Pressable>
        ))}
      </View>
      <Text style={s.etiquette}>Badge offert</Text>
      <View style={s.pile}>
        <Pressable onPress={() => setBadgeId('')} style={[s.puce, !badgeId && s.puceActive]}><Text style={[s.puceTexte, !badgeId && s.puceTexteActif]}>Aucun</Text></Pressable>
        {badges.map(b => (
          <Pressable key={b.id} onPress={() => setBadgeId(b.id)} style={[s.puce, badgeId === b.id && s.puceActive]}><Text style={[s.puceTexte, badgeId === b.id && s.puceTexteActif]}>{b.icon} {b.title}</Text></Pressable>
        ))}
      </View>
      {erreur && <Text style={s.danger}>{erreur}</Text>}
      <Pressable style={s.bouton} onPress={valider}><Text style={s.boutonTexte}>Enregistrer</Text></Pressable>
      <Pressable onPress={surAnnuler}><Text style={[s.lien, { textAlign: 'center' }]}>Annuler</Text></Pressable>
    </View>
  );
}

// ---------------------------------------------------------------- Badges

function Badges() {
  const [liste, setListe] = useState<Badge[] | null>(null);
  const [edition, setEdition] = useState<Badge | 'nouveau' | null>(null);
  const charger = useCallback(() => chargerBadges().then(setListe).catch(e => avertir('Badges indisponibles', (e as Error).message)), []);
  useEffect(() => { charger(); }, [charger]);

  const sauver = async (b: Badge) => {
    try { await enregistrerBadge(b); setEdition(null); charger(); }
    catch (e) { avertir('Enregistrement impossible', (e as Error).message); }
  };

  if (edition) return <FormulaireBadge depart={edition === 'nouveau' ? null : edition} surSauver={sauver} surAnnuler={() => setEdition(null)} />;
  if (!liste) return <ActivityIndicator color={couleurs.ambre} />;
  return (
    <View style={{ gap: 10 }}>
      <View style={s.ligneSimple}>
        <Text style={s.discret}>{liste.length} badge(s)</Text>
        <Pressable style={s.petitBouton} onPress={() => setEdition('nouveau')}><Text style={s.boutonTexte}>+ Nouveau badge</Text></Pressable>
      </View>
      {liste.map(b => (
        <View key={b.id} style={s.carte}>
          <Text style={s.nom}>{b.icon} {b.title}</Text>
          <Text style={s.texte}>{b.description}</Text>
          <Text style={s.discret}>{CATEGORIES_BADGE.find(c => c[0] === b.category)?.[1] || b.category} · {conditionBadge(b)}</Text>
          <View style={s.ligneSimple}>
            <Pressable onPress={() => setEdition(b)}><Text style={s.lien}>Renommer / modifier</Text></Pressable>
            {b.isCustom && <Pressable onPress={() => confirmer('Supprimer ce badge ?', b.title, async () => { await supprimerBadge(b.id).catch(e => avertir('Suppression impossible', e.message)); charger(); })}><Text style={s.danger}>Supprimer</Text></Pressable>}
          </View>
        </View>
      ))}
    </View>
  );
}

function FormulaireBadge({ depart, surSauver, surAnnuler }: { depart: Badge | null; surSauver: (b: Badge) => void; surAnnuler: () => void }) {
  const [titre, setTitre] = useState(depart?.title || '');
  const [description, setDescription] = useState(depart?.description || '');
  const [icone, setIcone] = useState(depart?.icon || '🏅');
  const [categorie, setCategorie] = useState<string>(depart?.category || 'defi');
  const [xp, setXp] = useState(String(depart?.requiredXp ?? ''));
  const [contribs, setContribs] = useState(String(depart?.requiredContributions ?? ''));
  const [voix, setVoix] = useState(String(depart?.requiredRecordings ?? ''));
  const [valids, setValids] = useState(String(depart?.requiredValidations ?? ''));

  const valider = () => {
    if (!titre.trim()) return;
    const seuils = {
      requiredXp: entier(xp) || undefined, requiredContributions: entier(contribs) || undefined,
      requiredRecordings: entier(voix) || undefined, requiredValidations: entier(valids) || undefined,
    };
    const base = { title: titre.trim(), description: description.trim(), icon: icone.trim() || '🏅', category: categorie, ...seuils };
    surSauver(depart ? { ...depart, ...base } : nouveauBadge(base));
  };

  return (
    <View style={s.carte}>
      <Text style={s.titre}>{depart ? 'Modifier le badge' : 'Nouveau badge'}</Text>
      <TextInput style={s.champ} placeholder="Dénomination" placeholderTextColor={couleurs.discret} value={titre} onChangeText={setTitre} />
      <TextInput style={s.champ} placeholder="Description" placeholderTextColor={couleurs.discret} value={description} onChangeText={setDescription} multiline />
      <TextInput style={s.champ} placeholder="Icône (un emoji)" placeholderTextColor={couleurs.discret} value={icone} onChangeText={setIcone} />
      <View style={s.pile}>
        {CATEGORIES_BADGE.map(([v, nom]) => (
          <Pressable key={v} onPress={() => setCategorie(v)} style={[s.puce, categorie === v && s.puceActive]}><Text style={[s.puceTexte, categorie === v && s.puceTexteActif]}>{nom}</Text></Pressable>
        ))}
      </View>
      <Text style={s.etiquette}>Conditions (vide = non requis)</Text>
      <View style={s.ligne2}>
        <TextInput style={[s.champ, { flex: 1 }]} placeholder="XP" placeholderTextColor={couleurs.discret} value={xp} onChangeText={setXp} keyboardType="number-pad" />
        <TextInput style={[s.champ, { flex: 1 }]} placeholder="Contributions" placeholderTextColor={couleurs.discret} value={contribs} onChangeText={setContribs} keyboardType="number-pad" />
      </View>
      <View style={s.ligne2}>
        <TextInput style={[s.champ, { flex: 1 }]} placeholder="Voix" placeholderTextColor={couleurs.discret} value={voix} onChangeText={setVoix} keyboardType="number-pad" />
        <TextInput style={[s.champ, { flex: 1 }]} placeholder="Validations" placeholderTextColor={couleurs.discret} value={valids} onChangeText={setValids} keyboardType="number-pad" />
      </View>
      <Pressable style={[s.bouton, !titre.trim() && { opacity: 0.5 }]} onPress={valider} disabled={!titre.trim()}><Text style={s.boutonTexte}>Enregistrer</Text></Pressable>
      <Pressable onPress={surAnnuler}><Text style={[s.lien, { textAlign: 'center' }]}>Annuler</Text></Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  titre: { color: couleurs.texteClair, fontSize: 15, fontWeight: '800' },
  nom: { color: couleurs.texteClair, fontSize: 15, fontWeight: '700', flex: 1 },
  texte: { color: couleurs.texte, fontSize: 14 },
  discret: { color: couleurs.discret, fontSize: 12 },
  etiquette: { color: couleurs.texte, fontSize: 12, fontWeight: '700' },
  ligneSimple: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ligne2: { flexDirection: 'row', gap: 8 },
  pile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  champ: { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, padding: 12, fontSize: 14 },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  petitBouton: { backgroundColor: couleurs.terre, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1 },
  puceActive: { backgroundColor: couleurs.terre, borderColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  puceTexteActif: { color: '#fff', fontWeight: '700' },
  lien: { color: couleurs.ambre, fontSize: 13, fontWeight: '700' },
  danger: { color: '#fca5a5', fontSize: 13, fontWeight: '700' },
  ok: { color: '#86efac', fontSize: 12, fontWeight: '700' },
});
