/**
 * Annonces de logement (Village) : fiche structurée, médias (photos, vidéos, photos 360°), certification de visite,
 * position publique. Module partagé : le client l'utilise pour l'aperçu, le serveur refait TOUS les calculs à l'enregistrement.
 * Spécification : OMPANGANO/NKALA_ANNONCES_IMMO/01_SPEC_fonctionnelle.md et 02_architecture_api_donnees.md.
 */
import catalogue from '../contenu/equipements_logement.json';

export type Transaction = 'vente' | 'location' | 'colocation' | 'courte_duree';
export type TypeMedia = 'photo' | 'video' | 'pano360';
export type Periode = 'mois' | 'jour' | 'semaine' | 'total';

export interface MediaAnnonce {
  id: string;
  type: TypeMedia;
  /** Clé dans le stockage : annonces/{uid}/{brouillonId}/{fichier}. Jamais une URL. */
  chemin: string;
  cheminVignette?: string;
  /** 360 seulement : version 6000 px quand l'original dépasse 4096 px. */
  cheminHd?: string;
  piece?: string;
  ordre: number;
  largeur?: number; hauteur?: number; dureeS?: number; octets: number;
  capturedInApp?: boolean; capturedAt?: string; capturedLat?: number; capturedLng?: number;
  /** V2 : visite virtuelle (points cliquables entre les 360). */
  hotspots?: { cible: string; yaw: number; pitch: number; label?: string }[];
}

export interface PiecesLogement {
  chambres?: number; salons?: number; sallesDeBain?: number; wcInterieurs?: number; wcExterieurs?: number;
  cuisine?: 'interieure' | 'exterieure' | 'americaine' | 'aucune'; surfaceHabitable?: number; surfaceTerrain?: number;
  etage?: number; niveaux?: number; meuble?: 'non' | 'partiel' | 'oui';
}
export interface ConditionsLogement {
  cautionMois?: number; avanceMois?: number; fraisAgence?: number; fraisVisite?: number; charges?: number;
  chargesComprises?: string[]; disponibleLe?: string; dureeMinMois?: number; animaux?: boolean;
}
export interface Position { lat: number; lng: number }

export interface FicheLogement {
  version: 1;
  transaction: Transaction;
  typeBien: string;
  periode: Periode;
  negociable?: boolean;
  pieces: PiecesLogement;
  equipements: Record<string, true | number | string>;
  conditions: ConditionsLogement;
  /** Position réelle (jamais renvoyée au public si « masquee »). */
  position: Position;
  masquee?: boolean;
  quartier?: string; repere?: string;
  whatsapp?: string;
  consentementOccupants: true;
  medias: MediaAnnonce[];
  brouillonId: string;
}

/** Ce que le serveur range dans data.logement (la position réelle n'y est pas si l'emplacement est masqué). */
export interface LogementPublic extends Omit<FicheLogement, 'position'> {
  position?: Position;
  positionPublique: Position;
  completude: number;
  certifiee: boolean;
  /** Écart maximal (m) entre la position de l'annonce et les médias pris dans l'app (pour le modérateur). */
  ecartMediasM: number | null;
  couverture?: string;
}

// ------------------------------------------------------------------ catalogue
export interface ItemEquipement { id: string; label: string; icon: string; type: 'bool' | 'number' | 'option'; options?: { id: string; label: string }[]; unit?: string }
export interface GroupeEquipements { id: string; label: string; icon: string; items: ItemEquipement[] }
export interface CatalogueLogement {
  version: number;
  typesDeBien: { id: string; label: string; icon: string }[];
  pieces: { id: string; label: string }[];
  groupes: GroupeEquipements[];
  filtresCles: string[];
}
export const CATALOGUE_LOGEMENT = catalogue as unknown as CatalogueLogement;
const ITEMS = new Map<string, ItemEquipement>(CATALOGUE_LOGEMENT.groupes.flatMap(g => g.items.map(i => [i.id, i] as [string, ItemEquipement])));
export const itemEquipement = (id: string) => ITEMS.get(id);
export const libelleTypeBien = (id?: string) => CATALOGUE_LOGEMENT.typesDeBien.find(t => t.id === id)?.label ?? id ?? '';
export const libellePiece = (id?: string) => CATALOGUE_LOGEMENT.pieces.find(p => p.id === id)?.label ?? '';

