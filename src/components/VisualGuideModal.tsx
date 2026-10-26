import React, { useState } from 'react';
import {
  Compass,
  Sparkles,
  BookOpen,
  Mic,
  Edit3,
  MessageSquareQuote,
  Shield,
  Award,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Globe2,
  WifiOff,
  Target,
  Layers,
  Volume2,
  Users
} from 'lucide-react';
import { UserProfile } from '../types';

interface VisualGuideModalProps {
  isOpen: boolean;
  currentUser: UserProfile | null;
  isPostOnboarding?: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'crowdsource' | 'explore' | 'leaderboard' | 'profile') => void;
}

export const VISUAL_GUIDE_SEEN_KEY = 'ompagano_visual_guide_seen_v1';

export const VisualGuideModal: React.FC<VisualGuideModalProps> = ({
  isOpen,
  currentUser,
  isPostOnboarding = false,
  onClose,
  onNavigateTab
}) => {
  const [activeSlide, setActiveSlide] = useState<number>(0);

  if (!isOpen) return null;

  const totalSlides = 4;

  const handleFinish = (targetTab?: 'crowdsource' | 'explore' | 'leaderboard' | 'profile') => {
    try {
      localStorage.setItem(VISUAL_GUIDE_SEEN_KEY, 'true');
    } catch {}
    if (targetTab && onNavigateTab) {
      onNavigateTab(targetTab);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl my-auto warm-card-gradient border-2 border-[#f59e0b]/50 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-white max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => handleFinish()}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#180d07] hover:bg-[#341b10] text-[#fed7aa] border border-[#4a2412] transition"
          aria-label="Fermer le guide visuel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#4a2412] pb-4 pr-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-[#c85a32] via-[#f59e0b] to-[#0d9488] shadow-lg shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] overflow-hidden flex items-center justify-center p-0.5">
                <img
                  src="/assets/aistudio/LOGO-symbole_1c65e221.png"
                  alt="Logo OMPAGANO"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/40 text-[#fde047] text-[10px] font-black uppercase tracking-wider mb-1">
                <Compass className="w-3 h-3 text-[#f59e0b]" />
                <span>
                  {isPostOnboarding
                    ? 'Bienvenue à bord • Guide Visuel & Objectifs'
                    : 'Guide Visuel Interactif & Objectifs OMPAGANO'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {currentUser?.fullName
                  ? `Mbolo, ${currentUser.fullName.split(' ')[0]} ! Voici comment utiliser OMPAGANO`
                  : 'Objectifs & Guide Visuel de la Plateforme OMPAGANO'}
              </h2>
            </div>
          </div>

          {/* Step Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            {[
              { idx: 0, label: '1. Objectifs' },
              { idx: 1, label: '2. Contribuer (3 étapes)' },
              { idx: 2, label: '3. Clans & Hors-ligne' },
              { idx: 3, label: '4. Badges & Défis' }
            ].map((tab) => (
              <button
                key={tab.idx}
                type="button"
                onClick={() => setActiveSlide(tab.idx)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                  activeSlide === tab.idx
                    ? 'bg-[#f59e0b] text-[#180d07] shadow'
                    : 'bg-[#180d07] text-[#a8826d] border border-[#3b1d10] hover:text-[#fed7aa]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* SLIDE 0: LES OBJECTIFS DE L'APPLICATION */}
        {activeSlide === 0 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#27150c] via-[#1f1008] to-[#180d07] border border-[#f59e0b]/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#fde047]">
                <Target className="w-4 h-4 text-[#f59e0b]" />
                <span>La Mission d'OMPAGANO & de l'Application NKALA</span>
              </div>
              <p className="text-xs sm:text-sm text-[#fed7aa] leading-relaxed">
                Conçu par <strong className="text-white">Essaka Engineering</strong>, <strong className="text-[#f59e0b]">OMPAGANO</strong> est le programme participatif de référence dédié à la sauvegarde, la documentation et la transmission vivante de la langue <strong className="text-white">Omyènè</strong> au Gabon.
              </p>
            </div>

            {/* Visual Grid of 4 Core Objectives */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl bg-[#180d07] border border-[#4a2412] space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                    <Globe2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#f59e0b] block">Objectif 1</span>
                    <h3 className="text-sm font-bold text-white">Préserver les 6 Dialectes & Lignées Claniques</h3>
                  </div>
                </div>
                <p className="text-xs text-[#d4af94] leading-relaxed">
                  Documenter fidèlement les expressions et variantes des 6 tribus Myènè (<strong>Mpongwè, Enenga, Galoa, Nkomi, Adyumba, Ôrungu</strong>) ainsi que le vocabulaire propre à chaque clan paternel et maternel.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#180d07] border border-[#4a2412] space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                    <MessageSquareQuote className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Objectif 2</span>
                    <h3 className="text-sm font-bold text-white">Capter le Sens Exact, les Tournures & Nuances</h3>
                  </div>
                </div>
                <p className="text-xs text-[#d4af94] leading-relaxed">
                  Un mot Myènè possède souvent une richesse qui dépasse une traduction littérale. Vous pouvez rectifier la <strong>signification française</strong>, proposer une <strong>autre tournure</strong> ou indiquer un <strong>sens secondaire / figuré</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#180d07] border border-[#4a2412] space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 shrink-0">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-sky-400 block">Objectif 3</span>
                    <h3 className="text-sm font-bold text-white">Bâtir une IA Linguistique Gabonaise (NKALA)</h3>
                  </div>
                </div>
                <p className="text-xs text-[#d4af94] leading-relaxed">
                  Constituer un corpus vocal et écrit vérifié par les Aînés afin d'entraîner des modèles d'intelligence artificielle capables de comprendre, traduire et enseigner l'Omyènè aux générations futures.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#180d07] border border-[#4a2412] space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-400 block">Objectif 4</span>
                    <h3 className="text-sm font-bold text-white">Valoriser Chaque Contributeur par les Badges & XP</h3>
                  </div>
                </div>
                <p className="text-xs text-[#d4af94] leading-relaxed">
                  Récompenser l'engagement culturel de chaque locuteur grâce à un système de <strong>Points XP, Niveaux de Sagesse, Défis Hebdomadaires et Badges d'accomplissement</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 1: GUIDE VISUEL D'UNE CONTRIBUTION (LES 3 ÉTAPES AVANT & PENDANT LA VOIX) */}
        {activeSlide === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3.5 rounded-2xl bg-[#180d07] border border-[#4a2412] flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#f59e0b]">
                  Schéma Visuel de l'Onglet « Contribuer »
                </span>
                <h3 className="text-base font-bold text-white">
                  Comment enrichir une fiche en 3 étapes simples ?
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#c85a32]/30 border border-[#c85a32] text-[#fde047] text-xs font-bold shrink-0">
                +50 à +120 XP / fiche
              </span>
            </div>

            {/* Visual Step-by-Step Interactive Diagram */}
            <div className="space-y-3">
              {/* Visual Step 1 */}
              <div className="p-4 rounded-2xl bg-[#1f1008] border border-[#522915] flex flex-col sm:flex-row items-start gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#c85a32] text-white font-black text-sm flex items-center justify-center shrink-0 shadow">
                  1
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#fed7aa] flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-[#f59e0b]" />
                      <span>Étape 1 : Vérifier ou proposer l'orthographe en Myènè</span>
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#180d07] text-[#a8826d] border border-[#3b1d10]">
                      Graphie & Variante dialectale
                    </span>
                  </div>
                  <p className="text-xs text-[#d4af94] leading-relaxed">
                    Lisez la phrase affichée en Myènè. Cliquez sur <strong className="text-emerald-300">« Oui, c'est bien écrit 👍 »</strong> ou sur <strong className="text-amber-300">« Je propose ma version ✍️ »</strong> pour corriger l'orthographe selon votre tribu ou clan.
                  </p>
                </div>
              </div>

              {/* Visual Step 2 (NEW: French meaning / alternative phrasing / secondary meaning BEFORE speaking) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#27150c] to-[#1f1008] border-2 border-[#f59e0b]/60 flex flex-col sm:flex-row items-start gap-3.5 shadow-lg">
                <div className="w-9 h-9 rounded-full bg-[#f59e0b] text-[#180d07] font-black text-sm flex items-center justify-center shrink-0 shadow">
                  2
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#fde047] flex items-center gap-1.5">
                      <MessageSquareQuote className="w-4 h-4 text-[#f59e0b]" />
                      <span>Étape 2 (Avant de parler) : Préciser la signification en Français</span>
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f59e0b]/20 text-[#fde047] border border-[#f59e0b]/40 font-bold">
                      Nouveau • Sens & Tournures
                    </span>
                  </div>
                  <p className="text-xs text-[#fed7aa] leading-relaxed">
                    Souvent, la traduction française proposée n'est pas tout à fait exacte ou complète. <strong>Avant de prononcer le texte en Myènè</strong>, vous pouvez :
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-xl bg-[#180d07] border border-[#4a2412]">
                      <strong className="text-amber-300 block">🎯 Corriger le sens</strong>
                      Proposer une traduction française plus juste et fidèle.
                    </div>
                    <div className="p-2 rounded-xl bg-[#180d07] border border-[#4a2412]">
                      <strong className="text-sky-300 block">🔄 Autre tournure</strong>
                      Donner une reformulation française plus naturelle.
                    </div>
                    <div className="p-2 rounded-xl bg-[#180d07] border border-[#4a2412]">
                      <strong className="text-emerald-300 block">🌿 Sens secondaire</strong>
                      Ajouter un deuxième sens, un sens figuré ou proverbial.
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Step 3 */}
              <div className="p-4 rounded-2xl bg-[#1f1008] border border-[#522915] flex flex-col sm:flex-row items-start gap-3.5">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow">
                  3
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-emerald-400" />
                      <span>Étape 3 : Dire le texte en Myènè (Enregistrement Vocal)</span>
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 font-bold">
                      Voix Authentique
                    </span>
                  </div>
                  <p className="text-xs text-[#d4af94] leading-relaxed">
                    Appuyez sur le bouton microphone, prononcez la phrase en Myènè à voix claire et naturelle, réécoutez votre enregistrement si besoin, puis cliquez sur <strong className="text-white">« Valider & Transmettre la contribution »</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2: EXPLORER PAR CLAN & MODE HORS-LIGNE (AVION) */}
        {activeSlide === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Explorer par Clan & Thème */}
              <div className="p-4 rounded-2xl bg-[#180d07] border border-[#4a2412] space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#f59e0b]">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#f59e0b] block">Onglet « Explorer »</span>
                    <h3 className="text-base font-bold text-white">Filtrer le Vocabulaire par Clan</h3>
                  </div>
                </div>

                <p className="text-xs text-[#d4af94] leading-relaxed">
                  Dans l'onglet <strong>Explorer</strong>, utilisez le menu déroulant des clans ou les boutons d'accès rapide pour parcourir les expressions rattachées à :
                </p>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#24130a] border border-amber-500/30 flex items-center gap-2">
                    <span>🏛️</span>
                    <span>
                      <strong>Votre Clan Paternel</strong> {currentUser?.paternalClan ? `(${currentUser.paternalClan})` : ''}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#24130a] border border-emerald-500/30 flex items-center gap-2">
                    <span>🌺</span>
                    <span>
                      <strong>Votre Clan Maternel</strong> {currentUser?.maternalClan ? `(${currentUser.maternalClan})` : ''}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#24130a] border border-[#4a2412] flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-[#f59e0b] shrink-0" />
                    <span>Écoutez la prononciation ou cliquez sur <strong>« Enregistrer ma voix »</strong> sur n'importe quelle fiche.</span>
                  </div>
                </div>
              </div>

              {/* Mode Avion & Hors-Ligne */}
              <div className="p-4 rounded-2xl bg-[#180d07] border border-[#4a2412] space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <WifiOff className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Continuité Terrain</span>
                    <h3 className="text-base font-bold text-white">Utilisation 100% Hors-Ligne</h3>
                  </div>
                </div>

                <p className="text-xs text-[#d4af94] leading-relaxed">
                  Vous êtes au village, sur le fleuve ou en <strong>Mode Avion</strong> sans réseau internet ? L'application continue de fonctionner :
                </p>

                <div className="space-y-2 text-xs text-[#fed7aa]">
                  <div className="p-2.5 rounded-xl bg-[#24130a] border border-[#3b1d10]">
                    <strong className="text-emerald-300 block">1. Pack Hors-Ligne automatique</strong>
                    Les fiches, clans et villages restent accessibles même après fermeture de l'onglet.
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#24130a] border border-[#3b1d10]">
                    <strong className="text-amber-300 block">2. Sauvegarde locale des voix</strong>
                    Vos enregistrements vocaux et propositions de sens sont stockés dans la mémoire sécurisée de votre appareil.
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#24130a] border border-[#3b1d10]">
                    <strong className="text-sky-300 block">3. Synchronisation dès le retour du réseau</strong>
                    Dès que la connexion revient, tout est transmis automatiquement vers le Cloud.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: PROGRESSION, BADGES, DÉFIS & VALIDATION DES AÎNÉS */}
        {activeSlide === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-[#180d07] border border-[#4a2412] space-y-2">
                <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/20 border border-[#f59e0b]/40 flex items-center justify-center text-[#f59e0b]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Défis de la Semaine</h4>
                <p className="text-xs text-[#d4af94] leading-relaxed">
                  Chaque semaine, relevez un défi thématique (ex: <em>Pêche & Navigation</em>, <em>Proverbes</em>) en haut de l'écran de contribution pour débloquer un <strong>Badge exclusif</strong> et un bonus d'XP.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#180d07] border border-[#4a2412] space-y-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Validation des Aînés</h4>
                <p className="text-xs text-[#d4af94] leading-relaxed">
                  Les <strong>Validateurs et Aînés</strong> examinent séparément la justesse de l'écrit, la pertinence de la signification française proposée et l'authenticité de la prononciation orale.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#180d07] border border-[#4a2412] space-y-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Suivi Graphique & Profil</h4>
                <p className="text-xs text-[#d4af94] leading-relaxed">
                  Dans l'onglet <strong>Profil</strong>, visualisez la courbe de progression de vos contributions au fil du temps, votre filiation certifiée et vos badges gagnés.
                </p>
              </div>
            </div>

            {/* Quick Start Call to Action Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#27150c] via-[#341b10] to-[#27150c] border border-[#f59e0b]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-[#fde047]">
                  Vous êtes prêt(e) à contribuer !
                </div>
                <p className="text-xs text-[#fed7aa] mt-0.5">
                  Vous pouvez rouvrir ce guide visuel à tout moment depuis le bouton <strong>« Guide & Objectifs »</strong> en haut de l'application.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleFinish('explore')}
                  className="px-3.5 py-2 rounded-xl bg-[#180d07] hover:bg-[#24130a] text-[#fed7aa] border border-[#f59e0b]/40 text-xs font-bold transition"
                >
                  🏛️ Explorer mon Clan
                </button>
                <button
                  type="button"
                  onClick={() => handleFinish('crowdsource')}
                  className="px-4 py-2 rounded-xl terracotta-gradient text-white text-xs font-black shadow-lg transition active:scale-95"
                >
                  🎙️ Contribuer Maintenant
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-[#4a2412]">
          <button
            type="button"
            onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
            disabled={activeSlide === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#180d07] hover:bg-[#27150c] text-[#fed7aa] border border-[#4a2412] text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Étape précédente</span>
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map((dot) => (
              <button
                key={dot}
                type="button"
                onClick={() => setActiveSlide(dot)}
                aria-label={`Aller à l'étape ${dot + 1}`}
                className={`h-2.5 rounded-full transition-all ${
                  activeSlide === dot
                    ? 'w-7 bg-[#f59e0b]'
                    : 'w-2.5 bg-[#4a2412] hover:bg-[#a8826d]'
                }`}
              />
            ))}
          </div>

          {activeSlide < totalSlides - 1 ? (
            <button
              type="button"
              onClick={() => setActiveSlide((prev) => Math.min(totalSlides - 1, prev + 1))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl terracotta-gradient text-white text-xs font-bold shadow-md transition active:scale-95"
            >
              <span>Étape suivante</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleFinish('crowdsource')}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#fbbf24] text-[#180d07] text-xs font-black shadow-md transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>C'est compris, commencer !</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
