/**
 * Médias des annonces de logement : prise de vue ou galerie, compression (photos 1600 px, 360° 4096 et 6000 px, vignettes 400 px),
 * vignette des vidéos, métadonnées de « Visite certifiée » (prise dans l'app, date, position au moment de la prise).
 */
import type * as ImagePickerT from 'expo-image-picker';
import type * as ManipulateurT from 'expo-image-manipulator';
import { moduleNatifPresent, moduleParesseux } from '../natif';
// Modules natifs absents des versions 0.1.0 (vc3, vc4) : chargés au premier usage seulement (règle M2), sinon l'app planterait au démarrage
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ImagePicker = moduleParesseux<typeof ImagePickerT>(() => moduleNatifPresent('ExponentImagePicker'), () => require('expo-image-picker'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Manipulateur = moduleParesseux<typeof ManipulateurT>(() => moduleNatifPresent('ExpoImageManipulator'), () => require('expo-image-manipulator'));
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { estEquirectangulaire, IMAGE_MAX_OCTETS, VIDEO_MAX_OCTETS, VIDEO_MAX_S, type MediaAnnonce, type TypeMedia } from '@nkala/noyau';

/** Média tel qu'il vit dans le brouillon : fichiers locaux + état d'envoi de chaque partie. */
export interface MediaLocal extends MediaAnnonce {
  mime: string;
  uri?: string; uriVignette?: string; uriHd?: string;
  octetsVignette?: number; octetsHd?: number;
  envoye: { principal?: boolean; vignette?: boolean; hd?: boolean };
  erreur?: string;
}

export const nouvelId = () => Crypto.randomUUID().replace(/-/g, '').slice(0, 20);

/** Demande l'accès à la position AVANT d'ouvrir l'appareil photo (deux fenêtres système en même temps se gênent sur iPhone). */
export async function autoriserPosition(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const p = await Location.getForegroundPermissionsAsync();
    if (p.granted) return true;
    if (!p.canAskAgain) return false;
    return (await Location.requestForegroundPermissionsAsync()).granted;
  } catch { return false; }
}

/** Lance la lecture de la position pendant que l'appareil photo est ouvert : elle est prête au retour. */
async function positionPourPrise(): Promise<() => Promise<{ lat: number; lng: number } | null>> {
  const ok = await autoriserPosition();
  if (!ok) return async () => null;
  const p = positionActuelle();
  return () => p;
}

/** Message lisible pour une erreur du sélecteur ou de l'appareil photo. */
export const messageErreurMedia = (e: unknown) => {
  const m = (e as Error)?.message || '';
  if (/mettez l'application à jour/i.test(m)) return m;
  if (/camera|cam[ée]ra/i.test(m) && /unavailable|not available|simulator/i.test(m)) return "Aucun appareil photo disponible sur cet appareil.";
  return m ? `L'appareil photo n'a pas pu s'ouvrir : ${m}` : "L'appareil photo n'a pas pu s'ouvrir.";
};

/** Position au moment de la prise (5 s au plus ; null si refusée ou indisponible). */
export async function positionActuelle(): Promise<{ lat: number; lng: number } | null> {
  try {
    if (Platform.OS === 'web') {
      return await new Promise(res => {
        if (!navigator.geolocation) return res(null);
        navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { timeout: 8000, enableHighAccuracy: true });
      });
    }
    const p = await Location.requestForegroundPermissionsAsync();
    if (!p.granted) return null;
    const l = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>(r => setTimeout(() => r(null), 8000)),
    ]);
    if (l) return { lat: l.coords.latitude, lng: l.coords.longitude };
    const d = await Location.getLastKnownPositionAsync();
    return d ? { lat: d.coords.latitude, lng: d.coords.longitude } : null;
  } catch { return null; }
}

const taille = async (uri: string): Promise<number> => {
  try { return (await (await fetch(uri)).blob()).size; } catch { return 0; }
};
async function octetsDe(uri: string): Promise<number> {
  if (Platform.OS === 'web') return taille(uri);
  try {
    const FS = await import('expo-file-system/legacy');
    const i = await FS.getInfoAsync(uri);
    return i.exists && 'size' in i ? (i.size ?? 0) : 0;
  } catch { return taille(uri); }
}

