import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, X, Check, Award } from 'lucide-react';
import { WeeklyChallenge } from '../types';

interface ChallengeCelebrationModalProps {
  challenge: WeeklyChallenge | null;
  isOpen: boolean;
  onClose: () => void;
  onViewBadges?: () => void;
}

export const ChallengeCelebrationModal: React.FC<ChallengeCelebrationModalProps> = ({
  challenge,
  isOpen,
  onClose,
  onViewBadges
}) => {
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#d97706', '#b84a28', '#10b981']
        });
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen || !challenge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1e130c] border-2 border-[#f59e0b]/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#d97706]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#c85a32]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#2a170d] text-[#fdfaf7]/60 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Trophy */}
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#b84a28] flex items-center justify-center shadow-lg shadow-[#d97706]/30 text-4xl animate-bounce">
            {challenge.badgeRewardIcon || '🏆'}
          </div>
          <span className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-emerald-500 text-black shadow-md">
            <Check className="w-4 h-4 stroke-[3]" />
          </span>
        </div>

        {/* Title */}
        <div className="inline-block px-3 py-1 rounded-full bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30 text-xs font-bold uppercase tracking-wider mb-2">
          Défi Hebdomadaire Accompli !
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-[#fdfaf7] mb-2">
          {challenge.title}
        </h2>

        <p className="text-sm text-[#fdfaf7]/80 mb-6 leading-relaxed">
          Tu as brillamment relevé le défi ! Ton investissement pour préserver et enrichir la langue des ancêtres est récompensé.
        </p>

        {/* Reward Card */}
        <div className="bg-[#2a170d] border border-[#d97706]/40 rounded-2xl p-4 mb-6 flex items-center justify-around">
          <div className="text-center">
            <div className="text-xs text-[#fdfaf7]/60 font-semibold mb-0.5">Badge Obtenu</div>
            <div className="text-sm font-extrabold text-[#fdfaf7] flex items-center justify-center gap-1.5">
              <span>{challenge.badgeRewardIcon}</span>
              <span>{challenge.badgeRewardName}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-[#4a2e1d]" />
          <div className="text-center">
            <div className="text-xs text-[#fdfaf7]/60 font-semibold mb-0.5">Bonus d’Expérience</div>
            <div className="text-base font-black text-[#f59e0b]">
              +{challenge.xpReward} XP
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b84a28] hover:from-[#b84a28] hover:to-[#9a3412] text-white font-bold text-sm shadow-lg transition-all"
          >
            Continuer le crowdsourcing
          </button>
          {onViewBadges && (
            <button
              onClick={() => {
                onClose();
                onViewBadges();
              }}
              className="py-3 px-4 rounded-xl bg-[#2a170d] hover:bg-[#381e10] text-[#fdfaf7] font-semibold text-sm border border-[#4a2e1d] transition-colors"
            >
              Voir mon profil
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
