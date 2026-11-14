/**
 * Onenji : leçon interactive en 9 étapes (écouter, voir, dire, écrire, comprendre, proverbe, culture, jouer, vérifier), fin de leçon,
 * contrôle d'unité (4 sur 5), certificat numéroté. Dialecte et source affichés sous chaque exercice, écoute lente à 0,7×.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import { avancerLecon, composerTestNiveau, etapeDe, etapeParAge, ETAPES_UNITE, exerciceNote, jugerReponse, justesse, melanger, nouvelleLecon, optionsDe, placementTest, repliques, SEUIL_UNITE, testTermine, TYPES_NOTES, type EtatLecon, type Exercice, type Lecon, type Parcours, type Unite } from '@nkala/noyau';
import { useMedia } from './OnenjiHorsLigne';
import { consignes, KakIgonjoFeuille, useIaCours } from './KakIgonjoCours';
import { noterReponse } from './OnenjiEtat';
import { Confettis } from './Confettis';
import { Bouton, Carte, Champ, Chargement, Ecran, Ic, Mascotte, Onde, Barre, T, Visuel } from './kit';
import { useSansPublicite } from './Pub';
import { usePrefs, useTheme } from './Prefs';
import { useProgres } from './Progres';
import { useAuth } from './AuthProvider';
import { mouvement } from './theme';

/**
 * Lecture d'un son : copie hors ligne, adresse du stockage ou https. Sans fichier, le bouton l'indique (aucune voix de synthèse : elle déformerait le myènè).
 * `lent` ajoute l'écoute lente (0,7×, maquettes du 10 nov.).
 */
export function Son({ audio, auto, grand, lent }: { audio?: string | null; auto?: boolean; grand?: boolean; lent?: boolean }) {
  const { c } = useTheme();
  const url = useMedia(audio);
  const player = useAudioPlayer(url ? { uri: url } : null);
  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); }, []);
  useEffect(() => { if (url && auto) { try { player.play(); } catch { /* */ } } }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  const jouer = (vitesse: number) => { try { player.setPlaybackRate(vitesse, 'high'); } catch { /* lecteur sans réglage de vitesse */ } player.seekTo(0); player.play(); };
  const t = grand ? 88 : 56;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={audio ? 'Écouter' : 'Audio bientôt disponible'} disabled={!url} onPress={() => jouer(1)}
        style={{ width: t, height: t, borderRadius: t / 2, backgroundColor: url ? c.accent : c.carte, borderWidth: 1, borderColor: c.bord, alignItems: 'center', justifyContent: 'center', opacity: audio ? 1 : 0.5 }}>
        <Ic nom={audio ? 'haut_parleur' : 'muet'} taille={t * 0.45} couleur={url ? c.surAccent : c.discret} />
      </Pressable>
      {lent && !!url && <Pressable accessibilityRole="button" accessibilityLabel="Écouter lentement" hitSlop={8} onPress={() => jouer(0.7)}
        style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: c.bord, backgroundColor: c.carte }}><T v="petit" fort>0,7× lent</T></Pressable>}
    </View>
  );
}

/** Image d'un exercice (copie hors ligne ou stockage). */
function Image2({ src, taille, rayon = 24 }: { src?: string | null; taille: number; rayon?: number }) {
  const uri = useMedia(src);
  return <Visuel uri={uri} largeur={taille} hauteur={taille} rayon={rayon} icone="image" />;
}

const LIBELLES_DIALECTE: Record<string, string> = { orungu: 'Ôrungu', mpongwe: 'Mpongwè', galwa: 'Galwa', galoa: 'Galwa', nkomi: 'Nkomi', adyumba: 'Adyumba', enenga: 'Enenga' };
export const libelleDialecte = (d?: string | null) => { const k = (d ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); return LIBELLES_DIALECTE[k] ?? (d ? d.charAt(0).toUpperCase() + d.slice(1) : ''); };