async function redimensionner(uri: string, largeurOrigine: number, max: number, qualite = 0.8) {
  const r = await Manipulateur.manipulateAsync(uri, largeurOrigine > max ? [{ resize: { width: max } }] : [], { compress: qualite, format: Manipulateur.SaveFormat.JPEG });
  return { uri: r.uri, largeur: r.width, hauteur: r.height, octets: await octetsDe(r.uri) };
}

export type Source = 'camera' | 'galerie';

async function permission(source: Source, video = false): Promise<string | null> {
  if (source === 'camera') {
    if (Platform.OS === 'web') return null;
    if (!(await ImagePicker.getCameraPermissionsAsync()).granted && !(await ImagePicker.getCameraPermissionsAsync()).canAskAgain)
      return "L'accès à l'appareil photo a été refusé. Autorisez-le dans Réglages > Nkala > Appareil photo.";
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) return "L'accès à l'appareil photo est refusé. Autorisez-le dans les réglages du téléphone.";
    if (video) { /* le micro est demandé par le sélecteur lui-même */ }
  } else if (Platform.OS !== 'web') {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return "L'accès aux photos est refusé. Autorisez-le dans les réglages du téléphone.";
  }
  return null;
}

/** Résultat brut d'une image choisie, avant la question « C'est une photo 360° ? ». */
export interface ImageChoisie {
  uri: string; largeur: number; hauteur: number; capturedInApp: boolean; capturedAt?: string; capturedLat?: number; capturedLng?: number; probable360: boolean;
  /** Panorama partiel (capture guidée) : angles couverts. */
  pano?: { haov: number; vaov: number; vOffset?: number };
}

export async function choisirImages(source: Source, maximum: number): Promise<{ images: ImageChoisie[]; erreur?: string }> {
  try {
    const err = await permission(source);
    if (err) return { images: [], erreur: err };
    const lirePos = source === 'camera' ? await positionPourPrise() : async () => null;
    const opts: ImagePickerT.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false, allowsMultipleSelection: source === 'galerie' && maximum > 1, selectionLimit: Math.max(1, maximum) };
    const r = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled) return { images: [] };
    const pos = await lirePos();
    return { images: versImages(r.assets, maximum, source, pos) };
  } catch (e) { return { images: [], erreur: messageErreurMedia(e) }; }
}
function versImages(assets: ImagePickerT.ImagePickerAsset[], maximum: number, source: Source, pos: { lat: number; lng: number } | null): ImageChoisie[] {
  const maintenant = new Date().toISOString();
  return assets.slice(0, maximum).map(a => ({
    uri: a.uri, largeur: a.width, hauteur: a.height, probable360: estEquirectangulaire(a.width, a.height),
    capturedInApp: source === 'camera', ...(source === 'camera' ? { capturedAt: maintenant, ...(pos ? { capturedLat: pos.lat, capturedLng: pos.lng } : {}) } : {}),
  }));
}

/** Une photo de la capture 360° guidée : appareil photo, avec l'EXIF (focale) pour calculer le champ de vision. */
export async function prendrePhoto360(): Promise<{ uri: string; largeur: number; hauteur: number; exif?: Record<string, unknown> | null } | { erreur: string } | null> {
  try {
    const err = await permission('camera');
    if (err) return { erreur: err };
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, exif: true });
    if (r.canceled || !r.assets[0]) return null;
    const a = r.assets[0];
    return { uri: a.uri, largeur: a.width, hauteur: a.height, exif: a.exif ?? null };
  } catch (e) { return { erreur: messageErreurMedia(e) }; }
}

