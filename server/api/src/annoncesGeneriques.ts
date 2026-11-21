/**
 * Annonces de tous types (hors logement) : fiche validée par le noyau (annonces.ts), médias vérifiés dans le stockage,
 * quota (1 gratuite par mois par défaut, puis un crédit payé par annonce), « repositionner », alertes de nouvelles annonces
 * (notification poussée à la publication). Décisions de Capp du 18/11/2026 (NKALA_COMPLET_PLAN.md, lot L1).
 */
import { preparerAnnoncePublique, validerFicheAnnonce, categorieAnnonce, type AnnoncePublique } from '../../../packages/noyau/src/annonces.ts';
import type { LogementPrive } from '../../../packages/noyau/src/logement.ts';
import type { MediaStorage } from './storage.ts';
import type { Queryable } from './db.ts';
import { parametre } from './ctx.ts';
import { cheminsDe } from './annoncesLogement.ts';

export interface ReglageAnnonces { gratuites_mois: number; produit: string; repositionner_jours: number; alertes_max: number }
export const REGLAGE_ANNONCES_DEFAUT: ReglageAnnonces = { gratuites_mois: 1, produit: 'annonce-supplementaire', repositionner_jours: 7, alertes_max: 10 };
export async function reglageAnnonces(q: Queryable): Promise<ReglageAnnonces> {
  const r = await parametre<Partial<ReglageAnnonces>>(q, 'annonces', {});
  const n = (v: unknown, d: number, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(max, Math.floor(v)) : d);
  return {
    gratuites_mois: n(r.gratuites_mois, REGLAGE_ANNONCES_DEFAUT.gratuites_mois, 1000),
    produit: typeof r.produit === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(r.produit) ? r.produit : REGLAGE_ANNONCES_DEFAUT.produit,
    repositionner_jours: n(r.repositionner_jours, REGLAGE_ANNONCES_DEFAUT.repositionner_jours, 365),
    alertes_max: n(r.alertes_max, REGLAGE_ANNONCES_DEFAUT.alertes_max, 100),
  };
}

/** Valide la fiche, vérifie la présence de chaque fichier, recalcule complétude et certification. */
export async function preparerAnnonceGenerique(storage: MediaStorage, uid: string, id: string, brut: unknown, base: { titre?: string; description?: string; prix?: number; telephone?: string }):
  Promise<{ ok: true; fiche: AnnoncePublique; privee: LogementPrive | null; lat: number; lng: number } | { ok: false; erreurs: string[] }> {
  const v = validerFicheAnnonce(brut, uid);
  if (!v.ok) return v;
  const absents: string[] = [];
  for (const c of cheminsDe(v.fiche)) if (!(await storage.exists(c))) absents.push(c.split('/').pop()!);
  if (absents.length) return { ok: false, erreurs: [`Médias introuvables dans le stockage (envoi incomplet) : ${absents.slice(0, 5).join(', ')}${absents.length > 5 ? '…' : ''}.`] };
  const { fiche, privee } = preparerAnnoncePublique(v.fiche, id, base);
  return { ok: true, fiche, privee, lat: fiche.positionPublique.lat, lng: fiche.positionPublique.lng };
}

/** Annonces publiées ce mois-ci (les annonces supprimées comptent : supprimer ne rend pas le quota). */
export async function annoncesDuMois(q: Queryable, uid: string): Promise<number> {
  return (await q.query<any>(`SELECT count(*)::int AS n FROM contenus WHERE collection = 'annonces' AND owner_id = $1 AND created_at > date_trunc('month', clock_timestamp()) AND NOT coalesce((data->>'payee_credit')::boolean, false)`, [uid]))[0].n;
}
export async function creditsLibres(q: Queryable, uid: string): Promise<number> {
  return (await q.query<any>(`SELECT count(*)::int AS n FROM annonces_credits WHERE user_id = $1 AND utilise_par IS NULL`, [uid]))[0].n;
}

/** État du quota pour l'app (« 0 / 1 gratuite ce mois-ci, 2 crédits »). */
export async function etatQuota(q: Queryable, uid: string) {
  const r = await reglageAnnonces(q);
  const p = (await q.query<any>(`SELECT data FROM contenus WHERE collection = 'produits' AND id = $1 AND publie AND deleted_at IS NULL`, [r.produit]))[0]?.data;
  return { gratuites_mois: r.gratuites_mois, utilisees: await annoncesDuMois(q, uid), credits: await creditsLibres(q, uid), produit: r.produit, prix_fcfa: Number(p?.prix_fcfa) || null, prix_nkr: Number(p?.prix_nkr) || null };
}

