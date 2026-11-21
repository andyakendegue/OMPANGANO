/**
 * Annonces de tous types (automobile, équipement, emploi, services à domicile, animaux, divers) sur le modèle des annonces
 * de logement : catalogue de champs par catégorie (contenu/annonces_catalogue.json), fiche structurée validée côté client et
 * refaite côté serveur, médias, emplacement (masquable), complétude, « Visite certifiée ». Le logement garde son module
 * (logement.ts) ; ce module réutilise ses outils (position publique, certification, prix, distance).
 */
import catalogue from '../contenu/annonces_catalogue.json';
import {
  calculerCertification, ecartMediasM, mediaCouverture, positionPublique, prefixeMediasAnnonce, IMAGE_MAX_OCTETS, VIDEO_MAX_OCTETS, VIDEO_MAX_S,
  type LogementPrive, type MediaAnnonce, type Position, type TypeMedia,
} from './logement';

export type TypeChampAnnonce = 'choix' | 'multi' | 'nombre' | 'texte' | 'bool' | 'annee';
export interface ChampAnnonce { id: string; label: string; type: TypeChampAnnonce; options?: { id: string; label: string }[]; unite?: string; filtre?: boolean; obligatoire?: boolean; pour?: string[] }
export interface CategorieAnnonce {
  id: string; label: string; icon: string;
  transactions: { id: string; label: string }[];
  sousCategories: { id: string; label: string }[];
  medias: Record<TypeMedia, number>;
  /** Emploi, services : la photo n'est pas obligatoire. */
  photoFacultative?: boolean;
  /** Libellé du prix (« Salaire », « Tarif »). */
  prixLabel?: string;
  champs: ChampAnnonce[];
}
export const CATALOGUE_ANNONCES = (catalogue as unknown as { categories: CategorieAnnonce[] }).categories;
export const categorieAnnonce = (id?: string) => CATALOGUE_ANNONCES.find(c => c.id === id);
/** Champs qui s'appliquent à une sous-catégorie (un champ sans « pour » s'applique partout). */
export const champsPour = (c: CategorieAnnonce, sousCategorie?: string) => c.champs.filter(ch => !ch.pour || (sousCategorie !== undefined && ch.pour.includes(sousCategorie)));

export type ValeurChamp = string | number | boolean | string[];
export interface FicheAnnonce {
  version: 1;
  categorie: string;
  sousCategorie: string;
  transaction: string;
  champs: Record<string, ValeurChamp>;
  negociable?: boolean;
  position: Position;
  masquee?: boolean;
  quartier?: string; repere?: string;
  whatsapp?: string;
  medias: MediaAnnonce[];
  brouillonId: string;
}
export interface AnnoncePublique extends Omit<FicheAnnonce, 'position'> {
  position?: Position;
  positionPublique: Position;
  completude: number;
  certifiee: boolean;
  ecartMediasM: number | null;
  couverture?: string;
}

const estNombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
const RE_FICHIER = /^[A-Za-z0-9._-]{1,120}$/;
const RE_ID = /^[A-Za-z0-9_-]{6,64}$/;
const ANNEE_MAX = () => new Date().getFullYear() + 1;