/** Réduit une photo et la renvoie en data URI (pour l'assemblage du panorama). */
export async function reduireEnDataUri(uri: string, largeur: number, hauteur: number, max = 1280): Promise<string> {
  const action = largeur >= hauteur ? (largeur > max ? [{ resize: { width: max } }] : []) : (hauteur > max ? [{ resize: { height: max } }] : []);
  const r = await Manipulateur.manipulateAsync(uri, action, { compress: 0.82, format: Manipulateur.SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${r.base64}`;
}

/** Enregistre un data URI JPEG dans un fichier (téléphone) ; sur le web, le data URI sert tel quel. */
export async function fichierDepuisDataUri(data: string, nom: string): Promise<string> {
  if (Platform.OS === 'web') return data;
  const FS = await import('expo-file-system/legacy');
  const chemin = `${FS.cacheDirectory}${nom}`;
  await FS.writeAsStringAsync(chemin, data.replace(/^data:[^,]+,/, ''), { encoding: FS.EncodingType.Base64 });
  return chemin;
}

/** Photo : 1600 px ; 360° : 4096 px (+ 6000 px si l'original est plus grand) ; vignette 400 px. */
export async function preparerImage(img: ImageChoisie, type: Extract<TypeMedia, 'photo' | 'pano360'>, ordre: number): Promise<MediaLocal> {
  const id = nouvelId();
  const principal = await redimensionner(img.uri, img.largeur, type === 'pano360' ? 4096 : 1600, type === 'pano360' ? 0.85 : 0.8);
  const vignette = await redimensionner(principal.uri, principal.largeur, type === 'pano360' ? 800 : 400, 0.7);
  const hd = type === 'pano360' && img.largeur > 4096 ? await redimensionner(img.uri, img.largeur, 6000, 0.85) : null;
  if (principal.octets > IMAGE_MAX_OCTETS) throw new Error('Photo trop lourde même après compression.');
  return {
    id, type, chemin: '', ordre, mime: 'image/jpeg',
    uri: principal.uri, largeur: principal.largeur, hauteur: principal.hauteur, octets: principal.octets,
    uriVignette: vignette.uri, octetsVignette: vignette.octets,
    ...(hd && hd.octets <= IMAGE_MAX_OCTETS ? { uriHd: hd.uri, octetsHd: hd.octets } : {}),
    ...(img.capturedInApp ? { capturedInApp: true, capturedAt: img.capturedAt, capturedLat: img.capturedLat, capturedLng: img.capturedLng } : {}),
    ...(type === 'pano360' && img.pano ? { pano: img.pano } : {}),
    envoye: {},
  };
}

/** Vidéo : 60 s et 50 Mo au plus ; jamais de lecture automatique. */
export async function choisirVideo(source: Source, ordre: number): Promise<{ media?: MediaLocal; erreur?: string }> {
  try { return await choisirVideo0(source, ordre); } catch (e) { return { erreur: messageErreurMedia(e) }; }
}
async function choisirVideo0(source: Source, ordre: number): Promise<{ media?: MediaLocal; erreur?: string }> {
  const err = await permission(source, true);
  if (err) return { erreur: err };
  const lirePos = source === 'camera' ? await positionPourPrise() : async () => null;
  const opts: ImagePickerT.ImagePickerOptions = { mediaTypes: ['videos'], videoMaxDuration: VIDEO_MAX_S, videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium, quality: 0.7 };
  const r = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled || !r.assets[0]) return {};
  const a = r.assets[0];
  const dureeS = a.duration ? a.duration / 1000 : undefined;
  if (dureeS !== undefined && dureeS > VIDEO_MAX_S + 1) return { erreur: `Vidéo trop longue (${Math.round(dureeS)} s) : ${VIDEO_MAX_S} secondes au plus.` };
  const octets = a.fileSize || (await octetsDe(a.uri));
  if (octets > VIDEO_MAX_OCTETS) return { erreur: `Vidéo trop lourde (${Math.round(octets / 1048576)} Mo) : 50 Mo au plus. Filmez moins longtemps.` };
  if (!octets) return { erreur: 'Impossible de lire la taille de la vidéo.' };
  const mime = (a.mimeType && /quicktime|mov/.test(a.mimeType)) || a.uri.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
  let uriVignette: string | undefined, octetsVignette: number | undefined;
  if (Platform.OS !== 'web') {
    try {
      const { getThumbnailAsync } = await import('expo-video-thumbnails');
      const t = await getThumbnailAsync(a.uri, { time: 1000, quality: 0.6 });
      const v = await redimensionner(t.uri, t.width, 400, 0.7);
      uriVignette = v.uri; octetsVignette = v.octets;
    } catch { /* icône lecture à la place */ }
  }
  const pos = await lirePos();
  return {
    media: {
      id: nouvelId(), type: 'video', chemin: '', ordre, mime, uri: a.uri, octets, dureeS, largeur: a.width, hauteur: a.height,
      ...(uriVignette ? { uriVignette, octetsVignette } : {}),
      ...(source === 'camera' ? { capturedInApp: true, capturedAt: new Date().toISOString(), ...(pos ? { capturedLat: pos.lat, capturedLng: pos.lng } : {}) } : {}),
      envoye: {},
    },
  };
}
