/**
 * Brouillon d'annonce de logement et file d'envoi de ses médias (sur le modèle de fileAttente.ts).
 * Tout est écrit D'ABORD sur l'appareil (AsyncStorage + copie durable des fichiers) : une coupure de réseau, la fermeture de l'app
 * ou un passage par la connexion ne fait rien perdre. Chaque partie (fichier, vignette, version HD) est envoyée une seule fois
 * vers le stockage par URL présignée ; l'envoi reprend là où il s'est arrêté au retour du réseau.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { demanderUrlEnvoi, isPermanentApiError, prefixeMediasAnnonce, type FicheLogement } from '@nkala/noyau';
import { nouvelId, type MediaLocal } from './medias';

const CLE = 'nkala_brouillon_logement';

export interface BaseBrouillon { titre: string; description: string; prix: string; ville: string; telephone: string; whatsappIdentique: boolean }
export interface BrouillonLogement {
  brouillonId: string;
  /** Annonce existante modifiée (sinon nouvelle). */
  annonceId?: string;
  etape: number;
  maj: number;
  base: BaseBrouillon;
  fiche: Omit<Partial<FicheLogement>, 'medias' | 'position'> & { position?: { lat: number; lng: number } };
  medias: MediaLocal[];
}

export function nouveauBrouillon(): BrouillonLogement {
  return {
    brouillonId: nouvelId(), etape: 0, maj: Date.now(),
    base: { titre: '', description: '', prix: '', ville: '', telephone: '', whatsappIdentique: true },
    fiche: { version: 1, transaction: 'location', periode: 'mois', pieces: {}, equipements: {}, conditions: {} },
    medias: [],
  };
}

/** Un seul accès à la fois : l'envoi en cours ne doit pas écraser une modification faite entre-temps. */
let verrou: Promise<unknown> = Promise.resolve();
const exclusif = <T,>(f: () => Promise<T>): Promise<T> => { const r = verrou.then(f, f); verrou = r.catch(() => {}); return r; };

export async function lireBrouillon(): Promise<BrouillonLogement | null> {
  try { const v = await AsyncStorage.getItem(CLE); return v ? (JSON.parse(v) as BrouillonLogement) : null; } catch { return null; }
}
export const ecrireBrouillon = (b: BrouillonLogement) => exclusif(() => AsyncStorage.setItem(CLE, JSON.stringify({ ...b, maj: Date.now() })).catch(() => {}));
/** Modifie le brouillon enregistré (utilisé par l'envoi, pour ne pas écraser ce que l'écran vient de changer). */
const modifier = (f: (b: BrouillonLogement) => void) => exclusif(async () => {
  const v = await AsyncStorage.getItem(CLE).catch(() => null);
  if (!v) return null;
  const b = JSON.parse(v) as BrouillonLogement;
  f(b);
  await AsyncStorage.setItem(CLE, JSON.stringify(b)).catch(() => {});
  return b;
});

const dossier = (brouillonId: string) => `${FileSystem.documentDirectory}annonces/${brouillonId}/`;

export async function effacerBrouillon(b?: BrouillonLogement | null) {
  await exclusif(() => AsyncStorage.removeItem(CLE).catch(() => {}));
  if (b && Platform.OS !== 'web' && FileSystem.documentDirectory) FileSystem.deleteAsync(dossier(b.brouillonId), { idempotent: true }).catch(() => {});
}

/** Le cache système peut être vidé : chaque fichier est copié dans un dossier durable propre au brouillon. */
export async function copierDurable(m: MediaLocal, brouillonId: string): Promise<MediaLocal> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) return m;
  const d = dossier(brouillonId);
  await FileSystem.makeDirectoryAsync(d, { intermediates: true }).catch(() => {});
  const copie = async (uri: string | undefined, suffixe: string) => {
    if (!uri || uri.startsWith(d)) return uri;
    const dest = `${d}${m.id}${suffixe}`;
    try { await FileSystem.copyAsync({ from: uri, to: dest }); return dest; } catch { return uri; }
  };
  const ext = m.type === 'video' ? (m.mime === 'video/quicktime' ? '.mov' : '.mp4') : '.jpg';
  return { ...m, uri: await copie(m.uri, ext), uriVignette: await copie(m.uriVignette, '_v.jpg'), uriHd: await copie(m.uriHd, '_hd.jpg') };
}

/** Chemins définitifs dans le stockage : annonces/{uid}/{brouillonId}/{id}.ext */
export function attribuerChemins(m: MediaLocal, uid: string, brouillonId: string): MediaLocal {
  const p = prefixeMediasAnnonce(uid, brouillonId);
  const ext = m.type === 'video' ? (m.mime === 'video/quicktime' ? 'mov' : 'mp4') : 'jpg';
  return {
    ...m, chemin: m.chemin || `${p}${m.id}.${ext}`,
    ...(m.uriVignette || m.cheminVignette ? { cheminVignette: m.cheminVignette || `${p}${m.id}_v.jpg` } : {}),
    ...(m.uriHd || m.cheminHd ? { cheminHd: m.cheminHd || `${p}${m.id}_hd.jpg` } : {}),
  };
}

