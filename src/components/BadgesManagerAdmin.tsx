import React, { useState } from 'react';
import { 
  Award, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Sparkles, 
  Trophy, 
  Sliders, 
  FileText,
  Mic,
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Badge, UserProfile } from '../types';

interface BadgesManagerAdminProps {
  badges: Badge[];
  usersList: UserProfile[];
  onSaveBadge: (badge: Partial<Badge>) => Promise<void>;
  onDeleteBadge: (badgeId: string) => Promise<void>;
}

const PRESET_BADGE_ICONS = ['📜', '🪶', '👂', '🎙️', '🌊', '👑', '🎣', '🐆', '🍲', '🏡', '🏆', '⭐', '🔥', '💎', '🛡️', '⚡', '🦉', '🛶'];

const BADGE_CATEGORIES = [
  { id: 'defi', label: 'Défis Hebdomadaires', color: 'bg-amber-100 text-amber-800' },
  { id: 'orthographe', label: 'Traductions & Textes', color: 'bg-blue-100 text-blue-800' },
  { id: 'audio', label: 'Voix & Enregistrements', color: 'bg-rose-100 text-rose-800' },
  { id: 'expert', label: 'Expertise & Sagesse', color: 'bg-purple-100 text-purple-800' },
  { id: 'fidelite', label: 'Fidélité & Séries', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'genealogie', label: 'Filiation & Clans', color: 'bg-stone-100 text-stone-800' }
];

