/**
 * Dissuasion contre la copie du site. Ces mesures gênent la copie courante (clic droit, sélection, impression,
 * enregistrement de la page, ouverture de l'inspecteur, hébergement du code sur un autre domaine) mais ne peuvent pas
 * l'empêcher : tout navigateur reçoit le code de l'application. La vraie protection est côté serveur : le corpus n'est servi
 * qu'aux comptes connectés, avec limites de téléchargement, et il n'est gardé sur l'appareil que chiffré.
 * Désactivée en développement local et pour les administrateurs.
 */
const HOTES_AUTORISES = /(^|\.)(web\.app|firebaseapp\.com|essaka\.engineering)$/i;
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const SITE_OFFICIEL = 'https://ompangano.web.app';

let exempte = false;
let installee = false;
let voile: HTMLDivElement | null = null;

const estChamp = (cible: EventTarget | null) => {
  const el = cible as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

/** Les administrateurs gardent l'inspecteur, la copie et l'export */
export function definirExemptionProtection(admin: boolean) {
  exempte = admin;
  if (admin && voile) { voile.remove(); voile = null; }
  document.documentElement.classList.toggle('copie-libre', admin);
}

function verrouDomaine(): boolean {
  const h = location.hostname;
  if (LOCAL.test(h) || HOTES_AUTORISES.test(h)) return true;
  document.documentElement.innerHTML = '<body style="font-family:sans-serif;padding:2rem;background:#180d07;color:#fed7aa">Cette copie n\'est pas autorisée. Utilisez le site officiel : <a style="color:#f59e0b" href="' + SITE_OFFICIEL + '">' + SITE_OFFICIEL + '</a></body>';
  try { location.replace(SITE_OFFICIEL); } catch {}
  return false;
}

function inspecteurOuvert(): boolean {
  // Avec l'inspecteur ouvert, l'instruction « debugger » met l'exécution en pause : la durée le trahit
  const t0 = performance.now();
  try { new Function('debugger')(); } catch {}
  return performance.now() - t0 > 150;
}

function afficherVoile(actif: boolean) {
  if (actif && !voile) {
    voile = document.createElement('div');
    voile.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;background:#180d07;color:#fed7aa;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem;font-family:sans-serif');
    voile.textContent = 'Outils de développement détectés. Fermez-les pour continuer à utiliser Nkala.';
    document.body.appendChild(voile);
  } else if (!actif && voile) { voile.remove(); voile = null; }
}

export function installerProtectionCopie() {
  if (installee || typeof window === 'undefined') return;
  if (LOCAL.test(location.hostname)) return; // développement local : rien n'est bloqué
  installee = true;
  if (!verrouDomaine()) return;

  // Pas d'affichage dans un cadre d'un autre site
  try { if (window.top && window.top !== window.self) window.top.location.href = location.href; } catch {}

  const style = document.createElement('style');
  style.textContent = `
    html:not(.copie-libre) body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    html:not(.copie-libre) input, html:not(.copie-libre) textarea, html:not(.copie-libre) [contenteditable="true"] { -webkit-user-select: text; user-select: text; }
    html:not(.copie-libre) img { -webkit-user-drag: none; }
    @media print { html:not(.copie-libre) body { display: none !important; } }`;
  document.head.appendChild(style);

  const bloquer = (e: Event) => { if (!exempte && !estChamp(e.target)) e.preventDefault(); };
  for (const type of ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart']) document.addEventListener(type, bloquer, true);
  window.addEventListener('beforeprint', e => { if (!exempte) e.preventDefault?.(); });

  document.addEventListener('keydown', e => {
    if (exempte) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    const interdit =
      e.key === 'F12' ||
      (ctrl && ['u', 's', 'p'].includes(k)) ||                       // code source, enregistrer, imprimer
      (ctrl && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) ||     // inspecteur, console, sélecteur
      (e.metaKey && e.altKey && ['i', 'j', 'u', 'c'].includes(k));    // équivalents macOS
    if (interdit) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // Inspecteur ouvert : l'écran est masqué (ordinateur seulement ; un téléphone n'en a pas)
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  if (!mobile) {
    setInterval(() => { if (!exempte && document.visibilityState === 'visible') afficherVoile(inspecteurOuvert()); }, 3000);
  }
}
