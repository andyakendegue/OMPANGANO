/**
 * Client de l'API Nkala (VPS), partagé par le web et Expo. Le jeton Firebase est ajouté à chaque appel
 * et rafraîchi une fois sur 401 ; le serveur seul décide des droits.
 * Porté de src/data/api.ts (web) sans dépendance au navigateur : l'adresse est injectée par configurerApi.
 */
let apiUrl = 'http://localhost:3001';
export const configurerApi = (url: string) => { apiUrl = url.replace(/\/+$/, ''); };
export const urlApi = () => apiUrl;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Refus définitif (droits, données invalides) : inutile de rejouer. Réseau, 5xx, 408, 429 : à rejouer. */
export function isPermanentApiError(err: unknown): boolean {
  const s = (err as ApiError)?.status;
  return typeof s === 'number' && s >= 400 && s < 500 && s !== 408 && s !== 429;
}

export type TokenProvider = (forceRefresh: boolean) => Promise<string | null>;
let tokenProvider: TokenProvider = async () => null;
export const setTokenProvider = (fn: TokenProvider) => { tokenProvider = fn; };
export const obtenirJeton = (forceRefresh = false) => tokenProvider(forceRefresh);

/** Délai maximal d'un appel : une connexion coupée en plein envoi ne doit pas laisser l'application suspendue. */
export const DELAI_API_MS = 30000;
export async function fetchAvecDelai(url: string, init: RequestInit, delaiMs = DELAI_API_MS): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), delaiMs);
  try { return await fetch(url, { ...init, signal: c.signal }); }
  catch (err) { throw c.signal.aborted ? new Error('Délai dépassé : réseau trop lent ou coupé') : err; }
  finally { clearTimeout(t); }
}

async function rawFetch(method: string, path: string, body: unknown, token: string | null): Promise<Response> {
  return fetchAvecDelai(`${apiUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    let token = await tokenProvider(false);
    res = await rawFetch(method, path, body, token);
    if (res.status === 401 && token) {
      token = await tokenProvider(true);
      res = await rawFetch(method, path, body, token);
    }
    // Trop de requêtes : attendre le délai du serveur, 3 essais au plus
    for (let essai = 0; res.status === 429 && essai < 3; essai++) {
      const attente = Math.min(Math.max(Number(res.headers.get('retry-after')) || 2, 1), 30);
      await new Promise(r => setTimeout(r, attente * 1000));
      res = await rawFetch(method, path, body, token);
    }
  } catch (err) {
    throw new ApiError(0, (err as Error)?.message || 'Réseau indisponible');
  }
  if (res.status === 204) return undefined as T;
  let json: any = null;
  try { json = await res.json(); } catch { /* corps vide ou non JSON */ }
  if (!res.ok) throw new ApiError(res.status, json?.error || `Erreur ${res.status}`);
  return json as T;
}
