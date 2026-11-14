/**
 * Leçons hors ligne (audit Apprendre §8.6) : le texte des leçons est déjà gardé par la copie locale des contenus ;
 * ici on copie les sons et les images d'une unité dans le dossier privé de l'application (invisible hors de Nkala).
 * Seules les leçons que le compte peut ouvrir se téléchargent (gratuites ou couvertes par un forfait) : le cadenas reste juge.
 * Sur le web, rien n'est copié : le navigateur garde déjà ce qu'il a chargé.
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { resoudreMedia, type Exercice } from '@nkala/noyau';

const CLE = 'nkala.onenji.horsligne.v1';
/** source du média (colonne audio/image) -> fichier local */
type Carte = Record<string, { fichier: string; octets: number }>;
/** unité -> date du téléchargement */
type Unites = Record<string, number>;
let etat: { medias: Carte; unites: Unites } | undefined;
const ecouteurs = new Set<() => void>();
const prevenir = () => ecouteurs.forEach(f => f());

async function charger() {
  if (etat) return etat;
  try { const b = await AsyncStorage.getItem(CLE); etat = b ? JSON.parse(b) : { medias: {}, unites: {} }; } catch { etat = { medias: {}, unites: {} }; }
  return etat!;
}
const sauver = () => AsyncStorage.setItem(CLE, JSON.stringify(etat)).catch(() => {});
const dossier = () => { const d = new Directory(Paths.document, 'onenji'); if (!d.exists) d.create(); return d; };
const nomFichier = (src: string) => {
  let h = 0; for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) | 0;
  const ext = (/\.(mp3|m4a|aac|wav|ogg|jpg|jpeg|png|webp|gif)(\?|$)/i.exec(src)?.[1] || 'bin').toLowerCase();
  return `${(h >>> 0).toString(36)}_${src.length}.${ext}`;
};

export const horsLignePossible = Platform.OS !== 'web';

/** Adresse locale d'un média s'il a été téléchargé et existe encore, sinon null. */
export async function mediaLocal(src?: string | null): Promise<string | null> {
  if (!src || !horsLignePossible) return null;
  const e = await charger();
  const m = e.medias[src];
  if (!m) return null;
  try { return new File(m.fichier).exists ? m.fichier : null; } catch { return null; }
}

/** Adresse à afficher pour un média de leçon : copie locale, sinon adresse résolue (stockage signé ou https). */
export function useMedia(src?: string | null): string | null {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let annule = false; setUri(null);
    if (!src) return;
    (async () => {
      const local = await mediaLocal(src);
      const u = local ?? await resoudreMedia(src).catch(() => null);
      if (!annule) setUri(u || null);
    })();
    return () => { annule = true; };
  }, [src]);
  return uri;
}

const mediasDe = (ex: Exercice[]) => [...new Set(ex.flatMap(e => [e.audio, e.image]).filter((x): x is string => !!x))];

/** Télécharge les sons et images des exercices d'une unité. Renvoie le nombre de fichiers copiés et les échecs. */
export async function telechargerUnite(uniteId: string, exercices: Exercice[], progres?: (fait: number, total: number) => void): Promise<{ copies: number; echecs: number; total: number }> {
  if (!horsLignePossible) return { copies: 0, echecs: 0, total: 0 };
  const e = await charger();
  const liste = mediasDe(exercices);
  let copies = 0, echecs = 0, fait = 0;
  for (const src of liste) {
    try {
      if (!(await mediaLocal(src))) {
        const url = /^https?:\/\//.test(src) ? src : await resoudreMedia(src);
        if (!url || !/^https?:\/\//.test(url)) throw new Error('adresse');
        const cible = new File(dossier(), nomFichier(src));
        if (cible.exists) cible.delete();
        const f = await File.downloadFileAsync(url, cible);
        e.medias[src] = { fichier: f.uri, octets: f.size ?? 0 };
        copies++;
      }
    } catch { echecs++; }
    progres?.(++fait, liste.length);
  }
  e.unites[uniteId] = Date.now();
  await sauver(); prevenir();
  return { copies, echecs, total: liste.length };
}

/** Retire les fichiers d'une unité (les médias partagés avec une autre unité téléchargée sont gardés). */
export async function supprimerUnite(uniteId: string, exercices: Exercice[], exercicesAutres: Exercice[]) {
  const e = await charger();
  const gardes = new Set(mediasDe(exercicesAutres));
  for (const src of mediasDe(exercices)) {
    if (gardes.has(src)) continue;
    const m = e.medias[src];
    try { if (m) { const f = new File(m.fichier); if (f.exists) f.delete(); } } catch { /* déjà supprimé */ }
    delete e.medias[src];
  }
  delete e.unites[uniteId];
  await sauver(); prevenir();
}

/** Unités téléchargées (identifiant -> date) et place occupée. */
export function useHorsLigne() {
  const [, n] = useState(0);
  useEffect(() => { const f = () => n(x => x + 1); ecouteurs.add(f); charger().then(f); return () => { ecouteurs.delete(f); }; }, []);
  const unites = etat?.unites ?? {};
  const octets = Object.values(etat?.medias ?? {}).reduce((s, m) => s + (m.octets || 0), 0);
  return { unites, octets, possible: horsLignePossible };
}
