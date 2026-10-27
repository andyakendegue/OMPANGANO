import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Search,
  X,
  ChevronDown,
  Globe,
  BookOpen,
  Mic,
  Award,
  Sparkles,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Compass,
  ShieldCheck
} from 'lucide-react';

export interface FaqEntry {
  id: string;
  question: string;
  shortSummary: string;
  answerParagraphs: string[];
  examples?: {
    label: string;
    detail: string;
  }[];
  category:
    | 'tribus_vs_clans'
    | 'orthographe_tons'
    | 'sens_francais'
    | 'audio_voix'
    | 'validation_xp'
    | 'hors_ligne';
  tags: string[];
  isImportantRule?: boolean;
}

const FAQ_CATEGORIES: {
  id: 'all' | FaqEntry['category'];
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: 'all', label: 'Toutes les règles', icon: <Sparkles className="w-3.5 h-3.5" /> },
  {
    id: 'tribus_vs_clans',
    label: 'Tribus vs Clans (Règle d’Or)',
    icon: <Globe className="w-3.5 h-3.5" />
  },
  {
    id: 'orthographe_tons',
    label: 'Orthographe & Tons (Étape 1)',
    icon: <BookOpen className="w-3.5 h-3.5" />
  },
  {
    id: 'sens_francais',
    label: 'Sens Français & Nuances (Étape 2)',
    icon: <Compass className="w-3.5 h-3.5" />
  },
  {
    id: 'audio_voix',
    label: 'Enregistrement Vocal (Étape 3)',
    icon: <Mic className="w-3.5 h-3.5" />
  },
  {
    id: 'validation_xp',
    label: 'Validation & Points XP',
    icon: <Award className="w-3.5 h-3.5" />
  },
  {
    id: 'hors_ligne',
    label: 'Mode Hors-Ligne',
    icon: <WifiOff className="w-3.5 h-3.5" />
  }
];

