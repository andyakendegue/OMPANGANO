/**
 * Client de l'API OMPANGANO (VPS). Le jeton Firebase Auth est ajouté à chaque appel
 * et rafraîchi une fois en cas de 401. Le navigateur ne décide jamais des droits : le serveur tranche.
 */
const RAW_URL = (import.meta as any).env?.VITE_API_URL as string | undefined;
export const API_URL = (RAW_URL || 'http://localhost:3001').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Refus définitif (droits, données invalides) : inutile de rejouer. Réseau, 5xx, 429 : à rejouer. */
export function isPermanentApiError(err: unknown): boolean {
  const s = (err as ApiError)?.status;
  return typeof s === 'number' && s >= 400 && s < 500 && s !== 408 && s !== 429;
}

type TokenProvider = (forceRefresh: boolean) => Promise<string | null>;
let tokenProvider: TokenProvider = async () => null;
export function setTokenProvider(fn: TokenProvider) {
  tokenProvider = fn;
}

async function rawFetch(method: string, path: string, body: unknown, token: string | null, signal?: AbortSignal): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method,
    signal,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
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
  } catch (err) {
    throw new ApiError(0, (err as Error)?.message || 'Réseau indisponible');
  }
  if (res.status === 204) return undefined as T;
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* corps vide ou non JSON */
  }
  if (!res.ok) throw new ApiError(res.status, json?.error || `Erreur ${res.status}`);
  return json as T;
}

// ------------------------------------------------------------------ médias

const mediaCache = new Map<string, { url: string; until: number }>();

/** « media:recordings/uid/x.webm » ou chemin brut -> URL présignée de lecture. Les autres URL restent telles quelles. */
export async function resolveMediaUrl(urlOrPath: string): Promise<string> {
  if (!urlOrPath) return urlOrPath;
  const path = urlOrPath.startsWith('media:') ? urlOrPath.slice(6) : /^(recordings|images)\//.test(urlOrPath) ? urlOrPath : '';
  if (!path) return urlOrPath;
  const hit = mediaCache.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const { url, expiresIn } = await api<{ url: string; expiresIn: number }>('GET', `/v1/media/url?path=${encodeURIComponent(path)}`);
  mediaCache.set(path, { url, until: Date.now() + Math.max(60, expiresIn - 300) * 1000 });
  return url;
}

/** Envoi direct vers le stockage via une URL présignée. Renvoie false en cas d'échec. */
export async function uploadMedia(path: string, blob: Blob, contentType: string): Promise<boolean> {
  try {
    const { uploadUrl, headers } = await api<{ uploadUrl: string; headers: Record<string, string> }>('POST', '/v1/media/upload-url', {
      path, contentType, size: blob.size
    });
    const res = await fetch(uploadUrl, { method: 'PUT', headers, body: blob });
    return res.ok;
  } catch (err) {
    console.warn("Envoi du fichier impossible :", err);
    return false;
  }
}

// ------------------------------------------------------------------ signal de modification (SSE)

/** Écoute /v1/events (fetch en flux : EventSource ne sait pas envoyer l'en-tête Authorization). Reconnexion automatique. */
export function subscribeToEvents(onChange: (collection: string) => void): () => void {
  let stopped = false;
  let controller: AbortController | null = null;

  const run = async () => {
    let delay = 2000;
    while (!stopped) {
      try {
        controller = new AbortController();
        const token = await tokenProvider(false);
        if (!token) { await new Promise(r => setTimeout(r, 5000)); continue; }
        const res = await rawFetch('GET', '/v1/events', undefined, token, controller.signal);
        if (!res.ok || !res.body) throw new Error(`events ${res.status}`);
        delay = 2000;
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const data = block.split('\n').find(l => l.startsWith('data:'));
            if (!data) continue;
            try { onChange(JSON.parse(data.slice(5)).collection); } catch { /* ligne mal formée */ }
          }
        }
      } catch {
        if (stopped) return;
      }
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, 60_000);
    }
  };
  run();
  return () => {
    stopped = true;
    controller?.abort();
  };
}
