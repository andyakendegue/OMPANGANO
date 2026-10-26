import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        title="Installer l'application OMPAGANO pour un accès rapide et en Mode Avion"
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#e67e22] to-[#d35400] px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Installer l'App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Installer OMPAGANO sur votre iPhone pour un fonctionnement optimal en Mode Avion"
          className="flex items-center gap-1.5 rounded-xl bg-[#2a1d17] border border-[#e67e22]/50 px-2.5 py-1.5 text-xs font-bold text-[#f39c12] hover:bg-[#3a281f] transition"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">App iOS / Hors-ligne</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#1c120c] border border-[#4a3525] p-6 shadow-2xl text-[#fdfaf7] relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-[#2a1d17] text-[#c2a896] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e67e22] to-[#B84A28] flex items-center justify-center mb-4 shadow-lg">
                <Smartphone className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-lg font-extrabold text-white">
                Installer sur iPhone / iPad (Mode Avion)
              </h3>
              <p className="mt-1.5 text-xs text-[#c2a896] leading-relaxed">
                L'application est déjà mise en cache pour le Mode Avion. Pour l'ouvrir directement depuis votre écran d'accueil sans connexion :
              </p>

              <div className="mt-4 space-y-3 bg-[#241811] border border-[#3a2a22] rounded-2xl p-4 text-xs text-[#f5efe6]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#e67e22]/20 text-[#f39c12]">
                    <Share className="w-4 h-4" />
                  </div>
                  <span>
                    1. Appuyez sur le bouton <strong>Partager</strong> dans la barre d'outils de Safari.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#e67e22]/20 text-[#f39c12]">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <span>
                    2. Faites défiler et choisissez <strong>Sur l'écran d'accueil</strong>.
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#e67e22] to-[#d35400] py-2.5 text-xs font-bold text-white shadow-lg"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