/** Valide une liste de médias d'annonce (chemins dans annonces/{uid}/{brouillonId}/, types, tailles, limites). */
export function validerMediasAnnonce(brut: unknown, uid: string, brouillonId: string, limites: Record<TypeMedia, number>, e: string[]): MediaAnnonce[] {
  const prefixe = brouillonId ? prefixeMediasAnnonce(uid, brouillonId) : '\0';
  const cheminOk = (c: unknown) => typeof c === 'string' && c.length <= 300 && c.startsWith(prefixe) && RE_FICHIER.test(c.slice(prefixe.length));
  const liste: unknown[] = Array.isArray(brut) ? brut : [];
  const total = limites.photo + limites.video + limites.pano360;
  if (liste.length > total) e.push('Trop de médias.');
  const compte: Record<TypeMedia, number> = { photo: 0, video: 0, pano360: 0 };
  const ids = new Set<string>(), medias: MediaAnnonce[] = [];
  for (const [i, mb] of liste.slice(0, 40).entries()) {
    const m = (mb ?? {}) as Record<string, any>, n = `Média ${i + 1}`;
    if (!['photo', 'video', 'pano360'].includes(m.type)) { e.push(`${n} : type inconnu.`); continue; }
    const type = m.type as TypeMedia;
    compte[type]++;
    if (typeof m.id !== 'string' || !RE_ID.test(m.id) || ids.has(m.id)) { e.push(`${n} : identifiant invalide.`); continue; }
    ids.add(m.id);
    if (!cheminOk(m.chemin) || (m.cheminVignette !== undefined && !cheminOk(m.cheminVignette)) || (m.cheminHd !== undefined && (type !== 'pano360' || !cheminOk(m.cheminHd)))) { e.push(`${n} : chemin refusé (il doit être dans votre dossier d'annonce).`); continue; }
    const octets = estNombre(m.octets) && m.octets > 0 ? m.octets : 0;
    if (!octets || octets > (type === 'video' ? VIDEO_MAX_OCTETS : IMAGE_MAX_OCTETS)) { e.push(`${n} : taille absente ou fichier trop lourd.`); continue; }
    const dureeS = estNombre(m.dureeS) && m.dureeS >= 0 ? m.dureeS : undefined;
    if (type === 'video' && dureeS !== undefined && dureeS > VIDEO_MAX_S + 1) { e.push(`${n} : vidéo de plus de ${VIDEO_MAX_S} s.`); continue; }
    const md: MediaAnnonce = { id: m.id, type, chemin: m.chemin, ordre: estNombre(m.ordre) ? Math.round(m.ordre) : i, octets };
    if (m.cheminVignette) md.cheminVignette = m.cheminVignette;
    if (m.cheminHd) md.cheminHd = m.cheminHd;
    if (typeof m.piece === 'string' && /^[a-z_]{1,40}$/.test(m.piece)) md.piece = m.piece;
    if (estNombre(m.largeur) && m.largeur > 0) md.largeur = Math.round(m.largeur);
    if (estNombre(m.hauteur) && m.hauteur > 0) md.hauteur = Math.round(m.hauteur);
    if (dureeS !== undefined) md.dureeS = dureeS;
    if (type === 'pano360' && m.pano && typeof m.pano === 'object' && estNombre(m.pano.haov) && estNombre(m.pano.vaov) && m.pano.haov >= 30 && m.pano.haov <= 360 && m.pano.vaov >= 10 && m.pano.vaov <= 180)
      md.pano = { haov: m.pano.haov, vaov: m.pano.vaov, ...(estNombre(m.pano.vOffset) && Math.abs(m.pano.vOffset) <= 90 ? { vOffset: m.pano.vOffset } : {}) };
    if (m.capturedInApp === true) {
      md.capturedInApp = true;
      if (typeof m.capturedAt === 'string' && !Number.isNaN(Date.parse(m.capturedAt))) md.capturedAt = m.capturedAt.slice(0, 40);
      if (estNombre(m.capturedLat) && estNombre(m.capturedLng) && Math.abs(m.capturedLat) <= 90 && Math.abs(m.capturedLng) <= 180) { md.capturedLat = m.capturedLat; md.capturedLng = m.capturedLng; }
    }
    medias.push(md);
  }
  for (const t of Object.keys(limites) as TypeMedia[]) if (compte[t] > limites[t]) e.push(`${t === 'photo' ? 'Photos' : t === 'video' ? 'Vidéos' : 'Photos 360°'} : ${limites[t]} au plus.`);
  return medias.sort((a, b) => a.ordre - b.ordre).map((m, i) => ({ ...m, ordre: i }));
}

