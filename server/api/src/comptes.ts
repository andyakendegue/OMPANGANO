/**
 * Un seul compte par personne : un utilisateur connecté par Google ou e-mail (Firebase) peut lier son numéro de téléphone après vérification par SMS.
 * - Lien : le numéro est enregistré sur son compte ; ensuite, se connecter par SMS avec ce numéro ouvre CE compte (pas un compte « tel_… » séparé).
 * - Fusion : si un compte « tel_… » existait déjà pour ce numéro (créé avant le lien), ses données sont reversées dans le compte principal, puis il est retiré.
 */
import { normaliserTelephone, uidTelephone } from '../../../packages/noyau/src/telephone.ts';
import type { Queryable } from './db.ts';
import { journaliser, str, type Ctx } from './ctx.ts';
import { SmsIndisponible } from './sms.ts';

/** Compte principal (non « tel_ ») lié à ce numéro, s'il existe. */
export async function compteLieAuTelephone(q: Queryable, tel: string): Promise<string | null> {
  const r = await q.query<any>(`SELECT id FROM users WHERE data->>'phone' = $1 AND id NOT LIKE 'tel\\_%' AND deleted_at IS NULL ORDER BY created_at LIMIT 1`, [tel]);
  return r[0]?.id ?? null;
}

/** Reverse toutes les données du compte `de` dans `vers`, puis retire `de`. Transaction fournie par l'appelant. */
export async function fusionnerComptes(q: Queryable, de: string, vers: string): Promise<{ xp: number }> {
  if (de === vers) return { xp: 0 };
  const src = (await q.query<any>(`SELECT xp, contributions_count, recordings_count, validations_count FROM users WHERE id = $1 FOR UPDATE`, [de]))[0];
  if (!src) return { xp: 0 };
  await q.query(`UPDATE users SET xp = xp + $2, contributions_count = contributions_count + $3, recordings_count = recordings_count + $4, validations_count = validations_count + $5 WHERE id = $1`, [vers, src.xp, src.contributions_count, src.recordings_count, src.validations_count]);
  for (const t of ['scores', 'ia_usage', 'droits', 'paiements', 'push_jetons', 'achats_recus', 'contributions']) await q.query(`UPDATE ${t} SET user_id = $2 WHERE user_id = $1`, [de, vers]);
  await q.query(`UPDATE pub_evenements SET user_id = $2 WHERE user_id = $1`, [de, vers]);
  await q.query(`UPDATE votes SET user_id = $2 WHERE user_id = $1 AND sondage_id NOT IN (SELECT sondage_id FROM votes WHERE user_id = $2)`, [de, vers]);
  await q.query(`DELETE FROM votes WHERE user_id = $1`, [de]);
  await q.query(`UPDATE contenus SET owner_id = $2 WHERE owner_id = $1`, [de, vers]);
  // Progression : leçons et unités réunies, séries et compteurs au plus fort
  const pa = (await q.query<any>(`SELECT data FROM progression WHERE user_id = $1`, [de]))[0]?.data, pb = (await q.query<any>(`SELECT data FROM progression WHERE user_id = $1`, [vers]))[0]?.data;
  if (pa) {
    const m: Record<string, any> = { ...(pb ?? {}), ...pa, ...(pb ?? {}) };
    m.leconsTerminees = { ...(pa.leconsTerminees ?? {}), ...(pb?.leconsTerminees ?? {}) };
    m.unitesValidees = [...new Set([...(pa.unitesValidees ?? []), ...(pb?.unitesValidees ?? [])])];
    m.succes = [...new Set([...(pa.succes ?? []), ...(pb?.succes ?? [])])];
    m.jours = [...new Set([...(pa.jours ?? []), ...(pb?.jours ?? [])])].sort().slice(-120);
    m.amis = [...new Set([...(pa.amis ?? []), ...(pb?.amis ?? [])])];
    for (const k of ['parties', 'victoires', 'points']) m[k] = (pa[k] ?? 0) + (pb?.[k] ?? 0);
    for (const k of ['serie', 'recordSerie']) m[k] = Math.max(pa[k] ?? 0, pb?.[k] ?? 0);
    await q.query(`INSERT INTO progression (user_id, data) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = clock_timestamp()`, [vers, JSON.stringify(m)]);
    await q.query(`DELETE FROM progression WHERE user_id = $1`, [de]);
  }
  await q.query(`UPDATE users SET deleted_at = clock_timestamp(), data = data - 'phone' WHERE id = $1`, [de]);
  return { xp: Number(src.xp) };
}

