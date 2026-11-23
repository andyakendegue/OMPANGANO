/**
 * Skill corrections : permet à Qwen d'enregistrer une question sans réponse (escalade)
 * et aux utilisateurs de signaler une erreur. Les corrections validées par un admin
 * s'indexent automatiquement comme document rang 0 dans le RAG.
 *
 * Document RAG alimenté : id = 'corrections_validees', titre = 'Regles myene v3 › Corrections validées admin'
 * (titre préfixé 'Regles myene v3' → rang 0 dans etiquetteSource).
 */
import type { Queryable } from '../db.ts';
import type { Skill, ContexteSkill } from './index.ts';

export const DOC_CORRECTIONS_ID = 'corrections_validees';
export const DOC_CORRECTIONS_TITRE = 'Regles myene v3 › Corrections validées admin';

/** Reconstruit le texte du document rang 0 à partir de toutes les corrections validées. */
export async function texteCorrections(q: Queryable): Promise<string> {
  const rows = await q.query<any>(
    `SELECT type, section, reponse_correcte, question, note, created_at
     FROM ia_corrections WHERE valide = true ORDER BY created_at ASC`,
  );
  if (!rows.length) return '(Aucune correction validée pour l\'instant.)';
  const blocs: string[] = [];
  for (const r of rows) {
    const titre = r.type === 'regle' ? `[Règle${r.section ? ' — ' + r.section : ''}]`
      : r.type === 'lexique' ? '[Lexique]' : '[Erreur corrigée]';
    const lines = [titre];
    if (r.question) lines.push(`Question : ${r.question}`);
    lines.push(`Réponse correcte : ${r.reponse_correcte}`);
    if (r.note) lines.push(`Note : ${r.note}`);
    blocs.push(lines.join('\n'));
  }
  return blocs.join('\n\n');
}

/** Enregistre une correction et réindexe le document si l'option indexer est vraie. */
export async function enregistrerCorrection(
  q: Queryable,
  c: { type: 'erreur' | 'regle' | 'lexique'; question?: string; reponseErronee?: string; reponseCorrecte: string; section?: string; note?: string; par?: string; valide?: boolean },
  indexer?: (documentId: string) => Promise<number>
): Promise<number> {
  const r = (await q.query<any>(
    `INSERT INTO ia_corrections (type, question, reponse_erronee, reponse_correcte, section, note, par, valide)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [c.type, c.question ?? null, c.reponseErronee ?? null, c.reponseCorrecte, c.section ?? null, c.note ?? null, c.par ?? null, c.valide ?? false]
  ))[0].id;

  if (c.valide && indexer) {
    const texte = await texteCorrections(q);
    await q.query(
      `INSERT INTO ia_documents (id, titre, texte, par) VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET titre = EXCLUDED.titre, texte = EXCLUDED.texte, updated_at = clock_timestamp()`,
      [DOC_CORRECTIONS_ID, DOC_CORRECTIONS_TITRE, texte, c.par ?? 'admin']
    );
    await indexer(DOC_CORRECTIONS_ID);
  }
  return Number(r);
}

export const skillCorrections: Skill = {
  nom: 'corrections',
  outils: [
    {
      type: 'function',
      function: {
        name: 'escalader_question',
        description: "Envoyer une question à l'équipe DONDO quand le corpus ne permet pas d'y répondre. N'utilise cet outil que si tu ne trouves vraiment pas la réponse dans tes sources.",
        parameters: {
          type: 'object',
          properties: {
            question: { type: 'string', description: 'La question exacte posée par l\'utilisateur.' },
            raison: { type: 'string', description: 'Pourquoi le corpus ne répond pas (mot manquant, règle absente…).' },
          },
          required: ['question', 'raison'],
        },
      },
    },
  ],
  async executer(nomOutil, args, ctx) {
    if (nomOutil === 'escalader_question') {
      const a = (args && typeof args === 'object' ? args : {}) as any;
      await enregistrerCorrection(ctx.db, {
        type: 'erreur',
        question: String(a.question ?? '').slice(0, 500),
        reponseCorrecte: '(à compléter par l\'équipe DONDO)',
        note: String(a.raison ?? '').slice(0, 300),
        par: ctx.utilisateurId,
        valide: false,
      });
      return "Ta question a été transmise à l'équipe. Ils l'ajouteront bientôt à la base.";
    }
    return null;
  },
};
