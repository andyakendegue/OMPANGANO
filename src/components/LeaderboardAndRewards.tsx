import React, { useState } from 'react';
import { 
  Trophy, 
  Award, 
  Flame, 
  Sparkles, 
  Crown, 
  CheckCircle2, 
  Lock, 
  TrendingUp, 
  Users, 
  Filter,
  Globe2,
  ShieldCheck
} from 'lucide-react';
import { UserProfile, Badge, TribeName } from '../types';
import { SYSTEM_BADGES, USER_LEVELS, MYENE_TRIBES, getLevelForXp } from '../services/seedData';

interface LeaderboardAndRewardsProps {
  currentUser: UserProfile | null;
  leaderboardUsers: UserProfile[];
  badges?: Badge[];
}

export const LeaderboardAndRewards: React.FC<LeaderboardAndRewardsProps> = ({
  currentUser,
  leaderboardUsers,
  badges = SYSTEM_BADGES
}) => {
  const [selectedTribeFilter, setSelectedTribeFilter] = useState<string>('all');
  const [searchUserQuery, setSearchUserQuery] = useState('');

  const currentXp = currentUser?.xp || 0;
  const currentLevel = getLevelForXp(currentXp);
  const nextLevel = USER_LEVELS[currentLevel.index] || null;

  const currentLevelMin = currentLevel.minXp;
  const nextLevelMin = nextLevel ? nextLevel.minXp : currentLevel.maxXp;
  const xpInCurrentLevel = currentXp - currentLevelMin;
  const xpNeededForNext = nextLevel ? nextLevelMin - currentLevelMin : 1;
  const progressPct = Math.min(100, Math.max(5, Math.round((xpInCurrentLevel / xpNeededForNext) * 100)));

  const userBadges = currentUser?.badges || ['badge-genealogie-verifiee'];

  const filteredUsers = leaderboardUsers.filter(u => {
    const matchTribe = selectedTribeFilter === 'all' || u.tribe === selectedTribeFilter;
    const matchSearch = 
      (u.fullName && u.fullName.toLowerCase().includes(searchUserQuery.toLowerCase())) ||
      (u.displayName && u.displayName.toLowerCase().includes(searchUserQuery.toLowerCase())) ||
      (u.villageOfOrigin && u.villageOfOrigin.toLowerCase().includes(searchUserQuery.toLowerCase()));
    return matchTribe && matchSearch;
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
      {/* User Progression Hero */}
      <div className="warm-card-gradient rounded-3xl p-6 border-2 border-[#d97706]/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#c85a32]/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl terracotta-gradient p-1 shadow-xl flex items-center justify-center">
                <div className="w-full h-full bg-[#1c100a] rounded-xl flex items-center justify-center text-3xl">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span>👑</span>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 bg-[#f59e0b] text-[#451a03] font-black text-xs px-2 py-0.5 rounded-full border border-white shadow">
                Niv. {currentLevel.index}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {currentUser?.fullName || currentUser?.displayName || 'Contributeur OMPAGANO'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#c85a32]/30 text-[#fdba74] border border-[#c85a32]/40">
                  {currentLevel.name}
                </span>
              </div>
              <p className="text-xs text-[#d4af94] mt-1 max-w-md">
                Tribu {currentUser?.tribe || 'Myènè'} • {currentUser?.villageOfOrigin || 'Village non spécifié'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1 text-[#f59e0b] font-bold">
                  <Sparkles className="w-3.5 h-3.5" /> {currentXp} Points XP
                </span>
                <span className="flex items-center gap-1 text-[#f87171] font-bold">
                  <Flame className="w-3.5 h-3.5" /> Série : {currentUser?.streakDays || 1} jours
                </span>
              </div>
            </div>
          </div>

          {/* Progress to next level */}
          <div className="w-full md:w-64 bg-[#180d07] p-4 rounded-2xl border border-[#4a2412]">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#a8826d]">Vers le niveau suivant</span>
              <span className="text-[#f59e0b] font-bold font-mono">
                {nextLevel ? `${currentXp} / ${nextLevel.minXp} XP` : 'Niveau MAX'}
              </span>
            </div>
            <div className="w-full h-3 bg-[#2a150b] rounded-full overflow-hidden border border-[#3b1d10]">
              <div
                className="h-full rounded-full terracotta-gradient transition-all duration-500 shadow-md"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-[#a8826d] mt-1.5">
              <span>{currentLevel.name}</span>
              <span>{nextLevel ? nextLevel.name : 'Maîtrise Suprême'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Collection */}
      <div className="warm-card-gradient rounded-3xl p-6 border border-[#4a2412] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#f59e0b]" />
            <h3 className="text-lg font-bold text-white">Vos Badges & Titres Honorifiques OMPAGANO</h3>
          </div>
          <span className="text-xs text-[#a8826d]">
            {userBadges.length} sur {badges.length} débloqués
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {badges.map(badge => {
            const isUnlocked = userBadges.includes(badge.id) || currentXp >= (badge.requiredXp || 99999);
            return (
              <div
                key={badge.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-[#2f190e] to-[#1c100a] border-[#d97706]/40 shadow-md ring-1 ring-[#d97706]/20'
                    : 'bg-[#180d07]/60 border-[#30160b] opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-2xl p-2 rounded-xl bg-[#24130a] border border-[#4a2412]">
                    {badge.icon}
                  </div>
                  {isUnlocked ? (
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                  ) : (
                    <Lock className="w-4 h-4 text-[#a8826d]" />
                  )}
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-white">{badge.title}</h4>
                <p className="text-[11px] text-[#a8826d] mt-1 leading-snug">{badge.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Leaderboard with Tribe Filters */}
      <div className="warm-card-gradient rounded-3xl p-6 border border-[#4a2412] shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#f59e0b]" />
            <h3 className="text-lg font-bold text-white">Classement Mondial des Contributeurs</h3>
          </div>
          <span className="text-xs text-[#f59e0b] font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> En direct de l'Ogooué & de l'Estuaire
          </span>
        </div>

        {/* Tribe Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTribeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap font-medium transition-all ${
              selectedTribeFilter === 'all'
                ? 'terracotta-gradient text-white shadow-md font-bold'
                : 'bg-[#24130a] text-[#a8826d] hover:bg-[#341b10]'
            }`}
          >
            Toutes les Tribus
          </button>
          {MYENE_TRIBES.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTribeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap font-medium transition-all ${
                selectedTribeFilter === t
                  ? 'terracotta-gradient text-white shadow-md font-bold'
                  : 'bg-[#24130a] text-[#a8826d] hover:bg-[#341b10]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Podium Top 3 */}
        {filteredUsers.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 pb-2 items-end">
            {/* 2nd Place */}
            <div className="bg-[#24130a] border border-[#6b7280]/40 rounded-2xl p-3 text-center flex flex-col items-center shadow-lg">
              <div className="w-8 h-8 rounded-full bg-[#9ca3af]/20 border border-[#9ca3af] flex items-center justify-center text-sm font-bold text-[#e5e7eb] mb-1">
                2
              </div>
              <div className="text-xs font-bold text-white truncate w-full">
                {filteredUsers[1]?.fullName || filteredUsers[1]?.displayName}
              </div>
              <div className="text-[11px] text-[#f59e0b] font-mono font-semibold mt-0.5">
                {filteredUsers[1]?.xp} XP
              </div>
              <span className="text-[9px] text-[#a8826d] mt-0.5">{filteredUsers[1]?.tribe}</span>
            </div>

            {/* 1st Place */}
            <div className="bg-[#381a0b] border-2 border-[#f59e0b] rounded-2xl p-4 text-center flex flex-col items-center shadow-2xl relative -translate-y-2">
              <Crown className="w-6 h-6 text-[#f59e0b] absolute -top-3.5 drop-shadow-md" />
              <div className="w-10 h-10 rounded-full terracotta-gradient flex items-center justify-center text-base font-black text-white mb-1 shadow-md">
                1
              </div>
              <div className="text-xs sm:text-sm font-black text-white truncate w-full">
                {filteredUsers[0]?.fullName || filteredUsers[0]?.displayName}
              </div>
              <div className="text-xs text-[#fde047] font-mono font-bold mt-0.5">
                {filteredUsers[0]?.xp} XP
              </div>
              <span className="text-[10px] text-[#fed7aa] font-semibold mt-0.5">{filteredUsers[0]?.tribe}</span>
            </div>

            {/* 3rd Place */}
            <div className="bg-[#24130a] border border-[#b45309]/40 rounded-2xl p-3 text-center flex flex-col items-center shadow-lg">
              <div className="w-8 h-8 rounded-full bg-[#b45309]/20 border border-[#b45309] flex items-center justify-center text-sm font-bold text-[#fdba74] mb-1">
                3
              </div>
              <div className="text-xs font-bold text-white truncate w-full">
                {filteredUsers[2]?.fullName || filteredUsers[2]?.displayName}
              </div>
              <div className="text-[11px] text-[#f59e0b] font-mono font-semibold mt-0.5">
                {filteredUsers[2]?.xp} XP
              </div>
              <span className="text-[9px] text-[#a8826d] mt-0.5">{filteredUsers[2]?.tribe}</span>
            </div>
          </div>
        )}

        {/* Full List */}
        <div className="space-y-2 pt-2">
          {filteredUsers.map((user, idx) => (
            <div
              key={user.id || idx}
              className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm transition-all ${
                user.id === currentUser?.id
                  ? 'bg-[#c85a32]/25 border-[#c85a32] shadow ring-1 ring-[#c85a32]/30 font-semibold text-white'
                  : 'bg-[#1e1008] border-[#381c0e] text-[#fed7aa] hover:bg-[#28150c]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-bold font-mono text-[#a8826d]">
                  #{idx + 1}
                </span>
                <div>
                  <span className="font-medium text-white">{user.fullName || user.displayName}</span>
                  <div className="text-[10px] text-[#a8826d]">
                    Tribu {user.tribe || 'Myènè'} • {user.villageOfOrigin || 'Lambaréné'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[11px] text-[#a8826d] hidden sm:inline">
                  {user.contributionsCount || 5} contributions
                </span>
                <span className="font-mono font-bold text-[#f59e0b]">
                  {user.xp} XP
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
