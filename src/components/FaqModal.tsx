import React, { useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { ContributionFaqSection } from './ContributionFaqSection';

interface FaqModalProps {
  isOpen: boolean;
  userTribe?: string;
  selectedTribeFilter: string;
  onSelectTribeFilter: (tribe: string) => void;
  onClose: () => void;
}

/** FAQ de la contribution, ouverte depuis le bouton « FAQ » de la barre du haut. */
export const FaqModal: React.FC<FaqModalProps> = ({ isOpen, userTribe, selectedTribeFilter, onSelectTribeFilter, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Foire aux questions"
    >
      <div
        className="relative w-full sm:max-w-4xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#170d08] border border-[#3d1f11] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 border-b border-[#3d1f11]">
          <div className="flex items-center gap-2 text-[#fde047] font-bold">
            <HelpCircle className="w-5 h-5 text-[#f59e0b]" />
            <span>Foire aux questions</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#27150c] hover:bg-[#381e11] text-[#fed7aa] border border-[#4a2412] active:scale-95 transition"
            aria-label="Fermer la FAQ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-3 sm:px-5 pb-6">
          <ContributionFaqSection
            userTribe={userTribe as any}
            selectedTribeFilter={selectedTribeFilter as any}
            onSelectTribeFilter={onSelectTribeFilter as any}
          />
        </div>
      </div>
    </div>
  );
};