export const TRANSACTIONS: { id: Transaction; label: string; periode: Periode }[] = [
  { id: 'location', label: 'Location', periode: 'mois' },
  { id: 'vente', label: 'Vente', periode: 'total' },
  { id: 'colocation', label: 'Colocation', periode: 'mois' },
  { id: 'courte_duree', label: 'Courte durée', periode: 'jour' },
];
export const PERIODES: { id: Periode; label: string }[] = [
  { id: 'mois', label: 'par mois' }, { id: 'semaine', label: 'par semaine' }, { id: 'jour', label: 'par jour' }, { id: 'total', label: 'prix total' },
];
export const CHARGES_COMPRISES = [
  { id: 'eau', label: 'Eau' }, { id: 'electricite', label: 'Électricité' }, { id: 'internet', label: 'Internet' }, { id: 'gardiennage', label: 'Gardiennage' }, { id: 'ordures', label: 'Ordures' },
];
export const LIMITES_MEDIAS: Record<TypeMedia, number> = { photo: 20, video: 3, pano360: 10 };
/** Vidéo : 60 s et 50 Mo au plus. */
export const VIDEO_MAX_S = 60;
export const VIDEO_MAX_OCTETS = 50 * 1024 * 1024;
export const IMAGE_MAX_OCTETS = 15 * 1024 * 1024;
/** Rayon de la « Visite certifiée ». */
export const RAYON_CERTIFICATION_M = 150;

// ------------------------------------------------------------------ outils
const R_TERRE = 6371000;
/** Distance à vol d'oiseau en mètres (haversine). */
export function distanceM(a: Position, b: Position): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TERRE * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Image équirectangulaire (photo 360°) : rapport largeur/hauteur entre 1,9 et 2,1. */
export const estEquirectangulaire = (l: number, h: number) => l > 0 && h > 0 && l / h >= 1.9 && l / h <= 2.1;

