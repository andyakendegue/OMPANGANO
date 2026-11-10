import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import {
  chargerFileModeration, chargerUtilisateurs, chargerUtilisateursPage, chargerSegments, chargerStatsContributions, formaterHeures, MYENE_TRIBES, TRANCHES_AGE, tribuDuDialecte, estAdmin, evaluerContribution, LIBELLE_COMPTE, LIBELLE_ROLE,
  LIBELLE_STATUT, modifierUtilisateur, resoudreMedia,
  type AccountStatus, type Contribution, type FileModeration, type PageUtilisateurs, type StatsContributions, type SegmentsCommunaute, type UserProfile, type UserRole,
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
      <StatsContribs />
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

// ---------------------------------------------------------------- Modération : Studio de Relecture & Validation des Aînés
// (mêmes textes, mêmes filtres et mêmes règles de décision que ValidatorWorkspace du site web)

function Ecoute({ valeur, duree }: { valeur: string; duree?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [joue, setJoue] = useState(false);
  const player = useAudioPlayer(url ? { uri: url } : null);
  const lire = async () => {
    try {
      if (!url) { setUrl(await resoudreMedia(valeur)); return; }
      if (player.playing) { player.pause(); setJoue(false); } else { player.seekTo(0); player.play(); setJoue(true); }
    } catch { setErr(true); }
  };
  useEffect(() => { if (url) { player.play(); setJoue(true); } }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Pressable onPress={lire} style={s.ecoute}>
      <Text style={s.boutonTexte}>{err ? 'Lecture impossible' : joue ? '⏸ Mettre en pause' : '▶ Écouter la voix'}{duree ? `   ${Math.round(duree)} sec` : ''}</Text>
    </Pressable>
  );
}

function CarteModeration({ c, surFait }: { c: Contribution; surFait: () => void }) {
  const aVoix = !!c.audioUrl;
  const [ortho, setOrtho] = useState<VerdictOrthographe>(c.isSpellingCorrect === false ? 'incorrect' : 'correct');
  const [prono, setProno] = useState<VerdictPrononciation>(aVoix ? 'correct' : 'no_audio');
  const [notes, setNotes] = useState('');
  const [occupe, setOccupe] = useState(false);

  const verdict =
    ortho === 'correct' && (prono === 'correct' || prono === 'no_audio') ? { t: '✨ Prêt à valider : Tout est correct', c: '#34d399' }
    : ortho === 'incorrect' && prono === 'correct' ? { t: '🎙️ Nuance : Prononciation retenue • Orthographe à corriger', c: '#fcd34d' }
    : ortho === 'correct' && prono === 'incorrect' ? { t: '✍️ Nuance : Écrit validé • Prononciation à réenregistrer', c: '#7dd3fc' }
    : { t: '❌ À rejeter : Écrit et prononciation non conformes', c: '#fb7185' };

  const valider = async () => {
    setOccupe(true);
    try { await evaluerContribution(c.id, ortho, prono, notes.trim()); surFait(); }
    catch (e) { alerte('Évaluation impossible', (e as Error).message); setOccupe(false); }
  };

  return (
    <View style={s.carte}>
      <Text style={s.discret}>Expression Française :</Text>
      <Text style={s.texteClair}>« {c.frenchText} »</Text>
      <Text style={s.texte}>Texte initial Myènè : <Text style={{ fontWeight: '800', color: couleurs.ambre }}>{c.originalMyeneText}</Text></Text>
      <Text style={s.nom}>{c.userDisplayName}</Text>
      <Text style={s.discret}>{c.userTribe ? `Ethnie ${c.userTribe}` : 'Ethnie non renseignée'} • {new Date(c.createdAt).toLocaleDateString()}</Text>

      <View style={s.colonne}>
        <View style={s.ligneSimple}>
          <Text style={s.etiquette}>1. Évaluation de l'Écrit & du Sens</Text>
          <Text style={[s.pastille, { color: ortho === 'correct' ? '#34d399' : '#fb7185' }]}>{ortho === 'correct' ? 'Écrit Valide ✅' : 'Écrit Incorrect ❌'}</Text>
        </View>
        <Text style={s.discret}>Proposition orthographique Myènè :</Text>
        <Text style={s.myene}>{c.proposedSpelling || c.originalMyeneText}</Text>
        {!!c.dialectVariant && <Text style={s.discret}>Variante dialectale signalée : {tribuDuDialecte(c.dialectVariant)}</Text>}
        {(!!c.proposedFrenchMeaning || !!c.secondaryMeaning) && (
          <View style={{ gap: 2 }}>
            <Text style={s.alerteOr}>💡 Précision sur la signification en français ({c.frenchMeaningType === 'autre_tournure' ? 'Autre tournure' : c.frenchMeaningType === 'sens_secondaire' ? 'Sens secondaire' : 'Signification corrigée'})</Text>
            {!!c.proposedFrenchMeaning && <Text style={s.texte}>Sens / Tournure : « {c.proposedFrenchMeaning} »</Text>}
            {!!c.secondaryMeaning && <Text style={s.texte}>Sens secondaire / figuré : « {c.secondaryMeaning} »</Text>}
          </View>
        )}
        {!!c.comment && <Text style={s.discret}>« {c.comment} »</Text>}
        <Choix valeurs={[['correct', "L'écrit est bon"], ['incorrect', 'Mal écrit / Faute']]} actif={ortho} onChoix={v => setOrtho(v as VerdictOrthographe)} />
      </View>

      <View style={s.colonne}>
        <View style={s.ligneSimple}>
          <Text style={s.etiquette}>2. Évaluation de l'Oral</Text>
          <Text style={[s.pastille, { color: !aVoix ? '#a8a29e' : prono === 'correct' ? '#34d399' : '#fb7185' }]}>
            {!aVoix ? 'Sans Audio' : prono === 'correct' ? 'Prononciation Bonne 🎙️' : 'Mauvaise Prononciation ❌'}
          </Text>
        </View>
        {aVoix ? (
          <>
            <Ecoute valeur={c.audioUrl!} duree={c.audioDuration} />
            <Choix valeurs={[['correct', 'Prononciation bonne'], ['incorrect', 'À réenregistrer']]} actif={prono} onChoix={v => setProno(v as VerdictPrononciation)} />
          </>
        ) : <Text style={s.discret}>Aucun enregistrement vocal joint à cette proposition.</Text>}
      </View>

      <Text style={[s.verdict, { color: verdict.c, borderColor: verdict.c }]}>{verdict.t}</Text>
      <Text style={s.etiquette}>Remarque bienveillante du validateur à l'attention du contributeur (optionnel) :</Text>
      <TextInput style={s.champ} value={notes} onChangeText={setNotes} multiline
        placeholder="Ex: La voyelle finale doit être allongée / Attention au ton descendant sur l'avant-dernière syllabe..." placeholderTextColor={couleurs.discret} />
      <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} onPress={valider} disabled={occupe}>
        {occupe ? <ActivityIndicator color="#fff" /> : <Text style={s.boutonTexte}>Enregistrer la décision du Validateur</Text>}
      </Pressable>
      {occupe && <Text style={s.discret}>Validation en cours...</Text>}
    </View>
  );
}

type FiltreStatut = 'pending' | 'approved' | 'audio_approved_text_revision' | 'text_approved_audio_revision' | 'all';

export function Moderation() {
  const { profil } = useAuth();
  const [filtre, setFiltre] = useState<FiltreStatut>('pending');
  const [tribu, setTribu] = useState('all');
  const [q, setQ] = useState('');
  const [file, setFile] = useState<FileModeration | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const charger = useCallback(async (f: FiltreStatut) => {
    setFile(null);
    try { setFile(await chargerFileModeration(f, 30)); setErreur(null); }
    catch (e) { setErreur((e as Error).message); }
  }, []);
  useEffect(() => { charger(filtre); }, [charger, filtre]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (file?.records || []).filter(c =>
      c.userId !== profil?.id &&
      (tribu === 'all' || tribuDuDialecte(c.userTribe) === tribu || tribuDuDialecte(c.dialectVariant) === tribu) &&
      (!t || `${c.frenchText} ${c.originalMyeneText} ${c.proposedSpelling} ${c.proposedFrenchMeaning} ${c.secondaryMeaning} ${c.userDisplayName} ${c.userTribe}`.toLowerCase().includes(t)));
  }, [file, q, tribu, profil?.id]);

  const n = (st: string) => (file?.counts as Record<string, number> | undefined)?.[st] || 0;
  const total = Object.values(file?.counts || {}).reduce((a, b) => a + (b || 0), 0);

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.discret}>Studio de Relecture & Validation des Aînés</Text>
      <Text style={s.titre}>Validation Linguistique Myènè</Text>
      <Text style={s.texte}>Évaluez avec nuance la justesse de l'écrit, du sens français et l'authenticité de la prononciation orale.</Text>
      <Text style={s.titre}>En Attente d'Examen  {n('pending')}</Text>
      <View style={s.carte}>
        <Text style={s.etiquette}>Règle de validation nuancée (Oral vs Écrit) :</Text>
        <Text style={s.texte}>🎙️ Cas 1 : Prononciation bonne, mais mal écrit L'enregistrement audio est clair et juste, mais la graphie comporte une faute. La voix est validée et archivée, tandis que l'écrit est renvoyé en révision.</Text>
        <Text style={s.texte}>✍️ Cas 2 : Écrit bon, mais mauvaise prononciation L'orthographe et la variante sont impeccables, mais le ton, l'intonation ou la qualité sonore est à refaire. Le texte est validé et la voix est demandée à réenregistrer.</Text>
      </View>

      <View style={s.pile}>
        {([['pending', `À Examiner  ${n('pending')}`], ['approved', `100% Validés (Oral + Écrit)  ${n('approved')}`],
          ['audio_approved_text_revision', `🎙️ Voix Bonne (Écrit à corriger)  ${n('audio_approved_text_revision')}`],
          ['text_approved_audio_revision', `✍️ Écrit Bon (Voix à refaire)  ${n('text_approved_audio_revision')}`]] as const).map(([id, nom]) => (
          <Pressable key={id} onPress={() => setFiltre(id)} style={[s.tuile, filtre === id && s.tuileActive]}><Text style={[s.puceTexte, filtre === id && { color: '#fff' }]}>{nom}</Text></Pressable>
        ))}
      </View>

      <TextInput style={s.champ} value={q} onChangeText={setQ} autoCapitalize="none" placeholder="Rechercher par expression française, mot Myènè, sens proposé, locuteur..." placeholderTextColor={couleurs.discret} />
      <View style={s.pile}>
        <Pressable onPress={() => setTribu('all')} style={[s.puce, tribu === 'all' && s.puceActive]}><Text style={[s.puceTexte, tribu === 'all' && s.puceTexteActif]}>Toutes les Ethnies Myènè</Text></Pressable>
        {['Enenga', 'Mpongwè', 'Galoa', 'Nkomi', 'Ôrungu', 'Adyumba'].map(t => (
          <Pressable key={t} onPress={() => setTribu(t)} style={[s.puce, tribu === t && s.puceActive]}><Text style={[s.puceTexte, tribu === t && s.puceTexteActif]}>Ethnie {t}</Text></Pressable>
        ))}
        <Pressable onPress={() => setFiltre('all')} style={[s.puce, filtre === 'all' && s.puceActive]}><Text style={[s.puceTexte, filtre === 'all' && s.puceTexteActif]}>Toutes ({total})</Text></Pressable>
      </View>

      {erreur && <Text style={s.erreur}>Indisponible : {erreur}</Text>}
      {!file && !erreur && <ActivityIndicator color={couleurs.ambre} />}
      {file && visibles.length === 0 && (
        <View style={s.carte}>
          <Text style={s.titre}>Aucune contribution en attente</Text>
          <Text style={s.texte}>Toutes les réponses de ce filtre ont été traitées ou aucun résultat ne correspond à la recherche.</Text>
        </View>
      )}
      {visibles.map(c => (
        <CarteModeration key={c.id} c={c} surFait={() => setFile(f => f && { ...f, records: f.records.filter(x => x.id !== c.id), counts: { ...f.counts, pending: Math.max(0, (f.counts.pending || 0) - 1) } })} />
      ))}
    </View>
  );
}

