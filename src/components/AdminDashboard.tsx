import React, { useState } from 'react';
import { 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Users, 
  Mic, 
  FileText, 
  Sparkles, 
  Check, 
  Zap, 
  Search,
  Filter,
  Award,
  ShieldAlert,
  ShieldCheck,
  UserX,
  UserCheck,
  Sliders,
  Trophy,
  Upload,
  Globe,
  Layers,
  Palette,
  Download,
  Crown,
  UserCog,
  FileSpreadsheet,
  Compass
} from 'lucide-react';
import { 
  QuestionnaireItem, 
  Contribution, 
  SystemMetric, 
  UserProfile,
  WeeklyChallenge,
  ThemeDefinition,
  Badge,
  UserRole,
  ClanRegistry,
  VillageRegistry,
  SeedStatus
} from '../types';
import { SYSTEM_BADGES, USER_LEVELS, calculateSuspicionScore, THEMATIC_CATEGORIES } from '../services/seedData';
import { CsvImportSection } from './CsvImportSection';
import { WeeklyChallengesAdmin } from './WeeklyChallengesAdmin';
import { ThemeManagerAdmin } from './ThemeManagerAdmin';
import { BadgesManagerAdmin } from './BadgesManagerAdmin';
import { HostingCustomDomainAdmin } from './HostingCustomDomainAdmin';
import { ClanVillageAdmin } from './ClanVillageAdmin';

