/**
 * Régie publicitaire pilotée par l'API : annonceurs, campagnes, créations, statistiques. Les créations sont les lignes de la collection
 * « pub_creations » ; la passerelle (GET /v1/pub et /v1/pub/fil) ne sert que celles dont la campagne est active, dans ses dates et sous son plafond.
 * Revive Adserver (REVIVE_URL, REVIVE_USER, REVIVE_PASSWORD) est piloté en XML-RPC par « synchroniser » ; sans ces variables : simulation.
 */
import type { Queryable } from './db.ts';
import { journaliser, str, type Ctx } from './ctx.ts';

// ------------------------------------------------------------------ client XML-RPC minimal (Revive : /www/api/v2/xmlrpc/)
const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function xmlValeur(v: unknown): string {
  if (typeof v === 'number') return Number.isInteger(v) ? `<int>${v}</int>` : `<double>${v}</double>`;
  if (typeof v === 'boolean') return `<boolean>${v ? 1 : 0}</boolean>`;
  if (Array.isArray(v)) return `<array><data>${v.map(x => `<value>${xmlValeur(x)}</value>`).join('')}</data></array>`;
  if (v && typeof v === 'object') return `<struct>${Object.entries(v).map(([k, x]) => `<member><name>${echapper(k)}</name><value>${xmlValeur(x)}</value></member>`).join('')}</struct>`;
  return `<string>${echapper(String(v ?? ''))}</string>`;
}
export const appelXmlRpc = (methode: string, params: unknown[]) => `<?xml version="1.0"?><methodCall><methodName>${methode}</methodName><params>${params.map(p => `<param><value>${xmlValeur(p)}</value></param>`).join('')}</params></methodCall>`;
/** Lecture d'une réponse XML-RPC réduite à ce qu'utilise Revive : entier, chaîne ou erreur (faultString). */
export function lireReponseXmlRpc(xml: string): { valeur?: string; erreur?: string } {
  const f = /<fault>[\s\S]*?<name>faultString<\/name>\s*<value>(?:<string>)?([\s\S]*?)(?:<\/string>)?<\/value>/.exec(xml);
  if (f) return { erreur: f[1].trim() };
  const v = /<param>\s*<value>\s*(?:<(?:int|i4|string)>)?([^<]*)/.exec(xml);
  return { valeur: v ? v[1].trim() : '' };
}

export function clientRevive(env = process.env) {
  const url = env.REVIVE_URL, simule = !url || !env.REVIVE_USER;
  let session: string | null = null;
  const racine = (url || '').replace(/\/+$/, '');
  async function rpc(methode: string, params: unknown[]): Promise<string> {
    const r = await fetch(`${racine}/www/api/v2/xmlrpc/`, { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: appelXmlRpc(methode, params) });
    const x = lireReponseXmlRpc(await r.text());
    if (x.erreur) throw new Error(`Revive ${methode} : ${x.erreur}`);
    return x.valeur ?? '';
  }
  const ouvrir = async () => (session ??= await rpc('ox.logon', [env.REVIVE_USER, env.REVIVE_PASSWORD || '']));
  return {
    simule,
    async ping() { if (simule) return { simule, ok: true }; try { await ouvrir(); return { simule, ok: true }; } catch (e) { session = null; return { simule, ok: false, erreur: (e as Error).message }; } },
    async annonceur(a: { nom: string; contact?: string | null }) { if (simule) return 'sim-' + a.nom; return rpc('ox.addAdvertiser', [await ouvrir(), { advertiserName: a.nom, contactName: a.contact || a.nom, emailAddress: 'regie@essaka.engineering' }]); },
    async campagne(c: { annonceurRevive: string; nom: string; debut?: string | null; fin?: string | null }) { if (simule) return 'sim-' + c.nom; return rpc('ox.addCampaign', [await ouvrir(), { advertiserId: Number(c.annonceurRevive), campaignName: c.nom, ...(c.debut ? { startDate: c.debut } : {}), ...(c.fin ? { endDate: c.fin } : {}), priority: 5 }]); },
    async editeur(nom: string) { if (simule) return 'sim-site-' + nom; return rpc('ox.addPublisher', [await ouvrir(), { publisherName: nom, contactName: nom, emailAddress: 'regie@essaka.engineering' }]); },
    async zone(z: { editeurRevive: string; nom: string; largeur: number; hauteur: number }) { if (simule) return 'sim-zone-' + z.nom; return rpc('ox.addZone', [await ouvrir(), { publisherId: Number(z.editeurRevive), zoneName: z.nom, type: 0, width: z.largeur, height: z.hauteur }]); },
    async banniere(b: { campagneRevive: string; nom: string; image: string; lien: string; alt: string; largeur: number; hauteur: number }) { if (simule) return 'sim-' + b.nom; return rpc('ox.addBanner', [await ouvrir(), { campaignId: Number(b.campagneRevive), bannerName: b.nom, storageType: 'url', imageURL: b.image, url: b.lien, altText: b.alt, width: b.largeur, height: b.hauteur }]); },
  };
}

