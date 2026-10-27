import React, { useState, useRef } from 'react';
import { ClanRegistry, VillageRegistry } from '../types';
import {
  MYENE_TRIBES,
  parseClansFromCsv,
  deduplicateParsedCsvClans,
  generateClansCsvTemplate,
  parseVillagesFromCsv,
  deduplicateParsedCsvVillages,
  generateVillagesCsvTemplate
} from '../services/seedData';
import {
  MapPin,
  Shield,
  Plus,
  Trash2,
  Edit,
  Compass,
  CheckCircle2,
  Search,
  Layers,
  Upload,
  Download,
  FileSpreadsheet,
  Sparkles,
  BookOpen,
  Info
} from 'lucide-react';

interface ClanVillageAdminProps {
  clans: ClanRegistry[];
  villages: VillageRegistry[];
  onSaveClan: (clan: Partial<ClanRegistry>) => Promise<void>;
  onDeleteClan: (clanId: string) => Promise<void>;
  onSaveVillage: (village: Partial<VillageRegistry>) => Promise<void>;
  onDeleteVillage: (villageId: string) => Promise<void>;
  onBatchImportClans?: (
    clansToImport: ClanRegistry[],
    onProgress?: (savedCount: number, totalCount: number) => void
  ) => Promise<void>;
  onBatchImportVillages?: (
    villagesToImport: VillageRegistry[],
    onProgress?: (savedCount: number, totalCount: number) => void
  ) => Promise<void>;
}