const NBSP = ' ';
const PERIODE_COURTE: Record<string, string> = { mois: 'mois', jour: 'jour', semaine: 'semaine' };
/** « 350 000 FCFA / mois » (espaces insécables, sans décimales). */
export function formaterPrix(n: number, periode?: string): string {
  const entier = Math.round(Math.max(0, Number(n) || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const p = periode && PERIODE_COURTE[periode];
  return `${entier}${NBSP}FCFA${p ? `${NBSP}/ ${p}` : ''}`;
}

/** Préfixe obligatoire des médias d'une annonce. */
export const prefixeMediasAnnonce = (uid: string, brouillonId: string) => `annonces/${uid}/${brouillonId}/`;
const RE_FICHIER = /^[A-Za-z0-9._-]{1,120}$/;
const RE_ID = /^[A-Za-z0-9_-]{6,64}$/;

function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
/**
 * Position montrée au public. Emplacement masqué : décalage déterministe de 100 à 300 m (même annonce → même point),
 * pour qu'on ne puisse pas retrouver la vraie position en rechargeant.
 */
export function positionPublique(f: Pick<FicheLogement, 'position' | 'masquee'>, id: string): Position {
  if (!f.masquee) return { lat: f.position.lat, lng: f.position.lng };
  const h1 = hash32(`${id}:angle`), h2 = hash32(`${id}:distance`);
  const angle = (h1 / 0xffffffff) * 2 * Math.PI;
  const d = 100 + (h2 / 0xffffffff) * 200;
  const dLat = (d * Math.cos(angle)) / 111320;
  const dLng = (d * Math.sin(angle)) / (111320 * Math.max(0.01, Math.cos((f.position.lat * Math.PI) / 180)));
  const arr = (x: number) => Math.round(x * 1e6) / 1e6;
  return { lat: arr(f.position.lat + dLat), lng: arr(f.position.lng + dLng) };
}

/** Écart maximal (m) entre l'annonce et les médias pris dans l'app ; null s'il n'y en a pas. */
export function ecartMediasM(f: Pick<FicheLogement, 'position' | 'medias'>): number | null {
  const pris = f.medias.filter(m => m.capturedInApp && Number.isFinite(m.capturedLat) && Number.isFinite(m.capturedLng));
  if (!pris.length) return null;
  return Math.round(Math.max(...pris.map(m => distanceM(f.position, { lat: m.capturedLat!, lng: m.capturedLng! }))));
}

/**
 * « Visite certifiée » : au moins 3 médias pris avec l'appareil photo depuis l'app, dont au moins 1 vidéo ou 1 photo 360°,
 * tous à moins de 150 m de la position de l'annonce. Déclaratif (une position peut être falsifiée) : le modérateur voit l'écart.
 */
export function calculerCertification(f: Pick<FicheLogement, 'position' | 'medias'>): boolean {
  const pris = f.medias.filter(m => m.capturedInApp);
  if (pris.length < 3) return false;
  if (!pris.some(m => m.type === 'video' || m.type === 'pano360')) return false;
  return pris.every(m => Number.isFinite(m.capturedLat) && Number.isFinite(m.capturedLng)
    && distanceM(f.position, { lat: m.capturedLat!, lng: m.capturedLng! }) < RAYON_CERTIFICATION_M);
}

export interface BaseAnnonce { titre?: string; description?: string; prix?: number; telephone?: string }
/** Indice de complétude 0-100 (affiché pendant la saisie, sert au tri). */
export function calculerCompletude(f: Partial<FicheLogement>, base: BaseAnnonce = {}): number {
  const m = f.medias ?? [], p = f.pieces ?? {}, c = f.conditions ?? {};
  const photos = m.filter(x => x.type === 'photo').length;
  const nbEquip = Object.keys(f.equipements ?? {}).length;
  let s = 0;
  if ((base.titre ?? '').trim().length >= 5) s += 5;
  const d = (base.description ?? '').trim().length; s += d >= 80 ? 10 : d >= 20 ? 5 : 0;
  if ((base.prix ?? 0) > 0) s += 10;
  if (f.transaction && f.typeBien) s += 5;
  if ((p.chambres ?? 0) > 0 || (p.surfaceHabitable ?? 0) > 0 || (p.surfaceTerrain ?? 0) > 0) s += 5;
  if (p.cuisine || p.meuble || (p.sallesDeBain ?? 0) > 0) s += 5;
  s += Math.min(10, nbEquip * 2);
  const nbCond = [c.cautionMois, c.avanceMois, c.disponibleLe, c.fraisAgence, c.fraisVisite, c.charges].filter(x => x !== undefined && x !== '').length;
  s += Math.min(10, nbCond * 4);
  s += photos >= 5 ? 15 : photos >= 1 ? 10 : 0;
  if (m.some(x => x.type === 'video')) s += 5;
  if (m.some(x => x.type === 'pano360')) s += 5;
  if (f.position && Number.isFinite(f.position.lat)) s += 5;
  if ((f.quartier ?? '').trim() || (f.repere ?? '').trim()) s += 5;
  if ((base.telephone ?? '').replace(/\D/g, '').length >= 6) s += 5;
  return Math.min(100, s);
}

/** Média de couverture : première photo (ordre), sinon première 360, sinon vignette de vidéo. */
export function mediaCouverture(medias: MediaAnnonce[]): MediaAnnonce | undefined {
  const tri = [...medias].sort((a, b) => a.ordre - b.ordre);
  return tri.find(m => m.type === 'photo') ?? tri.find(m => m.type === 'pano360') ?? tri.find(m => m.type === 'video' && m.cheminVignette);
}

// ------------------------------------------------------------------ validation stricte (client et serveur)
const estNombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

type Resultat = { ok: true; fiche: FicheLogement } | { ok: false; erreurs: string[] };

/**
 * Vérifie une fiche reçue (du client ou d'un brouillon) et renvoie une copie propre : clés inconnues ignorées,
 * textes tronqués, nombres bornés. `uid` : les médias doivent être dans annonces/{uid}/{brouillonId}/.
 */
export function validerFicheLogement(x: unknown, uid: string): Resultat {
  const e: string[] = [];
  if (!x || typeof x !== 'object' || Array.isArray(x)) return { ok: false, erreurs: ['Fiche logement absente ou mal formée.'] };
  const o = x as Record<string, any>;
  const nb = (v: unknown, nom: string, min: number, max: number, entier = true): number | undefined => {
    if (v === undefined || v === null || v === '') return undefined;
    if (!estNombre(v) || v < min || v > max || (entier && !Number.isInteger(v))) { e.push(`${nom} : valeur invalide.`); return undefined; }
    return v;
  };

  const transaction = TRANSACTIONS.find(t => t.id === o.transaction)?.id;
  if (!transaction) e.push('Transaction : choisir vente, location, colocation ou courte durée.');
  const typeBien = CATALOGUE_LOGEMENT.typesDeBien.some(t => t.id === o.typeBien) ? String(o.typeBien) : undefined;
  if (!typeBien) e.push('Type de bien inconnu.');
  const periode: Periode = PERIODES.some(p => p.id === o.periode) ? o.periode : (TRANSACTIONS.find(t => t.id === transaction)?.periode ?? 'mois');

  const brouillonId = typeof o.brouillonId === 'string' && RE_ID.test(o.brouillonId) ? o.brouillonId : '';
  if (!brouillonId) e.push('Identifiant de brouillon invalide.');

  // Pièces
  const pi = (o.pieces && typeof o.pieces === 'object') ? o.pieces : {};
  const pieces: PiecesLogement = {};
  const ajout = <K extends keyof PiecesLogement>(k: K, v: PiecesLogement[K] | undefined) => { if (v !== undefined) pieces[k] = v; };
  ajout('chambres', nb(pi.chambres, 'Chambres', 0, 100));
  ajout('salons', nb(pi.salons, 'Salons', 0, 50));
  ajout('sallesDeBain', nb(pi.sallesDeBain, 'Salles de bain', 0, 50));
  ajout('wcInterieurs', nb(pi.wcInterieurs, 'WC intérieurs', 0, 50));
  ajout('wcExterieurs', nb(pi.wcExterieurs, 'WC extérieurs', 0, 50));
  ajout('surfaceHabitable', nb(pi.surfaceHabitable, 'Surface habitable', 0, 1_000_000, false));
  ajout('surfaceTerrain', nb(pi.surfaceTerrain, 'Surface du terrain', 0, 100_000_000, false));
  ajout('etage', nb(pi.etage, 'Étage', -5, 200));
  ajout('niveaux', nb(pi.niveaux, 'Niveaux', 0, 200));
  if (pi.cuisine !== undefined) { if (['interieure', 'exterieure', 'americaine', 'aucune'].includes(pi.cuisine)) pieces.cuisine = pi.cuisine; else e.push('Cuisine : choix invalide.'); }
  if (pi.meuble !== undefined) { if (['non', 'partiel', 'oui'].includes(pi.meuble)) pieces.meuble = pi.meuble; else e.push('Meublé : choix invalide.'); }

  // Équipements (ids du catalogue, types conformes)
  const equipements: Record<string, true | number | string> = {};
  const eq = (o.equipements && typeof o.equipements === 'object' && !Array.isArray(o.equipements)) ? o.equipements : {};
  for (const [id, v] of Object.entries(eq).slice(0, 120)) {
    const it = ITEMS.get(id);
    if (!it) { e.push(`Équipement inconnu : ${id.slice(0, 40)}.`); continue; }
    if (it.type === 'bool') { if (v === true) equipements[id] = true; else if (v !== false) e.push(`${it.label} : case attendue.`); }
    else if (it.type === 'number') { if (estNombre(v) && Number.isInteger(v) && v >= 1 && v <= 100_000) equipements[id] = v; else if (v !== 0) e.push(`${it.label} : nombre attendu.`); }
    else if (it.type === 'option') { if (typeof v === 'string' && it.options?.some(op => op.id === v)) equipements[id] = v; else e.push(`${it.label} : choix invalide.`); }
  }

  // Conditions
  const co = (o.conditions && typeof o.conditions === 'object') ? o.conditions : {};
  const conditions: ConditionsLogement = {};
  const c2 = <K extends keyof ConditionsLogement>(k: K, v: ConditionsLogement[K] | undefined) => { if (v !== undefined) conditions[k] = v; };
  c2('cautionMois', nb(co.cautionMois, 'Caution', 0, 60));
  c2('avanceMois', nb(co.avanceMois, 'Avance', 0, 60));
  c2('fraisAgence', nb(co.fraisAgence, "Frais d'agence", 0, 1e10));
  c2('fraisVisite', nb(co.fraisVisite, 'Frais de visite', 0, 1e8));
  c2('charges', nb(co.charges, 'Charges', 0, 1e9));
  c2('dureeMinMois', nb(co.dureeMinMois, 'Durée minimale', 0, 600));
  if (co.animaux !== undefined) { if (typeof co.animaux === 'boolean') conditions.animaux = co.animaux; else e.push('Animaux : oui ou non.'); }
  if (co.chargesComprises !== undefined) {
    if (Array.isArray(co.chargesComprises) && co.chargesComprises.every((c: unknown) => CHARGES_COMPRISES.some(k => k.id === c))) conditions.chargesComprises = [...new Set<string>(co.chargesComprises)];
    else e.push('Charges comprises : choix invalide.');
  }
  if (co.disponibleLe !== undefined && co.disponibleLe !== '') {
    if (typeof co.disponibleLe === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(co.disponibleLe) && !Number.isNaN(Date.parse(co.disponibleLe))) conditions.disponibleLe = co.disponibleLe;
    else e.push('Date de disponibilité invalide (AAAA-MM-JJ).');
  }

  // Position
  const pos = o.position && typeof o.position === 'object' ? o.position : null;
  let position: Position = { lat: 0, lng: 0 };
  if (!pos || !estNombre(pos.lat) || !estNombre(pos.lng) || pos.lat < -90 || pos.lat > 90 || pos.lng < -180 || pos.lng > 180) e.push('Position invalide ou absente.');
  else position = { lat: pos.lat, lng: pos.lng };

  if (o.consentementOccupants !== true) e.push("Le consentement des occupants est obligatoire.");

  // Médias
  const prefixe = brouillonId ? prefixeMediasAnnonce(uid, brouillonId) : '\0';
  const cheminOk = (c: unknown) => typeof c === 'string' && c.length <= 300 && c.startsWith(prefixe) && RE_FICHIER.test(c.slice(prefixe.length));
  const brut: unknown[] = Array.isArray(o.medias) ? o.medias : [];
  const medias: MediaAnnonce[] = [];
  const compte: Record<TypeMedia, number> = { photo: 0, video: 0, pano360: 0 };
  const ids = new Set<string>();
  if (brut.length > LIMITES_MEDIAS.photo + LIMITES_MEDIAS.video + LIMITES_MEDIAS.pano360) e.push('Trop de médias.');
  for (const [i, mb] of brut.slice(0, 40).entries()) {
    const m = (mb ?? {}) as Record<string, any>;
    const n = `Média ${i + 1}`;
    if (!['photo', 'video', 'pano360'].includes(m.type)) { e.push(`${n} : type inconnu.`); continue; }
    const type = m.type as TypeMedia;
    compte[type]++;
    if (typeof m.id !== 'string' || !RE_ID.test(m.id) || ids.has(m.id)) { e.push(`${n} : identifiant invalide.`); continue; }
    ids.add(m.id);
    if (!cheminOk(m.chemin)) { e.push(`${n} : chemin refusé (il doit être dans votre dossier d'annonce).`); continue; }
    if (m.cheminVignette !== undefined && !cheminOk(m.cheminVignette)) { e.push(`${n} : vignette refusée.`); continue; }
    if (m.cheminHd !== undefined && (type !== 'pano360' || !cheminOk(m.cheminHd))) { e.push(`${n} : version HD refusée.`); continue; }
    const octets = estNombre(m.octets) && m.octets > 0 ? m.octets : 0;
    if (!octets) { e.push(`${n} : taille absente.`); continue; }
    if (octets > (type === 'video' ? VIDEO_MAX_OCTETS : IMAGE_MAX_OCTETS)) { e.push(`${n} : fichier trop lourd.`); continue; }
    const dureeS = estNombre(m.dureeS) && m.dureeS >= 0 ? m.dureeS : undefined;
    if (type === 'video' && dureeS !== undefined && dureeS > VIDEO_MAX_S + 1) { e.push(`${n} : vidéo de plus de ${VIDEO_MAX_S} s.`); continue; }
    const md: MediaAnnonce = { id: m.id, type, chemin: m.chemin, ordre: estNombre(m.ordre) ? Math.round(m.ordre) : i, octets };
    if (m.cheminVignette) md.cheminVignette = m.cheminVignette;
    if (m.cheminHd) md.cheminHd = m.cheminHd;
    if (typeof m.piece === 'string' && CATALOGUE_LOGEMENT.pieces.some(p => p.id === m.piece)) md.piece = m.piece;
    if (estNombre(m.largeur) && m.largeur > 0) md.largeur = Math.round(m.largeur);
    if (estNombre(m.hauteur) && m.hauteur > 0) md.hauteur = Math.round(m.hauteur);
    if (dureeS !== undefined) md.dureeS = dureeS;
    if (m.capturedInApp === true) {
      md.capturedInApp = true;
      if (typeof m.capturedAt === 'string' && !Number.isNaN(Date.parse(m.capturedAt))) md.capturedAt = m.capturedAt.slice(0, 40);
      if (estNombre(m.capturedLat) && estNombre(m.capturedLng) && Math.abs(m.capturedLat) <= 90 && Math.abs(m.capturedLng) <= 180) { md.capturedLat = m.capturedLat; md.capturedLng = m.capturedLng; }
    }
    if (Array.isArray(m.hotspots)) {
      md.hotspots = m.hotspots.slice(0, 20).filter((h: any) => h && typeof h.cible === 'string' && estNombre(h.yaw) && estNombre(h.pitch))
        .map((h: any) => ({ cible: String(h.cible).slice(0, 64), yaw: h.yaw, pitch: h.pitch, ...(typeof h.label === 'string' ? { label: h.label.slice(0, 80) } : {}) }));
    }
    medias.push(md);
  }
  for (const t of Object.keys(LIMITES_MEDIAS) as TypeMedia[]) if (compte[t] > LIMITES_MEDIAS[t]) e.push(`${t === 'photo' ? 'Photos' : t === 'video' ? 'Vidéos' : 'Photos 360°'} : ${LIMITES_MEDIAS[t]} au plus.`);
  if (!medias.some(m => m.type === 'photo')) e.push('Au moins une photo est obligatoire.');

  if (e.length) return { ok: false, erreurs: [...new Set(e)].slice(0, 30) };
  const fiche: FicheLogement = {
    version: 1, transaction: transaction!, typeBien: typeBien!, periode, pieces, equipements, conditions, position,
    consentementOccupants: true, medias: medias.sort((a, b) => a.ordre - b.ordre).map((m, i) => ({ ...m, ordre: i })), brouillonId,
  };
  if (o.negociable === true) fiche.negociable = true;
  if (o.masquee === true) fiche.masquee = true;
  const q = texte(o.quartier, 120); if (q) fiche.quartier = q;
  const r = texte(o.repere, 300); if (r) fiche.repere = r;
  const w = texte(o.whatsapp, 30); if (w && w.replace(/\D/g, '').length >= 6) fiche.whatsapp = w;
  return { ok: true, fiche };
}

/** Données gardées à part (data_privee) : jamais renvoyées par une route publique, visibles des modérateurs seulement. */
export interface LogementPrive { position?: Position; positionsMedias?: Record<string, Position> }
/**
 * Ce que le serveur enregistre (data.logement) et ce qu'il garde à part (data_privee).
 * Les positions de prise de vue des médias ne sont JAMAIS publiques (règle D2 de SECURITE_ISO27001.md) : elles révéleraient
 * l'emplacement exact d'un logement masqué et la position de l'auteur. Seuls le badge et l'écart maximal sont publiés.
 */
export function preparerLogementPublic(fiche: FicheLogement, id: string, base: BaseAnnonce): { logement: LogementPublic; privee: LogementPrive | null } {
  const pub = positionPublique(fiche, id);
  const { position, ...reste } = fiche;
  const positionsMedias: Record<string, Position> = {};
  const medias = fiche.medias.map(({ capturedLat, capturedLng, ...m }) => {
    if (capturedLat !== undefined && capturedLng !== undefined) positionsMedias[m.id] = { lat: capturedLat, lng: capturedLng };
    return m;
  });
  const privee: LogementPrive = { ...(fiche.masquee ? { position } : {}), ...(Object.keys(positionsMedias).length ? { positionsMedias } : {}) };
  const logement: LogementPublic = {
    ...reste,
    medias,
    ...(fiche.masquee ? {} : { position }),
    positionPublique: pub,
    completude: calculerCompletude(fiche, base),
    certifiee: calculerCertification(fiche),
    ecartMediasM: ecartMediasM(fiche),
    couverture: mediaCouverture(fiche.medias)?.id,
  };
  return { logement, privee: Object.keys(privee).length ? privee : null };
}

// ------------------------------------------------------------------ affichage
/** « 3 ch. · 1 salon · 2 sdb · 120 m² » */
export function resumePieces(p: PiecesLogement = {}): string {
  return [
    p.chambres ? `${p.chambres} ch.` : '', p.salons ? `${p.salons} salon${p.salons > 1 ? 's' : ''}` : '',
    p.sallesDeBain ? `${p.sallesDeBain} sdb` : '', p.surfaceHabitable ? `${p.surfaceHabitable} m²` : '',
  ].filter(Boolean).join(' · ');
}
/** Équipements cochés, groupés comme le catalogue : « Climatisation · 3 », « Compteur : Prépayé (à carte) ». */
export function equipementsGroupes(eq: Record<string, true | number | string> = {}) {
  return CATALOGUE_LOGEMENT.groupes.map(g => ({
    ...g,
    coches: g.items.filter(i => eq[i.id] !== undefined).map(i => {
      const v = eq[i.id];
      const valeur = i.type === 'number' ? String(v) : i.type === 'option' ? (i.options?.find(o => o.id === v)?.label ?? String(v)) : '';
      return { ...i, valeur, texte: valeur ? (i.type === 'option' ? `${i.label} : ${valeur}` : `${i.label} · ${valeur}`) : i.label };
    }),
  })).filter(g => g.coches.length > 0);
}
export const formaterDistance = (m?: number | null) => (m === undefined || m === null ? '' : m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} km`);
