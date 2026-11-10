/** Supervision : indicateurs de toute l'application pour la console d'administration. */
import { createHash } from 'node:crypto';
import { normaliserTelephone, uidTelephone } from '../../../packages/noyau/src/telephone.ts';
import { creerSession } from './sms.ts';
import { SmsIndisponible } from './sms.ts';
import { str, type Ctx } from './ctx.ts';

const empreinte = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 24);

export function registerSupervision(ctx: Ctx) {
  const { app, db, fail, acteur, env, sms, secret, ensureUser } = ctx;
  const staff = async (req: any) => { const a = await acteur(req); if (!a.isStaff) fail(403, 'Réservé aux modérateurs.'); return a; };

  // ---------------------------------------------------------------- connexion par SMS (Twilio Verify)
  async function limite(genre: string, cle: string, max: number, fenetreMin: number): Promise<boolean> {
    const n = (await db.query<any>(`SELECT count(*)::int AS n FROM sms_essais WHERE genre = $1 AND cle = $2 AND at > clock_timestamp() - ($3 || ' minutes')::interval`, [genre, cle, String(fenetreMin)]))[0].n;
    return n >= max;
  }

  app.post('/auth/sms/envoyer', async (req, reply) => {
    const { telephone } = (req.body || {}) as { telephone?: string };
    const tel = str(telephone) ? normaliserTelephone(telephone) : null;
    if (!tel) return fail(400, 'Numéro de téléphone invalide.');
    const ke = empreinte(tel), ip = empreinte(req.ip);
    if (await limite('envoi', ke, 5, 60) || await limite('envoi', ip, 20, 60)) return fail(429, 'Trop de demandes. Réessaie dans une heure.');
    try { await sms.envoyer(tel); }
    catch (e) { if (e instanceof SmsIndisponible) return fail(503, e.message); throw e; }
    await db.query(`INSERT INTO sms_essais (genre, cle) VALUES ('envoi',$1),('envoi',$2)`, [ke, ip]);
    return reply.status(202).send({ envoye: true, telephone: tel });
  });

  app.post('/auth/sms/verifier', async (req) => {
    const { telephone, code } = (req.body || {}) as { telephone?: string; code?: string };
    const tel = str(telephone) ? normaliserTelephone(telephone) : null;
    if (!tel || !str(code) || !/^\d{4,8}$/.test(code)) return fail(400, 'Numéro ou code invalide.');
    const ke = empreinte(tel);
    if (await limite('verif', ke, 8, 15)) return fail(429, 'Trop d\'essais. Demande un nouveau code dans quelques minutes.');
    let ok = false;
    try { ok = await sms.verifier(tel, code); }
    catch (e) { if (e instanceof SmsIndisponible) return fail(503, e.message); throw e; }
    await db.query(`INSERT INTO sms_essais (genre, cle, ok) VALUES ('verif',$1,$2)`, [ke, ok]);
    if (!ok) return fail(401, 'Code incorrect ou expiré.');
    const uid = uidTelephone(tel);
    await ensureUser(db, { uid, email: null, emailVerified: false, provider: 'phone', phone: tel });
    const jeton = await creerSession(secret, { uid, telephone: tel });
    return { jeton, uid, telephone: tel, expireDansJours: 30 };
  });

  // ---------------------------------------------------------------- supervision
  app.get('/v1/admin/supervision', async (req) => {
    await staff(req);
    const un = async <T,>(sql: string, p: unknown[] = []) => ((await db.query<any>(sql, p))[0] ?? {}) as T;
    const [u, jeux, ia, pub, smsS, abo, err, cont, mod, prog] = await Promise.all([
      un<any>(`SELECT count(*)::int AS total, count(*) FILTER (WHERE created_at > clock_timestamp() - interval '7 days')::int AS nouveaux7, count(*) FILTER (WHERE updated_at > clock_timestamp() - interval '7 days')::int AS actifs7, count(*) FILTER (WHERE id LIKE 'tel\\_%')::int AS par_sms FROM users WHERE deleted_at IS NULL`),
      db.query<any>(`SELECT jeu_id, count(*)::int AS parties, count(DISTINCT user_id)::int AS joueurs, round(avg(score))::int AS moyenne FROM scores WHERE at > clock_timestamp() - interval '7 days' GROUP BY jeu_id ORDER BY parties DESC LIMIT 20`),
      un<any>(`SELECT COALESCE(sum(jetons_entree + jetons_sortie) FILTER (WHERE at > date_trunc('day', clock_timestamp())), 0)::int AS jetons_jour,
                      COALESCE(sum(jetons_entree + jetons_sortie) FILTER (WHERE at > clock_timestamp() - interval '7 days'), 0)::int AS jetons_7j,
                      COALESCE(sum(jetons_entree + jetons_sortie) FILTER (WHERE at > date_trunc('month', clock_timestamp())), 0)::int AS jetons_mois,
                      count(*) FILTER (WHERE at > clock_timestamp() - interval '7 days')::int AS requetes_7j,
                      count(DISTINCT user_id) FILTER (WHERE at > clock_timestamp() - interval '7 days')::int AS utilisateurs_7j,
                      count(*) FILTER (WHERE simule)::int AS simulees FROM ia_usage`),
      db.query<any>(`SELECT zone, count(*) FILTER (WHERE type='affichage')::int AS affichages, count(*) FILTER (WHERE type='clic')::int AS clics, count(*) FILTER (WHERE type='recompense')::int AS recompenses FROM pub_evenements WHERE at > clock_timestamp() - interval '7 days' GROUP BY zone ORDER BY affichages DESC`),
      un<any>(`SELECT count(*) FILTER (WHERE genre='envoi')::int AS envois, count(*) FILTER (WHERE genre='verif' AND ok)::int AS verifs_ok, count(*) FILTER (WHERE genre='verif' AND NOT ok)::int AS verifs_ko FROM sms_essais WHERE at > clock_timestamp() - interval '24 hours'`),
      un<any>(`SELECT count(DISTINCT user_id)::int AS abonnes FROM droits WHERE type='abonnement' AND statut='actif' AND (fin IS NULL OR fin > clock_timestamp())`),
      db.query<any>(`SELECT message, count(*)::int AS n, max(at) AS dernier FROM app_errors WHERE at > clock_timestamp() - interval '24 hours' GROUP BY message ORDER BY n DESC LIMIT 5`),
      db.query<any>(`SELECT collection, count(*) FILTER (WHERE publie)::int AS publies, count(*)::int AS total FROM contenus WHERE deleted_at IS NULL AND owner_id IS NULL GROUP BY collection ORDER BY collection`),
      db.query<any>(`SELECT collection, count(*)::int AS n FROM contenus WHERE statut = 'en_attente' AND deleted_at IS NULL GROUP BY collection`),
      un<any>(`SELECT count(*)::int AS apprenants_7j FROM progression WHERE updated_at > clock_timestamp() - interval '7 days'`),
    ]);
    const clics = pub.reduce((n, x) => n + x.clics, 0), vus = pub.reduce((n, x) => n + x.affichages, 0);
    return {
      utilisateurs: u, apprentissage: prog, jeux, ia, pub: { zones: pub, ctr: vus ? Math.round((clics / vus) * 1000) / 10 : 0 }, sms: smsS,
      abonnes: abo.abonnes ?? 0, erreurs24h: err, contenus: cont, moderationEnAttente: mod,
      branchements: { twilio: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SID) || env.SMS_FOURNISSEUR === 'simulation', ia: !!env.ANTHROPIC_API_KEY, revive: !!env.REVIVE_URL, turn: !!(env.TURN_URLS && env.TURN_SECRET), stockage: !!env.S3_ENDPOINT },
    };
  });

  app.get('/v1/admin/supervision/series', async (req) => {
    await staff(req);
    const jours = Math.min(60, Math.max(7, Number((req.query as any).jours) || 14));
    const serie = async (sql: string) => {
      const r = await db.query<any>(sql, [String(jours)]);
      return r.map(x => ({ jour: String(x.jour).slice(0, 10), n: Number(x.n) }));
    };
    const gen = `(SELECT d::date AS jour FROM generate_series(current_date - ($1::int - 1), current_date, interval '1 day') d)`;
    const par = (table: string, col: string, extra = '', agg = 'count(t.*)') => serie(`SELECT g.jour, ${agg}::int AS n FROM ${gen} g LEFT JOIN ${table} t ON t.${col}::date = g.jour ${extra} GROUP BY g.jour ORDER BY g.jour`);
    const [inscriptions, parties, jetons, affichages] = await Promise.all([
      par('users', 'created_at'), par('scores', 'at'), par('ia_usage', 'at', '', 'COALESCE(sum(t.jetons_entree + t.jetons_sortie), 0)'),
      serie(`SELECT g.jour, count(t.*)::int AS n FROM ${gen} g LEFT JOIN pub_evenements t ON t.jour = g.jour AND t.type = 'affichage' GROUP BY g.jour ORDER BY g.jour`),
    ]);
    return { jours, inscriptions, parties, jetons, affichages };
  });
}
