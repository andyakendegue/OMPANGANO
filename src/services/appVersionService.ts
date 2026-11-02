/**
 * App Version & Code Synchronization Service for SPA
 * 
 * Solves stale cache issues in Single Page Applications:
 * 1. Checks remote /version.json periodically, on tab focus, and on network reconnect.
 * 2. Catches Vite dynamic chunk load errors (vite:preloadError) and auto-reloads.
 * 3. Notifies the user with a non-intrusive update prompt when a new build is deployed.
 */

export interface AppVersionInfo {
  version: string;
  buildTime: number;
  builtAt: string;
}

// Initial bundle build time recorded when this JavaScript file was parsed
// (Defaults to current timestamp if not injected at build time)
const LOCAL_CLIENT_START_TIME = Date.now();
const LOCAL_STORAGE_KEY = 'ompagano_app_build_time';
const ATTEMPT_KEY = 'ompangano_maj_tentative';
/** Ni vérification ni tentative de mise à jour plus d'une fois toutes les 5 minutes */
const MIN_GAP_MS = 5 * 60 * 1000;
/** Délai affiché avant la mise à jour automatique */
const COUNTDOWN_S = 20;

/** État affiché par la bannière de mise à jour (voir AppUpdateBanner) */
export type MajEtat =
  | { phase: 'aucune' }
  | { phase: 'annonce'; secondes: number; version?: string }
  | { phase: 'attente'; version?: string }          // décompte terminé, attend la fin d'une action en cours (ex. enregistrement)
  | { phase: 'telechargement'; fait: number; total: number; version?: string }
  | { phase: 'reportee'; dansMin: number; version?: string };

export class AppVersionService {
  private static instance: AppVersionService;
  private currentBuildTime: number = LOCAL_CLIENT_START_TIME;
  private checkIntervalTimer: any = null;
  private listeners: Array<(hasUpdate: boolean, remoteInfo?: AppVersionInfo) => void> = [];
  private isChecking: boolean = false;
  private updateAvailable: boolean = false;
  private latestRemoteInfo?: AppVersionInfo;
  private lastCheckAt = 0;
  private etat: MajEtat = { phase: 'aucune' };
  private etatListeners: Array<(e: MajEtat) => void> = [];
  private busy = new Set<string>();
  private countdownTimer: any = null;
  private applying = false;

