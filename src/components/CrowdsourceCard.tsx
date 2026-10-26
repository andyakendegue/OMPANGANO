import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Check, 
  Edit3, 
  Sparkles, 
  Volume2, 
  BookOpen, 
  Send, 
  ChevronRight, 
  ChevronLeft, 
  Info, 
  WifiOff, 
  Award,
  Globe2,
  CheckCircle2,
  MessageSquareQuote,
  Compass
} from 'lucide-react';
import {
  QuestionnaireItem,
  UserProfile,
  Contribution,
  WeeklyChallenge,
  FrenchMeaningNuanceType
} from '../types';
import { AudioRecorder } from './AudioRecorder';
import { saveOfflineContribution } from '../services/offlineStorage';
import { NotificationService } from '../services/notificationService';
import { WeeklyChallengeBanner } from './WeeklyChallengeBanner';
import { THEMATIC_CATEGORIES } from '../services/seedData';

interface CrowdsourceCardProps {
  item: QuestionnaireItem;
  currentUser: UserProfile | null;
  isOnline: boolean;
  onNext: () => void;
  onPrev: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onSubmitContribution: (data: Partial<Contribution>, audioBlob?: Blob) => Promise<boolean>;
  onRewardEarned: (xpGained: number, newBadges: string[]) => void;
  challenges?: WeeklyChallenge[];
  activeChallengeId?: string;
  onSelectChallenge?: (id: string) => void;
  userChallengeProgress?: number;
  isChallengeCompleted?: boolean;
  isChallengeFilterActive?: boolean;
  onToggleChallengeFilter?: () => void;
  filteredChallengeItemsCount?: number;
  onOpenVisualGuide?: () => void;
}

