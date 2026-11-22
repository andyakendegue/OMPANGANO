/**
 * Dictée vocale en français (demande de Capp, 22 nov. 2026) : parler en français → texte, avec la reconnaissance du téléphone
 * (iOS, Android ; Web Speech API sur le web), gratuite et, si l'appareil le permet, sans quitter le téléphone.
 * Module natif `expo-speech-recognition` (MIT) chargé au premier usage (natif.ts) : une version installée qui ne l'a pas encore
 * affiche « mettez l'application à jour » au lieu de planter. Le myènè n'est pas reconnu par les téléphones : sa reconnaissance
 * passera par le serveur (sons → graphie v3), à venir.
 */
import { useEffect, useRef, useState } from 'react';
import { MiseAJourNecessaire, moduleNatifPresent, moduleParesseux } from './natif';
import { Platform } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { File } from 'expo-file-system';
import { api, ApiError } from '@nkala/noyau';

type ModuleDictee = {
  start(o: Record<string, unknown>): void;
  stop(): void;
  abort(): void;
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  isRecognitionAvailable(): boolean;
  addListener(evt: string, cb: (e: any) => void): { remove(): void };
};

const Dictee = moduleParesseux<ModuleDictee>(
  () => moduleNatifPresent('ExpoSpeechRecognition'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require('expo-speech-recognition').ExpoSpeechRecognitionModule,
);

/** Messages lisibles pour les erreurs de la reconnaissance. */
function messageErreur(code?: string): string {
  if (code === 'not-allowed') return 'Autorise le micro et la reconnaissance vocale dans les réglages du téléphone.';
  if (code === 'no-speech' || code === 'speech-timeout') return 'Je n\'ai rien entendu. Réessaie en parlant près du téléphone.';
  if (code === 'language-not-supported' || code === 'service-not-allowed') return 'La dictée en français n\'est pas disponible sur cet appareil.';
  if (code === 'network') return 'La dictée demande une connexion sur cet appareil.';
  return 'La dictée n\'a pas marché. Réessaie ou écris ta question.';
}

/**
 * Dictée : `demarrer()` écoute en français ; le texte reconnu arrive dans `onTexte` (en cours, puis final).
 * `arreter()` termine et garde le texte. Une seule dictée à la fois.
 */
export function useDictee(onTexte: (texte: string, final: boolean) => void, langue = 'fr-FR') {
  const [ecoute, setEcoute] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const abonnements = useRef<{ remove(): void }[]>([]);
  const rappel = useRef(onTexte);
  rappel.current = onTexte;

  const liberer = () => { abonnements.current.forEach(a => { try { a.remove(); } catch { /* déjà retiré */ } }); abonnements.current = []; };
  useEffect(() => () => { liberer(); try { if (ecoute) Dictee.abort(); } catch { /* module absent */ } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const demarrer = async () => {
    setErreur(null);
    try {
      if (!Dictee.isRecognitionAvailable()) { setErreur(messageErreur('service-not-allowed')); return; }
      const perm = await Dictee.requestPermissionsAsync();
      if (!perm.granted) { setErreur(messageErreur('not-allowed')); return; }
      liberer();
      abonnements.current = [
        Dictee.addListener('result', e => { const t = e?.results?.[0]?.transcript; if (typeof t === 'string') rappel.current(t, !!e.isFinal); }),
        Dictee.addListener('error', e => { setErreur(messageErreur(e?.error)); setEcoute(false); }),
        Dictee.addListener('end', () => { setEcoute(false); liberer(); }),
      ];
      Dictee.start({ lang: langue, interimResults: true, continuous: false, addsPunctuation: true, requiresOnDeviceRecognition: false });
      setEcoute(true);
    } catch (e) {
      setErreur(e instanceof MiseAJourNecessaire ? e.message : messageErreur());
      setEcoute(false);
    }
  };
  const arreter = () => { try { Dictee.stop(); } catch { /* module absent */ } };
  return { ecoute, erreur, demarrer, arreter };
}

// ------------------------------------------------------------------ myènè parlé (serveur : sons → graphie v3)

/** Fichier enregistré → base64 (téléphone : expo-file-system ; web : l'enregistrement est une adresse blob:). */
async function versBase64(uri: string): Promise<string> {
  if (Platform.OS !== 'web') return new File(uri).base64();
  const blob = await (await fetch(uri)).blob();
  return new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] ?? ''); r.onerror = () => ko(r.error); r.readAsDataURL(blob); });
}

export interface ReconnaissanceMyene { api: string; ecrit: string; duree_s: number | null; vide?: boolean; traduction?: { traduction: string } }

/**
 * Parler en myènè : `demarrer()` enregistre (30 s au plus), `arreter()` envoie au serveur, qui rend les sons reconnus et leur écriture
 * en graphie v3 (proposition à relire : le modèle n'a jamais entendu d'ôrungu). Le micro utilise expo-audio, déjà présent dans l'app.
 */
export function useParoleMyene(onEcrit: (r: ReconnaissanceMyene) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [etat, setEtatVisible] = useState<'repos' | 'ecoute' | 'analyse'>('repos');
  // Référence toujours à jour : l'arrêt automatique (30 s) ne doit pas lire un état périmé.
  const etatRef = useRef<'repos' | 'ecoute' | 'analyse'>('repos');
  const setEtat = (e: 'repos' | 'ecoute' | 'analyse') => { etatRef.current = e; setEtatVisible(e); };
  const [erreur, setErreur] = useState<string | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  const arreter = async () => {
    if (minuterie.current) { clearTimeout(minuterie.current); minuterie.current = null; }
    if (etatRef.current !== 'ecoute') return;
    setEtat('analyse');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('vide');
      const r = await api<ReconnaissanceMyene>('POST', '/v1/voix/reconnaitre', { audio_base64: await versBase64(uri) });
      if (r.vide || !r.ecrit) setErreur('Je n\'ai rien reconnu. Parle un peu plus fort, près du téléphone.');
      else onEcrit(r);
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'La reconnaissance du myènè n\'a pas marché. Réessaie.');
    } finally { setEtat('repos'); }
  };

  const demarrer = async () => {
    setErreur(null);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) { setErreur('Autorise le micro dans les réglages du téléphone.'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setEtat('ecoute');
      minuterie.current = setTimeout(() => { void arreter(); }, 30_000);
    } catch { setErreur('Impossible d\'utiliser le micro.'); setEtat('repos'); }
  };
  return { etat, erreur, demarrer, arreter };
}
