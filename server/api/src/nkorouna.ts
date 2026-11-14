/**
 * Routes du Nkorouna (NKR). Achat : un produit de type « nkorouna » (colonne `nkorouna` = jetons donnés) payé en FCFA par
 * Mobile Money ou par un magasin ; c'est accorderProduit (achats.ts) qui crédite. Dépense : un produit qui a un `prix_nkr`.
 *
 * Variables :
 *   NKOROUNA_TRANSFERTS=oui          ouvre les envois entre utilisateurs (fermé par défaut : voir NKOROUNA.md, cadre légal)
 *   NKOROUNA_TRANSFERT_MAX_JOUR      plafond envoyé par jour et par personne (défaut 5000)
 *   NKOROUNA_ANCRAGE_URL / _SECRET   relais qui publie une racine de Merkle sur une blockchain et renvoie { reseau, transaction }
 *                                    (corps signé : en-tête x-signature = HMAC-SHA256 hexadécimal du JSON avec le secret)
 */
import { createHmac } from 'node:crypto';
import { journaliser, str, type Ctx } from './ctx.ts';
import { accorderProduit } from './achats.ts';
import { COMPTES_SYSTEME, ErreurNkr, NKR, compteDe, ecrire, ouvrirCompte, preparerAncrage, preuveDe, solde, verifierRegistre } from './nkorounaRegistre.ts';

const CLE = /^[A-Za-z0-9_-]{8,64}$/;