function StatsContribs() {
  const [st, setSt] = useState<StatsContributions | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => { chargerStatsContributions().then(setSt).catch(e => setErreur((e as Error).message)); }, []);
  if (erreur) return <Text style={s.erreur}>Statistiques indisponibles : {erreur}</Text>;
  if (!st) return <ActivityIndicator color={couleurs.ambre} />;
  const nomE = (e: string) => (e === 'inconnue' ? 'Autre / non renseignée' : e);
  const lignes = (m: Record<string, { contributions: number; heures: number; contributeurs: number }>) =>
    Object.entries(m).sort((a, b) => b[1].contributions - a[1].contributions);
  return (
    <View style={{ gap: 12 }}>
      <View style={s.grille}>
        <Stat n={st.enregistrements} t="Enregistrements" />
        <View style={s.stat}><Text style={[s.statValeur, { color: couleurs.ambre }]}>{formaterHeures(st.heures)}</Text><Text style={s.discret}>Heures enregistrées</Text></View>
        <Stat n={st.contributeurs} t="Contributeurs" />
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>Questions couvertes</Text>
        <Text style={s.texte}>{st.questions.avecContribution} sur {st.questions.total} ont au moins une contribution ; {st.questions.avecContributionApprouvee} en ont une validée.</Text>
        <Text style={s.discret}>Contributions : {st.periode.aujourdhui} aujourd’hui · {st.periode.septJours} sur 7 jours · {st.periode.trenteJours} sur 30 jours · {formaterHeures(st.heuresApprouvees)} d’audio validé</Text>
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>Par ethnie</Text>
        {lignes(st.parEthnie).map(([k, g]) => (
          <View key={k} style={s.ligneSimple}><Text style={s.texte}>{nomE(k)}</Text><Text style={s.discret}>{g.contributions} contrib. · {formaterHeures(g.heures)} · {g.contributeurs} pers.</Text></View>
        ))}
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>Par thème</Text>
        {lignes(st.parTheme).map(([k, g]) => (
          <View key={k} style={s.ligneSimple}><Text style={s.texte} numberOfLines={1}>{k}</Text><Text style={s.discret}>{g.contributions} contrib. · {formaterHeures(g.heures)}</Text></View>
        ))}
      </View>
      <View style={s.carte}>
        <Text style={s.titre}>Meilleurs contributeurs</Text>
        {st.topContributeurs.map((u, i) => (
          <View key={i} style={s.ligneSimple}><Text style={s.texte} numberOfLines={1}>{i + 1}. {u.nom}</Text><Text style={s.discret}>{u.contributions} · {formaterHeures(u.heures)}</Text></View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- Communauté (utilisateurs)

export function Utilisateurs() {
  const { profil } = useAuth();
  const [donnees, setDonnees] = useState<PageUtilisateurs | null>(null);
  const [segments, setSegments] = useState<SegmentsCommunaute | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [qEnvoye, setQEnvoye] = useState('');
  const [ethnie, setEthnie] = useState('');
  const [age, setAge] = useState('');
  const [page, setPage] = useState(1);
  const [ouvert, setOuvert] = useState<string | null>(null);

  // Recherche différée : une requête seulement quand la frappe s'arrête.
  useEffect(() => { const t = setTimeout(() => { setQEnvoye(q.trim()); setPage(1); }, 400); return () => clearTimeout(t); }, [q]);
  useEffect(() => { chargerSegments().then(setSegments).catch(() => {}); }, []);
  useEffect(() => {
    let actuel = true;
    setErreur(null);
    chargerUtilisateursPage({ page, limit: 20, q: qEnvoye, ethnie, age })
      .then(d => { if (actuel) setDonnees(d); })
      .catch(e => { if (actuel) setErreur((e as Error).message); });
    return () => { actuel = false; };
  }, [page, qEnvoye, ethnie, age]);

  const changer = async (u: UserProfile, patch: { role?: UserRole; status?: AccountStatus }) => {
    try {
      const maj = await modifierUtilisateur(u.id, patch);
      setDonnees(d => d && { ...d, items: d.items.map(x => (x.id === u.id ? { ...x, ...maj } : x)) });
    } catch (e) { alerte('Modification impossible', (e as Error).message); }
  };
  const filtrer = (f: () => void) => { f(); setPage(1); };

  if (erreur && !donnees) return <Text style={s.erreur}>Indisponible : {erreur}</Text>;
  if (!donnees) return <ActivityIndicator color={couleurs.ambre} />;
  const admin = estAdmin(profil?.role);
  const nb = (m: Record<string, number> | undefined, k: string) => (m ? m[k] || 0 : 0);
  return (
    <View style={{ gap: 10 }}>
      <TextInput style={s.champ} placeholder={`Chercher parmi ${segments?.total ?? donnees.total} utilisateurs`} placeholderTextColor={couleurs.discret} value={q} onChangeText={setQ} autoCapitalize="none" />
      <Text style={s.etiquette}>Ethnie</Text>
      <View style={s.pile}>
        {[['', 'Toutes'], ...MYENE_TRIBES.map(t => [t, t]), ['inconnue', 'Autre / non renseignée']].map(([v, nom]) => (
          <Pressable key={v || 'toutes'} onPress={() => filtrer(() => setEthnie(v))} style={[s.puce, ethnie === v && s.puceActive]}>
            <Text style={[s.puceTexte, ethnie === v && s.puceTexteActif]}>{nom}{v && segments ? ` (${nb(segments.parEthnie, v)})` : ''}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.etiquette}>Tranche d’âge</Text>
      <View style={s.pile}>
        {[['', 'Tous âges'], ...TRANCHES_AGE].map(([v, nom]) => (
          <Pressable key={v || 'tous'} onPress={() => filtrer(() => setAge(v))} style={[s.puce, age === v && s.puceActive]}>
            <Text style={[s.puceTexte, age === v && s.puceTexteActif]}>{nom}{v && segments ? ` (${nb(segments.parAge, v)})` : ''}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.discret}>{donnees.total.toLocaleString('fr-FR')} utilisateur(s) correspondant(s)</Text>
      {donnees.items.map(u => (
        <View key={u.id} style={s.carte}>
          <Pressable onPress={() => setOuvert(ouvert === u.id ? null : u.id)} style={s.ligneSimple}>
            <View style={{ flex: 1 }}>
              <Text style={s.nom} numberOfLines={1}>{u.fullName || u.displayName}</Text>
              <Text style={s.discret} numberOfLines={1}>{u.email} · {u.tribe || 'Autre'} · {LIBELLE_ROLE[u.role]} · {LIBELLE_COMPTE[u.status]} · {u.xp} XP</Text>
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
      {donnees.items.length === 0 && <Text style={s.discret}>Aucun utilisateur ne correspond à ces critères.</Text>}
      {donnees.pages > 1 && (
        <View style={s.ligneSimple}>
          <Pressable disabled={donnees.page <= 1} onPress={() => setPage(donnees.page - 1)}><Text style={[s.lien, donnees.page <= 1 && { opacity: 0.3 }]}>‹ Précédent</Text></Pressable>
          <Text style={s.discret}>Page {donnees.page} / {donnees.pages}</Text>
          <Pressable disabled={donnees.page >= donnees.pages} onPress={() => setPage(donnees.page + 1)}><Text style={[s.lien, donnees.page >= donnees.pages && { opacity: 0.3 }]}>Suivant ›</Text></Pressable>
        </View>
      )}
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
  colonne: { backgroundColor: couleurs.fond, borderRadius: 12, padding: 10, gap: 6 },
  pastille: { fontSize: 11, fontWeight: '800' },
  alerteOr: { color: '#fcd34d', fontSize: 12, fontWeight: '700' },
  verdict: { fontSize: 12, fontWeight: '800', borderWidth: 1, borderRadius: 10, padding: 8 },
  pile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tuile: { padding: 10, borderRadius: 12, backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1 },
  tuileActive: { backgroundColor: '#047857', borderColor: '#10b981' },
  puceTexteActif: { color: '#fff', fontWeight: '700' },
  lien: { color: couleurs.ambre, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  erreur: { color: '#fca5a5', fontSize: 13 },
});