export const MYENE_CONTRIBUTION_FAQS: FaqEntry[] = [
  {
    id: 'faq-tribus-vs-clans-regle-fondamentale',
    question:
      'Pourquoi les questions et les variantes orthographiques ou tonales sont-elles classées par Tribu et jamais par Clan ?',
    shortSummary:
      'Règle linguistique fondamentale : en langue Omyènè, les différences d’orthographe, de vocabulaire et de tonalité existent uniquement entre les 6 Tribus (Mpongwè, Adyumba, Enenga, Nkomi, Galoa, Ôrungu) et non entre les Clans.',
    answerParagraphs: [
      'En linguistique Myènè (Omyènè), il ne faut jamais confondre la Tribu (sous-groupe dialectal et géographique) et le Clan (lignée généalogique familiale paternelle ou maternelle, appelée « Mbemba » ou « Ikaka »).',
      'Les différences orthographiques, phonétiques et tonales ne concernent que les 6 Tribus Myènè : Mpongwè, Adyumba, Enenga, Nkomi, Galoa et Ôrungu. Deux personnes appartenant à deux clans différents (par exemple Abulya et Agenje chez les Ôrungu) parlent exactement la même variété tribale Ôrungu, avec la même grammaire, la même orthographe et les mêmes tons.',
      'C’est pourquoi toutes les questions du corpus OMPAGANO sont filtrées et catégorisées par Tribu (et par Thème culturel : pêche, faune, vie quotidienne, proverbes...), et jamais dans des « catégories claniques ». Votre clan dans votre profil sert uniquement à préserver la mémoire généalogique et coutumière.'
    ],
    examples: [
      {
        label: 'Différence entre Tribus (Dialectes)',
        detail:
          'Certaines consonnes ou inflexions tonales varient selon que l’on s’exprime en Mpongwè (Estuaire), en Ôrungu (Delta/Port-Gentil), en Nkomi (Fernan-Vaz) ou en Enenga / Galoa (Moyen-Ogooué et Lacs).'
      },
      {
        label: 'Unité linguistique des Clans au sein d’une Tribu',
        detail:
          'Les 21 clans Ôrungu (Abulya, Agalikewa, Agenje, Ajena, Aziza...) partagent tous la même langue Ôrungu sans différence orthographique ni tonale entre clans.'
      }
    ],
    category: 'tribus_vs_clans',
    tags: [
      'tribu',
      'clan',
      'dialecte',
      'orthographe',
      'ton',
      'tonalité',
      'orungu',
      'enenga',
      'mpongwe',
      'galoa',
      'nkomi',
      'adyumba',
      'filtre',
      'catégorie'
    ],
    isImportantRule: true
  },
  {
    id: 'faq-etape-1-orthographe-tribale',
    question:
      'Étape 1 : Comment valider l’orthographe Myènè ou proposer la variante de ma Tribu ?',
    shortSummary:
      'Vérifiez si l’écriture affichée correspond à l’usage de votre tribu. Si votre tribu l’écrit ou le prononce différemment, cliquez sur « Proposer ma variante » et sélectionnez votre Tribu.',
    answerParagraphs: [
      'Lorsque vous consultez une fiche sur la page principale, observez attentivement la phrase en Myènè et l’étiquette de la Tribu affichée en haut de la carte.',
      'Si l’orthographe proposée est exacte dans votre tribu, laissez sélectionné « Oui, l’orthographe est exacte ».',
      'Si vous constatez une faute de frappe, une voyelle mal accentuée (`è`, `ô`) ou si votre Tribu emploie une tournure ou une graphie différente, sélectionnez « Non, proposer ma variante », saisissez votre orthographe corrigée et choisissez la Tribu correspondante (Ôrungu, Enenga, Mpongwè, Galoa, Nkomi ou Adyumba).'
    ],
    examples: [
      {
        label: 'Voyelles ouvertes et nasales en Myènè',
        detail:
          'Utilisez « è » (e ouvert) et « ô » (o ouvert) pour distinguer les timbres vocaliques, ainsi que les groupes nasaux « mb », « nd », « ng », « ny », « mp », « nt », « nk ».'
      },
      {
        label: 'Élision vocalique courante',
        detail:
          'En Myènè parlé comme écrit, la rencontre de deux voyelles entraîne souvent une élision marquée par l’apostrophe : ex. « nongo y’omvwa » (l’eau calme), « nkala y’inongo ».'
      }
    ],
    category: 'orthographe_tons',
    tags: [
      'orthographe',
      'écriture',
      'variante',
      'étape 1',
      'alphabet',
      'voyelle',
      'accent',
      'élision',
      'apostrophe',
      'correction'
    ]
  },
  {
    id: 'faq-tons-et-prononciation-myene',
    question:
      'Comment gérer les différences tonales et phonétiques entre les 6 Tribus Myènè ?',
    shortSummary:
      'Le Myènè est une langue tonale (ton haut, ton bas, ton modulé). Le sens d’un mot peut changer selon la hauteur de la voix et la mélodie propre à chaque tribu.',
    answerParagraphs: [
      'En Omyènè, deux mots peuvent s’écrire avec les mêmes lettres mais avoir deux sens différents selon que les syllabes portent un ton haut, un ton bas ou un ton descendant.',
      'De plus, la mélodie de la phrase (intonation finale et attaque consonantique) présente de subtiles variations entre les tribus maritimes/lagunaires (Mpongwè, Ôrungu, Nkomi) et les tribus fluviales/lacustres (Enenga, Galoa, Adyumba).',
      'Si la fiche affiche une transcription phonétique (API) ou si vous souhaitez signaler une nuance tonale propre à votre tribu, mentionnez-le dans le champ commentaire culturel et surtout faites-le entendre clairement lors de votre enregistrement vocal à l’Étape 3.'
    ],
    examples: [
      {
        label: 'Pourquoi l’audio complète l’écrit',
        detail:
          'L’orthographe courante ne note pas toujours tous les tons sur chaque voyelle : c’est votre enregistrement vocal (Étape 3) rattaché à votre Tribu qui transmet à l’IA la hauteur tonale exacte.'
      }
    ],
    category: 'orthographe_tons',
    tags: [
      'ton',
      'tonalité',
      'phonétique',
      'api',
      'mélodie',
      'prononciation',
      'hauteur',
      'accentuation',
      'syllabe'
    ]
  },
  {
    id: 'faq-etape-2-signification-francaise',
    question:
      'Étape 2 : Que faire si la traduction française proposée est inexacte, trop littérale ou incomplète ?',
    shortSummary:
      'Avant même d’enregistrer votre voix, vous pouvez corriger le sens français, proposer une meilleure tournure ou ajouter un sens secondaire / métaphorique.',
    answerParagraphs: [
      'Il arrive qu’une traduction française dans le corpus soit approximative, trop calquée mot à mot, ou qu’elle oublie le sens profond d’une expression idiomatique Myènè.',
      'Dans l’Étape 2 (« Signification française du texte Myènè »), vous disposez de 4 choix précis :',
      '1. « Sens français exact » : la traduction française correspond parfaitement au texte Myènè.',
      '2. « Signification plus exacte » : la traduction affichée est erronée ou imprécise ; vous indiquez la vraie signification.',
      '3. « Autre tournure française » : le sens est juste, mais vous proposez une formulation française plus naturelle ou élégante.',
      '4. « Sens secondaire / littéral / figuré » : très utile pour les proverbes et images poétiques où le Myènè possède à la fois un sens littéral (mot à mot) et un sens figuré ou coutumier.'
    ],
    examples: [
      {
        label: 'Exemple de double sens (littéral vs figuré)',
        detail:
          'Une expression sur la pirogue ou le fleuve peut signifier littéralement « La pirogue glisse sur l’eau calme » tout en ayant le sens secondaire coutumier de « Le voyage ou la palabre se déroule dans la paix ».'
      }
    ],
    category: 'sens_francais',
    tags: [
      'français',
      'signification',
      'traduction',
      'sens',
      'tournure',
      'secondaire',
      'littéral',
      'figuré',
      'proverbe',
      'étape 2',
      'exact'
    ]
  },
  {
    id: 'faq-etape-3-enregistrement-vocal',
    question:
      'Étape 3 : Quelles sont les règles d’or pour réussir son enregistrement vocal en Myènè ?',
    shortSummary:
      'Parlez dans un endroit calme, à allure naturelle, en prononçant le texte selon l’usage authentique de votre Tribu.',
    answerParagraphs: [
      'Les enregistrements audio servent à entraîner les modèles de reconnaissance et de synthèse vocale (TTS) pour sauvegarder le patrimoine immatériel Omyènè.',
      'Placez-vous dans un lieu calme (sans télévision, musique, vent fort dans le microphone ni conversations en arrière-plan).',
      'Appuyez sur « Démarrer l’enregistrement », marquez une courte pause d’une demi-seconde, lisez la phrase en Myènè d’une voix claire, posée et naturelle (sans crier ni hâter le débit), puis appuyez sur « Arrêter ».',
      'Réécoutez systématiquement votre extrait grâce au lecteur intégré avant d’envoyer : si un mot est coupé au début ou à la fin, cliquez sur « Réenregistrer ».'
    ],
    examples: [
      {
        label: 'Quelle version lire au micro ?',
        detail:
          'Si vous avez proposé une variante orthographique de votre Tribu à l’Étape 1, prononcez exactement cette variante tribale lors de votre enregistrement vocal.'
      }
    ],
    category: 'audio_voix',
    tags: [
      'audio',
      'voix',
      'micro',
      'microphone',
      'enregistrement',
      'étape 3',
      'prononciation',
      'bruit',
      'silence',
      'qualité'
    ]
  },
  {
    id: 'faq-filtrage-questions-par-tribu',
    question:
      'Comment filtrer les questions pour ne voir que celles de ma Tribu ou d’une Tribu précise ?',
    shortSummary:
      'Utilisez le sélecteur de Tribu en haut de la page principale ou dans l’onglet Explorer pour filtrer par Mpongwè, Adyumba, Enenga, Nkomi, Galoa ou Ôrungu.',
    answerParagraphs: [
      'Sur la page principale (« Contribuer ») ainsi que dans l’onglet « Explorer », une barre de filtre par Tribu vous permet de sélectionner soit « Toutes les tribus », soit directement « Ma tribu », soit l’une des 6 tribus Myènè.',
      'Vous pouvez néanmoins contribuer sur une fiche initialement rédigée dans une autre tribu Myènè : il vous suffit d’indiquer à l’Étape 1 comment cette expression se dit ou s’écrit dans votre propre Tribu ! Cela permet justement de construire le dictionnaire comparatif inter-tribal.'
    ],
    category: 'tribus_vs_clans',
    tags: [
      'filtre',
      'filtrer',
      'tribu',
      'explorer',
      'question',
      'mpongwè',
      'adyumba',
      'enenga',
      'nkomi',
      'galoa',
      'ôrungu'
    ]
  },
  {
    id: 'faq-validation-aines-et-xp',
    question:
      'Comment fonctionnent la validation par les Aînés et l’attribution des points XP ?',
    shortSummary:
      'Chaque contribution rapporte des points XP immédiats (+15 XP écrit, +20 XP audio, +5 XP nuance française) et passe ensuite devant le collège des Validateurs.',
    answerParagraphs: [
      'Dès que vous soumettez une contribution, vous recevez des points d’expérience (XP) qui font progresser votre rang coutumier dans le Classement (Initié Curieux → Conteur des Lagunes → Gardien du Verbe → Maître de la Parole → Sage Ancien).',
      'Les Validateurs et Aînés examinent séparément la justesse de l’écrit (orthographe de la tribu déclarée), la pertinence de la nuance française et la clarté de l’enregistrement oral.',
      'Une prononciation orale authentique peut être validée même si l’orthographe comporte une petite hésitation, et inversement.'
    ],
    category: 'validation_xp',
    tags: [
      'xp',
      'points',
      'récompense',
      'badge',
      'classement',
      'niveau',
      'validateur',
      'aîné',
      'approbation'
    ]
  },
  {
    id: 'faq-mode-hors-ligne-synchronisation',
    question:
      'Puis-je contribuer au village ou en déplacement sans connexion Internet (Mode Hors-Ligne) ?',
    shortSummary:
      'Oui ! Vos réponses écrites et vos enregistrements vocaux sont sauvegardés dans la mémoire locale de votre appareil et envoyés automatiquement dès le retour du réseau.',
    answerParagraphs: [
      'L’application OMPAGANO est conçue pour fonctionner même dans les zones à faible couverture réseau (villages riverains, lacs, déplacements).',
      'Vous pouvez télécharger un « Pack Hors-Ligne » depuis la barre supérieure avant votre départ, ou simplement continuer à répondre et enregistrer votre voix lorsque la connexion se coupe.',
      'Dès que votre téléphone ou ordinateur retrouve une connexion Internet, un bandeau synchronise automatiquement toutes vos contributions en attente vers le serveur sécurisé sans aucune perte.'
    ],
    category: 'hors_ligne',
    tags: [
      'hors-ligne',
      'offline',
      'internet',
      'réseau',
      'avion',
      'synchronisation',
      'village',
      'pack'
    ]
  }
];