export const BadgesManagerAdmin: React.FC<BadgesManagerAdminProps> = ({
  badges,
  usersList,
  onSaveBadge,
  onDeleteBadge
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: '🏆',
    category: 'defi',
    requiredXp: 0,
    requiredContributions: 0,
    requiredRecordings: 0,
    requiredValidations: 0
  });

  const getHoldersCount = (badgeId: string) => {
    return usersList.filter(u => u.badges && u.badges.includes(badgeId)).length;
  };

  const handleStartCreate = () => {
    setEditingBadgeId(null);
    setFormData({
      title: '',
      description: '',
      icon: '🏆',
      category: 'defi',
      requiredXp: 150,
      requiredContributions: 5,
      requiredRecordings: 0,
      requiredValidations: 0
    });
    setIsEditing(true);
    setFeedbackMsg(null);
  };

  const handleStartEdit = (badge: Badge) => {
    setEditingBadgeId(badge.id);
    setFormData({
      title: badge.title,
      description: badge.description,
      icon: badge.icon,
      category: badge.category || 'defi',
      requiredXp: badge.requiredXp || 0,
      requiredContributions: badge.requiredContributions || 0,
      requiredRecordings: badge.requiredRecordings || 0,
      requiredValidations: badge.requiredValidations || 0
    });
    setIsEditing(true);
    setFeedbackMsg(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingBadgeId(null);
    setFeedbackMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      setFeedbackMsg({ text: 'Veuillez renseigner la dénomination et la description du badge.', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const generatedId = editingBadgeId || `badge_${formData.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')}_${Date.now().toString().slice(-4)}`;

      await onSaveBadge({
        id: generatedId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        icon: formData.icon || '🏆',
        category: formData.category,
        requiredXp: formData.requiredXp > 0 ? Number(formData.requiredXp) : undefined,
        requiredContributions: formData.requiredContributions > 0 ? Number(formData.requiredContributions) : undefined,
        requiredRecordings: formData.requiredRecordings > 0 ? Number(formData.requiredRecordings) : undefined,
        requiredValidations: formData.requiredValidations > 0 ? Number(formData.requiredValidations) : undefined,
        isCustom: true,
        updatedAt: new Date().toISOString()
      });

      setFeedbackMsg({ text: `Badge "${formData.title}" synchronisé avec succès !`, type: 'success' });
      setIsEditing(false);
      setEditingBadgeId(null);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: 'Erreur lors de la sauvegarde du badge.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (badgeId: string, badgeTitle: string) => {
    if (!confirm(`Confirmez-vous la suppression du badge "${badgeTitle}" ?`)) return;
    try {
      await onDeleteBadge(badgeId);
      setFeedbackMsg({ text: `Badge "${badgeTitle}" supprimé avec succès.`, type: 'success' });
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: 'Erreur lors de la suppression.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Award className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-stone-900">Dénominations Dynamiques des Badges & Défis</h2>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Les dénominations, icônes et conditions d'attribution des badges sont configurables en direct. Chaque modification se répercute instantanément sur les profils et le classement mondial.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-sm font-semibold shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouveau Badge Personnalisé
        </button>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedbackMsg.type === 'success' ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Editing Form */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-stone-50 rounded-2xl p-6 border-2 border-amber-300 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              {editingBadgeId ? 'Modifier la Dénomination du Badge' : 'Créer un Nouveau Badge'}
            </h3>
            <button type="button" onClick={handleCancel} className="text-stone-400 hover:text-stone-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Dénomination officielle du badge (Titre) *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Sentinelle des Racines, Pêcheur Émérite..."
                required
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Catégorie du Badge
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {BADGE_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Icône Emblématique
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.icon}
                onChange={e => setFormData({ ...formData, icon: e.target.value })}
                maxLength={4}
                className="w-16 px-3 py-2 text-center text-2xl bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex flex-wrap gap-1.5">
                {PRESET_BADGE_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                      formData.icon === icon ? 'bg-amber-200 border-2 border-amber-600' : 'bg-white hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Description & Haut-Fait requis *
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Expliquez ce qui est récompensé par ce badge..."
              required
              className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Criteria Grid */}
          <div className="bg-white p-4 rounded-xl border border-stone-200">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
              Conditions Numériques d'Attribution Automatique (0 = Aucune condition)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">XP Minimum</label>
                <input
                  type="number"
                  min="0"
                  value={formData.requiredXp}
                  onChange={e => setFormData({ ...formData, requiredXp: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">Traductions / Phrases</label>
                <input
                  type="number"
                  min="0"
                  value={formData.requiredContributions}
                  onChange={e => setFormData({ ...formData, requiredContributions: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">Enregistrements Vocaux</label>
                <input
                  type="number"
                  min="0"
                  value={formData.requiredRecordings}
                  onChange={e => setFormData({ ...formData, requiredRecordings: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">Validations Réalisées</label>
                <input
                  type="number"
                  min="0"
                  value={formData.requiredValidations}
                  onChange={e => setFormData({ ...formData, requiredValidations: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* Live Preview of Badge Card */}
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block mb-2">
              Aperçu en direct sur le profil utilisateur :
            </span>
            <div className="inline-flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-2xl">{formData.icon || '🏆'}</span>
              <div>
                <div className="font-bold text-stone-900 text-sm">{formData.title || 'Dénomination du Badge'}</div>
                <div className="text-xs text-stone-500 max-w-sm">{formData.description || 'Description du haut-fait...'}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-sm font-semibold transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50"
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer la Dénomination'}
            </button>
          </div>
        </form>
      )}

      {/* Grid of Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {badges.map(badge => {
          const holdersCount = getHoldersCount(badge.id);
          const categoryInfo = BADGE_CATEGORIES.find(c => c.id === badge.category) || { label: badge.category, color: 'bg-stone-100 text-stone-800' };

          return (
            <div
              key={badge.id}
              className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl shadow-xs">
                      {badge.icon}
                    </span>
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm leading-tight">{badge.title}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                        {badge.isCustom && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">
                            Personnalisé
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartEdit(badge)}
                      className="p-1.5 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                      title="Modifier la dénomination"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {badge.isCustom && (
                      <button
                        onClick={() => handleDelete(badge.id, badge.title)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Supprimer ce badge"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-stone-600 mb-3 mt-2 leading-relaxed">
                  {badge.description}
                </p>

                {/* Criteria tags */}
                <div className="flex flex-wrap gap-1.5 mb-3 text-[10px] font-semibold text-stone-500">
                  {badge.requiredXp ? (
                    <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                      ⚡ {badge.requiredXp} XP
                    </span>
                  ) : null}
                  {badge.requiredContributions ? (
                    <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                      📝 {badge.requiredContributions} contributions
                    </span>
                  ) : null}
                  {badge.requiredRecordings ? (
                    <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded-md border border-rose-200">
                      🎙️ {badge.requiredRecordings} audios
                    </span>
                  ) : null}
                  {badge.requiredValidations ? (
                    <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200">
                      👂 {badge.requiredValidations} validations
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span className="font-semibold text-stone-700">
                  {holdersCount} détenteur{holdersCount > 1 ? 's' : ''}
                </span>
                <span className="font-mono text-[11px] text-stone-400">
                  ID: {badge.id}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
