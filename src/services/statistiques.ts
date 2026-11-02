/**
 * Statistiques de fréquentation : visite, onglets consultés, appareil, temps actif. L'IP et le pays sont déterminés
 * par le serveur. Aucun contenu saisi n'est envoyé. Les échecs sont silencieux : la collecte ne gêne jamais l'application.
 */
import { API_URL } from '../data/api';

/** Identifiant du navigateur (visiteurs uniques). Seule donnée conservée après une déconnexion. */
export const VISITOR_KEY = 'ompangano_vid';
const aleatoire = () => {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
};

function lire(stock: Storage | undefined, cle: string): string {
  try {
    let v = stock?.getItem(cle) || '';
    if (!v) { v = aleatoire(); stock?.setItem(cle, v); }
    return v;
  } catch { return aleatoire(); }
}

export function detecterAppareil() {
  const ua = navigator.userAgent || '';
  const tablette = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const mobile = !tablette && /Mobi|iPhone|iPod|Android/i.test(ua);
  const os = /Windows/i.test(ua) ? 'Windows' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
    : /Mac OS X|Macintosh/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Autre';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Autre';
  return {
    type: tablette ? 'tablette' : mobile ? 'mobile' : 'ordinateur',
    os, browser,
    screen: `${screen.width}x${screen.height}`,
    lang: navigator.language || ''
  };
}

let demarre = false;
let sid = '';
let vid = '';
let uid: string | null = null;
let actifS = 0;          // secondes passées avec l'onglet visible
let depuis = 0;          // début de la période visible en cours (ms), 0 si masqué
let dernierEnvoi = 0;

const dureeActive = () => Math.round(actifS + (depuis ? (Date.now() - depuis) / 1000 : 0));

function envoyer(ev: 'start' | 'tab' | 'ping' | 'end', extra: Record<string, unknown> = {}) {
  if (!demarre) return;
  dernierEnvoi = Date.now();
  const corps = JSON.stringify({ sid, vid, uid, ev, dur: dureeActive(), device: detecterAppareil(), ref: document.referrer ? new URL(document.referrer).origin : '', ...extra });
  try {
    // text/plain : pas de pré-requête CORS, et sendBeacon survit à la fermeture de la page
    if (ev === 'end' && navigator.sendBeacon) { navigator.sendBeacon(`${API_URL}/pub/collect`, new Blob([corps], { type: 'text/plain' })); return; }
    void fetch(`${API_URL}/pub/collect`, { method: 'POST', body: corps, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).catch(() => {});
  } catch {}
}

export function demarrerStatistiques() {
  if (demarre || typeof window === 'undefined') return;
  try { sid = lire(typeof sessionStorage !== 'undefined' ? sessionStorage : undefined, 'ompangano_sid'); vid = lire(localStorage, VISITOR_KEY); } catch { return; }
  demarre = true;
  if (document.visibilityState === 'visible') depuis = Date.now();
  envoyer('start');
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (depuis) { actifS += (Date.now() - depuis) / 1000; depuis = 0; }
      envoyer('end');
    } else if (!depuis) depuis = Date.now();
  });
  window.addEventListener('pagehide', () => envoyer('end'));
  // Signal de vie toutes les 30 s tant que la page est visible (durée de session fiable même sans fermeture propre)
  setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - dernierEnvoi > 25_000) envoyer('ping'); }, 30_000);
}

export function definirUtilisateurStatistiques(id: string | null) { uid = id; }
export function onglet(tab: string) { envoyer('tab', { tab }); }