/** Valide la valeur d'un champ du catalogue ; renvoie undefined (et une erreur) si elle ne convient pas. */
function validerChamp(ch: ChampAnnonce, v: unknown, e: string[]): ValeurChamp | undefined {
  if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return undefined;
  switch (ch.type) {
    case 'choix': if (typeof v === 'string' && ch.options?.some(o => o.id === v)) return v; break;
    case 'multi': if (Array.isArray(v) && v.every(x => typeof x === 'string' && ch.options?.some(o => o.id === x))) return [...new Set(v as string[])]; break;
    case 'nombre': if (estNombre(v) && v >= 0 && v <= 1e10) return v; break;
    case 'annee': if (estNombre(v) && Number.isInteger(v) && v >= 1900 && v <= ANNEE_MAX()) return v; break;
    case 'bool': if (typeof v === 'boolean') return v; break;
    case 'texte': { const t = texte(v, 200); if (t) return t; break; }
  }
  e.push(`${ch.label} : valeur invalide.`);
  return undefined;
}

type Resultat = { ok: true; fiche: FicheAnnonce } | { ok: false; erreurs: string[] };

/** Vérifie une fiche d'annonce (hors logement) et renvoie une copie propre. Les champs inconnus de la catégorie sont ignorés. */
export function validerFicheAnnonce(x: unknown, uid: string): Resultat {
  const e: string[] = [];
  if (!x || typeof x !== 'object' || Array.isArray(x)) return { ok: false, erreurs: ['Fiche d\'annonce absente ou mal formée.'] };
  const o = x as Record<string, any>;
  const cat = categorieAnnonce(o.categorie);
  if (!cat) return { ok: false, erreurs: ['Catégorie inconnue.'] };
  const sousCategorie = cat.sousCategories.some(s => s.id === o.sousCategorie) ? String(o.sousCategorie) : '';
  if (!sousCategorie) e.push('Choisissez le type (sous-catégorie).');
  const transaction = cat.transactions.some(t => t.id === o.transaction) ? String(o.transaction) : '';
  if (!transaction) e.push('Choisissez le type d\'annonce (vente, location…).');
  const brouillonId = typeof o.brouillonId === 'string' && RE_ID.test(o.brouillonId) ? o.brouillonId : '';
  if (!brouillonId) e.push('Identifiant de brouillon invalide.');

  const valeurs = (o.champs && typeof o.champs === 'object' && !Array.isArray(o.champs)) ? o.champs as Record<string, unknown> : {};
  const champs: Record<string, ValeurChamp> = {};
  for (const ch of champsPour(cat, sousCategorie)) {
    const v = validerChamp(ch, valeurs[ch.id], e);
    if (v !== undefined) champs[ch.id] = v;
    else if (ch.obligatoire && valeurs[ch.id] === undefined) e.push(`${ch.label} : obligatoire.`);
  }

  const pos = o.position && typeof o.position === 'object' ? o.position : null;
  let position: Position = { lat: 0, lng: 0 };
  if (!pos || !estNombre(pos.lat) || !estNombre(pos.lng) || Math.abs(pos.lat) > 90 || Math.abs(pos.lng) > 180) e.push('Position invalide ou absente.');
  else position = { lat: pos.lat, lng: pos.lng };

  const medias = validerMediasAnnonce(o.medias, uid, brouillonId, cat.medias, e);
  if (!cat.photoFacultative && !medias.some(m => m.type === 'photo')) e.push('Au moins une photo est obligatoire.');

  if (e.length) return { ok: false, erreurs: [...new Set(e)].slice(0, 30) };
  const fiche: FicheAnnonce = { version: 1, categorie: cat.id, sousCategorie, transaction, champs, position, medias, brouillonId };
  if (o.negociable === true) fiche.negociable = true;
  if (o.masquee === true) fiche.masquee = true;
  const q = texte(o.quartier, 120); if (q) fiche.quartier = q;
  const r = texte(o.repere, 300); if (r) fiche.repere = r;
  const w = texte(o.whatsapp, 30); if (w && w.replace(/\D/g, '').length >= 6) fiche.whatsapp = w;
  return { ok: true, fiche };
}

