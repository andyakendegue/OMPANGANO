/**
 * Journal des erreurs. Les erreurs du serveur (5xx, exceptions non rattrapées) et celles des navigateurs (/pub/erreur) sont
 * enregistrées ici ; backup/alertes.py les regroupe et les envoie par e-mail. Jamais de mot de passe ni de jeton :
 * les champs sont tronqués et seule une liste blanche de champs de contexte est gardée.
 */
import { createHash } from 'node:crypto';
import type { Queryable } from './db.ts';

const cut = (v: unknown, max: number): string | null => (typeof v === 'string' && v ? v.slice(0, max) : null);

/** Retire les nombres et identifiants variables pour regrouper les erreurs identiques */
export function empreinte(source: string, message: string, stack?: string | null): string {
  const base = message.replace(/[0-9a-f]{8,}/gi, '#').replace(/\d+/g, '#').slice(0, 200);
  const ligne = (stack || '').split('\n').find(l => /\bat\b|@/.test(l))?.replace(/\d+/g, '#').trim().slice(0, 160) || '';
  return createHash('sha1').update(`${source}|${base}|${ligne}`).digest('hex').slice(0, 16);
}

const CTX_AUTORISES = ['tab', 'version', 'online', 'status', 'categorie', 'methode', 'route', 'ecran', 'appareil'];

export async function journaliserErreur(q: Queryable, e: {
  source: 'serveur' | 'navigateur'; message: unknown; stack?: unknown; url?: unknown; userId?: unknown;
  ip?: unknown; userAgent?: unknown; ctx?: Record<string, unknown>;
}): Promise<void> {
  const message = cut(e.message, 500);
  if (!message) return;
  const stack = cut(e.stack, 3000);
  const ctx: Record<string, unknown> = {};
  for (const k of CTX_AUTORISES) {
    const v = e.ctx?.[k];
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') ctx[k] = typeof v === 'string' ? v.slice(0, 200) : v;
  }
  await q.query(
    `INSERT INTO app_errors (source, fingerprint, message, stack, url, user_id, ip, user_agent, ctx)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [e.source, empreinte(e.source, message, stack), message, stack, cut(e.url, 300), cut(e.userId, 128), cut(e.ip, 64), cut(e.userAgent, 300), JSON.stringify(ctx)]
  );
}
