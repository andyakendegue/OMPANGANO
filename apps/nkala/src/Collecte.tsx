import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View, ScrollView } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import {
  accepterConsentement, consentementDonne, construireContribution, synchroniserCatalogue,
  type Progression, type QuestionnaireItem,
} from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { catalogue } from './catalogue';
import { nombreEnAttente, rejouerFile, soumettre } from './fileAttente';
import { couleurs } from './theme';

const DIALECTES: [string | null, string][] = [
  [null, 'Tous'], ['orungu', 'Ôrungu'], ['mpongwe', 'Mpongwè'], ['galoa', 'Galwa'],
  ['nkomi', 'Nkomi'], ['enenga', 'Enenga'], ['adyumba', 'Adyumba'],
];

export function Collecte() {
  const { profil, recharger } = useAuth();
  const [dialecte, setDialecte] = useState<string | null>(null);
  const [fiche, setFiche] = useState<QuestionnaireItem | null>(null);
  const [total, setTotal] = useState(0);
  const [synchro, setSynchro] = useState<Progression | null>(null);
  const [enAttente, setEnAttente] = useState(0);
  const [info, setInfo] = useState<string | null>(null);

  const [correcte, setCorrecte] = useState(true);
  const [proposee, setProposee] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duree, setDuree] = useState(0);
  const [enregistre, setEnregistre] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const debut = useRef(0);

  const charger = useCallback(async (apres: string | null, d: string | null) => {
    setTotal(await catalogue.compter());
    setFiche(await catalogue.suivante(d, apres));
    setCorrecte(true); setProposee(''); setCommentaire(''); setAudioUri(null); setDuree(0);
  }, []);

  // Au démarrage : renvoi de la file, puis synchronisation du catalogue (reprise automatique).
  useEffect(() => {
    let vivant = true;
    (async () => {
      await charger(null, null);
      await rejouerFile();
      setEnAttente(await nombreEnAttente());
      await synchroniserCatalogue(catalogue, p => vivant && setSynchro(p));
      if (vivant) { setSynchro(null); await charger(null, dialecte); }
    })();
    return () => { vivant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changerDialecte = (d: string | null) => { setDialecte(d); charger(null, d); };

  const basculerEnregistrement = async () => {
    if (enregistre) {
      await recorder.stop();
      setEnregistre(false);
      setAudioUri(recorder.uri);
      setDuree(Math.round((Date.now() - debut.current) / 1000));
      return;
    }
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) { setInfo("Autorisez le micro pour enregistrer votre voix."); return; }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    debut.current = Date.now();
    setAudioUri(null); setEnregistre(true); setInfo(null);
  };

  const envoyer = async () => {
    if (!profil || !fiche) return;
    setOccupe(true); setInfo(null);
    const c = construireContribution(profil, fiche, {
      orthographeCorrecte: correcte,
      orthographeProposee: correcte ? undefined : proposee.trim() || undefined,
      sensFrancaisExact: true,
      commentaire: commentaire.trim() || undefined,
      dureeAudio: duree,
      mimeAudio: audioUri ? 'audio/mp4' : undefined,
    });
    const r = await soumettre(c, audioUri ?? undefined, 'audio/mp4');
    setOccupe(false);
    setEnAttente(await nombreEnAttente());
    if (r === 'refuse') { setInfo("Contribution refusée par le serveur (compte suspendu ou consentement manquant)."); return; }
    setInfo(r === 'envoye' ? 'Merci ! Contribution envoyée.' : 'Pas de réseau : contribution gardée sur le téléphone, renvoi automatique.');
    await charger(fiche.id, dialecte);
  };

  if (!profil) return null;

  if (!consentementDonne(profil)) {
    return (
      <View style={s.carte}>
        <Text style={s.titre}>Conditions de contribution</Text>
        <Text style={s.texte}>
          Mes textes, traductions et enregistrements vocaux sont collectés par Essaka Engineering pour sauvegarder les langues
          myènè et entraîner des modèles d’IA valorisant les langues gabonaises, notamment dans Nkala. Je reste titulaire de mes droits.
        </Text>
        <Pressable style={s.bouton} onPress={async () => { try { await accepterConsentement(); await recharger(); } catch (e) { setInfo((e as Error).message); } }}>
          <Text style={s.boutonTexte}>J’accepte les conditions et l’usage de mes données</Text>
        </Pressable>
        {info && <Text style={s.erreur}>{info}</Text>}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {DIALECTES.map(([code, nom]) => (
          <Pressable key={nom} onPress={() => changerDialecte(code)} style={[s.puce, dialecte === code && s.puceActive]}>
            <Text style={[s.puceTexte, dialecte === code && { color: '#fff', fontWeight: '700' }]}>{nom}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {synchro && <Text style={s.discret}>Téléchargement {synchro.fait.toLocaleString('fr-FR')} / {synchro.total.toLocaleString('fr-FR')}…</Text>}
      {enAttente > 0 && <Text style={s.discret}>{enAttente} contribution(s) en attente d’envoi</Text>}

      {!fiche ? (
        <View style={s.carte}>{synchro || total === 0 ? <ActivityIndicator color={couleurs.ambre} /> : null}
          <Text style={s.texte}>{synchro ? 'Premier téléchargement du catalogue…' : 'Aucune fiche disponible pour ce dialecte.'}</Text></View>
      ) : (
        <View style={s.carte}>
          <Text style={s.discret}>{String(fiche.dialect)} · {fiche.theme || fiche.category} · {total.toLocaleString('fr-FR')} fiches</Text>
          <Text style={s.myene}>{fiche.myeneText}</Text>
          {!!fiche.phoneticApi && <Text style={s.discret}>[{fiche.phoneticApi}]</Text>}
          <Text style={s.francais}>{fiche.frenchText}</Text>
          {!!fiche.contextNotes && <Text style={s.discret}>{fiche.contextNotes}</Text>}

          <View style={s.ligne}>
            <Text style={s.texte}>L’orthographe est correcte</Text>
            <Switch value={correcte} onValueChange={setCorrecte} trackColor={{ true: couleurs.terre }} />
          </View>
          {!correcte && (
            <TextInput style={s.champ} placeholder="Votre orthographe" placeholderTextColor={couleurs.discret}
              value={proposee} onChangeText={setProposee} autoCorrect={false} />
          )}
          <TextInput style={s.champ} placeholder="Commentaire (facultatif)" placeholderTextColor={couleurs.discret}
            value={commentaire} onChangeText={setCommentaire} multiline />

          <Pressable style={[s.micro, enregistre && { backgroundColor: '#dc2626' }]} onPress={basculerEnregistrement}>
            <Text style={s.boutonTexte}>{enregistre ? '■ Arrêter' : audioUri ? '● Refaire l’enregistrement' : '● Enregistrer ma voix'}</Text>
          </Pressable>
          {audioUri && !enregistre && <Text style={s.discret}>Enregistrement prêt ({duree} s)</Text>}

          <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} onPress={envoyer} disabled={occupe || enregistre}>
            {occupe ? <ActivityIndicator color="#fff" /> : <Text style={s.boutonTexte}>Envoyer ma contribution</Text>}
          </Pressable>
          <Pressable onPress={() => charger(fiche.id, dialecte)}><Text style={s.lien}>Passer à la fiche suivante</Text></Pressable>
        </View>
      )}
      {info && <Text style={info.startsWith('Merci') || info.startsWith('Pas de réseau') ? s.ok : s.erreur}>{info}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  titre: { color: couleurs.texteClair, fontSize: 17, fontWeight: '800' },
  texte: { color: couleurs.texte, fontSize: 14, lineHeight: 20 },
  discret: { color: couleurs.discret, fontSize: 12 },
  myene: { color: couleurs.ambre, fontSize: 24, fontWeight: '800' },
  francais: { color: couleurs.texteClair, fontSize: 17 },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  champ: { backgroundColor: couleurs.fond, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, color: couleurs.texteClair, padding: 12, fontSize: 15 },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  micro: { backgroundColor: '#0d9488', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center' },
  lien: { color: couleurs.ambre, textAlign: 'center', fontSize: 13, fontWeight: '600' },
  puce: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: couleurs.carte },
  puceActive: { backgroundColor: couleurs.terre },
  puceTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '600' },
  ok: { color: '#86efac', fontSize: 13 },
  erreur: { color: '#fca5a5', fontSize: 13 },
});