/**
 * Décide si l'annonce peut être publiée : dans le quota gratuit, ou en consommant un crédit (dans la transaction).
 * Renvoie { payee: true } si un crédit a été pris, ou null si ni quota ni crédit (l'app propose l'achat).
 */
export async function reserverPublication(q: Queryable, uid: string, annonceId: string): Promise<{ payee: boolean } | null> {
  const r = await reglageAnnonces(q);
  if ((await annoncesDuMois(q, uid)) < r.gratuites_mois) return { payee: false };
  const c = await q.query<any>(`UPDATE annonces_credits SET utilise_par = $2, utilise_le = clock_timestamp() WHERE id = (SELECT id FROM annonces_credits WHERE user_id = $1 AND utilise_par IS NULL ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id`, [uid, annonceId]);
  return c.length ? { payee: true } : null;
}

// ---------------------------------------------------------------- alertes de nouvelles annonces
export interface FiltresAlerte { categorie?: string; sc?: string; transaction?: string; ville?: string; q?: string; prix_max?: number; lat?: number; lng?: number; rayon_km?: number }
/** Nettoie les filtres d'une alerte (liste blanche). */
export function filtresAlerte(x: unknown): FiltresAlerte | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>, f: FiltresAlerte = {};
  const t = (v: unknown, m: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, m) : undefined);
  if (t(o.categorie, 40)) { if (o.categorie !== 'logement' && !categorieAnnonce(String(o.categorie))) return null; f.categorie = String(o.categorie); }
  for (const k of ['sc', 'transaction', 'ville', 'q'] as const) { const v = t(o[k], 80); if (v) f[k] = v; }
  const n = (v: unknown, a: number, b: number) => (typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b ? v : undefined);
  const pm = n(o.prix_max, 0, 1e12); if (pm !== undefined) f.prix_max = pm;
  const la = n(o.lat, -90, 90), lo = n(o.lng, -180, 180), r = n(o.rayon_km, 0.1, 50);
  if (la !== undefined && lo !== undefined && r !== undefined) { f.lat = la; f.lng = lo; f.rayon_km = r; }
  return Object.keys(f).length ? f : null;
}

const dist = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000, rad = (x: number) => (x * Math.PI) / 180, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2)));
};
/** Une annonce publiée correspond-elle à l'alerte ? (logique pure, testée) */
export function correspond(f: FiltresAlerte, data: any, pos: { lat: number; lng: number } | null): boolean {
  const X = data?.logement ?? data?.fiche ?? {};
  if (f.categorie && data?.categorie_id !== f.categorie) return false;
  if (f.sc && data?.fiche?.sousCategorie !== f.sc) return false;
  if (f.transaction && X.transaction !== f.transaction) return false;
  if (f.ville && !`${data?.ville ?? ''} ${X.quartier ?? ''}`.toLowerCase().includes(f.ville.toLowerCase())) return false;
  if (f.q && !`${data?.titre ?? ''} ${data?.description ?? ''}`.toLowerCase().includes(f.q.toLowerCase())) return false;
  if (f.prix_max !== undefined && !(Number(data?.prix) > 0 && Number(data.prix) <= f.prix_max)) return false;
  if (f.lat !== undefined && f.lng !== undefined && f.rayon_km !== undefined) { if (!pos || dist(pos, { lat: f.lat, lng: f.lng }) > f.rayon_km * 1000) return false; }
  return true;
}
/** À la publication : comptes dont une alerte correspond (sauf l'auteur), une notification par alerte et par heure au plus. */
export async function alertesConcernees(q: Queryable, data: any, auteur: string | null, pos: { lat: number; lng: number } | null): Promise<{ id: number; user_id: string; nom: string }[]> {
  const r = await q.query<any>(`SELECT id, user_id, nom, filtres FROM annonces_alertes WHERE actif AND (filtres->>'categorie' IS NULL OR filtres->>'categorie' = $1) AND user_id IS DISTINCT FROM $2
    AND (derniere_notif IS NULL OR derniere_notif < clock_timestamp() - interval '1 hour') LIMIT 5000`, [data?.categorie_id ?? '', auteur]);
  return r.filter(a => correspond(a.filtres, data, pos)).map(a => ({ id: a.id, user_id: a.user_id, nom: a.nom }));
}
