/**
 * Skills réservés aux administrateurs :
 * - proposer_regle : modifier les règles de grammaire/orthographe/syntaxe en discutant en myènè
 * - (les routes HTTP de reset de progression sont dans ia.ts, pas ici)
 *
 * Ces outils ne sont ajoutés à la requête Qwen que si ctx.isAdmin est vrai.
 */
import type { Skill, ContexteSkill } from './index.ts';
import { enregistrerCorrection } from './corrections.ts';

export const skillAdmin: Skill = {
  nom: 'admin',
  promptFragment: `
### Mode administrateur
Tu travailles avec un administrateur DONDO. Il peut corriger les règles de grammaire, d'orthographe ou de syntaxe en te parlant normalement en myènè ou en français. Quand il te soumet une correction de règle, appelle l'outil proposer_regle pour l'enregistrer immédiatement. Confirme en myènè avec "Akewa, ma nota" et répète la règle telle qu'elle sera appliquée.
`.trim(),
  outils: [
    {
      type: 'function',
      function: {
        name: 'proposer_regle',
        description: 'Enregistrer une règle de grammaire, d\'orthographe ou de syntaxe validée par un administrateur. Active immédiatement pour tous les utilisateurs.',
        parameters: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              enum: ['orthographe', 'grammaire', 'syntaxe', 'lexique', 'phonetique'],
              description: 'Domaine de la règle.',
            },
            regle: {
              type: 'string',
              description: 'La règle telle qu\'elle doit être appliquée, en français, claire et concise.',
            },
            exemple_correct: {
              type: 'string',
              description: 'Un exemple correct illustrant la règle.',
            },
            forme_incorrecte: {
              type: 'string',
              description: 'Forme incorrecte remplacée (si applicable).',
            },
          },
          required: ['section', 'regle'],
        },
      },
    },
  ],
  async executer(nomOutil, args, ctx) {
    if (!ctx.isAdmin) return 'Non autorisé.';
    if (nomOutil === 'proposer_regle') {
      const a = (args && typeof args === 'object' ? args : {}) as any;
      const regle = String(a.regle ?? '').slice(0, 1000);
      const exempleCorrect = a.exemple_correct ? `Exemple correct : ${a.exemple_correct}` : '';
      const formeIncorrecte = a.forme_incorrecte ? `Forme incorrecte : ${a.forme_incorrecte}` : '';
      const reponseCorrecte = [regle, exempleCorrect, formeIncorrecte].filter(Boolean).join('\n');
      await enregistrerCorrection(
        ctx.db,
        {
          type: 'regle',
          section: String(a.section ?? '').slice(0, 50),
          reponseCorrecte,
          par: ctx.utilisateurId,
          valide: true,
        },
        ctx.indexerDocument
      );
      return `Règle enregistrée et active : ${regle}`;
    }
    return null;
  },
};