async function envoyerFichier(uri: string, chemin: string, mime: string, octets: number): Promise<'ok' | 'refus' | 'reessayer'> {
  try {
    let taille = octets;
    let blob: Blob | null = null;
    if (Platform.OS === 'web') { blob = await (await fetch(uri)).blob(); taille = blob.size; }
    else { const i = await FileSystem.getInfoAsync(uri); if (!i.exists) return 'refus'; taille = ('size' in i && i.size) || octets; }
    const { uploadUrl, headers } = await demanderUrlEnvoi(chemin, mime, taille);
    if (Platform.OS === 'web') {
      const r = await fetch(uploadUrl, { method: 'PUT', headers, body: blob });
      return r.ok ? 'ok' : r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429 ? 'refus' : 'reessayer';
    }
    const r = await FileSystem.uploadAsync(uploadUrl, uri, { httpMethod: 'PUT', headers, uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT });
    return r.status >= 200 && r.status < 300 ? 'ok' : r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429 ? 'refus' : 'reessayer';
  } catch (e) {
    return isPermanentApiError(e) ? 'refus' : 'reessayer';
  }
}

export interface Progression { total: number; envoyes: number; enCours: boolean; erreurs: number; horsLigne: boolean }
const parties = (m: MediaLocal) => [
  { cle: 'principal' as const, uri: m.uri, chemin: m.chemin, mime: m.mime, octets: m.octets },
  { cle: 'vignette' as const, uri: m.uriVignette, chemin: m.cheminVignette, mime: 'image/jpeg', octets: m.octetsVignette ?? 0 },
  { cle: 'hd' as const, uri: m.uriHd, chemin: m.cheminHd, mime: 'image/jpeg', octets: m.octetsHd ?? 0 },
].filter(p => p.chemin);

export function progressionDe(b: BrouillonLogement | null): Omit<Progression, 'enCours' | 'horsLigne'> {
  let total = 0, envoyes = 0, erreurs = 0;
  for (const m of b?.medias ?? []) {
    if (m.erreur) erreurs++;
    for (const p of parties(m)) { total += p.octets || 1; if (m.envoye[p.cle]) envoyes += p.octets || 1; }
  }
  return { total, envoyes, erreurs };
}
export const tousEnvoyes = (b: BrouillonLogement | null) => !!b && b.medias.every(m => !m.erreur && parties(m).every(p => m.envoye[p.cle]));

let enCours = false;
/**
 * Envoie tout ce qui reste à envoyer du brouillon enregistré. `onMaj` reçoit le brouillon après chaque partie envoyée.
 * Renvoie false si l'envoi s'est arrêté (réseau) : il reprendra au prochain appel.
 */
export async function envoyerMedias(onMaj?: (b: BrouillonLogement) => void): Promise<boolean> {
  if (enCours) return false;
  enCours = true;
  try {
    const net = await NetInfo.fetch().catch(() => null);
    if (net && net.isConnected === false) return false;
    const b0 = await lireBrouillon();
    if (!b0) return true;
    for (const m0 of b0.medias) {
      for (const p of parties(m0)) {
        const actuel = (await lireBrouillon())?.medias.find(x => x.id === m0.id);
        if (!actuel || actuel.envoye[p.cle] || actuel.erreur) continue; // retiré ou déjà fait entre-temps
        if (!p.uri) {
          const b = await modifier(x => { const mm = x.medias.find(y => y.id === m0.id); if (mm) mm.erreur = 'Fichier perdu sur cet appareil : retirez-le et ajoutez-le de nouveau.'; });
          if (b) onMaj?.(b);
          continue;
        }
        const r = await envoyerFichier(p.uri, p.chemin!, p.mime, p.octets);
        if (r === 'reessayer') return false;
        const b = await modifier(x => {
          const mm = x.medias.find(y => y.id === m0.id);
          if (!mm) return;
          if (r === 'ok') mm.envoye = { ...mm.envoye, [p.cle]: true };
          else mm.erreur = 'Envoi refusé (format ou taille).';
        });
        if (b) onMaj?.(b);
      }
    }
    return tousEnvoyes(await lireBrouillon());
  } finally { enCours = false; }
}

/** Relance l'envoi dès que le réseau revient. Renvoie la fonction de désabonnement. */
export function relancerAuRetourDuReseau(f: () => void) {
  let avant: boolean | null = null;
  return NetInfo.addEventListener(s => {
    const co = !!s.isConnected && s.isInternetReachable !== false;
    if (co && avant === false) f();
    avant = co;
  });
}
