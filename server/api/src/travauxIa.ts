/**
 * Réponses différées de l'assistant (14 nov. 2026) : le modèle et les embeddings tournent en serverless (RunPod) ; au réveil d'un worker,
 * une réponse peut prendre plusieurs minutes, bien plus que le délai d'une requête du téléphone (30 s) ou d'un réseau mobile.
 * L'envoi (avec `asynchrone: true`) répond aussitôt 202 et un numéro de travail ; l'application relève GET /v1/ia/travaux/:id
 * jusqu'à la réponse, en faisant patienter l'utilisateur. Les travaux vivent en mémoire de l'API (un redémarrage les perd :
 * le téléphone reçoit 404 et propose de renvoyer le message).
 */
import { randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Ctx } from './ctx.ts';

/** Au-delà, un travail est abandonné et oublié (le relais attend lui-même au plus 10 minutes). */
export const DUREE_MAX_TRAVAIL_MS = 12 * 60_000;
const GARDE_APRES_FIN_MS = 15 * 60_000;
const EN_COURS_MAX_PAR_COMPTE = 2;

interface Travail { uid: string; debut: number; fin?: number; code?: number; corps?: unknown }
const travaux = new Map<string, Travail>();
const nettoyage = setInterval(() => {
  const t = Date.now();
  for (const [id, x] of travaux) if ((x.fin && t - x.fin > GARDE_APRES_FIN_MS) || t - x.debut > DUREE_MAX_TRAVAIL_MS + GARDE_APRES_FIN_MS) travaux.delete(id);
}, 60_000);
nettoyage.unref?.();

/** Imite la partie de `reply` utilisée par les routes (status, send, header) pour capter leur réponse hors requête. */
async function capter(fn: (reply: FastifyReply) => Promise<unknown>): Promise<{ code: number; corps: unknown }> {
  let code = 200, corps: unknown, envoye = false;
  const rep: any = { status(c: number) { code = c; return rep; }, code(c: number) { code = c; return rep; }, header() { return rep; }, send(b: unknown) { corps = b; envoye = true; return rep; } };
  try {
    const r = await fn(rep as FastifyReply);
    if (!envoye) corps = r;
  } catch (e: any) {
    // Même règle que le gestionnaire d'erreurs de l'API : une erreur voulue (fail, avec un statut) garde son message ;
    // une erreur imprévue devient « Erreur interne. » (J4) et son détail part au journal.
    const voulue = Number.isInteger(e?.status) && e.status >= 400;
    code = voulue ? e.status : (Number(e?.statusCode) >= 400 && Number(e?.statusCode) < 500 ? Number(e.statusCode) : 500);
    corps = { error: code >= 500 && !voulue ? 'Erreur interne.' : String(e?.message ?? 'Erreur') };
    if (code >= 500 && !voulue) corps = { ...corps as object, detail: String(e?.message ?? e) };
  }
  return { code, corps };
}

/** Lance `fn` en arrière-plan pour le compte `uid` ; renvoie le numéro du travail, ou null si le compte a déjà trop de travaux en cours. */
export function lancerTravail(uid: string, fn: (reply: FastifyReply) => Promise<unknown>, journal?: (e: unknown) => void): string | null {
  const enCours = [...travaux.values()].filter(x => x.uid === uid && !x.fin).length;
  if (enCours >= EN_COURS_MAX_PAR_COMPTE) return null;
  const id = 'tr_' + randomBytes(9).toString('hex');
  const t: Travail = { uid, debut: Date.now() };
  travaux.set(id, t);
  void capter(fn).then(r => {
    const { detail, ...visible } = (r.corps ?? {}) as { detail?: string };
    t.fin = Date.now(); t.code = r.code; t.corps = detail === undefined ? r.corps : visible;
    if (detail !== undefined) journal?.(detail);
  });
  return id;
}

/**
 * Enveloppe d'une route : si le corps demande `asynchrone: true`, la route s'exécute en arrière-plan et répond 202 tout de suite.
 * `verifier` fait les contrôles rapides (compte, saisie) avant de répondre 202, pour que les erreurs simples restent immédiates.
 */
export function differable(app: Ctx['app'], acteur: Ctx['acteur'], route: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>, verifier?: (req: FastifyRequest) => void) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if ((req.body as any)?.asynchrone !== true) return route(req, reply);
    const a = await acteur(req);
    verifier?.(req);
    const id = lancerTravail(a.auth.uid, rep => route(req, rep), e => req.log.error({ err: e }, 'travail IA'));
    if (!id) return reply.status(429).send({ error: 'Kak\'Igonjo prépare déjà tes réponses : attends qu\'elles arrivent.' });
    return reply.status(202).send({ travail: id, attente: true });
  };
}

export function registerTravauxIa({ app, acteur, fail }: Ctx) {
  /** Relevé d'un travail : 200 { statut: 'en_cours', depuis } tant qu'il tourne ; puis le code et le corps de la réponse de la route. */
  app.get('/v1/ia/travaux/:id', async (req, reply) => {
    const a = await acteur(req);
    const id = String((req.params as any).id || '');
    const t = /^tr_[0-9a-f]{18}$/.test(id) ? travaux.get(id) : undefined;
    if (!t || t.uid !== a.auth.uid) return fail(404, 'Réponse introuvable : renvoie ton message.');
    if (!t.fin) {
      if (Date.now() - t.debut > DUREE_MAX_TRAVAIL_MS) { travaux.delete(id); return fail(504, 'Kak\'Igonjo n\'a pas pu répondre à temps. Renvoie ton message.'); }
      return { statut: 'en_cours', depuis: Math.round((Date.now() - t.debut) / 1000) };
    }
    travaux.delete(id);
    return reply.status(t.code ?? 200).send(t.code && t.code >= 400 ? t.corps : { statut: 'fini', ...(t.corps as object) });
  });
}
