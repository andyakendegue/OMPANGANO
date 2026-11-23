/**
 * Registre des skills de Kak'Igonjo.
 * Un skill peut ajouter un fragment au prompt système, exposer des outils à Qwen,
 * et fournir un handler côté serveur pour exécuter ces outils de façon sécurisée.
 */
export interface ParametreOutil {
  type: string;
  description?: string;
  enum?: string[];
  items?: { type: string };
}

export interface OutilDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, ParametreOutil>;
      required?: string[];
    };
  };
}

export interface Skill {
  nom: string;
  promptFragment?: string;
  outils?: OutilDefinition[];
  /** Exécuté côté serveur quand Qwen appelle un outil de ce skill. */
  executer?: (nomOutil: string, args: unknown, contexte: ContexteSkill) => Promise<unknown>;
}

export interface ContexteSkill {
  utilisateurId: string;
  isAdmin: boolean;
  db: import('../db.ts').Queryable;
  indexerDocument?: (documentId: string) => Promise<number>;
}
