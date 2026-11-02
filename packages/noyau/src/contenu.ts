import { api } from './api';
import type { ClanRegistry, QuestionnaireItem, ThemeDefinition, VillageRegistry } from './types';

export type Collection = 'items' | 'themes' | 'clans' | 'villages';

/** Lit une petite collection en entier (thèmes, clans, villages) par pages de synchronisation. */
export async function lireCollection<T extends { id: string }>(nom: Collection): Promise<T[]> {
  const out: T[] = [];
  let curseur: string | null = null;
  for (;;) {
    const qs = new URLSearchParams({ limit: '1000' });
    if (curseur) qs.set('since', curseur);
    const page: { records: (T & { deletedAt?: string })[]; cursor: string | null; hasMore: boolean } = await api('GET', `/v1/sync/${nom}?${qs}`);
    for (const r of page.records) if (!r.deletedAt) out.push(r);
    if (page.cursor) curseur = page.cursor;
    if (!page.hasMore) break;
  }
  return out;
}

export const chargerThemes = () => lireCollection<ThemeDefinition>('themes');

export const enregistrerElement = (nom: Collection, id: string, donnees: object) =>
  api('PUT', `/v1/${nom}/${encodeURIComponent(id)}`, donnees);

export const supprimerElement = (nom: Collection, id: string) =>
  api('DELETE', `/v1/${nom}/${encodeURIComponent(id)}`);

