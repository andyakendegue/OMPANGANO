/**
 * Dictée vocale en français (demande de Capp, 22 nov. 2026) : parler en français → texte, avec la reconnaissance du téléphone
 * (iOS, Android ; Web Speech API sur le web), gratuite et, si l'appareil le permet, sans quitter le téléphone.
 * Module natif `expo-speech-recognition` (MIT) chargé au premier usage (natif.ts) : une version installée qui ne l'a pas encore
 * affiche « mettez l'application à jour » au lieu de planter. Le myènè n'est pas reconnu par les téléphones : sa reconnaissance
 * passera par le serveur (sons → graphie v3), à venir.
 */
import { useEffect, useRef, useState } from 'react';
import { MiseAJourNecessaire, moduleNatifPresent, moduleParesseux } from './natif';

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
