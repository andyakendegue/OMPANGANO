/**
 * Alertes de proximité des logements : « M'alerter quand je passe à proximité ».
 * Géorepérage du système (expo-location + expo-task-manager), notification locale à l'entrée dans la zone,
 * une fois par 24 h et par annonce, 20 alertes actives au plus (limite iOS). Stockées sur l'appareil uniquement :
 * la position de la personne n'est jamais envoyée au serveur. Sans localisation « toujours », surveillance seulement app ouverte.
 * Ce module doit être importé tôt (app/_layout.tsx) : la tâche doit être définie au chargement du JavaScript.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import type * as TaskManagerT from 'expo-task-manager';
import { moduleNatifPresent, moduleParesseux } from '../natif';
import { Platform } from 'react-native';
import { distanceM } from '@nkala/noyau';

export const TACHE_GEOFENCE = 'nkala-geofence';
const CLE = 'nkala_alertes_logement';
export const MAX_ALERTES = 20;
export const RAYONS_ALERTE = [100, 300, 500, 1000];
const DELAI_MS = 24 * 3600_000;

export interface AlerteLogement { annonceId: string; titre: string; prixLabel: string; quartier?: string; lat: number; lng: number; rayonM: number; actif: boolean; dernierEnvoi?: number; creeLe: number }

// expo-task-manager est absent des versions 0.1.0 (vc3, vc4) : sans lui, pas d'alertes de proximité (pas de plantage)
export const alertesDisponibles = Platform.OS !== 'web' && moduleNatifPresent('ExpoTaskManager');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TaskManager = moduleParesseux<typeof TaskManagerT>(() => alertesDisponibles, () => require('expo-task-manager'));

export async function lireAlertes(): Promise<AlerteLogement[]> {
  try { return JSON.parse((await AsyncStorage.getItem(CLE)) || '[]'); } catch { return []; }
}
const ecrire = (a: AlerteLogement[]) => AsyncStorage.setItem(CLE, JSON.stringify(a)).catch(() => {});

/** Notifie si la règle des 24 h le permet. Utilisé par la tâche de fond et par la surveillance app ouverte. */
async function notifierEntree(annonceId: string) {
  const alertes = await lireAlertes();
  const a = alertes.find(x => x.annonceId === annonceId && x.actif);
  if (!a || (a.dernierEnvoi && Date.now() - a.dernierEnvoi < DELAI_MS)) return;
  a.dernierEnvoi = Date.now();
  await ecrire(alertes);
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Vous êtes à proximité', body: [a.titre, a.quartier].filter(Boolean).join(', ') + (a.prixLabel ? ` — ${a.prixLabel}` : ''), data: { type: 'logement', annonceId } },
    trigger: null,
  }).catch(() => {});
}

if (alertesDisponibles && !TaskManager.isTaskDefined(TACHE_GEOFENCE)) {
  TaskManager.defineTask<{ eventType: Location.GeofencingEventType; region: Location.LocationRegion }>(TACHE_GEOFENCE, async ({ data, error }) => {
    if (error || !data) return;
    if (data.eventType === Location.GeofencingEventType.Enter && data.region?.identifier) await notifierEntree(data.region.identifier);
  });
}

export type EtatPermission = 'toujours' | 'app_ouverte' | 'refusee';
export async function etatPermission(): Promise<EtatPermission> {
  if (!alertesDisponibles) return 'refusee';
  try {
    if ((await Location.getBackgroundPermissionsAsync()).granted) return 'toujours';
    return (await Location.getForegroundPermissionsAsync()).granted ? 'app_ouverte' : 'refusee';
  } catch { return 'refusee'; }
}

/** Demande les autorisations (à appeler APRÈS l'explication à l'écran). */
export async function demanderPermissions(): Promise<EtatPermission> {
  if (!alertesDisponibles) return 'refusee';
  try {
    const n = await Notifications.getPermissionsAsync();
    if (!n.granted) await Notifications.requestPermissionsAsync();
    const avant = await Location.requestForegroundPermissionsAsync();
    if (!avant.granted) return 'refusee';
    const fond = await Location.requestBackgroundPermissionsAsync();
    return fond.granted ? 'toujours' : 'app_ouverte';
  } catch { return 'refusee'; }
}