/** Dialecte et source de l'exercice (audit §3.E, maquettes du 10 nov.) : toujours visibles sous l'exercice. */
function Provenance({ ex }: { ex: Exercice }) {
  const { c } = useTheme();
  if ((!ex.dialecte && !ex.source) || ex.type === 'jouer') return null;
  return <T v="petit" style={{ color: c.discret, textAlign: 'center' }}>{[ex.dialecte ? libelleDialecte(ex.dialecte) : null, ex.source ? `Source : ${ex.source}` : null].filter(Boolean).join(' · ')}</T>;
}
/** Conseil culturel en bulle. */
function Conseil({ texte }: { texte?: string | null }) {
  const { c } = useTheme();
  if (!texte) return null;
  return (
    <View accessibilityRole="text" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 16, borderTopLeftRadius: 4, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bordAmbre }}>
      <Mascotte taille={30} humeur="parle" /><T v="petit" style={{ flex: 1 }}>{texte}</T>
    </View>
  );
}
/** Carte de lecture (cours, proverbe, culture) : titre, traduction, son, texte. */
function CarteLecture({ ex, enfant, libelle, onSuite, bouton = 'Continuer' }: { ex: Exercice; enfant: boolean; libelle: string; onSuite: () => void; bouton?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 16, alignItems: 'center' }}>
      <T v="libelle" couleur={c.accent}>{libelle}</T>
      {!!ex.image && <Image2 src={ex.image} taille={enfant ? 220 : 170} rayon={28} />}
      {!!ex.mot_myene && <T v="titre" style={{ textAlign: 'center', fontStyle: 'italic' }}>{ex.mot_myene}</T>}
      {!!ex.mot_francais && <T v="corps" style={{ textAlign: 'center' }}>{ex.mot_francais}</T>}
      {!!ex.audio && <Son audio={ex.audio} auto lent grand={ex.type === 'cours'} />}
      {!!ex.texte && <Carte plat style={{ alignSelf: 'stretch' }}><View style={{ padding: 14, gap: 8 }}>{ex.texte.split(/\n{2,}/).map((p, i) => <T key={i} v="corps">{p}</T>)}</View></Carte>}
      <Bouton label={bouton} onPress={onSuite} />
    </View>
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

