/**
 * Ompangano : collecte « Les chants de notre enfance » (cursus v3, transversal ; audit 05, point 6 ; demande de Capp du 22 nov. 2026).
 * Les parents et les anciens enregistrent une comptine ou un chant d'enfants, écrivent les paroles comme on les chante et ce
 * qu'elles veulent dire. L'envoi part dans la file de validation d'Ompangano (contribution sans fiche, genre « chant_enfance ») ;
 * Capp valide, puis les premiers chants alimenteront une leçon « Chanter » par palier.
 * Même règle de voix que partout : accord donné, usage de la voix autorisé et, pour un mineur, accord du parent (noyau/accordVoix.ts).
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import { consentementDonne, construireContribution, voixAutorisee, type QuestionnaireItem } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { soumettre } from './fileAttente';
import { Bouton, Carte, Champ, Ecran, Entete, EtatVide, Ic, Mascotte, Onde, Puce, T } from './kit';
import { useTheme } from './Prefs';

export const GENRE_CHANT = 'chant_enfance';

export function ProposerChant({ retour }: { retour: () => void }) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const rec = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [etat, setEtat] = useState<'attente' | 'enreg' | 'fait' | 'refus'>('attente');
  const [uri, setUri] = useState<string | null>(null);
  const lecteur = useAudioPlayer(uri ? { uri } : null);
  const [titre, setTitre] = useState('');
  const [paroles, setParoles] = useState('');
  const [sens, setSens] = useState('');
  const [deQui, setDeQui] = useState('');
  const [envoi, setEnvoi] = useState<'non' | 'encours' | 'envoye' | 'en_attente' | 'erreur'>('non');
  // Quand quelqu'un d'autre chante (une grand-mère, un ancien), c'est son accord à elle ou à lui qu'il faut (règle du projet).
  const [chanteur, setChanteur] = useState<'moi' | 'autre'>('moi');
  const [nomChanteur, setNomChanteur] = useState('');
  const [accordChanteur, setAccordChanteur] = useState(false);

  if (!profil) return <Ecran><Entete titre="Les chants de notre enfance" retour={retour} /><EtatVide mascotte titre="Un compte est nécessaire" texte="Crée un compte pour partager un chant." /></Ecran>;
  const voixOk = consentementDonne(profil) && voixAutorisee(profil);

  const commencer = async () => {
    try {
      const p = await AudioModule.requestRecordingPermissionsAsync();
      if (!p.granted) { setEtat('refus'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await rec.prepareToRecordAsync(); rec.record(); setEtat('enreg');
    } catch { setEtat('refus'); }
  };
  const arreter = async () => { try { await rec.stop(); setUri(rec.uri); await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); } catch { /* */ } setEtat('fait'); };
  const accordOk = chanteur === 'moi' || (accordChanteur && nomChanteur.trim().length > 0);
  const pret = !!uri && titre.trim().length > 0 && voixOk && accordOk && envoi === 'non';

  const envoyer = async () => {
    if (!pret || !uri) return;
    setEnvoi('encours');
    try {
      const id = `chant-${profil.id.slice(0, 8)}-${Date.now()}`;
      const fiche = { id, myeneText: paroles.trim(), frenchText: sens.trim(), dialect: profil.tribe || 'orungu', category: GENRE_CHANT } as unknown as QuestionnaireItem;
      const contribution = construireContribution(profil, fiche, {
        orthographeCorrecte: true, sensFrancaisExact: true, dureeAudio: 0, mimeAudio: 'audio/mp4',
        commentaire: `Chant de notre enfance : « ${titre.trim()} »${deQui.trim() ? ` ; appris de : ${deQui.trim()}` : ''}.`,
      }, id);
      Object.assign(contribution, { itemId: '', genre: GENRE_CHANT, chant: { titre: titre.trim(), paroles: paroles.trim(), sens: sens.trim(), appris_de: deQui.trim(), chante_par: chanteur === 'moi' ? 'le contributeur' : nomChanteur.trim(), accord_du_chanteur: chanteur === 'moi' ? 'contributeur' : 'oui, déclaré par le contributeur' } });
      const r = await soumettre(contribution, uri, 'audio/mp4');
      setEnvoi(r === 'refuse' ? 'erreur' : r);
    } catch { setEnvoi('erreur'); }
  };

  if (envoi === 'envoye' || envoi === 'en_attente') return (
    <Ecran contenu={{ alignItems: 'center' }}>
      <Entete titre="Les chants de notre enfance" retour={retour} />
      <Mascotte taille={110} humeur="content" />
      <T v="sousTitre" style={{ textAlign: 'center' }}>Akewa mpolo !</T>
      <T v="corps" style={{ textAlign: 'center' }}>{envoi === 'envoye' ? 'Ton chant est arrivé. Il sera écouté avant de rejoindre les leçons.' : 'Ton chant partira dès que le réseau revient.'}</T>
      <Bouton label="Partager un autre chant" onPress={() => { setUri(null); setEtat('attente'); setTitre(''); setParoles(''); setSens(''); setDeQui(''); setEnvoi('non'); }} />
      <Bouton label="Retour" variante="fantome" onPress={retour} />
    </Ecran>
  );

  return (
    <Ecran bas={100}>
      <Entete titre="Les chants de notre enfance" retour={retour} />
      <Carte accent={c.modules.ompangano}><View style={{ padding: 18, gap: 8 }}>
        <T v="carte">Une comptine, une berceuse, un chant de jeu ?</T>
        <T v="petit">Chante-le comme on te l'a appris. Les chants partagés aideront les enfants à apprendre la langue en chantant.</T>
      </View></Carte>
      {!voixOk ? (
        <Carte><View style={{ padding: 16, gap: 8 }}>
          <T v="corps">Pour partager ta voix, il faut avoir autorisé l'usage de ta voix dans ton profil{' '}(et, pour un mineur, l'accord d'un parent).</T>
        </View></Carte>
      ) : etat === 'refus' ? (
        <T v="corps">Le micro est refusé. Tu peux l'autoriser dans les réglages du téléphone.</T>
      ) : (
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Onde actif={etat === 'enreg'} barres={24} module="ompangano" />
          {etat === 'attente' && <Bouton label="Chanter et enregistrer" icone="micro" onPress={commencer} />}
          {etat === 'enreg' && <Bouton label="Arrêter" icone="pause" variante="ambre" onPress={arreter} />}
          {etat === 'fait' && <>
            <Pressable onPress={() => { lecteur.seekTo(0); lecteur.play(); }} accessibilityRole="button" style={{ flexDirection: 'row', gap: 8, alignItems: 'center', padding: 8 }}><Ic nom="lecture" taille={20} couleur={c.accent} /><T v="corps" couleur={c.accent}>Réécouter</T></Pressable>
            <Pressable onPress={() => { setUri(null); setEtat('attente'); }} accessibilityRole="button"><T v="petit" style={{ textDecorationLine: 'underline' }}>Recommencer</T></Pressable>
          </>}
        </View>
      )}
      <T v="libelle">Qui chante ?</T>
      <View style={{ flexDirection: 'row', gap: 8 }}><Puce label="C'est moi" actif={chanteur === 'moi'} onPress={() => setChanteur('moi')} /><Puce label="Quelqu'un d'autre" actif={chanteur === 'autre'} onPress={() => setChanteur('autre')} /></View>
      {chanteur === 'autre' && <>
        <Champ label="Son nom" valeur={nomChanteur} onChange={setNomChanteur} placeholder="Le nom de la personne qui chante" maxLength={120} />
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accordChanteur }} onPress={() => setAccordChanteur(v => !v)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Ic nom={accordChanteur ? 'checkbox' : 'square-outline'} taille={22} couleur={accordChanteur ? c.accent : c.discret} />
          <T v="petit" style={{ flex: 1 }}>Cette personne est d'accord pour que sa voix et son chant soient enregistrés, écoutés par un correcteur, utilisés dans Nkala et pour entraîner les modèles de la langue. Pour un enfant, son parent est d'accord.</T>
        </Pressable>
      </>}
      <Champ label="Le nom du chant" valeur={titre} onChange={setTitre} placeholder="Comment l'appelle-t-on ?" maxLength={120} />
      <Champ label="Les paroles, comme on les chante" valeur={paroles} onChange={setParoles} placeholder="Écris-les comme tu sais : elles seront relues." lignes={5} maxLength={4000} auto="none" />
      <Champ label="Ce que ça veut dire" valeur={sens} onChange={setSens} placeholder="En français, en quelques mots." lignes={3} maxLength={2000} />
      <Champ label="De qui l'as-tu appris ? (facultatif)" valeur={deQui} onChange={setDeQui} placeholder="Ta mère, ta grand-mère, l'école…" maxLength={200} />
      {envoi === 'erreur' && <T v="petit" couleur={c.erreur}>L'envoi n'a pas marché. Réessaie dans un instant.</T>}
      <Bouton label={envoi === 'encours' ? 'Envoi…' : 'Partager ce chant'} icone="envoyer" desactive={!pret} onPress={envoyer} />
    </Ecran>
  );
}
