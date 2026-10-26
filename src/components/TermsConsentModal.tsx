import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Check,
  AlertCircle,
  Scale,
  Coins,
  Sparkles,
  X,
  UserCheck,
  Mic,
  Image as ImageIcon,
  Award,
  BookOpen
} from 'lucide-react';
import { UserProfile } from '../types';

export const CURRENT_TERMS_VERSION = '2.0-contributeur-individuel-2026';

export interface TermsConsentPayload {
  termsAccepted: boolean;
  dataUsageAccepted: boolean;
  consentVoiceUsage: boolean;
  consentImageUsage: boolean;
  partnerAssociation?: string;
  electronicSignature: string;
  legalGuardianName?: string;
  termsAcceptedAt: string;
  termsVersion: string;
}

interface TermsConsentModalProps {
  isOpen: boolean;
  currentUser: UserProfile | null;
  isReminderForExistingUser?: boolean;
  onAcceptConsent: (consentData: TermsConsentPayload) => Promise<void>;
  onClose?: () => void;
}

export const TermsConsentModal: React.FC<TermsConsentModalProps> = ({
  isOpen,
  currentUser,
  isReminderForExistingUser = false,
  onAcceptConsent,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'consentement' | 'conditions' | 'revenus_uc'>('consentement');

  const [termsAccepted, setTermsAccepted] = useState<boolean>(currentUser?.termsAccepted ?? false);
  const [dataUsageAccepted, setDataUsageAccepted] = useState<boolean>(currentUser?.dataUsageAccepted ?? false);
  const [consentVoiceUsage, setConsentVoiceUsage] = useState<boolean>(currentUser?.consentVoiceUsage ?? true);
  const [consentImageUsage, setConsentImageUsage] = useState<boolean>(currentUser?.consentImageUsage ?? false);

  const [legalGuardianName, setLegalGuardianName] = useState<string>(currentUser?.legalGuardianName || '');
  const [electronicSignature, setElectronicSignature] = useState<string>(
    currentUser?.electronicSignature ||
      `Lu et approuvé - ${currentUser?.fullName || currentUser?.displayName || 'Contributeur'}`
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser) {
      setTermsAccepted(currentUser.termsAccepted ?? false);
      setDataUsageAccepted(currentUser.dataUsageAccepted ?? false);
      setConsentVoiceUsage(currentUser.consentVoiceUsage ?? true);
      setConsentImageUsage(currentUser.consentImageUsage ?? false);
      if (currentUser.legalGuardianName) {
        setLegalGuardianName(currentUser.legalGuardianName);
      }
      setElectronicSignature(
        currentUser.electronicSignature ||
          `Lu et approuvé - ${currentUser.fullName || currentUser.displayName || 'Contributeur'}`
      );
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const userName = currentUser?.fullName || currentUser?.displayName || 'Contributeur OMPAGANO';
  const userBirthDate = currentUser?.birthDate || 'Date enregistrée au profil';
  const userBirthPlace = currentUser?.birthPlace || 'Gabon';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!termsAccepted) {
      setErrorMessage(
        "Vous devez accepter les Conditions Générales de Contribution Individuelle de la plateforme OMPAGANO / NKALA."
      );
      return;
    }

    if (!dataUsageAccepted) {
      setErrorMessage(
        "Vous devez valider l'autorisation d'utilisation de vos données pour pouvoir contribuer sur la plateforme."
      );
      return;
    }

    if (!electronicSignature.trim()) {
      setErrorMessage(
        'Veuillez renseigner votre mention de validation électronique (« Lu et approuvé » suivi de votre nom).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onAcceptConsent({
        termsAccepted: true,
        dataUsageAccepted: true,
        consentVoiceUsage,
        consentImageUsage,
        partnerAssociation: 'Contributeur Individuel',
        electronicSignature: electronicSignature.trim(),
        legalGuardianName: legalGuardianName.trim() || undefined,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: CURRENT_TERMS_VERSION
      });
    } catch (err: any) {
      setErrorMessage(
        "Erreur lors de l'enregistrement de votre consentement : " + (err?.message || 'Veuillez réessayer.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl my-auto warm-card-gradient border-2 border-[#f59e0b]/60 rounded-3xl p-4 sm:p-7 shadow-2xl space-y-5 text-white max-h-[94vh] overflow-y-auto">
        {/* Close button if allowed */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-[#27150c] hover:bg-[#3b1d10] text-[#fed7aa] border border-[#4a2412] transition"
            title="Fermer temporairement"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="space-y-3 border-b border-[#4a2412] pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#c85a32]/30 text-[#fde047] border border-[#f59e0b]/50">
              <Scale className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>
                {isReminderForExistingUser
                  ? 'Rappel Important • Contributeur Déjà Enregistré'
                  : 'Contrat de Contribution Individuelle • Essaka Engineering'}
              </span>
            </div>

            <span className="text-[11px] px-2.5 py-1 rounded-xl bg-[#27150c] text-[#fed7aa] border border-[#4a2412] font-semibold">
              Droit Gabonais • Loi n° 001/2011 (CNPDCP) & OAPI
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
            {isReminderForExistingUser
              ? `Rappel : Validation des Conditions & Utilisation de vos Données (${userName})`
              : 'Conditions de la Plateforme & Consentement du Contributeur Individuel'}
          </h2>

          <p className="text-xs sm:text-sm text-[#fed7aa] leading-relaxed">
            {isReminderForExistingUser ? (
              <>
                Votre profil <strong className="text-white">{userName}</strong> est déjà enregistré sur{' '}
                <strong className="text-[#f59e0b]">OMPAGANO / NKALA</strong>. Avant de poursuivre vos contributions vocales et
                linguistiques, veuillez prendre connaissance et valider électroniquement les{' '}
                <strong>Conditions Générales de Contribution Individuelle</strong> ainsi que l'autorisation d'utilisation de vos
                données auprès d'<strong>Essaka Engineering</strong>.
              </>
            ) : (
              <>
                Charte de contribution individuelle et de partage des revenus du programme{' '}
                <strong className="text-[#f59e0b]">OMPAGANO – Application NKALA</strong>, établie selon le droit gabonais
                (Loi n° 001/2011 & CNPDCP, Accord de Bangui OAPI Annexe VII) entre{' '}
                <strong className="text-white">ESSAKA ENGINEERING</strong> et chaque contributeur individuel.
              </>
            )}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#180d07] p-1.5 rounded-2xl border border-[#4a2412]">
          <button
            type="button"
            onClick={() => setActiveTab('consentement')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'consentement'
                ? 'terracotta-gradient text-white shadow-md ring-1 ring-[#f59e0b]/50'
                : 'text-[#a8826d] hover:text-[#fed7aa] hover:bg-[#24130a]'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>1. Mon Consentement Individuel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('conditions')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'conditions'
                ? 'terracotta-gradient text-white shadow-md ring-1 ring-[#f59e0b]/50'
                : 'text-[#a8826d] hover:text-[#fed7aa] hover:bg-[#24130a]'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>2. Conditions Générales (Art. 1–12)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('revenus_uc')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'revenus_uc'
                ? 'terracotta-gradient text-white shadow-md ring-1 ring-[#f59e0b]/50'
                : 'text-[#a8826d] hover:text-[#fed7aa] hover:bg-[#24130a]'
            }`}
          >
            <Coins className="w-4 h-4 shrink-0" />
            <span>3. Revenus IA & Unités (UC)</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-[#7f1d1d]/70 border border-[#ef4444] rounded-2xl text-xs text-[#fecaca] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* =============================================================== */}
        {/* TAB 1 : FORMULAIRE DE CONSENTEMENT DU CONTRIBUTEUR INDIVIDUEL   */}
        {/* =============================================================== */}
        {activeTab === 'consentement' && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
            {/* Déclaration d'identité pré-remplie */}
            <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-3">
              <div className="flex items-center justify-between border-b border-[#3b1d10] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#f59e0b] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Formulaire de Consentement du Contributeur Individuel</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  Validation Requise
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#f5efe6] leading-relaxed bg-[#24130a] p-3 rounded-xl border border-[#522915]">
                Je soussigné(e) <strong className="text-[#fde047]">{userName}</strong>, né(e) le{' '}
                <strong className="text-white">{userBirthDate}</strong> à{' '}
                <strong className="text-white">{userBirthPlace}</strong>, agissant à titre de{' '}
                <strong className="text-[#f59e0b]">Contributeur Individuel</strong> sur la plateforme{' '}
                <strong className="text-[#f59e0b]">OMPAGANO</strong>, déclare avoir été informé(e) et accepter les points suivants :
              </p>

              {/* Les 5 engagements clés du contributeur individuel */}
              <div className="space-y-2 pt-1">
                <div className="p-2.5 rounded-xl bg-[#24130a]/90 border border-[#3b1d10] flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#c85a32] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="text-xs text-[#fed7aa] leading-relaxed">
                    J'accepte que mes <strong className="text-white">textes, traductions, annotations culturelles, images et enregistrements vocaux</strong> soient
                    collectés et utilisés par <strong className="text-white">Essaka Engineering</strong> (RCCM RG/POG 2022 A 1290, Port-Gentil, Gabon) dans le
                    cadre du programme participatif <strong className="text-[#f59e0b]">OMPAGANO</strong> et des projets associés.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-[#24130a]/90 border border-[#3b1d10] flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#c85a32] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="text-xs text-[#fed7aa] leading-relaxed">
                    Ces données servent à <strong className="text-white">entraîner, évaluer et améliorer des modèles d'intelligence artificielle</strong> valorisant
                    les langues et cultures gabonaises, exploités notamment dans l'application <strong className="text-[#f59e0b]">NKALA</strong>.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-[#24130a]/90 border border-[#3b1d10] flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#c85a32] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="text-xs text-[#fed7aa] leading-relaxed">
                    Ma participation individuelle donne droit à un <strong className="text-white">partage des revenus (Revenus Nets IA)</strong>, calculé au prorata
                    de mes <strong className="text-white">Unités de Contribution (UC)</strong> validées et versé en FCFA (XAF) par Mobile Money (Airtel Money, Moov Money) ou virement bancaire.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-[#24130a]/90 border border-[#3b1d10] flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#c85a32] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <p className="text-xs text-[#fed7aa] leading-relaxed">
                    Conformément à la <strong className="text-white">loi gabonaise n° 001/2011 et aux prescriptions de la CNPDCP</strong>, je dispose à tout moment
                    d'un droit d'accès, de rectification, de suppression (sous 60 jours) et de retrait de mon consentement. Mes données brutes ne sont jamais revendues à des tiers.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-[#24130a]/90 border border-[#3b1d10] flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#c85a32] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    5
                  </span>
                  <p className="text-xs text-[#fed7aa] leading-relaxed">
                    Je participe librement et conserve mes droits d'auteur sur mes contributions conformément à l'<strong className="text-white">Accord de Bangui (OAPI Annexe VII)</strong>,
                    en accordant à Essaka Engineering une licence non exclusive. Je m'engage à fournir des contributions authentiques, sans fraude ni usurpation.
                  </p>
                </div>
              </div>

              {/* Champ optionnel pour un mineur */}
              <div className="pt-2">
                <label className="block text-[11px] text-[#fed7aa] font-semibold mb-1">
                  Pour un contributeur mineur (Nom & qualité du parent ou représentant légal – facultatif si majeur) :
                </label>
                <input
                  type="text"
                  value={legalGuardianName}
                  onChange={(e) => setLegalGuardianName(e.target.value)}
                  placeholder="Laisser vide si vous êtes majeur(e)"
                  className="w-full px-3 py-2 bg-[#24130a] border border-[#522915] rounded-xl text-white text-xs focus:outline-none focus:border-[#f59e0b]"
                />
              </div>
            </div>

            {/* Cases à cocher d'acceptation et d'autorisation */}
            <div className="p-4 bg-[#180d07] rounded-2xl border border-[#f59e0b]/40 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#fde047] flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#f59e0b]" />
                <span>Validation des Conditions & Autorisations Individuelles</span>
              </h3>

              {/* 1. Conditions générales de la plateforme */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-[#24130a] border border-[#522915] hover:border-[#f59e0b] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#f59e0b] rounded shrink-0"
                />
                <span className="text-xs text-white leading-relaxed">
                  <strong className="text-[#fde047]">J'accepte les Conditions Générales de la plateforme OMPAGANO / NKALA</strong> applicables aux
                  contributeurs individuels (Droits, engagements de qualité, propriété intellectuelle et partage des revenus).{' '}
                  <span className="text-[#ef4444] font-bold">* (Obligatoire)</span>
                </span>
              </label>

              {/* 2. Validation de l'utilisation des données */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-[#24130a] border border-[#522915] hover:border-[#f59e0b] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={dataUsageAccepted}
                  onChange={(e) => setDataUsageAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#f59e0b] rounded shrink-0"
                />
                <span className="text-xs text-white leading-relaxed">
                  <strong className="text-[#fde047]">Je valide l'utilisation de mes données personnelles et linguistiques</strong> par Essaka
                  Engineering pour la sauvegarde patrimoniale, l'entraînement et l'exploitation des Modèles IA dans OMPAGANO et NKALA.{' '}
                  <span className="text-[#ef4444] font-bold">* (Obligatoire)</span>
                </span>
              </label>

              {/* 3. Autorisation spécifique Voix */}
              <label className="flex items-start gap-3 p-2.5 rounded-xl bg-[#24130a]/70 border border-[#3b1d10] hover:border-[#c85a32] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={consentVoiceUsage}
                  onChange={(e) => setConsentVoiceUsage(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#c85a32] rounded shrink-0"
                />
                <span className="text-xs text-[#fed7aa] leading-relaxed flex items-center gap-1.5 flex-wrap">
                  <Mic className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
                  <span>
                    <strong className="text-white">J'autorise l'usage de ma voix</strong> (enregistrements audio et prononciations en langue Myènè) aux seules fins d'entraînement IA, sans clonage trompeur ni atteinte à ma dignité.
                  </span>
                </span>
              </label>

              {/* 4. Autorisation spécifique Image (Facultatif) */}
              <label className="flex items-start gap-3 p-2.5 rounded-xl bg-[#24130a]/70 border border-[#3b1d10] hover:border-[#c85a32] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={consentImageUsage}
                  onChange={(e) => setConsentImageUsage(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#c85a32] rounded shrink-0"
                />
                <span className="text-xs text-[#fed7aa] leading-relaxed flex items-center gap-1.5 flex-wrap">
                  <ImageIcon className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                  <span>
                    <strong className="text-white">J'autorise l'usage de mon image ou des photos culturelles que je partage</strong> (facultatif).
                  </span>
                </span>
              </label>

              {/* Signature électronique précédée de la mention Lu et approuvé */}
              <div className="pt-2 border-t border-[#3b1d10] grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[11px] text-[#fed7aa] font-semibold mb-1">
                    Signature électronique (« Lu et approuvé » suivi de votre nom) <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={electronicSignature}
                    onChange={(e) => setElectronicSignature(e.target.value)}
                    placeholder={`Lu et approuvé - ${userName}`}
                    className="w-full px-3 py-2 bg-[#24130a] border border-[#f59e0b]/60 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#fde047]"
                  />
                </div>

                <div className="text-[11px] text-[#a8826d] bg-[#24130a] p-2.5 rounded-xl border border-[#3b1d10]">
                  <div>Validé électroniquement sur <strong>OMPAGANO / NKALA</strong></div>
                  <div>Date : <strong className="text-white">{new Date().toLocaleDateString('fr-FR')}</strong></div>
                  <div>Statut : <span className="text-[#fde047] font-semibold">Contributeur Individuel</span></div>
                </div>
              </div>
            </div>

            {/* Bouton de validation finale */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl terracotta-gradient hover:opacity-95 text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enregistrement de votre consentement...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-[#fde047]" />
                    <span>Signer & Valider mes Conditions et l'Utilisation de mes Données</span>
                    <Sparkles className="w-4 h-4 text-[#fde047]" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* =============================================================== */}
        {/* TAB 2 : CONDITIONS GÉNÉRALES DU CONTRIBUTEUR INDIVIDUEL         */}
        {/* =============================================================== */}
        {activeTab === 'conditions' && (
          <div className="space-y-4 text-xs leading-relaxed text-[#fed7aa]">
            <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-3 max-h-[55vh] overflow-y-auto pr-2">
              <div className="border-b border-[#3b1d10] pb-3">
                <div className="text-[11px] font-bold text-[#f59e0b] uppercase tracking-wider">
                  Contrat de Contribution Individuelle & Partage de Revenus • OMPAGANO / NKALA
                </div>
                <h3 className="text-base font-black text-white mt-0.5">
                  Entre Essaka Engineering et le Contributeur Individuel
                </h3>
                <p className="text-[11px] text-[#a8826d] mt-1">
                  <strong>ESSAKA ENGINEERING</strong>, siège social situé au Quartier SALSA, Port-Gentil (Gabon), immatriculée au RCCM sous le n°{' '}
                  <strong>RG/POG 2022 A 1290</strong>, NIF n° <strong>202302004939</strong>, représentée par{' '}
                  <strong>M. MIGOUMBI AKENDEGUE CAPP ANDY</strong> (Gérant / Fondateur), d'une part, et toute personne physique inscrite en qualité de{' '}
                  <strong>Contributeur Individuel</strong> sur la plateforme OMPAGANO, d'autre part.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs uppercase text-[#fde047]">Article 1 – Préambule & Définitions</h4>
                <p>
                  Essaka Engineering développe des modèles d'intelligence artificielle adaptés aux réalités gabonaises, notamment aux langues et cultures locales. Pour entraîner ces modèles, Essaka a conçu <strong>OMPAGANO</strong>, une plateforme participative collectant des textes, traductions, images et enregistrements vocaux auprès de contributeurs individuels. Essaka exploite par ailleurs l'application <strong>NKALA</strong>, dans laquelle les modèles entraînés sont utilisés à titre commercial et éducatif.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#d4af94]">
                  <li><strong>OMPAGANO :</strong> plateforme de crowdsourcing d'Essaka destinée à la collecte et à la validation de données linguistiques et culturelles.</li>
                  <li><strong>NKALA :</strong> application d'Essaka dans laquelle les Modèles IA sont exploités commercialement.</li>
                  <li><strong>Modèles IA :</strong> modèles d'apprentissage automatique d'Essaka, entraînés en tout ou partie grâce aux Données des Contributeurs.</li>
                  <li><strong>Contributeur :</strong> toute personne physique inscrite sur OMPAGANO fournissant ou validant des Données à titre individuel.</li>
                  <li><strong>Données :</strong> textes, traductions, enregistrements vocaux, images et métadonnées associées fournis par le Contributeur.</li>
                  <li><strong>Unité de Contribution (UC) :</strong> unité de mesure d'une Donnée validée servant au calcul du partage des revenus.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-white text-xs uppercase text-[#fde047]">Articles 2 & 3 – Engagements du Contributeur et d'Essaka</h4>
                <p>
                  <strong>Engagements du Contributeur :</strong> Le Contributeur s'engage à fournir des contributions sincères et de qualité (clarté des enregistrements vocaux, exactitude des textes et dialectes Myènè, respect des consignes) et garantit ne transmettre aucun contenu illicite, diffamatoire ou portant atteinte aux droits de tiers.
                </p>
                <p>
                  <strong>Engagements d'Essaka Engineering :</strong> Essaka s'engage à fournir un accès sécurisé à OMPAGANO, à utiliser les Données uniquement dans le cadre défini aux présentes conditions, à chiffrer et protéger les Données, à tenir un registre transparent des Unités de Contribution (UC) de chaque Contributeur et à verser la part de revenus lui revenant.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-white text-xs uppercase text-[#fde047]">Article 4 – Autorisation d'Utilisation des Données</h4>
                <p>
                  <strong>4.1 Étendue et caractère non exclusif :</strong> Le Contributeur autorise Essaka Engineering, à titre non exclusif et pour le monde entier, à reproduire, enregistrer, annoter, transformer, stocker et utiliser ses Données pour entraîner, évaluer, améliorer et exploiter les Modèles IA, y compris au sein de l'application NKALA.
                </p>
                <p>
                  <strong>4.2 Protection de la voix et de l'image :</strong> Le Contributeur autorise l'usage de sa voix (et facultativement de son image) aux seules fins d'entraînement IA décrites ci-dessus. Essaka s'interdit formellement d'utiliser la voix ou l'image du Contributeur pour créer des contenus trompeurs imitant une personne identifiable (deepfakes) ou portant atteinte à sa dignité ou à sa réputation.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-white text-xs uppercase text-[#fde047]">Article 5 – Protection des Données Personnelles (Loi n° 001/2011 & CNPDCP)</h4>
                <p>
                  Le traitement des données personnelles respecte la <strong>loi gabonaise n° 001/2011 du 25 septembre 2011</strong> relative à la protection des données à caractère personnel ainsi que les prescriptions de la <strong>Commission Nationale pour la Protection des Données à Caractère Personnel (CNPDCP)</strong>.
                </p>
                <p>
                  Chaque Contributeur dispose d'un droit d'accès, de rectification, d'opposition et de suppression de ses Données, ainsi que du droit de retirer son consentement à tout moment. En cas de retrait, Essaka cesse d'utiliser les Données pour de nouveaux entraînements et les supprime de ses bases dans un délai maximal de <strong>60 jours</strong>. <strong>Engagement de non-revente :</strong> Essaka ne vend ni ne cède jamais les Données brutes des Contributeurs à des tiers.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-white text-xs uppercase text-[#fde047]">Article 6 – Propriété Intellectuelle (Accord de Bangui OAPI)</h4>
                <p>
                  Le Contributeur reste titulaire des droits d'auteur et droits voisins sur ses Données conformément à l'<strong>Accord de Bangui instituant l'Organisation Africaine de la Propriété Intellectuelle (OAPI) et à son Annexe VII</strong> sur la propriété littéraire et artistique. Essaka Engineering demeure seule propriétaire des Modèles IA, des applications OMPAGANO et NKALA, de leur code source et de leur documentation.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-white text-xs uppercase text-[#fde047]">Articles 7 & 8 – Partage des Revenus Nets IA & Paiement</h4>
                <p>
                  La participation du Contributeur donne droit à une part de l'Enveloppe de Partage issue des <strong>Revenus Nets IA</strong> générés par l'exploitation commerciale des Modèles IA dans NKALA (après déduction des taxes indirectes, frais de paiement et coûts d'hébergement directs).
                </p>
                <p>
                  La part revenant à chaque Contributeur Individuel est calculée proportionnellement au <strong>poids d'utilisation</strong> de ses Unités de Contribution (UC) validées. Les versements sont effectués en <strong>Francs CFA (XAF)</strong> par <strong>Mobile Money (Airtel Money, Moov Money)</strong> ou par virement bancaire, accompagnés d'un relevé détaillant les UC validées et le montant correspondant.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-white text-xs uppercase text-[#fde047]">Articles 9 à 12 – Éthique, Anti-Fraude et Droit Applicable</h4>
                <p>
                  <strong>Éthique et Anti-Fraude :</strong> Toute contribution frauduleuse (données falsifiées, enregistrements générés artificiellement et présentés comme humains, ou créations de comptes multiples sous fausse identité) entraîne l'annulation des UC correspondantes et la suspension du compte après notification.
                </p>
                <p>
                  <strong>Droit applicable :</strong> Les présentes conditions sont régies par le <strong>droit gabonais</strong>. En cas de différend, une solution amiable est recherchée en priorité dans un délai de 30 jours avant toute saisine des juridictions compétentes de Port-Gentil (Gabon).
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('consentement')}
                className="px-5 py-2.5 rounded-xl terracotta-gradient text-white font-bold text-xs shadow-lg"
              >
                Retourner au Formulaire de Consentement pour Valider →
              </button>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* TAB 3 : UNITÉS DE CONTRIBUTION (UC) & CLÉ DE RÉPARTITION        */}
        {/* =============================================================== */}
        {activeTab === 'revenus_uc' && (
          <div className="space-y-4 text-xs text-[#fed7aa]">
            <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-4">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2 text-[#fde047]">
                  <Award className="w-4 h-4 text-[#f59e0b]" />
                  <span>Barème des Unités de Contribution Individuelle (UC)</span>
                </h4>
                <p className="text-[11px] text-[#a8826d] mt-1">
                  Une contribution est comptabilisée en Unités de Contribution (UC) dès sa validation selon les critères de qualité d'OMPAGANO. Les dialectes ou variantes rares peuvent bénéficier d'un coefficient majorateur.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#3b1d10]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#27150c] text-[#fde047] border-b border-[#4a2412]">
                      <th className="p-2.5 font-bold">Type de Contribution Individuelle</th>
                      <th className="p-2.5 font-bold">Unité de mesure</th>
                      <th className="p-2.5 font-bold">Condition de validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3b1d10] bg-[#1c0f08]">
                    <tr>
                      <td className="p-2.5 font-semibold text-white">🎙️ Enregistrement vocal validé</td>
                      <td className="p-2.5 text-[#fed7aa]">Par minute / segment audio</td>
                      <td className="p-2.5 text-emerald-400">Prononciation claire & validée</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-white">✍️ Texte validé (phrase, traduction, variante)</td>
                      <td className="p-2.5 text-[#fed7aa]">Par phrase ou expression</td>
                      <td className="p-2.5 text-emerald-400">Orthographe & sens certifiés</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-white">🖼️ Image annotée et validée</td>
                      <td className="p-2.5 text-[#fed7aa]">Par image</td>
                      <td className="p-2.5 text-emerald-400">Annotation culturelle conforme</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold text-white">🔍 Validation / vérification linguistique</td>
                      <td className="p-2.5 text-[#fed7aa]">Par tâche de revue</td>
                      <td className="p-2.5 text-emerald-400">Revue par Validateur Certifié</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-2 border-t border-[#3b1d10] space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2 text-[#fde047]">
                  <Coins className="w-4 h-4 text-[#f59e0b]" />
                  <span>Méthode de Mesure de l'Utilisation et Clé de Répartition Individuelle</span>
                </h4>
                <ul className="list-disc pl-5 space-y-1.5 text-[#d4af94]">
                  <li>
                    <strong className="text-white">Indicateur d'utilisation :</strong> Nombre de requêtes, minutes de traitement ou abonnements actifs aux fonctionnalités IA de l'application <strong>NKALA</strong>.
                  </li>
                  <li>
                    <strong className="text-white">Rattachement aux Données :</strong> Par langue/dialecte et par type de modèle utilisé, selon la proportion d'UC validées de chaque Contributeur Individuel dans le jeu d'entraînement du modèle concerné.
                  </li>
                  <li>
                    <strong className="text-white">Formule de calcul :</strong>{' '}
                    <code className="px-2 py-0.5 rounded bg-[#27150c] text-[#fde047] font-mono">
                      Poids du Contributeur = Σ (utilisation du modèle m × part des UC du Contributeur dans m) ÷ Σ (utilisation de tous les modèles)
                    </code>
                  </li>
                  <li>
                    <strong className="text-white">Versement direct :</strong> Paiement direct au Contributeur Individuel par Mobile Money (<strong>Airtel Money, Moov Money</strong>) ou virement bancaire en Francs CFA (XAF), avec relevé individuel transparent.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('consentement')}
                className="px-5 py-2.5 rounded-xl terracotta-gradient text-white font-bold text-xs shadow-lg"
              >
                Aller au Formulaire de Consentement pour Signer →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