export const nouvelId = (prefixe: string) => `${prefixe}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const DIALECTES: { code: string; nom: string }[] = [
  { code: 'orungu', nom: 'Ôrungu' }, { code: 'mpongwe', nom: 'Mpongwè' }, { code: 'galoa', nom: 'Galwa' },
  { code: 'nkomi', nom: 'Nkomi' }, { code: 'enenga', nom: 'Enenga' }, { code: 'adyumba', nom: 'Adyumba' },
];

/** « Ôrungu », « mpongwè », « galwa »… -> code de dialecte (null si inconnu). */
export function codeDialecte(texte: string): string | null {
  const t = texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  if (!t) return null;
  if (t.startsWith('orungu') || t.startsWith('oroungou')) return 'orungu';
  if (t.startsWith('mpongw') || t.startsWith('pongw')) return 'mpongwe';
  if (t.startsWith('galwa') || t.startsWith('galoa') || t.startsWith('galloa')) return 'galoa';
  if (t.startsWith('nkomi')) return 'nkomi';
  if (t.startsWith('enenga')) return 'enenga';
  if (t.startsWith('adyumba') || t.startsWith('adjumba')) return 'adyumba';
  return null;
}

export function nouvelleFiche(auteur: string, f: { francais: string; myene: string; dialecte: string; theme: string; phonetique?: string; notes?: string }): QuestionnaireItem {
  const now = new Date().toISOString();
  return {
    id: nouvelId('item'),
    frenchText: f.francais.trim(),
    myeneText: f.myene.trim(),
    dialect: f.dialecte,
    category: f.theme,
    theme: f.theme,
    phoneticApi: f.phonetique?.trim() || undefined,
    contextNotes: f.notes?.trim() || '',
    imageUrl: '',
    difficulty: 'debutant',
    status: 'active',
    contributionsCount: 0,
    recordingsCount: 0,
    createdBy: auteur,
    createdAt: now,
    updatedAt: now,
  };
}

// ------------------------------------------------------------------ import CSV

/** Lit un CSV (guillemets, retours à la ligne dans les cellules, séparateur « , » ou « ; »). */
export function lireCsv(texte: string): string[][] {
  const t = texte.replace(/^﻿/, '');
  const premiere = t.split(/\r?\n/, 1)[0] || '';
  const sep = (premiere.match(/;/g) || []).length > (premiere.match(/,/g) || []).length ? ';' : ',';
  const lignes: string[][] = [];
  let ligne: string[] = [], cellule = '', guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (guillemets) {
      if (c === '"' && t[i + 1] === '"') { cellule += '"'; i++; }
      else if (c === '"') guillemets = false;
      else cellule += c;
    } else if (c === '"') guillemets = true;
    else if (c === sep) { ligne.push(cellule.trim()); cellule = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      ligne.push(cellule.trim());
      if (ligne.some(x => x)) lignes.push(ligne);
      ligne = []; cellule = '';
    } else cellule += c;
  }
  ligne.push(cellule.trim());
  if (ligne.some(x => x)) lignes.push(ligne);
  return lignes;
}

export interface ResultatCsv {
  fiches: QuestionnaireItem[];
  /** Lignes ignorées (texte manquant) et colonnes reconnues, pour l'écran de confirmation. */
  ignorees: number;
  colonnes: { id?: string; myene?: string; francais?: string; dialecte?: string; theme?: string };
  /** Dialectes rencontrés mais non reconnus (remplacés par le dialecte par défaut). */
  dialectesInconnus: string[];
}

const simplifier = (h: string) => h.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const empreinte = (s: string) => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36); };

/**
 * Convertit un CSV en fiches. La colonne de dialecte (dialect, dialecte, tribu) est LUE ligne par ligne :
 * `dialecteParDefaut` ne sert que si elle manque ou n'est pas reconnue. Le serveur dédoublonne à l'import.
 */
export function fichesDepuisCsv(texte: string, auteur: string, dialecteParDefaut = 'orungu'): ResultatCsv {
  const lignes = lireCsv(texte);
  const vide: ResultatCsv = { fiches: [], ignorees: 0, colonnes: {}, dialectesInconnus: [] };
  if (lignes.length < 2) return vide;
  const noms = lignes[0];
  const cles = noms.map(simplifier);
  const trouver = (...motifs: string[]) => cles.findIndex(k => motifs.some(m => k === m)) >= 0
    ? cles.findIndex(k => motifs.some(m => k === m))
    : cles.findIndex(k => motifs.some(m => k.includes(m)));
  const iId = trouver('id', 'identifiant');
  const iFr = trouver('frenchtext', 'francais', 'traductionfrancaise', 'french', 'traduction');
  const iMy = trouver('myenetext', 'texteorunguorthographe', 'textemyene', 'myene', 'orungu', 'texte');
  const iDia = trouver('dialect', 'dialecte', 'tribu', 'tribe');
  const iTh = trouver('modulethematique', 'theme', 'categorie', 'module');
  const iPh = trouver('transcriptionapitonale', 'phonetic', 'api', 'phon');
  const iNo = trouver('context', 'note');
  if (iFr < 0 || iMy < 0) return { ...vide, colonnes: {} };

  const now = new Date().toISOString();
  const inconnus = new Set<string>();
  const fiches: QuestionnaireItem[] = [];
  let ignorees = 0;
  for (const l of lignes.slice(1)) {
    const myene = (l[iMy] || '').trim();
    const francais = (l[iFr] || '').trim();
    if (!myene || !francais) { ignorees++; continue; }
    const brut = iDia >= 0 ? (l[iDia] || '').trim() : '';
    let dialecte = brut ? codeDialecte(brut) : null;
    if (brut && !dialecte) inconnus.add(brut);
    dialecte = dialecte || dialecteParDefaut;
    const theme = (iTh >= 0 && l[iTh]) ? l[iTh].trim() : 'general';
    const idCsv = iId >= 0 ? (l[iId] || '').trim() : '';
    fiches.push({
      id: idCsv ? idCsv.replace(/[.$#[\]/\\\s]+/g, '_') : `csv_${dialecte}_${empreinte(`${myene}||${francais}`.toLowerCase())}`,
      sourceRef: idCsv || undefined,
      frenchText: francais,
      myeneText: myene,
      dialect: dialecte,
      category: theme,
      theme,
      moduleThematique: theme,
      phoneticApi: iPh >= 0 && l[iPh] ? l[iPh] : undefined,
      contextNotes: iNo >= 0 ? l[iNo] || '' : '',
      imageUrl: '',
      difficulty: 'debutant',
      status: 'active',
      contributionsCount: 0,
      recordingsCount: 0,
      createdBy: auteur,
      createdAt: now,
      updatedAt: now,
    });
  }
  return {
    fiches, ignorees, dialectesInconnus: [...inconnus],
    colonnes: { id: iId >= 0 ? noms[iId] : undefined, myene: noms[iMy], francais: noms[iFr], dialecte: iDia >= 0 ? noms[iDia] : undefined, theme: iTh >= 0 ? noms[iTh] : undefined },
  };
}

export interface RapportImport { total: number; created: number; updated: number; unchanged: number; internalDuplicates: number }

/** `essai: true` : le serveur annonce les comptes sans rien écrire. Envoi par lots de 5 000 fiches. */
export async function importerFiches(fiches: QuestionnaireItem[], essai: boolean): Promise<RapportImport> {
  const total: RapportImport = { total: 0, created: 0, updated: 0, unchanged: 0, internalDuplicates: 0 };
  for (let i = 0; i < fiches.length; i += 5000) {
    const r = await api<RapportImport>('POST', '/v1/items/import', { items: fiches.slice(i, i + 5000), dryRun: essai });
    (Object.keys(total) as (keyof RapportImport)[]).forEach(k => { total[k] += r[k]; });
  }
  return total;
}

export type { ClanRegistry, ThemeDefinition, VillageRegistry };
