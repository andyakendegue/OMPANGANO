import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { resoudreMedia } from '@nkala/noyau';
import type { Piste } from './Lecteur';

/**
 * Écoute sans réseau : les titres en accès libre sont copiés dans le dossier privé de l'application (invisible hors de Nkala).
 * Les titres protégés (abonnement, niveau) ne se téléchargent pas encore : leur lecture hors ligne demandera une licence conservée
 * sur l'appareil et des segments chiffrés, prévus avec la protection de niveau 2.
 */
const CLE = 'nkala.telechargements.v1';
export interface Telecharge { id: string; titre: string; artiste: string; pochette?: string | null; couleur?: string | null; fichier: string; octets: number; le: number }

export const telechargeable = (p: Piste) => Platform.OS !== 'web' && !!p.audio_url && (!p.niveau_acces || p.niveau_acces === 'libre') && !p.protege;
const lire = async (): Promise<Telecharge[]> => { try { return JSON.parse((await AsyncStorage.getItem(CLE)) || '[]'); } catch { return []; } };
const ecrire = (l: Telecharge[]) => AsyncStorage.setItem(CLE, JSON.stringify(l)).catch(() => {});
const dossier = () => { const d = new Directory(Paths.document, 'ontci'); if (!d.exists) d.create(); return d; };

export const listerTelechargements = lire;
export async function uriLocale(id: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const t = (await lire()).find(x => x.id === id);
  if (!t) return null;
  try { return new File(t.fichier).exists ? t.fichier : null; } catch { return null; }
}
export async function telecharger(p: Piste): Promise<Telecharge> {
  if (!telechargeable(p)) throw new Error('Ce titre ne peut pas être téléchargé.');
  const url = /^https?:\/\//.test(p.audio_url!) ? p.audio_url! : await resoudreMedia(p.audio_url!);
  if (!url) throw new Error('Adresse du titre indisponible.');
  const ext = (/\.(mp3|m4a|aac|wav|ogg|flac)(\?|$)/i.exec(url)?.[1] || 'mp3').toLowerCase();
  const cible = new File(dossier(), `${p.id.replace(/[^A-Za-z0-9_-]/g, '_')}.${ext}`);
  if (cible.exists) cible.delete();
  const f = await File.downloadFileAsync(url, cible);
  const t: Telecharge = { id: p.id, titre: p.titre, artiste: p.artiste, pochette: p.pochette, couleur: p.couleur, fichier: f.uri, octets: f.size ?? 0, le: Date.now() };
  await ecrire([t, ...(await lire()).filter(x => x.id !== p.id)]);
  return t;
}
export async function supprimerTelechargement(id: string) {
  const l = await lire(); const t = l.find(x => x.id === id);
  try { if (t) { const f = new File(t.fichier); if (f.exists) f.delete(); } } catch { /* déjà supprimé */ }
  await ecrire(l.filter(x => x.id !== id));
}
export const espaceTelecharge = async () => (await lire()).reduce((s, t) => s + t.octets, 0);