export const ClanVillageAdmin: React.FC<ClanVillageAdminProps> = ({
  clans,
  villages,
  onSaveClan,
  onDeleteClan,
  onSaveVillage,
  onDeleteVillage,
  onBatchImportClans,
  onBatchImportVillages
}) => {
  const [selectedTribeFilter, setSelectedTribeFilter] = useState<string>('all');
  const [selectedClanFilter, setSelectedClanFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'hierarchy' | 'clans' | 'villages'>('hierarchy');

  // Clan Form State
  const [isClanFormOpen, setIsClanFormOpen] = useState(false);
  const [editingClan, setEditingClan] = useState<Partial<ClanRegistry> | null>(null);
  const [clanName, setClanName] = useState('');
  const [clanTribe, setClanTribe] = useState<string>(MYENE_TRIBES[5] || 'Ôrungu');
  const [clanDesc, setClanDesc] = useState('');
  const [clanHistoricalMeaning, setClanHistoricalMeaning] = useState('');
  const [clanGeoOrigins, setClanGeoOrigins] = useState('');
  const [clanMotto, setClanMotto] = useState('');
  const [isSavingClan, setIsSavingClan] = useState(false);

  // Clan CSV Import State
  const [isClanCsvOpen, setIsClanCsvOpen] = useState(false);
  const [clanCsvDefaultTribe, setClanCsvDefaultTribe] = useState<string>('Enenga');
  const [clanCsvText, setClanCsvText] = useState('');
  const [isImportingClansCsv, setIsImportingClansCsv] = useState(false);
  const [clanCsvProgress, setClanCsvProgress] = useState<{ saved: number; total: number } | null>(null);
  const [clanCsvFeedback, setClanCsvFeedback] = useState<string | null>(null);
  const clanFileInputRef = useRef<HTMLInputElement | null>(null);

  // Village Form State
  const [isVillageFormOpen, setIsVillageFormOpen] = useState(false);
  const [editingVillage, setEditingVillage] = useState<Partial<VillageRegistry> | null>(null);
  const [villageName, setVillageName] = useState('');
  const [villageTribe, setVillageTribe] = useState<string>('Ôrungu');
  const [villageClan, setVillageClan] = useState<string>('');
  const [villageCustomClan, setVillageCustomClan] = useState<string>('');
  const [isUsingCustomClanForVillage, setIsUsingCustomClanForVillage] = useState<boolean>(false);
  const [villageRegion, setVillageRegion] = useState('');
  const [isSavingVillage, setIsSavingVillage] = useState(false);

  // Village CSV Import State
  const [isVillageCsvOpen, setIsVillageCsvOpen] = useState(false);
  const [villageCsvDefaultTribe, setVillageCsvDefaultTribe] = useState<string>('Ôrungu');
  const [villageCsvText, setVillageCsvText] = useState('');
  const [isImportingVillagesCsv, setIsImportingVillagesCsv] = useState(false);
  const [villageCsvProgress, setVillageCsvProgress] = useState<{ saved: number; total: number } | null>(null);
  const [villageCsvFeedback, setVillageCsvFeedback] = useState<string | null>(null);
  const villageFileInputRef = useRef<HTMLInputElement | null>(null);

  const openNewClanModal = (presetTribe?: string) => {
    setEditingClan(null);
    setClanName('');
    setClanTribe(presetTribe || (selectedTribeFilter !== 'all' ? selectedTribeFilter : 'Enenga'));
    setClanDesc('');
    setClanHistoricalMeaning('');
    setClanGeoOrigins('');
    setClanMotto('');
    setIsClanFormOpen(true);
  };

  const openEditClanModal = (clan: ClanRegistry) => {
    setEditingClan(clan);
    setClanName(clan.name);
    setClanTribe(clan.tribe);
    setClanDesc(clan.description || '');
    setClanHistoricalMeaning(clan.historicalMeaning || '');
    setClanGeoOrigins(clan.geographicalOrigins || '');
    setClanMotto(clan.mottoOrSymbol || '');
    setIsClanFormOpen(true);
  };

  const handleSaveClanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clanName.trim() || !clanTribe.trim()) return;
    setIsSavingClan(true);
    try {
      await onSaveClan({
        id: editingClan?.id,
        name: clanName.trim(),
        tribe: clanTribe.trim(),
        description: clanDesc.trim() || undefined,
        historicalMeaning: clanHistoricalMeaning.trim() || undefined,
        geographicalOrigins: clanGeoOrigins.trim() || undefined,
        mottoOrSymbol: clanMotto.trim() || undefined,
        createdAt: editingClan?.createdAt || new Date().toISOString()
      });
      setIsClanFormOpen(false);
      setEditingClan(null);
    } finally {
      setIsSavingClan(false);
    }
  };

  const openNewVillageModal = (presetTribe?: string, presetClanName?: string) => {
    setEditingVillage(null);
    setVillageName('');
    const targetTribe = presetTribe || (selectedTribeFilter !== 'all' ? selectedTribeFilter : 'Ôrungu');
    setVillageTribe(targetTribe);
    const clansForTribe = clans.filter(c => c.tribe === targetTribe);
    const defaultClan = presetClanName || clansForTribe[0]?.name || 'Non rattaché';
    setVillageClan(defaultClan);
    setVillageCustomClan('');
    setIsUsingCustomClanForVillage(false);
    setVillageRegion('');
    setIsVillageFormOpen(true);
  };

  const openEditVillageModal = (village: VillageRegistry) => {
    setEditingVillage(village);
    setVillageName(village.name);
    setVillageTribe(village.tribe || 'Ôrungu');
    const clansForTribe = clans.filter(c => c.tribe === village.tribe);
    const matchesExistingClan = clansForTribe.some(c => c.name === village.clan);
    if (matchesExistingClan || !village.clan || village.clan === 'Non rattaché') {
      setVillageClan(village.clan || 'Non rattaché');
      setVillageCustomClan('');
      setIsUsingCustomClanForVillage(false);
    } else {
      setVillageClan('__custom__');
      setVillageCustomClan(village.clan);
      setIsUsingCustomClanForVillage(true);
    }
    setVillageRegion(village.region || '');
    setIsVillageFormOpen(true);
  };

  const handleSaveVillageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!villageName.trim() || !villageTribe.trim()) return;
    const finalClan = isUsingCustomClanForVillage
      ? (villageCustomClan.trim() || 'Non rattaché')
      : (villageClan.trim() || 'Non rattaché');

    setIsSavingVillage(true);
    try {
      await onSaveVillage({
        id: editingVillage?.id,
        name: villageName.trim(),
        clan: finalClan,
        tribe: villageTribe.trim(),
        region: villageRegion.trim() || undefined,
        createdAt: editingVillage?.createdAt || new Date().toISOString()
      });
      setIsVillageFormOpen(false);
      setEditingVillage(null);
    } finally {
      setIsSavingVillage(false);
    }
  };

  // CSV Preview & Import Handlers for Clans
  const parsedCsvClans = React.useMemo(() => {
    if (!clanCsvText.trim()) return [];
    return parseClansFromCsv(clanCsvText, clanCsvDefaultTribe);
  }, [clanCsvText, clanCsvDefaultTribe]);

  const deduplicatedCsvClansInfo = React.useMemo(() => {
    return deduplicateParsedCsvClans(parsedCsvClans, clans);
  }, [parsedCsvClans, clans]);

  const handleClanFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        setClanCsvText(content);
        setClanCsvFeedback(null);
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleDownloadClansCsvTemplate = () => {
    const template = generateClansCsvTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modele_import_clans_ompagano.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExecuteClanCsvImport = async () => {
    const toImport = deduplicatedCsvClansInfo.newClansToImport;
    if (toImport.length === 0) return;
    setIsImportingClansCsv(true);
    setClanCsvFeedback(null);
    setClanCsvProgress({ saved: 0, total: toImport.length });
    try {
      if (onBatchImportClans) {
        await onBatchImportClans(toImport, (saved, total) => {
          setClanCsvProgress({ saved, total });
        });
      } else {
        let count = 0;
        for (const cl of toImport) {
          await onSaveClan(cl);
          count++;
          setClanCsvProgress({ saved: count, total: toImport.length });
        }
      }
      setClanCsvFeedback(
        `✅ ${toImport.length} nouveau(x) clan(s) importé(s) et synchronisé(s) avec succès (${deduplicatedCsvClansInfo.skippedCount} doublon(s) ignoré(s)).`
      );
      setClanCsvText('');
    } catch (err: any) {
      setClanCsvFeedback(`⚠️ Erreur lors de l'import des clans : ${err?.message || 'Veuillez réessayer'}`);
    } finally {
      setIsImportingClansCsv(false);
    }
  };

  // CSV Preview & Import Handlers for Villages
  const parsedCsvVillages = React.useMemo(() => {
    if (!villageCsvText.trim()) return [];
    return parseVillagesFromCsv(villageCsvText, villageCsvDefaultTribe);
  }, [villageCsvText, villageCsvDefaultTribe]);

  const deduplicatedCsvVillagesInfo = React.useMemo(() => {
    return deduplicateParsedCsvVillages(parsedCsvVillages, villages);
  }, [parsedCsvVillages, villages]);

  const handleVillageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        setVillageCsvText(content);
        setVillageCsvFeedback(null);
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleDownloadVillagesCsvTemplate = () => {
    const template = generateVillagesCsvTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modele_import_villages_ompagano.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExecuteVillageCsvImport = async () => {
    const toImport = deduplicatedCsvVillagesInfo.newVillagesToImport;
    if (toImport.length === 0) return;
    setIsImportingVillagesCsv(true);
    setVillageCsvFeedback(null);
    setVillageCsvProgress({ saved: 0, total: toImport.length });
    try {
      if (onBatchImportVillages) {
        await onBatchImportVillages(toImport, (saved, total) => {
          setVillageCsvProgress({ saved, total });
        });
      } else {
        let count = 0;
        for (const vi of toImport) {
          await onSaveVillage(vi);
          count++;
          setVillageCsvProgress({ saved: count, total: toImport.length });
        }
      }
      setVillageCsvFeedback(
        `✅ ${toImport.length} nouveau(x) village(s) importé(s) et synchronisé(s) avec succès (${deduplicatedCsvVillagesInfo.skippedCount} doublon(s) ignoré(s)).`
      );
      setVillageCsvText('');
    } catch (err: any) {
      setVillageCsvFeedback(`⚠️ Erreur lors de l'import des villages : ${err?.message || 'Veuillez réessayer'}`);
    } finally {
      setIsImportingVillagesCsv(false);
    }
  };

  const filteredClans = clans.filter(c => {
    if (selectedTribeFilter !== 'all' && c.tribe !== selectedTribeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.tribe.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.historicalMeaning || '').toLowerCase().includes(q) ||
        (c.geographicalOrigins || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredVillages = villages.filter(v => {
    if (selectedTribeFilter !== 'all' && v.tribe !== selectedTribeFilter) return false;
    if (selectedClanFilter !== 'all' && v.clan !== selectedClanFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.clan.toLowerCase().includes(q) ||
        v.tribe.toLowerCase().includes(q) ||
        (v.region || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const clansForSelectedVillageTribe = clans.filter(c => c.tribe === villageTribe);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 warm-card-gradient border border-[#4a2412] rounded-2xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#f59e0b]" />
              <h3 className="text-base sm:text-lg font-bold text-white">
                Registre Généalogique : Tribus, Clans & Villages
              </h3>
            </div>
            <p className="text-xs text-[#d4af94] mt-1 leading-relaxed">
              Seuls les <strong>21 clans officiels Ôrungu</strong> sont pré-enregistrés par défaut. Pour les autres tribus (<strong>Mpongwè, Enenga, Galoa, Nkomi, Adyumba</strong>) ainsi que pour les <strong>villages</strong>, vous pouvez les ajouter manuellement ou les importer en lot par fichier <strong>CSV</strong> au fur et à mesure de la validation de leur orthographe.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openNewClanModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Clan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsClanCsvOpen(prev => !prev);
                setIsVillageCsvOpen(false);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#27150c] hover:bg-[#341b10] text-[#fde047] border border-[#f59e0b]/40 font-bold text-xs shadow transition active:scale-95"
            >
              <Upload className="w-4 h-4 text-[#f59e0b]" />
              <span>Import CSV Clans</span>
            </button>
            <button
              type="button"
              onClick={() => openNewVillageModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Village</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsVillageCsvOpen(prev => !prev);
                setIsClanCsvOpen(false);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#27150c] hover:bg-[#341b10] text-teal-300 border border-teal-500/40 font-bold text-xs shadow transition active:scale-95"
            >
              <Upload className="w-4 h-4 text-teal-400" />
              <span>Import CSV Villages</span>
            </button>
          </div>
        </div>

        {/* Summary Counters by Tribe */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-2">
          {MYENE_TRIBES.map(tribe => {
            const tClans = clans.filter(c => c.tribe === tribe).length;
            const tVillages = villages.filter(v => v.tribe === tribe).length;
            const isSelected = selectedTribeFilter === tribe;
            return (
              <button
                key={tribe}
                type="button"
                onClick={() => {
                  setSelectedTribeFilter(isSelected ? 'all' : tribe);
                  setSelectedClanFilter('all');
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-[#c85a32]/30 border-[#f59e0b] text-white shadow'
                    : 'bg-[#180d07] border-[#3b1d10] text-[#d4af94] hover:border-[#522915]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{tribe}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#f59e0b]" />}
                </div>
                <div className="text-[11px] text-[#a8826d] mt-1 flex items-center justify-between">
                  <span>{tClans} clan{tClans > 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{tVillages} vil.</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* PANEL D'IMPORTATION CSV DES CLANS                         */}
      {/* ========================================================= */}
      {isClanCsvOpen && (
        <div className="p-5 warm-card-gradient border-2 border-[#f59e0b] rounded-2xl space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#4a2412] pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#f59e0b]" />
              <div>
                <h4 className="font-bold text-sm text-white">
                  Importation CSV de Clans (avec Déduplication Automatique)
                </h4>
                <p className="text-[11px] text-[#d4af94]">
                  Importez une liste de clans pour une tribu précise ou un fichier CSV complet multi-tribus.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadClansCsvTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#180d07] hover:bg-[#27150c] text-[#fde047] border border-[#f59e0b]/40 text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Modèle CSV Clans</span>
              </button>
              <button
                type="button"
                onClick={() => setIsClanCsvOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-[#27150c] text-xs text-[#a8826d] hover:text-white"
              >
                Fermer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Tribu par défaut (si absente dans une ligne CSV) :
              </label>
              <select
                value={clanCsvDefaultTribe}
                onChange={(e) => setClanCsvDefaultTribe(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]"
              >
                {MYENE_TRIBES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Charger un fichier (.csv ou .txt) :
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={clanFileInputRef}
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  onChange={handleClanFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => clanFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#180d07] hover:bg-[#2c170c] text-white border border-[#522915] font-bold text-xs transition"
                >
                  <Upload className="w-4 h-4 text-[#f59e0b]" />
                  <span>Sélectionner un fichier CSV / TXT</span>
                </button>
                <span className="text-[11px] text-[#a8826d]">
                  Colonnes : <code className="text-[#fde047]">Nom_Clan, Tribu, Description, Signification_Historique, Origines_Geographiques, Devise_Symbole</code> (ou simple liste 1 clan par ligne)
                </span>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Contenu CSV ou liste de clans à importer :
              </label>
              <textarea
                rows={5}
                value={clanCsvText}
                onChange={(e) => setClanCsvText(e.target.value)}
                placeholder={`Nom_Clan,Tribu,Description,Signification_Historique,Origines_Geographiques\n"NomDuClan","Enenga","Description courte","Signification historique","Lambaréné / Moyen-Ogooué"`}
                className="w-full px-3.5 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#f59e0b]"
              />
            </div>
          </div>

          {parsedCsvClans.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#180d07] border border-[#4a2412] space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#fed7aa] font-bold">
                  Aperçu de l'analyse : <strong className="text-white">{parsedCsvClans.length}</strong> clan(s) détecté(s)
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">
                    ✓ {deduplicatedCsvClansInfo.newClansToImport.length} nouveau(x) à importer
                  </span>
                  {deduplicatedCsvClansInfo.skippedCount > 0 && (
                    <span className="text-amber-400">
                      • {deduplicatedCsvClansInfo.skippedCount} doublon(s) déjà présent(s) ignoré(s)
                    </span>
                  )}
                </div>
              </div>
              {deduplicatedCsvClansInfo.newClansToImport.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-28 overflow-y-auto">
                  {deduplicatedCsvClansInfo.newClansToImport.slice(0, 30).map(cl => (
                    <span
                      key={cl.id}
                      className="px-2.5 py-1 rounded-lg bg-[#27150c] border border-[#f59e0b]/30 text-white text-[11px]"
                    >
                      <strong>{cl.name}</strong> <span className="text-[#f59e0b]">({cl.tribe})</span>
                    </span>
                  ))}
                  {deduplicatedCsvClansInfo.newClansToImport.length > 30 && (
                    <span className="text-[11px] text-[#a8826d] self-center">
                      +{deduplicatedCsvClansInfo.newClansToImport.length - 30} autres...
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {clanCsvProgress && isImportingClansCsv && (
            <div className="text-xs text-[#fde047] font-bold">
              Synchronisation des clans en cours : {clanCsvProgress.saved} / {clanCsvProgress.total}...
            </div>
          )}

          {clanCsvFeedback && (
            <div className="p-3 rounded-xl bg-[#180d07] border border-emerald-500/40 text-xs text-emerald-300 font-semibold">
              {clanCsvFeedback}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setClanCsvText('');
                setClanCsvFeedback(null);
              }}
              className="px-4 py-2 rounded-xl bg-[#27150c] text-xs text-[#a8826d] hover:text-white"
            >
              Effacer
            </button>
            <button
              type="button"
              disabled={isImportingClansCsv || deduplicatedCsvClansInfo.newClansToImport.length === 0}
              onClick={handleExecuteClanCsvImport}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
            >
              {isImportingClansCsv
                ? 'Importation en cours...'
                : `Importer ${deduplicatedCsvClansInfo.newClansToImport.length} Clan(s)`}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PANEL D'IMPORTATION CSV DES VILLAGES                      */}
      {/* ========================================================= */}
      {isVillageCsvOpen && (
        <div className="p-5 warm-card-gradient border-2 border-teal-500 rounded-2xl space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#4a2412] pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-teal-400" />
              <div>
                <h4 className="font-bold text-sm text-white">
                  Importation CSV de Villages (avec Déduplication Automatique)
                </h4>
                <p className="text-[11px] text-[#d4af94]">
                  Importez vos villages par tribu et clan (le clan de rattachement est facultatif si la tribu n'a pas encore de clan enregistré).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadVillagesCsvTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#180d07] hover:bg-[#27150c] text-teal-300 border border-teal-500/40 text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Modèle CSV Villages</span>
              </button>
              <button
                type="button"
                onClick={() => setIsVillageCsvOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-[#27150c] text-xs text-[#a8826d] hover:text-white"
              >
                Fermer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Tribu par défaut (si absente dans une ligne CSV) :
              </label>
              <select
                value={villageCsvDefaultTribe}
                onChange={(e) => setVillageCsvDefaultTribe(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-teal-500"
              >
                {MYENE_TRIBES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Charger un fichier (.csv ou .txt) :
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={villageFileInputRef}
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  onChange={handleVillageFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => villageFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#180d07] hover:bg-[#2c170c] text-white border border-[#522915] font-bold text-xs transition"
                >
                  <Upload className="w-4 h-4 text-teal-400" />
                  <span>Sélectionner un fichier CSV / TXT</span>
                </button>
                <span className="text-[11px] text-[#a8826d]">
                  Colonnes : <code className="text-teal-300">Nom_Village, Tribu, Clan_Rattachement, Region_Province</code> (ou simple liste 1 village par ligne)
                </span>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Contenu CSV ou liste de villages à importer :
              </label>
              <textarea
                rows={5}
                value={villageCsvText}
                onChange={(e) => setVillageCsvText(e.target.value)}
                placeholder={`Nom_Village,Tribu,Clan_Rattachement,Region_Province\n"Ozouri","Ôrungu","Agenje","Ogooué-Maritime"\n"Alumbè","Ôrungu","Ajena","Ogooué-Maritime"`}
                className="w-full px-3.5 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {parsedCsvVillages.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#180d07] border border-[#4a2412] space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#fed7aa] font-bold">
                  Aperçu de l'analyse : <strong className="text-white">{parsedCsvVillages.length}</strong> village(s) détecté(s)
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">
                    ✓ {deduplicatedCsvVillagesInfo.newVillagesToImport.length} nouveau(x) à importer
                  </span>
                  {deduplicatedCsvVillagesInfo.skippedCount > 0 && (
                    <span className="text-amber-400">
                      • {deduplicatedCsvVillagesInfo.skippedCount} doublon(s) déjà présent(s) ignoré(s)
                    </span>
                  )}
                </div>
              </div>
              {deduplicatedCsvVillagesInfo.newVillagesToImport.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-28 overflow-y-auto">
                  {deduplicatedCsvVillagesInfo.newVillagesToImport.slice(0, 30).map(vi => (
                    <span
                      key={vi.id}
                      className="px-2.5 py-1 rounded-lg bg-[#27150c] border border-teal-500/30 text-white text-[11px]"
                    >
                      <strong>{vi.name}</strong> <span className="text-teal-300">({vi.tribe}{vi.clan && vi.clan !== 'Non rattaché' ? ` • ${vi.clan}` : ''})</span>
                    </span>
                  ))}
                  {deduplicatedCsvVillagesInfo.newVillagesToImport.length > 30 && (
                    <span className="text-[11px] text-[#a8826d] self-center">
                      +{deduplicatedCsvVillagesInfo.newVillagesToImport.length - 30} autres...
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {villageCsvProgress && isImportingVillagesCsv && (
            <div className="text-xs text-teal-300 font-bold">
              Synchronisation des villages en cours : {villageCsvProgress.saved} / {villageCsvProgress.total}...
            </div>
          )}

          {villageCsvFeedback && (
            <div className="p-3 rounded-xl bg-[#180d07] border border-emerald-500/40 text-xs text-emerald-300 font-semibold">
              {villageCsvFeedback}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setVillageCsvText('');
                setVillageCsvFeedback(null);
              }}
              className="px-4 py-2 rounded-xl bg-[#27150c] text-xs text-[#a8826d] hover:text-white"
            >
              Effacer
            </button>
            <button
              type="button"
              disabled={isImportingVillagesCsv || deduplicatedCsvVillagesInfo.newVillagesToImport.length === 0}
              onClick={handleExecuteVillageCsvImport}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
            >
              {isImportingVillagesCsv
                ? 'Importation en cours...'
                : `Importer ${deduplicatedCsvVillagesInfo.newVillagesToImport.length} Village(s)`}
            </button>
          </div>
        </div>
      )}

      {/* Sub-navigation & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('hierarchy')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              activeSubTab === 'hierarchy'
                ? 'bg-[#c85a32] text-white shadow'
                : 'bg-[#27150c] text-[#d4af94] hover:bg-[#341b10]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Arborescence Tribu → Clan → Village</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('clans')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              activeSubTab === 'clans'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-[#27150c] text-[#d4af94] hover:bg-[#341b10]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Liste des Clans ({filteredClans.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('villages')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              activeSubTab === 'villages'
                ? 'bg-teal-600 text-white shadow'
                : 'bg-[#27150c] text-[#d4af94] hover:bg-[#341b10]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Liste des Villages ({filteredVillages.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#a8826d] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher clan, village, tribu..."
            className="w-full pl-9 pr-3 py-2 bg-[#180d07] border border-[#4a2412] rounded-xl text-xs text-white focus:outline-none focus:border-[#f59e0b]"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL / FORMULAIRE D'AJOUT OU ÉDITION DE CLAN             */}
      {/* ========================================================= */}
      {isClanFormOpen && (
        <form
          onSubmit={handleSaveClanSubmit}
          className="p-5 warm-card-gradient border-2 border-[#f59e0b] rounded-2xl space-y-4 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[#4a2412] pb-2.5">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#f59e0b]" />
              <h4 className="font-bold text-sm text-white">
                {editingClan ? `Modifier le Clan : ${editingClan.name}` : 'Enregistrer un Nouveau Clan'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsClanFormOpen(false)}
              className="text-xs text-[#a8826d] hover:text-white"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">Nom du Clan * :</label>
              <input
                type="text"
                required
                value={clanName}
                onChange={(e) => setClanName(e.target.value)}
                placeholder="Ex: Abulya, Agônjô - Awenga..."
                className="w-full px-3.5 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]"
              />
            </div>

            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">Tribu de rattachement * :</label>
              <select
                value={clanTribe}
                onChange={(e) => setClanTribe(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]"
              >
                {MYENE_TRIBES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Description générale (optionnel) :
              </label>
              <input
                type="text"
                value={clanDesc}
                onChange={(e) => setClanDesc(e.target.value)}
                placeholder="Ex: Clan historique établi sur le littoral..."
                className="w-full px-3.5 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Signification historique & lignagère (affichée dans l'encart Explorer) :
              </label>
              <textarea
                rows={2}
                value={clanHistoricalMeaning}
                onChange={(e) => setClanHistoricalMeaning(e.target.value)}
                placeholder="Histoire, rôle coutumier, alliances et lignée du clan..."
                className="w-full px-3.5 py-2 bg-[#180d07] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]"
              />
            </div>

            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Origines géographiques & terroirs :
              </label>
              <input
                type="text"
                value={clanGeoOrigins}
                onChange={(e) => setClanGeoOrigins(e.target.value)}
                placeholder="Ex: Île Mandji, Lambaréné, Fernan Vaz..."
                className="w-full px-3.5 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]"
              />
            </div>

            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">
                Devise, symbole ou attribut coutumier :
              </label>
              <input
                type="text"
                value={clanMotto}
                onChange={(e) => setClanMotto(e.target.value)}
                placeholder="Ex: Gardiens du fleuve et de l'alliance..."
                className="w-full px-3.5 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsClanFormOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#27150c] text-xs text-[#a8826d]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSavingClan}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
            >
              {isSavingClan ? 'Enregistrement...' : 'Sauvegarder dans Firebase'}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* MODAL / FORMULAIRE D'AJOUT OU ÉDITION DE VILLAGE          */}
      {/* ========================================================= */}
      {isVillageFormOpen && (
        <form
          onSubmit={handleSaveVillageSubmit}
          className="p-5 warm-card-gradient border-2 border-teal-500 rounded-2xl space-y-4 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[#4a2412] pb-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-400" />
              <h4 className="font-bold text-sm text-white">
                {editingVillage ? `Modifier le Village : ${editingVillage.name}` : 'Enregistrer un Nouveau Village'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsVillageFormOpen(false)}
              className="text-xs text-[#a8826d] hover:text-white"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">Nom du Village * :</label>
              <input
                type="text"
                required
                value={villageName}
                onChange={(e) => setVillageName(e.target.value)}
                placeholder="Ex: Alumbè, Ozouri..."
                className="w-full px-3.5 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-[#fed7aa] font-semibold mb-1">Tribu * :</label>
              <select
                value={villageTribe}
                onChange={(e) => {
                  const nextTribe = e.target.value;
                  setVillageTribe(nextTribe);
                  const matchingClans = clans.filter(c => c.tribe === nextTribe);
                  if (!isUsingCustomClanForVillage) {
                    setVillageClan(matchingClans[0]?.name || 'Non rattaché');
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-teal-500"
              >
                {MYENE_TRIBES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[#fed7aa] font-semibold">Clan de rattachement (optionnel) :</label>
                <button
                  type="button"
                  onClick={() => setIsUsingCustomClanForVillage(prev => !prev)}
                  className="text-[10px] text-teal-300 hover:underline font-semibold"
                >
                  {isUsingCustomClanForVillage ? 'Choisir dans la liste' : 'Saisir librement'}
                </button>
              </div>
              {isUsingCustomClanForVillage ? (
                <input
                  type="text"
                  value={villageCustomClan}
                  onChange={(e) => setVillageCustomClan(e.target.value)}
                  placeholder="Nom du clan (ou laisser vide)"
                  className="w-full px-3.5 py-2.5 bg-[#180d07] border border-teal-500/60 rounded-xl text-white focus:outline-none"
                />
              ) : (
                <select
                  value={villageClan}
                  onChange={(e) => setVillageClan(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="Non rattaché">— Non rattaché / À définir —</option>
                  {clansForSelectedVillageTribe.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.tribe})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[#fed7aa] font-semibold mb-1">Région / Province / Localisation :</label>
              <input
                type="text"
                value={villageRegion}
                onChange={(e) => setVillageRegion(e.target.value)}
                placeholder="Ex: Ogooué-Maritime, Moyen-Ogooué, Estuaire..."
                className="w-full px-3.5 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsVillageFormOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#27150c] text-xs text-[#a8826d]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSavingVillage}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
            >
              {isSavingVillage ? 'Enregistrement...' : 'Sauvegarder dans Firebase'}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* VUE 1 : ARBORESCENCE TRIBU -> CLAN -> VILLAGE             */}
      {/* ========================================================= */}
      {activeSubTab === 'hierarchy' && (
        <div className="space-y-4">
          {MYENE_TRIBES.filter(t => selectedTribeFilter === 'all' || t === selectedTribeFilter).map(tribe => {
            const tribeClans = filteredClans.filter(c => c.tribe === tribe);
            const tribeVillages = filteredVillages.filter(v => v.tribe === tribe);
            const unattachedVillages = tribeVillages.filter(
              v => !v.clan || v.clan === 'Non rattaché' || !tribeClans.some(c => c.name.toLowerCase() === v.clan.toLowerCase())
            );

            return (
              <div
                key={tribe}
                className="p-4 sm:p-5 bg-[#211109] border border-[#4a2412] rounded-2xl space-y-4 shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3b1d10] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-[#c85a32]/20 border border-[#c85a32]/40 flex items-center justify-center text-sm font-black text-[#f59e0b]">
                      {tribe.charAt(0)}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                        <span>Tribu {tribe}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#180d07] text-[#f59e0b] border border-[#4a2412]">
                          {tribeClans.length} clan{tribeClans.length > 1 ? 's' : ''} • {tribeVillages.length} village{tribeVillages.length > 1 ? 's' : ''}
                        </span>
                      </h4>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openNewClanModal(tribe)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-[#180d07] hover:bg-amber-950/60 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter un clan {tribe}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClanCsvDefaultTribe(tribe);
                        setIsClanCsvOpen(true);
                        setIsVillageCsvOpen(false);
                      }}
                      className="text-xs px-3 py-1.5 rounded-xl bg-[#180d07] hover:bg-amber-950/60 text-[#fde047] border border-[#f59e0b]/30 font-semibold flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>CSV Clans</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openNewVillageModal(tribe)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-[#180d07] hover:bg-teal-950/60 text-teal-300 border border-teal-500/30 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter un village {tribe}</span>
                    </button>
                  </div>
                </div>

                {tribeClans.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#180d07]/80 border border-dashed border-[#4a2412] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 text-xs text-[#a8826d]">
                      <Info className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
                      <div>
                        Aucun clan n'est pré-rempli pour la tribu <strong className="text-white">{tribe}</strong> afin de garantir l'exactitude orthographique.
                        Vous pouvez les ajouter manuellement ou les importer en CSV.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tribeClans.map(clan => {
                      const clanVillages = filteredVillages.filter(
                        v => v.clan.toLowerCase() === clan.name.toLowerCase() && v.tribe === tribe
                      );
                      return (
                        <div
                          key={clan.id}
                          className="p-3.5 bg-[#180d07] border border-[#3b1d10] rounded-xl space-y-2.5 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <Shield className="w-3.5 h-3.5 text-[#f59e0b]" />
                                  <span className="font-bold text-xs sm:text-sm text-white">
                                    Clan {clan.name}
                                  </span>
                                </div>
                                {clan.description && (
                                  <p className="text-[11px] text-[#a8826d] mt-0.5">{clan.description}</p>
                                )}
                                {clan.historicalMeaning && (
                                  <p className="text-[10px] text-[#d4af94] mt-1 line-clamp-2 italic">
                                    « {clan.historicalMeaning} »
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openNewVillageModal(tribe, clan.name)}
                                  className="px-2 py-1 rounded-lg bg-teal-950/60 hover:bg-teal-900 text-teal-300 border border-teal-500/30 text-[10px] font-bold flex items-center gap-1"
                                  title="Rattacher un village à ce clan"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Village</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditClanModal(clan)}
                                  className="p-1.5 rounded-lg bg-[#27150c] hover:bg-[#381e11] text-[#fed7aa]"
                                  title="Modifier ce clan"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Supprimer le clan "${clan.name}" ?`)) {
                                      onDeleteClan(clan.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-[#27150c] hover:bg-[#7f1d1d] text-[#fca5a5]"
                                  title="Supprimer ce clan"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Villages attached to this clan */}
                            {clanVillages.length > 0 && (
                              <div className="pt-2 border-t border-[#2b150c] mt-2">
                                <div className="text-[10px] uppercase tracking-wider font-bold text-[#a8826d] mb-1.5">
                                  Villages rattachés ({clanVillages.length}) :
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {clanVillages.map(v => (
                                    <div
                                      key={v.id}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#24130b] border border-teal-500/30 text-xs text-teal-200"
                                    >
                                      <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                                      <span className="font-medium">{v.name}</span>
                                      {v.region && (
                                        <span className="text-[10px] text-[#a8826d]">({v.region})</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => openEditVillageModal(v)}
                                        className="text-[#a8826d] hover:text-white ml-0.5"
                                        title="Modifier le village"
                                      >
                                        <Edit className="w-2.5 h-2.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (window.confirm(`Supprimer le village "${v.name}" ?`)) {
                                            onDeleteVillage(v.id);
                                          }
                                        }}
                                        className="text-rose-400 hover:text-rose-200"
                                        title="Supprimer le village"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Unattached villages or villages with free-text clan for this tribe */}
                {unattachedVillages.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[#180d07] border border-teal-500/30 space-y-2">
                    <div className="text-[11px] font-bold text-teal-300">
                      Villages de la tribu {tribe} ({unattachedVillages.length}) :
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {unattachedVillages.map(v => (
                        <div
                          key={v.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#24130b] border border-teal-500/30 text-xs text-teal-200"
                        >
                          <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                          <span className="font-medium">{v.name}</span>
                          {v.clan && v.clan !== 'Non rattaché' && (
                            <span className="text-[10px] text-amber-300">• Clan: {v.clan}</span>
                          )}
                          {v.region && (
                            <span className="text-[10px] text-[#a8826d]">({v.region})</span>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditVillageModal(v)}
                            className="text-[#a8826d] hover:text-white ml-0.5"
                            title="Modifier le village"
                          >
                            <Edit className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Supprimer le village "${v.name}" ?`)) {
                                onDeleteVillage(v.id);
                              }
                            }}
                            className="text-rose-400 hover:text-rose-200"
                            title="Supprimer le village"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* VUE 2 : LISTE COMPLÈTE DES CLANS                          */}
      {/* ========================================================= */}
      {activeSubTab === 'clans' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredClans.map(clan => {
            const countVillages = villages.filter(v => v.clan.toLowerCase() === clan.name.toLowerCase()).length;
            return (
              <div
                key={clan.id}
                className="p-4 bg-[#27150c] border border-[#4a2412] rounded-2xl flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Tribu {clan.tribe}
                    </span>
                    <span className="text-[11px] text-[#a8826d]">
                      {countVillages} village{countVillages > 1 ? 's' : ''}
                    </span>
                  </div>
                  <h5 className="font-bold text-sm text-white mt-2">{clan.name}</h5>
                  {clan.description && (
                    <p className="text-xs text-[#d4af94] mt-1">{clan.description}</p>
                  )}
                  {clan.historicalMeaning && (
                    <p className="text-[11px] text-[#a8826d] mt-1 line-clamp-2">
                      <strong className="text-[#fed7aa]">Histoire :</strong> {clan.historicalMeaning}
                    </p>
                  )}
                  {clan.geographicalOrigins && (
                    <p className="text-[11px] text-[#a8826d] mt-0.5 line-clamp-1">
                      <strong className="text-teal-300">Origines :</strong> {clan.geographicalOrigins}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#3b1d10]">
                  <button
                    type="button"
                    onClick={() => openEditClanModal(clan)}
                    className="px-2.5 py-1 rounded-lg bg-[#180d07] hover:bg-[#381e11] text-xs text-[#fed7aa] flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Modifier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Supprimer le clan "${clan.name}" ?`)) {
                        onDeleteClan(clan.id);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#180d07] hover:bg-[#7f1d1d] text-xs text-[#fca5a5] flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* VUE 3 : LISTE COMPLÈTE DES VILLAGES                       */}
      {/* ========================================================= */}
      {activeSubTab === 'villages' && (
        <div className="space-y-3">
          {filteredVillages.length === 0 ? (
            <div className="p-8 text-center bg-[#180d07] border border-[#3b1d10] rounded-2xl space-y-3">
              <MapPin className="w-8 h-8 text-teal-400 mx-auto opacity-80" />
              <div className="text-sm font-bold text-white">Aucun village enregistré pour le moment</div>
              <p className="text-xs text-[#a8826d] max-w-lg mx-auto">
                Aucun village n'est pré-rempli par défaut afin d'éviter toute erreur d'orthographe. Utilisez le bouton <strong>« Nouveau Village »</strong> ou <strong>« Import CSV Villages »</strong> ci-dessus pour ajouter vos villages.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredVillages.map(village => (
                <div
                  key={village.id}
                  className="p-4 bg-[#27150c] border border-[#4a2412] rounded-2xl flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                        Tribu {village.tribe}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        Clan {village.clan || 'Non rattaché'}
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-white mt-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>{village.name}</span>
                    </h5>
                    {village.region && (
                      <p className="text-xs text-[#d4af94] mt-1">Région : {village.region}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#3b1d10]">
                    <button
                      type="button"
                      onClick={() => openEditVillageModal(village)}
                      className="px-2.5 py-1 rounded-lg bg-[#180d07] hover:bg-[#381e11] text-xs text-[#fed7aa] flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Modifier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Supprimer le village "${village.name}" ?`)) {
                          onDeleteVillage(village.id);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#180d07] hover:bg-[#7f1d1d] text-xs text-[#fca5a5] flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
