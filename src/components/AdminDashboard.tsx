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
  Palette
} from 'lucide-react';
import { 
  QuestionnaireItem, 
  Contribution, 
  SystemMetric, 
  UserProfile,
  WeeklyChallenge,
  ThemeDefinition,
  Badge
} from '../types';
import { SYSTEM_BADGES, USER_LEVELS, calculateSuspicionScore, THEMATIC_CATEGORIES } from '../services/seedData';
import { CsvImportSection } from './CsvImportSection';
import { WeeklyChallengesAdmin } from './WeeklyChallengesAdmin';
import { ThemeManagerAdmin } from './ThemeManagerAdmin';
import { BadgesManagerAdmin } from './BadgesManagerAdmin';
import { HostingCustomDomainAdmin } from './HostingCustomDomainAdmin';

interface AdminDashboardProps {
  items: QuestionnaireItem[];
  contributions: Contribution[];
  systemMetrics: SystemMetric;
  usersList: UserProfile[];
  challenges: WeeklyChallenge[];
  themes?: ThemeDefinition[];
  badges?: Badge[];
  onValidateContribution: (contributionId: string, status: 'approved' | 'rejected' | 'needs_revision', notes?: string) => Promise<void>;
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
  onUpdateUserLevelAndBadges: (userId: string, newLevelIndex: number, badges: string[], bonusXp?: number) => Promise<void>;
  onUpdateUserAccountStatus: (userId: string, status: 'active' | 'flagged' | 'suspended') => Promise<void>;
  onTriggerCloudSync: () => Promise<void>;
  currentUser: UserProfile | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  items,
  contributions,
  systemMetrics,
  usersList,
  challenges,
  themes = THEMATIC_CATEGORIES,
  badges = SYSTEM_BADGES,
  onValidateContribution,
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
  onUpdateUserLevelAndBadges,
  onUpdateUserAccountStatus,
  onTriggerCloudSync,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'defis' | 'themes' | 'badges_manager' | 'hosting' | 'csv_import' | 'validation' | 'questionnaires' | 'badges_levels' | 'fraud_detection'>('stats');

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const [validationFilter, setValidationFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [validationNote, setValidationNote] = useState<{ [id: string]: string }>({});

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

  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [userBonusXp, setUserBonusXp] = useState(100);

  const [fraudFilter, setFraudFilter] = useState<'all' | 'critical' | 'moderate'>('all');
  const [fraudSearchQuery, setFraudSearchQuery] = useState('');

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

  const filteredContributions = contributions.filter(c => {
    if (validationFilter === 'all') return true;
    return c.status === validationFilter;
  });

  const evaluatedUsers = (usersList || []).map(u => {
    const analysis = calculateSuspicionScore(u);
    return {
      ...u,
      calculatedScore: analysis.score,
      reasons: analysis.reasons,
      riskLevel: analysis.riskLevel
    };
  });

  const filteredSuspiciousUsers = evaluatedUsers.filter(u => {
    if (fraudFilter === 'critical') return u.riskLevel === 'critique';
    if (fraudFilter === 'moderate') return u.riskLevel === 'critique' || u.riskLevel === 'modere';
    return true;
  }).filter(u => {
    if (!fraudSearchQuery.trim()) return true;
    return (
      (u.fullName && u.fullName.toLowerCase().includes(fraudSearchQuery.toLowerCase())) ||
      (u.displayName && u.displayName.toLowerCase().includes(fraudSearchQuery.toLowerCase())) ||
      (u.contact && u.contact.toLowerCase().includes(fraudSearchQuery.toLowerCase())) ||
      (u.tribe && u.tribe.toLowerCase().includes(fraudSearchQuery.toLowerCase())) ||
      (u.villageOfOrigin && u.villageOfOrigin.toLowerCase().includes(fraudSearchQuery.toLowerCase()))
    );
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="warm-card-gradient rounded-3xl p-5 sm:p-6 border border-[#d97706]/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#f59e0b] uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Console d'Administration & Supervision OMPAGANO</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Espace Administrateur & Aînés
          </h1>
          <p className="text-xs sm:text-sm text-[#d4af94] mt-0.5">
            Pilotage des questionnaires, validation des enregistrements, gestion des badges et traçabilité de la communauté.
          </p>
        </div>

        <button
          onClick={onTriggerCloudSync}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl terracotta-gradient hover:opacity-90 text-white font-bold text-xs shadow-md transition-all active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Synchroniser Cloud Functions</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#3f2113]">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'stats' ? 'bg-[#c85a32] text-white shadow-md' : 'bg-[#27150c] text-[#d4af94] hover:bg-[#341b10]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Statistiques & Analyses</span>
        </button>

        <button
          onClick={() => setActiveTab('defis')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'defis' ? 'bg-[#d97706] text-black font-extrabold shadow-md' : 'bg-[#27150c] text-[#f59e0b] hover:bg-[#341b10]'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Défis Hebdomadaires ({challenges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('csv_import')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'csv_import' ? 'bg-[#c85a32] text-white shadow-md' : 'bg-[#27150c] text-[#fed7aa] hover:bg-[#341b10]'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Import CSV & Thèmes</span>
        </button>

        <button
          onClick={() => setActiveTab('validation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'validation' ? 'bg-[#c85a32] text-white shadow-md' : 'bg-[#27150c] text-[#d4af94] hover:bg-[#341b10]'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Validation Contributions ({contributions.filter(c => c.status === 'pending').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('questionnaires')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'questionnaires' ? 'bg-[#c85a32] text-white shadow-md' : 'bg-[#27150c] text-[#d4af94] hover:bg-[#341b10]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Gestion Questionnaires ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('badges_levels')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'badges_levels' ? 'bg-[#c85a32] text-white shadow-md' : 'bg-[#27150c] text-[#d4af94] hover:bg-[#341b10]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Niveaux & Badges ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fraud_detection')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'fraud_detection' ? 'bg-[#b91c1c] text-white shadow-md' : 'bg-[#27150c] text-[#fca5a5] hover:bg-[#341b10]'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-[#ef4444]" />
          <span>Audit Anti-Fraude & Espions</span>
        </button>
      </div>

      {/* TAB 1: STATS & ANALYTICS */}
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
              <div className="flex items-center justify-between text-[#eab308] mb-1">
                <span className="text-xs font-semibold">Enregistrements</span>
                <Mic className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-white">
                {contributions.filter(c => !!c.audioUrl).length}
              </div>
              <div className="text-[11px] text-[#a8826d]">Voix collectées</div>
            </div>

            <div className="p-4 bg-[#27150c] border border-[#4a2412] rounded-2xl">
              <div className="flex items-center justify-between text-[#22c55e] mb-1">
                <span className="text-xs font-semibold">Taux de Succès</span>
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-white">
                {contributions.length > 0 
                  ? Math.round((contributions.filter(c => c.status === 'approved').length / contributions.length) * 100) 
                  : 100}%
              </div>
              <div className="text-[11px] text-[#a8826d]">Validés par les aînés</div>
            </div>
          </div>

          {/* Activity by User Breakdown */}
          <div className="warm-card-gradient p-5 rounded-2xl border border-[#4a2412] space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#f59e0b]" />
              <span>Activité par Contributeur (Temps Réel)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#fed7aa]">
                <thead className="bg-[#180d07] text-[#f59e0b] uppercase font-bold border-b border-[#3b1d10]">
                  <tr>
                    <th className="p-3">Contributeur</th>
                    <th className="p-3">Tribu & Village</th>
                    <th className="p-3 text-center">Niveau</th>
                    <th className="p-3 text-center">Contributions</th>
                    <th className="p-3 text-center">Audios</th>
                    <th className="p-3 text-right">Points XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3b1d10]">
                  {usersList.map((user) => (
                    <tr key={user.id} className="hover:bg-[#25130a] transition-colors">
                      <td className="p-3 font-semibold text-white">
                        {user.fullName || user.displayName}
                        {user.role === 'admin' && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-[#7f1d1d] text-[#fca5a5]">Admin</span>
                        )}
                      </td>
                      <td className="p-3 text-[#d4af94]">
                        {user.tribe || 'Myènè'} • {user.villageOfOrigin || 'Non renseigné'}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#c85a32]/25 text-[#fed7aa] border border-[#c85a32]/30">
                          {user.level || 'Initié'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-white">
                        {user.contributionsCount || 0}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-[#f59e0b]">
                        {user.recordingsCount || 0}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-[#22c55e]">
                        {user.xp} XP
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: WEEKLY CHALLENGES (DÉFIS HEBDOMADAIRES) */}
      {activeTab === 'defis' && (
        <WeeklyChallengesAdmin
          challenges={challenges}
          onSaveChallenge={onSaveChallenge}
          onDeleteChallenge={onDeleteChallenge}
          onToggleActive={onToggleActiveChallenge}
        />
      )}

      {/* TAB: CSV IMPORT & THEMATIC CLASSIFICATION */}
      {activeTab === 'csv_import' && (
        <CsvImportSection
          onImportItems={onBatchImportItems}
          currentItemsCount={items.length}
        />
      )}

      {/* TAB 2: VALIDATION */}
      {activeTab === 'validation' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#d4af94]">Filtrer :</span>
              {(['pending', 'approved', 'rejected', 'all'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setValidationFilter(status)}
                  className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                    validationFilter === status ? 'bg-[#c85a32] text-white shadow-sm' : 'bg-[#27150c] text-[#a8826d] hover:bg-[#381e11]'
                  }`}
                >
                  {status === 'pending' ? 'En attente' : status === 'approved' ? 'Validés' : status === 'rejected' ? 'Rejetés' : 'Tous'}
                </button>
              ))}
            </div>
          </div>

          {filteredContributions.length === 0 ? (
            <div className="text-center py-12 warm-card-gradient rounded-3xl border border-[#4a2412] p-8">
              <CheckCircle className="w-12 h-12 text-[#22c55e] mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-bold text-white">Aucune contribution à valider</h3>
              <p className="text-xs text-[#a8826d] mt-1">
                Toutes les propositions ont été passées en revue par les aînés.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
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
                      <span className="text-[#a8826d]">Par {c.userDisplayName}</span>
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
                        </button>
                      ) : (
                        <span className="text-xs text-[#a8826d] italic">Aucun enregistrement audio</span>
                      )}
                    </div>

                    {c.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onValidateContribution(c.id, 'approved', validationNote[c.id])}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#166534] hover:bg-[#15803d] text-[#bbf7d0] text-xs font-semibold active:scale-95 transition-transform"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approuver (+Bonus XP)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onValidateContribution(c.id, 'rejected', validationNote[c.id] || 'Non conforme')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7f1d1d] hover:bg-[#991b1b] text-[#fecaca] text-xs font-semibold active:scale-95 transition-transform"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rejeter</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: QUESTIONNAIRE CONFIGURATION */}
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
                  <label className="block text-[#fed7aa] font-medium mb-1">URL de l’image d'illustration (téléchargeable hors-ligne) :</label>
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

      {/* TAB 4: BADGES & LEVELS MANAGEMENT */}
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
                    {SYSTEM_BADGES.map(badge => {
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
                        const b = SYSTEM_BADGES.find(x => x.id === bId);
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

      {/* TAB 5: ANTI-FRAUD & SUSPICIOUS / INACTIVE PROFILES TRACKER */}
      {activeTab === 'fraud_detection' && (
        <div className="space-y-5">
          <div className="p-4 bg-[#7f1d1d]/30 border border-[#ef4444]/40 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#fca5a5]">
              <ShieldAlert className="w-5 h-5 text-[#ef4444]" />
              <span>Traçabilité & Détection des Profils Stagnants, Faux Profils et Espions</span>
            </div>
            <p className="text-xs text-[#fecaca] leading-relaxed">
              Le programme OMPAGANO est réservé aux contributeurs authentiques de la communauté Myènè.
              Cet outil détecte automatiquement les comptes qui ont démarré mais n'avancent pas, les filiations douteuses ou les tentatives d'espionnage linguistique sans contribution réelle.
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
                Critique / Suspects
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
                      <span>Suspendre l'accès (Espion / Faux)</span>
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
