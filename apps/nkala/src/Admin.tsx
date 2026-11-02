import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import {
  chargerFileModeration, chargerUtilisateurs, estAdmin, evaluerContribution, LIBELLE_COMPTE, LIBELLE_ROLE,
  LIBELLE_STATUT, modifierUtilisateur, resoudreMedia,
  type AccountStatus, type Contribution, type FileModeration, type UserProfile, type UserRole,
  type VerdictOrthographe, type VerdictPrononciation,
} from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { couleurs } from './theme';

const alerte = (titre: string, msg: string) => (Platform.OS === 'web' ? (globalThis as any).alert?.(`${titre}\n${msg}`) : Alert.alert(titre, msg));

// ---------------------------------------------------------------- Pilotage

export function Pilotage() {
  const [file, setFile] = useState<FileModeration | null>(null);
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([chargerFileModeration('pending', 1), chargerUtilisateurs()])
      .then(([f, u]) => { setFile(f); setUsers(u); })
      .catch(e => setErreur((e as Error).message));
  }, []);
  if (erreur) return <Text style={s.erreur}>Indisponible : {erreur}</Text>;
  if (!file || !users) return <ActivityIndicator color={couleurs.ambre} />;
  const c = file.counts;
  const total = Object.values(c).reduce((a, b) => a + (b || 0), 0);
  const parRole = (r: UserRole) => users.filter(u => u.role === r).length;
  return (
    <View style={{ gap: 12 }}>
      <View style={s.grille}>
        <Stat n={users.length} t="Utilisateurs" />
        <Stat n={total} t="Contributions" />
        <Stat n={c.pending || 0} t="À modérer" accent />
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>Contributions par statut</Text>
        {Object.entries(LIBELLE_STATUT).map(([k, nom]) => (
          <View key={k} style={s.ligneSimple}><Text style={s.texte}>{nom}</Text><Text style={s.valeur}>{(c as any)[k] || 0}</Text></View>
        ))}
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>Communauté</Text>
        <View style={s.ligneSimple}><Text style={s.texte}>Administrateurs</Text><Text style={s.valeur}>{parRole('admin')}</Text></View>
        <View style={s.ligneSimple}><Text style={s.texte}>Validateurs</Text><Text style={s.valeur}>{parRole('validator')}</Text></View>
        <View style={s.ligneSimple}><Text style={s.texte}>Comptes suspendus</Text><Text style={s.valeur}>{users.filter(u => u.status === 'suspended').length}</Text></View>
        <View style={s.ligneSimple}><Text style={s.texte}>Comptes signalés</Text><Text style={s.valeur}>{users.filter(u => u.status === 'flagged').length}</Text></View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- Modération (validation vocale)

function Ecoute({ valeur }: { valeur: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const player = useAudioPlayer(url ? { uri: url } : null);
  const lire = async () => {
    try {
      if (!url) { setUrl(await resoudreMedia(valeur)); return; }
      player.seekTo(0); player.play();
    } catch { setErr(true); }
  };
  // Après la résolution de l'adresse, la lecture démarre.
  useEffect(() => { if (url) { player.play(); } }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Pressable onPress={lire} style={s.ecoute}>
      <Text style={s.boutonTexte}>{err ? 'Lecture impossible' : '▶ Écouter l’enregistrement'}</Text>
    </Pressable>
  );
}

function CarteModeration({ c, surFait }: { c: Contribution; surFait: () => void }) {
  const [ortho, setOrtho] = useState<VerdictOrthographe>('correct');
  const [prono, setProno] = useState<VerdictPrononciation>(c.audioUrl ? 'correct' : 'no_audio');
  const [notes, setNotes] = useState('');
  const [occupe, setOccupe] = useState(false);

  const valider = async () => {
    setOccupe(true);
    try { await evaluerContribution(c.id, ortho, prono, notes.trim()); surFait(); }
    catch (e) { alerte('Évaluation impossible', (e as Error).message); setOccupe(false); }
  };

  return (
    <View style={s.carte}>
      <Text style={s.discret}>{c.userDisplayName} · {c.dialectVariant || c.userTribe || ''} · {(c.createdAt || '').slice(0, 10)}</Text>
      <Text style={s.myene}>{c.originalMyeneText}</Text>
      {!!c.proposedSpelling && c.proposedSpelling !== c.originalMyeneText && <Text style={s.texte}>Orthographe proposée : {c.proposedSpelling}</Text>}
      <Text style={s.texteClair}>{c.frenchText}</Text>
      {!!c.comment && <Text style={s.discret}>« {c.comment} »</Text>}
      {!c.isSpellingCorrect && <Text style={s.discret}>Le contributeur juge l’orthographe incorrecte.</Text>}

      {c.audioUrl && <Ecoute valeur={c.audioUrl} />}

      <Text style={s.etiquette}>Orthographe</Text>
      <Choix valeurs={[['correct', 'Correcte'], ['incorrect', 'Incorrecte']]} actif={ortho} onChoix={v => setOrtho(v as VerdictOrthographe)} />
      <Text style={s.etiquette}>Prononciation</Text>
      <Choix
        valeurs={c.audioUrl ? [['correct', 'Correcte'], ['incorrect', 'Incorrecte']] : [['no_audio', 'Pas d’audio']]}
        actif={prono} onChoix={v => setProno(v as VerdictPrononciation)}
      />
      <TextInput style={s.champ} placeholder="Note pour le contributeur (facultatif)" placeholderTextColor={couleurs.discret} value={notes} onChangeText={setNotes} multiline />
      <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} onPress={valider} disabled={occupe}>
        {occupe ? <ActivityIndicator color="#fff" /> : <Text style={s.boutonTexte}>Enregistrer l’évaluation</Text>}
      </Pressable>
    </View>
  );
}

export function Moderation() {
  const [file, setFile] = useState<FileModeration | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const charger = useCallback(async () => {
    try { setFile(await chargerFileModeration('pending', 20)); setErreur(null); }
    catch (e) { setErreur((e as Error).message); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  if (erreur) return <Text style={s.erreur}>Indisponible : {erreur}</Text>;
  if (!file) return <ActivityIndicator color={couleurs.ambre} />;
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.titre}>{file.counts.pending || 0} contribution(s) à évaluer</Text>
      {file.records.length === 0 && <Text style={s.discret}>Rien en attente. Merci !</Text>}
      {file.records.map(c => <CarteModeration key={c.id} c={c} surFait={() => setFile(f => f && { ...f, records: f.records.filter(x => x.id !== c.id), counts: { ...f.counts, pending: Math.max(0, (f.counts.pending || 0) - 1) } })} />)}
      {(file.counts.pending || 0) > file.records.length && (
        <Pressable onPress={charger}><Text style={s.lien}>Charger la suite ({(file.counts.pending || 0) - file.records.length} restantes)</Text></Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- Communauté (utilisateurs)

export function Utilisateurs() {
  const { profil } = useAuth();
  const [liste, setListe] = useState<UserProfile[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => { chargerUtilisateurs().then(setListe).catch(e => setErreur((e as Error).message)); }, []);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (liste || []).filter(u => !t || `${u.fullName} ${u.displayName} ${u.email}`.toLowerCase().includes(t));
  }, [liste, q]);

  const changer = async (u: UserProfile, patch: { role?: UserRole; status?: AccountStatus }) => {
    try {
      const maj = await modifierUtilisateur(u.id, patch);
      setListe(l => l && l.map(x => (x.id === u.id ? { ...x, ...maj } : x)));
    } catch (e) { alerte('Modification impossible', (e as Error).message); }
  };

  if (erreur) return <Text style={s.erreur}>Indisponible : {erreur}</Text>;
  if (!liste) return <ActivityIndicator color={couleurs.ambre} />;
  const admin = estAdmin(profil?.role);
  return (
    <View style={{ gap: 10 }}>
      <TextInput style={s.champ} placeholder={`Chercher parmi ${liste.length} utilisateurs`} placeholderTextColor={couleurs.discret} value={q} onChangeText={setQ} autoCapitalize="none" />
      {visibles.slice(0, 60).map(u => (
        <View key={u.id} style={s.carte}>
          <Pressable onPress={() => setOuvert(ouvert === u.id ? null : u.id)} style={s.ligneSimple}>
            <View style={{ flex: 1 }}>
              <Text style={s.nom} numberOfLines={1}>{u.fullName || u.displayName}</Text>
              <Text style={s.discret} numberOfLines={1}>{u.email} · {LIBELLE_ROLE[u.role]} · {LIBELLE_COMPTE[u.status]} · {u.xp} XP</Text>
            </View>
            <Text style={s.lien}>{ouvert === u.id ? '▲' : '▼'}</Text>
          </Pressable>
          {ouvert === u.id && admin && u.id !== profil?.id && (
            <View style={{ gap: 8, marginTop: 6 }}>
              <Text style={s.etiquette}>Rôle</Text>
              <Choix valeurs={[['user', 'Contributeur'], ['validator', 'Validateur'], ['admin', 'Admin']]} actif={u.role} onChoix={v => changer(u, { role: v as UserRole })} />
              <Text style={s.etiquette}>Compte</Text>
              <Choix valeurs={[['active', 'Actif'], ['flagged', 'Signalé'], ['suspended', 'Suspendu']]} actif={u.status} onChoix={v => changer(u, { status: v as AccountStatus })} />
            </View>
          )}
        </View>
      ))}
      {visibles.length > 60 && <Text style={s.discret}>60 premiers affichés sur {visibles.length} : affinez la recherche.</Text>}
    </View>
  );
}

// ---------------------------------------------------------------- éléments communs

function Choix({ valeurs, actif, onChoix }: { valeurs: [string, string][]; actif: string; onChoix: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {valeurs.map(([v, nom]) => (
        <Pressable key={v} onPress={() => onChoix(v)} style={[s.puce, actif === v && s.puceActive]}>
          <Text style={[s.puceTexte, actif === v && { color: '#fff', fontWeight: '700' }]}>{nom}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const Stat = ({ n, t, accent }: { n: number; t: string; accent?: boolean }) => (
  <View style={s.stat}><Text style={[s.statValeur, accent && { color: couleurs.ambre }]}>{n.toLocaleString('fr-FR')}</Text><Text style={s.discret}>{t}</Text></View>
);

const s = StyleSheet.create({
  grille: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statValeur: { color: couleurs.texteClair, fontSize: 22, fontWeight: '900' },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  titre: { color: couleurs.texteClair, fontSize: 15, fontWeight: '800' },
  nom: { color: couleurs.texteClair, fontSize: 15, fontWeight: '700' },
  texte: { color: couleurs.texte, fontSize: 14 },
  texteClair: { color: couleurs.texteClair, fontSize: 16 },
  myene: { color: couleurs.ambre, fontSize: 20, fontWeight: '800' },
  discret: { color: couleurs.discret, fontSize: 12 },
  etiquette: { color: couleurs.texte, fontSize: 12, fontWeight: '700', marginTop: 4 },
  ligneSimple: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  valeur: { color: couleurs.ambre, fontWeight: '800' },
  champ: { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, padding: 12, fontSize: 14 },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  ecoute: { backgroundColor: '#0d9488', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 14 },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1 },
  puceActive: { backgroundColor: couleurs.terre, borderColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  lien: { color: couleurs.ambre, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  erreur: { color: '#fca5a5', fontSize: 13 },
});
