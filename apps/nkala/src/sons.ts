import { Platform } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

/** Petits sons de l'interface (fichiers dans assets/sons). Jamais bloquant : une erreur est ignorée. */
const SOURCES = {
  succes: require('../assets/sons/succes.wav'),
  erreur: require('../assets/sons/erreur.wav'),
  niveau: require('../assets/sons/niveau.wav'),
  tap: require('../assets/sons/tap.wav')
} as const;
export type Son = keyof typeof SOURCES;

const joueurs: Partial<Record<Son, AudioPlayer>> = {};
export function jouerSon(nom: Son) {
  if (Platform.OS === 'web' && typeof window === 'undefined') return;
  try {
    const j = (joueurs[nom] ??= createAudioPlayer(SOURCES[nom]));
    j.volume = 0.6;
    void j.seekTo(0);
    j.play();
  } catch { /* le son n'est jamais indispensable */ }
}
