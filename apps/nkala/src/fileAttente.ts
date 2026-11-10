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

/** Un seul accès à la file à la fois : un renvoi en cours ne doit pas écraser une contribution ajoutée entre-temps. */
let verrou: Promise<unknown> = Promise.resolve();
const exclusif = <T,>(f: () => Promise<T>): Promise<T> => {
  const r = verrou.then(f, f);
  verrou = r.catch(() => {});
  return r;
};

const retirer = (ids: Set<string>) => exclusif(async () => ecrire((await lire()).filter(e => !ids.has(e.contribution.id))));
const supprimerCopie = (uri?: string) => {
  if (uri && uri.startsWith(FileSystem.documentDirectory || '\0')) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
};

/**
 * Écrit D'ABORD sur l'appareil (réponses + copie durable de l'audio), puis tente l'envoi.
 * Si la connexion se coupe, si l'application est fermée ou le téléphone redémarre en plein envoi,
 * la contribution est déjà en sûreté et sera renvoyée au retour du réseau.
 */
export async function soumettre(contribution: Contribution, audioUri?: string, mime?: string): Promise<'envoye' | 'en_attente' | 'refuse'> {
  let uri = audioUri;
  // Le cache système peut être vidé : l'audio est copié dans un dossier durable avant tout.
  if (uri && Platform.OS !== 'web' && FileSystem.documentDirectory && !uri.startsWith(FileSystem.documentDirectory)) {
    const dest = `${FileSystem.documentDirectory}${contribution.id}.${(mime || '').includes('mp4') ? 'm4a' : 'audio'}`;
    try { await FileSystem.copyAsync({ from: uri, to: dest }); uri = dest; } catch { /* on garde l'adresse d'origine */ }
  }
  const el: Element = { contribution, audioUri: uri, mime };
  try {
    await exclusif(async () => ecrire([...(await lire()).filter(e => e.contribution.id !== contribution.id), el]));
  } catch {
    // Stockage plein ou refusé : envoi direct sans filet ; en cas d'échec on le dit, au lieu de prétendre avoir sauvegardé.
    const r = await envoyerUn(el);
    if (r === 'ok') return 'envoye';
    if (r === 'refus') return 'refuse';
    throw new Error('Impossible de sauvegarder sur l’appareil (espace insuffisant ?)');
  }
  const r = await envoyerUn(el);
  if (r === 'ok' || r === 'refus') {
    await retirer(new Set([contribution.id]));
    supprimerCopie(uri);
    return r === 'ok' ? 'envoye' : 'refuse';
  }
  return 'en_attente';
}

let renvoiEnCours: Promise<number> | null = null;

/** Rejoue la file (démarrage, retour du réseau). L'identifiant stable évite les doublons côté serveur. */
export function rejouerFile(): Promise<number> {
  if (renvoiEnCours) return renvoiEnCours; // un seul renvoi à la fois
  renvoiEnCours = (async () => {
    const file = await exclusif(lire);
    let envoyes = 0;
    let n = 0;
    if (file.length) definirSync({ genre: 'envoi', fait: 0, total: file.length });
    for (const el of file) {
      const r = await envoyerUn(el);
      definirSync({ genre: 'envoi', fait: ++n, total: file.length });
      if (r === 'ok' || r === 'refus') {
        if (r === 'ok') envoyes++;
        supprimerCopie(el.audioUri);
        await retirer(new Set([el.contribution.id])); // retiré au fur et à mesure : une coupure en cours de route ne perd rien
      }
    }
    if (lireSync().genre === 'envoi') definirSync({ genre: null, fait: 0, total: 0 });
    return envoyes;
  })().finally(() => { renvoiEnCours = null; });
  return renvoiEnCours;
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
  const cible = (await lire()).find(e => e.contribution.id === id);
  supprimerCopie(cible?.audioUri);
  await retirer(new Set([id]));
}
