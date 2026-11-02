import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/** Écrit un fichier texte (UTF-8) puis ouvre la feuille de partage (mobile) ou le télécharge (web). */
export async function partagerFichier(nom: string, contenu: string, mime = 'text/csv'): Promise<void> {
  if (Platform.OS === 'web') {
    const doc = (globalThis as any).document;
    const url = URL.createObjectURL(new Blob([contenu], { type: `${mime};charset=utf-8` }));
    const a = doc.createElement('a');
    a.href = url; a.download = nom;
    doc.body.appendChild(a); a.click(); doc.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  const chemin = `${FileSystem.cacheDirectory}${nom}`;
  await FileSystem.writeAsStringAsync(chemin, contenu, { encoding: FileSystem.EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
  await Sharing.shareAsync(chemin, { mimeType: mime, dialogTitle: nom, UTI: 'public.comma-separated-values-text' });
}