interface AdminDashboardProps {
  items: QuestionnaireItem[];
  contributions: Contribution[];
  systemMetrics: SystemMetric;
  usersList: UserProfile[];
  challenges: WeeklyChallenge[];
  themes?: ThemeDefinition[];
  badges?: Badge[];
  clans: ClanRegistry[];
  villages: VillageRegistry[];
  onValidateContribution: (contributionId: string, status: 'approved' | 'rejected' | 'needs_revision', notes?: string) => Promise<void>;
  onDeleteContribution?: (contributionId: string) => Promise<void>;
  onSaveQuestionnaireItem: (item: Partial<QuestionnaireItem>) => Promise<void>;
  onDeleteQuestionnaireItem: (itemId: string) => Promise<void>;
  onBatchImportItems: (newItems: QuestionnaireItem[]) => Promise<void>;
  onSaveChallenge: (challenge: Partial<WeeklyChallenge>) => Promise<void>;
  onDeleteChallenge: (challengeId: string) => Promise<void>;
  onToggleActiveChallenge: (challengeId: string, currentStatus: boolean) => Promise<void>;
  onSaveTheme?: (theme: Partial<ThemeDefinition>) => Promise<void>;
  onDeleteTheme?: (themeId: string) => Promise<void>;
  onBatchRegisterThemes?: (newThemes: ThemeDefinition[]) => Promise<void>;
  onSaveBadge?: (badge: Partial<Badge>) => Promise<void>;
  onDeleteBadge?: (badgeId: string) => Promise<void>;
  onSaveClan: (clan: Partial<ClanRegistry>) => Promise<void>;
  onDeleteClan: (clanId: string) => Promise<void>;
  onSaveVillage: (village: Partial<VillageRegistry>) => Promise<void>;
  onDeleteVillage: (villageId: string) => Promise<void>;
  onUpdateUserLevelAndBadges: (userId: string, newLevelIndex: number, badges: string[], bonusXp?: number) => Promise<void>;
  onUpdateUserAccountStatus: (userId: string, status: 'active' | 'flagged' | 'suspended') => Promise<void>;
  onUpdateUserRole?: (userId: string, newRole: UserRole) => Promise<void>;
  onTriggerCloudSync: () => Promise<void>;
  currentUser: UserProfile | null;
  seedStatus?: SeedStatus | null;
  onExecuteInitialSeed?: () => Promise<void>;
  isSeedingDatabase?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  items,
  contributions,
  systemMetrics,
  usersList,
  challenges,
  themes = THEMATIC_CATEGORIES,
  badges = SYSTEM_BADGES,
  clans,
  villages,
  onValidateContribution,
  onDeleteContribution,
  onSaveQuestionnaireItem,
  onDeleteQuestionnaireItem,
  onBatchImportItems,
  onSaveChallenge,
  onDeleteChallenge,
  onToggleActiveChallenge,
  onSaveTheme,
  onDeleteTheme,
  onBatchRegisterThemes,
  onSaveBadge,
  onDeleteBadge,
  onSaveClan,
  onDeleteClan,
  onSaveVillage,
  onDeleteVillage,
  onUpdateUserLevelAndBadges,
  onUpdateUserAccountStatus,
  onUpdateUserRole,
  onTriggerCloudSync,
  currentUser,
  seedStatus,
  onExecuteInitialSeed,
  isSeedingDatabase = false
}) => {
  const [activeTab, setActiveTab] = useState<
    'stats' | 'users' | 'validation' | 'clans_villages' | 'defis' | 'themes' | 'badges_manager' | 'hosting' | 'csv_import' | 'questionnaires' | 'badges_levels' | 'fraud_detection'
  >('stats');

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Validation & Responses Management Filters
  const [validationFilter, setValidationFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('all');
  const [responseAudioFilter, setResponseAudioFilter] = useState<'all' | 'with_audio' | 'text_only'>('all');
  const [responseSearchQuery, setResponseSearchQuery] = useState('');
  const [validationNote, setValidationNote] = useState<{ [id: string]: string }>({});

  // Questionnaire form states
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    frenchText: '',
    myeneText: '',
    category: 'vie_quotidienne',
    difficulty: 'intermediaire' as 'debutant' | 'intermediaire' | 'avance',
    contextNotes: '',
    imageUrl: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=800&q=80',
    dialect: 'enenga'
  });

  // User & Role Management Filters
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'validator' | 'user'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'flagged' | 'suspended'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Badges & Levels state
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [userBonusXp, setUserBonusXp] = useState(100);

  // Fraud state
  const [fraudFilter, setFraudFilter] = useState<'all' | 'critical' | 'moderate'>('all');
  const [fraudSearchQuery, setFraudSearchQuery] = useState('');

  // Audio Playback
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

  // Questionnaire Submit
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.frenchText.trim() || !formData.myeneText.trim()) {
      alert('Veuillez renseigner le texte français et la traduction Myènè.');
      return;
    }

    await onSaveQuestionnaireItem({
      id: editingItemId || undefined,
      ...formData
    });

    setIsEditingItem(false);
    setEditingItemId(null);
    setFormData({
      frenchText: '',
      myeneText: '',
      category: 'vie_quotidienne',
      difficulty: 'intermediaire',
      contextNotes: '',
      imageUrl: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=800&q=80',
      dialect: 'enenga'
    });
  };

  // -------------------------------------------------------------
  // RESPONSES EXPORT HANDLERS (CSV & JSON)
  // -------------------------------------------------------------
  const handleExportResponsesCSV = () => {
    const headers = [
      'ID_Contribution',
      'Expression_Francaise',
      'Texte_Original_Myene',
      'Orthographe_Confirmee_Correcte',
      'Variante_Orthographique_Proposee',
      'Variante_Dialecte',
      'Statut_Validation',
      'Nom_Contributeur',
      'ID_Contributeur',
      'Tribu_Contributeur',
      'URL_Enregistrement_Audio',
      'Duree_Audio_Secondes',
      'Date_Soumission',
      'Nom_Validateur',
      'Notes_Validation',
      'Commentaire_Culturel'
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredContributions.map(c => [
      escapeCSV(c.id),
      escapeCSV(c.frenchText),
      escapeCSV(c.originalMyeneText),
      escapeCSV(c.isSpellingCorrect ? 'OUI' : 'NON'),
      escapeCSV(c.proposedSpelling || ''),
      escapeCSV(c.dialectVariant || 'enenga'),
      escapeCSV(c.status),
      escapeCSV(c.userDisplayName),
      escapeCSV(c.userId),
      escapeCSV(c.userTribe || ''),
      escapeCSV(c.audioUrl || ''),
      escapeCSV(c.audioDuration || 0),
      escapeCSV(c.createdAt),
      escapeCSV(c.validatorDisplayName || ''),
      escapeCSV(c.validatorNotes || ''),
      escapeCSV(c.comment || '')
    ].join(','));

    // UTF-8 BOM ensures accent characters display properly in Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ompagano_reponses_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportResponsesJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredContributions, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = `ompagano_reponses_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // USERS EXPORT HANDLER (CSV)
  // -------------------------------------------------------------
  const handleExportUsersCSV = () => {
    const headers = [
      'ID_Utilisateur',
      'Nom_Affichage',
      'Nom_Complet',
      'Email',
      'Telephone',
      'Role',
      'Statut_Compte',
      'Tribu',
      'Clan_Paternel',
      'Clan_Maternel',
      'Village_Origine',
      'XP',
      'Niveau_Sagesse',
      'Nombre_Contributions',
      'Nombre_Enregistrements_Audio',
      'Nombre_Validations',
      'Score_Suspicion',
      'Date_Inscription'
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredUsers.map(u => [
      escapeCSV(u.id),
      escapeCSV(u.displayName),
      escapeCSV(u.fullName),
      escapeCSV(u.email || ''),
      escapeCSV(u.phoneNumber || u.contact || ''),
      escapeCSV(u.role),
      escapeCSV(u.status),
      escapeCSV(u.tribe),
      escapeCSV(u.paternalClan),
      escapeCSV(u.maternalClan),
      escapeCSV(u.villageOfOrigin),
      escapeCSV(u.xp),
      escapeCSV(u.level),
      escapeCSV(u.contributionsCount || 0),
      escapeCSV(u.recordingsCount || 0),
      escapeCSV(u.validationsCount || 0),
      escapeCSV(u.suspicionScore || 0),
      escapeCSV(u.createdAt)
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ompagano_utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered contributions / responses
  const filteredContributions = contributions.filter(c => {
    if (validationFilter !== 'all' && c.status !== validationFilter) return false;
    if (responseAudioFilter === 'with_audio' && !c.audioUrl) return false;
    if (responseAudioFilter === 'text_only' && c.audioUrl) return false;
    if (responseSearchQuery.trim()) {
      const q = responseSearchQuery.toLowerCase();
      const matchText = (c.frenchText || '').toLowerCase().includes(q) ||
        (c.originalMyeneText || '').toLowerCase().includes(q) ||
        (c.proposedSpelling || '').toLowerCase().includes(q) ||
        (c.userDisplayName || '').toLowerCase().includes(q) ||
        (c.userTribe || '').toLowerCase().includes(q);
      if (!matchText) return false;
    }
    return true;
  });

  // Filtered users for role management
  const filteredUsers = usersList.filter(u => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (userStatusFilter !== 'all' && u.status !== userStatusFilter) return false;
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      const matchQuery = (u.fullName || '').toLowerCase().includes(q) ||
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.contact || '').toLowerCase().includes(q) ||
        (u.tribe || '').toLowerCase().includes(q) ||
        (u.paternalClan || '').toLowerCase().includes(q) ||
        (u.maternalClan || '').toLowerCase().includes(q) ||
        (u.villageOfOrigin || '').toLowerCase().includes(q);
      if (!matchQuery) return false;
    }
    return true;
  });

  // Filtered suspicious profiles
  const usersWithScores = usersList.map(u => {
    const analysis = calculateSuspicionScore(u);
    return {
      ...u,
      calculatedScore: Math.max(u.suspicionScore || 0, analysis.score),
      reasons: analysis.reasons,
      riskLevel: analysis.riskLevel
    };
  });

  const filteredSuspiciousUsers = usersWithScores.filter(u => {
    if (fraudFilter === 'critical' && u.riskLevel !== 'critique') return false;
    if (fraudFilter === 'moderate' && u.riskLevel === 'faible') return false;
    if (fraudSearchQuery.trim()) {
      const q = fraudSearchQuery.toLowerCase();
      return (u.fullName || '').toLowerCase().includes(q) ||
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.tribe || '').toLowerCase().includes(q) ||
        (u.villageOfOrigin || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="warm-card-gradient rounded-3xl p-5 sm:p-6 border border-[#d97706]/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-[#c85a32] via-[#f59e0b] to-[#0d9488] shadow-lg shrink-0">
            <div className="w-full h-full bg-white rounded-[14px] overflow-hidden flex items-center justify-center p-0.5 shadow-inner">
              <img 
                src="/assets/aistudio/LOGO-symbole_1c65e221.png" 
                alt="Logo OMPAGANO" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#f59e0b] uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Console d'Administration OMPAGANO NKALA APP</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Espace Super-Admin & Aînés
            </h1>
            <p className="text-xs sm:text-sm text-[#d4af94] mt-0.5">
              Gestion des utilisateurs, attribution des droits admin, modération et export des réponses, configuration des thèmes et badges.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
          <button
            onClick={async () => {
              setIsSyncing(true);
              setSyncStatusMessage(null);
              try {
                await onTriggerCloudSync();
                setSyncStatusMessage("Base de données Firebase 'enenga' synchronisée avec succès !");
                setTimeout(() => setSyncStatusMessage(null), 4000);
              } catch (e: any) {
                setSyncStatusMessage("Erreur de synchronisation : " + (e?.message || 'Vérifiez la connexion'));
              } finally {
                setIsSyncing(false);
              }
            }}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl terracotta-gradient hover:opacity-90 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser avec la Base de Données'}</span>
          </button>
          {syncStatusMessage && (
            <div className="text-[11px] font-semibold text-[#fde047] bg-[#27150c] px-3 py-1 rounded-lg border border-[#f59e0b]/40">
              {syncStatusMessage}
            </div>
          )}
        </div>
      </div>

      {/* SEED STATUS BANNER (GESTION DU PREMIER SEED OFFICIEL) */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        seedStatus?.isSeeded 
          ? 'bg-[#14532d]/20 border-[#22c55e]/50 text-[#bbf7d0]'
          : 'bg-[#78350f]/30 border-[#f59e0b]/60 text-[#fed7aa]'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              seedStatus?.isSeeded ? 'bg-[#22c55e]/20 text-[#4ade80]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'
            }`}>
              {seedStatus?.isSeeded ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-white font-serif">
                  {seedStatus?.isSeeded 
                    ? '✓ Base de Données Firebase Initialisée & Certifiée' 
                    : '⚠️ Premier Seed Firebase Non Effectué (Données Locales Uniquement)'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  seedStatus?.isSeeded 
                    ? 'bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/40' 
                    : 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40'
                }`}>
                  {seedStatus?.isSeeded ? 'Seed Cloud Actif' : 'Marqueur Manquant'}
                </span>
              </div>
              <p className="text-xs text-[#d4af94] mt-1 leading-relaxed max-w-2xl">
                {seedStatus?.isSeeded ? (
                  <>
                    Le marqueur permanent <code className="text-[#fde047] font-mono font-bold">/metrics/seed_status</code> est actif dans Firebase. 
                    <strong> {seedStatus.itemsCount} questions</strong>, <strong>{seedStatus.clansCount} clans</strong> et <strong>{seedStatus.villagesCount} villages</strong> sont stockés dans le Cloud et synchronisés sur tous vos périphériques.
                    {seedStatus.seededByName && <span className="block mt-0.5 text-[11px] text-[#a8826d]">Initialisé par {seedStatus.seededByName} le {new Date(seedStatus.seededAt).toLocaleString('fr-FR')}.</span>}
                  </>
                ) : (
                  <>
                    Le corpus linguistique et généalogique est actuellement en <strong>mémoire locale sur ce périphérique</strong>.
                    Pour que les questions, clans et villages soient consultables et modifiables <strong>depuis n'importe quel autre ordinateur ou smartphone</strong>, vous devez exécuter le Premier Seed officiel.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end">
            {!seedStatus?.isSeeded ? (
              <button
                type="button"
                onClick={onExecuteInitialSeed}
                disabled={isSeedingDatabase}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#15803d] to-[#047857] hover:opacity-95 text-white font-bold text-xs shadow-lg border border-[#22c55e]/40 active:scale-95 disabled:opacity-50 transition-all"
              >
                <Sparkles className={`w-4 h-4 ${isSeedingDatabase ? 'animate-spin' : ''}`} />
                <span>{isSeedingDatabase ? 'Injection dans Firebase en cours...' : '🌱 Effectuer le Premier Seed dans Firebase'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onExecuteInitialSeed}
                disabled={isSeedingDatabase}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-[#27150c] hover:bg-[#341b10] text-[#fed7aa] border border-[#4a2412] transition-colors"
                title="Réinjecte l'intégralité du corpus si vous souhaitez forcer un re-seed"
              >
                {isSeedingDatabase ? 'Re-seed en cours...' : 'Forcer un Re-seed Cloud'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#3f2113]">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'stats' ? 'bg-[#c85a32] text-white shadow-md font-bold' : 'bg-[#27150c] text-[#d4af94] hover:bg-[#341b10]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Vue d'ensemble</span>
        </button>

        {/* TAB: CLANS & VILLAGES (NOUVEAU) */}
        <button
          onClick={() => setActiveTab('clans_villages')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'clans_villages' ? 'bg-[#c85a32] text-white shadow-md font-bold' : 'bg-[#27150c] text-[#fed7aa] hover:bg-[#341b10]'
          }`}
        >
          <Compass className="w-4 h-4 text-[#f59e0b]" />
          <span>Clans & Villages ({clans.length}/{villages.length})</span>
        </button>

        {/* TAB: USERS & ADMIN ROLES */}
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'users' ? 'bg-amber-600 text-white shadow-md font-bold' : 'bg-[#27150c] text-[#f59e0b] hover:bg-[#341b10]'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>Utilisateurs & Droits Admin ({usersList.length})</span>
        </button>

        {/* TAB: RESPONSES & VALIDATION */}
        <button
          onClick={() => setActiveTab('validation')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'validation' ? 'bg-emerald-700 text-white shadow-md font-bold' : 'bg-[#27150c] text-emerald-400 hover:bg-[#341b10]'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Réponses & Export ({contributions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('themes')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'themes' ? 'bg-[#0284c7] text-white shadow-md font-bold' : 'bg-[#27150c] text-sky-400 hover:bg-[#341b10]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Thèmes ({themes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('badges_manager')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'badges_manager' ? 'bg-[#9333ea] text-white shadow-md font-bold' : 'bg-[#27150c] text-purple-400 hover:bg-[#341b10]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Dénominations Badges ({badges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('defis')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'defis' ? 'bg-[#d97706] text-black font-extrabold shadow-md' : 'bg-[#27150c] text-[#f59e0b] hover:bg-[#341b10]'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Défis ({challenges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('csv_import')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'csv_import' ? 'bg-[#c85a32] text-white shadow-md' : 'bg-[#27150c] text-[#fed7aa] hover:bg-[#341b10]'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Import CSV</span>
        </button>

        <button
          onClick={() => setActiveTab('hosting')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'hosting' ? 'bg-teal-700 text-white shadow-md font-bold' : 'bg-[#27150c] text-teal-400 hover:bg-[#341b10]'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Domaine source.essaka.engineering</span>
        </button>

        <button
          onClick={() => setActiveTab('questionnaires')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'questionnaires' ? 'bg-[#c85a32] text-white shadow-md' : 'bg-[#27150c] text-[#d4af94] hover:bg-[#341b10]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Fiches ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('badges_levels')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'badges_levels' ? 'bg-[#c85a32] text-white shadow-md' : 'bg-[#27150c] text-[#d4af94] hover:bg-[#341b10]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Niveaux XP</span>
        </button>

        <button
          onClick={() => setActiveTab('fraud_detection')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'fraud_detection' ? 'bg-[#b91c1c] text-white shadow-md' : 'bg-[#27150c] text-[#fca5a5] hover:bg-[#341b10]'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-[#ef4444]" />
          <span>Anti-Fraude</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB: CLANS & VILLAGES (HIERARCHIE TRIBU -> CLAN -> VILLAGE) */}
      {/* ========================================================= */}
      {activeTab === 'clans_villages' && (
        <ClanVillageAdmin
          clans={clans}
          villages={villages}
          onSaveClan={onSaveClan}
          onDeleteClan={onDeleteClan}
          onSaveVillage={onSaveVillage}
          onDeleteVillage={onDeleteVillage}
        />
      )}

      {/* ========================================================= */}
      {/* TAB: USERS & ADMIN PRIVILEGES (DECIDER QUI EST ADMIN)     */}
      {/* ========================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          {/* Top Bar with Description & CSV Export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 warm-card-gradient border border-[#4a2412] rounded-2xl shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#f59e0b]" />
                <h3 className="text-base font-bold text-white">Gestion des Utilisateurs & Attribution des Rôles</h3>
              </div>
              <p className="text-xs text-[#d4af94] mt-1 leading-relaxed">
                Décidez qui est <strong>Administrateur</strong>, qui est <strong>Validateur Linguistique</strong>, et gérez les comptes actifs ou suspendus.
              </p>
            </div>

            <button
              onClick={handleExportUsersCSV}
              className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold border border-stone-600 transition shadow shrink-0 self-start sm:self-center"
            >
              <Download className="w-4 h-4 text-[#f59e0b]" />
              <span>Exporter Utilisateurs en CSV</span>
            </button>
          </div>

          {/* Quick Stats on Users */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#180d07] border border-[#3b1d10] rounded-xl text-center">
              <span className="text-[11px] text-[#a8826d]">Total Utilisateurs</span>
              <div className="text-xl font-bold text-white mt-0.5">{usersList.length}</div>
            </div>
            <div className="p-3 bg-[#180d07] border border-[#3b1d10] rounded-xl text-center">
              <span className="text-[11px] text-amber-400">👑 Administrateurs</span>
              <div className="text-xl font-bold text-amber-400 mt-0.5">
                {usersList.filter(u => u.role === 'admin').length}
              </div>
            </div>
            <div className="p-3 bg-[#180d07] border border-[#3b1d10] rounded-xl text-center">
              <span className="text-[11px] text-purple-400">🔍 Validateurs</span>
              <div className="text-xl font-bold text-purple-400 mt-0.5">
                {usersList.filter(u => u.role === 'validator').length}
              </div>
            </div>
            <div className="p-3 bg-[#180d07] border border-[#3b1d10] rounded-xl text-center">
              <span className="text-[11px] text-emerald-400">✍️ Contributeurs</span>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">
                {usersList.filter(u => u.role === 'user').length}
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#a8826d] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, email, téléphone, clan, village..."
                className="w-full pl-9 pr-3 py-2 bg-[#180d07] border border-[#4a2412] rounded-xl text-xs text-white focus:outline-none focus:border-[#f59e0b]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#d4af94]">Rôle :</span>
              {(['all', 'admin', 'validator', 'user'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setUserRoleFilter(role)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    userRoleFilter === role
                      ? 'bg-[#c85a32] text-white shadow'
                      : 'bg-[#27150c] text-[#a8826d] hover:bg-[#341b10]'
                  }`}
                >
                  {role === 'all' ? 'Tous' : role === 'admin' ? 'Admins' : role === 'validator' ? 'Validateurs' : 'Contributeurs'}
                </button>
              ))}
            </div>
          </div>

          {/* Users List */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 bg-[#180d07] rounded-2xl border border-[#3b1d10] text-[#a8826d] text-xs">
                Aucun utilisateur ne correspond aux critères de recherche.
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isAdmin = user.role === 'admin';
                const isValidator = user.role === 'validator';
                return (
                  <div
                    key={user.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isAdmin
                        ? 'bg-[#2a1708] border-[#f59e0b]/50 shadow-md'
                        : isValidator
                        ? 'bg-[#221020] border-purple-500/40'
                        : 'bg-[#27150c] border-[#4a2412]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow shrink-0 ${
                          isAdmin ? 'bg-amber-600' : isValidator ? 'bg-purple-700' : 'terracotta-gradient'
                        }`}>
                          {isAdmin ? '👑' : isValidator ? '🔍' : (user.fullName?.charAt(0) || user.displayName?.charAt(0) || '👤')}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-sm text-white">{user.fullName || user.displayName}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                              isValidator ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                              'bg-stone-700 text-stone-300'
                            }`}>
                              {isAdmin ? '👑 Administrateur' : isValidator ? '🔍 Validateur' : 'Contributeur'}
                            </span>

                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              user.status === 'suspended' ? 'bg-[#7f1d1d] text-[#fca5a5]' :
                              user.status === 'flagged' ? 'bg-[#b45309] text-[#fde047]' :
                              'bg-[#166534] text-[#86efac]'
                            }`}>
                              {user.status === 'suspended' ? 'Suspendu' : user.status === 'flagged' ? 'Signalé' : 'Actif'}
                            </span>
                          </div>

                          <div className="text-xs text-[#d4af94] mt-0.5">
                            {user.email || user.contact || user.phoneNumber || 'Contact non renseigné'} • Tribu : <strong>{user.tribe || 'Non spécifiée'}</strong>
                          </div>

                          <div className="text-[11px] text-[#a8826d] mt-1">
                            Clans: <span>{user.paternalClan || 'N/A'} (Pat.) / {user.maternalClan || 'N/A'} (Mat.)</span> • Village : <span>{user.villageOfOrigin || 'Non déclaré'}</span>
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#fed7aa]">
                            <span>⭐ {user.xp || 0} XP ({user.level || 'Initié'})</span>
                            <span>🎙️ {user.recordingsCount || 0} audios</span>
                            <span>📝 {user.contributionsCount || 0} contribs</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons to PROMOTE or CHANGE ROLES */}
                      <div className="flex flex-col sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#3b1d10]">
                        <div className="text-[10px] font-bold uppercase text-[#a8826d]">Attribuer le Rôle :</div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onUpdateUserRole && onUpdateUserRole(user.id, 'admin')}
                            disabled={isAdmin}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                              isAdmin
                                ? 'bg-amber-600 text-white cursor-default'
                                : 'bg-[#180d07] hover:bg-amber-900/50 text-amber-300 border border-amber-600/40 active:scale-95'
                            }`}
                            title="Nommer Administrateur de la plateforme"
                          >
                            <Crown className="w-3.5 h-3.5" />
                            <span>{isAdmin ? 'Admin Actuel' : 'Rendre Admin'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onUpdateUserRole && onUpdateUserRole(user.id, 'validator')}
                            disabled={isValidator}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                              isValidator
                                ? 'bg-purple-700 text-white cursor-default'
                                : 'bg-[#180d07] hover:bg-purple-900/50 text-purple-300 border border-purple-600/40 active:scale-95'
                            }`}
                            title="Nommer Validateur Linguistique"
                          >
                            <span>{isValidator ? 'Validateur' : 'Validateur'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onUpdateUserRole && onUpdateUserRole(user.id, 'user')}
                            disabled={!isAdmin && !isValidator}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                              !isAdmin && !isValidator
                                ? 'bg-stone-700 text-stone-400 cursor-default'
                                : 'bg-[#180d07] hover:bg-stone-800 text-stone-300 border border-stone-700 active:scale-95'
                            }`}
                            title="Rétablir comme Contributeur standard"
                          >
                            Contributeur
                          </button>
                        </div>

                        {/* Account status toggles */}
                        <div className="flex items-center gap-1 mt-1">
                          {user.status !== 'active' && (
                            <button
                              onClick={() => onUpdateUserAccountStatus(user.id, 'active')}
                              className="text-[10px] text-emerald-400 hover:underline"
                            >
                              Réactiver
                            </button>
                          )}
                          {user.status === 'active' && (
                            <button
                              onClick={() => onUpdateUserAccountStatus(user.id, 'flagged')}
                              className="text-[10px] text-amber-400 hover:underline"
                            >
                              Signaler
                            </button>
                          )}
                          {user.status !== 'suspended' && (
                            <button
                              onClick={() => onUpdateUserAccountStatus(user.id, 'suspended')}
                              className="text-[10px] text-rose-400 hover:underline ml-2"
                            >
                              Suspendre
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: RESPONSES & VALIDATION WITH EXPORT TO CSV / JSON     */}
      {/* ========================================================= */}
      {activeTab === 'validation' && (
        <div className="space-y-4">
          {/* Header with Export buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 warm-card-gradient border border-[#4a2412] rounded-2xl shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Gestion & Modération des Réponses</h3>
              </div>
              <p className="text-xs text-[#d4af94] mt-1">
                Passez en revue les contributions orales et orthographiques, écoutez les audios et exportez le corpus.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleExportResponsesCSV}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow transition active:scale-95"
                title="Télécharger toutes les réponses au format CSV pour Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exporter en CSV (Excel)</span>
              </button>

              <button
                onClick={handleExportResponsesJSON}
                className="flex items-center gap-2 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold border border-stone-600 transition active:scale-95"
                title="Télécharger au format JSON pour entraînement IA ou recherche"
              >
                <Download className="w-4 h-4" />
                <span>Exporter en JSON</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#a8826d] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={responseSearchQuery}
                onChange={(e) => setResponseSearchQuery(e.target.value)}
                placeholder="Rechercher par expression française, mot Myènè, contributeur..."
                className="w-full pl-9 pr-3 py-2 bg-[#180d07] border border-[#4a2412] rounded-xl text-xs text-white focus:outline-none focus:border-[#f59e0b]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[#d4af94]">Statut :</span>
              {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setValidationFilter(status)}
                  className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                    validationFilter === status
                      ? 'bg-[#c85a32] text-white shadow-sm font-bold'
                      : 'bg-[#27150c] text-[#a8826d] hover:bg-[#381e11]'
                  }`}
                >
                  {status === 'pending' ? 'En attente' : status === 'approved' ? 'Validés' : status === 'rejected' ? 'Rejetés' : 'Tous'}
                </button>
              ))}

              <div className="h-4 w-px bg-[#3b1d10] mx-1" />

              <span className="text-[#d4af94]">Audio :</span>
              <button
                onClick={() => setResponseAudioFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${responseAudioFilter === 'all' ? 'bg-stone-700 text-white' : 'text-[#a8826d]'}`}
              >
                Tous
              </button>
              <button
                onClick={() => setResponseAudioFilter('with_audio')}
                className={`px-2.5 py-1 rounded-lg transition-all ${responseAudioFilter === 'with_audio' ? 'bg-amber-700 text-white font-bold' : 'text-[#a8826d]'}`}
              >
                Avec Audio 🎙️
              </button>
            </div>
          </div>

          {/* Contributions List */}
          {filteredContributions.length === 0 ? (
            <div className="text-center py-12 warm-card-gradient rounded-3xl border border-[#4a2412] p-8">
              <CheckCircle className="w-12 h-12 text-[#22c55e] mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-bold text-white">Aucune réponse ne correspond aux filtres</h3>
              <p className="text-xs text-[#a8826d] mt-1">
                Modifiez les filtres de statut ou de recherche ci-dessus pour afficher d'autres contributions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-[#a8826d] flex items-center justify-between px-1">
                <span>Affichage de <strong>{filteredContributions.length}</strong> réponse(s)</span>
                <span>{filteredContributions.filter(c => !!c.audioUrl).length} avec enregistrement vocal</span>
              </div>

              {filteredContributions.map(c => (
                <div key={c.id} className="warm-card-gradient border border-[#4a2412] rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3b1d10] pb-2.5">
                    <div>
                      <div className="text-xs text-[#f59e0b] font-semibold">
                        Expression : « {c.frenchText} »
                      </div>
                      <div className="text-sm font-bold text-white font-serif mt-0.5">
                        Original : {c.originalMyeneText}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[#a8826d]">Par {c.userDisplayName} {c.userTribe ? `(${c.userTribe})` : ''}</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        c.status === 'approved' ? 'bg-[#15803d]/30 text-[#86efac] border border-[#22c55e]/40' :
                        c.status === 'rejected' ? 'bg-[#991b1b]/30 text-[#fca5a5] border border-[#ef4444]/40' :
                        'bg-[#b45309]/30 text-[#fde047] border border-[#d97706]/40'
                      }`}>
                        {c.status === 'approved' ? 'Validé' : c.status === 'rejected' ? 'Rejeté' : 'À examiner'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#180d07] rounded-xl text-xs space-y-1 border border-[#30170c]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#fed7aa]">Avis orthographique :</span>
                      {c.isSpellingCorrect ? (
                        <span className="text-[#4ade80] font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Confirmé correct
                        </span>
                      ) : (
                        <span className="text-[#f59e0b] font-medium flex items-center gap-1">
                          <Edit className="w-3.5 h-3.5" /> Variante proposée : « {c.proposedSpelling} » ({c.dialectVariant || 'enenga'})
                        </span>
                      )}
                    </div>
                    {c.comment && (
                      <div className="text-[#a8826d] italic mt-1">
                        Note : "{c.comment}"
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div>
                      {c.audioUrl ? (
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(c.id, c.audioUrl)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#c85a32] hover:bg-[#b84a28] text-white text-xs font-medium active:scale-95 transition-transform"
                        >
                          {playingAudioId === c.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          <span>{playingAudioId === c.id ? 'Arrêter' : 'Écouter la voix enregistrée'}</span>
                          {c.audioDuration ? <span className="opacity-70 text-[10px]">({Math.round(c.audioDuration)}s)</span> : null}
                        </button>
                      ) : (
                        <span className="text-xs text-[#a8826d] italic">Aucun enregistrement audio</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {c.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onValidateContribution(c.id, 'approved', validationNote[c.id])}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#166534] hover:bg-[#15803d] text-[#bbf7d0] text-xs font-semibold active:scale-95 transition-transform"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approuver</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onValidateContribution(c.id, 'rejected', validationNote[c.id] || 'Non conforme')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7f1d1d] hover:bg-[#991b1b] text-[#fecaca] text-xs font-semibold active:scale-95 transition-transform"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rejeter</span>
                          </button>
                        </>
                      )}

                      {onDeleteContribution && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Voulez-vous supprimer définitivement cette réponse ?')) {
                              onDeleteContribution(c.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-[#180d07] hover:bg-[#7f1d1d] text-[#fca5a5] transition"
                          title="Supprimer la réponse"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* OTHER TABS: STATS, DEFIS, THEMES, BADGES, CSV, ETC.       */}
      {/* ========================================================= */}

      {/* TAB: STATS & ANALYTICS */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 bg-[#27150c] border border-[#4a2412] rounded-2xl">
              <div className="flex items-center justify-between text-[#f59e0b] mb-1">
                <span className="text-xs font-semibold">Questionnaires</span>
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-white">{items.length}</div>
              <div className="text-[11px] text-[#a8826d]">Phrases et mots actifs</div>
            </div>

            <div className="p-4 bg-[#27150c] border border-[#4a2412] rounded-2xl">
              <div className="flex items-center justify-between text-[#c85a32] mb-1">
                <span className="text-xs font-semibold">Contributions</span>
                <Users className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-white">{contributions.length}</div>
              <div className="text-[11px] text-[#a8826d]">Avis & propositions</div>
            </div>

            <div className="p-4 bg-[#27150c] border border-[#4a2412] rounded-2xl">
              <div className="flex items-center justify-between text-[#22c55e] mb-1">
                <span className="text-xs font-semibold">Enregistrements</span>
                <Mic className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-white">
                {contributions.filter(c => !!c.audioUrl).length}
              </div>
              <div className="text-[11px] text-[#a8826d]">Voix collectées</div>
            </div>

            <div className="p-4 bg-[#27150c] border border-[#4a2412] rounded-2xl">
              <div className="flex items-center justify-between text-[#d97706] mb-1">
                <span className="text-xs font-semibold">Validations</span>
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-white">
                {contributions.filter(c => c.status === 'approved').length}
              </div>
              <div className="text-[11px] text-[#a8826d]">Certifiées par aînés</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: WEEKLY CHALLENGES */}
      {activeTab === 'defis' && (
        <WeeklyChallengesAdmin
          challenges={challenges}
          themes={themes}
          badges={badges}
          onSaveChallenge={onSaveChallenge}
          onDeleteChallenge={onDeleteChallenge}
          onToggleActive={onToggleActiveChallenge}
        />
      )}

      {/* TAB: DYNAMIC THEMES MANAGER */}
      {activeTab === 'themes' && (
        <ThemeManagerAdmin
          themes={themes}
          items={items}
          onSaveTheme={onSaveTheme || (async () => {})}
          onDeleteTheme={onDeleteTheme || (async () => {})}
        />
      )}

      {/* TAB: DYNAMIC BADGES DENOMINATIONS MANAGER */}
      {activeTab === 'badges_manager' && (
        <BadgesManagerAdmin
          badges={badges}
          usersList={usersList}
          onSaveBadge={onSaveBadge || (async () => {})}
          onDeleteBadge={onDeleteBadge || (async () => {})}
        />
      )}

      {/* TAB: HOSTING & CUSTOM DOMAIN */}
      {activeTab === 'hosting' && (
        <HostingCustomDomainAdmin
          onTriggerSync={onTriggerCloudSync}
        />
      )}

      {/* TAB: CSV IMPORT & THEMATIC CLASSIFICATION */}
      {activeTab === 'csv_import' && (
        <CsvImportSection
          onImportItems={onBatchImportItems}
          currentItemsCount={items.length}
          themes={themes}
          onRegisterNewThemes={onBatchRegisterThemes}
        />
      )}

      {/* TAB: QUESTIONNAIRE CONFIGURATION */}
      {activeTab === 'questionnaires' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Création & Gestion des Phrases / Images OMPAGANO</h3>
            <button
              onClick={() => {
                setEditingItemId(null);
                setFormData({
                  frenchText: '',
                  myeneText: '',
                  category: 'vie_quotidienne',
                  difficulty: 'intermediaire',
                  contextNotes: '',
                  imageUrl: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=800&q=80',
                  dialect: 'enenga'
                });
                setIsEditingItem(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl terracotta-gradient text-white text-xs font-semibold shadow-md active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>Créer une Nouvelle Fiche</span>
            </button>
          </div>

          {isEditingItem && (
            <form onSubmit={handleItemSubmit} className="warm-card-gradient border-2 border-[#d97706]/40 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-[#4a2412] pb-2">
                <h4 className="font-bold text-sm text-white">
                  {editingItemId ? 'Modifier la fiche OMPAGANO' : 'Créer une nouvelle expression à traduire'}
                </h4>
                <button type="button" onClick={() => setIsEditingItem(false)} className="text-xs text-[#a8826d] hover:text-white">
                  Annuler
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[#fed7aa] font-medium mb-1">Phrase ou Mot en Français :</label>
                  <input
                    type="text"
                    required
                    value={formData.frenchText}
                    onChange={(e) => setFormData({ ...formData, frenchText: e.target.value })}
                    className="w-full px-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]"
                    placeholder="Ex: Le panier tressé..."
                  />
                </div>

                <div>
                  <label className="block text-[#fed7aa] font-medium mb-1">Traduction en Myènè :</label>
                  <input
                    type="text"
                    required
                    value={formData.myeneText}
                    onChange={(e) => setFormData({ ...formData, myeneText: e.target.value })}
                    className="w-full px-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-white font-serif focus:outline-none focus:border-[#f59e0b]"
                    placeholder="Ex: Nkala..."
                  />
                </div>

                <div>
                  <label className="block text-[#fed7aa] font-medium mb-1">Catégorie thématique :</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-[#fed7aa] focus:outline-none"
                  >
                    <option value="salutations">Salutations & Civilités</option>
                    <option value="fleuve_peche">Fleuve Ogooué & Pêche</option>
                    <option value="nature_faune">Faune, Flore & Lacs</option>
                    <option value="vie_quotidienne">Vie au Village & Artisanat</option>
                    <option value="famille_communaute">Famille & Communauté</option>
                    <option value="proverbes_contes">Proverbes & Sagesse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#fed7aa] font-medium mb-1">Niveau de difficulté :</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e: any) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-[#fed7aa] focus:outline-none"
                  >
                    <option value="debutant">Débutant (Mots simples)</option>
                    <option value="intermediaire">Intermédiaire (Phrases usuelles)</option>
                    <option value="avance">Avancé (Proverbes complexes)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[#fed7aa] font-medium mb-1">URL de l’image d'illustration :</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[#fed7aa] font-medium mb-1">Notes culturelles & usage traditionnel :</label>
                  <textarea
                    rows={2}
                    value={formData.contextNotes}
                    onChange={(e) => setFormData({ ...formData, contextNotes: e.target.value })}
                    className="w-full px-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingItem(false)}
                  className="px-4 py-2 rounded-xl bg-[#27150c] text-[#a8826d] hover:bg-[#341b10] text-xs font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl terracotta-gradient text-white text-xs font-bold shadow-md"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map(item => (
              <div key={item.id} className="p-4 bg-[#27150c] border border-[#4a2412] rounded-2xl flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img src={item.imageUrl} alt={item.frenchText} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#4a2412]" />
                  <div className="overflow-hidden">
                    <h5 className="font-bold text-xs text-white truncate">{item.frenchText}</h5>
                    <p className="font-serif text-sm text-[#f59e0b] truncate">{item.myeneText}</p>
                    <span className="text-[10px] text-[#a8826d] capitalize">{item.category} • {item.difficulty}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingItemId(item.id);
                      setFormData({
                        frenchText: item.frenchText,
                        myeneText: item.myeneText,
                        category: item.category,
                        difficulty: item.difficulty,
                        contextNotes: item.contextNotes || '',
                        imageUrl: item.imageUrl || '',
                        dialect: item.dialect || 'enenga'
                      });
                      setIsEditingItem(true);
                    }}
                    className="p-2 rounded-lg bg-[#180d07] hover:bg-[#341b10] text-[#fed7aa]"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteQuestionnaireItem(item.id)}
                    className="p-2 rounded-lg bg-[#180d07] hover:bg-[#7f1d1d] text-[#fca5a5]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: BADGES & LEVELS */}
      {activeTab === 'badges_levels' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Gestion des Niveaux et Attribution des Badges</h3>
              <p className="text-xs text-[#d4af94]">Évaluez les compétences orales et écrites, promouvez les contributeurs méritants</p>
            </div>
          </div>

          {selectedUserForEdit && (
            <div className="p-5 warm-card-gradient border-2 border-[#f59e0b] rounded-2xl space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-[#4a2412] pb-2">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#f59e0b]" />
                  <h4 className="font-bold text-sm text-white">
                    Gestion des Titres & Niveaux : {selectedUserForEdit.fullName || selectedUserForEdit.displayName}
                  </h4>
                </div>
                <button onClick={() => setSelectedUserForEdit(null)} className="text-xs text-[#a8826d] hover:text-white">
                  Fermer
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[#fed7aa] font-semibold mb-1">Attribuer un Niveau Traditionnel :</label>
                  <select
                    value={selectedUserForEdit.levelIndex || 1}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value);
                      const lvl = USER_LEVELS.find(l => l.index === idx) || USER_LEVELS[0];
                      setSelectedUserForEdit({
                        ...selectedUserForEdit,
                        levelIndex: idx,
                        level: lvl.name
                      });
                    }}
                    className="w-full px-3 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white focus:outline-none"
                  >
                    {USER_LEVELS.map(l => (
                      <option key={l.index} value={l.index}>
                        Niveau {l.index} : {l.name} ({l.minXp}+ XP)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#fed7aa] font-semibold mb-1">Bonus XP Récompense :</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={userBonusXp}
                      onChange={(e) => setUserBonusXp(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[#180d07] border border-[#522915] rounded-xl text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newXp = (selectedUserForEdit.xp || 0) + userBonusXp;
                        setSelectedUserForEdit({ ...selectedUserForEdit, xp: newXp });
                      }}
                      className="px-3 py-2 rounded-xl terracotta-gradient text-white font-bold whitespace-nowrap active:scale-95"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-[#fed7aa] font-semibold">Badges OMPAGANO Attribués :</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {badges.map(badge => {
                      const hasBadge = (selectedUserForEdit.badges || []).includes(badge.id);
                      return (
                        <button
                          key={badge.id}
                          type="button"
                          onClick={() => {
                            const current = selectedUserForEdit.badges || [];
                            const updated = hasBadge
                              ? current.filter(b => b !== badge.id)
                              : [...current, badge.id];
                            setSelectedUserForEdit({ ...selectedUserForEdit, badges: updated });
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                            hasBadge
                              ? 'bg-[#c85a32]/30 border-[#c85a32] text-white shadow'
                              : 'bg-[#180d07] border-[#3b1d10] text-[#a8826d]'
                          }`}
                        >
                          <span className="text-xl">{badge.icon}</span>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold truncate">{badge.title}</div>
                            <div className="text-[10px] text-[#a8826d]">{hasBadge ? 'Débloqué ✅' : 'Verrouillé 🔒'}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="px-4 py-2 rounded-xl bg-[#27150c] text-xs text-[#a8826d]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onUpdateUserLevelAndBadges(
                      selectedUserForEdit.id,
                      selectedUserForEdit.levelIndex,
                      selectedUserForEdit.badges,
                      selectedUserForEdit.xp
                    );
                    setSelectedUserForEdit(null);
                  }}
                  className="px-5 py-2 rounded-xl terracotta-gradient text-white text-xs font-bold shadow-md active:scale-95"
                >
                  Sauvegarder les Changements
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {usersList.map((user) => (
              <div
                key={user.id}
                className="p-4 bg-[#27150c] border border-[#4a2412] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl terracotta-gradient flex items-center justify-center font-bold text-white text-sm shadow">
                    {user.fullName?.charAt(0) || user.displayName?.charAt(0) || '👤'}
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">{user.fullName || user.displayName}</h5>
                    <p className="text-xs text-[#f59e0b]">
                      Niveau {user.levelIndex || 1} • {user.level || 'Initié'} • {user.xp || 0} XP
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {(user.badges || []).slice(0, 4).map(bId => {
                        const b = badges.find(x => x.id === bId);
                        return b ? <span key={bId} title={b.title} className="text-sm">{b.icon}</span> : null;
                      })}
                      {(user.badges || []).length > 4 && (
                        <span className="text-[10px] text-[#a8826d]">+{user.badges.length - 4}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUserForEdit(user)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#180d07] hover:bg-[#381e11] text-[#fed7aa] border border-[#4a2412] text-xs font-semibold self-end sm:self-center transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#f59e0b]" />
                  <span>Gérer Niveau & Badges</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: ANTI-FRAUD & SUSPICIOUS / INACTIVE PROFILES */}
      {activeTab === 'fraud_detection' && (
        <div className="space-y-5">
          <div className="p-4 bg-[#7f1d1d]/30 border border-[#ef4444]/40 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#fca5a5]">
              <ShieldAlert className="w-5 h-5 text-[#ef4444]" />
              <span>Traçabilité & Détection des Profils Inactifs ou Faux</span>
            </div>
            <p className="text-xs text-[#fecaca] leading-relaxed">
              Le programme OMPAGANO est réservé aux contributeurs authentiques de la communauté Myènè.
              Cet outil analyse automatiquement les anomalies généalogiques et l'inactivité prolongée.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#a8826d] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fraudSearchQuery}
                onChange={(e) => setFraudSearchQuery(e.target.value)}
                placeholder="Rechercher nom, tribu, village..."
                className="w-full pl-9 pr-3 py-2 bg-[#180d07] border border-[#4a2412] rounded-xl text-xs text-white focus:outline-none focus:border-[#ef4444]"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto">
              <span className="text-[#a8826d]">Niveau de risque :</span>
              <button
                onClick={() => setFraudFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  fraudFilter === 'all' ? 'bg-[#c85a32] text-white' : 'bg-[#27150c] text-[#a8826d]'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFraudFilter('moderate')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  fraudFilter === 'moderate' ? 'bg-[#b45309] text-white' : 'bg-[#27150c] text-[#a8826d]'
                }`}
              >
                Risque Modéré +
              </button>
              <button
                onClick={() => setFraudFilter('critical')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  fraudFilter === 'critical' ? 'bg-[#991b1b] text-white' : 'bg-[#27150c] text-[#a8826d]'
                }`}
              >
                Critique
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredSuspiciousUsers.map((user) => (
              <div
                key={user.id}
                className={`p-4 rounded-2xl border transition-all ${
                  user.riskLevel === 'critique'
                    ? 'bg-[#450a0a]/50 border-[#ef4444]/60 shadow-lg'
                    : user.riskLevel === 'modere'
                    ? 'bg-[#451a03]/40 border-[#f59e0b]/40'
                    : 'bg-[#180d07] border-[#3b1d10]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3b1d10] pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{user.fullName || user.displayName}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        user.status === 'suspended' ? 'bg-[#7f1d1d] text-[#fca5a5]' :
                        user.status === 'flagged' ? 'bg-[#b45309] text-[#fde047]' :
                        'bg-[#166534] text-[#86efac]'
                      }`}>
                        Statut : {user.status || 'Actif'}
                      </span>
                    </div>
                    <div className="text-xs text-[#d4af94] mt-0.5">
                      Contact : {user.contact || user.email || 'Non renseigné'} • Tribu : {user.tribe || 'Inconnue'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-[10px] text-[#a8826d] uppercase font-bold">Indice de Suspicion</div>
                      <div className={`font-mono font-black text-lg ${
                        user.calculatedScore >= 60 ? 'text-[#ef4444]' :
                        user.calculatedScore >= 30 ? 'text-[#f59e0b]' :
                        'text-[#22c55e]'
                      }`}>
                        {user.calculatedScore} / 100
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 text-xs text-[#fed7aa]">
                  <div>
                    <span className="text-[#a8826d] block text-[10px]">Clans & Origines :</span>
                    <span>Paternel: {user.paternalClan || 'N/A'} • Maternel: {user.maternalClan || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[#a8826d] block text-[10px]">Village d'Origine :</span>
                    <span>{user.villageOfOrigin || 'Non déclaré'}</span>
                  </div>
                  <div>
                    <span className="text-[#a8826d] block text-[10px]">Activité & Progression :</span>
                    <span>{user.contributionsCount || 0} contribs • {user.recordingsCount || 0} audios</span>
                  </div>
                </div>

                {user.reasons && user.reasons.length > 0 && (
                  <div className="p-2.5 bg-[#140a05] rounded-xl border border-[#4a1c12] text-xs text-[#fca5a5] space-y-1">
                    <span className="font-bold text-[#f59e0b] block text-[11px]">Anomalies détectées :</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {user.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-end gap-2 text-xs">
                  {user.status !== 'suspended' && (
                    <button
                      onClick={() => onUpdateUserAccountStatus(user.id, 'suspended')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7f1d1d] hover:bg-[#991b1b] text-[#fecaca] font-semibold active:scale-95"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Suspendre l'accès</span>
                    </button>
                  )}

                  {user.status !== 'flagged' && user.status !== 'suspended' && (
                    <button
                      onClick={() => onUpdateUserAccountStatus(user.id, 'flagged')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#b45309] hover:bg-[#d97706] text-white font-semibold active:scale-95"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Signaler sous surveillance</span>
                    </button>
                  )}

                  {user.status !== 'active' && (
                    <button
                      onClick={() => onUpdateUserAccountStatus(user.id, 'active')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#166534] hover:bg-[#15803d] text-[#86efac] font-semibold active:scale-95"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Réhabiliter le compte</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