export function registerNkorouna({ app, db, fail, acteur, env }: Ctx) {
  const admin = async (req: any) => { const a = await acteur(req); if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.'); return a; };
  const transfertsOuverts = () => env.NKOROUNA_TRANSFERTS === 'oui';
  /** Les erreurs du registre deviennent des réponses HTTP lisibles. */
  const garde = async <T>(f: () => Promise<T>): Promise<T> => {
    try { return await f(); } catch (e) { if (e instanceof ErreurNkr) return fail(e.statut, e.message); throw e; }
  };
  const vueMouvement = (compte: string) => (m: any) => ({
    id: m.id, nature: m.nature, montant: Number(m.montant) * (m.credit === compte ? 1 : -1), meta: m.meta, le: m.created_at, hash: m.hash,
  });

  // ---------------------------------------------------------------- public (transparence, aucune donnée personnelle)
  app.get('/pub/nkorouna', async (_req, reply) => {
    const c = Object.fromEntries((await db.query<any>(`SELECT id, solde FROM nkr_comptes WHERE type = 'systeme'`)).map(r => [r.id, Number(r.solde)]));
    const tete = (await db.query<any>(`SELECT dernier_rang, dernier_hash FROM nkr_chaine WHERE id`))[0];
    const ancrages = await db.query<any>(`SELECT id, de_rang, jusqu_au_rang, racine, reseau, transaction, created_at FROM nkr_ancrages ORDER BY id DESC LIMIT 20`);
    reply.header('Cache-Control', 'public, max-age=30');
    return {
      ...NKR,
      // Jetons détenus par les utilisateurs = émis contre FCFA + offerts − dépensés.
      enCirculation: -(c[COMPTES_SYSTEME.emission] ?? 0) - (c[COMPTES_SYSTEME.bonus] ?? 0) - (c[COMPTES_SYSTEME.recettes] ?? 0),
      emisContreFcfa: -(c[COMPTES_SYSTEME.emission] ?? 0), offerts: -(c[COMPTES_SYSTEME.bonus] ?? 0), depenses: c[COMPTES_SYSTEME.recettes] ?? 0,
      chaine: { mouvements: Number(tete.dernier_rang), derniereEmpreinte: tete.dernier_hash },
      ancrages: ancrages.map(a => ({ id: Number(a.id), de: Number(a.de_rang), jusqua: Number(a.jusqu_au_rang), racine: a.racine, reseau: a.reseau, transaction: a.transaction, le: a.created_at })),
      transferts: transfertsOuverts(),
    };
  });

  /** Preuve qu'un mouvement fait partie d'une racine ancrée (empreintes seulement). */
  app.get('/pub/nkorouna/preuve/:id', async (req) => (await preuveDe(db, (req.params as any).id)) ?? fail(404, 'Mouvement introuvable.'));

  // ---------------------------------------------------------------- utilisateur
  app.get('/v1/nkorouna', async (req) => {
    const a = await acteur(req), compte = compteDe(a.auth.uid);
    const s = await solde(db, a.auth.uid);
    const mvts = await db.query<any>(`SELECT * FROM nkr_mouvements WHERE debit = $1 OR credit = $1 ORDER BY rang DESC LIMIT 50`, [compte]);
    return { ...NKR, ...s, transferts: transfertsOuverts(), mouvements: mvts.map(vueMouvement(compte)) };
  });

  /** Paie un produit en Nkorouna. `cle` : identifiant choisi par l'app pour cet achat (un double envoi ne débite qu'une fois). */
  app.post('/v1/nkorouna/depenser', async (req) => {
    const a = await acteur(req);
    const { produitId, cle } = (req.body || {}) as { produitId?: string; cle?: string };
    if (!str(produitId) || !str(cle) || !CLE.test(cle)) return fail(400, 'Produit et clé d\'achat (8 à 64 caractères) attendus.');
    const p = (await db.query<any>(`SELECT data FROM contenus WHERE collection = 'produits' AND id = $1 AND publie AND deleted_at IS NULL`, [produitId]))[0];
    const prix = Number(p?.data?.prix_nkr);
    if (!p || !(Number.isSafeInteger(prix) && prix > 0)) return fail(404, 'Produit introuvable ou sans prix en Nkorouna.');
    if (p.data.type === 'nkorouna') return fail(400, 'Les Nkorouna s\'achètent en FCFA, pas en Nkorouna.');
    return garde(() => db.tx(async q => {
      const { mouvement, deja } = await ecrire(q, { nature: 'depense', debit: await ouvrirCompte(q, a.auth.uid), credit: COMPTES_SYSTEME.recettes, montant: prix, reference: `depense:${a.auth.uid}:${cle}`, meta: { produit: produitId, titre: String(p.data.titre ?? '').slice(0, 120) }, par: a.auth.uid });
      if (!deja) await accorderProduit(q, a.auth.uid, produitId, 'nkorouna', mouvement.id);
      return { ok: true, deja, mouvement: mouvement.id, ...(await solde(q, a.auth.uid)) };
    }));
  });

  app.post('/v1/nkorouna/transferer', async (req) => {
    if (!transfertsOuverts()) return fail(403, 'Les envois de Nkorouna entre personnes ne sont pas ouverts.');
    const a = await acteur(req);
    const { vers, montant, cle } = (req.body || {}) as { vers?: string; montant?: number; cle?: string };
    if (!str(vers) || !str(cle) || !CLE.test(cle) || !Number.isSafeInteger(montant) || montant! <= 0) return fail(400, 'Destinataire, montant entier et clé attendus.');
    if (vers === a.auth.uid) return fail(400, 'Impossible de s\'envoyer des Nkorouna.');
    if (!(await db.query(`SELECT 1 FROM users WHERE id = $1`, [vers])).length) return fail(404, 'Destinataire introuvable.');
    const max = Number(env.NKOROUNA_TRANSFERT_MAX_JOUR || 5000);
    return garde(() => db.tx(async q => {
      const envoye = Number((await q.query<any>(`SELECT COALESCE(sum(montant), 0) AS n FROM nkr_mouvements WHERE debit = $1 AND nature = 'transfert' AND created_at > clock_timestamp() - interval '1 day'`, [compteDe(a.auth.uid)]))[0].n);
      if (envoye + montant! > max) return fail(429, `Plafond d'envoi atteint (${max} NKR par jour).`);
      const { mouvement, deja } = await ecrire(q, { nature: 'transfert', debit: await ouvrirCompte(q, a.auth.uid), credit: await ouvrirCompte(q, vers), montant: montant!, reference: `transfert:${a.auth.uid}:${cle}`, par: a.auth.uid });
      return { ok: true, deja, mouvement: mouvement.id, ...(await solde(q, a.auth.uid)) };
    }));
  });

  // ---------------------------------------------------------------- administration
  app.get('/v1/admin/nkorouna', async (req) => {
    await admin(req);
    const verification = await verifierRegistre(db);
    const comptes = await db.query<any>(`SELECT c.id, c.user_id, c.solde, c.gele, u.data->>'displayName' AS nom FROM nkr_comptes c LEFT JOIN users u ON u.id = c.user_id ORDER BY c.type DESC, c.solde DESC LIMIT 200`);
    const derniers = await db.query<any>(`SELECT * FROM nkr_mouvements ORDER BY rang DESC LIMIT 100`);
    return { verification, comptes: comptes.map(c => ({ ...c, solde: Number(c.solde) })), mouvements: derniers.map(m => ({ ...m, rang: Number(m.rang), montant: Number(m.montant) })) };
  });

  /** Jetons offerts (concours, geste commercial) ou retirés (correction) ; motif obligatoire, inscrit au journal. */
  app.post('/v1/admin/nkorouna/ajuster', async (req) => {
    const a = await admin(req);
    const { userId, montant, motif, cle } = (req.body || {}) as { userId?: string; montant?: number; motif?: string; cle?: string };
    if (!str(userId) || !str(motif) || motif.trim().length < 3 || !Number.isSafeInteger(montant) || montant === 0 || !str(cle) || !CLE.test(cle)) return fail(400, 'Utilisateur, montant entier non nul (négatif pour retirer), motif et clé attendus.');
    return garde(() => db.tx(async q => {
      const compte = await ouvrirCompte(q, userId);
      const [debit, credit] = montant! > 0 ? [COMPTES_SYSTEME.bonus, compte] : [compte, COMPTES_SYSTEME.bonus];
      const { mouvement, deja } = await ecrire(q, { nature: montant! > 0 ? 'bonus' : 'correction', debit, credit, montant: Math.abs(montant!), reference: `ajustement:${cle}`, meta: { motif: motif.trim().slice(0, 300) }, par: a.auth.uid });
      if (!deja) await journaliser(q, a.auth.uid, 'nkorouna_ajustement', userId, { montant, motif, mouvement: mouvement.id });
      return { ok: true, deja, mouvement: mouvement.id, ...(await solde(q, userId)) };
    }));
  });

  /** Contre-écriture d'un mouvement (paiement Mobile Money remboursé, erreur). Le droit accordé par une dépense reste à retirer à part. */
  app.post('/v1/admin/nkorouna/annuler/:id', async (req) => {
    const a = await admin(req);
    const { motif } = (req.body || {}) as { motif?: string };
    if (!str(motif) || motif.trim().length < 3) return fail(400, 'Motif attendu.');
    const m = (await db.query<any>(`SELECT * FROM nkr_mouvements WHERE id = $1`, [(req.params as any).id]))[0];
    if (!m) return fail(404, 'Mouvement introuvable.');
    if (m.nature === 'annulation') return fail(400, 'Une annulation ne s\'annule pas : passer un ajustement.');
    return garde(() => db.tx(async q => {
      const { mouvement, deja } = await ecrire(q, { nature: 'annulation', debit: m.credit, credit: m.debit, montant: Number(m.montant), reference: `annulation:${m.id}`, meta: { annule: m.id, motif: motif.trim().slice(0, 300) }, par: a.auth.uid });
      if (!deja) await journaliser(q, a.auth.uid, 'nkorouna_annulation', m.id, { motif });
      return { ok: true, deja, mouvement: mouvement.id };
    }));
  });

  app.post('/v1/admin/nkorouna/geler', async (req) => {
    const a = await admin(req);
    const { userId, gele } = (req.body || {}) as { userId?: string; gele?: boolean };
    if (!str(userId) || typeof gele !== 'boolean') return fail(400, 'Utilisateur et gele (oui/non) attendus.');
    await ouvrirCompte(db, userId);
    await db.query(`UPDATE nkr_comptes SET gele = $2 WHERE id = $1`, [compteDe(userId), gele]);
    await journaliser(db, a.auth.uid, gele ? 'nkorouna_gel' : 'nkorouna_degel', userId);
    return { ok: true, gele };
  });

  /**
   * Calcule la racine de Merkle des nouveaux mouvements, puis publie par le relais (chaîne Nkorouna) tous les sceaux qui n'ont pas
   * encore de transaction, du plus ancien au plus récent (20 au plus) : un relais injoignable une fois ne laisse aucun trou.
   */
  app.post('/v1/admin/nkorouna/ancrer', async (req) => {
    const a = await admin(req);
    const anc = await db.tx(q => preparerAncrage(q));
    const publies: { id: number; reseau: string; transaction: string }[] = [];
    if (env.NKOROUNA_ANCRAGE_URL && env.NKOROUNA_ANCRAGE_SECRET) {
      const enAttente = await db.query<any>(`SELECT id, de_rang, jusqu_au_rang, racine FROM nkr_ancrages WHERE transaction IS NULL ORDER BY id LIMIT 20`);
      for (const x of enAttente) {
        const corps = JSON.stringify({ racine: x.racine, de: Number(x.de_rang), jusqua: Number(x.jusqu_au_rang), ancrage: Number(x.id) });
        try {
          const r = await fetch(env.NKOROUNA_ANCRAGE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-signature': createHmac('sha256', env.NKOROUNA_ANCRAGE_SECRET).update(corps).digest('hex') }, body: corps, signal: AbortSignal.timeout(30_000) });
          if (!r.ok) break;
          const j = await r.json() as { reseau?: string; transaction?: string };
          if (!str(j.reseau) || !str(j.transaction) || !/^0x[0-9a-fA-F]{64}$/.test(j.transaction) || j.reseau.length > 40) break;
          await db.query(`UPDATE nkr_ancrages SET reseau = $2, transaction = $3 WHERE id = $1 AND transaction IS NULL`, [x.id, j.reseau, j.transaction]);
          publies.push({ id: Number(x.id), reseau: j.reseau, transaction: j.transaction });
        } catch { break; /* relais injoignable : ces sceaux restent en attente pour le prochain appel */ }
      }
    }
    if (!anc && !publies.length) return { ok: true, rien: true };
    const duNouveau = anc ? publies.find(p => p.id === anc.id) : undefined;
    await journaliser(db, a.auth.uid, 'nkorouna_ancrage', anc ? String(anc.id) : 'republication', { racine: anc?.racine, publies });
    return { ok: true, ...(anc ?? {}), reseau: duNouveau?.reseau ?? 'aucun', transaction: duNouveau?.transaction ?? null, publies };
  });
}
