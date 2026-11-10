import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import {
  chargerDefis, chargerThemes, consentementDonne, construireContribution, dialecteDeLaTribu, MYENE, MYENE_TRIBES, NUANCES_SENS,
  FICHES_DE_SECOURS, tribuDuDialecte, VARIANTES_TRIBALES,
  type QuestionnaireItem, type ThemeDefinition, type WeeklyChallenge,
} from '@nkala/noyau';
import { ajouterAlerte, notifierLocal } from './Alertes';
import { useAuth } from './AuthProvider';
import { catalogue } from './catalogue';
import { Confettis } from './Confettis';
import { useVersionDonnees } from './donnees';
import { prendreFiche } from './evenements';
import { lancerSynchro } from './synchro';
import { Chargement } from './Chargement';
import { useCatalogueEnChargement } from './syncEtat';
import { useEtatSync } from './syncEtat';
import { ConditionsModale } from './Conditions';
import { FaqModale } from './Faq';
import { nombreEnAttente, rejouerFile, soumettre } from './fileAttente';
import { CelebrationDefi } from './Recompenses';
import { couleurs, stylesDyn } from './theme';

const DUREE_MAX = 60; // secondes, comme le site web
const mmss = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
const alerter = (m: string) => (Platform.OS === 'web' ? (globalThis as any).alert?.(m) : Alert.alert('Nkala', m));
const demander = (m: string): Promise<boolean> =>
  Platform.OS === 'web'
    ? Promise.resolve(!!(globalThis as any).confirm?.(m))
    : new Promise(r => Alert.alert('Nkala', m, [{ text: 'Non', style: 'cancel', onPress: () => r(false) }, { text: 'Oui', onPress: () => r(true) }]));

