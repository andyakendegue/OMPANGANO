/**
 * Vidéos en streaming, masterclass et reversements (décision de Capp du 15 nov. 2026 ; audit Apprendre §18).
 * - Mesure : battement du lecteur vidéo (minutes regardées par passage) et temps passé par module.
 * - Reversements : paramètres versionnés (aucun taux dans le code), bénéficiaires, recettes publicitaires, opérations
 *   exceptionnelles, calcul trimestriel (noyau/reversements.ts), validation scellée (chaîne d'empreintes), export CSV,
 *   relevés personnels. Rôle : administrateur ; un bénéficiaire ne voit que ses propres relevés.
 */
import { createHash, randomBytes } from 'node:crypto';
import {
  calculerReversements, debutTrimestre, finTrimestre, validerParametresReversements, PARAMETRES_REVERSEMENTS_VIDES,
  type BeneficiaireCalcul, type CategoriePaiement, type EntreesTrimestre, type ParametresReversements, type PaiementTrimestre,
} from '../../../packages/noyau/src/reversements.ts';
import type { Queryable } from './db.ts';
import { journaliser, str, type Ctx } from './ctx.ts';

export const MODULES_TEMPS = ['onenji', 'igolani', 'azeva', 'ontci', 'nkala', 'ompangano', 'kakigonjo'] as const;
/** Battements : un battement compte au plus ce plafond (le lecteur en envoie un toutes les 30 s ; au-delà, l'écran était fermé). */
const PLAFOND_BATTEMENT_S = 45;
const ID_TRIM = /^\d{4}-T[1-4]$/;