export function Question({ ex, onRepondre, enfant }: { ex: Exercice; onRepondre: (juste: boolean) => void; enfant: boolean }) {
  const { c } = useTheme();
  const [choisi, setChoisi] = useState<string | null>(null);
  const [mots, setMots] = useState<string[]>([]);
  const [verifie, setVerifie] = useState<boolean | null>(null);
  const [texte, setTexte] = useState('');
  const opts = useMemo(() => optionsDe(ex), [ex.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setChoisi(null); setMots([]); setVerifie(null); setTexte(''); }, [ex.id]);

  if (ex.type === 'ecouter') return (
    <View style={{ alignItems: 'center', gap: 18 }}>
      <Image2 src={ex.image} taille={enfant ? 220 : 180} rayon={28} />
      <T v="titre" style={{ textAlign: 'center', fontStyle: 'italic' }}>{ex.mot_myene}</T>
      {!enfant && <T v="corps">{ex.mot_francais}</T>}
      <Son audio={ex.audio} auto grand lent={!enfant} />
      <Bouton label={enfant ? 'Suivant' : 'J\'ai répété'} onPress={() => onRepondre(true)} />
    </View>
  );
  if (ex.type === 'dire') return (<View style={{ gap: 14, alignItems: 'center' }}><T v="titre" style={{ fontStyle: 'italic' }}>{ex.mot_myene}</T><T v="corps">{ex.mot_francais}</T><Dire modele={ex.audio} onFini={() => onRepondre(true)} /></View>);

  // étape « cours » : on montre et on fait entendre avant de contrôler
  if (ex.type === 'cours') return <CarteLecture ex={ex} enfant={enfant} libelle="À découvrir" onSuite={() => onRepondre(true)} bouton="J'ai compris" />;
  if (ex.type === 'proverbe') return <CarteLecture ex={ex} enfant={enfant} libelle="Un proverbe" onSuite={() => onRepondre(true)} />;
  if (ex.type === 'culture') return <CarteLecture ex={ex} enfant={enfant} libelle="Bon à savoir" onSuite={() => onRepondre(true)} />;

  // étape « jouer » : un jeu gratuit d'Azeva sur les mots de l'unité (la leçon continue au retour)
  if (ex.type === 'jouer') return (
    <View style={{ gap: 16, alignItems: 'center' }}>
      <Mascotte taille={110} humeur="content" />
      <T v="sousTitre" style={{ textAlign: 'center' }}>{ex.mot_francais || 'À toi de jouer'}</T>
      <T v="corps" style={{ textAlign: 'center' }}>Les jeux sont gratuits. Tu reviens ici quand tu as fini.</T>
      {!!ex.jeu_id && <Bouton label="Jouer maintenant" icone="jouer" variante="ambre" onPress={() => { router.push({ pathname: '/(tabs)/azeva', params: { jeu: ex.jeu_id! } }); }} />}
      <Bouton label={ex.jeu_id ? 'Plus tard, continuer la leçon' : 'Continuer'} variante={ex.jeu_id ? 'fantome' : 'brique'} onPress={() => onRepondre(true)} />
    </View>
  );

  // étape « écrire » : dictée (on entend, on écrit ; sans son, on écrit d'après la traduction)
  if (ex.type === 'dictee') {
    const valider = () => { if (verifie !== null || !texte.trim()) return; const ok = jugerReponse(ex, texte); setVerifie(ok); setTimeout(() => onRepondre(ok), ok ? 900 : 2200); };
    return (
      <View style={{ gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          {ex.audio ? <Son audio={ex.audio} auto grand lent /> : <Ic nom="crayon" taille={40} couleur={c.accent} />}
          <T v="petit">{ex.audio ? 'Écoute autant de fois que tu veux, puis écris ce que tu entends.' : 'Écris le mot en myènè.'}</T>
        </View>
        {!!ex.mot_francais && <T v="sousTitre" style={{ textAlign: 'center' }}>« {ex.mot_francais} »</T>}
        <Champ valeur={texte} onChange={setTexte} placeholder="Écris en myènè" auto="none" onSubmit={valider} />
        {verifie === null ? <Bouton label="Vérifier" desactive={!texte.trim()} onPress={valider} />
          : <T v="carte" couleur={verifie ? c.succes : c.erreur} accessibilityRole="alert">{verifie ? 'Akéwa ! C\'est juste.' : `On écrit : ${(ex.reponse ?? '').split('/')[0].trim()}`}</T>}
        {verifie === false && !!ex.indice && <T v="petit">{ex.indice}</T>}
      </View>
    );
  }

  // étape « comprendre » : un petit dialogue ou texte, puis une question à choix
  if (ex.type === 'comprendre') {
    const lignes = repliques(ex.texte);
    const fin = (o: string) => { if (choisi) return; setChoisi(o); const ok = jugerReponse(ex, o); setTimeout(() => onRepondre(ok), ok ? 900 : 1800); };
    return (
      <View style={{ gap: 14 }}>
        {!!ex.audio && <View style={{ alignItems: 'center' }}><Son audio={ex.audio} lent /></View>}
        <Carte plat><View style={{ padding: 14, gap: 10 }}>
          {lignes.map((l, i) => {
            const droite = l.qui !== null && lignes.findIndex(x => x.qui === l.qui) % 2 === 1;
            return (
              <View key={i} style={{ alignSelf: l.qui === null ? 'center' : droite ? 'flex-end' : 'flex-start', maxWidth: '88%', gap: 2 }}>
                {l.qui !== null && <T v="petit" fort style={{ textAlign: droite ? 'right' : 'left' }}>{l.qui}</T>}
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: l.qui === null ? 'transparent' : droite ? c.accent + '22' : c.fond2 }}>
                  <T v="corps" style={{ fontStyle: l.qui === null ? 'normal' : 'italic' }}>{l.dit}</T>
                </View>
              </View>
            );
          })}
        </View></Carte>
        <View style={{ gap: 10 }}>
          {opts.map(o => {
            const bonne = jugerReponse(ex, o);
            const etat = choisi ? (bonne ? 'ok' : choisi === o ? 'ko' : 'neutre') : 'neutre';
            return (
              <Pressable key={o} accessibilityRole="button" accessibilityLabel={o} disabled={!!choisi} onPress={() => fin(o)}
                style={{ minHeight: 52, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 2, backgroundColor: etat === 'ok' ? c.succes + '33' : etat === 'ko' ? c.erreur + '33' : c.carte, borderColor: etat === 'ok' ? c.succes : etat === 'ko' ? c.erreur : c.bord }}>
                <T v="corps" fort>{o}</T>
              </Pressable>
            );
          })}
        </View>
        {choisi && !jugerReponse(ex, choisi) && !!ex.indice && <T v="petit" accessibilityRole="alert">{ex.indice}</T>}
      </View>
    );
  }

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

  // contrôle 6 : phrase à trous, on touche le mot qui manque (« ___ » dans mot_myene)
  if (ex.type === 'trou') {
    const phrase = ex.mot_myene ?? '';
    const m = /_{2,}/.exec(phrase);
    const avant = m ? phrase.slice(0, m.index).trimEnd() : phrase, apres = m ? phrase.slice(m.index + m[0].length).trimStart() : '';
    const place = (o: string) => { if (choisi) return; setChoisi(o); const ok = jugerReponse(ex, o); setVerifie(ok); setTimeout(() => onRepondre(ok), ok ? 900 : 1700); };
    return (
      <View style={{ gap: 18 }}>
        {ex.image && <View style={{ alignItems: 'center' }}><Image2 src={ex.image} taille={150} /></View>}
        {ex.audio && <View style={{ alignItems: 'center' }}><Son audio={ex.audio} /></View>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          {!!avant && <T v="sousTitre" style={{ fontStyle: 'italic' }}>{avant}</T>}
          <View style={{ minWidth: 90, minHeight: 46, paddingHorizontal: 10, borderRadius: 10, borderBottomWidth: 3, borderColor: verifie === null ? c.accent : verifie ? c.succes : c.erreur, backgroundColor: verifie === null ? c.squelette : verifie ? c.succes + '33' : c.erreur + '22', alignItems: 'center', justifyContent: 'center' }}>
            <T v="sousTitre" style={{ fontStyle: 'italic' }}>{verifie === false ? ex.reponse : choisi ?? ''}</T>
          </View>
          {!!apres && <T v="sousTitre" style={{ fontStyle: 'italic' }}>{apres}</T>}
        </View>
        {!!ex.mot_francais && !enfant && <T v="corps" style={{ textAlign: 'center' }}>{ex.mot_francais}</T>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {opts.map(o => <Pressable key={o} accessibilityRole="button" accessibilityLabel={o} disabled={!!choisi} onPress={() => place(o)} style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: choisi === o ? c.accent : c.carte, borderWidth: 2, borderColor: choisi === o ? c.accent : c.bord }}><T v="corps" fort couleur={choisi === o ? c.surAccent : c.fort}>{o}</T></Pressable>)}
        </View>
        {verifie === false && !!ex.indice && <T v="petit" accessibilityRole="alert">{ex.indice}</T>}
      </View>
    );
  }

  // contrôle 5 : la réponse s'écrit (plusieurs formes acceptées, séparées par « / » dans la colonne « reponse »)
  if (ex.type === 'saisie') {
    const valider = () => { if (verifie !== null || !texte.trim()) return; const ok = jugerReponse(ex, texte); setVerifie(ok); setTimeout(() => onRepondre(ok), ok ? 900 : 2000); };
    return (
      <View style={{ gap: 16 }}>
        {ex.image && <View style={{ alignItems: 'center' }}><Image2 src={ex.image} taille={160} /></View>}
        {ex.audio && <View style={{ alignItems: 'center' }}><Son audio={ex.audio} auto /></View>}
        {!!ex.mot_francais && <T v="titre" style={{ textAlign: 'center' }}>{ex.mot_francais}</T>}
        {!!ex.mot_myene && <T v="sousTitre" style={{ textAlign: 'center', fontStyle: 'italic' }}>{ex.mot_myene}</T>}
        <Champ valeur={texte} onChange={setTexte} placeholder="Écris ta réponse" onSubmit={valider} />
        {verifie === null ? <Bouton label="Vérifier" desactive={!texte.trim()} onPress={valider} />
          : <T v="carte" couleur={verifie ? c.succes : c.erreur} accessibilityRole="alert">{verifie ? 'Akéwa ! C\'est juste.' : `Réponse : ${(ex.reponse ?? '').split('/')[0].trim()}`}</T>}
        {verifie === false && !!ex.indice && <T v="petit">{ex.indice}</T>}
      </View>
    );
  }

  // associer et choix
  const fin = (o: string) => { if (choisi) return; setChoisi(o); const ok = jugerReponse(ex, o); setTimeout(() => onRepondre(ok), ok ? 700 : 1500); };
  return (
    <View style={{ gap: 14 }}>
      {ex.mot_myene && <T v="titre" style={{ textAlign: 'center', fontStyle: 'italic' }}>{ex.mot_myene}</T>}
      {ex.image && <View style={{ alignItems: 'center' }}><Image2 src={ex.image} taille={160} /></View>}
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
  const { c } = useTheme();
  const [etat, setEtat] = useState<EtatLecon>(nouvelleLecon());
  // Kak'Igonjo dans la leçon : « Pourquoi ? » après une erreur, « Aide-moi » sur l'exercice en cours (sans donner la réponse).
  const ia = useIaCours();
  const [derniereErreur, setDerniereErreur] = useState<Exercice | null>(null);
  const [aide, setAide] = useState<{ titre: string; consigne: string; affiche: string } | null>(null);
  useSansPublicite(true);
  const enfant = prefs.mode === 'enfant';
  const ex = exercices[etat.index];
  if (!ex) { return (<Ecran><T v="corps">Cette leçon n'a pas encore d'exercices.</T><Bouton label="Retour" onPress={onQuitter} /></Ecran>); }
  const suite = (juste: boolean) => {
    const note = exerciceNote(ex) ? juste : null;
    if (note !== null) { noterReponse(ex.id, note).catch(() => {}); setDerniereErreur(note ? null : ex); }
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <T v="libelle" style={{ flex: 1 }}>{titre} · {ETAPES_UNITE.find(x => x.id === etapeDe(ex))?.label}</T>
        {ia.raison !== 'enfant' && <Pressable accessibilityRole="button" accessibilityLabel="Demander de l'aide à Kak'Igonjo" hitSlop={8}
          onPress={() => setAide({ titre: "Kak'Igonjo t'aide", consigne: consignes.question(titre, ex), affiche: 'Aide-moi sur cet exercice, sans me donner la réponse.' })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: c.bord, backgroundColor: c.carte }}>
          <Mascotte taille={22} humeur="parle" /><T v="petit" fort>Aide</T>
        </Pressable>}
      </View>
      {!enfant && !!ex.consigne && <T v="sousTitre">{ex.consigne}</T>}
      {!enfant && !!ex.conseil && ex.type !== 'culture' && <Conseil texte={ex.conseil} />}
      {derniereErreur && ia.raison !== 'enfant' && (
        <Pressable accessibilityRole="button" onPress={() => { setAide({ titre: 'Pourquoi ?', consigne: consignes.expliquer(titre, derniereErreur), affiche: `Pourquoi la réponse était « ${(derniereErreur.reponse ?? '').split('/')[0].trim()} » ?` }); setDerniereErreur(null); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bordAmbre }}>
          <Mascotte taille={28} humeur="parle" /><T v="petit" style={{ flex: 1 }}>Tu t'es trompé juste avant. Kak'Igonjo t'explique pourquoi ?</T><Ic nom="suivant" taille={16} couleur={c.accent} />
        </Pressable>
      )}
      <Question ex={ex} onRepondre={suite} enfant={enfant} />
      <Provenance ex={ex} />
      {aide && <KakIgonjoFeuille visible onClose={() => setAide(null)} titre={aide.titre} consigne={aide.consigne} affiche={aide.affiche} />}
    </Ecran>
  );
}

