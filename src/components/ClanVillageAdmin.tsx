import React, { useState } from 'react';
import { 
  Users, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Filter, 
  Search, 
  Globe, 
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { ClanRegistry, VillageRegistry, TribeName } from '../types';
import { MYENE_TRIBES } from '../services/seedData';

interface ClanVillageAdminProps {
  clans: ClanRegistry[];
  villages: VillageRegistry[];
  onSaveClan: (clan: Partial<ClanRegistry>) => Promise<void>;
  onDeleteClan: (clanId: string) => Promise<void>;
  onSaveVillage: (village: Partial<VillageRegistry>) => Promise<void>;
  onDeleteVillage: (villageId: string) => Promise<void>;
}

export const ClanVillageAdmin: React.FC<ClanVillageAdminProps> = ({
  clans,
  villages,
  onSaveClan,
  onDeleteClan,
  onSaveVillage,
  onDeleteVillage
}) => {
  const [activeSection, setActiveSection] = useState<'clans' | 'villages'>('clans');

  // Clan filters & form
  const [selectedTribeFilter, setSelectedTribeFilter] = useState<string>('all');
  const [clanSearch, setClanSearch] = useState('');
  const [isAddingClan, setIsAddingClan] = useState(false);
  const [editingClanId, setEditingClanId] = useState<string | null>(null);
  const [clanFormData, setClanFormData] = useState({
    name: '',
    tribe: 'Enenga' as TribeName,
    description: ''
  });

  // Village filters & form
  const [villageTribeFilter, setVillageTribeFilter] = useState<string>('all');
  const [villageClanFilter, setVillageClanFilter] = useState<string>('all');
  const [villageSearch, setVillageSearch] = useState('');
  const [isAddingVillage, setIsAddingVillage] = useState(false);
  const [editingVillageId, setEditingVillageId] = useState<string | null>(null);
  const [villageFormData, setVillageFormData] = useState({
    name: '',
    clan: clans[0]?.name || 'Avandji',
    tribe: (clans[0]?.tribe || 'Enenga') as TribeName,
    region: 'Moyen-Ogooué'
  });

  // Clan actions
  const handleStartAddClan = () => {
    setEditingClanId(null);
    setClanFormData({
      name: '',
      tribe: (selectedTribeFilter !== 'all' ? selectedTribeFilter : 'Enenga') as TribeName,
      description: ''
    });
    setIsAddingClan(true);
  };

  const handleStartEditClan = (c: ClanRegistry) => {
    setEditingClanId(c.id);
    setClanFormData({
      name: c.name,
      tribe: c.tribe as TribeName,
      description: c.description || ''
    });
    setIsAddingClan(true);
  };

  const handleSubmitClan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clanFormData.name.trim()) return;

    await onSaveClan({
      id: editingClanId || undefined,
      name: clanFormData.name.trim(),
      tribe: clanFormData.tribe,
      description: clanFormData.description.trim() || undefined
    });

    setIsAddingClan(false);
    setEditingClanId(null);
    setClanFormData({ name: '', tribe: 'Enenga', description: '' });
  };

  // Village actions
  const handleStartAddVillage = () => {
    setEditingVillageId(null);
    const initialClan = clans[0]?.name || 'Avandji';
    const parentClanObj = clans.find(c => c.name === initialClan);
    setVillageFormData({
      name: '',
      clan: initialClan,
      tribe: (parentClanObj?.tribe || 'Enenga') as TribeName,
      region: 'Moyen-Ogooué'
    });
    setIsAddingVillage(true);
  };

  const handleStartEditVillage = (v: VillageRegistry) => {
    setEditingVillageId(v.id);
    setVillageFormData({
      name: v.name,
      clan: v.clan || clans[0]?.name || 'Avandji',
      tribe: v.tribe as TribeName,
      region: v.region || 'Moyen-Ogooué'
    });
    setIsAddingVillage(true);
  };

  const handleVillageClanChange = (clanName: string) => {
    const parent = clans.find(c => c.name === clanName);
    setVillageFormData(prev => ({
      ...prev,
      clan: clanName,
      tribe: (parent?.tribe || prev.tribe) as TribeName
    }));
  };

  const handleSubmitVillage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!villageFormData.name.trim()) return;

    await onSaveVillage({
      id: editingVillageId || undefined,
      name: villageFormData.name.trim(),
      clan: villageFormData.clan,
      tribe: villageFormData.tribe,
      region: villageFormData.region.trim() || undefined
    });

    setIsAddingVillage(false);
    setEditingVillageId(null);
  };

  // Filtered Clans
  const filteredClans = clans.filter(c => {
    const matchesTribe = selectedTribeFilter === 'all' || c.tribe === selectedTribeFilter;
    const matchesSearch = c.name.toLowerCase().includes(clanSearch.toLowerCase()) ||
      c.tribe.toLowerCase().includes(clanSearch.toLowerCase());
    return matchesTribe && matchesSearch;
  });

  // Filtered Villages
  const filteredVillages = villages.filter(v => {
    const matchesTribe = villageTribeFilter === 'all' || v.tribe === villageTribeFilter;
    const matchesClan = villageClanFilter === 'all' || v.clan === villageClanFilter;
    const matchesSearch = v.name.toLowerCase().includes(villageSearch.toLowerCase()) ||
      (v.clan && v.clan.toLowerCase().includes(villageSearch.toLowerCase())) ||
      v.tribe.toLowerCase().includes(villageSearch.toLowerCase());
    return matchesTribe && matchesClan && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#180d07] rounded-2xl border border-[#4a2412]">
        <div className="flex rounded-xl bg-[#24130a] p-1 border border-[#3b1d10] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSection('clans')}
            className={`py-2 px-4 rounded-lg flex items-center gap-2 transition-all ${
              activeSection === 'clans' ? 'bg-[#c85a32] text-white shadow' : 'text-[#a8826d] hover:text-[#fed7aa]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clans ({clans.length}) — Rattachés aux Tribus</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('villages')}
            className={`py-2 px-4 rounded-lg flex items-center gap-2 transition-all ${
              activeSection === 'villages' ? 'bg-[#c85a32] text-white shadow' : 'text-[#a8826d] hover:text-[#fed7aa]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Villages ({villages.length}) — Rattachés aux Clans</span>
          </button>
        </div>

        <div>
          {activeSection === 'clans' ? (
            <button
              onClick={handleStartAddClan}
              className="px-4 py-2 rounded-xl terracotta-gradient hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Clan</span>
            </button>
          ) : (
            <button
              onClick={handleStartAddVillage}
              className="px-4 py-2 rounded-xl terracotta-gradient hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Village</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: CLANS */}
      {activeSection === 'clans' && (
        <div className="space-y-4">
          {/* Add / Edit Clan Modal / Inline Form */}
          {isAddingClan && (
            <form onSubmit={handleSubmitClan} className="p-5 bg-[#24130a] rounded-2xl border-2 border-[#f59e0b]/40 space-y-4 text-xs animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#4a2412] pb-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#f59e0b]" />
                  <span>{editingClanId ? 'Modifier le Clan' : 'Créer un Clan (avec sa Tribu de rattachement)'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingClan(false)}
                  className="text-[#a8826d] hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#fed7aa] font-semibold mb-1">
                    Nom du Clan <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clanFormData.name}
                    onChange={(e) => setClanFormData({ ...clanFormData, name: e.target.value })}
                    placeholder="Ex: Avandji, Asiga, Agwesono..."
                    className="w-full px-3 py-2 bg-[#180d07] border border-[#522915] rounded-xl text-white text-xs focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div>
                  <label className="block text-[#fed7aa] font-semibold mb-1">
                    Tribu de Rattachement <span className="text-[#ef4444]">*</span>
                  </label>
                  <select
                    value={clanFormData.tribe}
                    onChange={(e) => setClanFormData({ ...clanFormData, tribe: e.target.value as TribeName })}
                    className="w-full px-3 py-2 bg-[#180d07] border border-[#522915] rounded-xl text-white text-xs focus:outline-none focus:border-[#f59e0b]"
                  >
                    {MYENE_TRIBES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#fed7aa] font-semibold mb-1">
                  Notes historiques ou lignage (facultatif) :
                </label>
                <input
                  type="text"
                  value={clanFormData.description}
                  onChange={(e) => setClanFormData({ ...clanFormData, description: e.target.value })}
                  placeholder="Ex: Clan matriarcal historique des lacs du Sud..."
                  className="w-full px-3 py-2 bg-[#180d07] border border-[#522915] rounded-xl text-white text-xs focus:outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingClan(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#180d07] text-[#a8826d] hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg terracotta-gradient text-white font-bold shadow flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingClanId ? 'Enregistrer les modifications' : 'Créer & Synchroniser'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#a8826d] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un clan ou une tribu..."
                value={clanSearch}
                onChange={(e) => setClanSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-[#180d07] border border-[#4a2412] rounded-xl text-xs text-white placeholder-[#a8826d] focus:outline-none focus:border-[#f59e0b]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedTribeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedTribeFilter === 'all'
                    ? 'bg-[#c85a32] text-white'
                    : 'bg-[#24130a] text-[#a8826d] hover:text-[#fed7aa]'
                }`}
              >
                Toutes ({clans.length})
              </button>
              {MYENE_TRIBES.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTribeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedTribeFilter === t
                      ? 'bg-[#c85a32] text-white'
                      : 'bg-[#24130a] text-[#a8826d] hover:text-[#fed7aa]'
                  }`}
                >
                  {t} ({clans.filter(c => c.tribe === t).length})
                </button>
              ))}
            </div>
          </div>

          {/* Clans Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredClans.map((clan) => {
              const attachedVillages = villages.filter(v => v.clan === clan.name);
              return (
                <div
                  key={clan.id}
                  className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] hover:border-[#f59e0b]/50 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">Clan {clan.name}</div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-md bg-[#c85a32]/20 border border-[#c85a32]/40 text-[#fde047] text-[11px] font-semibold">
                        <Globe className="w-3 h-3 text-[#f59e0b]" />
                        <span>Tribu : {clan.tribe}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEditClan(clan)}
                        className="p-1.5 rounded-lg bg-[#24130a] text-[#fed7aa] hover:text-white"
                        title="Modifier"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer le clan "${clan.name}" (${clan.tribe}) ?`)) {
                            onDeleteClan(clan.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-[#7f1d1d]/40 text-[#f87171] hover:bg-[#7f1d1d]"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#a8826d] flex items-center justify-between border-t border-[#2a170d] pt-2">
                    <span>Villages rattachés : <strong className="text-white">{attachedVillages.length}</strong></span>
                    {clan.description && <span className="truncate max-w-[130px] italic">{clan.description}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredClans.length === 0 && (
            <div className="p-8 text-center text-xs text-[#a8826d] bg-[#180d07] rounded-2xl border border-[#3b1d10]">
              Aucun clan trouvé avec ces filtres. Utilisez le bouton "Nouveau Clan" pour en ajouter un.
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: VILLAGES */}
      {activeSection === 'villages' && (
        <div className="space-y-4">
          {/* Add / Edit Village Form */}
          {isAddingVillage && (
            <form onSubmit={handleSubmitVillage} className="p-5 bg-[#24130a] rounded-2xl border-2 border-[#10b981]/40 space-y-4 text-xs animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#4a2412] pb-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#10b981]" />
                  <span>{editingVillageId ? 'Modifier le Village' : 'Créer un Village (rattaché à un Clan & Tribu)'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingVillage(false)}
                  className="text-[#a8826d] hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#fed7aa] font-semibold mb-1">
                    Nom du Village / Campement <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={villageFormData.name}
                    onChange={(e) => setVillageFormData({ ...villageFormData, name: e.target.value })}
                    placeholder="Ex: Lac Onangué, Ashouka..."
                    className="w-full px-3 py-2 bg-[#180d07] border border-[#522915] rounded-xl text-white text-xs focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block text-[#fed7aa] font-semibold mb-1">
                    Clan de Rattachement <span className="text-[#ef4444]">*</span>
                  </label>
                  <select
                    value={villageFormData.clan}
                    onChange={(e) => handleVillageClanChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#180d07] border border-[#522915] rounded-xl text-white text-xs focus:outline-none focus:border-[#10b981]"
                  >
                    {clans.map((c) => (
                      <option key={c.id} value={c.name}>
                        Clan {c.name} ({c.tribe})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#fed7aa] font-semibold mb-1">
                    Tribu Héritée :
                  </label>
                  <input
                    type="text"
                    disabled
                    value={villageFormData.tribe}
                    className="w-full px-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-[#fed7aa] font-semibold text-xs cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#fed7aa] font-semibold mb-1">
                  Région géographique (facultatif) :
                </label>
                <input
                  type="text"
                  value={villageFormData.region}
                  onChange={(e) => setVillageFormData({ ...villageFormData, region: e.target.value })}
                  placeholder="Ex: Moyen-Ogooué, Bas-Ogooué, Lacs du Sud..."
                  className="w-full px-3 py-2 bg-[#180d07] border border-[#522915] rounded-xl text-white text-xs focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingVillage(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#180d07] text-[#a8826d] hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg terracotta-gradient text-white font-bold shadow flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingVillageId ? 'Enregistrer les modifications' : 'Créer le Village'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#a8826d] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher village, clan, région..."
                value={villageSearch}
                onChange={(e) => setVillageSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-[#180d07] border border-[#4a2412] rounded-xl text-xs text-white placeholder-[#a8826d] focus:outline-none focus:border-[#f59e0b]"
              />
            </div>

            <div>
              <select
                value={villageTribeFilter}
                onChange={(e) => setVillageTribeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[#180d07] border border-[#4a2412] rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="all">Toutes les Tribus ({villages.length})</option>
                {MYENE_TRIBES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={villageClanFilter}
                onChange={(e) => setVillageClanFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[#180d07] border border-[#4a2412] rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="all">Tous les Clans ({clans.length})</option>
                {clans.map((c) => (
                  <option key={c.id} value={c.name}>Clan {c.name} ({c.tribe})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Villages List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredVillages.map((village) => (
              <div
                key={village.id}
                className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] hover:border-[#10b981]/50 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#10b981]" />
                      <span>{village.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#24130a] text-[#fed7aa] border border-[#522915] text-[11px] font-medium">
                        Clan : <strong className="text-white">{village.clan || 'Non défini'}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#c85a32]/20 text-[#fde047] border border-[#c85a32]/40 text-[11px] font-medium">
                        Tribu : {village.tribe}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEditVillage(village)}
                      className="p-1.5 rounded-lg bg-[#24130a] text-[#fed7aa] hover:text-white"
                      title="Modifier"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer le village "${village.name}" ?`)) {
                          onDeleteVillage(village.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-[#7f1d1d]/40 text-[#f87171] hover:bg-[#7f1d1d]"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {village.region && (
                  <div className="text-[11px] text-[#a8826d] border-t border-[#2a170d] pt-2">
                    Région : {village.region}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredVillages.length === 0 && (
            <div className="p-8 text-center text-xs text-[#a8826d] bg-[#180d07] rounded-2xl border border-[#3b1d10]">
              Aucun village ne correspond à ces critères.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
