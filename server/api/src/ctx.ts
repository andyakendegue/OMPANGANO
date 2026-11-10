import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Db, Queryable } from './db.ts';
import type { AuthUser } from './auth.ts';
import type { FournisseurSms } from './sms.ts';
import type { FournisseurEmbedding, FournisseurIa } from './ia.ts';

export interface Acteur { auth: AuthUser; isAdmin: boolean; isStaff: boolean; role: string; status: string }

/** Ce que app.ts met à disposition des modules de routes de Nkala. */
export interface Ctx {
  app: FastifyInstance;
  db: Db;
  fail: (status: number, message: string) => never;
  acteur: (req: FastifyRequest) => Promise<Acteur>;
  ensureUser: (q: Queryable, auth: AuthUser) => Promise<any>;
  notify: (collection: string) => void;
  env: NodeJS.ProcessEnv;
  sms: FournisseurSms;
  ia: FournisseurIa;
  embed: FournisseurEmbedding;
  secret: string;
}

export const str = (v: unknown): v is string => typeof v === 'string';

export async function journaliser(q: Queryable, par: string, action: string, cible?: string, detail: unknown = {}) {
  await q.query(`INSERT INTO journal_admin (par, action, cible, detail) VALUES ($1,$2,$3,$4)`, [par, action, cible ?? null, JSON.stringify(detail)]);
}

/** Lit un réglage de la table « parametres » (valeur par défaut si absent). */
export async function parametre<T>(q: Queryable, cle: string, defaut: T): Promise<T> {
  const r = await q.query<{ valeur: T }>(`SELECT valeur FROM parametres WHERE cle = $1`, [cle]);
  return r.length ? r[0].valeur : defaut;
}