export function FinLecon({ lecon, resultat, xpGagne, onSuite, exercices = [] }: { lecon: Lecon; resultat: EtatLecon; xpGagne: number; onSuite: () => void; exercices?: Exercice[] }) {
  const ia = useIaCours();
  const [pratique, setPratique] = useState(false);
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
      {ia.raison !== 'enfant' && exercices.some(e => e.mot_myene) && (
        <Carte onPress={() => setPratique(true)} label="Pratiquer avec Kak'Igonjo" style={{ alignSelf: 'stretch' }}><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14 }}>
          <Mascotte taille={44} humeur="parle" /><View style={{ flex: 1 }}><T v="carte">Pratiquer avec Kak'Igonjo</T><T v="petit">Une petite scène au village avec les mots de la leçon.</T></View><Ic nom="suivant" taille={18} couleur={c.discret} />
        </View></Carte>
      )}
      <Bouton label="Continuer" variante="ambre" onPress={onSuite} />
      {pratique && <KakIgonjoFeuille visible onClose={() => setPratique(false)} titre="Pratiquer avec Kak'Igonjo" consigne={consignes.pratiquer(lecon.titre, exercices)} affiche="Fais-moi pratiquer les mots de cette leçon." />}
    </Ecran>
  );
}

/** Contrôle de fin d'unité : 5 questions tirées des exercices de l'unité ; 4 bonnes réponses valident. */
export function ControleUnite({ unite, exercices, onFin, onQuitter }: { unite: Unite; exercices: Exercice[]; onFin: (bonnes: number, sur: number) => void; onQuitter: () => void }) {
  const notes = useMemo(() => melanger(exercices.filter(e => (TYPES_NOTES as readonly string[]).includes(e.type))).slice(0, SEUIL_UNITE.sur), [unite.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (notes.length === 0) return (<Ecran><T v="corps">Il n'y a pas encore de questions de contrôle pour cette unité.</T><Bouton label="Retour" onPress={onQuitter} /></Ecran>);
  return <LeconRunner titre={`Contrôle · ${unite.titre}`} exercices={notes} notes onQuitter={onQuitter} onFin={e => onFin(e.bonnes, notes.length)} />;
}

// ------------------------------------------------------------------ test de niveau (avant le premier cours ; décision du 13 nov. 2026)
/**
 * 10 à 15 questions de plus en plus difficiles (3 par étape), arrêt après 3 erreurs de suite. Le résultat donne l'étape et l'unité de départ.
 * Mode enfant : pas de questions écrites, l'étape vient de l'âge du profil.
 */
export function TestNiveau({ parcours, unites, lecons, exercices, onFini, onQuitter }: {
  parcours: Parcours[]; unites: Unite[]; lecons: Lecon[]; exercices: Exercice[];
  onFini: (r: { parcoursId: string; uniteId: string | null; bonnes: number; sur: number; parAge?: boolean }) => void; onQuitter: () => void;
}) {
  const { prefs } = usePrefs();
  const { profil } = useAuth();
  const { c } = useTheme();
  const questions = useMemo(() => composerTestNiveau(parcours, unites, lecons, exercices), [parcours, unites, lecons, exercices]);
  const [demarre, setDemarre] = useState(false);
  const [reponses, setReponses] = useState<boolean[]>([]);
  useSansPublicite(demarre);
  const enfant = prefs.mode === 'enfant';
  if (enfant) {
    const naissance = profil?.birthDate ? new Date(profil.birthDate).getTime() : NaN;
    const age = Number.isFinite(naissance) ? (Date.now() - naissance) / (365.25 * 24 * 3600 * 1000) : 5;
    const etape = etapeParAge(age);
    const p = parcours.find(x => x.etape_vie === etape || x.id === etape) ?? parcours[0];
    const u = p ? [...unites.filter(x => x.parcours_id === p.id)].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))[0] : undefined;
    return (
      <Ecran contenu={{ alignItems: 'center' }}>
        <Mascotte taille={130} humeur="content" />
        <T v="titre" style={{ textAlign: 'center' }}>On commence par {p?.titre ?? 'Ntina'} !</T>
        <Bouton label="C'est parti" variante="ambre" onPress={() => onFini({ parcoursId: p?.id ?? '', uniteId: u?.id ?? null, bonnes: 0, sur: 0, parAge: true })} />
      </Ecran>
    );
  }
  if (!demarre) return (
    <Ecran>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <Mascotte taille={120} humeur="parle" />
        <T v="titre" style={{ textAlign: 'center' }}>Le test de niveau</T>
        <T v="corps" style={{ textAlign: 'center' }}>Avant ton premier cours, Kak'Igonjo veut savoir d'où tu pars. Les questions deviennent de plus en plus difficiles ; le test s'arrête quand tu fais 3 erreurs de suite. Il est gratuit.</T>
        <T v="petit" style={{ textAlign: 'center' }}>{questions.length ? `${questions.length} questions au plus, environ ${Math.max(2, Math.round(questions.length / 2))} minutes.` : 'Les questions arrivent avec les premières leçons : tu commenceras par la première étape.'}</T>
      </View>
      <Bouton label={questions.length ? 'Commencer le test' : 'Commencer par la première étape'} variante="ambre" onPress={() => {
        if (!questions.length) { const r = placementTest([], [], parcours, unites); onFini({ ...r, bonnes: 0, sur: 0 }); return; }
        setDemarre(true);
      }} />
      <Bouton label="Plus tard" variante="fantome" onPress={onQuitter} />
    </Ecran>
  );
  const i = reponses.length, q = questions[i];
  const repondre = (juste: boolean) => {
    const r = [...reponses, juste];
    setReponses(r);
    if (testTermine(r, questions.length)) { const pl = placementTest(questions, r, parcours, unites); onFini({ ...pl, bonnes: r.filter(Boolean).length, sur: r.length }); }
  };
  if (!q) return <Ecran><Chargement /></Ecran>;
  const p = parcours.find(x => x.id === q.parcoursId);
  return (
    <Ecran>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quitter le test" onPress={onQuitter} hitSlop={10}><Ic nom="fermer" taille={26} /></Pressable>
        <View style={{ flex: 1 }}><Barre valeur={i / questions.length} /></View>
        <T v="petit">{i + 1}/{questions.length}</T>
      </View>
      <T v="libelle" couleur={p?.couleur ?? c.accent}>Test de niveau · {p?.titre}</T>
      {!!q.ex.consigne && <T v="sousTitre">{q.ex.consigne}</T>}
      <Question ex={q.ex} onRepondre={repondre} enfant={false} />
    </Ecran>
  );
}