export interface BaseAnnonceGenerique { titre?: string; description?: string; prix?: number; telephone?: string }
/** Indice de complétude 0-100 d'une annonce (hors logement). */
export function completudeAnnonce(f: Partial<FicheAnnonce>, base: BaseAnnonceGenerique = {}): number {
  const cat = categorieAnnonce(f.categorie);
  const m = f.medias ?? [];
  const attendus = cat ? champsPour(cat, f.sousCategorie) : [];
  const remplis = attendus.filter(ch => f.champs?.[ch.id] !== undefined).length;
  let s = 0;
  if ((base.titre ?? '').trim().length >= 5) s += 10;
  const d = (base.description ?? '').trim().length; s += d >= 80 ? 15 : d >= 20 ? 7 : 0;
  if ((base.prix ?? 0) > 0) s += 10;
  if (f.sousCategorie && f.transaction) s += 5;
  s += attendus.length ? Math.round((remplis / attendus.length) * 20) : 20;
  const photos = m.filter(x => x.type === 'photo').length;
  s += cat?.photoFacultative ? (photos ? 15 : 8) : photos >= 4 ? 15 : photos ? 10 : 0;
  if (m.some(x => x.type === 'video' || x.type === 'pano360')) s += 5;
  if (f.position && Number.isFinite(f.position.lat)) s += 10;
  if ((f.quartier ?? '').trim() || (f.repere ?? '').trim()) s += 5;
  if ((base.telephone ?? '').replace(/\D/g, '').length >= 6) s += 5;
  return Math.min(100, s);
}

/** Ce que le serveur enregistre (data.fiche) et garde à part (data_privee) : jamais de position de prise de vue publique. */
export function preparerAnnoncePublique(fiche: FicheAnnonce, id: string, base: BaseAnnonceGenerique): { fiche: AnnoncePublique; privee: LogementPrive | null } {
  const pub = positionPublique(fiche, id);
  const { position, ...reste } = fiche;
  const positionsMedias: Record<string, Position> = {};
  const medias = fiche.medias.map(({ capturedLat, capturedLng, ...m }) => {
    if (capturedLat !== undefined && capturedLng !== undefined) positionsMedias[m.id] = { lat: capturedLat, lng: capturedLng };
    return m;
  });
  const privee: LogementPrive = { ...(fiche.masquee ? { position } : {}), ...(Object.keys(positionsMedias).length ? { positionsMedias } : {}) };
  return {
    fiche: {
      ...reste, medias, ...(fiche.masquee ? {} : { position }), positionPublique: pub,
      completude: completudeAnnonce(fiche, base), certifiee: calculerCertification(fiche), ecartMediasM: ecartMediasM(fiche), couverture: mediaCouverture(fiche.medias)?.id,
    },
    privee: Object.keys(privee).length ? privee : null,
  };
}

/** Valeur affichable d'un champ (« Diesel », « 120 000 km », « Oui », « GPS, Bluetooth »). */
export function libelleValeur(ch: ChampAnnonce, v: ValeurChamp | undefined): string {
  if (v === undefined) return '';
  if (ch.type === 'bool') return v ? 'Oui' : 'Non';
  if (ch.type === 'choix') return ch.options?.find(o => o.id === v)?.label ?? String(v);
  if (ch.type === 'multi') return (v as string[]).map(x => ch.options?.find(o => o.id === x)?.label ?? x).join(', ');
  if (ch.type === 'nombre') return `${Number(v).toLocaleString('fr-FR')}${ch.unite ? ` ${ch.unite}` : ''}`;
  return String(v);
}
/** Résumé court pour les cartes de la liste (3 champs filtrables remplis). */
export function resumeAnnonce(f: Partial<FicheAnnonce>): string {
  const cat = categorieAnnonce(f.categorie);
  if (!cat) return '';
  const sc = cat.sousCategories.find(s => s.id === f.sousCategorie)?.label;
  const vals = champsPour(cat, f.sousCategorie).filter(ch => ch.filtre && ch.type !== 'bool' && f.champs?.[ch.id] !== undefined).slice(0, 3).map(ch => libelleValeur(ch, f.champs![ch.id]));
  return [sc, ...vals].filter(Boolean).join(' · ');
}
