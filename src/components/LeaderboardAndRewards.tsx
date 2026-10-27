import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  Trophy, 
  Award, 
  Flame, 
  Sparkles, 
  Crown, 
  CheckCircle2, 
  Lock, 
  TrendingUp, 
  ArrowUpRight,
  Search,
  Zap,
  RotateCcw
} from 'lucide-react';
import { UserProfile, Badge } from '../types';
import { SYSTEM_BADGES, USER_LEVELS, MYENE_TRIBES, getLevelForXp } from '../services/seedData';

interface LeaderboardAndRewardsProps {
  currentUser: UserProfile | null;
  leaderboardUsers: UserProfile[];
  badges?: Badge[];
}

interface RankChangeFeedback {
  rankDelta: number; // positive means climbed up (e.g. from #3 to #2 -> +1)
  xpDelta: number;
  newRank: number;
}

export const LeaderboardAndRewards: React.FC<LeaderboardAndRewardsProps> = ({
  currentUser,
  leaderboardUsers,
  badges = SYSTEM_BADGES
}) => {
  const [selectedTribeFilter, setSelectedTribeFilter] = useState<string>('all');
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Optional local XP boost state to preview the rank-up animation interactively
  const [simulatedXpBoosts, setSimulatedXpBoosts] = useState<Record<string, number>>({});
  const [rankFeedbackByUser, setRankFeedbackByUser] = useState<Record<string, RankChangeFeedback>>({});

  // Store previous rank & XP for each user to detect real-time XP gains and rank climbs
  const prevRankAndXpRef = useRef<Record<string, { rank: number; xp: number }>>({});

  const currentUserId = currentUser?.id || '';
  const currentXp = (currentUser?.xp || 0) + (currentUserId ? (simulatedXpBoosts[currentUserId] || 0) : 0);
  const currentLevel = getLevelForXp(currentXp);
  const nextLevel = USER_LEVELS[currentLevel.index] || null;

  const currentLevelMin = currentLevel.minXp;
  const nextLevelMin = nextLevel ? nextLevel.minXp : currentLevel.maxXp;
  const xpInCurrentLevel = currentXp - currentLevelMin;
  const xpNeededForNext = nextLevel ? nextLevelMin - currentLevelMin : 1;
  const progressPct = Math.min(100, Math.max(5, Math.round((xpInCurrentLevel / xpNeededForNext) * 100)));

  const userBadges = currentUser?.badges || ['badge-genealogie-verifiee'];

  // Merge currentUser with leaderboardUsers, apply any XP updates, and sort by XP descending
  const sortedAndFilteredUsers = useMemo(() => {
    const mapById = new Map<string, UserProfile>();
    for (const u of leaderboardUsers) {
      if (u && u.id) {
        mapById.set(u.id, u);
      }
    }
    if (currentUser && currentUser.id) {
      const existing = mapById.get(currentUser.id);
      mapById.set(currentUser.id, {
        ...(existing || {}),
        ...currentUser,
        xp: Math.max(existing?.xp || 0, currentUser.xp || 0)
      });
    }

    const allWithBoost = Array.from(mapById.values()).map(u => {
      const boost = simulatedXpBoosts[u.id] || 0;
      const effectiveXp = (u.xp || 0) + boost;
      const lvl = getLevelForXp(effectiveXp);
      return {
        ...u,
        xp: effectiveXp,
        levelIndex: lvl.index,
        level: lvl.name
      };
    });

    const filtered = allWithBoost.filter(u => {
      const matchTribe = selectedTribeFilter === 'all' || u.tribe === selectedTribeFilter;
      const q = searchUserQuery.trim().toLowerCase();
      if (!q) return matchTribe;
      const matchSearch =
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.villageOfOrigin && u.villageOfOrigin.toLowerCase().includes(q));
      return matchTribe && matchSearch;
    });

    return filtered.sort((a, b) => (b.xp || 0) - (a.xp || 0));
  }, [leaderboardUsers, currentUser, simulatedXpBoosts, selectedTribeFilter, searchUserQuery]);

  // Detect rank climbs & XP gains whenever sortedAndFilteredUsers updates
  useEffect(() => {
    const prevSnapshot = prevRankAndXpRef.current;
    const nextSnapshot: Record<string, { rank: number; xp: number }> = {};
    const newlyDetectedChanges: Record<string, RankChangeFeedback> = {};

    sortedAndFilteredUsers.forEach((user, index) => {
      const currentRank = index + 1;
      const userXp = user.xp || 0;
      const prev = prevSnapshot[user.id];

      if (prev) {
        const xpDelta = userXp - prev.xp;
        const rankDelta = prev.rank - currentRank; // > 0 when user climbed to a better rank
        if (xpDelta > 0 || rankDelta > 0) {
          newlyDetectedChanges[user.id] = {
            rankDelta: Math.max(0, rankDelta),
            xpDelta: Math.max(0, xpDelta),
            newRank: currentRank
          };
        }
      }

      nextSnapshot[user.id] = { rank: currentRank, xp: userXp };
    });

    prevRankAndXpRef.current = nextSnapshot;

    if (Object.keys(newlyDetectedChanges).length > 0) {
      setRankFeedbackByUser(prev => ({ ...prev, ...newlyDetectedChanges }));
      const timer = setTimeout(() => {
        setRankFeedbackByUser(prev => {
          const copy = { ...prev };
          for (const id of Object.keys(newlyDetectedChanges)) {
            delete copy[id];
          }
          return copy;
        });
      }, 4200);
      return () => clearTimeout(timer);
    }
  }, [sortedAndFilteredUsers]);

  // Trigger an interactive XP boost on the current user (or #2/#3 user) so the user can see the smooth rank-up transition
  const handleSimulateRankUp = () => {
    if (sortedAndFilteredUsers.length < 2) return;
    // Pick currentUser if they are not #1, otherwise pick the user currently at #2 or #3 so they overtake the person above them
    const currentIdx = sortedAndFilteredUsers.findIndex(u => u.id === currentUser?.id);
    const targetIdx = currentIdx > 0 ? currentIdx : Math.min(2, sortedAndFilteredUsers.length - 1);
    const targetUser = sortedAndFilteredUsers[targetIdx];
    const userAbove = sortedAndFilteredUsers[targetIdx - 1];
    if (!targetUser || !userAbove) return;

    const neededToOvertake = Math.max(50, (userAbove.xp || 0) - (targetUser.xp || 0) + 45);
    setSimulatedXpBoosts(prev => ({
      ...prev,
      [targetUser.id]: (prev[targetUser.id] || 0) + neededToOvertake
    }));
  };

  const handleResetSimulation = () => {
    prevRankAndXpRef.current = {};
    setRankFeedbackByUser({});
    setSimulatedXpBoosts({});
  };

  const hasSimulationActive = Object.keys(simulatedXpBoosts).length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
      {/* User Progression Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="warm-card-gradient rounded-3xl p-6 border-2 border-[#d97706]/30 shadow-2xl relative overflow-hidden"
      >
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
              <motion.div
                key={currentLevel.index}
                initial={{ scale: 0.75 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                className="absolute -bottom-1.5 -right-1.5 bg-[#f59e0b] text-[#451a03] font-black text-xs px-2 py-0.5 rounded-full border border-white shadow"
              >
                Niv. {currentLevel.index}
              </motion.div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
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
                <motion.span
                  key={currentXp}
                  initial={{ scale: 1.15, color: '#fde047' }}
                  animate={{ scale: 1, color: '#f59e0b' }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-1 text-[#f59e0b] font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5" /> {currentXp} Points XP
                </motion.span>
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
              <motion.div
                className="h-full rounded-full terracotta-gradient shadow-md"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-[#a8826d] mt-1.5">
              <span>{currentLevel.name}</span>
              <span>{nextLevel ? nextLevel.name : 'Maîtrise Suprême'}</span>
            </div>
          </div>
        </div>
      </motion.div>

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
              <motion.div
                key={badge.id}
                whileHover={{ y: -2 }}
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
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Global Leaderboard with Tribe Filters & Smooth Framer Motion Rank Transitions */}
      <div className="warm-card-gradient rounded-3xl p-6 border border-[#4a2412] shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#f59e0b]" />
              <h3 className="text-lg font-bold text-white">Classement Mondial des Contributeurs</h3>
            </div>
            <span className="text-xs text-[#f59e0b] font-medium flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> En direct de l'Ogooué & de l'Estuaire • Transitions de rang dynamiques
            </span>
          </div>

          {/* Interactive Rank-Up Animation Trigger */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={handleSimulateRankUp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#27150c] hover:bg-[#381e11] text-[#fde047] border border-[#f59e0b]/40 text-xs font-bold shadow transition active:scale-95"
              title="Simuler un gain d'XP pour observer l'animation de montée en rang"
            >
              <Zap className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>Simuler montée en rang (+XP)</span>
            </button>
            {hasSimulationActive && (
              <button
                type="button"
                onClick={handleResetSimulation}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#180d07] hover:bg-[#27150c] text-[#a8826d] hover:text-white border border-[#3b1d10] text-xs font-medium transition"
                title="Réinitialiser les scores réels"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        {/* Tribe Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 text-[#a8826d] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              placeholder="Chercher un contributeur..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#180d07] border border-[#4a2412] rounded-xl text-xs text-white focus:outline-none focus:border-[#f59e0b]"
            />
          </div>
        </div>

        <LayoutGroup id="ompagano-leaderboard">
          {/* Podium Top 3 */}
          {sortedAndFilteredUsers.length >= 3 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 pb-2 items-end">
              {/* 2nd Place */}
              <motion.div
                layout
                key={`podium-${sortedAndFilteredUsers[1].id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className={`bg-[#24130a] border rounded-2xl p-3 text-center flex flex-col items-center shadow-lg relative ${
                  rankFeedbackByUser[sortedAndFilteredUsers[1].id]
                    ? 'border-emerald-400 ring-2 ring-emerald-500/30'
                    : 'border-[#6b7280]/40'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#9ca3af]/20 border border-[#9ca3af] flex items-center justify-center text-sm font-bold text-[#e5e7eb] mb-1">
                  2
                </div>
                <div className="text-xs font-bold text-white truncate w-full">
                  {sortedAndFilteredUsers[1]?.fullName || sortedAndFilteredUsers[1]?.displayName}
                </div>
                <motion.div
                  key={sortedAndFilteredUsers[1]?.xp}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-[11px] text-[#f59e0b] font-mono font-semibold mt-0.5"
                >
                  {sortedAndFilteredUsers[1]?.xp} XP
                </motion.div>
                <span className="text-[9px] text-[#a8826d] mt-0.5">{sortedAndFilteredUsers[1]?.tribe}</span>
              </motion.div>

              {/* 1st Place */}
              <motion.div
                layout
                key={`podium-${sortedAndFilteredUsers[0].id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: -8 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className={`bg-[#381a0b] border-2 rounded-2xl p-4 text-center flex flex-col items-center shadow-2xl relative ${
                  rankFeedbackByUser[sortedAndFilteredUsers[0].id]
                    ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                    : 'border-[#f59e0b]'
                }`}
              >
                <Crown className="w-6 h-6 text-[#f59e0b] absolute -top-3.5 drop-shadow-md" />
                <div className="w-10 h-10 rounded-full terracotta-gradient flex items-center justify-center text-base font-black text-white mb-1 shadow-md">
                  1
                </div>
                <div className="text-xs sm:text-sm font-black text-white truncate w-full">
                  {sortedAndFilteredUsers[0]?.fullName || sortedAndFilteredUsers[0]?.displayName}
                </div>
                <motion.div
                  key={sortedAndFilteredUsers[0]?.xp}
                  initial={{ scale: 1.25 }}
                  animate={{ scale: 1 }}
                  className="text-xs text-[#fde047] font-mono font-bold mt-0.5"
                >
                  {sortedAndFilteredUsers[0]?.xp} XP
                </motion.div>
                <span className="text-[10px] text-[#fed7aa] font-semibold mt-0.5">{sortedAndFilteredUsers[0]?.tribe}</span>
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                layout
                key={`podium-${sortedAndFilteredUsers[2].id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className={`bg-[#24130a] border rounded-2xl p-3 text-center flex flex-col items-center shadow-lg relative ${
                  rankFeedbackByUser[sortedAndFilteredUsers[2].id]
                    ? 'border-emerald-400 ring-2 ring-emerald-500/30'
                    : 'border-[#b45309]/40'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#b45309]/20 border border-[#b45309] flex items-center justify-center text-sm font-bold text-[#fdba74] mb-1">
                  3
                </div>
                <div className="text-xs font-bold text-white truncate w-full">
                  {sortedAndFilteredUsers[2]?.fullName || sortedAndFilteredUsers[2]?.displayName}
                </div>
                <motion.div
                  key={sortedAndFilteredUsers[2]?.xp}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-[11px] text-[#f59e0b] font-mono font-semibold mt-0.5"
                >
                  {sortedAndFilteredUsers[2]?.xp} XP
                </motion.div>
                <span className="text-[9px] text-[#a8826d] mt-0.5">{sortedAndFilteredUsers[2]?.tribe}</span>
              </motion.div>
            </div>
          )}

          {/* Full Animated Leaderboard List */}
          <motion.div layout className="space-y-2 pt-2 relative">
            <AnimatePresence initial={false}>
              {sortedAndFilteredUsers.map((user, idx) => {
                const rank = idx + 1;
                const feedback = rankFeedbackByUser[user.id];
                const isCurrentUser = user.id === currentUser?.id;

                return (
                  <motion.div
                    layout
                    layoutId={`leaderboard-row-${user.id}`}
                    key={user.id}
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: feedback?.rankDelta ? [1, 1.025, 1] : 1
                    }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{
                      layout: { type: 'spring', stiffness: 380, damping: 30 },
                      opacity: { duration: 0.25 },
                      scale: { duration: 0.45 }
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm transition-colors ${
                      feedback?.rankDelta
                        ? 'bg-emerald-950/50 border-emerald-400 shadow-lg ring-1 ring-emerald-400/40 text-white'
                        : isCurrentUser
                        ? 'bg-[#c85a32]/25 border-[#c85a32] shadow ring-1 ring-[#c85a32]/30 font-semibold text-white'
                        : 'bg-[#1e1008] border-[#381c0e] text-[#fed7aa] hover:bg-[#28150c]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <motion.span
                        key={`rank-${user.id}-${rank}`}
                        initial={{ scale: 0.7, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold font-mono text-xs shrink-0 ${
                          rank === 1
                            ? 'bg-[#f59e0b] text-[#1c100a]'
                            : rank === 2
                            ? 'bg-[#9ca3af]/30 text-white border border-[#9ca3af]/50'
                            : rank === 3
                            ? 'bg-[#b45309]/30 text-[#fdba74] border border-[#b45309]/50'
                            : 'bg-[#180d07] text-[#a8826d] border border-[#3b1d10]'
                        }`}
                      >
                        #{rank}
                      </motion.span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-white truncate">
                            {user.fullName || user.displayName}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c85a32] text-white font-bold">
                              Vous
                            </span>
                          )}

                          {/* Animated Rank-Up & XP Gain Badges */}
                          <AnimatePresence>
                            {feedback && feedback.rankDelta > 0 && (
                              <motion.span
                                key={`rank-up-${user.id}-${feedback.newRank}`}
                                initial={{ opacity: 0, y: 8, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.8 }}
                                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/60 text-emerald-300 text-[10px] font-extrabold shadow"
                              >
                                <ArrowUpRight className="w-3 h-3" />
                                <span>+{feedback.rankDelta} rang{feedback.rankDelta > 1 ? 's' : ''}</span>
                              </motion.span>
                            )}
                            {feedback && feedback.xpDelta > 0 && (
                              <motion.span
                                key={`xp-up-${user.id}-${user.xp}`}
                                initial={{ opacity: 0, scale: 0.75 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.75 }}
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/60 text-[#fde047] text-[10px] font-extrabold"
                              >
                                +{feedback.xpDelta} XP
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="text-[10px] text-[#a8826d] truncate">
                          Tribu {user.tribe || 'Myènè'} • {user.villageOfOrigin || 'Non précisé'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-[11px] text-[#a8826d] hidden sm:inline">
                        {user.contributionsCount || 0} contributions
                      </span>
                      <motion.span
                        key={`${user.id}-${user.xp}`}
                        initial={{ scale: 1.25, color: '#4ade80' }}
                        animate={{ scale: 1, color: '#f59e0b' }}
                        transition={{ duration: 0.45 }}
                        className="font-mono font-bold text-[#f59e0b]"
                      >
                        {user.xp} XP
                      </motion.span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      </div>
    </div>
  );
};
