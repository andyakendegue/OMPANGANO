/**
 * Skill mémoire : Kak'Igonjo se souvient de chaque apprenant entre les sessions.
 * La mémoire est chargée au début du chat et mise à jour à la fin via l'outil maj_memoire.
 * Elle ne dépasse pas ~500 caractères dans le prompt système.
 */
import type { Queryable } from '../db.ts';
import type { Skill, ContexteSkill } from './index.ts';

export interface MemoireUtilisateur {
  resume: string;
  progression: {
    jeux_vus?: string[];
    erreurs_frequentes?: string[];
    mots_appris?: string[];
    dernier_sujet?: string;
  };
  style: {
    prefere_myene?: boolean;
    prefere_exemples?: boolean;
    niveau_estime?: 'debutant' | 'intermediaire' | 'avance';
  };
}

/** Charge la mémoire d'un utilisateur depuis la base. Null si aucune mémoire. */
export async function chargerMemoire(q: Queryable, utilisateurId: string): Promise<MemoireUtilisateur | null> {
  const r = (await q.query<any>(
    `SELECT resume, progression, style FROM ia_memoire_utilisateur WHERE utilisateur_id = $1`,
    [utilisateurId]
  ))[0];
  if (!r) return null;
  return { resume: r.resume || '', progression: r.progression || {}, style: r.style || {} };
}

/** Construit le fragment de prompt système à partir de la mémoire. */
export function fragmentMemoire(m: MemoireUtilisateur): string {
  if (!m.resume && !m.progression.dernier_sujet) return '';
  const lignes: string[] = ['### Ce que tu sais de ton interlocuteur'];
  if (m.resume) lignes.push(m.resume);
  if (m.progression.dernier_sujet) lignes.push(`Dernier sujet abordé : ${m.progression.dernier_sujet}.`);
  if (m.progression.erreurs_frequentes?.length) lignes.push(`Erreurs fréquentes : ${m.progression.erreurs_frequentes.slice(0, 3).join(', ')}.`);
  if (m.style.prefere_myene) lignes.push('Préfère les réponses directement en myènè.');
  if (m.style.niveau_estime) lignes.push(`Niveau estimé : ${m.style.niveau_estime}.`);
  return lignes.join('\n');
}

/** Enregistre la mise à jour de mémoire proposée par Qwen (outil maj_memoire). */
async function majMemoire(q: Queryable, utilisateurId: string, args: unknown): Promise<string> {
  const a = (args && typeof args === 'object' ? args : {}) as Partial<MemoireUtilisateur & { resume?: string }>;
  const actuelle = await chargerMemoire(q, utilisateurId) ?? { resume: '', progression: {}, style: {} };
  const prog = { ...actuelle.progression, ...(a.progression ?? {}) };
  const style = { ...actuelle.style, ...(a.style ?? {}) };
  const resume = (typeof a.resume === 'string' && a.resume.trim() ? a.resume.trim() : actuelle.resume).slice(0, 500);
  await q.query(
    `INSERT INTO ia_memoire_utilisateur (utilisateur_id, resume, progression, style, mise_a_jour)
     VALUES ($1, $2, $3, $4, clock_timestamp())
     ON CONFLICT (utilisateur_id) DO UPDATE SET resume = $2, progression = $3, style = $4, mise_a_jour = clock_timestamp()`,
    [utilisateurId, resume, JSON.stringify(prog), JSON.stringify(style)]
  );
  return 'Mémoire mise à jour.';
}

export const skillMemoire: Skill = {
  nom: 'memoire',
  outils: [
    {
      type: 'function',
      function: {
        name: 'maj_memoire',
        description: "Mettre à jour ce que Kak'Igonjo sait de cet apprenant après l'échange (résumé, progression, style). Appelle cet outil une seule fois en fin de réponse quand quelque chose a changé.",
        parameters: {
          type: 'object',
          properties: {
            resume: {
              type: 'string',
              description: 'Résumé compact de qui est cet apprenant et ce qu\'il sait déjà (500 caractères max).',
            },
            dernier_sujet: {
              type: 'string',
              description: 'Sujet principal de cet échange (ex. "verbes au présent", "salutations").',
            },
            niveau_estime: {
              type: 'string',
              enum: ['debutant', 'intermediaire', 'avance'],
              description: 'Niveau estimé d\'après l\'échange.',
            },
            erreur_notee: {
              type: 'string',
              description: 'Une erreur récurrente à noter (optionnel).',
            },
          },
        },
      },
    },
  ],
  async executer(nomOutil, args, ctx) {
    if (nomOutil === 'maj_memoire') {
      const a = (args && typeof args === 'object' ? args : {}) as any;
      const prog: Record<string, unknown> = {};
      if (a.dernier_sujet) prog.dernier_sujet = String(a.dernier_sujet).slice(0, 100);
      if (a.erreur_notee) {
        const actuelle = await chargerMemoire(ctx.db, ctx.utilisateurId);
        const existantes = actuelle?.progression.erreurs_frequentes ?? [];
        prog.erreurs_frequentes = [...new Set([...existantes, String(a.erreur_notee).slice(0, 60)])].slice(0, 10);
      }
      const style: Record<string, unknown> = {};
      if (a.niveau_estime) style.niveau_estime = a.niveau_estime;
      await majMemoire(ctx.db, ctx.utilisateurId, { resume: a.resume, progression: prog, style });
      return 'Mémoire mise à jour.';
    }
    return null;
  },
};
