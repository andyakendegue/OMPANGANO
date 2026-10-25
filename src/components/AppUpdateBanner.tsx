import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { appVersionService, AppVersionInfo } from '../services/appVersionService';

export const AppUpdateBanner: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | undefined>(undefined);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const unsubscribe = appVersionService.subscribe((available, info) => {
      setHasUpdate(available);
      if (info) setUpdateInfo(info);
    });

    return () => unsubscribe();
  }, []);

  if (!hasUpdate || isDismissed) return null;

  const handleApplyUpdate = async () => {
    setIsReloading(true);
    await appVersionService.forceCleanReload();
  };

  return (
    <div className="bg-gradient-to-r from-[#b4431e] via-[#c85a32] to-[#d97706] text-white px-3.5 py-2.5 sm:px-6 shadow-xl border-b border-[#fed7aa]/20 sticky top-0 z-50 animate-in slide-in-from-top duration-300">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-4 h-4 text-[#fed7aa] animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div className="text-xs sm:text-sm font-medium leading-tight truncate">
            <span className="font-bold">Mise à jour disponible ⚡</span>
            <span className="hidden sm:inline text-white/90 ml-1.5">
              Une nouvelle version du code d'OMPAGANO est en ligne ({updateInfo?.version || '1.0'}).
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleApplyUpdate}
            disabled={isReloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#b4431e] hover:bg-[#fff7ed] text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
            <span>{isReloading ? 'Actualisation...' : 'Actualiser'}</span>
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-black/10 transition-colors"
            title="Ignorer pour l'instant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
