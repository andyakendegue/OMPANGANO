import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Volume2, 
  Mic, 
  BookOpen,
  Shield,
  Users,
  X,
  Sparkles
} from 'lucide-react';
import { 
  QuestionnaireItem, 
  ThemeDefinition, 
  ClanRegistry, 
  UserProfile, 
  Contribution 
} from '../types';
import { THEMATIC_CATEGORIES, INITIAL_CLANS } from '../services/seedData';

interface VocabularyExplorerProps {
  items: QuestionnaireItem[];
  themes?: ThemeDefinition[];
  clans?: ClanRegistry[];
  currentUser?: UserProfile | null;
  contributions?: Contribution[];
  usersList?: UserProfile[];
  onSelectExpression: (index: number) => void;
}

function normalizeClanKey(name: string = ''): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function mapDialectToTribeLabel(dialect: string = ''): string {
  const d = dialect.toLowerCase().trim();
  if (d.includes('mpong')) return 'Mpongwè';
  if (d.includes('eneng')) return 'Enenga';
  if (d.includes('galo') || d.includes('galw')) return 'Galoa';
  if (d.includes('nkom')) return 'Nkomi';
  if (d.includes('adyum')) return 'Adyumba';
  if (d.includes('orung') || d.includes('ôrung')) return 'Ôrungu';
  return 'Enenga';
}

function deterministicHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export const VocabularyExplorer: React.FC<VocabularyExplorerProps> = ({
  items,
  themes = THEMATIC_CATEGORIES,
  clans = INITIAL_CLANS,
  currentUser = null,
  contributions = [],
  usersList = [],
  onSelectExpression
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedClan, setSelectedClan] = useState<string>('all');
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 40;

  // Consolidate all known clans (from registry + currentUser + usersList + items)
  const allClansRegistry = useMemo<ClanRegistry[]>(() => {
    const map = new Map<string, ClanRegistry>();

    for (const c of INITIAL_CLANS) {
      map.set(normalizeClanKey(c.name), c);
    }
    for (const c of clans) {
      if (c && c.name && c.name.toLowerCase() !== 'inconnu') {
        map.set(normalizeClanKey(c.name), c);
      }
    }

    const ensureClan = (clanName?: string, tribeFallback?: string) => {
      if (!clanName) return;
      const trimmed = clanName.trim();
      if (!trimmed || trimmed.toLowerCase() === 'inconnu' || trimmed.toLowerCase() === 'non spécifié') return;
      const key = normalizeClanKey(trimmed);
      if (!map.has(key)) {
        map.set(key, {
          id: `clan-${key.replace(/[^a-z0-9]+/g, '-')}`,
          name: trimmed,
          tribe: tribeFallback || 'Ôrungu',
          createdAt: '2026-01-01T00:00:00Z'
        });
      }
    };

    if (currentUser) {
      ensureClan(currentUser.paternalClan, currentUser.tribe);
      ensureClan(currentUser.maternalClan, currentUser.tribe);
    }

    for (const u of usersList) {
      ensureClan(u.paternalClan, u.tribe);
      ensureClan(u.maternalClan, u.tribe);
    }

    for (const it of items) {
      if (it.clan) ensureClan(it.clan, mapDialectToTribeLabel(it.dialect));
      if (it.clans) {
        it.clans.forEach(c => ensureClan(c, mapDialectToTribeLabel(it.dialect)));
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [clans, currentUser, usersList, items]);

  // Build user lookup map for contribution clan attribution
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

  // Compute associated clans and clan-specific contributions for each vocabulary item
  const itemClanMetadata = useMemo(() => {
    const itemToClans = new Map<string, string[]>();
    const itemToClanVariant = new Map<string, Map<string, string>>();

    // Index contributions by itemId
    const contribsByItem = new Map<string, Contribution[]>();
    for (const c of contributions) {
      if (!c.itemId) continue;
      const list = contribsByItem.get(c.itemId) || [];
      list.push(c);
      contribsByItem.set(c.itemId, list);
    }

    const clanNamesList = allClansRegistry.map(c => c.name);

    for (const item of items) {
      const matchedMap = new Map<string, string>(); // normalizedKey -> display clan name
      const variantsForClans = new Map<string, string>();

      const addClan = (rawName?: string) => {
        if (!rawName) return;
        const norm = normalizeClanKey(rawName);
        if (!norm || norm === 'inconnu') return;
        const regMatch = allClansRegistry.find(c => normalizeClanKey(c.name) === norm);
        matchedMap.set(norm, regMatch ? regMatch.name : rawName.trim());
      };

      // 1. Explicit clan fields on item
      if (item.clan) addClan(item.clan);
      if (Array.isArray(item.clans)) {
        item.clans.forEach(c => addClan(c));
      }

      // 2. Textual mention in contextNotes, myeneText, frenchText, or moduleThematique
      const combinedText = `${item.contextNotes || ''} ${item.myeneText || ''} ${item.frenchText || ''} ${item.moduleThematique || ''}`.toLowerCase();
      for (const cObj of allClansRegistry) {
        const lowerClan = cObj.name.toLowerCase();
        if (lowerClan.length >= 4 && combinedText.includes(lowerClan)) {
          addClan(cObj.name);
        }
      }

      // 3. Clans of users who contributed to this item
      const itemContribs = contribsByItem.get(item.id) || [];
      for (const contrib of itemContribs) {
        const u = userByIdMap.get(contrib.userId);
        const pat = contrib.userPaternalClan || u?.paternalClan;
        const mat = contrib.userMaternalClan || u?.maternalClan;
        if (pat) {
          addClan(pat);
          if (contrib.proposedSpelling) {
            variantsForClans.set(normalizeClanKey(pat), contrib.proposedSpelling);
          }
        }
        if (mat) {
          addClan(mat);
          if (contrib.proposedSpelling) {
            variantsForClans.set(normalizeClanKey(mat), contrib.proposedSpelling);
          }
        }
      }

      // 4. Deterministic heritage assignment for corpus items without explicit clan tags
      if (matchedMap.size === 0 && clanNamesList.length > 0) {
        const itemTribe = mapDialectToTribeLabel(item.dialect);
        const sameTribeClans = allClansRegistry.filter(
          c => normalizeClanKey(c.tribe) === normalizeClanKey(itemTribe)
        );
        const h = deterministicHash(item.id || item.myeneText);

        if (sameTribeClans.length > 0) {
          addClan(sameTribeClans[h % sameTribeClans.length].name);
        }
        // Also link a cross-clan oral transmission share so every clan in the registry can explore corpus expressions
        addClan(clanNamesList[h % clanNamesList.length]);
        addClan(clanNamesList[(h * 7 + 3) % clanNamesList.length]);
      }

      itemToClans.set(item.id, Array.from(matchedMap.values()));
      itemToClanVariant.set(item.id, variantsForClans);
    }

    return { itemToClans, itemToClanVariant };
  }, [items, allClansRegistry, contributions, userByIdMap]);

  // Identify current user's valid paternal and maternal clans
  const userPaternalClan = useMemo(() => {
    const raw = currentUser?.paternalClan?.trim();
    if (!raw || raw.toLowerCase() === 'inconnu' || raw.toLowerCase() === 'non spécifié') return '';
    return raw;
  }, [currentUser?.paternalClan]);

  const userMaternalClan = useMemo(() => {
    const raw = currentUser?.maternalClan?.trim();
    if (!raw || raw.toLowerCase() === 'inconnu' || raw.toLowerCase() === 'non spécifié') return '';
    return raw;
  }, [currentUser?.maternalClan]);

  // Helper to check if an item matches a clan filter value
  const doesItemMatchClan = (item: QuestionnaireItem, clanFilter: string): boolean => {
    if (clanFilter === 'all') return true;
    const itemClans = itemClanMetadata.itemToClans.get(item.id) || [];
    const normalizedItemClans = itemClans.map(normalizeClanKey);

    if (clanFilter === '__my_clans__') {
      const targets = [userPaternalClan, userMaternalClan]
        .filter(Boolean)
        .map(normalizeClanKey);
      if (targets.length === 0) return true;
      return targets.some(t => normalizedItemClans.includes(t));
    }

    const targetNorm = normalizeClanKey(clanFilter);
    return normalizedItemClans.includes(targetNorm);
  };

  // Count items per clan (respecting current theme & search or total)
  const clanCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let myBothCount = 0;

    for (const c of allClansRegistry) {
      counts.set(normalizeClanKey(c.name), 0);
    }

    const patNorm = normalizeClanKey(userPaternalClan);
    const matNorm = normalizeClanKey(userMaternalClan);

    for (const item of items) {
      const itemClans = itemClanMetadata.itemToClans.get(item.id) || [];
      const normSet = new Set(itemClans.map(normalizeClanKey));
      for (const nKey of normSet) {
        counts.set(nKey, (counts.get(nKey) || 0) + 1);
      }
      if ((patNorm && normSet.has(patNorm)) || (matNorm && normSet.has(matNorm))) {
        myBothCount++;
      }
    }

    return { counts, myBothCount };
  }, [items, allClansRegistry, itemClanMetadata, userPaternalClan, userMaternalClan]);

  // Group clans by tribe for the <select> dropdown optgroups
  const clansGroupedByTribe = useMemo(() => {
    const groups = new Map<string, ClanRegistry[]>();
    for (const clan of allClansRegistry) {
      const tribe = clan.tribe || 'Autres';
      const list = groups.get(tribe) || [];
      list.push(clan);
      groups.set(tribe, list);
    }
    return Array.from(groups.entries());
  }, [allClansRegistry]);

  // Selected clan details for the active banner
  const activeClanInfo = useMemo(() => {
    if (selectedClan === 'all') return null;
    if (selectedClan === '__my_clans__') {
      return {
        name: [userPaternalClan, userMaternalClan].filter(Boolean).join(' & '),
        tribe: currentUser?.tribe || 'Myènè',
        description: 'Vocabulaire rattaché à vos lignées claniques paternelle et maternelle.'
      };
    }
    const found = allClansRegistry.find(
      c => normalizeClanKey(c.name) === normalizeClanKey(selectedClan)
    );
    return found || {
      name: selectedClan,
      tribe: currentUser?.tribe || 'Myènè',
      description: `Expressions et mémoire lexicale associées au clan ${selectedClan}.`
    };
  }, [selectedClan, allClansRegistry, userPaternalClan, userMaternalClan, currentUser?.tribe]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    let totalMatchingClan = 0;

    for (const it of items) {
      if (!doesItemMatchClan(it, selectedClan)) continue;
      totalMatchingClan++;
      const cat = it.category || it.theme || 'vie_quotidienne_famille';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }

    const list: Array<{ id: string; label: string; count: number }> = [
      { id: 'all', label: `Tous les thèmes (${totalMatchingClan})`, count: totalMatchingClan }
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
  }, [items, themes, selectedClan, itemClanMetadata]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter(item => {
      if (!doesItemMatchClan(item, selectedClan)) return false;

      const itemCat = item.category || item.theme || '';
      const matchesCat = selectedCategory === 'all' || itemCat === selectedCategory;
      if (!matchesCat) return false;

      if (!q) return true;
      const itemClans = itemClanMetadata.itemToClans.get(item.id) || [];
      return (
        (item.frenchText || '').toLowerCase().includes(q) ||
        (item.myeneText || '').toLowerCase().includes(q) ||
        (item.contextNotes && item.contextNotes.toLowerCase().includes(q)) ||
        itemClans.some(c => c.toLowerCase().includes(q))
      );
    });
  }, [items, selectedClan, selectedCategory, searchQuery, itemClanMetadata]);

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
      {/* Search and Filters */}
      <div className="warm-card-gradient rounded-3xl p-5 border border-[#4a2412] shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#f59e0b]" />
            <div>
              <h2 className="text-xl font-bold text-white">Mémoire & Vocabulaire Myènè</h2>
              <p className="text-xs text-[#d4af94]">
                Consultez les {items.length} trésors lexicaux recueillis par NKALA APP selon votre clan ou lignée
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#180d07] border border-[#4a2412] text-[#f59e0b]">
            {filteredItems.length} résultat(s)
          </span>
        </div>

        {/* Search Bar + Clan Dropdown Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-7">
            <Search className="w-4 h-4 text-[#a8826d] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher en français, en Myènè ou par clan (ex: pirogue, Mbolo, Avandji...)"
              className="w-full pl-10 pr-4 py-3 bg-[#180d07] border border-[#4a2412] rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#f59e0b]"
            />
          </div>

          {/* Clan Dropdown Filter */}
          <div className="relative md:col-span-5">
            <Shield className="w-4 h-4 text-[#f59e0b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Filtrer le vocabulaire par clan"
              value={selectedClan}
              onChange={(e) => {
                setSelectedClan(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-3 bg-[#180d07] border border-[#4a2412] hover:border-[#d97706]/60 rounded-2xl text-xs sm:text-sm text-[#fed7aa] font-semibold focus:outline-none focus:border-[#f59e0b] transition-colors cursor-pointer"
            >
              <option value="all">
                🏛️ Tous les clans ({items.length} fiches)
              </option>

              {(userPaternalClan || userMaternalClan) && (
                <optgroup label="⭐ Mes Clans de Filiation">
                  {userPaternalClan && userMaternalClan && normalizeClanKey(userPaternalClan) !== normalizeClanKey(userMaternalClan) && (
                    <option value="__my_clans__">
                      ⭐ Mes 2 clans ({userPaternalClan} & {userMaternalClan}) ({clanCounts.myBothCount})
                    </option>
                  )}
                  {userPaternalClan && (
                    <option value={userPaternalClan}>
                      🏛️ Mon clan paternel : {userPaternalClan} ({clanCounts.counts.get(normalizeClanKey(userPaternalClan)) || 0})
                    </option>
                  )}
                  {userMaternalClan && normalizeClanKey(userMaternalClan) !== normalizeClanKey(userPaternalClan) && (
                    <option value={userMaternalClan}>
                      🌺 Mon clan maternel : {userMaternalClan} ({clanCounts.counts.get(normalizeClanKey(userMaternalClan)) || 0})
                    </option>
                  )}
                </optgroup>
              )}

              {clansGroupedByTribe.map(([tribeName, tribeClans]) => (
                <optgroup key={tribeName} label={`Tribu ${tribeName}`}>
                  {tribeClans.map(clan => {
                    const count = clanCounts.counts.get(normalizeClanKey(clan.name)) || 0;
                    const isUserClan =
                      normalizeClanKey(clan.name) === normalizeClanKey(userPaternalClan) ||
                      normalizeClanKey(clan.name) === normalizeClanKey(userMaternalClan);
                    return (
                      <option key={clan.id} value={clan.name}>
                        {isUserClan ? '⭐ ' : ''}Clan {clan.name} — {clan.tribe} ({count})
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Access Buttons for User's Own Clans */}
        {(userPaternalClan || userMaternalClan || selectedClan !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-[11px] font-semibold text-[#a8826d] flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#f59e0b]" />
              Accès rapide par clan :
            </span>

            <button
              type="button"
              onClick={() => {
                setSelectedClan('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                selectedClan === 'all'
                  ? 'bg-[#f59e0b] text-[#180d07] font-bold shadow'
                  : 'bg-[#24130a] text-[#d4af94] border border-[#4a2412] hover:border-[#f59e0b]/50'
              }`}
            >
              Tous les clans
            </button>

            {userPaternalClan && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClan(userPaternalClan);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${
                  normalizeClanKey(selectedClan) === normalizeClanKey(userPaternalClan)
                    ? 'bg-amber-500 text-[#180d07] font-bold shadow'
                    : 'bg-[#24130a] text-[#fde047] border border-amber-500/40 hover:bg-[#341b10]'
                }`}
              >
                <span>🏛️ Clan paternel : {userPaternalClan}</span>
              </button>
            )}

            {userMaternalClan && normalizeClanKey(userMaternalClan) !== normalizeClanKey(userPaternalClan) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClan(userMaternalClan);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${
                  normalizeClanKey(selectedClan) === normalizeClanKey(userMaternalClan)
                    ? 'bg-emerald-500 text-[#180d07] font-bold shadow'
                    : 'bg-[#24130a] text-emerald-300 border border-emerald-500/40 hover:bg-[#341b10]'
                }`}
              >
                <span>🌺 Clan maternel : {userMaternalClan}</span>
              </button>
            )}

            {userPaternalClan && userMaternalClan && normalizeClanKey(userPaternalClan) !== normalizeClanKey(userMaternalClan) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClan('__my_clans__');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${
                  selectedClan === '__my_clans__'
                    ? 'terracotta-gradient text-white font-bold shadow'
                    : 'bg-[#24130a] text-[#fed7aa] border border-[#4a2412] hover:bg-[#341b10]'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#f59e0b]" />
                <span>Mes 2 clans réunis</span>
              </button>
            )}
          </div>
        )}

        {/* Active Clan Info Banner */}
        {activeClanInfo && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-[#180d07]/90 border border-[#f59e0b]/40">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/40 flex items-center justify-center text-sm shrink-0">
                🏛️
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-[#fde047] uppercase tracking-wider">
                    Clan {activeClanInfo.name}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#2b160c] text-[#f59e0b] border border-[#4a2412]">
                    Tribu {activeClanInfo.tribe}
                  </span>
                  <span className="text-[10px] text-emerald-300 font-semibold">
                    • {filteredItems.length} expression(s) affichée(s)
                  </span>
                </div>
                {activeClanInfo.description && (
                  <p className="text-[11px] text-[#d4af94] mt-0.5">
                    {activeClanInfo.description}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedClan('all');
                setCurrentPage(1);
              }}
              className="self-end sm:self-center inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#27150c] hover:bg-[#341b10] text-[#fed7aa] text-[11px] font-semibold border border-[#4a2412] shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
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
            🏛️
          </div>
          <h3 className="text-base font-bold text-white">
            Aucune expression trouvée pour ces critères
          </h3>
          <p className="text-xs text-[#d4af94] max-w-md mx-auto">
            Aucun mot ne correspond simultanément à votre recherche et aux filtres sélectionnés ({selectedClan !== 'all' ? `Clan ${activeClanInfo?.name}` : 'Tous les clans'}).
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setSelectedClan('all');
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
        {paginatedItems.map((item) => {
          const originalIndex = items.findIndex(i => i.id === item.id);
          const itemClans = itemClanMetadata.itemToClans.get(item.id) || [];
          const clanVariantsMap = itemClanMetadata.itemToClanVariant.get(item.id);
          const specificClanVariant =
            selectedClan !== 'all' && selectedClan !== '__my_clans__'
              ? clanVariantsMap?.get(normalizeClanKey(selectedClan))
              : undefined;
          const itemNuanceContrib = contributions.find(
            c => c.itemId === item.id && (c.proposedFrenchMeaning || c.secondaryMeaning)
          );

          return (
            <div
              key={item.id}
              className="warm-card-gradient rounded-2xl overflow-hidden border border-[#4a2412] hover:border-[#d97706]/40 transition-all shadow-lg flex flex-col justify-between"
            >
              <div className="relative h-32 w-full overflow-hidden bg-[#180d07]">
                <img
                  src={item.imageUrl}
                  alt={item.frenchText}
                  className="w-full h-full object-cover filter brightness-[0.8]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c100a] to-transparent" />
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#180d07]/80 text-[#fde047] border border-[#d97706]/40">
                  {item.difficulty}
                </span>
                {itemClans.length > 0 && (
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[70%]">
                    {itemClans.slice(0, 2).map(clanName => {
                      const isHighlighted =
                        (selectedClan !== 'all' && normalizeClanKey(selectedClan) === normalizeClanKey(clanName)) ||
                        normalizeClanKey(clanName) === normalizeClanKey(userPaternalClan) ||
                        normalizeClanKey(clanName) === normalizeClanKey(userMaternalClan);
                      return (
                        <span
                          key={clanName}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClan(clanName);
                            setCurrentPage(1);
                          }}
                          title={`Filtrer par le clan ${clanName}`}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                            isHighlighted
                              ? 'bg-[#f59e0b] text-[#180d07] shadow'
                              : 'bg-[#180d07]/85 text-[#fed7aa] border border-[#4a2412] hover:border-[#f59e0b]'
                          }`}
                        >
                          🏛️ {clanName}
                        </span>
                      );
                    })}
                    {itemClans.length > 2 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#180d07]/80 text-[#d4af94] border border-[#4a2412]">
                        +{itemClans.length - 2}
                      </span>
                    )}
                  </div>
                )}
                <span className="absolute bottom-2 left-3 text-xs font-semibold text-white drop-shadow truncate pr-2">
                  « {item.frenchText} »
                </span>
              </div>

              <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-[#f59e0b] tracking-wider">
                      Langue Myènè ({item.dialect || 'enenga'})
                    </span>
                    <span className="text-[10px] text-[#a8826d]">
                      {item.recordingsCount || 0} voix enregistrées
                    </span>
                  </div>
                  <div className="text-xl font-bold font-serif text-white pt-0.5">
                    {item.myeneText}
                  </div>
                  {specificClanVariant && specificClanVariant !== item.myeneText && (
                    <div className="mt-1 px-2.5 py-1 rounded-lg bg-[#180d07] border border-amber-500/30 text-[11px] text-[#fde047]">
                      Variante Clan {selectedClan} : <strong>{specificClanVariant}</strong>
                    </div>
                  )}
                  {itemNuanceContrib && (
                    <div className="mt-1 px-2.5 py-1 rounded-lg bg-[#180d07] border border-emerald-500/30 text-[11px] text-emerald-300 space-y-0.5">
                      {itemNuanceContrib.proposedFrenchMeaning && (
                        <div>
                          💡 Autre tournure / sens : <strong>« {itemNuanceContrib.proposedFrenchMeaning} »</strong>
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

                <div className="flex items-center justify-between pt-2 border-t border-[#3b1d10]">
                  <button
                    onClick={() => handleSpeak(item.myeneText, item.id)}
                    className="p-2 rounded-xl bg-[#24130a] hover:bg-[#381e11] text-[#f59e0b] border border-[#4a2412] transition-colors"
                    title="Écouter la prononciation"
                  >
                    <Volume2 className={`w-4 h-4 ${playingItemId === item.id ? 'animate-bounce' : ''}`} />
                  </button>

                  <button
                    onClick={() => onSelectExpression(originalIndex >= 0 ? originalIndex : 0)}
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
            Page <strong className="text-white">{safePage}</strong> sur <strong className="text-white">{totalPages}</strong> ({filteredItems.length} fiches)
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

