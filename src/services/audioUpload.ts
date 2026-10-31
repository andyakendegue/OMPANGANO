/**
 * Envoi des enregistrements vocaux vers le stockage du VPS (Garage), par URL présignée.
 * Chemin : recordings/{uid}/{itemId}_{horodatage}.{extension réelle}
 * (le serveur n'accepte que le dossier de l'utilisateur, des fichiers audio, 15 Mo maximum).
 */
import { uploadMedia } from '../data/api';

/** Extension de fichier correspondant au type MIME réellement produit par le navigateur. */
export function extensionForMime(mime?: string): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('mp4') || m.includes('aac') || m.includes('m4a')) return 'm4a';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('wav')) return 'wav';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  return 'webm';
}

/** Reconstruit un Blob à partir d'une data URL (aperçu local). */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
  try {
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch {
    return null;
  }
}

/**
 * Envoie l'enregistrement ; renvoie null en cas d'échec (l'appelant le garde alors sur l'appareil).
 * `url` est un marqueur « media:{chemin} » : la lecture passe par resolveMediaUrl().
 */
export async function uploadRecording(
  uid: string,
  itemId: string,
  blob: Blob
): Promise<{ url: string; path: string } | null> {
  const contentType = blob.type && blob.type.startsWith('audio/') ? blob.type.split(';')[0] : 'audio/webm';
  const safeItem = (itemId || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `recordings/${uid}/${safeItem}_${Date.now()}.${extensionForMime(contentType)}`;
  const ok = await uploadMedia(path, blob, contentType);
  return ok ? { url: `media:${path}`, path } : null;
}
