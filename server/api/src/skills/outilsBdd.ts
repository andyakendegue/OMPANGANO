/**
 * Outils de lecture de la base de données pour Qwen.
 * SÉCURITÉ : toutes les requêtes sont pré-écrites et paramétrées.
 * L'userId est injecté par le serveur — Qwen ne le voit jamais.
 * Aucun outil d'écriture n'est exposé ici (voir skills/corrections.ts et skills/admin.ts).
 */
import type { Skill, ContexteSkill } from './index.ts';

async function maProgression(ctx: ContexteSkill): Promise<unknown> {
  const scores = await ctx.db.query<any>(
    `SELECT j.data->>'nom' AS jeu, s.niveau, s.score, s.xp, s.created_at
     FROM scores s JOIN items j ON j.id = s.jeu_id
     WHERE s.user_id = $1 ORDER BY s.created_at DESC LIMIT 20`,
    [ctx.utilisateurId]
  );
  const prog = (await ctx.db.query<any>(
    `SELECT data FROM progression WHERE user_id = $1`,
    [ctx.utilisateurId]
  ))[0]?.data ?? {};
  const user = (await ctx.db.query<any>(
    `SELECT xp, level, level_index FROM users WHERE id = $1`,
    [ctx.utilisateurId]
  ))[0];
  return { niveau: user, scores: scores.slice(0, 10), progression: prog };
}

async function mesAnnonces(ctx: ContexteSkill): Promise<unknown> {
  return ctx.db.query<any>(
    `SELECT titre, description, statut, created_at FROM items WHERE user_id = $1 AND type = 'annonce' ORDER BY created_at DESC LIMIT 10`,
    [ctx.utilisateurId]
  );
}

async function monSoldeNkorouna(ctx: ContexteSkill): Promise<unknown> {
  const r = (await ctx.db.query<any>(
    `SELECT solde FROM nkorouna_comptes WHERE user_id = $1`,
    [ctx.utilisateurId]
  ))[0];
  return { solde: r?.solde ?? 0 };
}

export const skillOutilsBdd: Skill = {
  nom: 'outils_bdd',
  outils: [
    {
      type: 'function',
      function: {
        name: 'ma_progression',
        description: 'Consulter les scores, niveaux et XP de cet apprenant dans les jeux.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'mes_annonces',
        description: 'Consulter les annonces publiées par cet utilisateur.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'mon_solde_nkorouna',
        description: 'Consulter le solde Nkorouna (monnaie virtuelle) de cet utilisateur.',
        parameters: { type: 'object', properties: {} },
      },
    },
  ],
  async executer(nomOutil, _args, ctx) {
    if (nomOutil === 'ma_progression') return maProgression(ctx);
    if (nomOutil === 'mes_annonces') return mesAnnonces(ctx);
    if (nomOutil === 'mon_solde_nkorouna') return monSoldeNkorouna(ctx);
    return null;
  },
};
