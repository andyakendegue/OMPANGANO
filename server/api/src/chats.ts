/**
 * Chats de l'assistant Kak'Igonjo : plusieurs conversations par utilisateur, gardées côté serveur.
 * Pour chaque chat : le contexte (jetons renvoyés au modèle à chaque message), son état par rapport à l'inclus et au plafond,
 * le coût réel du modèle et les frais supplémentaires comptés quand le chat est en excès.
 * Réglages (console) : `ia_contexte` (inclus, max, politique) et `ia_tarifs` (devise, prix par million, frais d'excès par millier).
 * Les frais sont calculés et journalisés ; aucun prélèvement n'est fait ici.
 */
import { randomBytes } from 'node:crypto';
import {
  REGLES_CONTEXTE_DEFAUT, TARIF_IA_DEFAUT, coutAppel, estimerJetons, etatContexte, fraisExces, verifierQuota,
  type QuotaJetons, type ReglesContexte, type TarifIa,
} from '../../../packages/noyau/src/jetons.ts';
import { profilAgeDepuis } from '../../../packages/noyau/src/publicite.ts';
import { construireSysteme } from './ia.ts';
import { ficheUtilisateur } from './ficheIa.ts';
import { consigneActions, extraireActions } from '../../../packages/noyau/src/actionsIa.ts';
import type { Queryable } from './db.ts';
import { parametre, str, type Ctx } from './ctx.ts';
import { modulesActuels } from './contenus.ts';
import { QUOTA_DEFAUT, consommation, droitsDe } from './services.ts';

export const reglesContexte = async (q: Queryable): Promise<ReglesContexte> => {
  const r = { ...REGLES_CONTEXTE_DEFAUT, ...(await parametre<Partial<ReglesContexte>>(q, 'ia_contexte', {})) };
  return { ...r, max: Math.max(r.max, r.inclus) };
};
export const tarifIa = async (q: Queryable): Promise<TarifIa> => ({ ...TARIF_IA_DEFAUT, ...(await parametre<Partial<TarifIa>>(q, 'ia_tarifs', {})) });

const TOTAUX = `COALESCE(sum(u.jetons_entree), 0)::int AS entree, COALESCE(sum(u.jetons_sortie), 0)::int AS sortie, COALESCE(sum(u.cout), 0)::float AS cout,
  COALESCE(sum(u.jetons_exces), 0)::int AS jetons_exces, COALESCE(sum(u.frais), 0)::float AS frais, count(u.id)::int AS appels`;

