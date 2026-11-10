/**
 * Contenus pilotés par fichiers (JSON/CSV importés dans la console) : lecture avec copie locale hors ligne et
 * contenu de démonstration livré avec l'application tant que le serveur n'a rien publié.
 */
import { api, ApiError } from './api';
import { avecCache } from './cache';
import { SEEDS } from './contenu/seeds';

export type Ligne = Record<string, any> & { id: string };
export interface Ressource<T = Ligne> { lignes: T[]; source: 'serveur' | 'cache' | 'demo'; demo: boolean }

const memoire = new Map<string, { t: number; r: Ressource<any> }>();
const DUREE_MEMOIRE_MS = 60_000;

const trier = <T extends Ligne>(l: T[]) => [...l].sort((a, b) => (Number(a.ordre) || 1e9) - (Number(b.ordre) || 1e9));

/**
 * Charge une collection publiée. Ordre : mémoire (1 min) → serveur → copie locale → démonstration.
 * Si le serveur répond avec zéro ligne publiée, la démonstration est utilisée (et signalée par `demo`).
 */
export async function chargerContenu<T extends Ligne = Ligne>(collection: string, force = false): Promise<Ressource<T>> {
  const m = memoire.get(collection);
  if (!force && m && Date.now() - m.t < DUREE_MEMOIRE_MS) return m.r;
  let r: Ressource<T>;
  try {
    const rep = await avecCache(`contenu:${collection}`, () => api<{ lignes: T[] }>('GET', `/pub/contenus/${encodeURIComponent(collection)}`));
    // Le serveur répond : sa liste fait foi, même vide (les exemples se suppriment depuis la console). La démonstration intégrée ne sert que hors ligne sans copie locale.
    r = { lignes: trier(rep.lignes), source: 'serveur', demo: false };
  } catch (e) {
    if (e instanceof ApiError && e.status !== 0 && e.status < 500) r = demo<T>(collection); else r = demo<T>(collection);
  }
  memoire.set(collection, { t: Date.now(), r });
  return r;
}

function demo<T extends Ligne>(collection: string): Ressource<T> {
  const l = (SEEDS[collection] ?? []).filter(x => (x as any).publie !== false) as unknown as T[];
  return { lignes: trier(l), source: 'demo', demo: l.length > 0 };
}

export const oublierContenus = () => memoire.clear();

/** Valeur de liste « a|b|c » ou tableau déjà fait. */
export const enListe = (v: unknown): string[] => Array.isArray(v) ? v.map(String) : typeof v === 'string' && v ? v.split('|').map(s => s.trim()).filter(Boolean) : [];

export const parId = <T extends Ligne>(l: T[], id?: string | null): T | undefined => l.find(x => x.id === id);
