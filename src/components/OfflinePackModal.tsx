import React, { useState, useEffect } from 'react';
import { 
  DownloadCloud, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  X, 
  HardDrive, 
  Layers
} from 'lucide-react';
import { QuestionnaireItem, OfflinePackStatus, OfflineSubmission } from '../types';
import { 
  downloadFullOfflinePack, 
  getOfflinePackStatus, 
  clearOfflineStorage, 
  getPendingOfflineContributions 
} from '../services/offlineStorage';

interface OfflinePackModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuestionnaireItem[];
  isOnline: boolean;
  onSyncPendingQueue: () => Promise<void>;
}

export const OfflinePackModal: React.FC<OfflinePackModalProps> = ({
  isOpen,
  onClose,
  items,
  isOnline,
  onSyncPendingQueue
}) => {
  const [packStatus, setPackStatus] = useState<OfflinePackStatus>({ isDownloaded: false, itemCount: 0, downloadProgress: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStepMsg, setDownloadStepMsg] = useState('');
  const [downloadProgressPct, setDownloadProgressPct] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState<OfflineSubmission[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPackStatus(getOfflinePackStatus());
      getPendingOfflineContributions().then(setPendingSubmissions);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    if (!isOnline) {
      alert("Une connexion Internet est requise pour télécharger les phrases et les images.");
      return;
    }

    setIsDownloading(true);
    setDownloadProgressPct(0);
    setDownloadStepMsg("Initialisation de l'archive locale...");

    try {
      const result = await downloadFullOfflinePack(items, (pct, msg) => {
        setDownloadProgressPct(pct);
        setDownloadStepMsg(msg);
      });
      setPackStatus(result);
    } catch (e: any) {
      alert('Erreur lors du téléchargement du pack hors-ligne: ' + e.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      alert("Impossible de synchroniser sans connexion internet.");
      return;
    }
    setIsSyncing(true);
    try {
      await onSyncPendingQueue();
      const updated = await getPendingOfflineContributions();
      setPendingSubmissions(updated);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearPack = async () => {
    if (confirm("Voulez-vous supprimer le pack hors-ligne et vider le cache local ?")) {
      await clearOfflineStorage();
      setPackStatus({ isDownloaded: false, itemCount: 0, downloadProgress: 0 });
      setPendingSubmissions([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg warm-card-gradient border-2 border-[#d97706]/40 rounded-3xl p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#4a2412] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl terracotta-gradient text-white shadow-md">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Mode Hors-Ligne & Téléchargement</h3>
              <p className="text-xs text-[#d4af94]">Contribuez sans interruption, même sans réseau</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[#27150c] text-[#a8826d] hover:text-white"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Online/Offline status reminder */}
        <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
          isOnline
            ? 'bg-[#14532d]/30 border-[#22c55e]/40 text-[#86efac]'
            : 'bg-[#7f1d1d]/30 border-[#ef4444]/40 text-[#fca5a5]'
        }`}>
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="w-4 h-4 text-[#22c55e]" /> : <WifiOff className="w-4 h-4 text-[#ef4444]" />}
            <span className="font-semibold">
              {isOnline ? 'Connexion active (Synchronisation en direct disponible)' : 'Mode Hors-ligne (Données stockées localement)'}
            </span>
          </div>
        </div>

        {/* Offline Pack Status Card */}
        <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#fed7aa] flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-[#f59e0b]" />
              <span>Pack OMPAGANO Local</span>
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              packStatus.isDownloaded
                ? 'bg-[#15803d]/30 text-[#86efac] border border-[#22c55e]/30'
                : 'bg-[#b45309]/30 text-[#fde047] border border-[#d97706]/30'
            }`}>
              {packStatus.isDownloaded ? 'Téléchargé & Actif' : 'Non téléchargé'}
            </span>
          </div>

          <p className="text-xs text-[#d4af94] leading-relaxed">
            Téléchargez l’intégralité des expressions, images et prononciations dans la mémoire de votre appareil (IndexedDB).
            Vous pourrez naviguer, lire les fiches et enregistrer vos audios au village ou en zone reculée.
          </p>

          {packStatus.isDownloaded && (
            <div className="flex items-center justify-between text-xs text-[#a8826d] pt-1 border-t border-[#3b1d10]">
              <span>Contenu : {packStatus.itemCount} phrases & photos</span>
              <span>{packStatus.downloadDate ? new Date(packStatus.downloadDate).toLocaleDateString() : ''}</span>
            </div>
          )}

          {isDownloading ? (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-[#f59e0b]">
                <span className="truncate pr-2">{downloadStepMsg}</span>
                <span className="font-mono font-bold">{downloadProgressPct}%</span>
              </div>
              <div className="w-full h-2.5 bg-[#27150c] rounded-full overflow-hidden border border-[#3b1d10]">
                <div
                  className="h-full rounded-full terracotta-gradient transition-all duration-200"
                  style={{ width: `${downloadProgressPct}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleStartDownload}
                disabled={!isOnline}
                className="flex-1 py-3 px-4 rounded-xl terracotta-gradient hover:opacity-95 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>
                  {packStatus.isDownloaded ? 'Mettre à jour le pack hors-ligne' : 'Télécharger le pack (Phrases & Images)'}
                </span>
              </button>

              {packStatus.isDownloaded && (
                <button
                  onClick={handleClearPack}
                  className="p-3 rounded-xl bg-[#27150c] hover:bg-[#7f1d1d] text-[#fca5a5] border border-[#4a2412] transition-colors"
                  title="Supprimer le pack téléchargé"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pending Queue Card */}
        <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#fed7aa] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#c85a32]" />
              <span>File d'Attente de Synchronisation</span>
            </span>
            <span className="font-mono text-xs text-[#f59e0b] font-bold">
              {pendingSubmissions.length} en attente
            </span>
          </div>

          {pendingSubmissions.length === 0 ? (
            <p className="text-xs text-[#a8826d] py-2">
              Aucune contribution en attente. Toutes vos données sont synchronisées avec Firebase en temps réel.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {pendingSubmissions.map((sub) => (
                  <div key={sub.id} className="p-2.5 bg-[#24130a] rounded-xl border border-[#3b1d10] text-xs flex justify-between items-center">
                    <div className="overflow-hidden">
                      <div className="text-white font-medium truncate">« {sub.frenchText} »</div>
                      <div className="text-[10px] text-[#f59e0b]">
                        {sub.isSpellingCorrect ? 'Orthographe validée' : `Variante: ${sub.proposedSpelling}`} • {sub.audioBlob || sub.audioDataUrl ? 'Voix incluse 🎙️' : 'Texte seul'}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#a8826d] shrink-0 font-mono">
                      {new Date(sub.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleManualSync}
                disabled={!isOnline || isSyncing}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#15803d] to-[#166534] hover:opacity-95 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Synchroniser automatiquement vers Firebase maintenant</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