export function Collecte({ onGuide }: { onGuide?: () => void }) {
  const { profil, recharger } = useAuth();
  const routeur = useRouter();
  const [enLigne, setEnLigne] = useState(true);
  const [tribu, setTribu] = useState<string>('all');
  const [defis, setDefis] = useState<WeeklyChallenge[]>([]);
  const [themes, setThemes] = useState<ThemeDefinition[]>([]);
  const [defiId, setDefiId] = useState('');
  const [filtreDefi, setFiltreDefi] = useState(false);
  const [choixDefi, setChoixDefi] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [fiche, setFiche] = useState<QuestionnaireItem | null>(null);
  const [compteurs, setCompteurs] = useState<Record<string, number>>({});
  const enChargement = useCatalogueEnChargement() && Object.keys(compteurs).length === 0;
  const etatSync = useEtatSync();
  const synchro = etatSync.genre === 'telechargement' ? { fait: etatSync.fait, total: etatSync.total } : null;
  const vDonnees = useVersionDonnees();
  const [niveaux, setNiveaux] = useState<number[]>([]);
  const [version, setVersion] = useState(0);
  const [enAttente, setEnAttente] = useState(0);
  const [nbDefiTheme, setNbDefiTheme] = useState(0);
  const [faq, setFaq] = useState(false);
  const [conditions, setConditions] = useState(false);

  // formulaire (étapes 1 à 3 du site web)
  const [orthographe, setOrthographe] = useState<'correct' | 'propose' | null>(null);
  const [proposee, setProposee] = useState('');
  const [variante, setVariante] = useState('orungu');
  const [notes, setNotes] = useState('');
  const [sens, setSens] = useState<'exact' | 'propose'>('exact');
  const [typeSens, setTypeSens] = useState<'correction_sens' | 'autre_tournure' | 'sens_secondaire'>('correction_sens');
  const [sensPropose, setSensPropose] = useState('');
  const [sensSecondaire, setSensSecondaire] = useState('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duree, setDuree] = useState(0);
  const [enregistre, setEnregistre] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const [erreurMicro, setErreurMicro] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [succes, setSucces] = useState(false);
  const [confettis, setConfettis] = useState(false);
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const lecteur = useAudioPlayer(audioUri ? { uri: audioUri } : null);
  const debut = useRef(0);
  const ficheDemandee = useRef<string | null>(prendreFiche());

  const defi = defis.find(d => d.id === defiId) || defis[0];
  const total = Object.values(compteurs).reduce((a, b) => a + b, 0) || FICHES_DE_SECOURS.length;
  const compteTribu = (t: string) => (Object.keys(compteurs).length === 0 ? FICHES_DE_SECOURS.filter(f => tribuDuDialecte(String(f.dialect)) === t).length : 0) + Object.entries(compteurs).filter(([d]) => tribuDuDialecte(d) === t).reduce((a, [, n]) => a + n, 0);

  useEffect(() => NetInfo.addEventListener(e => setEnLigne(e.isConnected !== false)), []);

  // Au démarrage : renvoi de la file, défis et thèmes, puis synchronisation du catalogue (reprise automatique).
  useEffect(() => {
    let vivant = true;
    (async () => {
      chargerDefis().then(l => { if (!vivant) return; const actifs = l.filter(d => d.isActive); setDefis(actifs); setDefiId(id => id || actifs.find(d => d.id === 'defi-peche-semaine')?.id || actifs[0]?.id || ''); }).catch(() => {});
      chargerThemes().then(t => vivant && setThemes(t)).catch(() => {});
      await rejouerFile();
      if (vivant) setEnAttente(await nombreEnAttente());
      setCompteurs(await catalogue.compteursDialectes());
      setVersion(v => v + 1);
      await lancerSynchro();
      if (vivant) { setCompteurs(await catalogue.compteursDialectes()); setVersion(v => v + 1); }
    })();
    return () => { vivant = false; };
  }, []);

  useEffect(() => {
    if (defi && defi.theme && defi.theme !== 'all') catalogue.identifiants({ categorie: defi.theme }).then(l => setNbDefiTheme(l.length));
    else setNbDefiTheme(0);
  }, [defi?.id, defi?.theme, version]); // eslint-disable-line react-hooks/exhaustive-deps

  // Le serveur a signalé une modification (flux temps réel, relecture périodique) : défis, thèmes et fiches sont relus.
  useEffect(() => {
    if (!vDonnees) return;
    chargerDefis().then(l => setDefis(l.filter(d => d.isActive))).catch(() => {});
    chargerThemes().then(setThemes).catch(() => {});
    catalogue.compteursDialectes().then(c => { setCompteurs(c); setVersion(v => v + 1); });
    nombreEnAttente().then(setEnAttente);
  }, [vDonnees]);

  // Fiches à parcourir selon la tribu et le défi (identifiants seulement, comme le site web).
  useEffect(() => {
    let annule = false;
    (async () => {
      const c = await catalogue.compteursDialectes();
      let liste: string[] = [];
      // Catalogue pas encore téléchargé (premier lancement hors-ligne) : fiches de secours du site web, comme INITIAL_ENENGA_ITEMS.
      if ((await catalogue.compter()) === 0) {
        liste = FICHES_DE_SECOURS.filter(f => tribu === 'all' || tribuDuDialecte(String(f.dialect)) === tribu).map(f => f.id);
        if (liste.length === 0) liste = FICHES_DE_SECOURS.map(f => f.id);
        if (!annule) { setIds(liste); setIndex(0); }
        return;
      }
      if (tribu !== 'all') {
        const dialectes = Object.keys(c).filter(d => tribuDuDialecte(d) === tribu);
        liste = await catalogue.identifiants({ dialectes });
      }
      if (liste.length === 0) liste = await catalogue.identifiants({});
      if (filtreDefi && defi && defi.theme && defi.theme !== 'all') {
        const thematiques = new Set(await catalogue.identifiants({ categorie: defi.theme }));
        const parDefi = liste.filter(id => thematiques.has(id));
        if (parDefi.length > 0) liste = parDefi;
      }
      if (annule) return;
      // Fiche choisie dans Ezango : on se place dessus dès que la liste est prête.
      const voulue = ficheDemandee.current;
      if (voulue && !liste.includes(voulue)) { ficheDemandee.current = null; setTribu('all'); setFiltreDefi(false); return; }
      setIds(liste); setIndex(voulue ? Math.max(0, liste.indexOf(voulue)) : 0);
      if (voulue) ficheDemandee.current = null;
    })();
    return () => { annule = true; };
  }, [version, tribu, filtreDefi, defi?.id, defi?.theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const courant = ids[index] || ids[0] || '';
  useEffect(() => {
    let annule = false;
    (async () => {
      const f = courant ? ((await catalogue.fiche(courant)) ?? FICHES_DE_SECOURS.find(x => x.id === courant) ?? null) : null;
      if (annule) return;
      setFiche(f); setSucces(false); setOrthographe(null); setProposee(''); setSens('exact'); setTypeSens('correction_sens');
      setSensPropose(''); setSensSecondaire(''); setNotes(''); setAudioUri(null); setDuree(0);
      setVariante(dialecteDeLaTribu(profil?.tribe || f?.dialect));
    })();
    return () => { annule = true; };
  }, [courant]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compte à rebours de l'enregistrement : arrêt automatique à 60 s.
  useEffect(() => {
    if (!enregistre) return;
    const t = setInterval(() => {
      const s = Math.round((Date.now() - debut.current) / 1000);
      setSecondes(s);
      if (s >= DUREE_MAX) arreter();
    }, 500);
    // Niveau sonore en direct (barres) : le décibel mesuré (−60 à 0) devient un pourcentage.
    const mesure = setInterval(() => {
      const db = recorder.getStatus().metering;
      const niveau = typeof db === 'number' ? Math.max(8, Math.min(100, Math.round(((db + 60) / 60) * 100))) : 8;
      setNiveaux(n => [...n.slice(-31), niveau]);
    }, 120);
    return () => { clearInterval(t); clearInterval(mesure); };
  }, [enregistre]); // eslint-disable-line react-hooks/exhaustive-deps

  const arreter = async () => {
    try { await recorder.stop(); } catch { /* déjà arrêté */ }
    setEnregistre(false);
    setAudioUri(recorder.uri);
    setDuree(Math.min(DUREE_MAX, Math.max(1, Math.round((Date.now() - debut.current) / 1000))));
  };
  const commencer = async () => {
    setErreurMicro(null);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) { setErreurMicro('Autorisation micro refusée. Veuillez autoriser le micro dans les réglages de votre appareil.'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      debut.current = Date.now(); setSecondes(0); setAudioUri(null); setNiveaux([]); setEnregistre(true);
    } catch (e) { setErreurMicro('Impossible d’accéder au microphone (' + ((e as Error).message || 'Erreur inconnue') + ').'); }
  };

  const envoyer = async () => {
    if (!profil || !fiche) return;
    if (!orthographe) return alerter("Veuillez indiquer si l'orthographe actuelle est correcte ou proposer votre version.");
    if (orthographe === 'propose' && !proposee.trim()) return alerter('Veuillez saisir votre proposition de traduction / orthographe en langue Myènè.');
    if (sens === 'propose' && !sensPropose.trim() && !sensSecondaire.trim()) return alerter('Veuillez saisir votre proposition de signification en français, une autre tournure ou un sens secondaire.');
    if (!audioUri && !(await demander('Vous n’avez pas encore enregistré votre prononciation vocale. Voulez-vous tout de même soumettre sans audio ?'))) return;

    setOccupe(true);
    try {
      const c = construireContribution(profil, fiche, {
        orthographeCorrecte: orthographe === 'correct', orthographeProposee: proposee.trim(),
        sensFrancaisExact: sens === 'exact', typeSens: sens === 'exact' ? 'exact' : typeSens,
        sensFrancaisPropose: sensPropose, sensSecondaire, varianteDialecte: variante, commentaire: notes.trim(),
        dureeAudio: audioUri ? duree : 0, mimeAudio: audioUri ? 'audio/mp4' : undefined,
      });
      c.offlineQueued = !enLigne;
      const r = await soumettre(c, audioUri ?? undefined, 'audio/mp4');
      setEnAttente(await nombreEnAttente());
      if (r === 'refuse') { alerter('Contribution refusée par le serveur (compte suspendu ou consentement manquant).'); return; }
      const xp = (audioUri ? 120 : 50) + (sens === 'propose' && (sensPropose.trim() || sensSecondaire.trim()) ? 20 : 0);
      await ajouterAlerte({
        userId: profil.id, type: 'reward', title: `${MYENE.AKEWA.mot} ! Contribution enregistrée 🌟`,
        message: `Merci d’enrichir le patrimoine de la langue Myènè pour "${fiche.frenchText}". Jusqu’à +${xp} XP après validation par un validateur.`,
      });
      setSucces(true);
      setConfettis(true); setTimeout(() => setConfettis(false), 3000);
    } catch {
      alerter(`${MYENE.NYEZA_MYE.mot}… Une erreur est survenue lors de la soumission. Vos données ont été sauvegardées localement.`);
    } finally { setOccupe(false); }
  };

  const suivante = () => { if (index < ids.length - 1) setIndex(index + 1); };
  const precedente = () => { if (index > 0) setIndex(index - 1); };

  if (!profil) return null;
  const accepte = consentementDonne(profil);

  const rappel = !accepte && profil.registrationCompleted && (
    <View style={s.rappel}>
      <Text style={s.rappelTexte}>
        <Text style={{ fontWeight: '900', color: '#fde047' }}>Rappel Contributeur Enregistré : </Text>
        Veuillez accepter les Conditions Générales de Contribution Individuelle (Nkala – Essaka Engineering) et valider l'utilisation de vos données pour poursuivre vos contributions et débloquer vos points, badges et récompenses d'accomplissement.
      </Text>
      <Pressable style={s.rappelBouton} onPress={() => setConditions(true)}><Text style={s.rappelBoutonTexte}>Lire & Accepter les Conditions</Text></Pressable>
    </View>
  );

  const theme = fiche ? themes.find(t => t.id === fiche.category || t.id === fiche.theme) : undefined;
  const defiConcerne = !!(defi && fiche && (defi.theme === 'all' || defi.theme === fiche.category || defi.theme === fiche.theme));
  const progres = defi ? Math.min(defi.targetCount, profil.weeklyProgress?.[defi.id] || 0) : 0;
  const pourcent = defi ? Math.min(100, Math.round((progres / defi.targetCount) * 100)) : 0;
  const termine = !!(defi && profil.completedChallenges?.includes(defi.id));
  const themeDefi = defi && defi.theme !== 'all' ? themes.find(t => t.id === defi.theme) : undefined;

  return (
    <View style={{ gap: 12 }}>
      <Confettis declencheur={confettis} />
      <CelebrationDefi defis={defis} />
      {rappel}
      <ConditionsModale visible={conditions} rappel onClose={() => { setConditions(false); recharger(); }} />
      <FaqModale visible={faq} tribu={profil.tribe} filtreTribu={tribu} onFiltreTribu={setTribu} onClose={() => setFaq(false)} />

      {/* Défi hebdomadaire */}
      {defi && (
        <View style={s.defi}>
          <View style={s.ligne}>
            <Text style={s.defiSur}>{defi.badgeRewardIcon || '🎯'} Défi de la semaine{themeDefi ? `  ${themeDefi.icon} ${themeDefi.shortName}` : ''}</Text>
            <Pressable onPress={() => setChoixDefi(!choixDefi)}><Text style={s.lien}>Autres défis ({defis.length}) ▾</Text></Pressable>
          </View>
          <Text style={s.defiTitre}>{defi.title}</Text>
          {choixDefi && (
            <View style={s.liste}>
              <Text style={s.discret}>Défis Hebdomadaires Disponibles</Text>
              {defis.map(d => (
                <Pressable key={d.id} onPress={() => { setDefiId(d.id); setChoixDefi(false); }} style={[s.optionDefi, d.id === defi.id && { borderColor: couleurs.ambre }]}>
                  <Text style={s.texte}>{d.badgeRewardIcon} {d.title}  +{d.xpReward} XP</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={s.texte}>{defi.description}</Text>
          <View style={s.ligne}>
            <Text style={s.texte}>Progression : <Text style={{ fontWeight: '900', color: '#fff' }}>{progres}</Text> / {defi.targetCount}{termine ? '  ✔ Terminé !' : ''}</Text>
            <Text style={s.discret}>{pourcent}%</Text>
          </View>
          <View style={s.piste}><View style={[s.rempli, { width: `${pourcent}%`, backgroundColor: termine ? '#10b981' : couleurs.ambre }]} /></View>
          <Text style={s.discret}>Récompense : {defi.badgeRewardIcon} {defi.badgeRewardName}  ·  +{defi.xpReward} XP</Text>
          {defi.theme !== 'all' && (
            <Pressable style={[s.filtre, filtreDefi && s.filtreActif]} onPress={() => setFiltreDefi(!filtreDefi)}>
              <Text style={[s.filtreTexte, filtreDefi && { color: '#000' }]}>{filtreDefi ? 'Filtré sur ce thème (Actif)' : `Travailler sur ce thème (${nbDefiTheme || ''})`}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Filtre par tribu */}
      <View style={s.carte}>
        <View style={s.ligne}>
          <Text style={[s.defiSur, { flex: 1 }]}>Filtrer les questions par Ethnie Myènè (Orthographe & Tons) :</Text>
          <Pressable onPress={() => setFaq(true)} style={s.petit}><Text style={s.petitTexte}>FAQ & Règles de contribution</Text></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pressable onPress={() => setTribu('all')} style={[s.puce, tribu === 'all' && s.puceOr]}><Text style={[s.puceTexte, tribu === 'all' && { color: '#180d07', fontWeight: '800' }]}>🌍 Toutes les ethnies ({total})</Text></Pressable>
          {MYENE_TRIBES.map(t => (
            <Pressable key={t} onPress={() => setTribu(t)} style={[s.puce, tribu === t && s.puceActive]}>
              <Text style={[s.puceTexte, tribu === t && { color: '#fff', fontWeight: '800' }, profil.tribe === t && tribu !== t && { color: '#fde047' }]}>{profil.tribe === t ? '⭐ ' : ''}{t} ({enChargement ? '…' : compteTribu(t)})</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {synchro && <Text style={s.discret}>Téléchargement {synchro.fait.toLocaleString('fr-FR')} / {synchro.total.toLocaleString('fr-FR')}…</Text>}
      {enAttente > 0 && <Text style={s.discret}>{enAttente} contribution(s) en attente d’envoi</Text>}

      {!fiche && enChargement ? <Chargement /> : !fiche ? (
        <View style={s.carte}>
          {synchro && <ActivityIndicator color={couleurs.ambre} />}
          <Text style={s.titre}>Aucune fiche disponible pour le moment</Text>
          <Text style={s.texte}>Toutes les fiches ont été supprimées ou aucune fiche n'est encore publiée dans la base de données.</Text>
          {profil.role === 'admin' && <Pressable style={s.bouton} onPress={() => routeur.push('/(tabs)/admin')}><Text style={s.boutonTexte}>Ouvrir l'Administration pour ajouter des fiches</Text></Pressable>}
        </View>
      ) : (
        <View style={s.carte}>
          <View style={s.ligne}>
            <Text style={s.discret}>Expression {index + 1} sur {ids.length}</Text>
            <View style={s.ligne}>
              {!!onGuide && <Pressable onPress={onGuide} style={s.petit}><Text style={s.petitTexte}>Guide visuel & Objectifs</Text></Pressable>}
              <Pressable onPress={precedente} disabled={index === 0} accessibilityLabel="Expression précédente" style={[s.nav, index === 0 && { opacity: 0.3 }]}><Text style={s.navTexte}>‹</Text></Pressable>
              <Pressable onPress={suivante} disabled={index >= ids.length - 1} accessibilityLabel="Expression suivante" style={[s.nav, index >= ids.length - 1 && { opacity: 0.3 }]}><Text style={s.navTexte}>›</Text></Pressable>
            </View>
          </View>

          {!!fiche.imageUrl && <Image source={{ uri: fiche.imageUrl }} style={s.image} accessibilityLabel={fiche.frenchText} resizeMode="cover" />}
          <View style={s.pile}>
            <Text style={s.badge}>Ethnie {tribuDuDialecte(String(fiche.dialect))}</Text>
            {!!theme && <Text style={s.badge}>{theme.icon} {theme.shortName}</Text>}
            {fiche.difficulty === 'debutant' && <Text style={[s.badge, { color: '#fde047' }]}>Débutant</Text>}
            {fiche.difficulty === 'intermediaire' && <Text style={[s.badge, { color: couleurs.ambre }]}>Intermédiaire</Text>}
            {fiche.difficulty === 'avance' && <Text style={[s.badge, { color: '#fca5a5' }]}>Avancé</Text>}
          </View>
          <Text style={s.etiquette}>SENS EN FRANÇAIS{fiche.moduleThematique ? ` (${fiche.moduleThematique})` : ''}</Text>
          <Text style={s.francais}>« {fiche.frenchText} »</Text>
          {defiConcerne && defi && <Text style={s.defiConcerne}>✨ Défi de la semaine : Cette phrase compte pour votre progression !  +{defi.xpReward} XP</Text>}

          <Text style={s.etiquette}>Traduction proposée en langue Myènè :</Text>
          <Text style={s.myene}>{fiche.myeneText}</Text>
          {!!fiche.phoneticApi && <Text style={s.discret}>[{fiche.phoneticApi}]</Text>}
          {!!fiche.contextNotes && <Text style={s.discret}>{fiche.contextNotes}</Text>}

          {succes ? (
            <View style={s.succes}>
              <Text style={s.succesTitre}>{MYENE.AKEWA_MPOLO.mot} ! Merci pour votre contribution !</Text>
              <Text style={s.texte}>Votre enregistrement, votre avis orthographique et vos précisions de sens enrichissent fidèlement le patrimoine linguistique Myènè.</Text>
              <Pressable style={s.bouton} onPress={suivante}><Text style={s.boutonTexte}>Passer à l’expression suivante</Text></Pressable>
            </View>
          ) : (
            <>
              <Text style={s.etape}>1  L’orthographe est-elle bien écrite en langue Myènè ?</Text>
              <Pressable onPress={() => setOrthographe('correct')} style={[s.choix, orthographe === 'correct' && s.choixVert]}><Text style={s.choixTexte}>Oui, c’est bien écrit 👍</Text></Pressable>
              <Pressable onPress={() => { setOrthographe('propose'); if (!proposee) setProposee(fiche.myeneText); }} style={[s.choix, orthographe === 'propose' && s.choixTerre]}><Text style={s.choixTexte}>Je propose ma version ✍️</Text></Pressable>
              {orthographe === 'propose' && (
                <View style={{ gap: 8 }}>
                  <Text style={s.etiquette}>Votre version exacte en langue Myènè :</Text>
                  <TextInput style={s.champ} value={proposee} onChangeText={setProposee} autoCorrect={false} placeholder={`Ex : ${MYENE.MBOLUANI.mot}...`} placeholderTextColor={couleurs.discret} />
                  <Text style={s.etiquette}>Variante tribale :</Text>
                  <View style={s.pile}>
                    {VARIANTES_TRIBALES.map(([code, nom]) => (
                      <Pressable key={code} onPress={() => setVariante(code)} style={[s.puce, variante === code && s.puceActive]}><Text style={[s.puceTexte, variante === code && { color: '#fff', fontWeight: '700' }]}>{nom}</Text></Pressable>
                    ))}
                  </View>
                  <Text style={s.etiquette}>Explication / Note facultative :</Text>
                  <TextInput style={s.champ} value={notes} onChangeText={setNotes} placeholder="Nuance locale ou prononciation de l’aîné..." placeholderTextColor={couleurs.discret} />
                </View>
              )}

              <Text style={s.etape}>2  Avant de dire le texte en Myènè : la signification en français est-elle exacte ?</Text>
              <Text style={s.discret}>Sens • Autre tournure • Sens secondaire</Text>
              <Pressable onPress={() => setSens('exact')} style={[s.choix, sens === 'exact' && s.choixVert]}><Text style={s.choixTexte}>Oui, la signification est exacte 👍</Text></Pressable>
              <Pressable onPress={() => setSens('propose')} style={[s.choix, sens === 'propose' && s.choixOr]}><Text style={s.choixTexte}>Proposer sa signification, autre tournure ou sens secondaire 💡</Text></Pressable>
              {sens === 'propose' && (
                <View style={{ gap: 8 }}>
                  <Text style={s.etiquette}>Quel type de précision souhaitez-vous apporter au sens français ?   +20 XP bonus</Text>
                  {NUANCES_SENS.map(n => (
                    <Pressable key={n.id} onPress={() => setTypeSens(n.id)} style={[s.nuance, typeSens === n.id && s.nuanceActive]}>
                      <Text style={s.choixTexte}>{n.label}</Text><Text style={s.discret}>{n.desc}</Text>
                    </Pressable>
                  ))}
                  <Text style={s.etiquette}>
                    {typeSens === 'autre_tournure' ? 'Votre autre tournure en français :' : typeSens === 'sens_secondaire' ? 'Signification principale (ou autre tournure) en français :' : 'Votre signification exacte en français :'}
                  </Text>
                  <TextInput style={s.champ} value={sensPropose} onChangeText={setSensPropose} placeholder={`Au lieu de « ${fiche.frenchText} », comment le diriez-vous en français ?`} placeholderTextColor={couleurs.discret} />
                  <Text style={s.etiquette}>Sens secondaire, sens littéral ou contexte d'emploi (facultatif) :</Text>
                  <TextInput style={s.champ} value={sensSecondaire} onChangeText={setSensSecondaire} placeholder="Ex: Sens littéral mot-à-mot, sens figuré chez les anciens, ou second sens selon le contexte..." placeholderTextColor={couleurs.discret} />
                </View>
              )}

              <Text style={s.etape}>3  Dites le texte en Myènè (Enregistrez votre prononciation orale) :</Text>
              <View style={s.micro}>
                <Text style={s.etiquette}>Enregistrement de la prononciation{enregistre ? `   EN DIRECT • ${mmss(secondes)}` : ''}</Text>
                {!!erreurMicro && <Text style={s.erreur}>{erreurMicro}</Text>}
                {(enregistre || (audioUri && niveaux.length > 0)) && (
                  <View style={s.onde}>{niveaux.map((n, i) => <View key={i} style={[s.barreOnde, { height: `${n}%`, backgroundColor: enregistre ? '#ef4444' : '#22c55e' }]} />)}</View>
                )}
                {!audioUri && !enregistre && <Text style={s.discret}>Appuyez sur le micro pour prononcer l’expression avec votre accent naturel</Text>}
                {audioUri && !enregistre && <Text style={s.ok}>Voix capturée ({mmss(duree || 3)})</Text>}
                {!enregistre && !audioUri && <Pressable style={s.record} onPress={commencer}><Text style={s.boutonTexte}>🎙️  Commencer l’enregistrement</Text></Pressable>}
                {enregistre && <Pressable style={[s.record, { backgroundColor: '#dc2626' }]} onPress={arreter}><Text style={s.boutonTexte}>■  Terminer ({mmss(secondes)})</Text></Pressable>}
                {audioUri && !enregistre && (
                  <View style={s.ligne}>
                    <Pressable style={[s.record, { flex: 1 }]} onPress={() => { if (lecteur.playing) lecteur.pause(); else { lecteur.seekTo(0); lecteur.play(); } }}><Text style={s.boutonTexte}>{lecteur.playing ? 'Pause' : 'Écouter'}</Text></Pressable>
                    <Pressable style={[s.recordGris, { flex: 1 }]} onPress={() => { setAudioUri(null); setDuree(0); }}><Text style={s.boutonTexte}>Réessayer</Text></Pressable>
                  </View>
                )}
              </View>

              <Pressable style={[s.bouton, (occupe || enregistre) && { opacity: 0.6 }]} onPress={envoyer} disabled={occupe || enregistre}>
                {occupe ? <><ActivityIndicator color="#fff" /><Text style={s.boutonTexte}>Synchronisation en cours...</Text></> : <Text style={s.boutonTexte}>Valider & Transmettre la contribution ✨</Text>}
              </Pressable>
              {!enLigne && <Text style={s.discret}>Mode hors-ligne : votre contribution sera stockée et envoyée dès reconnexion.</Text>}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const s = stylesDyn(() => ({
  titre: { color: couleurs.texteClair, fontSize: 17, fontWeight: '800' },
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  defi: { backgroundColor: '#2a1608', borderColor: '#d97706', borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  defiSur: { color: '#fde047', fontSize: 12, fontWeight: '800' },
  defiTitre: { color: '#fff', fontSize: 17, fontWeight: '900' },
  defiConcerne: { color: '#fde047', fontSize: 12, fontWeight: '700', backgroundColor: '#3b2208', padding: 8, borderRadius: 10 },
  liste: { gap: 6, backgroundColor: couleurs.fond, borderRadius: 12, padding: 8 },
  optionDefi: { borderColor: couleurs.bord, borderWidth: 1, borderRadius: 10, padding: 10 },
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  texte: { color: couleurs.texte, fontSize: 13, lineHeight: 19 },
  discret: { color: couleurs.discret, fontSize: 12 },
  lien: { color: couleurs.ambre, fontSize: 12, fontWeight: '700' },
  piste: { height: 8, borderRadius: 4, backgroundColor: couleurs.fond, overflow: 'hidden' },
  rempli: { height: 8 },
  filtre: { borderColor: '#d97706', borderWidth: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center', backgroundColor: couleurs.fond },
  filtreActif: { backgroundColor: '#d97706' },
  filtreTexte: { color: '#fdfaf7', fontWeight: '700', fontSize: 12 },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1 },
  puceActive: { backgroundColor: couleurs.terre, borderColor: couleurs.ambre },
  puceOr: { backgroundColor: couleurs.ambre, borderColor: '#fde047' },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  petit: { borderColor: couleurs.ambre, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  petitTexte: { color: '#f39c12', fontSize: 11, fontWeight: '800' },
  nav: { width: 36, height: 36, borderRadius: 10, backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  navTexte: { color: '#fff', fontSize: 22, marginTop: -2 },
  image: { width: '100%', height: 180, borderRadius: 12 },
  badge: { color: couleurs.ambre, fontSize: 11, fontWeight: '700', borderColor: '#92400e', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  etiquette: { color: couleurs.texte, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  francais: { color: '#fff', fontSize: 22, fontWeight: '800' },
  myene: { color: couleurs.ambre, fontSize: 24, fontWeight: '900' },
  etape: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 8 },
  choix: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 14, padding: 14 },
  choixVert: { backgroundColor: '#15803d55', borderColor: '#22c55e' },
  choixTerre: { backgroundColor: '#c85a3255', borderColor: '#c85a32' },
  choixOr: { backgroundColor: '#f59e0b44', borderColor: '#f59e0b' },
  choixTexte: { color: '#f5ebe6', fontWeight: '700', fontSize: 14 },
  nuance: { backgroundColor: '#140a05', borderColor: '#522915', borderWidth: 1, borderRadius: 12, padding: 10 },
  nuanceActive: { backgroundColor: '#f59e0b33', borderColor: '#f59e0b' },
  champ: { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, padding: 12, fontSize: 14 },
  micro: { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  onde: { flexDirection: 'row', alignItems: 'center', height: 40, gap: 2, justifyContent: 'center' },
  barreOnde: { width: 4, borderRadius: 2 },
  record: { backgroundColor: '#c85a32', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  recordGris: { backgroundColor: '#4a2412', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6 },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center' },
  succes: { backgroundColor: '#052e16', borderColor: '#22c55e', borderWidth: 1, borderRadius: 14, padding: 14, gap: 10, marginTop: 8 },
  succesTitre: { color: '#86efac', fontSize: 17, fontWeight: '900' },
  ok: { color: '#86efac', fontSize: 12, fontWeight: '700' },
  erreur: { color: '#fca5a5', fontSize: 12 },
  rappel: { backgroundColor: '#7c2d12', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  rappelTexte: { color: '#fff', fontSize: 12, lineHeight: 18 },
  rappelBouton: { backgroundColor: '#f59e0b', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  rappelBoutonTexte: { color: '#180d07', fontWeight: '900', fontSize: 12 },
}));
