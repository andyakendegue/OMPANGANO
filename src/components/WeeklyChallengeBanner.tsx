import React, { useState } from 'react';
import { Target, Trophy, Sparkles, ChevronDown, CheckCircle2, Filter, Compass } from 'lucide-react';
import { WeeklyChallenge, ThematicCategory, ThemeDefinition } from '../types';
import { THEMATIC_CATEGORIES } from '../services/seedData';

interface WeeklyChallengeBannerProps {
  challenges: WeeklyChallenge[];
  activeChallengeId: string;
  onSelectChallenge: (id: string) => void;
  userProgress: number; // e.g. 2 out of 5
  isCompleted: boolean;
  isFilterActive: boolean;
  onToggleFilter: () => void;
  filteredCount?: number;
}

export const WeeklyChallengeBanner: React.FC<WeeklyChallengeBannerProps> = ({
  challenges,
  activeChallengeId,
  onSelectChallenge,
  userProgress,
  isCompleted,
  isFilterActive,
  onToggleFilter,
  filteredCount
}) => {
  const [showSelector, setShowSelector] = useState(false);

  const activeChallenge = challenges.find(c => c.id === activeChallengeId) || challenges[0];
  if (!activeChallenge) return null;

  const currentCount = Math.min(activeChallenge.targetCount, userProgress);
  const percent = Math.min(100, Math.round((currentCount / activeChallenge.targetCount) * 100));

  const themeInfo: ThemeDefinition | undefined = activeChallenge.theme !== 'all'
    ? THEMATIC_CATEGORIES.find(t => t.id === activeChallenge.theme)
    : undefined;

  return (
    <div className="mb-4 bg-gradient-to-r from-[#2a170d] via-[#331c10] to-[#25140b] border border-[#d97706]/40 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
      {/* Decorative African glow element */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-[#d97706]/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-8 w-40 h-20 bg-[#c85a32]/10 rounded-full blur-xl pointer-events-none" />

      {/* Header with Title and Challenge Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#d97706]/20 border border-[#d97706]/50 text-base shadow-sm">
            {activeChallenge.badgeRewardIcon || '🎯'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#d97706]/20 text-[#f59e0b] border border-[#d97706]/30">
                Défi de la semaine
              </span>
              {themeInfo && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1c120c] text-[#fdfaf7]/90 border border-[#4a2e1d] flex items-center gap-1">
                  <span>{themeInfo.icon}</span>
                  <span>{themeInfo.shortName}</span>
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#fdfaf7] mt-0.5">
              {activeChallenge.title}
            </h3>
          </div>
        </div>

        {/* Challenge selector dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#1c120c]/80 hover:bg-[#1c120c] text-[#fdfaf7]/80 hover:text-white border border-[#4a2e1d] transition-colors"
            title="Changer de défi actif"
          >
            <span>Autres défis ({challenges.length})</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showSelector && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#1e130c] border border-[#d97706]/40 rounded-xl shadow-2xl p-1.5 z-30">
              <div className="text-[10px] uppercase font-bold text-[#fdfaf7]/50 px-2 py-1">
                Défis Hebdomadaires Disponibles
              </div>
              {challenges.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectChallenge(c.id);
                    setShowSelector(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    c.id === activeChallenge.id
                      ? 'bg-[#d97706]/20 text-[#f59e0b] font-bold border border-[#d97706]/30'
                      : 'text-[#fdfaf7]/80 hover:bg-[#2e1c12]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{c.badgeRewardIcon}</span>
                    <span className="truncate">{c.title}</span>
                  </div>
                  <span className="text-[10px] text-[#f59e0b] ml-1 shrink-0 font-semibold">
                    +{c.xpReward} XP
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-[#fdfaf7]/80 mb-3.5 leading-relaxed">
        {activeChallenge.description}
      </p>

      {/* Progress Bar & Rewards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span className="text-[#fdfaf7]">
              Progression : <strong className="text-[#f59e0b]">{currentCount}</strong> / {activeChallenge.targetCount}
            </span>
            {isCompleted && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> Terminé !
              </span>
            )}
          </div>
          <span className="text-xs text-[#f59e0b] font-bold">{percent}%</span>
        </div>

        {/* Progress track */}
        <div className="w-full bg-[#1c120c] h-3 rounded-full overflow-hidden border border-[#4a2e1d] p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isCompleted
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-[#d97706] to-[#f59e0b]'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Footer Actions: Reward Preview & Thematic Filter Button */}
      <div className="mt-3.5 pt-3 border-t border-[#4a2e1d]/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#fdfaf7]/60 text-[11px]">Récompense :</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#d97706]/15 border border-[#d97706]/30 text-[#f59e0b] font-bold text-[11px]">
            <span>{activeChallenge.badgeRewardIcon}</span>
            <span>{activeChallenge.badgeRewardName}</span>
          </span>
          <span className="text-xs font-bold text-[#f59e0b] bg-[#1c120c] px-2 py-0.5 rounded-md border border-[#4a2e1d]">
            +{activeChallenge.xpReward} XP
          </span>
        </div>

        {/* Filter on challenge theme button */}
        {activeChallenge.theme !== 'all' && (
          <button
            onClick={onToggleFilter}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isFilterActive
                ? 'bg-[#d97706] text-black shadow-lg shadow-[#d97706]/30 font-bold'
                : 'bg-[#1c120c] hover:bg-[#2e1c12] text-[#fdfaf7] border border-[#d97706]/40'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>
              {isFilterActive
                ? 'Filtré sur ce thème (Actif)'
                : `Travailler sur ce thème (${filteredCount ?? ''})`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
