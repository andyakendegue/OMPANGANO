import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  Volume2, 
  FileText, 
  Mic, 
  Sparkles, 
  Filter, 
  Search, 
  Check, 
  User, 
  ThumbsUp, 
  ThumbsDown,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Contribution, ContributionStatus, UserProfile } from '../types';

interface ValidatorWorkspaceProps {
  contributions: Contribution[];
  currentUser: UserProfile | null;
  onValidateGranular: (
    contributionId: string,
    payload: {
      status: ContributionStatus;
      spellingVerdict: 'correct' | 'incorrect';
      pronunciationVerdict: 'correct' | 'incorrect' | 'no_audio';
      notes?: string;
    }
  ) => Promise<void>;
}

export const ValidatorWorkspace: React.FC<ValidatorWorkspaceProps> = ({
  contributions,
  currentUser,
  onValidateGranular
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tribeFilter, setTribeFilter] = useState<string>('all');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Local state for evaluations being edited in the cards
  const [cardEvaluations, setCardEvaluations] = useState<{
    [id: string]: {
      spelling: 'correct' | 'incorrect';
      pronunciation: 'correct' | 'incorrect' | 'no_audio';
      notes: string;
      isSubmitting?: boolean;
    };
  }>({});

  const handlePlayAudio = (id: string, url?: string) => {
    if (!url) return;
    if (playingAudioId === id) {
      if (audioElement) {
        audioElement.pause();
        setPlayingAudioId(null);
      }
      return;
    }

    if (audioElement) audioElement.pause();
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudioId(null);
    audio.play().catch(e => console.warn('Erreur lecture audio:', e));
    setAudioElement(audio);
    setPlayingAudioId(id);
  };

  const getEvaluationState = (c: Contribution): {
    spelling: 'correct' | 'incorrect';
    pronunciation: 'correct' | 'incorrect' | 'no_audio';
    notes: string;
    isSubmitting: boolean;
  } => {
    if (cardEvaluations[c.id]) {
      return {
        spelling: cardEvaluations[c.id].spelling,
        pronunciation: cardEvaluations[c.id].pronunciation,
        notes: cardEvaluations[c.id].notes,
        isSubmitting: !!cardEvaluations[c.id].isSubmitting
      };
    }
    const defaultPronunciation: 'correct' | 'incorrect' | 'no_audio' = 
      !c.audioUrl ? 'no_audio' : (c.pronunciationVerdict === 'incorrect' ? 'incorrect' : 'correct');
    const defaultSpelling: 'correct' | 'incorrect' = 
      (c.spellingVerdict === 'incorrect' || c.isSpellingCorrect === false) ? 'incorrect' : 'correct';
    return {
      spelling: defaultSpelling,
      pronunciation: defaultPronunciation,
      notes: c.validatorNotes || '',
      isSubmitting: false
    };
  };

  const updateCardEvaluation = (id: string, patch: Partial<{
    spelling: 'correct' | 'incorrect';
    pronunciation: 'correct' | 'incorrect' | 'no_audio';
    notes: string;
    isSubmitting?: boolean;
  }>) => {
    setCardEvaluations(prev => {
      const current = prev[id] || {
        spelling: 'correct',
        pronunciation: 'correct',
        notes: ''
      };
      return {
        ...prev,
        [id]: { ...current, ...patch }
      };
    });
  };

  const handleCommitEvaluation = async (c: Contribution) => {
    const currentEval = getEvaluationState(c);
    updateCardEvaluation(c.id, { isSubmitting: true });

    let finalStatus: ContributionStatus = 'approved';

    if (currentEval.spelling === 'correct' && currentEval.pronunciation === 'correct') {
      finalStatus = 'approved';
    } else if (currentEval.spelling === 'correct' && currentEval.pronunciation === 'no_audio') {
      finalStatus = 'approved';
    } else if (currentEval.spelling === 'incorrect' && currentEval.pronunciation === 'correct') {
      // NUANCE DEMANDÉE : La prononciation est bonne mais il a mal écrit
      finalStatus = 'audio_approved_text_revision';
    } else if (currentEval.spelling === 'correct' && currentEval.pronunciation === 'incorrect') {
      // NUANCE DEMANDÉE : L'écrit peut être bon mais pas la prononciation
      finalStatus = 'text_approved_audio_revision';
    } else {
      finalStatus = 'rejected';
    }

    await onValidateGranular(c.id, {
      status: finalStatus,
      spellingVerdict: currentEval.spelling,
      pronunciationVerdict: currentEval.pronunciation,
      notes: currentEval.notes
    });

    updateCardEvaluation(c.id, { isSubmitting: false });
  };

  // Filter contributions
  const filteredContributions = contributions.filter(c => {
    if (filterStatus === 'pending' && c.status !== 'pending') return false;
    if (filterStatus === 'approved' && c.status !== 'approved') return false;
    if (filterStatus === 'nuance_audio' && c.status !== 'audio_approved_text_revision') return false;
    if (filterStatus === 'nuance_text' && c.status !== 'text_approved_audio_revision') return false;
    if (filterStatus === 'rejected' && c.status !== 'rejected') return false;

    if (tribeFilter !== 'all' && (c.userTribe || '').toLowerCase() !== tribeFilter.toLowerCase()) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = (c.frenchText || '').toLowerCase().includes(q) ||
        (c.originalMyeneText || '').toLowerCase().includes(q) ||
        (c.proposedSpelling || '').toLowerCase().includes(q) ||
        (c.proposedFrenchMeaning || '').toLowerCase().includes(q) ||
        (c.secondaryMeaning || '').toLowerCase().includes(q) ||
        (c.userDisplayName || '').toLowerCase().includes(q) ||
        (c.comment || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const pendingCount = contributions.filter(c => c.status === 'pending').length;
  const audioApprovedCount = contributions.filter(c => c.status === 'audio_approved_text_revision').length;
  const textApprovedCount = contributions.filter(c => c.status === 'text_approved_audio_revision').length;
  const fullyApprovedCount = contributions.filter(c => c.status === 'approved').length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Banner */}
      <div className="warm-card-gradient rounded-3xl p-5 sm:p-6 border border-[#d97706]/30 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-[#c85a32] via-[#f59e0b] to-[#0d9488] shadow-lg shrink-0 hidden sm:block">
              <div className="w-full h-full bg-white rounded-[14px] overflow-hidden flex items-center justify-center p-0.5 shadow-inner">
                <img 
                  src="/assets/aistudio/LOGO-symbole_1c65e221.png" 
                  alt="Logo OMPAGANO" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Studio de Relecture & Validation des Aînés</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Validation Linguistique Myènè
              </h1>
              <p className="text-xs sm:text-sm text-[#d4af94] mt-0.5">
                Évaluez avec nuance la justesse de l'écrit, du sens français et l'authenticité de la prononciation orale.
              </p>
            </div>
          </div>

          <div className="p-3 bg-[#180d07] rounded-2xl border border-[#4a2412] text-right shrink-0">
            <span className="text-[10px] text-[#a8826d] uppercase font-bold block">En Attente d'Examen</span>
            <span className="text-2xl font-black text-amber-400 font-mono">{pendingCount}</span>
          </div>
        </div>

        {/* Nuance Guide Box */}
        <div className="p-4 rounded-2xl bg-[#180d07]/90 border border-[#4a2412] text-xs text-[#fed7aa] space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <Info className="w-4 h-4" />
            <span>Règle de validation nuancée (Oral vs Écrit) :</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#d4af94]">
            <div className="p-2.5 rounded-xl bg-[#27150c] border border-[#3b1d10]">
              <span className="text-emerald-300 font-bold block mb-0.5">🎙️ Cas 1 : Prononciation bonne, mais mal écrit</span>
              L'enregistrement audio est clair et juste, mais la graphie comporte une faute. La voix est validée et archivée, tandis que l'écrit est renvoyé en révision.
            </div>
            <div className="p-2.5 rounded-xl bg-[#27150c] border border-[#3b1d10]">
              <span className="text-sky-300 font-bold block mb-0.5">✍️ Cas 2 : Écrit bon, mais mauvaise prononciation</span>
              L'orthographe et la variante sont impeccables, mais le ton, l'intonation ou la qualité sonore est à refaire. Le texte est validé et la voix est demandée à réenregistrer.
            </div>
          </div>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <button
          onClick={() => setFilterStatus('pending')}
          className={`p-3.5 rounded-2xl border text-left transition ${
            filterStatus === 'pending'
              ? 'bg-amber-600/30 border-amber-500 text-white'
              : 'bg-[#180d07] border-[#3b1d10] text-[#a8826d]'
          }`}
        >
          <span className="text-[11px] block">À Examiner</span>
          <span className="text-xl font-bold text-amber-400">{pendingCount}</span>
        </button>

        <button
          onClick={() => setFilterStatus('approved')}
          className={`p-3.5 rounded-2xl border text-left transition ${
            filterStatus === 'approved'
              ? 'bg-emerald-600/30 border-emerald-500 text-white'
              : 'bg-[#180d07] border-[#3b1d10] text-[#a8826d]'
          }`}
        >
          <span className="text-[11px] block">100% Validés (Oral + Écrit)</span>
          <span className="text-xl font-bold text-emerald-400">{fullyApprovedCount}</span>
        </button>

        <button
          onClick={() => setFilterStatus('nuance_audio')}
          className={`p-3.5 rounded-2xl border text-left transition ${
            filterStatus === 'nuance_audio'
              ? 'bg-emerald-600/30 border-emerald-500 text-white'
              : 'bg-[#180d07] border-[#3b1d10] text-[#a8826d]'
          }`}
        >
          <span className="text-[11px] block">🎙️ Voix Bonne (Écrit à corriger)</span>
          <span className="text-xl font-bold text-teal-300">{audioApprovedCount}</span>
        </button>

        <button
          onClick={() => setFilterStatus('nuance_text')}
          className={`p-3.5 rounded-2xl border text-left transition ${
            filterStatus === 'nuance_text'
              ? 'bg-sky-600/30 border-sky-500 text-white'
              : 'bg-[#180d07] border-[#3b1d10] text-[#a8826d]'
          }`}
        >
          <span className="text-[11px] block">✍️ Écrit Bon (Voix à refaire)</span>
          <span className="text-xl font-bold text-sky-400">{textApprovedCount}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#a8826d] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par expression française, mot Myènè, sens proposé, locuteur..."
            className="w-full pl-9 pr-3 py-2 bg-[#180d07] border border-[#4a2412] rounded-xl text-xs text-white focus:outline-none focus:border-[#f59e0b]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={tribeFilter}
            onChange={(e) => setTribeFilter(e.target.value)}
            className="px-3 py-2 bg-[#180d07] border border-[#4a2412] rounded-xl text-[#fed7aa] focus:outline-none"
          >
            <option value="all">Toutes les Tribus Myènè</option>
            <option value="Enenga">Tribu Enenga</option>
            <option value="Mpongwè">Tribu Mpongwè</option>
            <option value="Galoa">Tribu Galoa</option>
            <option value="Nkomi">Tribu Nkomi</option>
            <option value="Ôrungu">Tribu Ôrungu</option>
            <option value="Adyumba">Tribu Adyumba</option>
          </select>

          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              filterStatus === 'all' ? 'bg-[#c85a32] text-white' : 'bg-[#27150c] text-[#a8826d]'
            }`}
          >
            Toutes ({contributions.length})
          </button>
        </div>
      </div>

      {/* Contributions List to Validate */}
      {filteredContributions.length === 0 ? (
        <div className="text-center py-12 warm-card-gradient rounded-3xl border border-[#4a2412] p-8 space-y-2">
          <CheckCircle className="w-12 h-12 text-[#22c55e] mx-auto opacity-80" />
          <h3 className="text-base font-bold text-white">Aucune contribution en attente</h3>
          <p className="text-xs text-[#a8826d]">
            Toutes les réponses de ce filtre ont été traitées ou aucun résultat ne correspond à la recherche.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContributions.map(c => {
            const currentEval = getEvaluationState(c);
            const hasAudio = !!c.audioUrl;

            // Compute verdict label
            let verdictLabel = '';
            let verdictColor = '';
            if (currentEval.spelling === 'correct' && (currentEval.pronunciation === 'correct' || currentEval.pronunciation === 'no_audio')) {
              verdictLabel = '✨ Prêt à valider : Tout est correct';
              verdictColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40';
            } else if (currentEval.spelling === 'incorrect' && currentEval.pronunciation === 'correct') {
              verdictLabel = '🎙️ Nuance : Prononciation retenue • Orthographe à corriger';
              verdictColor = 'text-amber-300 bg-amber-950/40 border-amber-500/40';
            } else if (currentEval.spelling === 'correct' && currentEval.pronunciation === 'incorrect') {
              verdictLabel = '✍️ Nuance : Écrit validé • Prononciation à réenregistrer';
              verdictColor = 'text-sky-300 bg-sky-950/40 border-sky-500/40';
            } else {
              verdictLabel = '❌ À rejeter : Écrit et prononciation non conformes';
              verdictColor = 'text-rose-400 bg-rose-950/40 border-rose-500/40';
            }

            return (
              <div 
                key={c.id} 
                className="warm-card-gradient border border-[#4a2412] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4"
              >
                {/* Header: Expression & Author */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3b1d10] pb-3">
                  <div>
                    <span className="text-xs font-bold text-[#f59e0b] block">Expression Française :</span>
                    <h3 className="text-base font-bold text-white">« {c.frenchText} »</h3>
                    <div className="text-xs text-[#d4af94] font-serif mt-0.5">
                      Texte initial Myènè : <strong>{c.originalMyeneText}</strong>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-stone-300 font-semibold block">{c.userDisplayName}</span>
                    <span className="text-[11px] text-[#a8826d]">
                      {c.userTribe ? `Tribu ${c.userTribe}` : 'Tribu non renseignée'} • {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Dual Column: Écrit vs Oral */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Column 1: Évaluation de l'ÉCRIT */}
                  <div className="p-4 bg-[#180d07] rounded-2xl border border-[#3b1d10] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#fed7aa] flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#f59e0b]" />
                        <span>1. Évaluation de l'Écrit & du Sens</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        currentEval.spelling === 'correct' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {currentEval.spelling === 'correct' ? 'Écrit Valide ✅' : 'Écrit Incorrect ❌'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5">
                      <div className="p-2.5 rounded-xl bg-[#27150c] border border-[#4a2412] space-y-1">
                        <div>
                          <span className="text-[10px] text-[#a8826d] block uppercase font-bold">Proposition orthographique Myènè :</span>
                          <div className="text-sm font-bold font-serif text-amber-200 mt-0.5">
                            {c.proposedSpelling || c.originalMyeneText}
                          </div>
                        </div>
                        {c.dialectVariant && (
                          <div className="text-[10px] text-[#a8826d]">
                            Variante dialectale signalée : <em>{c.dialectVariant}</em>
                          </div>
                        )}
                        {(c.proposedFrenchMeaning || c.secondaryMeaning) && (
                          <div className="mt-1.5 pt-1.5 border-t border-[#3b1d10] space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#fde047] block">
                              💡 Précision sur la signification en français ({
                                c.frenchMeaningType === 'autre_tournure'
                                  ? 'Autre tournure'
                                  : c.frenchMeaningType === 'sens_secondaire'
                                  ? 'Sens secondaire'
                                  : 'Signification corrigée'
                              }) :
                            </span>
                            {c.proposedFrenchMeaning && (
                              <div className="text-xs text-white font-semibold">
                                Sens / Tournure : « {c.proposedFrenchMeaning} »
                              </div>
                            )}
                            {c.secondaryMeaning && (
                              <div className="text-[11px] text-emerald-300">
                                Sens secondaire / figuré : « {c.secondaryMeaning} »
                              </div>
                            )}
                          </div>
                        )}
                        {c.comment && (
                          <div className="text-[11px] text-stone-300 italic mt-1 border-t border-[#3b1d10] pt-1">
                            « {c.comment} »
                          </div>
                        )}
                      </div>

                      {/* Toggles for Spelling */}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => updateCardEvaluation(c.id, { spelling: 'correct' })}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                            currentEval.spelling === 'correct'
                              ? 'bg-emerald-600 text-white shadow'
                              : 'bg-[#27150c] text-stone-400 hover:text-white'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>L'écrit est bon</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCardEvaluation(c.id, { spelling: 'incorrect' })}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                            currentEval.spelling === 'incorrect'
                              ? 'bg-rose-700 text-white shadow'
                              : 'bg-[#27150c] text-stone-400 hover:text-white'
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>Mal écrit / Faute</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Évaluation de la PRONONCIATION */}
                  <div className="p-4 bg-[#180d07] rounded-2xl border border-[#3b1d10] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#fed7aa] flex items-center gap-1.5">
                        <Mic className="w-4 h-4 text-[#22c55e]" />
                        <span>2. Évaluation de l'Oral</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        !hasAudio ? 'bg-stone-700 text-stone-400' :
                        currentEval.pronunciation === 'correct' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {!hasAudio ? 'Sans Audio' : currentEval.pronunciation === 'correct' ? 'Prononciation Bonne 🎙️' : 'Mauvaise Prononciation ❌'}
                      </span>
                    </div>

                    <div className="text-xs space-y-2">
                      {hasAudio ? (
                        <>
                          <div className="p-3 rounded-xl bg-[#27150c] border border-[#4a2412] flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(c.id, c.audioUrl)}
                              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow active:scale-95 transition"
                            >
                              {playingAudioId === c.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              <span>{playingAudioId === c.id ? 'Mettre en pause' : 'Écouter la voix'}</span>
                            </button>
                            <span className="text-[11px] text-[#a8826d] font-mono">
                              {c.audioDuration ? `${Math.round(c.audioDuration)} sec` : 'Audio WAV/WebM'}
                            </span>
                          </div>

                          {/* Toggles for Pronunciation */}
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => updateCardEvaluation(c.id, { pronunciation: 'correct' })}
                              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                                currentEval.pronunciation === 'correct'
                                  ? 'bg-emerald-600 text-white shadow'
                                  : 'bg-[#27150c] text-stone-400 hover:text-white'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>Prononciation bonne</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateCardEvaluation(c.id, { pronunciation: 'incorrect' })}
                              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                                currentEval.pronunciation === 'incorrect'
                                  ? 'bg-rose-700 text-white shadow'
                                  : 'bg-[#27150c] text-stone-400 hover:text-white'
                              }`}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                              <span>À réenregistrer</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 rounded-xl bg-[#27150c]/60 border border-[#3b1d10] text-center text-[#a8826d] text-xs">
                          Aucun enregistrement vocal joint à cette proposition.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Synthesis verdict bar & Notes */}
                <div className="space-y-3 pt-2">
                  <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between ${verdictColor}`}>
                    <span>{verdictLabel}</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-80">Synthèse automatique</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#fed7aa] mb-1">
                      Remarque bienveillante du validateur à l'attention du contributeur (optionnel) :
                    </label>
                    <input
                      type="text"
                      value={currentEval.notes}
                      onChange={(e) => updateCardEvaluation(c.id, { notes: e.target.value })}
                      placeholder="Ex: La voyelle finale doit être allongée / Attention au ton descendant sur l'avant-dernière syllabe..."
                      className="w-full px-3 py-2 bg-[#180d07] border border-[#4a2412] rounded-xl text-xs text-white focus:outline-none focus:border-[#f59e0b]"
                    />
                  </div>

                  {/* Commit button */}
                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      disabled={currentEval.isSubmitting}
                      onClick={() => handleCommitEvaluation(c)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl terracotta-gradient hover:opacity-95 text-white font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{currentEval.isSubmitting ? 'Validation en cours...' : 'Enregistrer la décision du Validateur'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
