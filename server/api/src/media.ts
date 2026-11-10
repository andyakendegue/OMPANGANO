/**
 * Médias protégés (niveau 1) : listes de lecture HLS dont les segments sont chiffrés en AES-128. La clé n'est jamais dans le stockage :
 * elle est dérivée du secret du serveur (HMAC) et livrée seulement contre une licence de lecture courte (POST /v1/lecture/licence),
 * qui n'est délivrée qu'aux comptes ayant le droit d'accès. Les segments sont servis par des URL présignées de 2 h.
 * Le conditionnement (ffmpeg) est fait par scripts/chiffrer_media.ts avec la même dérivation de clé.
 */
import { createHmac } from 'node:crypto';
import { jwtVerify } from 'jose';
import type { FastifyRequest } from 'fastify';
import type { MediaStorage } from './storage.ts';
import type { Ctx } from './ctx.ts';

export const COLLECTIONS_PROTEGEES = ['titres', 'chapitres', 'cours_artisans'];
const ID_RE = /^[A-Za-z0-9_.-]{1,120}$/;

/** Clé AES-128 (16 octets) d'un contenu : HMAC-SHA256(secret, « media/collection/id »). */
export const cleContenu = (secret: string, collection: string, id: string): Buffer =>
  createHmac('sha256', secret).update(`media/${collection}/${id}`).digest().subarray(0, 16);

export const cheminMedia = (collection: string, id: string, fichier: string) => `media/${collection}/${id}/${fichier}`;

/** Adresse publique de l'API (PUBLIC_API_URL, sinon celle de la requête derrière le proxy). */
export const baseApi = (req: FastifyRequest, env: NodeJS.ProcessEnv) => (env.PUBLIC_API_URL || `${req.protocol}://${req.hostname}`).replace(/\/+$/, '');

/** Réécrit la liste de lecture : clé → adresse de licence, segments → URL présignées. */
export async function reecrirePlaylist(texte: string, o: { collection: string; id: string; urlCle: string; storage: MediaStorage; ttlS?: number }): Promise<string> {
  const sortie: string[] = [];
  for (const ligne of texte.split(/\r?\n/)) {
    if (ligne.startsWith('#EXT-X-KEY')) sortie.push(ligne.replace(/URI="[^"]*"/, `URI="${o.urlCle}"`));
    else if (ligne && !ligne.startsWith('#')) sortie.push(/^https?:\/\//.test(ligne) ? ligne : await o.storage.presignGet(cheminMedia(o.collection, o.id, ligne.replace(/[^A-Za-z0-9_.-]/g, '')), o.ttlS ?? 7200));
    else sortie.push(ligne);
  }
  return sortie.join('\n');
}

export function registerMedia({ app, fail, secret, env }: Ctx, storage: MediaStorage) {
  async function licence(req: FastifyRequest, collection: string, id: string): Promise<string> {
    const t = (req.query as { t?: string }).t;
    if (!t || !COLLECTIONS_PROTEGEES.includes(collection) || !ID_RE.test(id)) return fail(403, 'Licence manquante.');
    try {
      const { payload } = await jwtVerify(t, new TextEncoder().encode(secret), { issuer: 'nkala-licence', algorithms: ['HS256'] });
      if (payload.c !== `${collection}/${id}`) throw new Error('contenu');
      return t;
    } catch { return fail(403, 'Licence invalide ou expirée.'); }
  }

  app.get('/media/hls/:collection/:fichier', async (req, reply) => {
    const { collection, fichier } = req.params as { collection: string; fichier: string };
    const id = fichier.replace(/\.m3u8$/, '');
    const t = await licence(req, collection, id);
    const brut = await storage.get?.(cheminMedia(collection, id, 'index.m3u8'));
    if (!brut) return fail(404, 'Média introuvable.');
    const texte = await reecrirePlaylist(Buffer.from(brut).toString('utf8'), { collection, id, storage, urlCle: `${baseApi(req, env)}/media/cle/${collection}/${id}?t=${encodeURIComponent(t)}` });
    return reply.header('Content-Type', 'application/vnd.apple.mpegurl').header('Cache-Control', 'no-store').send(texte);
  });

  app.get('/media/cle/:collection/:id', async (req, reply) => {
    const { collection, id } = req.params as { collection: string; id: string };
    await licence(req, collection, id);
    return reply.header('Content-Type', 'application/octet-stream').header('Cache-Control', 'no-store').send(cleContenu(secret, collection, id));
  });
}
