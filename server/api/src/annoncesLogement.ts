/**
 * Annonces de logement : validation de la fiche (module partagé du noyau, calculs refaits ici), vérification des médias
 * dans le stockage, URL présignées pour la lecture publique, filtres SQL (distance, prix, pièces, équipements, 360…).
 */
import {
  preparerLogementPublic, validerFicheLogement, CATALOGUE_LOGEMENT, type FicheLogement, type LogementPrive, type LogementPublic, type MediaAnnonce,
} from '../../../packages/noyau/src/logement.ts';
import type { MediaStorage } from './storage.ts';
import type { Queryable } from './db.ts';

/** Durée de validité des URL de lecture des médias d'annonce (6 h). */
export const TTL_MEDIAS_ANNONCE_S = 6 * 3600;

export function cheminsDe(l: { medias?: MediaAnnonce[] } | undefined | null): string[] {
  return (l?.medias ?? []).flatMap(m => [m.chemin, m.cheminVignette, m.cheminHd].filter((x): x is string => !!x));
}

/**
 * Valide la fiche, vérifie que chaque fichier est bien dans le stockage, recalcule complétude et certification.
 * Renvoie ce qu'il faut écrire (data.logement, data_privee, lat, lng) ou la liste des erreurs.
 */
export async function preparerAnnonceLogement(storage: MediaStorage, uid: string, id: string, brut: unknown, base: { titre?: string; description?: string; prix?: number; telephone?: string }):
  Promise<{ ok: true; logement: LogementPublic; privee: LogementPrive | null; lat: number; lng: number } | { ok: false; erreurs: string[] }> {
  const v = validerFicheLogement(brut, uid);
  if (!v.ok) return v;
  const fiche: FicheLogement = v.fiche;
  const absents: string[] = [];
  for (const c of cheminsDe(fiche)) if (!(await storage.exists(c))) absents.push(c.split('/').pop()!);
  if (absents.length) return { ok: false, erreurs: [`Médias introuvables dans le stockage (envoi incomplet) : ${absents.slice(0, 5).join(', ')}${absents.length > 5 ? '…' : ''}.`] };
  const { logement, privee } = preparerLogementPublic(fiche, id, base);
  return { ok: true, logement, privee, lat: logement.positionPublique.lat, lng: logement.positionPublique.lng };
}

/** Ajoute les URL présignées (url, urlVignette, urlHd) à chaque média, et couvertureUrl. Ne modifie pas l'objet reçu. */
export async function signerLogement(storage: MediaStorage, l: LogementPublic | undefined | null) {
  if (!l || !Array.isArray(l.medias)) return l;
  const s = (p?: string) => (p ? storage.presignGet(p, TTL_MEDIAS_ANNONCE_S) : Promise.resolve(undefined));
  const medias = await Promise.all(l.medias.map(async m => ({ ...m, url: await s(m.chemin), urlVignette: await s(m.cheminVignette), urlHd: await s(m.cheminHd) })));
  const couv = medias.find(m => m.id === l.couverture) ?? medias[0];
  return { ...l, medias, couvertureUrl: couv ? (couv.type === 'video' ? couv.urlVignette : couv.urlVignette ?? couv.url) : undefined };
}

/** Annonce publique : jamais data_privee ; l'emplacement réel est absent quand il est masqué (déjà retiré à l'écriture). */
export async function lignePublique(storage: MediaStorage, r: { id: string; data: any; created_at?: unknown; distance_m?: number | null }) {
  const out: Record<string, unknown> = { ...r.data, id: r.id, cree: r.created_at };
  if (r.data?.logement) out.logement = await signerLogement(storage, r.data.logement);
  if (r.distance_m !== undefined && r.distance_m !== null) out.distance_m = Math.round(Number(r.distance_m));
  return out;
}

/** Marque des fichiers pour effacement (après 30 jours, par scripts/purger_medias_annonces.ts). */
export async function marquerAEffacer(q: Queryable, annonceId: string, chemins: string[], raison: string) {
  for (const c of chemins) await q.query(`INSERT INTO medias_annonces_a_effacer (chemin, annonce_id, raison) VALUES ($1,$2,$3) ON CONFLICT (chemin) DO NOTHING`, [c, annonceId, raison]);
}

const HAVERSINE = (pLat: string, pLng: string) =>
  `(12742000 * asin(least(1, sqrt(power(sin(radians(lat - ${pLat}) / 2), 2) + cos(radians(${pLat})) * cos(radians(lat)) * power(sin(radians(lng - ${pLng}) / 2), 2)))))`;
const EQUIP_CONNUS = new Set(CATALOGUE_LOGEMENT.groupes.flatMap(g => g.items.map(i => i.id)));

/**
 * Requête de GET /pub/annonces. Filtres facultatifs ; les anciennes annonces (format plat) restent servies
 * tant qu'aucun filtre propre au logement n'est demandé.
 */
