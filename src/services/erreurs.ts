/**
 * Signalement des erreurs du navigateur au serveur (qui prévient le propriétaire par e-mail). Bornes : 6 signalements par
 * session, jamais deux fois la même erreur ; aucun contenu saisi par l'utilisateur n'est envoyé. Échecs silencieux.
 */
import { API_URL } from '../data/api';

let envoyes = 0;
const deja = new Set<string>();
let contexte: () => Record<string, string | number | boolean> = () => ({});
let utilisateur: string | null = null;

export function definirContexteErreurs(fn: () => Record<string, string | number | boolean>, uid: string | null) {
  contexte = fn;
  utilisateur = uid;
}

/** Bruit sans intérêt : extensions du navigateur, coupures réseau, mise à jour de l'application en cours */
function ignorer(message: string, fichier?: string): boolean {
  if (/ResizeObserver loop|Script error\.?$|Non-Error promise rejection|dynamically imported module|ChunkLoadError|Loading chunk|vite:preloadError/i.test(message)) return true;
  if (/Failed to fetch|NetworkError|Load failed|network request failed|AbortError/i.test(message) && typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (fichier && /^(chrome|moz|safari)-extension:|^about:/.test(fichier)) return true;
  return false;
}

export function signalerErreur(message: string, stack?: string, ctx: Record<string, string | number | boolean> = {}) {
  try {
    if (!message || envoyes >= 6 || ignorer(message)) return;
    const cle = message.slice(0, 120);
    if (deja.has(cle)) return;
    deja.add(cle);
    envoyes++;
    const corps = JSON.stringify({
      message: message.slice(0, 500), stack: (stack || '').slice(0, 3000), url: location.href.split('?')[0], uid: utilisateur,
      ctx: { online: navigator.onLine, ...contexte(), ...ctx }
    });
    void fetch(`${API_URL}/pub/erreur`, { method: 'POST', body: corps, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).catch(() => {});
  } catch {}
}

export function installerSignalementErreurs() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', e => {
    if (ignorer(e.message || '', e.filename)) return;
    signalerErreur(e.message || 'erreur inconnue', e.error?.stack);
  });
  window.addEventListener('unhandledrejection', e => {
    const r: any = e.reason;
    signalerErreur(`promesse rejetée : ${r?.message || String(r)}`.slice(0, 500), r?.stack);
  });
}