export const CHAMPS_REGIE = { zone: true };

/** Créations servables : campagne active, dans les dates, sous le plafond du jour ; les créations sans campagne restent servies (compat). */
export async function creationsServables(q: Queryable, zone: string, aujourdhui: string) {
  return q.query<any>(
    `SELECT c.id, c.data,
            (SELECT count(*) FROM pub_evenements e WHERE e.creation_id = c.id AND e.jour = current_date AND e.type = 'affichage')::int AS vus,
            (SELECT count(*) FROM pub_evenements e WHERE e.creation_id IN (SELECT id FROM contenus WHERE collection = 'pub_creations' AND data->>'campagne_id' = k.id) AND e.jour = current_date AND e.type = 'affichage')::int AS vus_campagne,
            k.plafond_jour AS plafond_campagne
     FROM contenus c LEFT JOIN regie_campagnes k ON k.id = c.data->>'campagne_id'
     WHERE c.collection = 'pub_creations' AND c.publie AND c.deleted_at IS NULL AND c.data->>'zone' = $1
       AND (c.data->>'debut' IS NULL OR c.data->>'debut' <= $2) AND (c.data->>'fin' IS NULL OR c.data->>'fin' >= $2)
       AND (c.data->>'campagne_id' IS NULL OR c.data->>'campagne_id' = '' OR (k.statut = 'active' AND (k.debut IS NULL OR k.debut <= $2::date) AND (k.fin IS NULL OR k.fin >= $2::date)))`, [zone, aujourdhui]);
}