interface ContributionFaqSectionProps {
  userTribe?: string;
  onSelectTribeFilter?: (tribe: string) => void;
  selectedTribeFilter?: string;
}

export const ContributionFaqSection: React.FC<ContributionFaqSectionProps> = ({
  userTribe,
  onSelectTribeFilter,
  selectedTribeFilter
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | FaqEntry['category']>('all');
  const [openFaqIds, setOpenFaqIds] = useState<string[]>([
    'faq-tribus-vs-clans-regle-fondamentale'
  ]);

  const toggleFaq = (id: string) => {
    setOpenFaqIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MYENE_CONTRIBUTION_FAQS.filter(entry => {
      if (selectedCategory !== 'all' && entry.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;

      const inQuestion = entry.question.toLowerCase().includes(q);
      const inSummary = entry.shortSummary.toLowerCase().includes(q);
      const inAnswers = entry.answerParagraphs.some(p => p.toLowerCase().includes(q));
      const inExamples =
        entry.examples?.some(
          ex =>
            ex.label.toLowerCase().includes(q) || ex.detail.toLowerCase().includes(q)
        ) || false;
      const inTags = entry.tags.some(t => t.toLowerCase().includes(q));

      return inQuestion || inSummary || inAnswers || inExamples || inTags;
    });
  }, [searchQuery, selectedCategory]);

  const expandAllFiltered = () => {
    setOpenFaqIds(filteredFaqs.map(f => f.id));
  };

  const collapseAll = () => {
    setOpenFaqIds([]);
  };

  return (
    <section
      id="faq-contribution-myene"
      className="mt-8 bg-[#18120e]/95 border border-[#3d2b20] rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden"
    >
      {/* Subtle decorative glow */}
      <div className="absolute -top-24 -right-24 w-56 h-56 bg-[#e67e22]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#2e2018]">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#e67e22] to-[#b84a28] flex items-center justify-center text-white shadow-lg shrink-0 mt-0.5">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#e67e22]/20 border border-[#e67e22]/40 text-[#f39c12]">
                Foire Aux Questions (FAQ)
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-700/40 text-emerald-300">
                Règles officielles de contribution Myènè
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#fdfaf7]">
              Guide & Règles de Contribution en Langue Omyènè
            </h2>
            <p className="text-xs sm:text-sm text-[#c2a896] mt-0.5">
              Consultez les règles linguistiques (Tribus vs Clans, orthographe, sens français et voix) ou recherchez un mot-clé en temps réel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            type="button"
            onClick={expandAllFiltered}
            className="px-3 py-1.5 rounded-xl bg-[#241a14] hover:bg-[#2f221a] border border-[#3d2b20] text-xs font-semibold text-[#e2cbb8] transition"
          >
            Tout déplier
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-xl bg-[#241a14] hover:bg-[#2f221a] border border-[#3d2b20] text-xs font-semibold text-[#c2a896] transition"
          >
            Tout replier
          </button>
        </div>
      </div>

      {/* Linguistic Golden Rule Highlight Banner (Tribes vs Clans) */}
      <div className="mt-4 bg-gradient-to-r from-[#2c1d12] via-[#251810] to-[#1f1610] border border-[#e67e22]/40 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#e67e22]/20 border border-[#e67e22]/50 flex items-center justify-center text-[#f39c12] shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-[#fde047] uppercase tracking-wide mb-0.5">
              Rappel Linguistique Essentiel : Tribus vs Clans
            </p>
            <p className="text-[#f5efe6]">
              Les différences <strong>orthographiques, phonétiques et tonales</strong> en Myènè concernent uniquement les{' '}
              <strong className="text-[#f39c12]">6 Tribus</strong> (<em>Mpongwè, Adyumba, Enenga, Nkomi, Galoa, Ôrungu</em>) et{' '}
              <strong className="underline decoration-amber-400">jamais les Clans</strong>. Les questions sont donc exclusivement filtrées par <strong>Tribu</strong> et par <strong>Thème</strong>.
            </p>
          </div>
        </div>

        {onSelectTribeFilter && userTribe && (
          <button
            type="button"
            onClick={() =>
              onSelectTribeFilter(selectedTribeFilter === userTribe ? 'all' : userTribe)
            }
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 border ${
              selectedTribeFilter === userTribe
                ? 'bg-[#e67e22] text-white border-[#f39c12] shadow-md'
                : 'bg-[#1a120d] hover:bg-[#2b1e16] text-[#f39c12] border-[#e67e22]/40'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>
              {selectedTribeFilter === userTribe
                ? `Filtre actif : Tribu ${userTribe}`
                : `Filtrer par ma tribu (${userTribe})`}
            </span>
          </button>
        )}
      </div>

      {/* Real-Time Search Input + Category Filter Bar */}
      <div className="mt-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#a88d7a] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              // Automatically expand matching FAQs when user types a search query
              if (e.target.value.trim().length >= 2) {
                const q = e.target.value.trim().toLowerCase();
                const matchingIds = MYENE_CONTRIBUTION_FAQS.filter(
                  entry =>
                    entry.question.toLowerCase().includes(q) ||
                    entry.shortSummary.toLowerCase().includes(q) ||
                    entry.answerParagraphs.some(p => p.toLowerCase().includes(q)) ||
                    entry.tags.some(t => t.toLowerCase().includes(q))
                ).map(entry => entry.id);
                setOpenFaqIds(matchingIds);
              }
            }}
            placeholder="Rechercher en temps réel dans la FAQ (ex: tribu, clan, ton, orthographe, sens français, micro, hors-ligne...)"
            className="w-full pl-10 pr-24 py-3 rounded-2xl bg-[#120d0a] border border-[#3a281e] focus:border-[#e67e22] focus:outline-none text-sm text-[#fdfaf7] placeholder-[#8c7362] transition"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#2a1d15] hover:bg-[#3a281e] text-xs text-[#e2cbb8] flex items-center gap-1 transition"
            >
              <X className="w-3 h-3" />
              <span>Effacer</span>
            </button>
          ) : (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#8c7362] hidden sm:inline">
              {filteredFaqs.length} question{filteredFaqs.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Category Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {FAQ_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-[#e67e22] text-white border-[#f39c12] shadow-sm'
                    : 'bg-[#211712] hover:bg-[#2c1f18] text-[#c2a896] border-[#36261d]'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search result status */}
      {searchQuery.trim() && (
        <div className="mt-3 flex items-center justify-between text-xs text-[#c2a896] px-1">
          <span>
            Résultat{filteredFaqs.length > 1 ? 's' : ''} pour{' '}
            <strong className="text-[#f39c12]">« {searchQuery.trim()} »</strong> :{' '}
            <strong>{filteredFaqs.length}</strong> question{filteredFaqs.length > 1 ? 's' : ''} trouvée
            {filteredFaqs.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* FAQ Accordion List */}
      <div className="mt-4 space-y-2.5">
        {filteredFaqs.length === 0 ? (
          <div className="bg-[#120d0a] border border-[#2e2018] rounded-2xl p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-bold text-[#f5efe6] mb-1">
              Aucune question ne correspond à « {searchQuery} »
            </p>
            <p className="text-xs text-[#a88d7a] mb-3">
              Essayez un autre terme comme « tribu », « orthographe », « ton », « français », « audio » ou « hors-ligne ».
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-1.5 rounded-xl bg-[#e67e22] hover:bg-[#d35400] text-white text-xs font-bold transition"
            >
              Afficher toutes les règles
            </button>
          </div>
        ) : (
          filteredFaqs.map(faq => {
            const isOpen = openFaqIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-colors overflow-hidden ${
                  faq.isImportantRule
                    ? isOpen
                      ? 'bg-[#221710] border-[#e67e22]/60 shadow-lg'
                      : 'bg-[#1c140e] border-[#e67e22]/35 hover:border-[#e67e22]/60'
                    : isOpen
                    ? 'bg-[#1f1611] border-[#4a3525]'
                    : 'bg-[#140e0b] border-[#2c1f17] hover:border-[#3e2c21]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                        faq.isImportantRule
                          ? 'bg-[#e67e22] text-white'
                          : 'bg-[#2a1e17] text-[#f39c12] border border-[#3d2b20]'
                      }`}
                    >
                      ?
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        {faq.isImportantRule && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Règle Fondamentale Tribus vs Clans
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-[#fdfaf7] leading-snug">
                        {faq.question}
                      </h3>
                      {!isOpen && (
                        <p className="text-xs text-[#b59c8a] mt-1 line-clamp-2">
                          {faq.shortSummary}
                        </p>
                      )}
                    </div>
                  </div>

                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-7 h-7 rounded-lg bg-[#261b14] border border-[#3a291f] flex items-center justify-center text-[#c2a896] shrink-0 mt-0.5"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-[#2d2018]/80 space-y-3 text-xs sm:text-sm text-[#e6d5c7] leading-relaxed">
                        <div className="p-3 rounded-xl bg-[#140e0a]/90 border border-[#33241b] text-[#f39c12] font-medium text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-emerald-400" />
                          {faq.shortSummary}
                        </div>

                        <div className="space-y-2">
                          {faq.answerParagraphs.map((paragraph, idx) => (
                            <p key={idx} className="text-[#e6d5c7]">
                              {paragraph}
                            </p>
                          ))}
                        </div>

                        {faq.examples && faq.examples.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            {faq.examples.map((ex, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-[#16100c] border border-[#2f2118]"
                              >
                                <p className="text-xs font-bold text-[#fde047] mb-1 flex items-center gap-1.5">
                                  <Volume2 className="w-3.5 h-3.5 text-[#e67e22]" />
                                  <span>{ex.label}</span>
                                </p>
                                <p className="text-xs text-[#c2a896] leading-relaxed">
                                  {ex.detail}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {faq.tags.map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setSearchQuery(tag)}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-[#241a14] hover:bg-[#31231b] text-[#a88d7a] hover:text-[#f39c12] border border-[#33241b] transition"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
