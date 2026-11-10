/** Onenji : leçon interactive (écouter-répéter, associer, remettre en ordre, dire à voix haute), fin de leçon, contrôle d'unité (4 sur 5), certificat. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Share, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import { avancerLecon, jugerReponse, justesse, melanger, nouvelleLecon, optionsDe, resoudreMedia, SEUIL_UNITE, type EtatLecon, type Exercice, type Lecon, type Parcours, type Unite } from '@nkala/noyau';
import { Confettis } from './Confettis';
import { Bouton, Carte, Ecran, Ic, Mascotte, Onde, Barre, T, Visuel, useToast } from './kit';
import { useSansPublicite } from './Pub';
import { usePrefs, useTheme } from './Prefs';
import { useProgres } from './Progres';
import { useAuth } from './AuthProvider';
import { mouvement } from './theme';

/** Lecture d'un son : adresse du stockage ou https. Sans fichier, le bouton l'indique (aucune voix de synthèse : elle déformerait le myènè). */
export function Son({ audio, auto, grand }: { audio?: string | null; auto?: boolean; grand?: boolean }) {
  const { c } = useTheme();
  const [url, setUrl] = useState<string | null>(null);
  const player = useAudioPlayer(url ? { uri: url } : null);
  useEffect(() => { setUrl(null); if (audio) resoudreMedia(audio).then(setUrl).catch(() => {}); setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); }, [audio]);
  useEffect(() => { if (url && auto) { try { player.play(); } catch { /* */ } } }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = grand ? 88 : 56;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={audio ? 'Écouter' : 'Audio bientôt disponible'} disabled={!url} onPress={() => { player.seekTo(0); player.play(); }}
      style={{ width: t, height: t, borderRadius: t / 2, backgroundColor: url ? c.accent : c.carte, borderWidth: 1, borderColor: c.bord, alignItems: 'center', justifyContent: 'center', opacity: audio ? 1 : 0.5 }}>
      <Ic nom={audio ? 'haut_parleur' : 'muet'} taille={t * 0.45} couleur={url ? c.surAccent : c.discret} />
    </Pressable>
  );
}

