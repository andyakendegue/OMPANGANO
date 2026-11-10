/**
 * Paiements Mobile Money propres à Nkala (Airtel Money, Moov Money). MOBILEMONEY_FOURNISSEUR :
 *   manuel     (défaut en production) : l'utilisateur envoie l'argent au numéro marchand (MOBILEMONEY_NUMERO_AIRTEL / _MOOV) avec la référence, puis déclare l'identifiant
 *              de transaction ; un administrateur valide dans la console (ou le webhook).
 *   api        : agrégateur ou opérateur (MOBILEMONEY_API_URL, MOBILEMONEY_API_KEY) : demande de paiement envoyée au téléphone ; confirmation par webhook signé.
 *   simulation : développement seulement, code 0000, jamais en production.
 * Webhook : POST /pay/webhook, en-tête x-signature = HMAC-SHA256 hexadécimal du corps avec MOBILEMONEY_WEBHOOK_SECRET ; corps { reference, statut: 'success'|'failed', transaction }.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { normaliserTelephone } from '../../../packages/noyau/src/telephone.ts';
import { accorderProduit } from './achats.ts';
import type { Queryable } from './db.ts';
import { journaliser, str, type Ctx } from './ctx.ts';

export const OPERATEURS = ['airtel', 'moov'] as const;
const EXPIRATION_H = 24;

export const modeMobileMoney = (env: NodeJS.ProcessEnv): 'manuel' | 'api' | 'simulation' => {
  const m = env.MOBILEMONEY_FOURNISSEUR;
  return m === 'simulation' && env.NODE_ENV !== 'production' ? 'simulation' : m === 'api' && env.MOBILEMONEY_API_URL ? 'api' : 'manuel';
};

export const signerWebhook = (secret: string, corps: string) => createHmac('sha256', secret).update(corps).digest('hex');
export function signatureValide(secret: string, corps: string, recu: string | undefined): boolean {
  if (!secret || !recu) return false;
  const a = Buffer.from(signerWebhook(secret, corps)), b = Buffer.from(recu);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Confirme un paiement (une seule fois) et accorde le produit. Renvoie false si déjà traité. */
export async function confirmerPaiement(q: Queryable, id: string, par: string, transaction?: string): Promise<boolean> {
  const r = await q.query<any>(`UPDATE paiements SET statut = 'confirme', confirme_at = clock_timestamp(), confirme_par = $2, transaction_operateur = COALESCE($3, transaction_operateur) WHERE id = $1 AND statut IN ('en_attente','declare') RETURNING user_id, produit_id, reference`, [id, par, transaction ?? null]);
  if (!r.length) return false;
  await accorderProduit(q, r[0].user_id, r[0].produit_id, 'mobile_money', r[0].reference);
  await journaliser(q, par, 'paiement_confirme', id, { produit: r[0].produit_id });
  return true;
}