export const CrowdsourceCard: React.FC<CrowdsourceCardProps> = ({
  item,
  currentUser,
  isOnline,
  onNext,
  onPrev,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onSubmitContribution,
  onRewardEarned,
  challenges = [],
  activeChallengeId,
  onSelectChallenge,
  userChallengeProgress = 0,
  isChallengeCompleted = false,
  isChallengeFilterActive = false,
  onToggleChallengeFilter,
  filteredChallengeItemsCount,
  onOpenVisualGuide
}) => {
  // Step 1: Orthography state
  const [spellingDecision, setSpellingDecision] = useState<'correct' | 'propose' | null>(null);
  const [proposedText, setProposedText] = useState('');
  const [dialectVariant, setDialectVariant] = useState('enenga');
  const [contributorNotes, setContributorNotes] = useState('');

  // Step 2 (Before speaking Myènè): French meaning, alternative phrasing, or secondary sense
  const [frenchMeaningDecision, setFrenchMeaningDecision] = useState<'exact' | 'propose'>('exact');
  const [frenchMeaningType, setFrenchMeaningType] = useState<FrenchMeaningNuanceType>('correction_sens');
  const [proposedFrenchMeaning, setProposedFrenchMeaning] = useState('');
  const [secondaryMeaning, setSecondaryMeaning] = useState('');

  // Step 3: Audio state
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleAudioComplete = (blob: Blob, dataUrl: string, duration: number) => {
    setAudioBlob(blob);
    setAudioDataUrl(dataUrl);
    setAudioDuration(duration);
  };

  const handleAudioReset = () => {
    setAudioBlob(null);
    setAudioDataUrl(null);
    setAudioDuration(0);
  };

  const handleSubmit = async () => {
    if (!spellingDecision) {
      alert("Veuillez indiquer si l'orthographe actuelle est correcte ou proposer votre version.");
      return;
    }

    if (spellingDecision === 'propose' && !proposedText.trim()) {
      alert('Veuillez saisir votre proposition de traduction / orthographe en langue Myènè.');
      return;
    }

    if (
      frenchMeaningDecision === 'propose' &&
      !proposedFrenchMeaning.trim() &&
      !secondaryMeaning.trim()
    ) {
      alert(
        'Veuillez saisir votre proposition de signification en français, une autre tournure ou un sens secondaire.'
      );
      return;
    }

    if (!audioBlob && !audioDataUrl) {
      const confirmNoAudio = window.confirm(
        'Vous n’avez pas encore enregistré votre prononciation vocale. Voulez-vous tout de même soumettre sans audio ?'
      );
      if (!confirmNoAudio) return;
    }

    setIsSubmitting(true);

    try {
      const isCorrect = spellingDecision === 'correct';
      const finalProposed = isCorrect ? item.myeneText : proposedText.trim();
      const isFrenchExact = frenchMeaningDecision === 'exact';
      const finalFrenchType: FrenchMeaningNuanceType = isFrenchExact ? 'exact' : frenchMeaningType;
      const finalProposedFrench = !isFrenchExact ? proposedFrenchMeaning.trim() : '';
      const finalSecondaryMeaning = !isFrenchExact ? secondaryMeaning.trim() : '';

      const contributionPayload: Partial<Contribution> = {
        itemId: item.id,
        frenchText: item.frenchText,
        originalMyeneText: item.myeneText,
        isSpellingCorrect: isCorrect,
        proposedSpelling: finalProposed,
        isFrenchMeaningExact: isFrenchExact,
        frenchMeaningType: finalFrenchType,
        proposedFrenchMeaning: finalProposedFrench || undefined,
        secondaryMeaning: finalSecondaryMeaning || undefined,
        dialectVariant: dialectVariant,
        comment: contributorNotes.trim(),
        audioDuration: audioDuration || 3,
        audioUrl: audioDataUrl || undefined,
        status: 'pending',
        offlineQueued: !isOnline
      };

      const submittedOk = await onSubmitContribution(contributionPayload, audioBlob || undefined);
      if (!submittedOk) {
        setIsSubmitting(false);
        return;
      }

      // Fire celebratory confetti!
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#c85a32', '#d97706', '#f59e0b', '#7c2d12']
        });
      } catch (e) {
        // confetti fallback
      }

      // Reward points calculation (+20 XP bonus if contributor also enriches French meaning/nuance)
      const baseXp = audioBlob ? 120 : 50;
      const nuanceBonus = !isFrenchExact && (finalProposedFrench || finalSecondaryMeaning) ? 20 : 0;
      const xp = baseXp + nuanceBonus;
      onRewardEarned(xp, audioBlob ? ['badge-premiere-voix'] : ['badge-dix-traductions']);

      NotificationService.addInAppNotification({
        id: 'contrib-' + Date.now(),
        userId: currentUser?.id || 'guest',
        title: 'Contribution Enregistrée ! 🌟',
        message: `Merci d’enrichir le patrimoine de la langue Myènè pour "${item.frenchText}". +${xp} XP gagnés !`,
        type: 'reward',
        read: false,
        createdAt: new Date().toISOString()
      });

      setIsSubmittedSuccess(true);
    } catch (err) {
      console.error('Erreur soumission:', err);
      alert('Une erreur est survenue lors de la soumission. Vos données ont été sauvegardées localement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextExpression = () => {
    setIsSubmittedSuccess(false);
    setSpellingDecision(null);
    setProposedText('');
    setFrenchMeaningDecision('exact');
    setFrenchMeaningType('correction_sens');
    setProposedFrenchMeaning('');
    setSecondaryMeaning('');
    setContributorNotes('');
    handleAudioReset();
    onNext();
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'debutant':
        return <span className="bg-[#b45309]/30 text-[#fde047] border border-[#d97706]/30 text-[11px] px-2.5 py-0.5 rounded-full font-medium">Débutant</span>;
      case 'intermediaire':
        return <span className="bg-[#c85a32]/30 text-[#fdba74] border border-[#c85a32]/30 text-[11px] px-2.5 py-0.5 rounded-full font-medium">Intermédiaire</span>;
      case 'avance':
        return <span className="bg-[#7c2d12]/40 text-[#fca5a5] border border-[#b91c1c]/30 text-[11px] px-2.5 py-0.5 rounded-full font-medium">Avancé</span>;
      default:
        return null;
    }
  };

  const activeChallenge = challenges.find(c => c.id === activeChallengeId);
  const themeInfo = THEMATIC_CATEGORIES.find(t => t.id === item.category || t.id === item.theme);
  const isActiveChallengeMatch = activeChallenge && (
    activeChallenge.theme === 'all' || 
    activeChallenge.theme === item.category || 
    activeChallenge.theme === item.theme
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Weekly Challenge Banner */}
      {challenges && challenges.length > 0 && activeChallengeId && onSelectChallenge && (
        <WeeklyChallengeBanner
          challenges={challenges}
          activeChallengeId={activeChallengeId}
          onSelectChallenge={onSelectChallenge}
          userProgress={userChallengeProgress}
          isCompleted={isChallengeCompleted}
          isFilterActive={isChallengeFilterActive}
          onToggleFilter={onToggleChallengeFilter || (() => {})}
          filteredCount={filteredChallengeItemsCount}
        />
      )}

      {/* Top Navigation Pager & Visual Guide Trigger */}
      <div className="flex items-center justify-between mb-3 px-1 text-xs text-[#d4af94]">
        <div className="flex items-center gap-2 font-medium flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#c85a32]" />
            <span>Expression {currentIndex + 1} sur {totalCount}</span>
          </div>
          {onOpenVisualGuide && (
            <button
              type="button"
              onClick={onOpenVisualGuide}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#27150c] hover:bg-[#381e11] text-[#fde047] border border-[#f59e0b]/40 text-[11px] font-bold transition"
            >
              <Compass className="w-3 h-3 text-[#f59e0b]" />
              <span>Guide visuel & Objectifs</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="p-1.5 rounded-lg bg-[#27150c] border border-[#4a2412] text-[#fed7aa] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#381e11]"
            aria-label="Expression précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="p-1.5 rounded-lg bg-[#27150c] border border-[#4a2412] text-[#fed7aa] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#381e11]"
            aria-label="Expression suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="warm-card-gradient rounded-3xl overflow-hidden shadow-2xl border border-[#d97706]/25 transition-all">
        {/* Visual Hero Header with Image */}
        <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-[#180d07]">
          <img
            src={item.imageUrl}
            alt={item.frenchText}
            className="w-full h-full object-cover object-center filter brightness-[0.85] contrast-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1c100a] via-[#1c100a]/40 to-transparent" />

          {/* Badges on top of image */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#1c100a]/80 backdrop-blur-md text-[#fed7aa] border border-[#d97706]/40 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-[#f59e0b]" />
                {item.dialect || 'Myènè'}
              </span>
              {themeInfo && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1c100a]/90 backdrop-blur-md text-amber-200 border border-amber-600/40 flex items-center gap-1">
                  <span>{themeInfo.icon}</span>
                  <span>{themeInfo.shortName}</span>
                </span>
              )}
            </div>
            {getDifficultyBadge(item.difficulty)}
          </div>

          {/* French Title & Subtitle */}
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-xs uppercase tracking-wider text-[#f59e0b] font-semibold mb-1 flex items-center gap-1">
              <span>Sens en Français</span>
              {item.moduleThematique && (
                <span className="text-[10px] text-[#fed7aa]/60 normal-case">
                  ({item.moduleThematique})
                </span>
              )}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
              « {item.frenchText} »
            </h2>
          </div>
        </div>

        {/* Weekly Challenge Active Match Indicator */}
        {isActiveChallengeMatch && (
          <div className="mx-5 mt-4 p-2.5 rounded-xl bg-[#d97706]/15 border border-[#d97706]/40 flex items-center justify-between text-xs text-[#f59e0b]">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4 text-[#f59e0b]" />
              <span>Défi de la semaine : Cette phrase compte pour votre progression !</span>
            </div>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-[#1c100a] text-white">
              +{activeChallenge.xpReward} XP
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-7 space-y-6">
          {/* Myènè Original Highlight */}
          <div className="bg-[#241208] border-2 border-[#d97706]/40 rounded-2xl p-4 sm:p-5 relative shadow-inner">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#f59e0b]">
                Traduction proposée en langue Myènè :
              </span>
              <button
                type="button"
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-xs text-[#fed7aa]/80 hover:text-[#fed7aa] flex items-center gap-1 transition-colors"
              >
                <Info className="w-3.5 h-3.5 text-[#f59e0b]" />
                <span>{showExplanation ? 'Masquer contexte' : 'Contexte culturel'}</span>
              </button>
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold text-[#fff7ed] tracking-wide font-serif py-1">
              {item.myeneText}
            </div>

            {showExplanation && (
              <div className="mt-3 pt-3 border-t border-[#4a2412] text-xs text-[#d4af94] leading-relaxed bg-[#180d07]/60 p-3 rounded-xl">
                <p className="font-semibold text-[#f59e0b] mb-1">Mémoire & Origines :</p>
                {item.contextNotes}
              </div>
            )}
          </div>

          {/* STEP 1: Orthography Verification */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#fed7aa]">
              <span className="w-6 h-6 rounded-full bg-[#c85a32] text-white flex items-center justify-center text-xs shrink-0">
                1
              </span>
              <span>L’orthographe est-elle bien écrite en langue Myènè ?</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSpellingDecision('correct')}
                className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border font-medium text-sm transition-all ${
                  spellingDecision === 'correct'
                    ? 'bg-[#15803d]/30 border-[#22c55e] text-[#86efac] shadow-lg ring-1 ring-[#22c55e]'
                    : 'bg-[#27150c] border-[#4a2412] text-[#f5ebe6] hover:bg-[#341b10] hover:border-[#d97706]/40'
                }`}
              >
                <Check className="w-4 h-4 text-[#22c55e]" />
                <span>Oui, c’est bien écrit 👍</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSpellingDecision('propose');
                  if (!proposedText) setProposedText(item.myeneText);
                }}
                className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border font-medium text-sm transition-all ${
                  spellingDecision === 'propose'
                    ? 'bg-[#c85a32]/30 border-[#c85a32] text-[#fed7aa] shadow-lg ring-1 ring-[#c85a32]'
                    : 'bg-[#27150c] border-[#4a2412] text-[#f5ebe6] hover:bg-[#341b10] hover:border-[#d97706]/40'
                }`}
              >
                <Edit3 className="w-4 h-4 text-[#f59e0b]" />
                <span>Je propose ma version ✍️</span>
              </button>
            </div>

            {/* Input if user wants to propose alternative Myènè orthography */}
            {spellingDecision === 'propose' && (
              <div className="mt-3 p-4 bg-[#1f0f08] border border-[#c85a32]/40 rounded-2xl space-y-3 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-semibold text-[#fed7aa] mb-1.5">
                    Votre version exacte en langue Myènè :
                  </label>
                  <input
                    type="text"
                    value={proposedText}
                    onChange={(e) => setProposedText(e.target.value)}
                    placeholder="Ex: Mbolo vana..."
                    className="w-full px-4 py-2.5 bg-[#140a05] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-[#f59e0b] text-base font-serif"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#a8826d] mb-1">
                      Variante tribale :
                    </label>
                    <select
                      value={dialectVariant}
                      onChange={(e) => setDialectVariant(e.target.value)}
                      className="w-full px-3 py-2 bg-[#140a05] border border-[#522915] rounded-xl text-xs text-[#fed7aa] focus:outline-none focus:border-[#f59e0b]"
                    >
                      <option value="enenga">Tribu Enenga (Lambaréné & Lacs)</option>
                      <option value="mpongwe">Tribu Mpongwè (Estuaire / Libreville)</option>
                      <option value="galwa">Tribu Galwa (Lambaréné fleuve)</option>
                      <option value="nkomi">Tribu Nkomi (Fernan Vaz)</option>
                      <option value="orungu">Tribu Orungu (Port-Gentil)</option>
                      <option value="adyumba">Tribu Adyumba (Lac Azingo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#a8826d] mb-1">
                      Explication / Note facultative :
                    </label>
                    <input
                      type="text"
                      value={contributorNotes}
                      onChange={(e) => setContributorNotes(e.target.value)}
                      placeholder="Nuance locale ou prononciation des aînés..."
                      className="w-full px-3 py-2 bg-[#140a05] border border-[#522915] rounded-xl text-xs text-white focus:outline-none focus:border-[#f59e0b]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: French Meaning, Alternative Phrasing, or Secondary Meaning (Before saying the Myènè text) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2 text-sm font-bold text-[#fed7aa]">
                <span className="w-6 h-6 rounded-full bg-[#f59e0b] text-[#180d07] flex items-center justify-center text-xs font-black shrink-0">
                  2
                </span>
                <span>Avant de dire le texte en Myènè : la signification en français est-elle exacte ?</span>
              </div>
              <span className="text-[10px] font-bold text-[#fde047] bg-[#f59e0b]/15 border border-[#f59e0b]/30 px-2 py-0.5 rounded-full self-start sm:self-center">
                Sens • Autre tournure • Sens secondaire
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFrenchMeaningDecision('exact')}
                className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border font-medium text-sm transition-all ${
                  frenchMeaningDecision === 'exact'
                    ? 'bg-[#15803d]/30 border-[#22c55e] text-[#86efac] shadow-lg ring-1 ring-[#22c55e]'
                    : 'bg-[#27150c] border-[#4a2412] text-[#f5ebe6] hover:bg-[#341b10] hover:border-[#d97706]/40'
                }`}
              >
                <Check className="w-4 h-4 text-[#22c55e]" />
                <span>Oui, la signification est exacte 👍</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFrenchMeaningDecision('propose');
                }}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border font-medium text-xs sm:text-sm transition-all ${
                  frenchMeaningDecision === 'propose'
                    ? 'bg-[#f59e0b]/25 border-[#f59e0b] text-[#fde047] shadow-lg ring-1 ring-[#f59e0b]'
                    : 'bg-[#27150c] border-[#4a2412] text-[#f5ebe6] hover:bg-[#341b10] hover:border-[#d97706]/40'
                }`}
              >
                <MessageSquareQuote className="w-4 h-4 text-[#f59e0b] shrink-0" />
                <span>Proposer sa signification, autre tournure ou sens secondaire 💡</span>
              </button>
            </div>

            {frenchMeaningDecision === 'propose' && (
              <div className="mt-3 p-4 bg-[#1f0f08] border border-[#f59e0b]/40 rounded-2xl space-y-3.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold text-[#fde047]">
                    Quel type de précision souhaitez-vous apporter au sens français ?
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#f59e0b]/20 text-[#fde047]">
                    +20 XP bonus
                  </span>
                </div>

                {/* Nuance Type Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'correction_sens' as FrenchMeaningNuanceType,
                      label: '🎯 Signification plus exacte',
                      desc: 'Le sens affiché est imprécis'
                    },
                    {
                      id: 'autre_tournure' as FrenchMeaningNuanceType,
                      label: '🔄 Autre tournure française',
                      desc: 'Reformulation plus naturelle'
                    },
                    {
                      id: 'sens_secondaire' as FrenchMeaningNuanceType,
                      label: '🌿 Sens secondaire / figuré',
                      desc: 'Sens caché, littéral ou proverbe'
                    }
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFrenchMeaningType(option.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        frenchMeaningType === option.id
                          ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-white shadow'
                          : 'bg-[#140a05] border-[#522915] text-[#d4af94] hover:border-[#f59e0b]/50'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#fde047]">{option.label}</div>
                      <div className="text-[10px] text-[#a8826d] mt-0.5">{option.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Proposed French Meaning or Alternative Phrasing */}
                <div>
                  <label className="block text-xs font-semibold text-[#fed7aa] mb-1">
                    {frenchMeaningType === 'autre_tournure'
                      ? 'Votre autre tournure en français :'
                      : frenchMeaningType === 'sens_secondaire'
                      ? 'Signification principale (ou autre tournure) en français :'
                      : 'Votre signification exacte en français :'}
                  </label>
                  <input
                    type="text"
                    value={proposedFrenchMeaning}
                    onChange={(e) => setProposedFrenchMeaning(e.target.value)}
                    placeholder={`Au lieu de « ${item.frenchText} », comment le diriez-vous en français ?`}
                    className="w-full px-4 py-2.5 bg-[#140a05] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-[#f59e0b] text-sm"
                  />
                </div>

                {/* Secondary Meaning / Literal or Figurative Nuance */}
                <div>
                  <label className="block text-xs font-semibold text-[#fed7aa] mb-1">
                    Sens secondaire, sens littéral ou contexte d'emploi (facultatif) :
                  </label>
                  <input
                    type="text"
                    value={secondaryMeaning}
                    onChange={(e) => setSecondaryMeaning(e.target.value)}
                    placeholder="Ex: Sens littéral mot-à-mot, sens figuré chez les anciens, ou second sens selon le contexte..."
                    className="w-full px-4 py-2 bg-[#140a05] border border-[#522915] rounded-xl text-xs text-white focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: Voice Pronunciation Recording */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#fed7aa]">
              <span className="w-6 h-6 rounded-full bg-[#c85a32] text-white flex items-center justify-center text-xs shrink-0">
                3
              </span>
              <span>Dites le texte en Myènè (Enregistrez votre prononciation orale) :</span>
            </div>

            <AudioRecorder
              onRecordingComplete={handleAudioComplete}
              onReset={handleAudioReset}
            />
          </div>

          {/* Submission and Confirmation */}
          {isSubmittedSuccess ? (
            <div className="p-5 bg-[#14532d]/40 border border-[#22c55e]/50 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#22c55e]/20 flex items-center justify-center text-[#4ade80]">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Na vevi ! Félicitations pour votre contribution !</h3>
              <p className="text-xs text-[#bbf7d0]">
                Votre enregistrement, votre avis orthographique et vos précisions de sens enrichissent fidèlement le patrimoine linguistique Myènè.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleNextExpression}
                  className="px-6 py-2.5 rounded-xl terracotta-gradient text-white font-semibold text-sm shadow-lg flex items-center gap-2 active:scale-95 transition-transform"
                >
                  <span>Passer à l’expression suivante</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !spellingDecision}
                className="w-full py-4 rounded-2xl terracotta-gradient hover:opacity-95 text-white font-bold text-base shadow-xl flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Synchronisation en cours...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Valider & Transmettre la contribution</span>
                    <Sparkles className="w-4 h-4 text-[#fde047]" />
                  </>
                )}
              </button>

              {!isOnline && (
                <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-[#f59e0b]">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Mode hors-ligne : votre contribution sera stockée et envoyée dès reconnexion.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