function Dire({ modele, onFini }: { modele?: string | null; onFini: () => void }) {
  const { c } = useTheme();
  const rec = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [etat, setEtat] = useState<'attente' | 'enreg' | 'fait' | 'refus'>('attente');
  const [uri, setUri] = useState<string | null>(null);
  const lecteur = useAudioPlayer(uri ? { uri } : null);
  const commencer = async () => {
    try {
      const p = await AudioModule.requestRecordingPermissionsAsync();
      if (!p.granted) { setEtat('refus'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await rec.prepareToRecordAsync(); rec.record(); setEtat('enreg');
    } catch { setEtat('refus'); }
  };
  const arreter = async () => { try { await rec.stop(); setUri(rec.uri); await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); } catch { /* */ } setEtat('fait'); };
  if (etat === 'refus') return (<View style={{ gap: 12 }}><T v="corps">Le micro est refusé. Tu peux l'autoriser dans les réglages du téléphone, ou passer cet exercice.</T><Bouton label="Passer" variante="fantome" onPress={onFini} /></View>);
  return (
    <View style={{ gap: 14, alignItems: 'center' }}>
      <Son audio={modele} />
      <T v="petit">Écoute le modèle, puis dis-le à voix haute.</T>
      <Onde actif={etat === 'enreg'} barres={20} />
      {etat === 'attente' && <Bouton label="Enregistrer ma voix" icone="micro" onPress={commencer} />}
      {etat !== 'fait' && <Pressable onPress={onFini} accessibilityRole="button" accessibilityLabel="Passer cet exercice" hitSlop={10}><T v="petit" style={{ textDecorationLine: 'underline' }}>Passer cet exercice</T></Pressable>}
      {etat === 'enreg' && <Bouton label="Arrêter" icone="pause" variante="ambre" onPress={arreter} />}
      {etat === 'fait' && <>
        <Pressable onPress={() => { lecteur.seekTo(0); lecteur.play(); }} accessibilityRole="button" style={{ flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10 }}><Ic nom="lecture" taille={20} couleur={c.accent} /><T v="corps" couleur={c.accent}>Réécouter ma voix</T></Pressable>
        <Bouton label="Continuer" onPress={onFini} />
        <Pressable onPress={() => setEtat('attente')} accessibilityRole="button"><T v="petit" style={{ textDecorationLine: 'underline' }}>Recommencer</T></Pressable>
      </>}
    </View>
  );
}

function Question({ ex, onRepondre, enfant }: { ex: Exercice; onRepondre: (juste: boolean) => void; enfant: boolean }) {
  const { c } = useTheme();
  const [choisi, setChoisi] = useState<string | null>(null);
  const [mots, setMots] = useState<string[]>([]);
  const [verifie, setVerifie] = useState<boolean | null>(null);
  const opts = useMemo(() => optionsDe(ex), [ex.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setChoisi(null); setMots([]); setVerifie(null); }, [ex.id]);

  if (ex.type === 'ecouter') return (
    <View style={{ alignItems: 'center', gap: 18 }}>
      <Visuel uri={ex.image} largeur={enfant ? 220 : 180} hauteur={enfant ? 220 : 180} rayon={28} icone="image" />
      <T v="titre" style={{ textAlign: 'center', fontStyle: 'italic' }}>{ex.mot_myene}</T>
      {!enfant && <T v="corps">{ex.mot_francais}</T>}
      <Son audio={ex.audio} auto grand />
      <Bouton label={enfant ? 'Suivant' : 'J\'ai répété'} onPress={() => onRepondre(true)} />
    </View>
  );
  if (ex.type === 'dire') return (<View style={{ gap: 14, alignItems: 'center' }}><T v="titre" style={{ fontStyle: 'italic' }}>{ex.mot_myene}</T><T v="corps">{ex.mot_francais}</T><Dire modele={ex.audio} onFini={() => onRepondre(true)} /></View>);

  if (ex.type === 'ordre') {
    const restants = opts.filter((_, i) => !mots.includes(String(i)));
    return (
      <View style={{ gap: 18 }}>
        <Carte plat style={{ minHeight: 92, padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {mots.length === 0 && <T v="petit">Touche les mots dans l'ordre</T>}
          {mots.map(i => <Pressable key={i} disabled={verifie !== null} accessibilityRole="button" onPress={() => setMots(m => m.filter(x => x !== i))} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: c.accent }}><T v="corps" couleur={c.surAccent}>{opts[Number(i)]}</T></Pressable>)}
        </Carte>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {opts.map((m, i) => !mots.includes(String(i)) && <Pressable key={i} accessibilityRole="button" disabled={verifie !== null} onPress={() => setMots(a => [...a, String(i)])} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord }}><T v="corps">{m}</T></Pressable>)}
        </View>
        {restants.length === 0 && verifie === null && <Bouton label="Vérifier" onPress={() => { const ok = jugerReponse(ex, mots.map(i => opts[Number(i)])); setVerifie(ok); setTimeout(() => onRepondre(ok), 900); }} />}
        {verifie !== null && <T v="carte" couleur={verifie ? c.succes : c.erreur}>{verifie ? 'Akéwa ! C\'est juste.' : `La phrase : ${ex.reponse}`}</T>}
      </View>
    );
  }

  // associer et choix
  const fin = (o: string) => { if (choisi) return; setChoisi(o); const ok = jugerReponse(ex, o); setTimeout(() => onRepondre(ok), ok ? 700 : 1500); };
  return (
    <View style={{ gap: 14 }}>
      {ex.mot_myene && <T v="titre" style={{ textAlign: 'center', fontStyle: 'italic' }}>{ex.mot_myene}</T>}
      {ex.image && <View style={{ alignItems: 'center' }}><Visuel uri={ex.image} largeur={160} hauteur={160} rayon={24} /></View>}
      {ex.audio && <View style={{ alignItems: 'center' }}><Son audio={ex.audio} /></View>}
      <View style={enfant ? { gap: 10, flexDirection: 'row', flexWrap: 'wrap' } : { gap: 10 }}>
        {opts.map(o => {
          const bonne = jugerReponse(ex, o);
          const etat = choisi ? (bonne ? 'ok' : choisi === o ? 'ko' : 'neutre') : 'neutre';
          return (
            <Pressable key={o} accessibilityRole="button" accessibilityLabel={o} disabled={!!choisi} onPress={() => fin(o)}
              style={{ minHeight: enfant ? 96 : 56, flexGrow: 1, flexBasis: enfant ? '45%' : undefined, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center', alignItems: enfant ? 'center' : 'flex-start', borderWidth: 2, backgroundColor: etat === 'ok' ? c.succes + '33' : etat === 'ko' ? c.erreur + '33' : c.carte, borderColor: etat === 'ok' ? c.succes : etat === 'ko' ? c.erreur : c.bord }}>
              <T v={enfant ? 'carte' : 'corps'} fort>{o}</T>
            </Pressable>
          );
        })}
      </View>
      {choisi && !jugerReponse(ex, choisi) && !!ex.indice && <T v="petit" accessibilityRole="alert">{ex.indice}</T>}
    </View>
  );
}

/** Joue une liste d'exercices. `onFin` reçoit les résultats. Aucune publicité pendant la leçon. */
export function LeconRunner({ titre, exercices, onFin, onQuitter, notes }: { titre: string; exercices: Exercice[]; onFin: (e: EtatLecon) => void; onQuitter: () => void; notes?: boolean }) {
  const { prefs } = usePrefs();
  const [etat, setEtat] = useState<EtatLecon>(nouvelleLecon());
  useSansPublicite(true);
  const enfant = prefs.mode === 'enfant';
  const ex = exercices[etat.index];
  if (!ex) { return (<Ecran><T v="corps">Cette leçon n'a pas encore d'exercices.</T><Bouton label="Retour" onPress={onQuitter} /></Ecran>); }
  const suite = (juste: boolean) => {
    const note = ex.type === 'ecouter' || ex.type === 'dire' ? null : juste;
    const n = avancerLecon(etat, exercices, note === null ? true : note);
    const corrige = note === null ? { ...n, bonnes: etat.bonnes, erreurs: etat.erreurs } : n;
    setEtat(corrige);
    if (corrige.termine) onFin(corrige);
  };
  return (
    <Ecran>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quitter la leçon" onPress={onQuitter} hitSlop={10}><Ic nom="fermer" taille={26} /></Pressable>
        <View style={{ flex: 1 }}><Barre valeur={etat.index / exercices.length} /></View>
        <T v="petit">{etat.index + 1}/{exercices.length}</T>
      </View>
      <T v="libelle">{titre}</T>
      {!enfant && !!ex.consigne && <T v="sousTitre">{ex.consigne}</T>}
      <Question ex={ex} onRepondre={suite} enfant={enfant} />
    </Ecran>
  );
}

export function FinLecon({ lecon, resultat, xpGagne, onSuite }: { lecon: Lecon; resultat: EtatLecon; xpGagne: number; onSuite: () => void }) {
  const { prefs } = usePrefs();
  const { c } = useTheme();
  const { donnees } = useProgres();
  const j = justesse(resultat);
  return (
    <Ecran contenu={{ alignItems: 'center' }}>
      {!prefs.animations.startsWith('a') && <Confettis declencheur nombre={prefs.animations === 'legeres' ? mouvement.confettisModeste : 40} />}
      <Mascotte taille={140} humeur="content" />
      <T v="titre" style={{ textAlign: 'center' }}>Leçon terminée !</T>
      <T v="corps" style={{ textAlign: 'center' }}>{lecon.titre}</T>
      <View style={{ flexDirection: 'row', gap: 12, alignSelf: 'stretch' }}>
        {[['XP', `+${xpGagne}`], ['Justesse', `${j} %`], ['Série', `${donnees.serie ?? 1} j`]].map(([l, v]) => <Carte key={l} style={{ flex: 1, padding: 14, alignItems: 'center' }}><T v="titre" couleur={c.accent}>{v}</T><T v="petit">{l}</T></Carte>)}
      </View>
      <Bouton label="Continuer" variante="ambre" onPress={onSuite} />
    </Ecran>
  );
}

/** Contrôle de fin d'unité : 5 questions tirées des exercices de l'unité ; 4 bonnes réponses valident. */
export function ControleUnite({ unite, exercices, onFin, onQuitter }: { unite: Unite; exercices: Exercice[]; onFin: (bonnes: number, sur: number) => void; onQuitter: () => void }) {
  const notes = useMemo(() => melanger(exercices.filter(e => e.type === 'associer' || e.type === 'choix' || e.type === 'ordre')).slice(0, SEUIL_UNITE.sur), [unite.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (notes.length === 0) return (<Ecran><T v="corps">Il n'y a pas encore de questions de contrôle pour cette unité.</T><Bouton label="Retour" onPress={onQuitter} /></Ecran>);
  return <LeconRunner titre={`Contrôle · ${unite.titre}`} exercices={notes} notes onQuitter={onQuitter} onFin={e => onFin(e.bonnes, notes.length)} />;
}

export function Certificat({ parcours, nom, onFermer }: { parcours: Parcours; nom: string; onFermer: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <Ecran>
      <Carte style={{ padding: 28, alignItems: 'center', gap: 12, borderWidth: 2, borderColor: c.accent }}>
        <Mascotte taille={90} humeur="content" />
        <T v="libelle">Certificat de réussite</T>
        <T v="titre" style={{ textAlign: 'center' }}>{nom || 'Apprenant·e Nkala'}</T>
        <T v="corps" style={{ textAlign: 'center' }}>a terminé le parcours</T>
        <T v="sousTitre" couleur={c.accent} style={{ textAlign: 'center' }}>{parcours.titre}</T>
        <T v="petit">{date} · Onenji, Nkala</T>
      </Carte>
      <Bouton label="Partager" icone="partage" onPress={async () => { try { await Share.share({ message: `J'ai terminé le parcours « ${parcours.titre} » sur Nkala (Onenji) le ${date}.` }); } catch { toast('Partage impossible.', 'erreur'); } }} />
      <Bouton label="Fermer" variante="fantome" onPress={onFermer} />
    </Ecran>
  );
}