export function registerMobileMoney({ app, db, fail, acteur, env, notify }: Ctx) {
  const mode = modeMobileMoney(env);
  const admin = async (req: any) => { const a = await acteur(req); if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.'); return a; };
  const numeroMarchand = (op: string) => env[`MOBILEMONEY_NUMERO_${op.toUpperCase()}`] || null;

  app.get('/pub/paiements/modes', async () => ({ mode, operateurs: OPERATEURS.filter(o => mode !== 'manuel' || numeroMarchand(o)).map(o => ({ id: o, nom: o === 'airtel' ? 'Airtel Money' : 'Moov Money' })) }));

  app.post('/v1/paiements', async (req, reply) => {
    const a = await acteur(req);
    const { produitId, operateur, telephone } = (req.body || {}) as { produitId?: string; operateur?: string; telephone?: string };
    const tel = str(telephone) ? normaliserTelephone(telephone) : null;
    if (!str(produitId) || !OPERATEURS.includes(operateur as never) || !tel) return fail(400, 'Produit, opérateur (airtel ou moov) et numéro valides attendus.');
    const p = (await db.query<any>(`SELECT data FROM contenus WHERE collection = 'produits' AND id = $1 AND publie AND deleted_at IS NULL`, [produitId]))[0];
    if (!p || !(Number(p.data.prix_fcfa) > 0)) return fail(404, 'Produit introuvable ou sans prix.');
    if (mode === 'manuel' && !numeroMarchand(operateur!)) return fail(503, 'Ce moyen de paiement n\'est pas encore ouvert.');
    const enCours = (await db.query<any>(`SELECT count(*)::int AS n FROM paiements WHERE user_id = $1 AND statut IN ('en_attente','declare') AND expire_at > clock_timestamp()`, [a.auth.uid]))[0].n;
    if (enCours >= 3) return fail(429, 'Tu as déjà trois paiements en attente. Termine-les ou attends leur expiration.');
    const id = 'pay_' + randomBytes(8).toString('hex'), reference = 'NK-' + randomBytes(3).toString('hex').toUpperCase();
    let externe: string | null = null;
    const instructions: Record<string, unknown> = { montant: p.data.prix_fcfa, reference };
    if (mode === 'manuel') Object.assign(instructions, { numero: numeroMarchand(operateur!), etapes: [`Ouvre ${operateur === 'airtel' ? 'Airtel Money' : 'Moov Money'} et envoie ${p.data.prix_fcfa} FCFA au ${numeroMarchand(operateur!)}.`, `Mets la référence ${reference} dans le message.`, 'Reviens ici et saisis l\'identifiant de la transaction reçu par SMS.'] });
    else if (mode === 'api') {
      try {
        const r = await fetch(`${env.MOBILEMONEY_API_URL!.replace(/\/+$/, '')}/collect`, { method: 'POST', headers: { Authorization: `Bearer ${env.MOBILEMONEY_API_KEY || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ operator: operateur, msisdn: tel, amount: p.data.prix_fcfa, currency: 'XAF', reference, callback_url: `${env.PUBLIC_API_URL || ''}/pay/webhook` }) });
        if (!r.ok) return fail(502, 'Le service de paiement n\'a pas répondu. Réessaie dans un instant.');
        externe = String(((await r.json()) as { id?: string }).id ?? ''); instructions.etapes = ['Une demande de paiement vient d\'arriver sur ton téléphone : confirme-la avec ton code secret.'];
      } catch { return fail(502, 'Le service de paiement est injoignable.'); }
    } else instructions.etapes = ['Mode simulation : saisis le code 0000 pour confirmer.'];
    await db.query(`INSERT INTO paiements (id, reference, user_id, produit_id, montant_fcfa, operateur, telephone, mode, instructions, reference_externe, expire_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, clock_timestamp() + ($11 || ' hours')::interval)`,
      [id, reference, a.auth.uid, produitId, Number(p.data.prix_fcfa), operateur, tel, mode, JSON.stringify(instructions), externe, String(EXPIRATION_H)]);
    return reply.status(201).send({ id, reference, statut: 'en_attente', mode, instructions });
  });

  const vue = (r: any) => ({ id: r.id, reference: r.reference, produitId: r.produit_id, montant: r.montant_fcfa, operateur: r.operateur, statut: r.statut, mode: r.mode, instructions: r.instructions, creeLe: r.created_at, expireLe: r.expire_at });
  app.get('/v1/paiements', async (req) => { const a = await acteur(req); return (await db.query<any>(`SELECT * FROM paiements WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`, [a.auth.uid])).map(vue); });
  app.get('/v1/paiements/:id', async (req) => {
    const a = await acteur(req);
    await db.query(`UPDATE paiements SET statut = 'expire' WHERE statut = 'en_attente' AND expire_at < clock_timestamp()`);
    const r = (await db.query<any>(`SELECT * FROM paiements WHERE id = $1 AND user_id = $2`, [(req.params as any).id, a.auth.uid]))[0];
    return r ? vue(r) : fail(404, 'Paiement introuvable.');
  });

  /** Mode manuel : l'utilisateur donne l'identifiant de transaction ; un administrateur vérifie sur le compte marchand. */
  app.post('/v1/paiements/:id/declarer', async (req) => {
    const a = await acteur(req);
    const { transaction } = (req.body || {}) as { transaction?: string };
    if (!str(transaction) || !/^[A-Za-z0-9._-]{6,40}$/.test(transaction.trim())) return fail(400, 'Identifiant de transaction attendu (6 à 40 caractères).');
    const r = (await db.query<any>(`SELECT * FROM paiements WHERE id = $1 AND user_id = $2`, [(req.params as any).id, a.auth.uid]))[0];
    if (!r) return fail(404, 'Paiement introuvable.');
    if (r.statut !== 'en_attente') return fail(409, 'Ce paiement n\'attend plus de déclaration.');
    try { await db.query(`UPDATE paiements SET statut = 'declare', transaction_operateur = $2 WHERE id = $1`, [r.id, transaction.trim()]); }
    catch (e: any) { if (e.code === '23505') return fail(409, 'Cet identifiant de transaction a déjà été utilisé.'); throw e; }
    notify('paiements');
    return { statut: 'declare' };
  });

  /** Simulation (développement) : code 0000. */
  app.post('/v1/paiements/:id/simuler', async (req) => {
    if (mode !== 'simulation') return fail(404, 'Non disponible.');
    const a = await acteur(req);
    const r = (await db.query<any>(`SELECT * FROM paiements WHERE id = $1 AND user_id = $2`, [(req.params as any).id, a.auth.uid]))[0];
    if (!r) return fail(404, 'Paiement introuvable.');
    if ((req.body as any)?.code !== '0000') return fail(400, 'Code incorrect.');
    await db.tx(q => confirmerPaiement(q, r.id, 'simulation'));
    return { statut: 'confirme' };
  });

  // Webhook de l'opérateur ou de l'agrégateur : signature obligatoire
  app.post('/pay/webhook', { config: { rawBody: true } } as never, async (req, reply) => {
    const corps = JSON.stringify(req.body ?? {});
    const secret = env.MOBILEMONEY_WEBHOOK_SECRET || '';
    // La signature est calculée sur le corps JSON canonique reçu (voir SERVICES_A_CONNECTER.md : l'agrégateur doit signer le JSON compact)
    if (!signatureValide(secret, corps, req.headers['x-signature'] as string | undefined)) return fail(401, 'Signature invalide.');
    const { reference, statut, transaction } = (req.body || {}) as { reference?: string; statut?: string; transaction?: string };
    const r = (await db.query<any>(`SELECT id FROM paiements WHERE reference = $1`, [reference ?? '']))[0];
    if (!r) return fail(404, 'Référence inconnue.');
    if (statut === 'success') await db.tx(q => confirmerPaiement(q, r.id, 'webhook', transaction));
    else if (statut === 'failed') await db.query(`UPDATE paiements SET statut = 'echoue' WHERE id = $1 AND statut IN ('en_attente','declare')`, [r.id]);
    return reply.status(204).send();
  });

  // Administration
  app.get('/v1/admin/paiements', async (req) => {
    await admin(req);
    const { statut } = req.query as { statut?: string };
    await db.query(`UPDATE paiements SET statut = 'expire' WHERE statut = 'en_attente' AND expire_at < clock_timestamp()`);
    return (await db.query<any>(`SELECT p.*, u.data->>'displayName' AS nom FROM paiements p LEFT JOIN users u ON u.id = p.user_id ${statut ? 'WHERE p.statut = $1' : ''} ORDER BY p.created_at DESC LIMIT 200`, statut ? [statut] : [])).map(r => ({ ...vue(r), userId: r.user_id, nom: r.nom, telephone: r.telephone, transaction: r.transaction_operateur }));
  });
  app.post('/v1/admin/paiements/:id/valider', async (req) => {
    const a = await admin(req);
    const ok = await db.tx(q => confirmerPaiement(q, (req.params as any).id, a.auth.uid));
    if (!ok) return fail(409, 'Ce paiement ne peut plus être validé (déjà traité ou expiré).');
    notify('paiements');
    return { statut: 'confirme' };
  });
  app.post('/v1/admin/paiements/:id/refuser', async (req) => {
    const a = await admin(req);
    const { note } = (req.body || {}) as { note?: string };
    const r = await db.query(`UPDATE paiements SET statut = 'refuse', note = $2 WHERE id = $1 AND statut IN ('en_attente','declare') RETURNING id`, [(req.params as any).id, note?.slice(0, 300) ?? null]);
    if (!r.length) return fail(409, 'Ce paiement ne peut plus être refusé.');
    await journaliser(db, a.auth.uid, 'paiement_refuse', (req.params as any).id, { note });
    return { statut: 'refuse' };
  });
}
