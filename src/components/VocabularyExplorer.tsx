import React, { useState, useMemo } from 'react';
import {
  Search,
  Volume2,
  Mic,
  BookOpen,
  Globe,
  X,
  Star,
  MapPin,
  ScrollText,
  Compass,
  ShieldCheck
} from 'lucide-react';
import {
  QuestionnaireItem,
  ThemeDefinition,
  ClanRegistry,
  VillageRegistry,
  UserProfile,
  Contribution,
  TribeName
} from '../types';
import {
  THEMATIC_CATEGORIES,
  INITIAL_CLANS,
  INITIAL_VILLAGES,
  MYENE_TRIBES,
  TRIBAL_DIALECT_INFO,
  mapDialectToTribeName
} from '../services/seedData';

interface VocabularyExplorerProps {
  items: QuestionnaireItem[];
  themes?: ThemeDefinition[];
  clans?: ClanRegistry[];
  villages?: VillageRegistry[];
  currentUser?: UserProfile | null;
  contributions?: Contribution[];
  usersList?: UserProfile[];
  favoriteItemIds?: string[];
  onToggleFavorite?: (itemId: string) => void;
  onSelectExpression: (index: number) => void;
}

function normalizeTribeKey(name: string = ''): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export const VocabularyExplorer: React.FC<VocabularyExplorerProps> = ({
  items,
  themes = THEMATIC_CATEGORIES,
  clans: _clans = INITIAL_CLANS,
  villages = INITIAL_VILLAGES,
  currentUser = null,
  contributions = [],
  usersList = [],
  favoriteItemIds = [],
  onToggleFavorite,
  onSelectExpression
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTribe, setSelectedTribe] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 40;

  const favoriteSet = useMemo(() => new Set(favoriteItemIds), [favoriteItemIds]);

  const userByIdMap = useMemo(() => {
    const m = new Map<string, UserProfile>();
    for (const u of usersList) {
      if (u && u.id) m.set(u.id, u);
    }
    if (currentUser && currentUser.id) {
      m.set(currentUser.id, currentUser);
    }
    return m;
  }, [usersList, currentUser]);

  // Compute associated tribes and tribe-specific orthographic/tonal variants for each item
  const itemTribeMetadata = useMemo(() => {
    const itemToTribes = new Map<string, TribeName[]>();
    const itemToTribeVariant = new Map<string, Map<string, string>>();

    const contribsByItem = new Map<string, Contribution[]>();
    for (const c of contributions) {
      if (!c.itemId) continue;
      const list = contribsByItem.get(c.itemId) || [];
      list.push(c);
      contribsByItem.set(c.itemId, list);
    }

    for (const item of items) {
      const matchedMap = new Map<string, TribeName>();
      const variantsForTribes = new Map<string, string>();

      const addTribe = (rawDialectOrTribe?: string) => {
        if (!rawDialectOrTribe) return;
        const tName = mapDialectToTribeName(rawDialectOrTribe);
        matchedMap.set(normalizeTribeKey(tName), tName);
      };

      // 1. Primary dialect/tribe of the question
      addTribe(item.dialect || 'orungu');

      // 2. Tribes of contributors who proposed variants or recordings on this question
      const itemContribs = contribsByItem.get(item.id) || [];
      for (const contrib of itemContribs) {
        const u = userByIdMap.get(contrib.userId);
        const contribTribeRaw = contrib.dialectVariant || contrib.userTribe || u?.tribe;
        if (contribTribeRaw) {
          const tribeLabel = mapDialectToTribeName(contribTribeRaw);
          addTribe(tribeLabel);
          if (contrib.proposedSpelling && contrib.proposedSpelling.trim()) {
            variantsForTribes.set(normalizeTribeKey(tribeLabel), contrib.proposedSpelling.trim());
          }
        }
      }

      itemToTribes.set(item.id, Array.from(matchedMap.values()));
      itemToTribeVariant.set(item.id, variantsForTribes);
    }

    return { itemToTribes, itemToTribeVariant };
  }, [items, contributions, userByIdMap]);

  const userTribe = useMemo<TribeName | ''>(() => {
    if (!currentUser?.tribe) return '';
    return mapDialectToTribeName(currentUser.tribe);
  }, [currentUser?.tribe]);

  // Helper to check if an item matches the selected Tribe filter
  const doesItemMatchTribe = (item: QuestionnaireItem, tribeFilter: string): boolean => {
    if (tribeFilter === 'all') return true;
    const itemTribes = itemTribeMetadata.itemToTribes.get(item.id) || [
      mapDialectToTribeName(item.dialect)
    ];
    const targetKey = normalizeTribeKey(tribeFilter);
    return itemTribes.some(t => normalizeTribeKey(t) === targetKey);
  };

  // Count questions per tribe
  const tribeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of MYENE_TRIBES) {
      counts.set(normalizeTribeKey(t), 0);
    }

    for (const item of items) {
      const itemTribes = itemTribeMetadata.itemToTribes.get(item.id) || [
        mapDialectToTribeName(item.dialect)
      ];
      const normSet = new Set(itemTribes.map(normalizeTribeKey));
      for (const nKey of normSet) {
        counts.set(nKey, (counts.get(nKey) || 0) + 1);
      }
    }

    return counts;
  }, [items, itemTribeMetadata]);

  // Dynamic Linguistic, Historical & Geographical Info for the Selected Tribe
  const activeTribeInfo = useMemo(() => {
    if (selectedTribe === 'all') return null;
    const tribeName = mapDialectToTribeName(selectedTribe);
    const meta = TRIBAL_DIALECT_INFO[tribeName];
    const tribeVillages = villages
      .filter(v => normalizeTribeKey(v.tribe) === normalizeTribeKey(tribeName))
      .map(v => v.name);

    return {
      ...meta,
      associatedVillages: tribeVillages
    };
  }, [selectedTribe, villages]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    let totalMatchingTribe = 0;

    for (const it of items) {
      if (!doesItemMatchTribe(it, selectedTribe)) continue;
      if (onlyFavorites && !favoriteSet.has(it.id)) continue;
      totalMatchingTribe++;
      const cat = it.category || it.theme || 'vie_quotidienne_famille';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }

    const list: Array<{ id: string; label: string; count: number }> = [
      { id: 'all', label: `Tous les thèmes (${totalMatchingTribe})`, count: totalMatchingTribe }
    ];

    const seen = new Set<string>(['all']);
    for (const th of themes) {
      const c = counts.get(th.id) || 0;
      seen.add(th.id);
      list.push({
        id: th.id,
        label: `${th.icon} ${th.shortName || th.name} (${c})`,
        count: c
      });
    }

    const legacyMap: Record<string, string> = {
      salutations: '👋 Salutations',
      fleuve_peche: '🛶 Fleuve & Pêche',
      nature_faune: '🐆 Faune & Lacs',
      vie_quotidienne: '🏡 Vie au Village',
      famille_communaute: '👨‍👩‍👧‍👦 Famille',
      proverbes_contes: '📜 Proverbes'
    };

    for (const [k, c] of counts.entries()) {
      if (!seen.has(k) && c > 0) {
        list.push({
          id: k,
          label: `${legacyMap[k] || k} (${c})`,
          count: c
        });
      }
    }

    return list;
  }, [items, themes, selectedTribe, itemTribeMetadata, onlyFavorites, favoriteSet]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter(item => {
      if (onlyFavorites && !favoriteSet.has(item.id)) return false;
      if (!doesItemMatchTribe(item, selectedTribe)) return false;

      const itemCat = item.category || item.theme || '';
      const matchesCat = selectedCategory === 'all' || itemCat === selectedCategory;
      if (!matchesCat) return false;

      if (!q) return true;
      const itemTribes = itemTribeMetadata.itemToTribes.get(item.id) || [];
      return (
        (item.frenchText || '').toLowerCase().includes(q) ||
        (item.myeneText || '').toLowerCase().includes(q) ||
        (item.contextNotes && item.contextNotes.toLowerCase().includes(q)) ||
        itemTribes.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [items, selectedTribe, selectedCategory, searchQuery, itemTribeMetadata, onlyFavorites, favoriteSet]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePage]);

  const handleSpeak = (text: string, id: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.85;
      utterance.onend = () => setPlayingItemId(null);
      setPlayingItemId(id);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-20">
      {/* Search and Tribe Filters */}
      <div className="warm-card-gradient rounded-3xl p-5 border border-[#4a2412] shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#f59e0b]" />
            <div>
              <h2 className="text-xl font-bold text-white">Mémoire & Vocabulaire Myènè</h2>
              <p className="text-xs text-[#d4af94]">
                Explorez les {items.length} expressions du corpus classées par <strong>Tribu Myènè</strong> et par <strong>Thème culturel</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setOnlyFavorites(prev => !prev);
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                onlyFavorites
                  ? 'bg-[#f59e0b] text-[#180d07] border-[#fde047] shadow-md'
                  : 'bg-[#180d07] border-[#4a2412] text-[#fde047] hover:border-[#f59e0b]/60'
              }`}
              title="Filtrer uniquement votre vocabulaire favori"
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  onlyFavorites || favoriteItemIds.length > 0 ? 'fill-current' : ''
                }`}
              />
              <span>Mes Favoris ({favoriteItemIds.length})</span>
            </button>

            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#180d07] border border-[#4a2412] text-[#f59e0b]">
              {filteredItems.length} résultat(s)
            </span>
          </div>
        </div>

        {/* Search Bar + Tribe Dropdown Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-7">
            <Search className="w-4 h-4 text-[#a8826d] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher en français, en Myènè ou par tribu (ex: pirogue, Mbolo, Ôrungu, Enenga...)"
              className="w-full pl-10 pr-4 py-3 bg-[#180d07] border border-[#4a2412] rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#f59e0b]"
            />
          </div>

          {/* Tribe Dropdown Filter */}
          <div className="relative md:col-span-5">
            <Globe className="w-4 h-4 text-[#f59e0b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Filtrer les questions par tribu Myènè"
              value={selectedTribe}
              onChange={e => {
                setSelectedTribe(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-3 bg-[#180d07] border border-[#4a2412] hover:border-[#d97706]/60 rounded-2xl text-xs sm:text-sm text-[#fed7aa] font-semibold focus:outline-none focus:border-[#f59e0b] transition-colors cursor-pointer"
            >
              <option value="all">
                🌍 Toutes les 6 tribus Myènè ({items.length} fiches)
              </option>

              {userTribe && (
                <optgroup label="⭐ Ma Tribu de Filiation">
                  <option value={userTribe}>
                    ⭐ Ma tribu : {userTribe} ({tribeCounts.get(normalizeTribeKey(userTribe)) || 0} fiches)
                  </option>
                </optgroup>
              )}

              <optgroup label="🌍 Les 6 Tribus (Variétés Dialectales Myènè)">
                {MYENE_TRIBES.map(tName => {
                  const count = tribeCounts.get(normalizeTribeKey(tName)) || 0;
                  const isMine = normalizeTribeKey(tName) === normalizeTribeKey(userTribe);
                  return (
                    <option key={tName} value={tName}>
                      {isMine ? '⭐ ' : ''}Tribu {tName} ({count})
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Quick Access Buttons for the 6 Myènè Tribes */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-[11px] font-semibold text-[#a8826d] flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-[#f59e0b]" />
            Filtrer par Tribu :
          </span>

          <button
            type="button"
            onClick={() => {
              setSelectedTribe('all');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
              selectedTribe === 'all'
                ? 'bg-[#f59e0b] text-[#180d07] font-bold shadow'
                : 'bg-[#24130a] text-[#d4af94] border border-[#4a2412] hover:border-[#f59e0b]/50'
            }`}
          >
            Toutes les tribus
          </button>

          {MYENE_TRIBES.map(tName => {
            const isSelected = normalizeTribeKey(selectedTribe) === normalizeTribeKey(tName);
            const isUserTribe = normalizeTribeKey(userTribe) === normalizeTribeKey(tName);
            const count = tribeCounts.get(normalizeTribeKey(tName)) || 0;
            return (
              <button
                key={tName}
                type="button"
                onClick={() => {
                  setSelectedTribe(tName);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-amber-500 text-[#180d07] font-bold shadow'
                    : isUserTribe
                    ? 'bg-[#24130a] text-[#fde047] border border-amber-500/40 hover:bg-[#341b10]'
                    : 'bg-[#24130a] text-[#d4af94] border border-[#4a2412] hover:border-[#f59e0b]/40'
                }`}
              >
                <span>
                  {isUserTribe ? '⭐ ' : '🌍 '}
                  {tName} ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Tribe Historical, Geographical & Linguistic/Tonal Info Card */}
        {activeTribeInfo ? (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#180d07] via-[#221209] to-[#2c160b] border border-[#f59e0b]/50 shadow-lg space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#4a2412]/80 pb-2.5">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/40 flex items-center justify-center text-lg shrink-0 shadow-inner">
                  🌍
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-[#fde047] uppercase tracking-wider">
                      Tribu {activeTribeInfo.tribe}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#2b160c] text-[#f59e0b] border border-[#f59e0b]/40">
                      Variété dialectale : {activeTribeInfo.dialectCode}
                    </span>
                    <span className="text-[10px] text-emerald-300 font-semibold">
                      • {filteredItems.length} question(s) associée(s)
                    </span>
                  </div>
                  {activeTribeInfo.mottoOrSymbol && (
                    <p className="text-[11px] text-[#fed7aa] italic mt-0.5 flex items-center gap-1">
                      <Compass className="w-3 h-3 text-[#f59e0b] shrink-0" />
                      <span>{activeTribeInfo.mottoOrSymbol}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTribe('all');
                  setCurrentPage(1);
                }}
                className="self-end sm:self-center inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#27150c] hover:bg-[#341b10] text-[#fed7aa] text-[11px] font-semibold border border-[#4a2412] shrink-0 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Toutes les tribus</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#180d07]/90 border border-[#3b1d10] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#f59e0b]">
                  <ScrollText className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
                  <span>Spécificités Orthographiques & Tonales</span>
                </div>
                <p className="text-[11px] text-[#e5cbb8] leading-relaxed">
                  {activeTribeInfo.orthographicAndTonalTraits}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#180d07]/90 border border-[#3b1d10] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Histoire & Tradition Orale</span>
                </div>
                <p className="text-[11px] text-[#e5cbb8] leading-relaxed">
                  {activeTribeInfo.historicalOrigins}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#180d07]/90 border border-[#3b1d10] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Aire Géographique</span>
                </div>
                <p className="text-[11px] text-[#e5cbb8] leading-relaxed">
                  {activeTribeInfo.geographicalZone}
                </p>
                {activeTribeInfo.associatedVillages && activeTribeInfo.associatedVillages.length > 0 && (
                  <div className="pt-1 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-semibold text-[#a8826d]">Villages enregistrés :</span>
                    {activeTribeInfo.associatedVillages.map(vName => (
                      <span
                        key={vName}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-[#24130a] text-emerald-300 border border-emerald-500/30 font-medium"
                      >
                        📍 {vName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-[#180d07]/75 border border-[#3b1d10] text-[11px] text-[#d4af94]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#f59e0b] shrink-0" />
              <span>
                En langue Myènè, les différences <strong>orthographiques et tonales</strong> concernent uniquement les <strong>6 Tribus</strong> (<em>Mpongwè, Adyumba, Enenga, Nkomi, Galoa, Ôrungu</em>) et non les clans. Sélectionnez une tribu pour explorer ses expressions et ses particularités linguistiques.
              </span>
            </div>
          </div>
        )}

        {/* Categories scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'terracotta-gradient text-white shadow-md font-bold'
                  : 'bg-[#24130a] text-[#a8826d] hover:bg-[#341b10] hover:text-[#fed7aa]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State when no item matches filters */}
      {filteredItems.length === 0 && (
        <div className="warm-card-gradient rounded-3xl p-8 border border-[#4a2412] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#180d07] border border-[#4a2412] flex items-center justify-center mx-auto text-xl">
            {onlyFavorites ? '⭐' : '🌍'}
          </div>
          <h3 className="text-base font-bold text-white">
            {onlyFavorites
              ? 'Aucun vocabulaire favori pour ces critères'
              : 'Aucune expression trouvée pour ces critères'}
          </h3>
          <p className="text-xs text-[#d4af94] max-w-md mx-auto">
            {onlyFavorites
              ? "Cliquez sur l'étoile « Favori » sur les cartes du vocabulaire pour sauvegarder vos expressions Myènè préférées et les retrouver ici ainsi que dans votre Profil."
              : `Aucun mot ne correspond simultanément à votre recherche et aux filtres sélectionnés (${
                  selectedTribe !== 'all' ? `Tribu ${selectedTribe}` : 'Toutes les tribus'
                }).`}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setOnlyFavorites(false);
                setSelectedTribe('all');
                setSelectedCategory('all');
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-xl terracotta-gradient text-white text-xs font-bold shadow"
            >
              Afficher tout le vocabulaire
            </button>
          </div>
        </div>
      )}

      {/* Grid of vocabulary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {paginatedItems.map(item => {
          const originalIndex = items.findIndex(i => i.id === item.id);
          const itemTribes = itemTribeMetadata.itemToTribes.get(item.id) || [
            mapDialectToTribeName(item.dialect)
          ];
          const tribeVariantsMap = itemTribeMetadata.itemToTribeVariant.get(item.id);
          const specificTribeVariant =
            selectedTribe !== 'all'
              ? tribeVariantsMap?.get(normalizeTribeKey(selectedTribe))
              : undefined;
          const itemNuanceContrib = contributions.find(
            c => c.itemId === item.id && (c.proposedFrenchMeaning || c.secondaryMeaning)
          );
          const isFavorite = favoriteSet.has(item.id);

          return (
            <div
              key={item.id}
              className={`warm-card-gradient rounded-2xl overflow-hidden border transition-all shadow-lg flex flex-col justify-between ${
                isFavorite
                  ? 'border-[#f59e0b]/70 ring-1 ring-[#f59e0b]/30'
                  : 'border-[#4a2412] hover:border-[#d97706]/40'
              }`}
            >
              <div className="relative h-32 w-full overflow-hidden bg-[#180d07]">
                <img
                  src={item.imageUrl}
                  alt={item.frenchText}
                  className="w-full h-full object-cover filter brightness-[0.8]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c100a] to-transparent" />
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#180d07]/80 text-[#fde047] border border-[#d97706]/40">
                    {item.difficulty}
                  </span>
                  {onToggleFavorite && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      title={
                        isFavorite
                          ? 'Retirer de mon vocabulaire favori'
                          : 'Sauvegarder dans mes favoris'
                      }
                      className={`p-1.5 rounded-full border transition-all active:scale-90 ${
                        isFavorite
                          ? 'bg-[#f59e0b] text-[#180d07] border-[#fde047] shadow-md'
                          : 'bg-[#180d07]/85 text-[#fed7aa] border-[#4a2412] hover:border-[#f59e0b] hover:text-[#fde047]'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Tribe Badges (never Clan badges) */}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[65%]">
                  {itemTribes.map(tribeLabel => {
                    const isHighlighted =
                      (selectedTribe !== 'all' &&
                        normalizeTribeKey(selectedTribe) === normalizeTribeKey(tribeLabel)) ||
                      normalizeTribeKey(tribeLabel) === normalizeTribeKey(userTribe);
                    return (
                      <span
                        key={tribeLabel}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedTribe(tribeLabel);
                          setCurrentPage(1);
                        }}
                        title={`Filtrer par la tribu ${tribeLabel}`}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          isHighlighted
                            ? 'bg-[#f59e0b] text-[#180d07] shadow'
                            : 'bg-[#180d07]/85 text-[#fed7aa] border border-[#4a2412] hover:border-[#f59e0b]'
                        }`}
                      >
                        🌍 Tribu {tribeLabel}
                      </span>
                    );
                  })}
                </div>

                <span className="absolute bottom-2 left-3 text-xs font-semibold text-white drop-shadow truncate pr-2">
                  « {item.frenchText} »
                </span>
              </div>

              <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-[#f59e0b] tracking-wider">
                      Tribu {mapDialectToTribeName(item.dialect)} ({item.dialect || 'orungu'})
                    </span>
                    <span className="text-[10px] text-[#a8826d]">
                      {item.recordingsCount || 0} voix enregistrées
                    </span>
                  </div>
                  <div className="text-xl font-bold font-serif text-white pt-0.5">
                    {item.myeneText}
                  </div>
                  {specificTribeVariant && specificTribeVariant !== item.myeneText && (
                    <div className="mt-1 px-2.5 py-1 rounded-lg bg-[#180d07] border border-amber-500/30 text-[11px] text-[#fde047]">
                      Variante Tribu {selectedTribe} : <strong>{specificTribeVariant}</strong>
                    </div>
                  )}
                  {itemNuanceContrib && (
                    <div className="mt-1 px-2.5 py-1 rounded-lg bg-[#180d07] border border-emerald-500/30 text-[11px] text-emerald-300 space-y-0.5">
                      {itemNuanceContrib.proposedFrenchMeaning && (
                        <div>
                          💡 Autre tournure / sens :{' '}
                          <strong>« {itemNuanceContrib.proposedFrenchMeaning} »</strong>
                        </div>
                      )}
                      {itemNuanceContrib.secondaryMeaning && (
                        <div className="text-[10px] text-[#d4af94]">
                          🌿 Sens secondaire : {itemNuanceContrib.secondaryMeaning}
                        </div>
                      )}
                    </div>
                  )}
                  {item.contextNotes && (
                    <p className="text-[11px] text-[#d4af94] mt-1 line-clamp-2 leading-relaxed">
                      {item.contextNotes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#3b1d10] gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSpeak(item.myeneText, item.id)}
                      className="p-2 rounded-xl bg-[#24130a] hover:bg-[#381e11] text-[#f59e0b] border border-[#4a2412] transition-colors"
                      title="Écouter la prononciation"
                    >
                      <Volume2
                        className={`w-4 h-4 ${
                          playingItemId === item.id ? 'animate-bounce' : ''
                        }`}
                      />
                    </button>

                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(item.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                          isFavorite
                            ? 'bg-[#f59e0b]/20 text-[#fde047] border-[#f59e0b]/60'
                            : 'bg-[#24130a] text-[#d4af94] border-[#4a2412] hover:text-[#fde047] hover:border-[#f59e0b]/40'
                        }`}
                        title={
                          isFavorite ? 'Retirer de mes favoris' : 'Ajouter à mes favoris'
                        }
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFavorite ? 'fill-[#f59e0b] text-[#f59e0b]' : ''
                          }`}
                        />
                        <span>Favori</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onSelectExpression(originalIndex >= 0 ? originalIndex : 0)
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl terracotta-gradient text-white text-xs font-semibold shadow hover:opacity-95 active:scale-95 transition-transform"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Enregistrer ma voix</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 warm-card-gradient border border-[#4a2412] rounded-2xl text-xs">
          <span className="text-[#d4af94]">
            Page <strong className="text-white">{safePage}</strong> sur{' '}
            <strong className="text-white">{totalPages}</strong> ({filteredItems.length}{' '}
            fiches)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => {
                setCurrentPage(p => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-xl bg-[#27150c] hover:bg-[#341b10] text-[#fed7aa] disabled:opacity-40 font-bold"
            >
              ‹ Précédent
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => {
                setCurrentPage(p => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-xl terracotta-gradient text-white disabled:opacity-40 font-bold"
            >
              Suivant ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
