/** Profil d'accès d'un compte : rang (d'après l'XP) et formules d'abonnement actives. Sert à appliquer les règles « rang_min » et « plans » des contenus. */
import { accesAvance, type DecisionAvancee, type ProfilAcces, type RegleAvancee } from '../../../packages/noyau/src/acces.ts';
import { rangPourXp } from '../../../packages/noyau/src/rangs.ts';
import { AVANTAGES, meilleurIa, type ModeIa } from '../../../packages/noyau/src/formules.ts';
import type { Queryable } from './db.ts';

/**
 * Profil d'accès d'un compte. `igolani` : une formule active ouvre les vidéos d'Igolani (colonne « igolani », ou Premium « tout »).
 * `ia`, `iaQuestions`, `avantages` : réglages des formules actives (Oma, Inina, Anyambiè ; 15 nov. 2026). Un abonnement sans
 * formule précisée garde l'ancien effet (IA complète).
 */
export async function profilAcces(q: Queryable, uid: string): Promise<ProfilAcces & { abonneJusque: number | null; igolani: boolean; ia: ModeIa; iaQuestions: number | null; avantages: string[] }> {
  const xp = Number((await q.query<any>(`SELECT xp FROM users WHERE id = $1`, [uid]))[0]?.xp ?? 0);
  const abos = await q.query<any>(`SELECT produit_id, fin FROM droits WHERE user_id = $1 AND type = 'abonnement' AND statut = 'actif' AND (fin IS NULL OR fin > clock_timestamp())`, [uid]);
  const plans = new Set<string>(); let tout = false, igolani = false, jusque: number | null = null, ia: ModeIa = 'aucune', iaQuestions: number | null = null;
  const avantages = new Set<string>();
  for (const a of abos) {
    jusque = Math.max(jusque ?? 0, a.fin ? new Date(a.fin).getTime() : 8.64e15);
    const p = (await q.query<any>(`SELECT data FROM contenus WHERE collection = 'produits' AND id = $1`, [a.produit_id]))[0]?.data;
    const acces: string[] = Array.isArray(p?.donne_acces) ? p.donne_acces : [];
    if (acces.includes('tout')) tout = true;
    if (!p?.plan_id) ia = meilleurIa(ia, 'complete');
    if (p?.plan_id) {
      plans.add(p.plan_id);
      const plan = (await q.query<any>(`SELECT data FROM contenus WHERE collection = 'plans' AND id = $1`, [p.plan_id]))[0]?.data;
      if (plan?.tout === true) tout = true;
      if (plan?.igolani === true) igolani = true;
      const mode = (['aucune', 'limitee', 'complete'].includes(plan?.ia) ? plan.ia : 'aucune') as ModeIa;
      ia = meilleurIa(ia, mode);
      if (mode === 'limitee') iaQuestions = Math.max(iaQuestions ?? 0, Math.floor(Number(plan?.ia_questions_semaine) || 0));
      for (const x of (Array.isArray(plan?.avantages) ? plan.avantages : [])) if (typeof x === 'string') avantages.add(x);
    }
  }
  if (tout) { ia = 'complete'; for (const a of AVANTAGES) avantages.add(a.id); }
  return { rang: rangPourXp(xp).index + 1, plans: [...plans], tout, igolani: igolani || tout, abonneJusque: jusque, ia, iaQuestions, avantages: [...avantages] };
}

/** Règle d'un contenu (colonnes rang_min et plans) appliquée au compte ; le personnel (modérateurs, administrateurs) passe toujours. */
export async function verifierRegle(q: Queryable, uid: string, personnel: boolean, data: Record<string, any>): Promise<DecisionAvancee> {
  if (personnel) return { ok: true };
  const regle: RegleAvancee = { rangMin: Number(data.rang_min) || 0, plans: Array.isArray(data.plans) ? data.plans : [] };
  if (!regle.rangMin && !regle.plans!.length) return { ok: true };
  return accesAvance(regle, await profilAcces(q, uid));
}
