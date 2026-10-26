import React, { useState, useMemo } from 'react';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  Database, 
  Sparkles,
  Filter,
  Check,
  ShieldCheck
} from 'lucide-react';
import { QuestionnaireItem, ThemeDefinition } from '../types';
import { 
  THEMATIC_CATEGORIES, 
  parsePhrasesAndDiscoverThemes, 
  generateCsvTemplate,
  deduplicateParsedCsvItems
} from '../services/seedData';

interface CsvImportSectionProps {
  onImportItems: (
    items: QuestionnaireItem[],
    onProgress?: (savedCount: number, totalCount: number) => void
  ) => Promise<void>;
  currentItemsCount: number;
  existingItems?: QuestionnaireItem[];
  themes?: ThemeDefinition[];
  onRegisterNewThemes?: (newThemes: ThemeDefinition[]) => Promise<void>;
}

export const CsvImportSection: React.FC<CsvImportSectionProps> = ({
  onImportItems,
  currentItemsCount,
  existingItems = [],
  themes = THEMATIC_CATEGORIES,
  onRegisterNewThemes
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<QuestionnaireItem[]>([]);
  const [discoveredThemes, setDiscoveredThemes] = useState<ThemeDefinition[]>([]);
  const [selectedThemeFilter, setSelectedThemeFilter] = useState<string>('all');
  const [showOnlyNewInPreview, setShowOnlyNewInPreview] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState<{ saved: number; total: number } | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);

  // Quick corpus import status
  const [isLoadingBuiltInCorpus, setIsLoadingBuiltInCorpus] = useState(false);

  // Live deduplication analysis against existing items in the database
  const deduplicationReport = useMemo(() => {
    return deduplicateParsedCsvItems(parsedItems, existingItems);
  }, [parsedItems, existingItems]);

  const newItemsSet = useMemo(() => {
    return new Set(deduplicationReport.newItemsToImport.map(i => i.id));
  }, [deduplicationReport.newItemsToImport]);

  // Handle local CSV file upload
  const handleFile = (file: File) => {
    setSelectedFileName(file.name);
    setImportSuccessMessage(null);
    setImportErrorMessage(null);
    setDiscoveredThemes([]);
    setImportProgress(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          setImportErrorMessage("Le fichier CSV est vide.");
          return;
        }

        const { items, newDiscoveredThemes } = parsePhrasesAndDiscoverThemes(text, 'orungu', themes);
        if (items.length === 0) {
          setImportErrorMessage("Aucune phrase valide n'a pu être extraite. Vérifiez les entêtes de colonnes.");
          return;
        }

        const dedup = deduplicateParsedCsvItems(items, existingItems);

        setParsedItems(items);
        setDiscoveredThemes(newDiscoveredThemes);

        let msg = `Analyse terminée : ${items.length} phrase(s) lue(s) dans le fichier. `;
        if (dedup.alreadyExistingItems.length > 0) {
          msg += `🛡️ ${dedup.alreadyExistingItems.length} fiche(s) déjà présentes dans la base seront ignorées automatiquement (0 doublon). `;
        }
        msg += `🚀 ${dedup.newItemsToImport.length} nouvelle(s) fiche(s) prête(s) à être importée(s).`;
        if (newDiscoveredThemes.length > 0) {
          msg += ` ✨ ${newDiscoveredThemes.length} nouveau(x) thème(s) détecté(s) (${newDiscoveredThemes.map(t => t.name).join(', ')}).`;
        }
        setImportSuccessMessage(msg);
      } catch (err) {
        console.error("Erreur de parsing CSV:", err);
        setImportErrorMessage("Erreur lors de la lecture du fichier CSV. Assurez-vous qu'il s'agit d'un encodage UTF-8 valide.");
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Download CSV Template
  const handleDownloadTemplate = () => {
    const csvContent = generateCsvTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modele_import_phrases_ompagano.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load Built-in TTS Corpus (from /assets/aistudio/corpus_tts_orungu_5h_2200_phrases_89d15d12.csv)
  const handleLoadBuiltInCorpus = async (limitCount?: number, targetCategory?: string) => {
    setIsLoadingBuiltInCorpus(true);
    setImportErrorMessage(null);
    setImportSuccessMessage(null);
    setDiscoveredThemes([]);
    setImportProgress(null);

    try {
      const response = await fetch('/assets/aistudio/corpus_tts_orungu_5h_2200_phrases_89d15d12.csv');
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const csvText = await response.text();
      const { items, newDiscoveredThemes } = parsePhrasesAndDiscoverThemes(csvText, 'orungu', themes);
      let allItems = items;

      if (targetCategory) {
        allItems = allItems.filter(i => i.category === targetCategory);
      }

      if (limitCount && limitCount > 0) {
        allItems = allItems.slice(0, limitCount);
      }

      const dedup = deduplicateParsedCsvItems(allItems, existingItems);

      setParsedItems(allItems);
      setDiscoveredThemes(newDiscoveredThemes);
      setSelectedFileName(`Corpus TTS Ôrungu (${allItems.length} phrases sélectionnées)`);

      let msg = `Analyse du corpus : ${allItems.length} phrase(s) analysée(s). `;
      if (dedup.alreadyExistingItems.length > 0) {
        msg += `🛡️ ${dedup.alreadyExistingItems.length} fiche(s) déjà présentes en base sont ignorées (aucun doublon). `;
      }
      msg += `🚀 ${dedup.newItemsToImport.length} nouvelle(s) fiche(s) restante(s) à importer.`;
      if (newDiscoveredThemes.length > 0) {
        msg += ` ✨ ${newDiscoveredThemes.length} nouveau(x) module(s) thématique(s) découvert(s).`;
      }
      setImportSuccessMessage(msg);
    } catch (err) {
      console.error("Erreur chargement corpus local:", err);
      setImportErrorMessage("Impossible de charger le corpus local. Utilisez l'import de fichier classique.");
    } finally {
      setIsLoadingBuiltInCorpus(false);
    }
  };

  // Items that will actually be imported (respecting both deduplication AND optional theme filter)
  const itemsReadyToImport = useMemo(() => {
    const baseNew = deduplicationReport.newItemsToImport;
    if (selectedThemeFilter === 'all') return baseNew;
    return baseNew.filter(item => item.category === selectedThemeFilter || item.theme === selectedThemeFilter);
  }, [deduplicationReport.newItemsToImport, selectedThemeFilter]);

  // Execute Resumable, Deduplicated Import
  const handleExecuteImport = async () => {
    if (itemsReadyToImport.length === 0) return;
    setIsProcessing(true);
    setImportErrorMessage(null);
    setImportProgress({ saved: 0, total: itemsReadyToImport.length });

    try {
      // If new themes were discovered from CSV, register them first!
      if (discoveredThemes.length > 0 && onRegisterNewThemes) {
        await onRegisterNewThemes(discoveredThemes);
      }

      const countToImport = itemsReadyToImport.length;
      const skippedCount = deduplicationReport.alreadyExistingItems.length;

      await onImportItems(itemsReadyToImport, (saved, total) => {
        setImportProgress({ saved, total });
      });

      setImportSuccessMessage(
        `🎉 Importation terminée avec succès ! ${countToImport} nouvelle(s) fiche(s) ajoutée(s) sans aucun doublon` +
        (skippedCount > 0 ? ` (${skippedCount} fiche(s) déjà existantes ont été préservées intactes).` : '.')
      );
      setParsedItems([]);
      setDiscoveredThemes([]);
      setSelectedFileName(null);
      setImportProgress(null);
    } catch (err) {
      console.error("Erreur import base:", err);
      setImportErrorMessage("Une erreur est survenue lors de l'enregistrement. Vous pouvez relancer le même fichier : la reprise reprendra exactement là où elle s'est arrêtée sans doublon.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter parsed items preview by theme & new-only toggle
  const filteredPreviewItems = useMemo(() => {
    const sourceList = showOnlyNewInPreview ? deduplicationReport.newItemsToImport : parsedItems;
    return sourceList.filter(item => {
      if (selectedThemeFilter === 'all') return true;
      return item.category === selectedThemeFilter || item.theme === selectedThemeFilter;
    });
  }, [parsedItems, deduplicationReport.newItemsToImport, showOnlyNewInPreview, selectedThemeFilter]);

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3f2113] pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#f59e0b]" />
            <span>Import CSV de Phrases & Classification Thématique</span>
          </h3>
          <p className="text-xs text-[#d4af94] mt-1">
            Importez des lots massifs de vocabulaire, proverbes et récits en Myènè (Ôrungu, Enenga, Mpongwè...) avec classification automatique par thème.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#2a170d] hover:bg-[#3d1f11] text-[#f59e0b] border border-[#d97706]/40 text-xs font-bold transition-all shadow-sm shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Télécharger le Modèle CSV</span>
        </button>
      </div>

      {/* CLASSIFICATION PAR THÈME (THEMATIC TAXONOMY DYNAMIQUE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#f59e0b]" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Répertoire Thématique Actif ({themes.length} Thèmes Configurés & Découverts)
            </h4>
          </div>
          <span className="text-[11px] text-[#f59e0b] bg-[#1c120c] px-2.5 py-0.5 rounded-full border border-[#4a2e1d]">
            Format enrichi OMPAGANO
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {themes.map(theme => (
            <div
              key={theme.id}
              className="p-3.5 bg-[#1e130c] border border-[#4a2e1d] hover:border-[#d97706]/50 rounded-2xl transition-all shadow-md group"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <span 
                  className="text-xl flex items-center justify-center w-8 h-8 rounded-xl bg-[#2a170d] border border-[#4a2e1d]"
                  style={{ borderColor: theme.color ? `${theme.color}60` : undefined }}
                >
                  {theme.icon}
                </span>
                <div className="overflow-hidden">
                  <h5 className="font-bold text-xs text-white truncate group-hover:text-[#f59e0b] transition-colors">
                    {theme.name}
                  </h5>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-[#f59e0b]/80 font-mono">
                      ID: {theme.id}
                    </span>
                    {theme.isCustom && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-semibold">
                        Custom
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#d4af94] line-clamp-2 leading-relaxed">
                {theme.description}
              </p>
              <div className="mt-2 pt-2 border-t border-[#351e12] flex flex-wrap gap-1">
                {(theme.keywords || []).slice(0, 3).map((kw, idx) => (
                  <span key={idx} className="text-[9px] px-1.5 py-0.2 rounded bg-[#140b06] text-[#fed7aa]/70 font-mono">
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QUICK PRE-LOAD FROM BUILT-IN CORPUS TTS ORUNGU */}
      <div className="warm-card-gradient border border-[#d97706]/40 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#f59e0b] uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Corpus TTS Ôrungu Intégré (2 200 phrases disponibles)</span>
            </div>
            <h4 className="text-base font-extrabold text-white">
              Injection Rapide depuis le Fichier du Projet
            </h4>
            <p className="text-xs text-[#d4af94] mt-0.5">
              Le fichier CSV <code className="text-[#f59e0b] bg-[#140a05] px-1.5 py-0.5 rounded">corpus_tts_orungu_5h_2200_phrases.csv</code> est préchargé dans votre espace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleLoadBuiltInCorpus(25, 'peche_navigation')}
              disabled={isLoadingBuiltInCorpus}
              className="px-3 py-2 rounded-xl bg-[#0284c7]/20 hover:bg-[#0284c7]/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>🛶 Pack Pêche (25)</span>
            </button>

            <button
              onClick={() => handleLoadBuiltInCorpus(25, 'clans_histoire_rites')}
              disabled={isLoadingBuiltInCorpus}
              className="px-3 py-2 rounded-xl bg-[#b45309]/20 hover:bg-[#b45309]/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>👑 Pack Rois & Clans (25)</span>
            </button>

            <button
              onClick={() => handleLoadBuiltInCorpus(50)}
              disabled={isLoadingBuiltInCorpus}
              className="px-3 py-2 rounded-xl bg-[#c85a32]/25 hover:bg-[#c85a32]/35 text-[#fed7aa] border border-[#c85a32]/50 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>📦 Échantillon (50)</span>
            </button>

            <button
              onClick={() => handleLoadBuiltInCorpus()}
              disabled={isLoadingBuiltInCorpus}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b84a28] hover:opacity-90 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Charger Tout (2200)</span>
            </button>
          </div>
        </div>

        {isLoadingBuiltInCorpus && (
          <div className="flex items-center gap-2 p-3 bg-[#140a05] rounded-xl text-xs text-[#f59e0b] animate-pulse">
            <Database className="w-4 h-4 animate-spin" />
            <span>Lecture et classification automatique du fichier corpus TTS en cours...</span>
          </div>
        )}
      </div>

      {/* DRAG & DROP ZONE FOR CUSTOM CSV */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all ${
          dragActive 
            ? 'border-[#f59e0b] bg-[#d97706]/10 scale-[1.01]' 
            : 'border-[#4a2e1d] bg-[#1e130c]/60 hover:border-[#d97706]/40'
        }`}
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#2a170d] border border-[#d97706]/30 flex items-center justify-center text-[#f59e0b] shadow-md">
            <Upload className="w-7 h-7" />
          </div>

          <div>
            <h4 className="text-sm sm:text-base font-bold text-white">
              Déposez votre fichier CSV ici, ou cliquez pour parcourir
            </h4>
            <p className="text-xs text-[#d4af94] mt-1">
              Prend en charge le format officiel <strong>OMPAGANO</strong> ou le schéma de corpus audio <strong>TTS Ôrungu</strong>.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b84a28] hover:from-[#b84a28] hover:to-[#9a3412] text-white font-bold text-xs cursor-pointer shadow-lg transition-all active:scale-95">
            <span>Sélectionner un fichier .csv</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
          </label>

          {selectedFileName && (
            <div className="text-xs text-[#fed7aa] font-semibold bg-[#2a170d] px-3 py-1.5 rounded-lg border border-[#4a2e1d] inline-block">
              Fichier chargé : <span className="text-white font-bold">{selectedFileName}</span>
            </div>
          )}
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {importSuccessMessage && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-start gap-3 text-xs text-emerald-200 shadow-md">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>{importSuccessMessage}</div>
        </div>
      )}

      {importErrorMessage && (
        <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-2xl flex items-start gap-3 text-xs text-rose-200 shadow-md">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>{importErrorMessage}</div>
        </div>
      )}

      {/* Discovered Themes Banner if new themes found in CSV */}
      {discoveredThemes.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-950/80 via-stone-900 to-amber-900/60 border-2 border-[#f59e0b] rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#f59e0b] animate-pulse" />
            <span>{discoveredThemes.length} Nouveau(x) Thème(s) extrait(s) dynamiquement du CSV</span>
          </div>
          <p className="text-xs text-[#fed7aa]/90">
            Ces modules thématiques ont été détectés dans les colonnes du fichier et seront automatiquement créés et enregistrés dans le catalogue OMPAGANO lors de la confirmation :
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {discoveredThemes.map(th => (
              <span
                key={th.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-white shadow-sm border border-white/20"
                style={{ backgroundColor: th.color || '#d97706' }}
              >
                <span>{th.icon}</span>
                <span>{th.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* PARSED ITEMS PREVIEW TABLE, DEDUPLICATION REPORT & CONFIRMATION BUTTON */}
      {parsedItems.length > 0 && (
        <div className="space-y-4 pt-2">
          {/* Bilan de Reprise Intelligente & Protection Anti-Doublons */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-[#1f130c] via-[#180e08] to-[#122219] border border-emerald-500/40 rounded-2xl shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>Reprise Intelligente & Protection Anti-Doublons Active (Production)</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold self-start sm:self-auto">
                Base actuelle : {currentItemsCount} fiches
              </span>
            </div>

            <p className="text-xs text-[#d4af94] leading-relaxed">
              Vous pouvez réimporter le même fichier CSV autant de fois que nécessaire : les fiches déjà présentes dans la base sont automatiquement reconnues (par identifiant ou texte Myènè/Français) et <strong>ignorées sans créer de doublon ni écraser les contributions existantes</strong>.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-[#140a05] border border-[#3b1f11]">
                <div className="text-[10px] text-[#a8826d] uppercase font-bold">Total Fichier CSV</div>
                <div className="text-lg font-black text-white mt-0.5">{deduplicationReport.totalParsedCount}</div>
                <div className="text-[10px] text-[#d4af94]">Lignes valides lues</div>
              </div>

              <div className="p-3 rounded-xl bg-[#140a05] border border-amber-500/30">
                <div className="text-[10px] text-amber-400 uppercase font-bold">Déjà en Base (Ignorées)</div>
                <div className="text-lg font-black text-amber-300 mt-0.5">{deduplicationReport.alreadyExistingItems.length}</div>
                <div className="text-[10px] text-[#d4af94]">0 doublon créé</div>
              </div>

              <div className="p-3 rounded-xl bg-[#140a05] border border-emerald-500/40">
                <div className="text-[10px] text-emerald-400 uppercase font-bold">Nouvelles à Importer</div>
                <div className="text-lg font-black text-emerald-300 mt-0.5">{deduplicationReport.newItemsToImport.length}</div>
                <div className="text-[10px] text-emerald-200/80">Suite de l'import</div>
              </div>

              <div className="p-3 rounded-xl bg-[#140a05] border border-[#3b1f11]">
                <div className="text-[10px] text-[#a8826d] uppercase font-bold">Doublons Internes CSV</div>
                <div className="text-lg font-black text-stone-300 mt-0.5">{deduplicationReport.internalDuplicatesCount}</div>
                <div className="text-[10px] text-[#a8826d]">Épurés automatiquement</div>
              </div>
            </div>

            {/* Live Batch Progress Bar during import */}
            {isProcessing && importProgress && (
              <div className="pt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                  <span className="flex items-center gap-2">
                    <Database className="w-4 h-4 animate-spin text-[#f59e0b]" />
                    <span>Enregistrement par lots sécurisés (250 fiches/lot)...</span>
                  </span>
                  <span>
                    {importProgress.saved} / {importProgress.total} ({Math.round((importProgress.saved / Math.max(1, importProgress.total)) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-[#140a05] rounded-full overflow-hidden border border-emerald-500/30">
                  <div
                    className="h-full bg-gradient-to-r from-[#f59e0b] to-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((importProgress.saved / Math.max(1, importProgress.total)) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1e130c] p-4 rounded-2xl border border-[#4a2e1d]">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Aperçu des phrases</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {itemsReadyToImport.length} nouvelle(s) à importer
                </span>
              </h4>
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => setShowOnlyNewInPreview(true)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition ${
                    showOnlyNewInPreview
                      ? 'bg-[#c85a32] text-white'
                      : 'bg-[#140a05] text-[#a8826d] hover:text-white'
                  }`}
                >
                  Nouvelles uniquement ({deduplicationReport.newItemsToImport.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnlyNewInPreview(false)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition ${
                    !showOnlyNewInPreview
                      ? 'bg-[#c85a32] text-white'
                      : 'bg-[#140a05] text-[#a8826d] hover:text-white'
                  }`}
                >
                  Toutes les lignes du CSV ({parsedItems.length})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Category preview filter */}
              <select
                value={selectedThemeFilter}
                onChange={(e) => setSelectedThemeFilter(e.target.value)}
                className="px-3 py-2 bg-[#140a05] border border-[#4a2e1d] rounded-xl text-xs text-[#fed7aa] focus:outline-none"
              >
                <option value="all">
                  Tous les thèmes ({deduplicationReport.newItemsToImport.length} nouvelles / {parsedItems.length} total)
                </option>
                {themes.concat(discoveredThemes.filter(dt => !themes.some(t => t.id === dt.id))).map(th => {
                  const newCount = deduplicationReport.newItemsToImport.filter(p => p.category === th.id || p.theme === th.id).length;
                  const totalCount = parsedItems.filter(p => p.category === th.id || p.theme === th.id).length;
                  if (totalCount === 0) return null;
                  return (
                    <option key={th.id} value={th.id}>
                      {th.shortName || th.name} ({newCount} nouv. / {totalCount})
                    </option>
                  );
                })}
              </select>

              <button
                onClick={handleExecuteImport}
                disabled={isProcessing || itemsReadyToImport.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Database className="w-4 h-4 animate-spin" />
                    <span>
                      {importProgress
                        ? `Importation (${importProgress.saved}/${importProgress.total})...`
                        : 'Importation en cours...'}
                    </span>
                  </>
                ) : itemsReadyToImport.length === 0 ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Toutes ces fiches sont déjà en base (0 à importer)</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Importer les {itemsReadyToImport.length} nouvelles fiches</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview list */}
          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {filteredPreviewItems.slice(0, 50).map((item, index) => {
              const allThemesList = themes.concat(discoveredThemes);
              const th = allThemesList.find(t => t.id === item.category || t.id === item.theme);
              const isNew = newItemsSet.has(item.id);
              return (
                <div
                  key={index}
                  className={`p-3 bg-[#1e130c] border rounded-xl flex items-start justify-between gap-3 text-xs transition-colors ${
                    isNew ? 'border-[#3b1f11] hover:border-[#d97706]/40' : 'border-stone-800 opacity-60'
                  }`}
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#2a170d] text-[#f59e0b] border border-[#4a2e1d] flex items-center gap-1">
                        <span>{th?.icon || '🏷️'}</span>
                        <span>{th?.shortName || item.category}</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isNew
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-stone-800 text-stone-400 border border-stone-700'
                        }`}
                      >
                        {isNew ? '✨ Nouvelle à importer' : '✓ Déjà en base (Ignorée)'}
                      </span>
                      {item.dialect && (
                        <span className="text-[10px] uppercase font-bold text-[#fed7aa]/60">
                          {item.dialect}
                        </span>
                      )}
                      {item.difficulty && (
                        <span className="text-[10px] text-[#fed7aa]/40">
                          • {item.difficulty}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-white text-xs">{item.frenchText}</div>
                    <div className="font-serif text-[#f59e0b] text-sm">{item.myeneText}</div>
                    {item.phoneticApi && (
                      <div className="font-mono text-[11px] text-[#a8826d]">{item.phoneticApi}</div>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-[#a8826d] shrink-0">
                    {item.id}
                  </span>
                </div>
              );
            })}
          </div>

          {filteredPreviewItems.length > 50 && (
            <p className="text-center text-xs text-[#a8826d] italic">
              + {filteredPreviewItems.length - 50} autres phrases dans cet aperçu...
            </p>
          )}
        </div>
      )}
    </div>
  );
};
