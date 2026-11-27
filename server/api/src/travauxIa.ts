/**
 * Réponses différées de l'assistant (14 nov. 2026) : le modèle et les embeddings tournent en serverless (RunPod) ; au réveil d'un worker,
 * une réponse peut prendre plusieurs minutes, bien plus que le délai d'une requête du téléphone (30 s) ou d'un réseau mobile.
 * L'envoi (avec `asynchrone: true`) répond aussitôt 202 et un numéro de travail ; l'application relève GET /v1/ia/travaux/:id
 * jusqu'à la réponse, en faisant patienter l'utilisateur. Les travaux vivent en mémoire de l'API (un redémarrage les perd :
 * le téléphone reçoit 404 et propose de renvoyer le message).
 *
 * 26 nov. 2026 : la réponse se relit autant de fois qu'il faut pendant une heure (une relève perdue sur le réseau, ou rejouée
 * par le téléphone, donnait 404 « renvoie ton message ») ; un travail trop long est clos après 12 minutes et son appel au
 * modèle annulé (il bloquait jusqu'à 27 minutes l'une des deux places du compte) ; l'étape en cours est donnée à chaque relève.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Ctx } from './ctx.ts';
import { noterBilan } from './diagnosticIa.ts';

/** Au-delà, un travail est clos (504) et son appel au modèle annulé (le relais attend lui-même au plus 10 minutes). IA_DUREE_MAX_TRAVAIL_S pour l'ajuster. */
const dureeMaxTravailMs = () => Math.max(1, Number(process.env.IA_DUREE_MAX_TRAVAIL_S) || 720) * 1000;
const GARDE_APRES_FIN_MS = 60 * 60_000;
const EN_COURS_MAX_PAR_COMPTE = 2;

interface Travail { uid: string; route: string; debut: number; fin?: number; code?: number; corps?: unknown; etapes: { nom: string; a: number }[]; ctrl: AbortController }
const travaux = new Map<string, Travail>();
const courant = new AsyncLocalStorage<Travail>();
const nettoyage = setInterval(() => {
  const t = Date.now();
  for (const [id, x] of travaux) if (x.fin && t - x.fin > GARDE_APRES_FIN_MS) travaux.delete(id);
}, 60_000);
nettoyage.unref?.();

/** Signal d'annulation du travail en cours (undefined hors travail différé). */
export const signalTravail = (): AbortSignal | undefined => courant.getStore()?.ctrl.signal;
/** Note l'étape atteinte par le travail en cours (corpus, modèle, outil…) : visible à la relève et dans la console. */
export function noterEtape(nom: string) {
  const t = courant.getStore();
  if (t && !t.fin) t.etapes.push({ nom, a: Date.now() - t.debut });
}

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
export function lancerTravail(uid: string, fn: (reply: FastifyReply) => Promise<unknown>, journal?: (e: unknown) => void, route = ''): string | null {
  const enCours = [...travaux.values()].filter(x => x.uid === uid && !x.fin).length;
  if (enCours >= EN_COURS_MAX_PAR_COMPTE) return null;
  const id = 'tr_' + randomBytes(9).toString('hex');
  const t: Travail = { uid, route, debut: Date.now(), etapes: [], ctrl: new AbortController() };
  travaux.set(id, t);
  const terminer = (code: number, corps: unknown, detail?: string) => {
    if (t.fin) return;
    t.fin = Date.now(); t.code = code; t.corps = corps;
    const erreur = detail ?? (code >= 400 ? String((corps as { error?: unknown })?.error ?? '') : undefined);
    noterBilan({ id, uid: uid.slice(0, 8), route, debut: t.debut, ms: t.fin - t.debut, code, etapes: t.etapes, ...(erreur ? { erreur: erreur.slice(0, 300) } : {}) });
    if (detail !== undefined) journal?.(detail);
  };
  const minuteur = setTimeout(() => {
    terminer(504, { error: 'Kak\'Igonjo n\'a pas pu répondre à temps. Renvoie ton message.' });
    t.ctrl.abort(new Error('délai du travail dépassé'));
  }, dureeMaxTravailMs());
  minuteur.unref?.();
  void courant.run(t, () => capter(fn)).then(r => {
    clearTimeout(minuteur);
    const { detail, ...visible } = (r.corps ?? {}) as { detail?: string };
    terminer(r.code, detail === undefined ? r.corps : visible, detail);
  });
  return id;
}

/**
 * Enveloppe d'une route : si le corps demande `asynchrone: true`, la route s'exécute en arrière-plan et répond 202 tout de suite.
 * `verifier` fait les contrôles rapides (compte, saisie) avant de répondre 202, pour que les erreurs simples restent immédiates.
 */
export type Acteur = Awaited<ReturnType<Ctx['acteur']>>;
/** Refus prêt à envoyer (statut et corps), renvoyé par `verifier` pour répondre tout de suite sans lancer le travail. */
export interface RefusImmediat { code: number; corps: unknown }

export function differable(app: Ctx['app'], acteur: Ctx['acteur'], route: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>,
  verifier?: (req: FastifyRequest, a: Acteur) => void | RefusImmediat | Promise<void | RefusImmediat>) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if ((req.body as any)?.asynchrone !== true) return route(req, reply);
    const a = await acteur(req);
    const refus = await verifier?.(req, a);
    if (refus) return reply.status(refus.code).send(refus.corps);
    const id = lancerTravail(a.auth.uid, rep => route(req, rep), e => req.log.error({ err: e }, 'travail IA'), req.routeOptions?.url ?? req.url);
    if (!id) return reply.status(429).send({ error: 'Kak\'Igonjo prépare déjà tes réponses : attends qu\'elles arrivent.' });
    return reply.status(202).send({ travail: id, attente: true });
  };
}

export function registerTravauxIa({ app, acteur, fail }: Ctx) {
  /** Relevé d'un travail : 200 { statut: 'en_cours', depuis, etape } tant qu'il tourne ; puis le code et le corps de la réponse de la route. */
  app.get('/v1/ia/travaux/:id', async (req, reply) => {
    const a = await acteur(req);
    const id = String((req.params as any).id || '');
    const t = /^tr_[0-9a-f]{18}$/.test(id) ? travaux.get(id) : undefined;
    if (!t || t.uid !== a.auth.uid) return fail(404, 'Réponse introuvable : renvoie ton message.');
    if (!t.fin) return { statut: 'en_cours', depuis: Math.round((Date.now() - t.debut) / 1000), etape: t.etapes.at(-1)?.nom ?? 'départ' };
    return reply.status(t.code ?? 200).send(t.code && t.code >= 400 ? t.corps : { statut: 'fini', ...(t.corps as object) });
  });
}
