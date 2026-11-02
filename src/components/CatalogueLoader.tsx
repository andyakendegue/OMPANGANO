import React from 'react';
import { RefreshCw } from 'lucide-react';
import { subscribeSyncProgress, type SyncProgress } from '../firebase';

/** Bandeau de chargement du catalogue : jamais de « 0 » ni de page vide pendant que les fiches arrivent. */
export const CatalogueLoader: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const [sync, setSync] = React.useState<SyncProgress>({ kind: null, done: 0, total: 0 });
  React.useEffect(() => subscribeSyncProgress(setSync), []);
  const pct = sync.kind === 'download' && sync.total > 0 ? Math.min(100, Math.round((sync.done / sync.total) * 100)) : null;
  return (
    <div
      className={`rounded-2xl border border-[#14b8a6]/40 bg-[#0f3d3a]/60 text-[#99f6e4] ${compact ? 'px-3 py-2' : 'p-6 text-center'}`}
      role="status"
      aria-live="polite"
    >
      <div className={`flex items-center gap-2 ${compact ? '' : 'justify-center'} text-xs font-bold`}>
        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
        <span>
          Chargement des questions…
          {sync.kind === 'download' && ` ${sync.done.toLocaleString('fr-FR')} / ${sync.total.toLocaleString('fr-FR')}`}
        </span>
      </div>
      {!compact && (
        <p className="text-[11px] text-[#99f6e4]/80 mt-2">Les questions arrivent, elles s'afficheront ici dans un instant. Merci de patienter.</p>
      )}
      <div className="h-1.5 rounded-full bg-black/30 mt-2 overflow-hidden">
        <div
          className={`h-full bg-[#14b8a6] ${pct === null ? 'w-1/3 animate-pulse' : 'transition-all'}`}
          style={pct === null ? undefined : { width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
