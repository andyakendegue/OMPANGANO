import React, { useState } from 'react';
import { 
  Search, 
  Volume2, 
  Mic, 
  Sparkles, 
  BookOpen, 
  Filter, 
  Info, 
  Check, 
  ChevronRight,
  Globe2
} from 'lucide-react';
import { QuestionnaireItem } from '../types';

interface VocabularyExplorerProps {
  items: QuestionnaireItem[];
  onSelectExpression: (index: number) => void;
}

export const VocabularyExplorer: React.FC<VocabularyExplorerProps> = ({
  items,
  onSelectExpression
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'Toutes les expressions' },
    { id: 'salutations', label: 'Salutations & Civilités' },
    { id: 'fleuve_peche', label: 'Fleuve Ogooué & Pêche' },
    { id: 'nature_faune', label: 'Faune & Lacs' },
    { id: 'vie_quotidienne', label: 'Vie au Village' },
    { id: 'famille_communaute', label: 'Famille & Parents' },
    { id: 'proverbes_contes', label: 'Proverbes & Sagesse' }
  ];

  const filteredItems = items.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = 
      item.frenchText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.myeneText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.contextNotes && item.contextNotes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleSpeak = (text: string, id: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR'; // Fallback voice
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
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#f59e0b]" />
          <div>
            <h2 className="text-xl font-bold text-white">Mémoire & Vocabulaire Myènè</h2>
            <p className="text-xs text-[#d4af94]">Consultez les trésors lexicaux recueillis par NKALA APP</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#a8826d] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher en français ou en Myènè (ex: pirogue, Mbolo, crabe...)"
            className="w-full pl-10 pr-4 py-3 bg-[#180d07] border border-[#4a2412] rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#f59e0b]"
          />
        </div>

        {/* Categories scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
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
        {filteredItems.map((item, index) => {
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
                      Langue Myènè
                    </span>
                    <span className="text-[10px] text-[#a8826d]">
                      {item.recordingsCount || 5} voix enregistrées
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
    </div>
  );
};
