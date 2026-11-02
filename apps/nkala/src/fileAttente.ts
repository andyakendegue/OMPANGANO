import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { definirSync, lireSync } from './syncEtat';
import { cheminEnregistrement, envoyerContribution, isPermanentApiError, televerserMedia, type Contribution } from '@nkala/noyau';

const CLE = 'nkala_file_contributions';

interface Element { contribution: Contribution; audioUri?: string; mime?: string }

const lire = async (): Promise<Element[]> => {
  try { return JSON.parse((await AsyncStorage.getItem(CLE)) || '[]'); } catch { return []; }
};
const ecrire = (e: Element[]) => AsyncStorage.setItem(CLE, JSON.stringify(e));

export const nombreEnAttente = async () => (await lire()).length;

async function envoyerUn(el: Element): Promise<'ok' | 'refus' | 'reessayer'> {
  const c: Contribution & { audioStoragePath?: string } = { ...el.contribution };
  try {
    if (el.audioUri) {
      const mime = el.mime || 'audio/mp4';
      const blob = await (await fetch(el.audioUri)).blob();
      const chemin = c.audioStoragePath || cheminEnregistrement(c.userId, c.itemId, mime);
      if (!(await televerserMedia(chemin, blob, mime))) return 'reessayer';
      c.audioStoragePath = chemin;
      c.audioUrl = `media:${chemin}`;
    }
    await envoyerContribution(c);
    return 'ok';
  } catch (err) {
    return isPermanentApiError(err) ? 'refus' : 'reessayer';
  }
}

/** Envoie tout de suite ; en cas d'échec réseau, garde la contribution (et une copie de l'audio) sur l'appareil. */
export async function soumettre(contribution: Contribution, audioUri?: string, mime?: string): Promise<'envoye' | 'en_attente' | 'refuse'> {
  let uri = audioUri;
  const el: Element = { contribution, audioUri: uri, mime };
  const r = await envoyerUn(el);
  if (r === 'ok') return 'envoye';
  if (r === 'refus') return 'refuse';
  // Copie durable : le cache système peut être vidé avant le renvoi
  if (uri && Platform.OS !== 'web' && FileSystem.documentDirectory) {
    const dest = `${FileSystem.documentDirectory}${contribution.id}.${(mime || '').includes('mp4') ? 'm4a' : 'audio'}`;
    try { await FileSystem.copyAsync({ from: uri, to: dest }); uri = dest; } catch { /* on garde l'adresse d'origine */ }
  }
  await ecrire([...(await lire()), { contribution, audioUri: uri, mime }]);
  return 'en_attente';
}

/** Rejoue la file (démarrage, retour du réseau). L'identifiant stable évite les doublons côté serveur. */
export async function rejouerFile(): Promise<number> {
  const file = await lire();
  const reste: Element[] = [];
  let envoyes = 0;
  let traites = 0;
  if (file.length) definirSync({ genre: 'envoi', fait: 0, total: file.length });
  for (const el of file) {
    const r = await envoyerUn(el);
    definirSync({ genre: 'envoi', fait: ++traites, total: file.length });
    if (r === 'ok') { envoyes++; if (el.audioUri?.startsWith(FileSystem.documentDirectory || '\0')) FileSystem.deleteAsync(el.audioUri, { idempotent: true }).catch(() => {}); }
    else if (r === 'reessayer') reste.push(el);
  }
  await ecrire(reste);
  if (lireSync().genre === 'envoi') definirSync({ genre: null, fait: 0, total: 0 });
  return envoyes;
}

/** Contributions gardées sur l'appareil (affichage de la file d'attente). */
export async function listerFile(): Promise<{ id: string; texte: string; avecVoix: boolean; date: string }[]> {
  return (await lire()).map(e => ({ id: e.contribution.id, texte: e.contribution.originalMyeneText, avecVoix: !!e.audioUri, date: e.contribution.createdAt }));
}

/** Contributions en attente d'envoi, complètes (affichées dans « Mes contributions » avec la mention « Sur l'appareil »). */
export async function contributionsEnFile(): Promise<Contribution[]> {
  return (await lire()).map(e => ({ ...e.contribution, offlineQueued: true, audioUrl: e.audioUri ? e.audioUri : e.contribution.audioUrl }));
}

/** Retire une contribution encore sur l'appareil (et sa copie audio). */
export async function retirerDeLaFile(id: string): Promise<void> {
  const file = await lire();
  const cible = file.find(e => e.contribution.id === id);
  if (cible?.audioUri?.startsWith(FileSystem.documentDirectory || '\0')) FileSystem.deleteAsync(cible.audioUri, { idempotent: true }).catch(() => {});
  await ecrire(file.filter(e => e.contribution.id !== id));
}
