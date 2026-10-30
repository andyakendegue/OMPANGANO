/**
 * Envoi des enregistrements vocaux vers Firebase Storage.
 * Chemin : recordings/{uid}/{itemId}_{horodatage}.{extension réelle}
 * (voir storage.rules : chacun n'écrit que dans son dossier).
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

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

/** Envoie l'enregistrement ; renvoie null en cas d'échec (l'appelant le garde alors sur l'appareil). */
export async function uploadRecording(
  uid: string,
  itemId: string,
  blob: Blob
): Promise<{ url: string; path: string } | null> {
  try {
    const contentType = blob.type && blob.type.startsWith('audio/') ? blob.type.split(';')[0] : 'audio/webm';
    const safeItem = (itemId || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `recordings/${uid}/${safeItem}_${Date.now()}.${extensionForMime(contentType)}`;
    const audioRef = ref(storage, path);
    await uploadBytes(audioRef, blob, { contentType });
    const url = await getDownloadURL(audioRef);
    return { url, path };
  } catch (err) {
    console.warn("Envoi de l'enregistrement vers Storage impossible :", err);
    return null;
  }
}

/** Supprime un enregistrement de Storage (propriétaire ou administrateur, voir storage.rules). */
export async function deleteRecording(path: string): Promise<void> {
  if (!path || !path.startsWith('recordings/')) return;
  await deleteObject(ref(storage, path));
}
