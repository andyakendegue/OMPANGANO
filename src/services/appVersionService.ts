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

export class AppVersionService {
  private static instance: AppVersionService;
  private currentBuildTime: number = LOCAL_CLIENT_START_TIME;
  private checkIntervalTimer: any = null;
  private listeners: Array<(hasUpdate: boolean, remoteInfo?: AppVersionInfo) => void> = [];
  private isChecking: boolean = false;
  private updateAvailable: boolean = false;
  private latestRemoteInfo?: AppVersionInfo;

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

    // Background interval check every 3 minutes
    this.checkIntervalTimer = setInterval(() => {
      this.checkForUpdate();
    }, 3 * 60 * 1000);

    // Initial check 5 seconds after boot
    setTimeout(() => {
      this.checkForUpdate();
    }, 5000);
  }

  /**
   * Fetches /version.json with cache busting to verify if code on server is newer
   */
  public async checkForUpdate(): Promise<boolean> {
    if (this.isChecking || typeof window === 'undefined') return this.updateAvailable;
    if (!navigator.onLine) return false;

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
   * Force clean reload by clearing cache and updating local build time
   */
  public async forceCleanReload() {
    try {
      if (this.latestRemoteInfo?.buildTime) {
        localStorage.setItem(LOCAL_STORAGE_KEY, String(this.latestRemoteInfo.buildTime));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }

      // Clear Service Worker CacheStorage if any
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
    } catch {}

    // Hard reload
    window.location.reload();
  }

  public getUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  public getLatestRemoteInfo(): AppVersionInfo | undefined {
    return this.latestRemoteInfo;
  }
}

export const appVersionService = AppVersionService.getInstance();