export function registerRegie(ctx: Ctx) {
  const { app, db, fail, acteur, env, notify } = ctx;
  const admin = async (req: any) => { const a = await acteur(req); if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.'); return a; };
  const revive = clientRevive(env);
  const ID = /^[A-Za-z0-9_.-]{1,60}$/;

  app.get('/v1/admin/regie/etat', async (req) => { await admin(req); return { mode: revive.simule ? 'interne (Revive non branché)' : 'Revive', revive: await revive.ping() }; });

  app.get('/v1/admin/regie/annonceurs', async (req) => { await admin(req); return db.query(`SELECT id, nom, contact, statut, revive_id, created_at FROM regie_annonceurs ORDER BY nom`); });
  app.post('/v1/admin/regie/annonceurs', async (req, reply) => {
    const a = await admin(req);
    const { id, nom, contact } = (req.body || {}) as { id?: string; nom?: string; contact?: string };
    if (!str(nom) || !nom.trim()) return fail(400, 'Nom attendu.');
    const ident = id && ID.test(id) ? id : 'an_' + Date.now().toString(36);
    await db.query(`INSERT INTO regie_annonceurs (id, nom, contact) VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET nom = EXCLUDED.nom, contact = EXCLUDED.contact`, [ident, nom.slice(0, 120), contact ?? null]);
    await journaliser(db, a.auth.uid, 'regie_annonceur', ident);
    return reply.status(201).send({ id: ident });
  });

  app.get('/v1/admin/regie/campagnes', async (req) => {
    await admin(req);
    return db.query(`SELECT k.*, a.nom AS annonceur_nom,
       (SELECT count(*) FROM pub_evenements e JOIN contenus c ON c.id = e.creation_id AND c.collection = 'pub_creations' WHERE c.data->>'campagne_id' = k.id AND e.type = 'affichage')::int AS affichages,
       (SELECT count(*) FROM pub_evenements e JOIN contenus c ON c.id = e.creation_id AND c.collection = 'pub_creations' WHERE c.data->>'campagne_id' = k.id AND e.type = 'clic')::int AS clics
       FROM regie_campagnes k JOIN regie_annonceurs a ON a.id = k.annonceur_id ORDER BY k.created_at DESC`);
  });
  app.post('/v1/admin/regie/campagnes', async (req, reply) => {
    const a = await admin(req);
    const b = (req.body || {}) as { id?: string; annonceur_id?: string; nom?: string; debut?: string; fin?: string; budget_fcfa?: number; plafond_jour?: number };
    if (!str(b.annonceur_id) || !str(b.nom) || !b.nom.trim()) return fail(400, 'Annonceur et nom attendus.');
    if (!(await db.query(`SELECT 1 FROM regie_annonceurs WHERE id = $1`, [b.annonceur_id])).length) return fail(404, 'Annonceur introuvable.');
    const ident = b.id && ID.test(b.id) ? b.id : 'ca_' + Date.now().toString(36);
    const d = (x?: string) => (x && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null);
    await db.query(`INSERT INTO regie_campagnes (id, annonceur_id, nom, debut, fin, budget_fcfa, plafond_jour) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id) DO UPDATE SET nom = EXCLUDED.nom, debut = EXCLUDED.debut, fin = EXCLUDED.fin, budget_fcfa = EXCLUDED.budget_fcfa, plafond_jour = EXCLUDED.plafond_jour`,
      [ident, b.annonceur_id, b.nom.slice(0, 120), d(b.debut), d(b.fin), Math.max(0, Number(b.budget_fcfa) || 0), Math.max(0, Number(b.plafond_jour) || 0)]);
    await journaliser(db, a.auth.uid, 'regie_campagne', ident);
    return reply.status(201).send({ id: ident });
  });
  app.post('/v1/admin/regie/campagnes/:id/statut', async (req) => {
    const a = await admin(req);
    const { statut } = (req.body || {}) as { statut?: string };
    if (!['brouillon', 'active', 'pause', 'terminee'].includes(statut || '')) return fail(400, 'Statut inconnu.');
    const r = await db.query(`UPDATE regie_campagnes SET statut = $2 WHERE id = $1 RETURNING id`, [(req.params as any).id, statut]);
    if (!r.length) return fail(404, 'Campagne introuvable.');
    await journaliser(db, a.auth.uid, 'regie_statut', (req.params as any).id, { statut });
    notify('contenus');
    return { ok: true };
  });

  /** Création : enregistrée dans « pub_creations » rattachée à une campagne. */
  app.post('/v1/admin/regie/creations', async (req, reply) => {
    const a = await admin(req);
    const b = (req.body || {}) as Record<string, any>;
    if (!str(b.zone) || !str(b.texte_alt) || !str(b.campagne_id)) return fail(400, 'Zone, texte alternatif et campagne attendus.');
    if (!(await db.query(`SELECT 1 FROM regie_campagnes WHERE id = $1`, [b.campagne_id])).length) return fail(404, 'Campagne introuvable.');
    const id = b.id && ID.test(b.id) ? b.id : 'cr_' + Date.now().toString(36);
    const data = { id, zone: b.zone, campagne_id: b.campagne_id, annonceur: b.annonceur ?? null, titre: b.titre ?? null, image: b.image ?? null, lien: b.lien ?? null, texte_alt: b.texte_alt, format: b.format ?? 'natif', cta: b.cta ?? null, debut: b.debut ?? null, fin: b.fin ?? null, plafond_jour: Number(b.plafond_jour) || 0, publie: b.publie !== false };
    await db.query(`INSERT INTO contenus (collection, id, data, publie, statut) VALUES ('pub_creations',$1,$2,$3,$4) ON CONFLICT (collection,id) DO UPDATE SET data = EXCLUDED.data, publie = EXCLUDED.publie, deleted_at = NULL, updated_at = clock_timestamp()`, [id, JSON.stringify(data), data.publie, data.publie ? 'publie' : 'brouillon']);
    await journaliser(db, a.auth.uid, 'regie_creation', id);
    notify('contenus');
    return reply.status(201).send({ id });
  });

  app.get('/v1/admin/regie/stats', async (req) => {
    await admin(req);
    const jours = Math.min(90, Math.max(1, Number((req.query as any).jours) || 7));
    return db.query(`SELECT e.zone, e.creation_id, count(*) FILTER (WHERE e.type='affichage')::int AS affichages, count(*) FILTER (WHERE e.type='clic')::int AS clics, count(*) FILTER (WHERE e.type='recompense')::int AS recompenses,
       count(DISTINCT e.user_id)::int AS personnes FROM pub_evenements e WHERE e.jour > current_date - $1::int GROUP BY e.zone, e.creation_id ORDER BY affichages DESC LIMIT 200`, [jours]);
  });

  /** Crée dans Revive le site « Nkala » et une zone par emplacement de l'application (idempotent : les identifiants sont mémorisés dans les réglages). */
  app.post('/v1/admin/regie/revive/zones', async (req) => {
    const a = await admin(req);
    const r = await creerZonesRevive(db, revive);
    await journaliser(db, a.auth.uid, 'regie_revive_zones', undefined, r);
    return r;
  });

  /** Pousse annonceurs, campagnes et créations vers Revive (simulation sans REVIVE_URL). Idempotent : un identifiant Revive déjà connu n'est pas recréé. */
  app.post('/v1/admin/regie/revive/synchroniser', async (req) => {
    const a = await admin(req);
    const rapport = { simule: revive.simule, annonceurs: 0, campagnes: 0, creations: 0, erreurs: [] as string[] };
    try {
      for (const an of await db.query<any>(`SELECT * FROM regie_annonceurs WHERE revive_id IS NULL`)) { const id = await revive.annonceur({ nom: an.nom, contact: an.contact }); await db.query(`UPDATE regie_annonceurs SET revive_id = $2 WHERE id = $1`, [an.id, id]); rapport.annonceurs++; }
      for (const k of await db.query<any>(`SELECT k.*, a.revive_id AS an_revive FROM regie_campagnes k JOIN regie_annonceurs a ON a.id = k.annonceur_id WHERE k.revive_id IS NULL AND k.statut = 'active'`)) {
        const id = await revive.campagne({ annonceurRevive: k.an_revive, nom: k.nom, debut: k.debut && String(k.debut).slice(0, 10), fin: k.fin && String(k.fin).slice(0, 10) });
        await db.query(`UPDATE regie_campagnes SET revive_id = $2 WHERE id = $1`, [k.id, id]); rapport.campagnes++;
        for (const c of await db.query<any>(`SELECT id, data FROM contenus WHERE collection = 'pub_creations' AND data->>'campagne_id' = $1 AND image_ok IS NOT FALSE`.replace(" AND image_ok IS NOT FALSE", ''), [k.id])) {
          if (!c.data.image || !c.data.lien) continue;
          await revive.banniere({ campagneRevive: id, nom: c.data.id, image: c.data.image, lien: c.data.lien, alt: c.data.texte_alt, largeur: 320, hauteur: 50 }); rapport.creations++;
        }
      }
    } catch (e) { rapport.erreurs.push((e as Error).message); }
    await journaliser(db, a.auth.uid, 'regie_revive_sync', undefined, rapport);
    return rapport;
  });
}

/** Site et zones Revive pour tous les emplacements d'ZONES (tailles : bandeau 320×hauteur, plein écran 320×480). Réutilisable par script. */
export async function creerZonesRevive(q: Queryable, revive: ReturnType<typeof clientRevive>) {
  const { ZONES } = await import('../../../packages/noyau/src/publicite.ts');
  const memo = ((await q.query<any>(`SELECT valeur FROM parametres WHERE cle = 'revive_zones'`))[0]?.valeur ?? { site: null, zones: {} }) as { site: string | null; zones: Record<string, string> };
  const rapport = { simule: revive.simule, site: memo.site, creees: [] as string[], deja: 0, erreurs: [] as string[] };
  try {
    if (!memo.site) memo.site = await revive.editeur('Nkala');
    rapport.site = memo.site;
    for (const [nom, z] of Object.entries(ZONES) as [string, { format: string; hauteur?: number }][]) {
      if (memo.zones[nom]) { rapport.deja++; continue; }
      memo.zones[nom] = await revive.zone({ editeurRevive: memo.site!, nom, largeur: 320, hauteur: z.hauteur ?? (z.format === 'plein_ecran' ? 480 : 180) });
      rapport.creees.push(nom);
    }
  } catch (e) { rapport.erreurs.push((e as Error).message); }
  await q.query(`INSERT INTO parametres (cle, valeur, par) VALUES ('revive_zones', $1, 'systeme') ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur, updated_at = clock_timestamp()`, [JSON.stringify(memo)]);
  return rapport;
}
