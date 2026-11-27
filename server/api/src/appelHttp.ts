/**
 * POST JSON sans le délai caché de `fetch` : Node coupe toute réponse dont les en-têtes tardent plus de 300 s (undici, headersTimeout).
 * Le relais du modèle ne répond qu'à la fin du travail RunPod (réveil d'un worker compris) : seul `signal` décide ici de l'abandon.
 */
import http from 'node:http';
import https from 'node:https';

export interface ReponseHttp { status: number; entetes: http.IncomingHttpHeaders; texte: string }

export function posterJson(url: string, corps: unknown, o: { entetes?: Record<string, string>; signal?: AbortSignal } = {}): Promise<ReponseHttp> {
  const u = new URL(url);
  const donnees = Buffer.from(JSON.stringify(corps));
  const mod = u.protocol === 'https:' ? https : http;
  return new Promise((resoudre, rejeter) => {
    const req = mod.request(u, {
      method: 'POST', signal: o.signal,
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(donnees.length), ...o.entetes },
    }, res => {
      const morceaux: Buffer[] = [];
      res.on('data', (m: Buffer) => morceaux.push(m));
      res.on('end', () => resoudre({ status: res.statusCode ?? 0, entetes: res.headers, texte: Buffer.concat(morceaux).toString('utf8') }));
      res.on('error', rejeter);
    });
    req.on('error', rejeter);
    req.end(donnees);
  });
}

/** Connexion jamais établie (relais en redémarrage) : la demande n'est pas partie, la renvoyer ne crée pas de travail en double. */
export const erreurConnexion = (e: unknown) => ['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'EAI_AGAIN'].includes((e as { code?: string })?.code ?? '');
