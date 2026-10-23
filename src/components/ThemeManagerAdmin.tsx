import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Sparkles, 
  Tag, 
  Hash, 
  Palette, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { ThemeDefinition, QuestionnaireItem } from '../types';

interface ThemeManagerAdminProps {
  themes: ThemeDefinition[];
  items: QuestionnaireItem[];
  onSaveTheme: (theme: Partial<ThemeDefinition>) => Promise<void>;
  onDeleteTheme: (themeId: string) => Promise<void>;
}

const PRESET_ICONS = ['🛶', '🐆', '👑', '🍲', '🏡', '📜', '🧺', '🔢', '🌿', '✨', '🪘', '🩺', '🌊', '🛡️', '🏹', '🦅', '🏝️', '🏮', '🔥', '💎'];
const PRESET_COLORS = ['#0284C7', '#15803D', '#B45309', '#C2410C', '#9333EA', '#D97706', '#E11D48', '#4F46E5', '#0D9488', '#475569'];

export const ThemeManagerAdmin: React.FC<ThemeManagerAdminProps> = ({
  themes,
  items,
  onSaveTheme,
  onDeleteTheme
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    icon: '🏷️',
    color: '#0284C7',
    description: '',
    keywordsInput: ''
  });

  const getThemeItemCount = (themeId: string) => {
    return items.filter(i => (i.category === themeId || i.theme === themeId)).length;
  };

  const handleStartCreate = () => {
    setEditingThemeId(null);
    setFormData({
      name: '',
      shortName: '',
      icon: '🏷️',
      color: '#0284C7',
      description: '',
      keywordsInput: ''
    });
    setIsEditing(true);
    setFeedbackMsg(null);
  };

  const handleStartEdit = (theme: ThemeDefinition) => {
    setEditingThemeId(theme.id);
    setFormData({
      name: theme.name,
      shortName: theme.shortName,
      icon: theme.icon,
      color: theme.color,
      description: theme.description,
      keywordsInput: (theme.keywords || []).join(', ')
    });
    setIsEditing(true);
    setFeedbackMsg(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingThemeId(null);
    setFeedbackMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.shortName.trim()) {
      setFeedbackMsg({ text: 'Veuillez renseigner le nom complet et le nom court du thème.', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const keywords = formData.keywordsInput
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);

      const generatedId = editingThemeId || `theme_${formData.shortName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')}_${Date.now().toString().slice(-4)}`;

      await onSaveTheme({
        id: generatedId,
        name: formData.name.trim(),
        shortName: formData.shortName.trim(),
        icon: formData.icon || '🏷️',
        color: formData.color || '#0284C7',
        description: formData.description.trim() || `Module thématique : ${formData.name}`,
        keywords: keywords.length > 0 ? keywords : [formData.shortName.toLowerCase()],
        isCustom: true
      });

      setFeedbackMsg({ text: `Thème "${formData.name}" enregistré avec succès dans Firestore !`, type: 'success' });
      setIsEditing(false);
      setEditingThemeId(null);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: 'Erreur lors de la sauvegarde du thème.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (themeId: string, themeName: string) => {
    if (!confirm(`Confirmez-vous la suppression du thème "${themeName}" ?`)) return;
    try {
      await onDeleteTheme(themeId);
      setFeedbackMsg({ text: `Thème "${themeName}" supprimé avec succès.`, type: 'success' });
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: 'Erreur lors de la suppression du thème.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick stats */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-stone-900">Gestionnaire de Thèmes Dynamiques</h2>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Les thèmes classifient le corpus, alimentent les filtres et déterminent les défis hebdomadaires. Ils s'enrichissent automatiquement via les imports CSV ou manuellement ci-dessous.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-sm font-semibold shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouveau Thème
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

      {/* Form modal/card when editing or creating */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-stone-50 rounded-2xl p-6 border-2 border-amber-300 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              {editingThemeId ? 'Modifier le Thème' : 'Créer un Nouveau Thème Dynamique'}
            </h3>
            <button type="button" onClick={handleCancel} className="text-stone-400 hover:text-stone-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Nom complet du thème *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Faune Fluviale & Oiseaux des Marais"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Nom court / Étiquette d'affichage *
              </label>
              <input
                type="text"
                value={formData.shortName}
                onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                placeholder="Ex: Faune Fluviale"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Icon and Color selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Icône du thème (Emoji)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                  maxLength={4}
                  className="w-16 px-3 py-2 text-center text-xl bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex flex-wrap gap-1">
                  {PRESET_ICONS.slice(0, 10).map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                        formData.icon === icon ? 'bg-amber-200 border border-amber-500' : 'bg-white hover:bg-stone-100 border border-stone-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Couleur d'accentuation
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 p-1 bg-white border border-stone-300 rounded-xl cursor-pointer"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      className="w-6 h-6 rounded-full border-2 transition"
                      style={{ 
                        backgroundColor: c, 
                        borderColor: formData.color === c ? '#1c1917' : 'transparent' 
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Description du thème & contenu couvert
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Expliquez ce que recouvre ce module thématique..."
              className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Mots-clés pour la détection automatique (séparés par des virgules)
            </label>
            <input
              type="text"
              value={formData.keywordsInput}
              onChange={e => setFormData({ ...formData, keywordsInput: e.target.value })}
              placeholder="Ex: canard, héron, nénuphar, lagune, marais"
              className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Ces mots-clés permettent d'assigner automatiquement ce thème aux nouvelles phrases importées depuis les fichiers CSV.
            </p>
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
              {isSaving ? 'Enregistrement...' : 'Enregistrer le Thème'}
            </button>
          </div>
        </form>
      )}

      {/* Grid of existing themes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map(theme => {
          const phraseCount = getThemeItemCount(theme.id);
          return (
            <div 
              key={theme.id}
              className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs"
                      style={{ backgroundColor: `${theme.color}15`, border: `1px solid ${theme.color}40` }}
                    >
                      {theme.icon}
                    </span>
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm leading-tight">{theme.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span 
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${theme.color}20`, color: theme.color }}
                        >
                          {theme.shortName}
                        </span>
                        {theme.isCustom && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">
                            Personnalisé
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartEdit(theme)}
                      className="p-1.5 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                      title="Modifier ce thème"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {theme.isCustom && (
                      <button
                        onClick={() => handleDelete(theme.id, theme.name)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Supprimer ce thème"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-stone-600 line-clamp-3 mb-3 mt-2 leading-relaxed">
                  {theme.description}
                </p>

                {theme.keywords && theme.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {theme.keywords.slice(0, 5).map((kw, idx) => (
                      <span key={idx} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-mono">
                        #{kw}
                      </span>
                    ))}
                    {theme.keywords.length > 5 && (
                      <span className="text-[10px] text-stone-400 px-1 py-0.5">
                        +{theme.keywords.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span className="flex items-center gap-1 font-semibold text-stone-700">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  {phraseCount} phrase{phraseCount > 1 ? 's' : ''} liée{phraseCount > 1 ? 's' : ''}
                </span>
                <span className="font-mono text-[11px] text-stone-400">
                  ID: {theme.id}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