export function requeteAnnonces(qs: Record<string, string | undefined>) {
  const p: unknown[] = [];
  const $ = (v: unknown) => { p.push(v); return `$${p.length}`; };
  const w: string[] = [`collection = 'annonces'`, 'publie', 'deleted_at IS NULL'];
  const L = `data->'logement'`;
  const num = (k: string) => { const n = Number(qs[k]); return qs[k] !== undefined && qs[k] !== '' && Number.isFinite(n) ? n : undefined; };
  if (qs.categorie) w.push(`data->>'categorie_id' = ${$(qs.categorie)}`);
  if (qs.ville) w.push(`(data->>'ville' ILIKE ${$(qs.ville)} OR ${L}->>'quartier' ILIKE ${$(qs.ville)})`);
  if (qs.quartier) w.push(`${L}->>'quartier' ILIKE ${$(`%${qs.quartier}%`)}`);
  if (qs.transaction) w.push(`${L}->>'transaction' = ${$(qs.transaction)}`);
  if (qs.type) w.push(`${L}->>'typeBien' = ${$(qs.type)}`);
  const prix = `(CASE WHEN jsonb_typeof(data->'prix') = 'number' THEN (data->>'prix')::numeric END)`;
  const pmin = num('prix_min'), pmax = num('prix_max'), ch = num('chambres_min');
  if (pmin !== undefined) w.push(`${prix} >= ${$(pmin)}`);
  if (pmax !== undefined) w.push(`${prix} <= ${$(pmax)}`);
  if (ch !== undefined) w.push(`(CASE WHEN jsonb_typeof(${L}->'pieces'->'chambres') = 'number' THEN (${L}->'pieces'->>'chambres')::numeric END) >= ${$(ch)}`);
  if (qs.meuble && ['non', 'partiel', 'oui'].includes(qs.meuble)) w.push(`${L}->'pieces'->>'meuble' = ${$(qs.meuble)}`);
  if (qs.avec360 === '1' || qs.avec360 === 'true') w.push(`${L} @> '{"medias":[{"type":"pano360"}]}'::jsonb`);
  if (qs.avecVideo === '1' || qs.avecVideo === 'true') w.push(`${L} @> '{"medias":[{"type":"video"}]}'::jsonb`);
  if (qs.certifiee === '1' || qs.certifiee === 'true') w.push(`${L}->>'certifiee' = 'true'`);
  for (const e of (qs.equip ?? '').split(',').map(x => x.trim()).filter(x => EQUIP_CONNUS.has(x)).slice(0, 10)) w.push(`jsonb_exists(${L}->'equipements', ${$(e)})`);

  const lat = num('lat'), lng = num('lng');
  const avecPos = lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  let distance = 'NULL::double precision';
  let rayonM: number | undefined;
  if (avecPos) {
    const pl = $(lat), pg = $(lng);
    distance = `CASE WHEN lat IS NULL THEN NULL ELSE ${HAVERSINE(pl, pg)} END`;
    const r = num('rayon_km');
    if (r !== undefined && r > 0) {
      const km = Math.min(50, r);
      rayonM = km * 1000;
      // Boîte englobante (index) puis calcul exact
      const dLat = km / 111.32, dLng = km / (111.32 * Math.max(0.01, Math.cos((lat! * Math.PI) / 180)));
      w.push(`lat BETWEEN ${$(lat! - dLat)} AND ${$(lat! + dLat)} AND lng BETWEEN ${$(lng! - dLng)} AND ${$(lng! + dLng)}`);
    }
  }
  const tri = qs.tri ?? 'recent';
  const ordre = tri === 'prix' ? `${prix} ASC NULLS LAST, created_at DESC`
    : tri === '-prix' ? `${prix} DESC NULLS LAST, created_at DESC`
    : tri === 'distance' && avecPos ? 'distance_m ASC NULLS LAST, created_at DESC'
    : tri === 'completude' ? `(CASE WHEN jsonb_typeof(${L}->'completude') = 'number' THEN (${L}->>'completude')::numeric END) DESC NULLS LAST, created_at DESC`
    : 'created_at DESC';
  const limite = Math.min(50, Math.max(1, num('limite') ?? 50));
  const page = Math.max(1, Math.floor(num('page') ?? 1));
  // Les anciennes routes renvoyaient jusqu'à 100 annonces sans pagination : on garde 100 quand rien n'est précisé.
  const lim = qs.limite || qs.page ? limite : 100;
  const filtreRayon = rayonM !== undefined ? `WHERE distance_m <= ${$(rayonM)}` : '';
  const sql = `SELECT * FROM (SELECT id, data, created_at, ${distance} AS distance_m FROM contenus WHERE ${w.join(' AND ')}) a ${filtreRayon} ORDER BY ${ordre} LIMIT ${lim} OFFSET ${(page - 1) * lim}`;
  return { sql, params: p, avecPos };
}