/** Ouvre un passage de lecture (appelé à la délivrance d'une licence vidéo) ; renvoie son identifiant. */
export async function ouvrirPassage(q: Queryable, uid: string, collection: string, contenuId: string, coursId: string, igolani: boolean, plans: string[]): Promise<string> {
  const id = 'lp_' + randomBytes(9).toString('hex');
  await q.query(`INSERT INTO lecture_passages (id, user_id, collection, contenu_id, cours_id, igolani, plans) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id, uid, collection, contenuId, coursId, igolani, plans]);
  return id;
}

export async function parametresActifs(q: Queryable, jour = new Date()): Promise<{ version: number; valeurs: ParametresReversements } | null> {
  const r = (await q.query<any>(`SELECT version, valeurs FROM reversements_parametres WHERE date_effet <= $1 ORDER BY date_effet DESC, version DESC LIMIT 1`, [jour.toISOString().slice(0, 10)]))[0];
  return r ? { version: Number(r.version), valeurs: { ...PARAMETRES_REVERSEMENTS_VIDES, ...r.valeurs } } : null;
}

/** Rassemble les données d'un trimestre (agrégées : c'est ce qui est gardé avec le calcul pour pouvoir le refaire à l'identique). */
export async function entreesTrimestre(q: Queryable, trimestre: string, p: ParametresReversements, extra: { frais_infra?: number; autres_tiers?: number } = {}): Promise<EntreesTrimestre> {
  const d0 = debutTrimestre(trimestre).toISOString(), d1 = finTrimestre(trimestre).toISOString();
  const produits = new Map<string, any>((await q.query<any>(`SELECT id, data FROM contenus WHERE collection = 'produits'`)).map(x => [x.id, x.data]));
  const categorie = (pid: string): { c: CategoriePaiement; plan?: string | null } => {
    const d = produits.get(pid);
    if (!d) return { c: 'autre' };
    if (d.type === 'abonnement') return { c: 'abonnement', plan: d.plan_id ?? null };
    if (d.type === 'nkorouna') return { c: 'nkorouna' };
    if (Number(d.jetons_ia) > 0) return { c: 'ia' };
    return { c: 'autre' };
  };
  const paiements: PaiementTrimestre[] = [];
  const cours = new Map<string, any>((await q.query<any>(`SELECT code, hote_id, statut FROM cours_planifies`)).map(x => [x.code, x]));
  for (const x of await q.query<any>(`SELECT id, produit_id, montant_fcfa, encaisse_fcfa, frais_fcfa, commission_fcfa, taxe_fcfa, rembourse_fcfa FROM paiements WHERE statut = 'confirme' AND COALESCE(confirme_at, created_at) >= $1 AND COALESCE(confirme_at, created_at) < $2`, [d0, d1])) {
    const seance = /^seance:([a-z0-9]{4,32})$/.exec(String(x.produit_id));
    const base = { id: x.id, encaisse: Number(x.encaisse_fcfa ?? x.montant_fcfa) || 0, frais: Number(x.frais_fcfa) || 0, commission: Number(x.commission_fcfa) || 0, taxe: Number(x.taxe_fcfa) || 0, rembourse: Number(x.rembourse_fcfa) || 0 };
    if (seance) { const c = cours.get(seance[1]); paiements.push({ ...base, categorie: 'masterclass', hote_id: c?.hote_id ?? null, annule: !c || c.statut === 'annule' }); }
    else { const k = categorie(x.produit_id); paiements.push({ ...base, categorie: k.c, plan_id: k.plan ?? null }); }
  }
  for (const x of await q.query<any>(`SELECT reference, produit_id, encaisse_fcfa, commission_fcfa, taxe_fcfa, rembourse_fcfa FROM achats_recus WHERE at >= $1 AND at < $2`, [d0, d1])) {
    const k = categorie(x.produit_id), prix = Number(produits.get(x.produit_id)?.prix_fcfa) || 0;
    paiements.push({ id: `recu:${x.reference}`, categorie: k.c, plan_id: k.plan ?? null, encaisse: Number(x.encaisse_fcfa ?? prix) || 0, commission: Number(x.commission_fcfa) || 0, taxe: Number(x.taxe_fcfa) || 0, rembourse: Number(x.rembourse_fcfa) || 0 });
  }
  // Temps des abonnés de chaque formule, par module : le temps d'un jour revient aux formules actives ce jour-là.
  const temps = (await q.query<any>(
    `SELECT pr.data->>'plan_id' AS plan_id, t.module, sum(t.secondes)::bigint AS secondes
     FROM temps_modules t JOIN droits dr ON dr.user_id = t.user_id AND dr.type = 'abonnement' AND dr.statut = 'actif' AND dr.debut::date <= t.jour AND (dr.fin IS NULL OR dr.fin::date >= t.jour)
     JOIN contenus pr ON pr.collection = 'produits' AND pr.id = dr.produit_id AND pr.data->>'plan_id' IS NOT NULL
     WHERE t.jour >= $1::date AND t.jour < $2::date GROUP BY 1, 2`, [d0, d1])).map(x => ({ plan_id: x.plan_id, module: x.module, secondes: Number(x.secondes) }));
  // Minutes regardées par des abonnés : au plus N passages par abonné et par vidéo (les plus longs), rattachées au créateur de la vidéo.
  const minutes = (await q.query<any>(
    `WITH p AS (SELECT user_id, cours_id, secondes, row_number() OVER (PARTITION BY user_id, cours_id ORDER BY secondes DESC) AS n
                FROM lecture_passages WHERE igolani AND debut >= $1 AND debut < $2)
     SELECT c.data->>'createur_id' AS createur_id, sum(p.secondes)::bigint AS secondes
     FROM p JOIN contenus c ON c.collection = 'cours_artisans' AND c.id = p.cours_id
     WHERE p.n <= $3 AND c.data->>'createur_id' IS NOT NULL GROUP BY 1`, [d0, d1, p.createurs.max_passages_par_chapitre])).map(x => ({ createur_id: x.createur_id, secondes: Number(x.secondes) }));
  const pub = (await q.query<any>(`SELECT zone, sum(montant_fcfa)::bigint AS montant FROM recettes_pub WHERE jour >= $1::date AND jour < $2::date GROUP BY zone`, [d0, d1])).map(x => ({ zone: x.zone, montant: Number(x.montant) }));
  const usage = (await q.query<any>(`SELECT modele, sum(jetons_entree + jetons_sortie)::bigint AS n FROM ia_usage WHERE NOT simule AND at >= $1 AND at < $2 GROUP BY modele`, [d0, d1])).map(x => ({ modele: x.modele, quantite: Number(x.n) }));
  let uc = (await q.query<any>(`SELECT modele, user_id, uc FROM modele_entrainement`)).map(x => ({ modele: x.modele, user_id: x.user_id, uc: Number(x.uc) }));
  if (!uc.length) {
    // Sans répartition saisie par modèle : unités de contribution validées (pondérées par type), valables pour tous les modèles utilisés.
    const parUser = (await q.query<any>(`SELECT user_id, COALESCE(data->>'type', 'phrase') AS type, count(*)::int AS n FROM contributions WHERE status = 'validated' GROUP BY 1, 2`));
    const poidsUser = new Map<string, number>();
    for (const x of parUser) poidsUser.set(x.user_id, (poidsUser.get(x.user_id) ?? 0) + x.n * (p.associations.ponderations_uc[x.type] ?? p.associations.ponderations_uc.defaut ?? 1));
    uc = usage.flatMap(u => [...poidsUser].map(([user_id, v]) => ({ modele: u.modele, user_id, uc: v })));
  }
  const membres = await q.query<any>(`SELECT association_id, user_id FROM association_membres`);
  const operations = (await q.query<any>(`SELECT id, montant_fcfa, couts_directs, part_apport FROM operations_exceptionnelles WHERE jour >= $1::date AND jour < $2::date ORDER BY jour, id`, [d0, d1])).map(x => ({ id: x.id, montant: Number(x.montant_fcfa), couts: Number(x.couts_directs), part_apport: x.part_apport === null ? null : Number(x.part_apport) }));
  // Bénéficiaires actifs, avec le report du dernier relevé validé d'un trimestre antérieur.
  const beneficiaires: BeneficiaireCalcul[] = [];
  for (const b of await q.query<any>(`SELECT * FROM beneficiaires WHERE actif ORDER BY id`)) {
    const rep = (await q.query<any>(`SELECT r.report_sortant FROM releves r WHERE r.beneficiaire_id = $1 AND r.statut IN ('valide','paye') AND r.trimestre < $2 ORDER BY r.trimestre DESC LIMIT 1`, [b.id, trimestre]))[0];
    beneficiaires.push({ id: b.id, type: b.type, user_id: b.user_id, date_pv: b.date_pv ? new Date(b.date_pv).toISOString().slice(0, 10) : null, seuil_fcfa: Number(b.seuil_fcfa) || 0, retenue_pct: Number(b.retenue_pct) || 0, report_entrant: Number(rep?.report_sortant) || 0 });
  }
  return { trimestre, paiements, temps, minutes, pub, autres_tiers: Number(extra.autres_tiers) || 0, ia: { frais_infra: Number(extra.frais_infra) || 0, usage, uc }, membres, operations, beneficiaires };
}

const empreinte = (precedent: string, contenu: unknown) => createHash('sha256').update(precedent).update(JSON.stringify(contenu)).digest('hex');
const csv = (v: unknown) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function registerReversements({ app, db, fail, acteur }: Ctx) {
  const admin = async (req: any) => { const a = await acteur(req); if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.'); return a; };

  // ---------------------------------------------------------------- mesure : minutes regardées et temps par module
  app.post('/v1/lecture/battement', async (req) => {
    const a = await acteur(req);
    const { passage } = (req.body || {}) as { passage?: string };
    if (!str(passage) || !/^lp_[0-9a-f]{18}$/.test(passage)) return fail(400, 'Passage attendu.');
    const r = await db.query<any>(
      `UPDATE lecture_passages SET secondes = secondes + LEAST($3, GREATEST(0, EXTRACT(EPOCH FROM clock_timestamp() - dernier)::int)), dernier = clock_timestamp()
       WHERE id = $1 AND user_id = $2 AND debut > clock_timestamp() - interval '6 hours' RETURNING secondes`, [passage, a.auth.uid, PLAFOND_BATTEMENT_S]);
    if (!r.length) return fail(404, 'Passage inconnu ou expiré.');
    return { secondes: Number(r[0].secondes) };
  });
  app.post('/v1/temps', async (req) => {
    const a = await acteur(req);
    const { module } = (req.body || {}) as { module?: string };
    if (!str(module) || !(MODULES_TEMPS as readonly string[]).includes(module)) return fail(400, 'Module inconnu.');
    // Le premier battement du jour ouvre la mesure ; les suivants ajoutent le temps écoulé, plafonné (écran fermé entre deux = rien).
    await db.query(
      `INSERT INTO temps_modules (user_id, module, jour, secondes, dernier) VALUES ($1,$2,current_date,0,clock_timestamp())
       ON CONFLICT (user_id, module, jour) DO UPDATE SET secondes = temps_modules.secondes + CASE WHEN clock_timestamp() - temps_modules.dernier <= interval '90 seconds'
         THEN LEAST(90, EXTRACT(EPOCH FROM clock_timestamp() - temps_modules.dernier)::int) ELSE 0 END, dernier = clock_timestamp()`, [a.auth.uid, module]);
    return { ok: true };
  });

  // ---------------------------------------------------------------- paramètres versionnés
  app.get('/v1/admin/reversements/parametres', async (req) => {
    await admin(req);
    const actifs = await parametresActifs(db);
    return { actifs, vides: PARAMETRES_REVERSEMENTS_VIDES, versions: await db.query(`SELECT version, date_effet, par, created_at FROM reversements_parametres ORDER BY version DESC LIMIT 50`) };
  });
  app.post('/v1/admin/reversements/parametres', async (req, reply) => {
    const a = await admin(req);
    const { valeurs, dateEffet } = (req.body || {}) as { valeurs?: unknown; dateEffet?: string };
    const v = validerParametresReversements(valeurs);
    if (!v) return fail(400, 'Paramètres invalides : taux et coefficients entre 0 et 1.');
    if (!str(dateEffet) || !/^\d{4}-\d{2}-\d{2}$/.test(dateEffet)) return fail(400, 'Date d\'effet attendue (AAAA-MM-JJ).');
    const r = await db.query<any>(`INSERT INTO reversements_parametres (date_effet, valeurs, par) VALUES ($1,$2,$3) RETURNING version`, [dateEffet, JSON.stringify(v), a.auth.uid]);
    await journaliser(db, a.auth.uid, 'reversements_parametres', String(r[0].version), { dateEffet });
    return reply.status(201).send({ version: Number(r[0].version) });
  });

  // ---------------------------------------------------------------- bénéficiaires et associations
  app.get('/v1/admin/reversements/beneficiaires', async (req) => {
    await admin(req);
    const b = await db.query<any>(`SELECT * FROM beneficiaires ORDER BY type, nom`);
    const m = await db.query<any>(`SELECT association_id, user_id FROM association_membres`);
    return b.map(x => ({ ...x, membres: m.filter(y => y.association_id === x.id).map(y => y.user_id) }));
  });
  app.post('/v1/admin/reversements/beneficiaires', async (req, reply) => {
    const a = await admin(req);
    const b = (req.body || {}) as Record<string, any>;
    if (!['contributeur_special', 'createur', 'professeur', 'association'].includes(b.type) || !str(b.nom) || !b.nom.trim()) return fail(400, 'Type et nom attendus.');
    const date = (x: unknown) => (str(x) && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null);
    const id = str(b.id) && /^ben_[0-9a-f]{12}$/.test(b.id) ? b.id : 'ben_' + randomBytes(6).toString('hex');
    await db.query(
      `INSERT INTO beneficiaires (id, type, nom, user_id, contrat, date_signature, date_pv, coordonnees, seuil_fcfa, retenue_pct, options, actif)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, nom = EXCLUDED.nom, user_id = EXCLUDED.user_id, contrat = EXCLUDED.contrat, date_signature = EXCLUDED.date_signature,
         date_pv = EXCLUDED.date_pv, coordonnees = EXCLUDED.coordonnees, seuil_fcfa = EXCLUDED.seuil_fcfa, retenue_pct = EXCLUDED.retenue_pct, options = EXCLUDED.options, actif = EXCLUDED.actif`,
      [id, b.type, b.nom.trim().slice(0, 120), str(b.user_id) && b.user_id ? b.user_id : null, str(b.contrat) ? b.contrat.slice(0, 200) : null, date(b.date_signature), date(b.date_pv),
       JSON.stringify(b.coordonnees && typeof b.coordonnees === 'object' ? b.coordonnees : {}), Math.max(0, Math.floor(Number(b.seuil_fcfa) || 0)), Math.min(100, Math.max(0, Number(b.retenue_pct) || 0)),
       JSON.stringify(b.options && typeof b.options === 'object' ? b.options : {}), b.actif !== false]);
    await journaliser(db, a.auth.uid, 'beneficiaire', id, { type: b.type });
    return reply.status(201).send({ id });
  });
  app.post('/v1/admin/reversements/beneficiaires/:id/membres', async (req, reply) => {
    const a = await admin(req);
    const { userId, retirer } = (req.body || {}) as { userId?: string; retirer?: boolean };
    const id = (req.params as any).id;
    if (!str(userId)) return fail(400, 'Compte attendu.');
    if (!(await db.query<any>(`SELECT 1 FROM beneficiaires WHERE id = $1 AND type = 'association'`, [id])).length) return fail(404, 'Association introuvable.');
    if (retirer) await db.query(`DELETE FROM association_membres WHERE association_id = $1 AND user_id = $2`, [id, userId]);
    else await db.query(`INSERT INTO association_membres (association_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, userId]);
    await journaliser(db, a.auth.uid, retirer ? 'association_membre_retire' : 'association_membre', id, { userId });
    return reply.status(201).send({ ok: true });
  });
  app.post('/v1/admin/reversements/modeles', async (req) => {
    const a = await admin(req);
    const { lignes } = (req.body || {}) as { lignes?: { modele?: string; user_id?: string; uc?: number }[] };
    if (!Array.isArray(lignes) || lignes.length > 50_000) return fail(400, 'Lignes attendues (modele, user_id, uc).');
    let n = 0;
    await db.tx(async q => {
      for (const l of lignes) if (str(l.modele) && str(l.user_id) && Number(l.uc) >= 0) { await q.query(`INSERT INTO modele_entrainement (modele, user_id, uc) VALUES ($1,$2,$3) ON CONFLICT (modele, user_id) DO UPDATE SET uc = EXCLUDED.uc`, [l.modele, l.user_id, Number(l.uc)]); n++; }
      await journaliser(q, a.auth.uid, 'modele_entrainement', undefined, { lignes: n });
    });
    return { lignes: n };
  });

  // ---------------------------------------------------------------- recettes, opérations, frais des paiements
  app.get('/v1/admin/reversements/recettes-pub', async (req) => {
    await admin(req);
    const { trimestre } = req.query as { trimestre?: string };
    if (!str(trimestre) || !ID_TRIM.test(trimestre)) return fail(400, 'Trimestre attendu (AAAA-Tn).');
    return db.query(`SELECT jour, zone, montant_fcfa, source FROM recettes_pub WHERE jour >= $1::date AND jour < $2::date ORDER BY jour, zone`, [debutTrimestre(trimestre).toISOString(), finTrimestre(trimestre).toISOString()]);
  });
  app.post('/v1/admin/reversements/recettes-pub', async (req) => {
    const a = await admin(req);
    const { lignes } = (req.body || {}) as { lignes?: { jour?: string; zone?: string; montant_fcfa?: number; source?: string }[] };
    if (!Array.isArray(lignes) || lignes.length > 10_000) return fail(400, 'Lignes attendues (jour, zone, montant_fcfa).');
    let n = 0;
    await db.tx(async q => {
      for (const l of lignes) if (str(l.jour) && /^\d{4}-\d{2}-\d{2}$/.test(l.jour) && str(l.zone) && /^[a-z0-9_]{1,40}$/.test(l.zone) && Number.isInteger(Number(l.montant_fcfa)) && Number(l.montant_fcfa) >= 0) {
        await q.query(`INSERT INTO recettes_pub (jour, zone, montant_fcfa, source, par) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (jour, zone, source) DO UPDATE SET montant_fcfa = EXCLUDED.montant_fcfa, par = EXCLUDED.par`, [l.jour, l.zone, Number(l.montant_fcfa), str(l.source) ? l.source.slice(0, 40) : 'console', a.auth.uid]); n++;
      }
      await journaliser(q, a.auth.uid, 'recettes_pub', undefined, { lignes: n });
    });
    return { lignes: n };
  });
  app.get('/v1/admin/reversements/operations', async (req) => { await admin(req); return db.query(`SELECT * FROM operations_exceptionnelles ORDER BY jour DESC LIMIT 200`); });
  app.post('/v1/admin/reversements/operations', async (req, reply) => {
    const a = await admin(req);
    const b = (req.body || {}) as Record<string, any>;
    if (!str(b.jour) || !/^\d{4}-\d{2}-\d{2}$/.test(b.jour) || !str(b.contrepartie) || !str(b.objet) || !(Number(b.montant_fcfa) >= 0)) return fail(400, 'Date, contrepartie, objet et montant attendus.');
    const part = b.part_apport === null || b.part_apport === undefined || b.part_apport === '' ? null : Number(b.part_apport);
    if (part !== null && !(part >= 0 && part <= 1)) return fail(400, 'Part de l\'apport entre 0 et 1.');
    const id = 'op_' + randomBytes(6).toString('hex');
    await db.query(`INSERT INTO operations_exceptionnelles (id, jour, contrepartie, objet, montant_fcfa, couts_directs, part_apport, piece, par) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, b.jour, b.contrepartie.slice(0, 200), b.objet.slice(0, 500), Math.floor(Number(b.montant_fcfa)), Math.max(0, Math.floor(Number(b.couts_directs) || 0)), part, str(b.piece) ? b.piece.slice(0, 300) : null, a.auth.uid]);
    await journaliser(db, a.auth.uid, 'operation_exceptionnelle', id, { montant: b.montant_fcfa });
    return reply.status(201).send({ id });
  });
  app.patch('/v1/admin/paiements/:id/frais', async (req) => {
    const a = await admin(req);
    const b = (req.body || {}) as Record<string, any>;
    const n = (x: unknown) => (x === undefined || x === null || x === '' ? null : Number.isInteger(Number(x)) && Number(x) >= 0 ? Number(x) : NaN);
    const v = { encaisse: n(b.encaisse_fcfa), frais: n(b.frais_fcfa), commission: n(b.commission_fcfa), taxe: n(b.taxe_fcfa), rembourse: n(b.rembourse_fcfa) };
    if (Object.values(v).some(x => Number.isNaN(x))) return fail(400, 'Montants entiers positifs attendus.');
    const r = await db.query<any>(`UPDATE paiements SET encaisse_fcfa = COALESCE($2, encaisse_fcfa), frais_fcfa = COALESCE($3, frais_fcfa), commission_fcfa = COALESCE($4, commission_fcfa), taxe_fcfa = COALESCE($5, taxe_fcfa), rembourse_fcfa = COALESCE($6, rembourse_fcfa) WHERE id = $1 RETURNING id`,
      [(req.params as any).id, v.encaisse, v.frais, v.commission, v.taxe, v.rembourse]);
    if (!r.length) return fail(404, 'Paiement introuvable.');
    await journaliser(db, a.auth.uid, 'paiement_frais', (req.params as any).id, v);
    return { ok: true };
  });
  app.get('/v1/admin/reversements/minutes', async (req) => {
    await admin(req);
    const { trimestre } = req.query as { trimestre?: string };
    if (!str(trimestre) || !ID_TRIM.test(trimestre)) return fail(400, 'Trimestre attendu (AAAA-Tn).');
    return db.query(
      `SELECT p.cours_id, c.data->>'titre' AS titre, c.data->>'createur_id' AS createur_id, count(*)::int AS passages, count(DISTINCT p.user_id)::int AS abonnes, (sum(p.secondes) / 60)::int AS minutes
       FROM lecture_passages p LEFT JOIN contenus c ON c.collection = 'cours_artisans' AND c.id = p.cours_id
       WHERE p.igolani AND p.debut >= $1 AND p.debut < $2 GROUP BY 1, 2, 3 ORDER BY minutes DESC`, [debutTrimestre(trimestre).toISOString(), finTrimestre(trimestre).toISOString()]);
  });

  // ---------------------------------------------------------------- calcul, validation scellée, paiement, export
  app.post('/v1/admin/reversements/calculs', async (req, reply) => {
    const a = await admin(req);
    const { trimestre, fraisInfra, autresTiers, rectifie } = (req.body || {}) as { trimestre?: string; fraisInfra?: number; autresTiers?: number; rectifie?: string };
    if (!str(trimestre) || !ID_TRIM.test(trimestre)) return fail(400, 'Trimestre attendu (AAAA-Tn).');
    if (finTrimestre(trimestre).getTime() > Date.now() + 86_400_000 * 92) return fail(400, 'Trimestre trop lointain.');
    const params = await parametresActifs(db, new Date(finTrimestre(trimestre).getTime() - 1));
    if (!params) return fail(409, 'Aucun paramètre en vigueur pour ce trimestre : enregistre d\'abord les taux dans la console.');
    const deja = (await db.query<any>(`SELECT id FROM reversements_calculs WHERE trimestre = $1 AND statut = 'valide'`, [trimestre]))[0];
    if (deja && rectifie !== deja.id) return fail(409, 'Ce trimestre a déjà un calcul validé : fais un calcul rectificatif (rectifie = son identifiant).');
    const entrees = await entreesTrimestre(db, trimestre, params.valeurs, { frais_infra: fraisInfra, autres_tiers: autresTiers });
    const res = calculerReversements(entrees, params.valeurs);
    const id = 'rc_' + randomBytes(8).toString('hex');
    await db.tx(async q => {
      // Un calcul non validé du même trimestre est remplacé (on ne garde que le dernier brouillon).
      await q.query(`DELETE FROM releves WHERE calcul_id IN (SELECT id FROM reversements_calculs WHERE trimestre = $1 AND statut = 'calcule')`, [trimestre]);
      await q.query(`DELETE FROM reversements_calculs WHERE trimestre = $1 AND statut = 'calcule'`, [trimestre]);
      await q.query(`INSERT INTO reversements_calculs (id, trimestre, version_params, rectifie, entrees, totaux, par) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id, trimestre, params.version, rectifie ?? null, JSON.stringify(entrees), JSON.stringify(res.totaux), a.auth.uid]);
      for (const r of res.releves) await q.query(`INSERT INTO releves (id, calcul_id, beneficiaire_id, trimestre, detail, brut_fcfa, report_entrant, retenue_fcfa, a_payer_fcfa, report_sortant) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        ['rel_' + randomBytes(8).toString('hex'), id, r.beneficiaire_id, trimestre, JSON.stringify(r.parts), r.brut, r.report_entrant, r.retenue, r.a_payer, r.report_sortant]);
      await journaliser(q, a.auth.uid, 'reversements_calcul', id, { trimestre, version: params.version });
    });
    return reply.status(201).send({ id, trimestre, version: params.version, totaux: res.totaux, releves: res.releves.length });
  });
  app.get('/v1/admin/reversements/calculs', async (req) => { await admin(req); return db.query(`SELECT id, trimestre, version_params, statut, rectifie, totaux, par, created_at, valide_le, hash FROM reversements_calculs ORDER BY trimestre DESC, created_at DESC LIMIT 60`); });
  app.get('/v1/admin/reversements/calculs/:id', async (req) => {
    await admin(req);
    const c = (await db.query<any>(`SELECT id, trimestre, version_params, statut, rectifie, totaux, par, created_at, valide_le, hash, hash_precedent FROM reversements_calculs WHERE id = $1`, [(req.params as any).id]))[0] ?? fail(404, 'Calcul introuvable.');
    const releves = await db.query<any>(`SELECT r.*, b.nom, b.type FROM releves r JOIN beneficiaires b ON b.id = r.beneficiaire_id WHERE r.calcul_id = $1 ORDER BY b.type, b.nom`, [c.id]);
    return { ...c, releves };
  });
  app.post('/v1/admin/reversements/calculs/:id/valider', async (req) => {
    const a = await admin(req);
    const id = (req.params as any).id;
    return db.tx(async q => {
      const c = (await q.query<any>(`SELECT * FROM reversements_calculs WHERE id = $1 FOR UPDATE`, [id]))[0] ?? fail(404, 'Calcul introuvable.');
      if (c.statut !== 'calcule') return fail(409, 'Ce calcul est déjà validé ou remplacé.');
      const precedent = (await q.query<any>(`SELECT hash FROM reversements_calculs WHERE hash IS NOT NULL ORDER BY valide_le DESC LIMIT 1`))[0]?.hash ?? 'genese';
      const releves = await q.query<any>(`SELECT beneficiaire_id, detail, brut_fcfa, report_entrant, retenue_fcfa, a_payer_fcfa, report_sortant FROM releves WHERE calcul_id = $1 ORDER BY beneficiaire_id`, [id]);
      const hash = empreinte(precedent, { id, trimestre: c.trimestre, version: c.version_params, entrees: c.entrees, totaux: c.totaux, releves });
      if (c.rectifie) {
        await q.query(`UPDATE reversements_calculs SET statut = 'remplace' WHERE id = $1 AND statut = 'valide'`, [c.rectifie]);
        await q.query(`UPDATE releves SET statut = 'remplace' WHERE calcul_id = $1 AND statut = 'valide'`, [c.rectifie]);
      }
      await q.query(`UPDATE reversements_calculs SET statut = 'valide', valide_par = $2, valide_le = clock_timestamp(), hash_precedent = $3, hash = $4 WHERE id = $1`, [id, a.auth.uid, precedent, hash]);
      await q.query(`UPDATE releves SET statut = 'valide' WHERE calcul_id = $1`, [id]);
      await journaliser(q, a.auth.uid, 'reversements_valide', id, { hash });
      return { ok: true, hash };
    });
  });
  app.post('/v1/admin/reversements/releves/:id/payer', async (req) => {
    const a = await admin(req);
    const { reference } = (req.body || {}) as { reference?: string };
    if (!str(reference) || !reference.trim()) return fail(400, 'Référence du versement attendue (Mobile Money ou virement).');
    const r = await db.query<any>(`UPDATE releves SET statut = 'paye', reference_versement = $2, paye_le = clock_timestamp() WHERE id = $1 AND statut = 'valide' RETURNING id`, [(req.params as any).id, reference.trim().slice(0, 120)]);
    if (!r.length) return fail(409, 'Seul un relevé validé se marque payé.');
    await journaliser(db, a.auth.uid, 'releve_paye', (req.params as any).id, { reference });
    return { ok: true };
  });
  app.get('/v1/admin/reversements/calculs/:id/export.csv', async (req, reply) => {
    await admin(req);
    const rows = await db.query<any>(`SELECT r.*, b.nom, b.type FROM releves r JOIN beneficiaires b ON b.id = r.beneficiaire_id WHERE r.calcul_id = $1 ORDER BY b.type, b.nom`, [(req.params as any).id]);
    const lignes = [['trimestre', 'beneficiaire', 'type', 'part', 'assiette_fcfa', 'taux', 'montant_fcfa', 'note'].join(';')];
    for (const r of rows) {
      for (const p of r.detail as any[]) lignes.push([r.trimestre, r.nom, r.type, p.libelle, p.assiette, p.taux, p.montant, p.note ?? ''].map(csv).join(';'));
      lignes.push([r.trimestre, r.nom, r.type, 'TOTAL (report entrant, retenue, à payer, report sortant)', r.report_entrant, r.retenue_fcfa, r.a_payer_fcfa, `report ${r.report_sortant} ; ${r.statut}${r.reference_versement ? ` ; versement ${r.reference_versement}` : ''}`].map(csv).join(';'));
    }
    reply.header('Content-Type', 'text/csv; charset=utf-8').header('Content-Disposition', `attachment; filename="reversements-${(req.params as any).id}.csv"`);
    return '﻿' + lignes.join('\n');
  });

  // ---------------------------------------------------------------- relevés personnels du bénéficiaire
  app.get('/v1/reversements/mes-releves', async (req) => {
    const a = await acteur(req);
    return db.query(
      `SELECT r.id, r.trimestre, r.detail, r.brut_fcfa, r.report_entrant, r.retenue_fcfa, r.a_payer_fcfa, r.report_sortant, r.statut, r.reference_versement, r.paye_le, b.nom, b.type
       FROM releves r JOIN beneficiaires b ON b.id = r.beneficiaire_id WHERE b.user_id = $1 AND r.statut IN ('valide','paye') ORDER BY r.trimestre DESC LIMIT 40`, [a.auth.uid]);
  });
}
