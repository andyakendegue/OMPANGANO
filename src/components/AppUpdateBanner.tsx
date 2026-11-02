import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { appVersionService, type MajEtat } from '../services/appVersionService';

/**
 * Mise à jour automatique : une alerte toujours visible prévient que l'application va se mettre à jour toute seule
 * (et que l'écran se coupera quelques secondes). Le téléchargement se fait en arrière-plan, sans rien bloquer :
 * en cas de coupure réseau, la fenêtre disparaît et la mise à jour reprend 5 minutes plus tard.
 */
export const AppUpdateBanner: React.FC = () => {
  const [etat, setEtat] = useState<MajEtat>({ phase: 'aucune' });
  useEffect(() => appVersionService.subscribeEtat(setEtat), []);

  if (etat.phase === 'aucune') return null;

  if (etat.phase === 'telechargement') {
    const pct = etat.total > 0 ? Math.round((etat.fait / etat.total) * 100) : 0;
    return (
      // Carte en bas de l'écran : n'empêche aucun clic sur l'application
      <div className="fixed bottom-20 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:w-80 z-[60] pointer-events-none" role="status" aria-live="polite">
        <div className="pointer-events-auto rounded-2xl bg-[#27150c] border border-[#f59e0b]/50 shadow-2xl p-3.5 text-white space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold">
            <RefreshCw className="w-4 h-4 text-[#f59e0b] animate-spin" />
            <span>Mise à jour en cours…</span>
          </div>
          <div className="h-2 rounded-full bg-[#180d07] overflow-hidden">
            <div className="h-2 rounded-full bg-gradient-to-r from-[#c85a32] to-[#f59e0b] transition-all duration-300" style={{ width: `${Math.max(pct, 6)}%` }} />
          </div>
          <p className="text-[11px] text-[#d4af94] leading-snug">
            Vous pouvez continuer à utiliser l'application. L'écran se rechargera à la fin ; si la connexion est coupée, la mise à jour reprendra plus tard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#b4431e] via-[#c85a32] to-[#d97706] text-white px-3.5 py-2.5 sm:px-6 shadow-xl border-b border-[#fed7aa]/20 sticky top-0 z-50" role="status" aria-live="polite">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-4 h-4 text-[#fed7aa]" />
          </div>
          <div className="text-xs sm:text-sm leading-snug">
            <span className="font-bold">Mise à jour disponible ⚡</span>
            <span className="block text-white/90">
              {etat.phase === 'annonce' && <>Votre application va se mettre à jour automatiquement dans <strong>{etat.secondes} s</strong> : l'écran va se couper quelques secondes.</>}
              {etat.phase === 'attente' && <>La mise à jour démarrera dès que votre action en cours sera terminée (l'écran se coupera quelques secondes).</>}
              {etat.phase === 'reportee' && <>Mise à jour automatique prévue dans environ <strong>{etat.dansMin} min</strong> : l'écran se coupera quelques secondes.</>}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            onClick={() => appVersionService.appliquerMaintenant()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#b4431e] hover:bg-[#fff7ed] text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Mettre à jour maintenant</span>
          </button>
          {etat.phase === 'annonce' && (
            <button
              onClick={() => appVersionService.reporter()}
              className="px-3 py-1.5 rounded-xl bg-black/15 hover:bg-black/25 text-xs font-semibold"
            >
              Plus tard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