  private constructor() {
    // Read cached initial build time or initialize
    try {
      const storedTime = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedTime) {
        this.currentBuildTime = parseInt(storedTime, 10) || LOCAL_CLIENT_START_TIME;
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, String(LOCAL_CLIENT_START_TIME));
      }
    } catch {}

    this.setupChunkErrorRecovery();
    this.setupLifecycleListeners();
  }

  public static getInstance(): AppVersionService {
    if (!AppVersionService.instance) {
      AppVersionService.instance = new AppVersionService();
    }
    return AppVersionService.instance;
  }

  /**
   * Catches Vite ChunkLoadError ("Failed to fetch dynamically imported module")
   * when a new deployment removes older hashed chunks.
   */
  private setupChunkErrorRecovery() {
    if (typeof window === 'undefined') return;

    // Vite-specific event for dynamic import preload failures
    window.addEventListener('vite:preloadError', (event) => {
      console.warn('[VersionService] Chunk préchargé obsolète détecté (vite:preloadError). Actualisation forcée...');
      event.preventDefault();
      this.forceCleanReload();
    });

    // Standard unhandled error listener for chunk loading
    window.addEventListener('error', (event) => {
      const msg = event?.message?.toLowerCase() || '';
      if (
        msg.includes('dynamically imported module') ||
        msg.includes('chunkloaderror') ||
        msg.includes('loading chunk')
      ) {
        console.warn('[VersionService] Module obsolète détecté. Actualisation...');
        this.forceCleanReload();
      }
    });
  }

  /**
   * Listen to tab visibility, window focus, and network reconnection
   */
  private setupLifecycleListeners() {
    if (typeof window === 'undefined') return;

    // When user comes back to the tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdate();
      }
    });

    window.addEventListener('focus', () => {
      this.checkForUpdate();
    });

    // When connection is restored
    window.addEventListener('online', () => {
      this.checkForUpdate();
    });

    // Vérification en arrière-plan toutes les 5 minutes (les retours sur l'onglet sont aussi limités à une par 5 minutes)
    this.checkIntervalTimer = setInterval(() => {
      this.checkForUpdate();
    }, MIN_GAP_MS);

    // Initial check 5 seconds after boot
    setTimeout(() => {
      this.checkForUpdate();
    }, 5000);
  }

  /**
   * Fetches /version.json with cache busting to verify if code on server is newer
   */
  public async checkForUpdate(force = false): Promise<boolean> {
    if (this.isChecking || typeof window === 'undefined') return this.updateAvailable;
    if (!navigator.onLine) return false;
    // Limite : une vérification toutes les 5 minutes (la première, au démarrage, passe toujours)
    if (!force && this.lastCheckAt && Date.now() - this.lastCheckAt < MIN_GAP_MS) return this.updateAvailable;
    this.lastCheckAt = Date.now();

    this.isChecking = true;
    try {
      const url = `/version.json?_t=${Date.now()}`;
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        this.isChecking = false;
        return false;
      }

      const remoteData: AppVersionInfo = await response.json();
      this.latestRemoteInfo = remoteData;

      // Check if remote buildTime is newer than local client start time
      if (remoteData.buildTime && remoteData.buildTime > this.currentBuildTime) {
        console.info(`[VersionService] 🚀 Nouvelle version détectée: ${remoteData.version} (${new Date(remoteData.buildTime).toLocaleTimeString()})`);
        this.updateAvailable = true;
        this.notifyListeners(true, remoteData);
        this.planifier();
        return true;
      }
    } catch (err) {
      console.warn('[VersionService] Vérification version non disponible:', err);
    } finally {
      this.isChecking = false;
    }

    return false;
  }

  /**
   * Subscribe to new version notifications
   */
  public subscribe(callback: (hasUpdate: boolean, remoteInfo?: AppVersionInfo) => void): () => void {
    this.listeners.push(callback);
    // If update already detected, notify immediately
    if (this.updateAvailable) {
      callback(true, this.latestRemoteInfo);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(hasUpdate: boolean, remoteInfo?: AppVersionInfo) {
    this.listeners.forEach(cb => {
      try {
        cb(hasUpdate, remoteInfo);
      } catch (e) {
        console.warn('Listener error in version service:', e);
      }
    });
  }

  /**
   * Force clean reload by updating local build time and triggering Service Worker update when online
   */
  public async forceCleanReload() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // Never wipe caches or reload when the device is in Airplane Mode / offline!
      return;
    }

    // Garde-fou : pas plus de 2 rechargements forcés par minute (sinon boucle si le serveur ne sert plus les fichiers attendus)
    try {
      const now = Date.now();
      const recent: number[] = JSON.parse(sessionStorage.getItem('nkala_forced_reloads') || '[]').filter((t: number) => now - t < 60_000);
      if (recent.length >= 2) {
        console.warn('[VersionService] Rechargements forcés répétés : arrêt pour éviter une boucle.');
        return;
      }
      sessionStorage.setItem('nkala_forced_reloads', JSON.stringify([...recent, now]));
    } catch {}

    try {
      if (this.latestRemoteInfo?.buildTime) {
        localStorage.setItem(LOCAL_STORAGE_KEY, String(this.latestRemoteInfo.buildTime));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }

      // Ask active Service Worker registrations to check for updates without wiping offline precache
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.update().catch(() => {})));
      }
    } catch {}

    // Hard reload
    window.location.reload();
  }

  // ------------------------------------------------------------ mise à jour automatique

  private setEtat(e: MajEtat) {
    this.etat = e;
    this.etatListeners.forEach(cb => { try { cb(e); } catch {} });
  }
  public subscribeEtat(cb: (e: MajEtat) => void): () => void {
    this.etatListeners.push(cb);
    cb(this.etat);
    return () => { this.etatListeners = this.etatListeners.filter(l => l !== cb); };
  }
  /** Une action ne doit pas être coupée (enregistrement vocal, premier chargement) : la mise à jour attend qu'elle se termine */
  public setBusy(cle: string, actif: boolean) {
    if (actif) this.busy.add(cle); else this.busy.delete(cle);
  }

  private derniereTentative(): number {
    try { return Number(localStorage.getItem(ATTEMPT_KEY)) || 0; } catch { return 0; }
  }
  private noterTentative() {
    try { localStorage.setItem(ATTEMPT_KEY, String(Date.now())); } catch {}
  }

  /** Annonce la mise à jour, puis l'applique d'elle-même après un décompte (au plus une tentative toutes les 5 minutes). */
  private planifier() {
    if (this.applying || this.countdownTimer || !this.updateAvailable) return;
    const version = this.latestRemoteInfo?.version;
    const attente = this.derniereTentative() + MIN_GAP_MS - Date.now();
    if (attente > 0) {
      // Dernière tentative récente : l'alerte reste visible, la mise à jour reprendra à l'heure prévue
      this.setEtat({ phase: 'reportee', dansMin: Math.max(1, Math.ceil(attente / 60000)), version });
      this.countdownTimer = setTimeout(() => { this.countdownTimer = null; this.planifier(); }, attente + 500);
      return;
    }
    let reste = COUNTDOWN_S;
    this.setEtat({ phase: 'annonce', secondes: reste, version });
    this.countdownTimer = setInterval(() => {
      reste -= 1;
      if (reste > 0) { this.setEtat({ phase: 'annonce', secondes: reste, version }); return; }
      if (this.busy.size > 0) { this.setEtat({ phase: 'attente', version }); return; } // retente chaque seconde
      this.arreterMinuteur();
      void this.appliquer();
    }, 1000);
  }
  private arreterMinuteur() {
    if (this.countdownTimer) { clearInterval(this.countdownTimer); clearTimeout(this.countdownTimer); this.countdownTimer = null; }
  }

  /** « Plus tard » : l'alerte reste affichée, la mise à jour est repoussée de 5 minutes */
  public reporter() {
    if (this.applying) return;
    this.arreterMinuteur();
    this.noterTentative();
    this.planifier();
  }
  public appliquerMaintenant() {
    if (this.applying) return;
    this.arreterMinuteur();
    void this.appliquer();
  }

  /**
   * Télécharge la nouvelle version en arrière-plan (sans rien bloquer), puis recharge. Si le réseau coupe en route, la fenêtre
   * disparaît, l'application continue de fonctionner telle quelle et la mise à jour reprendra 5 minutes plus tard.
   */
  private async appliquer() {
    if (this.applying) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) { this.setEtat({ phase: 'aucune' }); this.noterTentative(); this.planifier(); return; }
    this.applying = true;
    this.noterTentative();
    const version = this.latestRemoteInfo?.version;
    try {
      const ctl = new AbortController();
      const stop = setTimeout(() => ctl.abort(), 120_000);
      try {
        const html = await (await fetch(`/index.html?_t=${Date.now()}`, { cache: 'no-store', signal: ctl.signal })).text();
        const urls = Array.from(new Set(Array.from(html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g), m => m[1])));
        let fait = 0;
        this.setEtat({ phase: 'telechargement', fait, total: urls.length, version });
        for (const u of urls) {
          const r = await fetch(u, { signal: ctl.signal });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          await r.arrayBuffer();
          this.setEtat({ phase: 'telechargement', fait: ++fait, total: urls.length, version });
        }
      } finally { clearTimeout(stop); }
      if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('hors ligne');
      await this.forceCleanReload();
      // Rechargement refusé par le garde-fou : on reprend plus tard
      this.setEtat({ phase: 'aucune' });
    } catch (err) {
      console.warn('[VersionService] Mise à jour interrompue, nouvelle tentative dans 5 minutes :', err);
      this.setEtat({ phase: 'aucune' });
    } finally {
      this.applying = false;
      // Si la mise à jour est toujours nécessaire, l'alerte reviendra à l'heure prévue
      setTimeout(() => this.planifier(), 0);
    }
  }

  public getUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  public getLatestRemoteInfo(): AppVersionInfo | undefined {
    return this.latestRemoteInfo;
  }
}

export const appVersionService = AppVersionService.getInstance();
