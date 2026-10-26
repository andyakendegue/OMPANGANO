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
  Layers,
  AlertCircle
} from 'lucide-react';
import { QuestionnaireItem, OfflinePackStatus, OfflineSubmission } from '../types';
import { 
  downloadFullOfflinePack, 
  getOfflinePackStatus, 
  clearOfflineStorage, 
  getPendingOfflineContributions 
} from '../services/offlineStorage';
import { getOfflineAdminMutations, OfflineAdminMutation } from '../firebase';
import { warmUpOfflineShell } from '../services/pwaOfflineManager';

interface OfflinePackModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuestionnaireItem[];
  isOnline: boolean;
  onSyncPendingQueue: () => Promise<void>;
}

const COLLECTION_LABELS: Record<string, string> = {
  users: 'Profil / Favoris / XP',
  contributions: 'Validation / Contribution',
  questionnaire_items: 'Fiche linguistique',
  clans: 'Clan',
  villages: 'Village',
  weekly_challenges: 'Défi hebdomadaire',
  theme_configs: 'Thème',
  badge_configs: 'Badge'
};

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
  const [pendingMutations, setPendingMutations] = useState<OfflineAdminMutation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const refreshQueues = async () => {
    setPackStatus(getOfflinePackStatus());
    const subs = await getPendingOfflineContributions();
    setPendingSubmissions(subs);
    setPendingMutations(getOfflineAdminMutations());
  };

  useEffect(() => {
    if (isOpen) {
      setStatusBanner(null);
      setConfirmClear(false);
      refreshQueues();
      warmUpOfflineShell();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalPendingCount = pendingSubmissions.length + pendingMutations.length;

  const handleStartDownload = async () => {
    if (!isOnline) {
      setStatusBanner({ type: 'error', text: 'Une connexion internet active est requise pour télécharger le pack complet.' });
      return;
    }

    setStatusBanner(null);
    setIsDownloading(true);
    setDownloadProgressPct(0);
    setDownloadStepMsg("Initialisation de l'archive locale & Mode Avion...");

    try {
      await warmUpOfflineShell();
      const result = await downloadFullOfflinePack(items, (pct, msg) => {
        setDownloadProgressPct(pct);
        setDownloadStepMsg(msg);
      });
      setPackStatus(result);
      setStatusBanner({ type: 'success', text: 'Pack hors-ligne téléchargé et prêt pour le mode avion.' });
    } catch (e: any) {
      setStatusBanner({ type: 'error', text: 'Erreur lors du téléchargement du pack hors-ligne : ' + (e?.message || 'Erreur inconnue') });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      setStatusBanner({ type: 'error', text: 'Impossible de synchroniser sans connexion internet. Vos données restent en sécurité sur cet appareil.' });
      return;
    }
    setStatusBanner(null);
    setIsSyncing(true);
    try {
      await onSyncPendingQueue();
      await refreshQueues();
      setStatusBanner({ type: 'success', text: 'Synchronisation terminée avec succès vers Firebase !' });
    } catch (e: any) {
      setStatusBanner({ type: 'error', text: 'Certaines données restent en attente de réseau.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearPack = async () => {
    await clearOfflineStorage();
    setPackStatus({ isDownloaded: false, itemCount: 0, downloadProgress: 0 });
    setPendingSubmissions([]);
    setConfirmClear(false);
    setStatusBanner({ type: 'success', text: 'Le pack hors-ligne a été vidé.' });
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
              <h3 className="text-lg font-black text-white">Mode Hors-Ligne & Synchronisation</h3>
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

        {statusBanner && (
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            statusBanner.type === 'success'
              ? 'bg-[#14532d]/40 border-[#22c55e]/50 text-[#86efac]'
              : 'bg-[#7f1d1d]/40 border-[#ef4444]/50 text-[#fca5a5]'
          }`}>
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
        )}

        {/* Online/Offline status reminder */}
        <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
          isOnline
            ? 'bg-[#14532d]/30 border-[#22c55e]/40 text-[#86efac]'
            : 'bg-[#7f1d1d]/30 border-[#ef4444]/40 text-[#fca5a5]'
        }`}>
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="w-4 h-4 text-[#22c55e]" /> : <WifiOff className="w-4 h-4 text-[#ef4444]" />}
            <span className="font-semibold">
              {isOnline ? 'Connexion active (Synchronisation automatique activée)' : 'Mode Hors-ligne (Toutes vos actions sont sauvegardées localement)'}
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
              {packStatus.isDownloaded ? 'Téléchargé & Actif' : 'Cache automatique actif'}
            </span>
          </div>

          <p className="text-xs text-[#d4af94] leading-relaxed">
            Téléchargez l’intégralité des expressions, images et prononciations dans la mémoire de votre appareil (IndexedDB).
            Vous pourrez naviguer, ajouter des favoris, valider et enregistrer vos audios au village ou en mode avion.
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
            <div className="pt-2 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleStartDownload}
                  disabled={!isOnline}
                  className="flex-1 py-3 px-4 rounded-xl terracotta-gradient hover:opacity-95 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>
                    {packStatus.isDownloaded ? 'Mettre à jour le pack hors-ligne' : 'Télécharger le pack complet (Phrases & Images)'}
                  </span>
                </button>

                {packStatus.isDownloaded && !confirmClear && (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="p-3 rounded-xl bg-[#27150c] hover:bg-[#7f1d1d] text-[#fca5a5] border border-[#4a2412] transition-colors"
                    title="Supprimer le pack téléchargé"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {confirmClear && (
                <div className="p-2.5 rounded-xl bg-[#2a120a] border border-[#ef4444]/40 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#fca5a5]">Vider le cache hors-ligne ?</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleClearPack}
                      className="px-2.5 py-1 rounded-lg bg-[#ef4444] text-white font-bold"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="px-2.5 py-1 rounded-lg bg-[#27150c] text-[#d4af94]"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
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
              {totalPendingCount} en attente
            </span>
          </div>

          {totalPendingCount === 0 ? (
            <p className="text-xs text-[#a8826d] py-2">
              Aucune donnée en attente. Toutes vos contributions, favoris, validations et points XP sont synchronisés avec Firebase.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {pendingSubmissions.map((sub) => (
                  <div key={sub.id} className="p-2.5 bg-[#24130a] rounded-xl border border-[#3b1d10] text-xs flex justify-between items-center">
                    <div className="overflow-hidden">
                      <div className="text-white font-medium truncate">« {sub.frenchText} »</div>
                      <div className="text-[10px] text-[#f59e0b]">
                        {sub.isSpellingCorrect ? 'Orthographe validée' : `Variante: ${sub.proposedSpelling}`}
                        {(sub.proposedFrenchMeaning || sub.secondaryMeaning) ? ` • Sens: ${sub.proposedFrenchMeaning || sub.secondaryMeaning}` : ''}
                        {' • '}
                        {sub.audioBlob || sub.audioDataUrl ? 'Voix incluse 🎙️' : 'Texte seul'}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#a8826d] shrink-0 font-mono">
                      {new Date(sub.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {pendingMutations.map((mut) => (
                  <div key={mut.id} className="p-2.5 bg-[#24130a] rounded-xl border border-[#3b1d10] text-xs flex justify-between items-center">
                    <div className="overflow-hidden">
                      <div className="text-white font-medium truncate">
                        {COLLECTION_LABELS[mut.collectionPath] || mut.collectionPath}
                      </div>
                      <div className="text-[10px] text-[#d4af94]">
                        {mut.type === 'save' ? 'Mise à jour locale en attente d’envoi' : 'Suppression en attente'} ({mut.recordId})
                      </div>
                    </div>
                    <span className="text-[10px] text-[#a8826d] shrink-0 font-mono">
                      {new Date(mut.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