/** Réenregistre toutes les zones actives (au démarrage, après chaque changement). */
export async function reenregistrerZones() {
  if (!alertesDisponibles) return;
  const actives = (await lireAlertes()).filter(a => a.actif).slice(0, MAX_ALERTES);
  try {
    const demarre = await Location.hasStartedGeofencingAsync(TACHE_GEOFENCE).catch(() => false);
    if (!actives.length) { if (demarre) await Location.stopGeofencingAsync(TACHE_GEOFENCE); return; }
    if ((await etatPermission()) !== 'toujours') { if (demarre) await Location.stopGeofencingAsync(TACHE_GEOFENCE); return; }
    await Location.startGeofencingAsync(TACHE_GEOFENCE, actives.map(a => ({ identifier: a.annonceId, latitude: a.lat, longitude: a.lng, radius: a.rayonM, notifyOnEnter: true, notifyOnExit: false })));
  } catch { /* module natif absent (ancienne version de l'app) ou refus : la surveillance app ouverte prend le relais */ }
}

export async function ajouterAlerte(a: Omit<AlerteLogement, 'actif' | 'creeLe'>, masquee = false): Promise<{ ok: boolean; message: string }> {
  if (!alertesDisponibles) return { ok: false, message: "Disponible dans l'application mobile." };
  const liste = await lireAlertes();
  const autres = liste.filter(x => x.annonceId !== a.annonceId);
  if (autres.filter(x => x.actif).length >= MAX_ALERTES) return { ok: false, message: `${MAX_ALERTES} alertes actives au plus : désactivez-en une dans « Mes alertes ».` };
  // Emplacement masqué : le point public est décalé de 100 à 300 m, le rayon ne descend pas sous 300 m.
  const rayonM = masquee ? Math.max(300, a.rayonM) : a.rayonM;
  await ecrire([...autres, { ...a, rayonM, actif: true, creeLe: Date.now() }]);
  const p = await demanderPermissions();
  await reenregistrerZones();
  if (p === 'refusee') return { ok: true, message: "Alerte enregistrée, mais la localisation est refusée : elle ne fonctionnera qu'après l'avoir autorisée." };
  if (p === 'app_ouverte') return { ok: true, message: "Alerte activée, mais seulement quand l'application est ouverte (localisation « toujours » refusée)." };
  return { ok: true, message: `Alerte activée : vous serez prévenu à ${rayonM} m.` };
}

export async function basculerAlerte(annonceId: string, actif: boolean) {
  const l = await lireAlertes();
  await ecrire(l.map(a => (a.annonceId === annonceId ? { ...a, actif } : a)));
  await reenregistrerZones();
}
export async function supprimerAlerte(annonceId: string) {
  await ecrire((await lireAlertes()).filter(a => a.annonceId !== annonceId));
  await reenregistrerZones();
}

/** Sans localisation « toujours » : surveillance pendant que l'app est ouverte (renvoie la fonction d'arrêt). */
export async function surveillerAppOuverte(): Promise<() => void> {
  if (!alertesDisponibles || (await etatPermission()) !== 'app_ouverte' || !(await lireAlertes()).some(a => a.actif)) return () => {};
  const dedans = new Set<string>();
  try {
    const s = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: 30_000 }, async p => {
      for (const a of (await lireAlertes()).filter(x => x.actif)) {
        const d = distanceM({ lat: p.coords.latitude, lng: p.coords.longitude }, { lat: a.lat, lng: a.lng });
        if (d <= a.rayonM && !dedans.has(a.annonceId)) { dedans.add(a.annonceId); await notifierEntree(a.annonceId); }
        else if (d > a.rayonM * 1.2) dedans.delete(a.annonceId);
      }
    });
    return () => s.remove();
  } catch { return () => {}; }
}

// ------------------------------------------------------------------ ouverture de l'annonce au toucher de la notification
let annonceEnAttente: string | null = null;
const abonnes = new Set<() => void>();
export const demanderOuvertureAnnonce = (id: string) => { annonceEnAttente = id; abonnes.forEach(f => f()); };
export const prendreAnnonceEnAttente = () => { const a = annonceEnAttente; annonceEnAttente = null; return a; };
export const ecouterOuvertureAnnonce = (f: () => void) => { abonnes.add(f); return () => { abonnes.delete(f); }; };
