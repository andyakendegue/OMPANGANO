import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Volume2, 
  Mic, 
  BookOpen
} from 'lucide-react';
import { QuestionnaireItem, ThemeDefinition } from '../types';
import { THEMATIC_CATEGORIES } from '../services/seedData';

interface VocabularyExplorerProps {
  items: QuestionnaireItem[];
  themes?: ThemeDefinition[];
  onSelectExpression: (index: number) => void;
}

export const VocabularyExplorer: React.FC<VocabularyExplorerProps> = ({
  items,
  themes = THEMATIC_CATEGORIES,
  onSelectExpression
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 40;

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      const cat = it.category || it.theme || 'vie_quotidienne_famille';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }

    const list: Array<{ id: string; label: string; count: number }> = [
      { id: 'all', label: `Tous les thèmes (${items.length})`, count: items.length }
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
  }, [items, themes]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter(item => {
      const itemCat = item.category || item.theme || '';
      const matchesCat = selectedCategory === 'all' || itemCat === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        (item.frenchText || '').toLowerCase().includes(q) ||
        (item.myeneText || '').toLowerCase().includes(q) ||
        (item.contextNotes && item.contextNotes.toLowerCase().includes(q))
      );
    });
  }, [items, selectedCategory, searchQuery]);

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
                Consultez les {items.length} trésors lexicaux recueillis par NKALA APP
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#180d07] border border-[#4a2412] text-[#f59e0b]">
            {filteredItems.length} résultat(s)
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#a8826d] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Rechercher en français ou en Myènè (ex: pirogue, Mbolo, crabe...)"
            className="w-full pl-10 pr-4 py-3 bg-[#180d07] border border-[#4a2412] rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#f59e0b]"
          />
        </div>

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

      {/* Grid of vocabulary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {paginatedItems.map((item) => {
          const originalIndex = items.findIndex(i => i.id === item.id);
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
