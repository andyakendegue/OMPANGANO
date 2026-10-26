import React, { useState, useMemo } from 'react';
import { 
  User, 
  Award, 
  Flame, 
  Sparkles, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Database, 
  Trash2, 
  LogOut, 
  Globe2, 
  MapPin, 
  Users, 
  Calendar,
  Edit,
  DownloadCloud,
  Scale,
  FileText,
  AlertCircle,
  Check,
  TrendingUp,
  BarChart3,
  Compass
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { UserProfile, Contribution } from '../types';
import { getLevelForXp } from '../services/seedData';

interface UserProfileViewProps {
  currentUser: UserProfile | null;
  contributions: Contribution[];
  onOpenAuth: () => void;
  onOpenOnboarding: () => void;
  onOpenTermsConsent?: () => void;
  onOpenOfflinePack: () => void;
  onOpenVisualGuide?: () => void;
  onSignOut: () => void;
  onToggleRole?: (newRole: 'user' | 'validator' | 'admin') => void;
  onClearOfflineCache: () => void;
}

type ChartRange = '7d' | '30d' | 'all';
type ChartMode = 'cumulative' | 'daily';

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  currentUser,
  contributions,
  onOpenAuth,
  onOpenOnboarding,
  onOpenTermsConsent,
  onOpenOfflinePack,
  onOpenVisualGuide,
  onSignOut,
  onToggleRole,
  onClearOfflineCache
}) => {
  const [chartRange, setChartRange] = useState<ChartRange>('30d');
  const [chartMode, setChartMode] = useState<ChartMode>('cumulative');

  const currentLevel = getLevelForXp(currentUser?.xp || 0);
  const myContributions = useMemo(
    () => contributions.filter(c => c.userId === currentUser?.id),
    [contributions, currentUser?.id]
  );
  const hasAcceptedTerms = !!(currentUser?.termsAccepted && currentUser?.dataUsageAccepted);

  const totalContributionsCount = Math.max(myContributions.length, currentUser?.contributionsCount || 0);
  const totalVoiceCount = Math.max(
    myContributions.filter(c => !!c.audioUrl).length,
    currentUser?.recordingsCount || 0
  );

  // Build time-series data for Recharts
  const chartData = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);

    // Map YYYY-MM-DD -> { total, audio, text }
    const dailyMap = new Map<string, { total: number; audio: number; text: number }>();

    const addEntry = (dateKey: string, isAudio: boolean, count = 1) => {
      const existing = dailyMap.get(dateKey) || { total: 0, audio: 0, text: 0 };
      existing.total += count;
      if (isAudio) {
        existing.audio += count;
      } else {
        existing.text += count;
      }
      dailyMap.set(dateKey, existing);
    };

    // 1. Add real contributions from state
    myContributions.forEach(c => {
      const parsed = c.createdAt ? new Date(c.createdAt) : now;
      const validDate = isNaN(parsed.getTime()) ? now : parsed;
      const key = validDate.toISOString().slice(0, 10);
      addEntry(key, !!c.audioUrl, 1);
    });

    // 2. Reconcile any historical profile counts not in the live session array
    const missingTotal = Math.max(0, (currentUser?.contributionsCount || 0) - myContributions.length);
    const recordedAudioInArray = myContributions.filter(c => !!c.audioUrl).length;
    const missingAudio = Math.min(
      missingTotal,
      Math.max(0, (currentUser?.recordingsCount || 0) - recordedAudioInArray)
    );

    if (missingTotal > 0) {
      const spanDays = 14;
      let audioRemaining = missingAudio;
      for (let i = 0; i < missingTotal; i++) {
        // Distribute deterministically across the last 14 days
        const daysAgo = Math.max(1, Math.round(((missingTotal - i) / missingTotal) * spanDays));
        const d = new Date(now);
        d.setDate(d.getDate() - daysAgo);
        const key = d.toISOString().slice(0, 10);
        const isAudio = audioRemaining > 0;
        if (isAudio) audioRemaining--;
        addEntry(key, isAudio, 1);
      }
    }

    // 3. Determine date window based on selected range
    let numDays = 30;
    if (chartRange === '7d') {
      numDays = 7;
    } else if (chartRange === '30d') {
      numDays = 30;
    } else {
      const allKeys = Array.from(dailyMap.keys()).sort();
      if (allKeys.length > 0) {
        const earliest = new Date(allKeys[0]);
        const diffDays = Math.ceil((now.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        numDays = Math.min(Math.max(diffDays, 14), 90);
      } else {
        numDays = 14;
      }
    }

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (numDays - 1));
    const startKey = startDate.toISOString().slice(0, 10);

    // Calculate baseline cumulative counts prior to startKey
    let runningTotal = 0;
    let runningAudio = 0;
    let runningText = 0;

    dailyMap.forEach((val, key) => {
      if (key < startKey) {
        runningTotal += val.total;
        runningAudio += val.audio;
        runningText += val.text;
      }
    });

    const points: Array<{
      dateKey: string;
      label: string;
      fullDate: string;
      quotidienTotal: number;
      quotidienAudio: number;
      quotidienTexte: number;
      cumulTotal: number;
      cumulAudio: number;
      cumulTexte: number;
    }> = [];

    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const dayStats = dailyMap.get(key) || { total: 0, audio: 0, text: 0 };

      runningTotal += dayStats.total;
      runningAudio += dayStats.audio;
      runningText += dayStats.text;

      const label = d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short'
      });
      const fullDate =
        key === todayKey
          ? `Aujourd'hui (${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })})`
          : d.toLocaleDateString('fr-FR', {
              weekday: 'short',
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            });

      points.push({
        dateKey: key,
        label,
        fullDate,
        quotidienTotal: dayStats.total,
        quotidienAudio: dayStats.audio,
        quotidienTexte: dayStats.text,
        cumulTotal: runningTotal,
        cumulAudio: runningAudio,
        cumulTexte: runningText
      });
    }

    return points;
  }, [myContributions, currentUser?.contributionsCount, currentUser?.recordingsCount, chartRange]);

  const periodAddedCount = useMemo(
    () => chartData.reduce((sum, pt) => sum + pt.quotidienTotal, 0),
    [chartData]
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-20">
      {/* Profile Card */}
      <div className="warm-card-gradient rounded-3xl p-6 border-2 border-[#d97706]/30 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl terracotta-gradient p-1 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-[#180d07] rounded-xl flex items-center justify-center text-2xl font-bold text-white">
                {(currentUser?.fullName || currentUser?.displayName || 'U').charAt(0).toUpperCase()}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">
                  {currentUser?.fullName || currentUser?.displayName || 'Visiteur OMPAGANO'}
                </h2>
                {currentUser?.role === 'admin' && (
                  <span className="text-[10px] bg-[#991b1b]/50 text-[#fca5a5] border border-[#ef4444]/40 px-2 py-0.5 rounded-full font-bold">
                    Aîné / Admin
                  </span>
                )}
              </div>

              <p className="text-xs text-[#f59e0b] font-medium mt-0.5">
                Niveau {currentLevel.index} : {currentLevel.name}
              </p>

              {currentUser?.contact && (
                <p className="text-xs text-[#a8826d] flex items-center gap-1.5 mt-1 font-mono">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{currentUser.contact}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {onOpenVisualGuide && (
              <button
                type="button"
                onClick={onOpenVisualGuide}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#27150c] hover:bg-[#381e11] text-[#fde047] border border-[#f59e0b]/40 text-xs font-semibold transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-[#f59e0b]" />
                <span>Guide & Objectifs</span>
              </button>
            )}
            <button
              onClick={onOpenOnboarding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#27150c] hover:bg-[#381e11] text-[#fed7aa] border border-[#4a2412] text-xs font-semibold transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>Modifier Généalogie</span>
            </button>
          </div>
        </div>

        {/* Filiation & Genealogical Summary Box */}
        <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#f59e0b] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5 border border-[#f59e0b]/40 shadow-sm shrink-0">
                <img src="/assets/aistudio/LOGO-symbole_1c65e221.png" alt="Sceau Ompangano" className="w-full h-full object-contain" />
              </span>
              <span>Filiation OMPAGANO Enregistrée</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#15803d]/30 text-[#86efac] border border-[#22c55e]/30 font-semibold">
              Certifiée Conforme
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[#a8826d] block text-[11px]">Tribu Myènè :</span>
              <span className="font-semibold text-white">{currentUser?.tribe || 'Enenga'}</span>
            </div>
            <div>
              <span className="text-[#a8826d] block text-[11px]">Clan Paternel :</span>
              <span className="font-semibold text-white">{currentUser?.paternalClan || 'Avandji'}</span>
            </div>
            <div>
              <span className="text-[#a8826d] block text-[11px]">Clan Maternel :</span>
              <span className="font-semibold text-white">{currentUser?.maternalClan || 'Imvona'}</span>
            </div>
            <div>
              <span className="text-[#a8826d] block text-[11px]">Village d'Origine :</span>
              <span className="font-semibold text-white">{currentUser?.villageOfOrigin || 'Lambaréné'}</span>
            </div>
            <div>
              <span className="text-[#a8826d] block text-[11px]">Lieu de Naissance :</span>
              <span className="font-semibold text-white">{currentUser?.birthPlace || 'Lambaréné'}</span>
            </div>
            <div>
              <span className="text-[#a8826d] block text-[11px]">Date de Naissance :</span>
              <span className="font-semibold text-white">{currentUser?.birthDate || 'Non spécifiée'}</span>
            </div>
          </div>
        </div>

        {/* Conditions Générales & Consentement d'Utilisation des Données (Contributeur Individuel) */}
        <div className={`p-4 rounded-2xl border space-y-3 ${
          hasAcceptedTerms
            ? 'bg-[#180d07] border-[#4a2412]'
            : 'bg-[#2a1509] border-[#f59e0b]/70 shadow-lg'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#f59e0b] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#f59e0b]" />
              <span>Conditions & Consentement d'Utilisation des Données</span>
            </span>

            {hasAcceptedTerms ? (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#15803d]/30 text-[#86efac] border border-[#22c55e]/40 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Signé & Validé</span>
              </span>
            ) : (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-[#fde047] border border-amber-500/50 font-bold flex items-center gap-1 animate-pulse">
                <AlertCircle className="w-3 h-3" />
                <span>Validation Requise (Rappel)</span>
              </span>
            )}
          </div>

          <p className="text-xs text-[#d4af94] leading-relaxed">
            Charte de Contribution Individuelle, Utilisation des Données et Système de Badges, Points & Récompenses <strong>OMPAGANO – Application NKALA</strong> (Essaka Engineering, Droit gabonais Loi n° 001/2011 & OAPI).
          </p>

          {hasAcceptedTerms && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs bg-[#24130a] p-3 rounded-xl border border-[#3b1d10]">
              <div>
                <span className="text-[#a8826d] block text-[10px]">Statut d'engagement :</span>
                <span className="font-semibold text-white">Contributeur Individuel Direct</span>
              </div>
              <div>
                <span className="text-[#a8826d] block text-[10px]">Validé le :</span>
                <span className="font-semibold text-white">
                  {currentUser?.termsAcceptedAt
                    ? new Date(currentUser.termsAcceptedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })
                    : 'Enregistré'}
                </span>
              </div>
              <div>
                <span className="text-[#a8826d] block text-[10px]">Autorisations accordées :</span>
                <span className="font-semibold text-[#86efac]">
                  Données IA ✓ • Voix {currentUser?.consentVoiceUsage !== false ? '✓' : 'Non'} • Image {currentUser?.consentImageUsage ? '✓' : 'Non'}
                </span>
              </div>
              <div>
                <span className="text-[#a8826d] block text-[10px]">Mention électronique :</span>
                <span className="font-mono text-[11px] text-[#fde047]">
                  {currentUser?.electronicSignature || `Lu et approuvé - ${currentUser?.fullName}`}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onOpenTermsConsent && (
              <button
                type="button"
                onClick={onOpenTermsConsent}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow ${
                  hasAcceptedTerms
                    ? 'bg-[#27150c] hover:bg-[#381e11] text-[#fed7aa] border border-[#522915]'
                    : 'terracotta-gradient text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#fde047]" />
                <span>
                  {hasAcceptedTerms
                    ? 'Relire ou Mettre à jour mon Consentement Individuel'
                    : 'Lire & Valider mes Conditions Maintenant'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 bg-[#180d07] rounded-2xl border border-[#3b1d10] text-center">
            <div className="text-xl font-black text-[#f59e0b]">{currentUser?.xp || 0}</div>
            <div className="text-[10px] text-[#a8826d] uppercase font-semibold">Points XP</div>
          </div>
          <div className="p-3 bg-[#180d07] rounded-2xl border border-[#3b1d10] text-center">
            <div className="text-xl font-black text-[#c85a32]">{totalContributionsCount}</div>
            <div className="text-[10px] text-[#a8826d] uppercase font-semibold">Contributions</div>
          </div>
          <div className="p-3 bg-[#180d07] rounded-2xl border border-[#3b1d10] text-center">
            <div className="text-xl font-black text-[#22c55e]">{totalVoiceCount}</div>
            <div className="text-[10px] text-[#a8826d] uppercase font-semibold">Voix données</div>
          </div>
        </div>

        {/* Recharts Contribution Progression Chart */}
        <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#f59e0b]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#f59e0b]">
                  Progression des Contributions au Fil du Temps
                </h3>
              </div>
              <p className="text-[11px] text-[#a8826d] mt-0.5">
                {chartMode === 'cumulative'
                  ? `Évolution cumulée (${totalContributionsCount} contribution${totalContributionsCount > 1 ? 's' : ''} au total)`
                  : `Activité par jour (+${periodAddedCount} contribution${periodAddedCount > 1 ? 's' : ''} sur la période)`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Mode selector */}
              <div className="inline-flex rounded-xl bg-[#24130a] p-0.5 border border-[#3b1d10]">
                <button
                  type="button"
                  onClick={() => setChartMode('cumulative')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                    chartMode === 'cumulative'
                      ? 'bg-[#f59e0b] text-[#180d07] shadow'
                      : 'text-[#d4af94] hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>Cumulé</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('daily')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                    chartMode === 'daily'
                      ? 'bg-[#f59e0b] text-[#180d07] shadow'
                      : 'text-[#d4af94] hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Quotidien</span>
                </button>
              </div>

              {/* Range selector */}
              <div className="inline-flex rounded-xl bg-[#24130a] p-0.5 border border-[#3b1d10]">
                {(
                  [
                    { id: '7d', label: '7j' },
                    { id: '30d', label: '30j' },
                    { id: 'all', label: 'Tout' }
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setChartRange(tab.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                      chartRange === tab.id
                        ? 'bg-[#c85a32] text-white shadow'
                        : 'text-[#a8826d] hover:text-[#fed7aa]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'cumulative' ? (
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCumulTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="colorCumulAudio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3b1d10" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#a8826d"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#3b1d10' }}
                    minTickGap={16}
                  />
                  <YAxis
                    stroke="#a8826d"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#24130a',
                      borderColor: '#f59e0b',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#fdfaf7'
                    }}
                    labelFormatter={(_, payload) =>
                      payload && payload[0]?.payload?.fullDate
                        ? payload[0].payload.fullDate
                        : ''
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulTotal"
                    name="Total Contributions"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCumulTotal)"
                    activeDot={{ r: 5, fill: '#f59e0b', stroke: '#180d07', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulAudio"
                    name="Voix enregistrées"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCumulAudio)"
                    activeDot={{ r: 4, fill: '#22c55e', stroke: '#180d07', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3b1d10" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#a8826d"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#3b1d10' }}
                    minTickGap={16}
                  />
                  <YAxis
                    stroke="#a8826d"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#24130a',
                      borderColor: '#f59e0b',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#fdfaf7'
                    }}
                    labelFormatter={(_, payload) =>
                      payload && payload[0]?.payload?.fullDate
                        ? payload[0].payload.fullDate
                        : ''
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="quotidienAudio"
                    name="Voix enregistrées"
                    stackId="daily"
                    fill="#22c55e"
                    radius={[0, 0, 4, 4]}
                  />
                  <Bar
                    dataKey="quotidienTexte"
                    name="Écrit & Orthographe"
                    stackId="daily"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Role Badge & Status */}
        <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#f59e0b]" />
            <div>
              <span className="text-xs font-semibold text-[#fed7aa] block">Statut & Privilèges :</span>
              <span className="text-[11px] text-[#a8826d]">Attribué par l'administration OMPAGANO</span>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
            currentUser?.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
            currentUser?.role === 'validator' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
            'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          }`}>
            {currentUser?.role === 'admin' ? '👑 Administrateur' : currentUser?.role === 'validator' ? '🔍 Validateur Certifié' : '✍️ Contributeur'}
          </span>
        </div>

        {/* Offline Cache & Diagnostics */}
        <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-3">
          <div className="flex items-center justify-between text-xs text-[#fed7aa]">
            <span className="flex items-center gap-1.5 font-semibold">
              <Database className="w-4 h-4 text-[#c85a32]" />
              <span>Stockage Hors-ligne & PWA :</span>
            </span>
            <button
              onClick={onOpenOfflinePack}
              className="text-[11px] text-[#f59e0b] hover:underline flex items-center gap-1"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Gérer le pack</span>
            </button>
          </div>
          <button
            onClick={onClearOfflineCache}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#27150c] hover:bg-[#7f1d1d] text-xs text-[#fca5a5] border border-[#ef4444]/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vider le cache hors-ligne</span>
          </button>
        </div>

        {/* Auth action */}
        <div className="pt-2 flex justify-between items-center">
          {currentUser ? (
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-xs text-[#f87171] hover:underline"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full py-3 rounded-2xl terracotta-gradient text-white font-bold text-sm shadow-md"
            >
              Se connecter (Gmail / Téléphone)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