export function registerChats(ctx: Ctx) {
  const { app, db, fail, acteur, ensureUser, env } = ctx;
  const admin = async (req: any) => { const a = await acteur(req); if (!a.isAdmin) fail(403, 'Réservé aux administrateurs.'); return a; };

  /** Fiche d'un chat telle que l'application l'affiche : contexte, état, coût et frais. Le coût réel n'est donné qu'aux administrateurs. */
  const fiche = (c: any, regles: ReglesContexte, tarif: TarifIa, voirCout: boolean) => ({
    id: c.id, titre: c.titre, creeLe: c.created_at, majLe: c.updated_at, messages: c.messages ?? 0,
    contexte: etatContexte(regles, c.contexte_jetons),
    jetons: { entree: c.entree, sortie: c.sortie }, appels: c.appels,
    frais: c.frais, jetonsExces: c.jetons_exces, devise: tarif.devise, politique: regles.politique,
    ...(voirCout ? { cout: c.cout } : {}),
  });
  const lire = async (q: Queryable, id: string, uid: string) => (await q.query<any>(
    `SELECT c.*, (SELECT count(*)::int FROM ia_messages m WHERE m.chat_id = c.id) AS messages, ${TOTAUX}
     FROM ia_chats c LEFT JOIN ia_usage u ON u.conversation_id = c.id WHERE c.id = $1 AND c.user_id = $2 GROUP BY c.id`, [id, uid]))[0];

  app.get('/v1/ia/chats', async (req) => {
    const a = await acteur(req);
    const [regles, tarif] = [await reglesContexte(db), await tarifIa(db)];
    const r = await db.query<any>(
      `SELECT c.*, (SELECT count(*)::int FROM ia_messages m WHERE m.chat_id = c.id) AS messages, ${TOTAUX}
       FROM ia_chats c LEFT JOIN ia_usage u ON u.conversation_id = c.id WHERE c.user_id = $1 GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 100`, [a.auth.uid]);
    const chats = r.map(c => fiche(c, regles, tarif, a.isAdmin));
    return { chats, regles, devise: tarif.devise, excesParMillier: tarif.excesParMillier, total: { frais: chats.reduce((s, c) => s + c.frais, 0), ...(a.isAdmin ? { cout: r.reduce((s, c) => s + c.cout, 0) } : {}) } };
  });

  app.post('/v1/ia/chats', async (req, reply) => {
    const a = await acteur(req);
    await ensureUser(db, a.auth);
    const { titre } = (req.body || {}) as { titre?: string };
    if (Number((await db.query<any>(`SELECT count(*) AS n FROM ia_chats WHERE user_id = $1`, [a.auth.uid]))[0].n) >= 100) return fail(409, 'Tu as déjà 100 chats : supprime-en un pour en ouvrir un autre.');
    const id = 'ch_' + randomBytes(8).toString('hex');
    await db.query(`INSERT INTO ia_chats (id, user_id, titre) VALUES ($1,$2,$3)`, [id, a.auth.uid, str(titre) && titre.trim() ? titre.trim().slice(0, 80) : 'Nouveau chat']);
    return reply.status(201).send({ chat: fiche(await lire(db, id, a.auth.uid), await reglesContexte(db), await tarifIa(db), a.isAdmin) });
  });

  app.get('/v1/ia/chats/:id', async (req) => {
    const a = await acteur(req);
    const c = await lire(db, (req.params as any).id, a.auth.uid);
    if (!c) return fail(404, 'Chat introuvable.');
    const messages = await db.query<any>(`SELECT role, contenu AS content, at FROM ia_messages WHERE chat_id = $1 ORDER BY id`, [c.id]);
    return { chat: fiche(c, await reglesContexte(db), await tarifIa(db), a.isAdmin), messages };
  });

  app.patch('/v1/ia/chats/:id', async (req) => {
    const a = await acteur(req);
    const { titre } = (req.body || {}) as { titre?: string };
    if (!str(titre) || !titre.trim()) return fail(400, 'Titre attendu.');
    const r = await db.query(`UPDATE ia_chats SET titre = $3 WHERE id = $1 AND user_id = $2 RETURNING id`, [(req.params as any).id, a.auth.uid, titre.trim().slice(0, 80)]);
    if (!r.length) return fail(404, 'Chat introuvable.');
    return { ok: true };
  });

  // Les messages disparaissent ; le journal des jetons (ia_usage) reste, pour les comptes.
  app.delete('/v1/ia/chats/:id', async (req, reply) => {
    const a = await acteur(req);
    await db.query(`DELETE FROM ia_chats WHERE id = $1 AND user_id = $2`, [(req.params as any).id, a.auth.uid]);
    return reply.status(204).send();
  });

  /**
   * Envoie un message dans un chat. L'historique vient de la base (jamais du client).
   * 409 `plein` : contexte au plafond. 409 `exces` : politique « bloquer ». 402 `frais` : politique « facturer » sans accord
   * (le corps donne l'estimation ; renvoyer avec `accepteFrais: true`).
   */
  app.post('/v1/ia/chats/:id/messages', async (req, reply) => {
    const a = await acteur(req);
    const { message, accepteFrais, etat } = (req.body || {}) as { message?: string; accepteFrais?: boolean; etat?: unknown };
    if (!str(message) || !message.trim() || message.length > 2000) return fail(400, 'Message vide ou trop long (2000 caractères au plus).');
    const { fonctions, modules } = await modulesActuels(db, env);
    if (!fonctions.assistantIA) return fail(503, 'Kak\'Igonjo n\'est pas encore là.');
    await ensureUser(db, a.auth);
    const c = await lire(db, (req.params as any).id, a.auth.uid);
    if (!c) return fail(404, 'Chat introuvable.');
    const [regles, tarif] = [await reglesContexte(db), await tarifIa(db)];

    const moi = (await db.query<any>(`SELECT data->>'birthDate' AS n, COALESCE(NULLIF(data->>'displayName', ''), data->>'fullName') AS nom FROM users WHERE id = $1`, [a.auth.uid]))[0];
    const age = profilAgeDepuis(moi?.n);
    const droits = await droitsDe(db, a.auth.uid, a.role);
    const base = { ...QUOTA_DEFAUT, ...(await parametre<Partial<QuotaJetons>>(db, 'ia_quotas', {})) };
    const f = age === 'enfant' ? 0.25 : droits.abonneJusque && droits.abonneJusque > Date.now() ? 4 : 1;
    // Dans un chat, la longueur est gouvernée par les règles de contexte, pas par le quota « par conversation ».
    const quota: QuotaJetons = { parJour: Math.floor(base.parJour * f), parMois: Math.floor(base.parMois * f), parConversation: Number.MAX_SAFE_INTEGER };

    const texte = message.trim();
    const historique = (await db.query<any>(`SELECT role, contenu FROM ia_messages WHERE chat_id = $1 ORDER BY id`, [c.id])).map(m => ({ role: m.role as 'user' | 'assistant', content: m.contenu as string }));
    const msgs = [...historique, { role: 'user' as const, content: texte }];
    // Enfant par l'âge ou par le mode choisi sur le téléphone : pas de changement de mode proposé.
    const modeEnfant = !!etat && typeof etat === 'object' && (etat as any).prefs?.mode === 'enfant';
    const cadre = { enfant: age === 'enfant' || modeEnfant, modules };
    const { systeme, contexte: sources, cfg } = await construireSysteme(db, ctx.embed, {
      message: texte, enfant: age === 'enfant', prenom: moi?.nom,
      fiche: await ficheUtilisateur(db, a.auth.uid, etat), actions: consigneActions(cadre),
    });
    // Contexte de cet envoi : la mesure du dernier appel si elle existe, sinon l'estimation ; on garde la plus prudente.
    const estime = Math.max(estimerJetons(systeme + msgs.map(m => m.content).join('')), c.contexte_jetons + estimerJetons(texte));
    const avant = etatContexte(regles, estime);
    const prevu = fraisExces(tarif, regles, estime);
    const corps = { contexte: avant, fraisEstimes: prevu.frais, devise: tarif.devise, politique: regles.politique };
    if (estime + cfg.maxTokens > regles.max) return reply.status(409).send({ error: 'Ce chat est plein : ouvre un nouveau chat pour continuer.', code: 'plein', ...corps });
    if (avant.exces > 0 && regles.politique === 'bloquer') return reply.status(409).send({ error: 'Ce chat a dépassé le contexte inclus : ouvre un nouveau chat.', code: 'exces', ...corps });
    if (avant.exces > 0 && regles.politique === 'facturer' && prevu.frais > 0 && accepteFrais !== true)
      return reply.status(402).send({ error: 'Ce chat a dépassé le contexte inclus : continuer ajoute des frais.', code: 'frais', ...corps });

    const verdict = verifierQuota(quota, await consommation(db, a.auth.uid, c.id), estime + cfg.maxTokens);
    if (!verdict.ok) return fail(429, verdict.limite === 'jour' ? 'Tu as utilisé tous tes messages d\'aujourd\'hui. Reviens demain !' : 'Tu as atteint ton quota du mois.');

    let rep;
    try { rep = await ctx.ia.repondre({ systeme, messages: msgs, modele: cfg.modele || env.IA_MODELE || 'claude-haiku-5-5', temperature: cfg.temperature, maxTokens: cfg.maxTokens }); }
    catch { return fail(502, 'Kak\'Igonjo ne répond pas pour le moment. Réessaie dans un instant.'); }

    // Mesures du fournisseur : c'est elles qui font foi pour le coût et pour les frais.
    // Les balises d'action sont retirées du texte gardé : l'historique ne garde que la réponse lisible.
    const { texte: lisible, actions } = extraireActions(rep.texte, cadre);
    const cout = rep.simule ? 0 : coutAppel(tarif, rep.usage);
    const reel = fraisExces(tarif, regles, rep.usage.entree);
    const frais = rep.simule ? 0 : reel.frais;
    const suivant = rep.usage.entree + rep.usage.sortie;
    await db.tx(async q => {
      await q.query(`INSERT INTO ia_messages (chat_id, role, contenu) VALUES ($1,'user',$2), ($1,'assistant',$3)`, [c.id, texte, lisible]);
      await q.query(`INSERT INTO ia_usage (user_id, conversation_id, modele, jetons_entree, jetons_sortie, jetons_cache, simule, cout, jetons_exces, frais, devise) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [a.auth.uid, c.id, rep.modele, rep.usage.entree, rep.usage.sortie, rep.usage.cache ?? 0, rep.simule, cout, reel.jetons, frais, tarif.devise]);
      await q.query(`UPDATE ia_chats SET contexte_jetons = $2, updated_at = clock_timestamp(), titre = CASE WHEN titre = 'Nouveau chat' THEN $3 ELSE titre END WHERE id = $1`,
        [c.id, suivant, texte.replace(/\s+/g, ' ').slice(0, 48)]);
    });
    const apres = verifierQuota(quota, await consommation(db, a.auth.uid, c.id), 0);
    return {
      reponse: lisible, actions, simule: rep.simule, sources: sources.map(s => ({ titre: s.titre, source: s.source ?? null })),
      appel: { entree: rep.usage.entree, sortie: rep.usage.sortie, jetonsExces: reel.jetons, frais, devise: tarif.devise, ...(a.isAdmin ? { cout, modele: rep.modele } : {}) },
      chat: fiche(await lire(db, c.id, a.auth.uid), regles, tarif, a.isAdmin),
      quota: apres.ok ? { restantJour: apres.restantJour, restantMois: apres.restantMois, alerte: apres.alerte } : { restantJour: 0, restantMois: 0, alerte: true },
    };
  });

  // ---------------------------------------------------------------- console : combien ça coûte
  app.get('/v1/admin/ia/couts', async (req) => {
    await admin(req);
    const [regles, tarif] = [await reglesContexte(db), await tarifIa(db)];
    const somme = `COALESCE(sum(jetons_entree), 0)::int AS entree, COALESCE(sum(jetons_sortie), 0)::int AS sortie, COALESCE(sum(cout), 0)::float AS cout, COALESCE(sum(jetons_exces), 0)::int AS jetons_exces, COALESCE(sum(frais), 0)::float AS frais, count(*)::int AS appels`;
    const un = async (ou: string) => (await db.query<any>(`SELECT ${somme} FROM ia_usage WHERE NOT simule AND ${ou}`))[0];
    const chats = await db.query<any>(
      `SELECT c.id, c.titre, c.user_id, c.contexte_jetons, c.updated_at, ${TOTAUX} FROM ia_chats c LEFT JOIN ia_usage u ON u.conversation_id = c.id GROUP BY c.id ORDER BY cout DESC, c.updated_at DESC LIMIT 50`);
    const utilisateurs = await db.query<any>(`SELECT user_id, ${somme} FROM ia_usage WHERE NOT simule AND at >= date_trunc('month', clock_timestamp()) GROUP BY user_id ORDER BY cout DESC LIMIT 50`);
    return {
      regles, tarif,
      jour: await un(`at >= date_trunc('day', clock_timestamp())`), mois: await un(`at >= date_trunc('month', clock_timestamp())`), total: await un('true'),
      enExces: Number((await db.query<any>(`SELECT count(*) AS n FROM ia_chats WHERE contexte_jetons > $1`, [regles.inclus]))[0].n),
      chats: chats.map(c => ({ id: c.id, titre: c.titre, utilisateur: c.user_id, majLe: c.updated_at, contexte: etatContexte(regles, c.contexte_jetons), appels: c.appels, cout: c.cout, frais: c.frais, jetonsExces: c.jetons_exces })),
      utilisateurs,
    };
  });
}