export function registerComptes({ app, db, fail, acteur, ensureUser, sms }: Ctx) {
  app.post('/v1/me/telephone/envoyer', async (req, reply) => {
    const a = await acteur(req);
    if (a.auth.uid.startsWith('tel_')) return fail(400, 'Ce compte est déjà identifié par son téléphone.');
    const tel = str((req.body as any)?.telephone) ? normaliserTelephone((req.body as any).telephone) : null;
    if (!tel) return fail(400, 'Numéro de téléphone invalide.');
    const autre = await compteLieAuTelephone(db, tel);
    if (autre && autre !== a.auth.uid) return fail(409, 'Ce numéro est déjà lié à un autre compte.');
    const n = (await db.query<any>(`SELECT count(*)::int AS n FROM sms_essais WHERE genre = 'lien' AND cle = $1 AND at > clock_timestamp() - interval '1 hour'`, [a.auth.uid]))[0].n;
    if (n >= 5) return fail(429, 'Trop de demandes. Réessaie dans une heure.');
    try { await sms.envoyer(tel); } catch (e) { if (e instanceof SmsIndisponible) return fail(503, e.message); throw e; }
    await db.query(`INSERT INTO sms_essais (genre, cle) VALUES ('lien',$1)`, [a.auth.uid]);
    return reply.status(202).send({ envoye: true, telephone: tel });
  });

  app.post('/v1/me/telephone/verifier', async (req) => {
    const a = await acteur(req);
    const { telephone, code } = (req.body || {}) as { telephone?: string; code?: string };
    const tel = str(telephone) ? normaliserTelephone(telephone) : null;
    if (a.auth.uid.startsWith('tel_') || !tel || !str(code) || !/^\d{4,8}$/.test(code)) return fail(400, 'Numéro ou code invalide.');
    const essais = (await db.query<any>(`SELECT count(*)::int AS n FROM sms_essais WHERE genre = 'verif' AND cle = $1 AND at > clock_timestamp() - interval '15 minutes'`, [a.auth.uid]))[0].n;
    if (essais >= 8) return fail(429, 'Trop d\'essais. Demande un nouveau code dans quelques minutes.');
    let ok = false;
    try { ok = await sms.verifier(tel, code); } catch (e) { if (e instanceof SmsIndisponible) return fail(503, e.message); throw e; }
    await db.query(`INSERT INTO sms_essais (genre, cle, ok) VALUES ('verif',$1,$2)`, [a.auth.uid, ok]);
    if (!ok) return fail(401, 'Code incorrect ou expiré.');
    return db.tx(async q => {
      await ensureUser(q, a.auth);
      const autre = await compteLieAuTelephone(q, tel);
      if (autre && autre !== a.auth.uid) return fail(409, 'Ce numéro est déjà lié à un autre compte.');
      const fusion = (await q.query<any>(`SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL`, [uidTelephone(tel)])).length > 0;
      const verse = fusion ? await fusionnerComptes(q, uidTelephone(tel), a.auth.uid) : { xp: 0 };
      await q.query(`UPDATE users SET data = data || jsonb_build_object('phone', $2::text) WHERE id = $1`, [a.auth.uid, tel]);
      await journaliser(q, a.auth.uid, 'telephone_lie', a.auth.uid, { fusion, xp: verse.xp });
      return { lie: true, telephone: tel, fusion, xpReverse: verse.xp };
    });
  });
}
