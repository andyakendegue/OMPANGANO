import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  Bell, 
  User, 
  LogOut, 
  Sparkles, 
  RefreshCw, 
  DownloadCloud,
  Globe2,
  HardDrive,
  CheckCircle2,
  Compass,
  HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { useOfflineShellStatus } from '../services/pwaOfflineManager';
import { MYENE } from '../services/myeneLexique';
import { subscribeSyncProgress, type SyncProgress } from '../firebase';

interface NavbarProps {
  currentUser: UserProfile | null;
  isOnline: boolean;
  pendingOfflineCount: number;
  unreadNotificationsCount: number;
  onOpenAuth: () => void;
  onOpenNotifications: () => void;
  onOpenOfflinePack: () => void;
  onOpenVisualGuide?: () => void;
  onOpenFaq?: () => void;
  onSyncOffline: () => void;
  onSignOut: () => void;
  currentTab: string;
  onSelectTab: (tab: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  isOnline,
  pendingOfflineCount,
  unreadNotificationsCount,
  onOpenAuth,
  onOpenNotifications,
  onOpenOfflinePack,
  onOpenVisualGuide,
  onOpenFaq,
  onSyncOffline,
  onSignOut,
  currentTab,
  onSelectTab
}) => {
  const offlineShell = useOfflineShellStatus();
  const [sync, setSync] = React.useState<SyncProgress>({ kind: null, done: 0, total: 0 });
  React.useEffect(() => subscribeSyncProgress(setSync), []);

  return (
    <header className="sticky top-0 z-40 bg-[#170d08]/95 backdrop-blur-md border-b border-[#3d1f11] px-3.5 py-3 sm:px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div 
          onClick={() => onSelectTab('crowdsource')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-[#c85a32] via-[#f59e0b] to-[#0d9488] shadow-md transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-white rounded-[14px] overflow-hidden flex items-center justify-center p-0.5 shadow-inner">
              <img 
                src="/assets/aistudio/LOGO-symbole_1c65e221.png" 
                alt="Logo OMPANGANO" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base sm:text-lg tracking-wider text-white">
                OMPANGANO
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#c85a32] text-white">
                ESSAKA
              </span>
            </div>
            <p className="text-[10px] text-[#f59e0b] font-medium hidden sm:block">
              Le Programme Éducatif & Crowdsourcing Myènè
            </p>
          </div>
        </div>

        {/* Action Controls & User Info */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* PWA Install Button (Android/Desktop & iOS Safari Guide) */}
          <PWAInstallButton />

          {/* Visual Guide & Objectives Button */}
          {onOpenVisualGuide && (
            <button
              type="button"
              onClick={onOpenVisualGuide}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#27150c] hover:bg-[#381e11] text-[#fde047] border border-[#f59e0b]/40 text-xs font-semibold active:scale-95 transition-all"
              title="Voir le guide visuel d'utilisation et les objectifs de l'application"
            >
              <Compass className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span className="hidden lg:inline">Guide & Objectifs</span>
            </button>
          )}

          {/* FAQ (ouverte en fenêtre modale) */}
          {onOpenFaq && (
            <button
              type="button"
              onClick={onOpenFaq}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#27150c] hover:bg-[#381e11] text-[#fed7aa] border border-[#4a2412] text-xs font-semibold active:scale-95 transition-all"
              title="Foire aux questions"
              aria-label="Ouvrir la FAQ"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span className="hidden md:inline">FAQ</span>
            </button>
          )}

          {/* Offline Pack Button */}
          <button
            onClick={onOpenOfflinePack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#27150c] hover:bg-[#381e11] text-[#fed7aa] border border-[#4a2412] text-xs font-semibold active:scale-95 transition-all"
            title={offlineShell.isReady ? "Application prête pour le Mode Avion" : "Gérer le pack hors-ligne"}
          >
            {offlineShell.isReady ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
            ) : (
              <DownloadCloud className="w-3.5 h-3.5 text-[#f59e0b]" />
            )}
            <span className="hidden md:inline">
              {offlineShell.isReady ? 'Mode Avion Prêt' : 'Mode Hors-ligne'}
            </span>
          </button>

          {/* Online / Offline status */}
          <div className="flex items-center">
            {isOnline ? (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-medium bg-[#14532d]/40 text-[#86efac] border border-[#22c55e]/30">
                <Wifi className="w-3 h-3 text-[#22c55e]" />
                <span className="hidden lg:inline">En ligne</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium bg-[#7f1d1d]/40 text-[#fca5a5] border border-[#ef4444]/30 animate-pulse">
                <WifiOff className="w-3 h-3 text-[#ef4444]" />
                <span>Mode Avion</span>
              </span>
            )}
          </div>

          {/* Progression de la synchronisation en cours */}
          {sync.kind && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#0f3d3a] text-[#99f6e4] border border-[#14b8a6]/40"
              role="status"
              aria-live="polite"
              title={sync.kind === 'upload' ? 'Envoi de vos modifications en cours' : 'Téléchargement des données en cours'}
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>
                {sync.kind === 'upload'
                  ? `${Math.max(sync.total - sync.done, 0)} restant${sync.total - sync.done > 1 ? 's' : ''}`
                  : `Téléchargement ${sync.done.toLocaleString('fr-FR')} / ${sync.total.toLocaleString('fr-FR')}`}
              </span>
            </div>
          )}

          {/* Offline Pending Sync Button */}
          {pendingOfflineCount > 0 && !sync.kind && (
            <button
              onClick={onSyncOffline}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#b45309] text-[#fff7ed] shadow active:scale-95 transition-transform animate-pulse"
              title="Synchroniser les contributions sauvegardées hors-ligne"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{pendingOfflineCount} sync</span>
            </button>
          )}

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-[#27150c] hover:bg-[#381e11] text-[#fed7aa] border border-[#4a2412] transition-colors"
            aria-label="Centre de notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#dc2626] text-white text-[10px] font-bold flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* User Profile Pill or Login Button */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 pl-1">
              <div 
                onClick={() => onSelectTab('profile')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#27150c] border border-[#d97706]/30 cursor-pointer hover:bg-[#341b10] transition-colors"
              >
                <div className="w-6 h-6 rounded-lg terracotta-gradient flex items-center justify-center text-xs font-bold text-white shadow">
                  {(currentUser.fullName || currentUser.displayName).charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-white leading-tight truncate max-w-[100px]">
                    {(currentUser.fullName || currentUser.displayName).split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-[#f59e0b] font-mono leading-none">
                    {currentUser.tribe || 'Myènè'} • {currentUser.xp} XP
                  </div>
                </div>
              </div>

              <button
                onClick={onSignOut}
                className="p-2 rounded-xl bg-[#27150c] hover:bg-[#7f1d1d] text-[#a8826d] hover:text-[#fca5a5] border border-[#4a2412] transition-colors"
                title={`${MYENE.KA_MENE.mot} (Déconnexion)`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl terracotta-gradient text-white text-xs font-bold shadow-md active:scale-95 transition-transform"
            >
              <User className="w-3.5 h-3.5" />
              <span>Connexion</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
