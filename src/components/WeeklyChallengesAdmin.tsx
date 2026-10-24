import React, { useState } from 'react';
import { 
  Trophy, 
  Target, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Sparkles, 
  CheckCircle, 
  Power,
  Award,
  Layers,
  ArrowRight
} from 'lucide-react';
import { WeeklyChallenge, ThemeDefinition, Badge } from '../types';
import { THEMATIC_CATEGORIES, SYSTEM_BADGES } from '../services/seedData';

interface WeeklyChallengesAdminProps {
  challenges: WeeklyChallenge[];
  themes?: ThemeDefinition[];
  badges?: Badge[];
  onSaveChallenge: (challenge: Partial<WeeklyChallenge>) => Promise<void>;
  onDeleteChallenge: (challengeId: string) => Promise<void>;
  onToggleActive: (challengeId: string, currentStatus: boolean) => Promise<void>;
}

export const WeeklyChallengesAdmin: React.FC<WeeklyChallengesAdminProps> = ({
  challenges,
  themes = THEMATIC_CATEGORIES,
  badges = SYSTEM_BADGES,
  onSaveChallenge,
  onDeleteChallenge,
  onToggleActive
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    theme: string;
    targetCount: number;
    challengeType: 'contributions' | 'recordings' | 'validations' | 'all';
    xpReward: number;
    badgeRewardId: string;
    badgeRewardName: string;
    badgeRewardIcon: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>({
    title: 'Défi Pêcheurs du Fleuve & des Lacs',
    description: 'Contribuer sur 5 phrases liées à la pêche, aux poissons et à l’Ogooué cette semaine.',
    theme: 'peche_navigation',
    targetCount: 5,
    challengeType: 'contributions',
    xpReward: 250,
    badgeRewardId: 'badge-defi-pecheur',
    badgeRewardName: 'Maître des Eaux & Pêche',
    badgeRewardIcon: '🎣',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    isActive: true
  });

  const handleEdit = (challenge: WeeklyChallenge) => {
    setEditingChallengeId(challenge.id);
    setFormData({
      title: challenge.title,
      description: challenge.description,
      theme: challenge.theme,
      targetCount: challenge.targetCount,
      challengeType: challenge.challengeType,
      xpReward: challenge.xpReward,
      badgeRewardId: challenge.badgeRewardId,
      badgeRewardName: challenge.badgeRewardName,
      badgeRewardIcon: challenge.badgeRewardIcon,
      startDate: challenge.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      endDate: challenge.endDate?.split('T')[0] || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      isActive: challenge.isActive
    });
    setIsCreating(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveChallenge({
      id: editingChallengeId || `defi-${Date.now()}`,
      ...formData,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate + 'T23:59:59Z').toISOString()
    });
    setIsCreating(false);
    setEditingChallengeId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3f2113] pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#f59e0b]" />
            <span>Gestion des Défis Hebdomadaires OMPAGANO</span>
          </h3>
          <p className="text-xs text-[#d4af94] mt-1">
            Configurez les challenges thématiques pour stimuler les contributions ciblées (Pêche, Rites, Faune...) et récompensez les utilisateurs par des badges spéciaux.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingChallengeId(null);
            setIsCreating(!isCreating);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl terracotta-gradient hover:opacity-90 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? 'Fermer le formulaire' : 'Créer un Défi Hebdomadaire'}</span>
        </button>
      </div>

      {/* Creation / Edition Form */}
      {isCreating && (
        <form onSubmit={handleSubmit} className="warm-card-gradient border-2 border-[#f59e0b]/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#4a2412] pb-3">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#f59e0b]" />
              <span>{editingChallengeId ? 'Modifier le Défi Hebdomadaire' : 'Nouveau Défi Hebdomadaire'}</span>
            </h4>
            <span className="text-xs text-[#f59e0b] font-mono">Format Hebdomadaire</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Titre du Défi :
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#140a05] border border-[#4a2412] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]"
                placeholder="Ex: Défi Pêcheurs du Fleuve & des Lacs"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Description & Objectif pour l'utilisateur :
              </label>
              <textarea
                rows={2}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]"
                placeholder="Ex: Contribuer sur 5 phrases liées à la pêche cette semaine pour débloquer le badge spécial..."
              />
            </div>

            {/* Theme */}
            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Thème ciblé :
              </label>
              <select
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#140a05] border border-[#4a2412] rounded-xl text-[#fed7aa] focus:outline-none focus:border-[#f59e0b]"
              >
                <option value="all">🌟 Tous les thèmes confondus</option>
                {themes.map(th => (
                  <option key={th.id} value={th.id}>
                    {th.icon} {th.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Action requise :
              </label>
              <select
                value={formData.challengeType}
                onChange={(e) => setFormData({ ...formData, challengeType: e.target.value as any })}
                className="w-full px-3 py-2.5 bg-[#140a05] border border-[#4a2412] rounded-xl text-[#fed7aa] focus:outline-none focus:border-[#f59e0b]"
              >
                <option value="contributions">Contributions (Orthographe & Texte)</option>
                <option value="recordings">Enregistrements Vocaux (Audio)</option>
                <option value="validations">Validations de Relecture (Aînés)</option>
                <option value="all">Toutes actions linguistiques</option>
              </select>
            </div>

            {/* Target Count */}
            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Nombre de phrases à accomplir :
              </label>
              <input
                type="number"
                min="1"
                max="50"
                required
                value={formData.targetCount}
                onChange={(e) => setFormData({ ...formData, targetCount: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-white font-mono focus:outline-none focus:border-[#f59e0b]"
              />
            </div>

            {/* XP Reward */}
            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Récompense en Points XP :
              </label>
              <input
                type="number"
                min="50"
                step="50"
                required
                value={formData.xpReward}
                onChange={(e) => setFormData({ ...formData, xpReward: parseInt(e.target.value) || 200 })}
                className="w-full px-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-[#f59e0b] font-mono font-bold focus:outline-none focus:border-[#f59e0b]"
              />
            </div>

            {/* Quick Badge Template Selector */}
            <div className="sm:col-span-2 bg-[#140a05] p-3 rounded-xl border border-[#4a2412]">
              <label className="block text-[#fed7aa] font-semibold mb-1.5">
                Dénomination du Badge Récompense (Choisir un modèle ou saisir ci-dessous) :
              </label>
              <select
                onChange={(e) => {
                  const b = badges.find(bg => bg.id === e.target.value);
                  if (b) {
                    setFormData({
                      ...formData,
                      badgeRewardId: b.id,
                      badgeRewardName: b.title,
                      badgeRewardIcon: b.icon
                    });
                  }
                }}
                className="w-full px-3 py-2 bg-[#1e130c] border border-[#4a2412] rounded-xl text-xs text-[#fed7aa] mb-2 focus:outline-none"
              >
                <option value="">Sélectionner parmi les badges actifs du système...</option>
                {badges.map(bg => (
                  <option key={bg.id} value={bg.id}>
                    {bg.icon} {bg.title} ({bg.category})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    value={formData.badgeRewardName}
                    onChange={(e) => setFormData({ ...formData, badgeRewardName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1e130c] border border-[#4a2412] rounded-xl text-white text-xs focus:outline-none focus:border-[#f59e0b]"
                    placeholder="Dénomination dynamique du badge"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.badgeRewardIcon}
                    onChange={(e) => setFormData({ ...formData, badgeRewardIcon: e.target.value })}
                    className="w-14 px-2 py-2 bg-[#1e130c] border border-[#4a2412] rounded-xl text-center text-sm focus:outline-none focus:border-[#f59e0b]"
                    placeholder="🎣"
                  />
                  <input
                    type="text"
                    required
                    value={formData.badgeRewardId}
                    onChange={(e) => setFormData({ ...formData, badgeRewardId: e.target.value })}
                    className="flex-1 px-2.5 py-2 bg-[#1e130c] border border-[#4a2412] rounded-xl text-white font-mono text-[10px] focus:outline-none focus:border-[#f59e0b]"
                    placeholder="ID du badge"
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Date de début :
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Date de fin :
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#4a2412]">
            <label className="flex items-center gap-2 text-xs text-[#fed7aa] cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-[#d97706] focus:ring-0 bg-[#140a05] border-[#4a2412]"
              />
              <span>Rendre ce défi actif immédiatement pour les utilisateurs</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingChallengeId(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#27150c] text-[#a8826d] hover:bg-[#341b10] text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl terracotta-gradient hover:opacity-90 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                Enregistrer le Défi
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Challenges List */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span>Défis Hebdomadaires Configurés ({challenges.length})</span>
        </h4>

        {challenges.length === 0 ? (
          <div className="p-8 text-center bg-[#1e130c] border border-[#4a2e1d] rounded-2xl text-xs text-[#d4af94]">
            Aucun défi hebdomadaire configuré. Cliquez sur "Créer un Défi Hebdomadaire" pour lancer le premier challenge.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {challenges.map(challenge => {
              const theme = THEMATIC_CATEGORIES.find(t => t.id === challenge.theme);
              return (
                <div
                  key={challenge.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    challenge.isActive
                      ? 'bg-[#22130b] border-[#d97706]/50 shadow-lg'
                      : 'bg-[#180e08] border-[#3b1f11] opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl flex items-center justify-center w-10 h-10 rounded-xl bg-[#2a170d] border border-[#4a2e1d] shadow-sm">
                        {challenge.badgeRewardIcon || '🎯'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            challenge.isActive 
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                          }`}>
                            {challenge.isActive ? 'Actif en cours' : 'Inactif / Terminé'}
                          </span>
                          {theme && (
                            <span className="text-[10px] text-[#f59e0b] font-medium">
                              {theme.icon} {theme.shortName}
                            </span>
                          )}
                        </div>
                        <h5 className="font-bold text-sm text-white mt-0.5">
                          {challenge.title}
                        </h5>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onToggleActive(challenge.id, challenge.isActive)}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          challenge.isActive
                            ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border-emerald-500/40'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                        title={challenge.isActive ? 'Désactiver le défi' : 'Activer le défi'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEdit(challenge)}
                        className="p-1.5 rounded-lg bg-[#2a170d] hover:bg-[#3d1f11] text-[#fed7aa] border border-[#4a2e1d]"
                        title="Modifier ce défi"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteChallenge(challenge.id)}
                        className="p-1.5 rounded-lg bg-[#2a170d] hover:bg-rose-950 text-rose-400 border border-rose-900/40"
                        title="Supprimer ce défi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#d4af94] mb-3 leading-relaxed">
                    {challenge.description}
                  </p>

                  <div className="pt-2.5 border-t border-[#3b1f11] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-[#fed7aa]">
                      <Target className="w-3.5 h-3.5 text-[#f59e0b]" />
                      <span>Objectif : <strong>{challenge.targetCount} phrases</strong> ({challenge.challengeType})</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#f59e0b] font-bold">
                      <Award className="w-3.5 h-3.5" />
                      <span>+{challenge.xpReward} XP</span>
                      <span className="text-[#d4af94] font-normal">({challenge.badgeRewardName})</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
