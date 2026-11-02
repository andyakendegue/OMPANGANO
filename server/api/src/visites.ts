/**
 * Statistiques de fréquentation. La collecte est publique (visiteurs non connectés compris) mais bornée :
 * champs courts et listes blanches, limite par adresse IP. La lecture est réservée aux administrateurs.
 */
import type { Queryable } from './db.ts';

const TABS = ['crowdsource', 'explore', 'leaderboard', 'validator', 'admin', 'profile'];
const DEVICES = ['mobile', 'tablette', 'ordinateur'];
const txt = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

let geo: ((ip: string) => { country?: string } | null) | null | undefined;
async function pays(ip: string | undefined): Promise<string | null> {
  if (!ip) return null;
  if (geo === undefined) {
    try {
      // @ts-ignore pas de déclarations de types pour ce paquet
      const mod: any = await import('geoip-lite');
      geo = (mod.default || mod).lookup;
    } catch { geo = null; }
  }
  try { return geo ? geo(ip.replace(/^::ffff:/, ''))?.country || null : null; } catch { return null; }
}

/** Limite simple en mémoire : 90 envois par minute et par adresse IP */
const fenetre = new Map<string, { debut: number; n: number }>();
export function tropDeRequetes(ip: string, maintenant = Date.now()): boolean {
  const f = fenetre.get(ip);
  if (!f || maintenant - f.debut > 60_000) {
    if (fenetre.size > 5000) fenetre.clear();
    fenetre.set(ip, { debut: maintenant, n: 1 });
    return false;
  }
  return ++f.n > 90;
}

export async function enregistrerVisite(q: Queryable, ip: string | undefined, body: any): Promise<void> {
  const sid = txt(body?.sid, 64);
  const vid = txt(body?.vid, 64);
  if (!sid || !vid || !/^[A-Za-z0-9_-]{8,64}$/.test(sid) || !/^[A-Za-z0-9_-]{8,64}$/.test(vid)) return;
  const dev = body?.device || {};
  const type = DEVICES.includes(dev.type) ? dev.type : null;
  const duree = Math.max(0, Math.min(Math.round(Number(body?.dur) || 0), 6 * 3600));
  await q.query(
    `INSERT INTO visit_sessions (id, visitor_id, ip, country, device_type, os, browser, screen, lang, referrer, user_id, duration_s)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (id) DO UPDATE SET
       last_seen_at = clock_timestamp(),
       duration_s = GREATEST(visit_sessions.duration_s, EXCLUDED.duration_s),
       user_id = COALESCE(EXCLUDED.user_id, visit_sessions.user_id)`,
    [sid, vid, ip || null, await pays(ip), type, txt(dev.os, 40), txt(dev.browser, 40), txt(dev.screen, 20),
      txt(dev.lang, 20), txt(body?.ref, 200), txt(body?.uid, 128), duree]
  );
  if (body?.ev === 'tab' && TABS.includes(body.tab)) {
    await q.query(`INSERT INTO visit_tab_views (session_id, tab) VALUES ($1,$2)`, [sid, body.tab]);
  }
}

export async function lireStatistiques(q: Queryable, jours: number) {
  const j = Math.min(Math.max(Math.round(jours) || 30, 1), 365);
  const depuis = `now() - ($1::int * interval '1 day')`;
  const resume = (await q.query<any>(
    `SELECT count(*)::int AS sessions, count(DISTINCT visitor_id)::int AS visiteurs,
            COALESCE(round(avg(duration_s))::int, 0) AS duree_moyenne_s,
            count(*) FILTER (WHERE user_id IS NOT NULL)::int AS connectees
     FROM visit_sessions WHERE started_at >= ${depuis}`, [j]
  ))[0];
  const groupe = (col: string) => q.query<any>(
    `SELECT COALESCE(${col}, 'inconnu') AS cle, count(*)::int AS n FROM visit_sessions
     WHERE started_at >= ${depuis} GROUP BY 1 ORDER BY n DESC LIMIT 30`, [j]);
  return {
    jours: j,
    resume,
    parJour: await q.query<any>(
      `SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS jour, count(*)::int AS sessions,
              count(DISTINCT visitor_id)::int AS visiteurs, COALESCE(round(avg(duration_s))::int, 0) AS duree_moyenne_s
       FROM visit_sessions WHERE started_at >= ${depuis} GROUP BY 1 ORDER BY 1`, [j]),
    parPays: await groupe('country'),
    parAppareil: await groupe('device_type'),
    parSysteme: await groupe('os'),
    parNavigateur: await groupe('browser'),
    parOnglet: await q.query<any>(
      `SELECT tab AS cle, count(*)::int AS n FROM visit_tab_views WHERE at >= ${depuis} GROUP BY 1 ORDER BY n DESC`, [j]),
    recentes: await q.query<any>(
      `SELECT started_at, ip, country, device_type, os, browser, screen, lang, duration_s, user_id
       FROM visit_sessions ORDER BY started_at DESC LIMIT 100`)
  };
}
