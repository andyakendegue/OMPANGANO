/**
 * Achats intégrés et abonnements. ACHATS_FOURNISSEUR=simulation accepte les reçus « simule:<identifiant unique> » (développement, jamais en production) ;
 * apple et google exigent leurs identifiants (APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_BUNDLE_ID / GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_PACKAGE_NAME)
 * et la vérification serveur (App Store Server API, Google Play Developer API) : branchées derrière `verifierRecu`, 501 tant que les identifiants manquent.
 * Un reçu ne crédite qu'une fois (table achats_recus).
 */
import type { Queryable } from './db.ts';
import { journaliser, str, type Ctx } from './ctx.ts';

export interface RecuVerifie { reference: string; fin?: Date | null }

export async function verifierRecu(env: NodeJS.ProcessEnv, magasin: string, recu: string): Promise<RecuVerifie | { erreur: string; statut: number }> {
  if (magasin === 'simulation') {
    if (env.ACHATS_FOURNISSEUR !== 'simulation' || env.NODE_ENV === 'production') return { erreur: 'Reçus simulés refusés (ACHATS_FOURNISSEUR=simulation requis, hors production).', statut: 403 };
    return /^simule:[A-Za-z0-9_-]{4,80}$/.test(recu) ? { reference: recu } : { erreur: 'Reçu simulé invalide (simule:<identifiant>).', statut: 400 };
  }
  if (magasin === 'apple') return env.APPLE_KEY_ID && env.APPLE_ISSUER_ID && env.APPLE_PRIVATE_KEY ? { erreur: 'Vérification App Store Server API : à écrire avec vos identifiants (voir SERVICES_A_CONNECTER.md).', statut: 501 } : { erreur: 'Apple non configuré (APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY).', statut: 501 };
  if (magasin === 'google') return env.GOOGLE_SERVICE_ACCOUNT_JSON ? { erreur: 'Vérification Google Play : à écrire avec votre compte de service (voir SERVICES_A_CONNECTER.md).', statut: 501 } : { erreur: 'Google non configuré (GOOGLE_SERVICE_ACCOUNT_JSON).', statut: 501 };
  return { erreur: 'Magasin inconnu.', statut: 400 };
}

/** Accorde ce que donne un produit (abonnement ou achat) ; utilisé par les reçus des magasins et par les paiements Mobile Money. */
export async function accorderProduit(q: Queryable, uid: string, produitId: string, source: string, reference: string): Promise<{ type: string }> {
  const p = (await q.query<any>(`SELECT data FROM contenus WHERE collection = 'produits' AND id = $1 AND deleted_at IS NULL`, [produitId]))[0];
  if (!p) throw new Error('Produit introuvable.');
  const d = p.data, jours = d.periode === 'an' ? 366 : d.periode === 'mois' ? 31 : 0;
  if (d.type === 'abonnement') await q.query(`INSERT INTO droits (user_id, produit_id, type, fin, source, reference) VALUES ($1,$2,'abonnement', clock_timestamp() + ($3 || ' days')::interval, $4, $5)`, [uid, produitId, String(jours || 31), source, reference]);
  else for (const contenu of (Array.isArray(d.donne_acces) && d.donne_acces.length ? d.donne_acces : [produitId]) as string[]) await q.query(`INSERT INTO droits (user_id, produit_id, type, contenu_id, source, reference) VALUES ($1,$2,'achat',$3,$4,$5)`, [uid, produitId, contenu, source, reference]);
  return { type: d.type };
}

export function registerAchats({ app, db, fail, acteur, env }: Ctx) {
  /** Offres visibles sans compte. */
  app.get('/pub/produits', async (_req, reply) => {
    const r = await db.query<any>(`SELECT id, data FROM contenus WHERE collection = 'produits' AND publie AND deleted_at IS NULL ORDER BY id`);
    reply.header('Cache-Control', 'public, max-age=60');
    return { mode: env.ACHATS_FOURNISSEUR === 'simulation' ? 'simulation' : 'magasins', produits: r.map(x => ({ ...x.data, id: x.id })) };
  });

  app.post('/v1/achats/recu', async (req) => {
    const a = await acteur(req);
    const { magasin, produitId, recu } = (req.body || {}) as { magasin?: string; produitId?: string; recu?: string };
    if (!str(magasin) || !str(produitId) || !str(recu)) return fail(400, 'Magasin, produit et reçu attendus.');
    const p = (await db.query<any>(`SELECT data FROM contenus WHERE collection = 'produits' AND id = $1 AND publie AND deleted_at IS NULL`, [produitId]))[0];
    if (!p) return fail(404, 'Produit introuvable.');
    const v = await verifierRecu(env, magasin, recu);
    if ('erreur' in v) return fail(v.statut, v.erreur);
    return db.tx(async q => {
      if ((await q.query(`INSERT INTO achats_recus (reference, user_id, produit_id, magasin) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING reference`, [v.reference, a.auth.uid, produitId, magasin])).length === 0) return fail(409, 'Ce reçu a déjà été utilisé.');
      const { type } = await accorderProduit(q, a.auth.uid, produitId, magasin, v.reference);
      await journaliser(q, a.auth.uid, 'achat', produitId, { magasin });
      return { ok: true, produitId, type };
    });
  });
}
