import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Check, 
  AlertCircle, 
  Globe2, 
  MapPin, 
  Users, 
  Calendar, 
  UserCheck,
  Lock,
  Compass,
  Scale,
  FileText,
  ShieldCheck,
  Mic,
  Image as ImageIcon
} from 'lucide-react';
import { UserProfile, TribeName, ClanRegistry, VillageRegistry } from '../types';
import { MYENE_TRIBES } from '../services/seedData';
import { CURRENT_TERMS_VERSION } from './TermsConsentModal';

interface OnboardingModalProps {
  isOpen: boolean;
  currentUser: UserProfile | null;
  clans: ClanRegistry[];
  villages: VillageRegistry[];
  onComplete: (profileData: Partial<UserProfile>) => Promise<void>;
  onAddNewClan: (name: string, tribe: string) => Promise<ClanRegistry>;
  onAddNewVillage: (name: string, clan: string, tribe: string, region?: string) => Promise<VillageRegistry>;
  onOpenFullContractModal?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  currentUser,
  clans,
  villages,
  onComplete,
  onAddNewClan,
  onAddNewVillage,
  onOpenFullContractModal
}) => {
  const [fullName, setFullName] = useState(currentUser?.fullName || currentUser?.displayName || '');
  const [contact, setContact] = useState(currentUser?.contact || currentUser?.phoneNumber || currentUser?.email || '');
  const [birthDate, setBirthDate] = useState(currentUser?.birthDate || '1995-05-15');
  const [birthPlace, setBirthPlace] = useState(currentUser?.birthPlace || 'Lambaréné');
  const [tribe, setTribe] = useState<TribeName>(currentUser?.tribe || 'Enenga');
  
  // Paternal clan & tribe
  const [paternalTribe, setPaternalTribe] = useState<TribeName>(currentUser?.tribe || 'Enenga');
  const [paternalClan, setPaternalClan] = useState(currentUser?.paternalClan || '');
  const [isAddingNewPaternalClan, setIsAddingNewPaternalClan] = useState(false);
  const [customPaternalClan, setCustomPaternalClan] = useState('');
  const [customPaternalClanTribe, setCustomPaternalClanTribe] = useState<TribeName>('Enenga');

  // Maternal clan & tribe
  const [maternalTribe, setMaternalTribe] = useState<TribeName>(currentUser?.tribe || 'Enenga');
  const [maternalClan, setMaternalClan] = useState(currentUser?.maternalClan || '');
  const [isAddingNewMaternalClan, setIsAddingNewMaternalClan] = useState(false);
  const [customMaternalClan, setCustomMaternalClan] = useState('');
  const [customMaternalClanTribe, setCustomMaternalClanTribe] = useState<TribeName>('Enenga');

  // Village of origin (attached to Clan & Tribe)
  const [villageOfOrigin, setVillageOfOrigin] = useState(currentUser?.villageOfOrigin || '');
  const [isAddingNewVillage, setIsAddingNewVillage] = useState(false);
  const [customVillage, setCustomVillage] = useState('');
  const [customVillageClan, setCustomVillageClan] = useState('');
  const [customVillageRegion, setCustomVillageRegion] = useState('');

  // Conditions de la plateforme & Consentement d'utilisation des données (Contributeur Individuel)
  const [termsAccepted, setTermsAccepted] = useState<boolean>(currentUser?.termsAccepted ?? false);
  const [dataUsageAccepted, setDataUsageAccepted] = useState<boolean>(currentUser?.dataUsageAccepted ?? false);
  const [consentVoiceUsage, setConsentVoiceUsage] = useState<boolean>(currentUser?.consentVoiceUsage ?? true);
  const [consentImageUsage, setConsentImageUsage] = useState<boolean>(currentUser?.consentImageUsage ?? false);
  const [legalGuardianName, setLegalGuardianName] = useState<string>(currentUser?.legalGuardianName || '');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.fullName) setFullName(currentUser.fullName);
      if (currentUser.contact) setContact(currentUser.contact);
      if (currentUser.tribe) {
        setTribe(currentUser.tribe);
        setPaternalTribe(currentUser.tribe);
        setMaternalTribe(currentUser.tribe);
        setCustomPaternalClanTribe(currentUser.tribe);
        setCustomMaternalClanTribe(currentUser.tribe);
      }
      if (currentUser.paternalClan) setPaternalClan(currentUser.paternalClan);
      if (currentUser.maternalClan) setMaternalClan(currentUser.maternalClan);
      if (currentUser.villageOfOrigin) setVillageOfOrigin(currentUser.villageOfOrigin);
      if (currentUser.termsAccepted !== undefined) setTermsAccepted(currentUser.termsAccepted);
      if (currentUser.dataUsageAccepted !== undefined) setDataUsageAccepted(currentUser.dataUsageAccepted);
      if (currentUser.consentVoiceUsage !== undefined) setConsentVoiceUsage(currentUser.consentVoiceUsage);
      if (currentUser.consentImageUsage !== undefined) setConsentImageUsage(currentUser.consentImageUsage);
      if (currentUser.legalGuardianName) setLegalGuardianName(currentUser.legalGuardianName);
    }
  }, [currentUser]);

  // Synchronize paternal & maternal tribe with primary tribe when changed
  const handlePrimaryTribeChange = (t: TribeName) => {
    setTribe(t);
    setPaternalTribe(t);
    setMaternalTribe(t);
    setCustomPaternalClanTribe(t);
    setCustomMaternalClanTribe(t);
  };

  // Filter clans by attached tribe
  const paternalClansList = clans.filter(c => c.tribe === paternalTribe);
  const maternalClansList = clans.filter(c => c.tribe === maternalTribe);

  // Filter villages by paternal clan if chosen, or show all
  const filteredVillages = paternalClan 
    ? villages.filter(v => v.clan === paternalClan)
    : villages;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Le nom complet est obligatoire pour accéder à OMPAGANO.');
      return;
    }
    if (!contact.trim()) {
      setErrorMessage('Un contact (téléphone, WhatsApp ou email) est obligatoire.');
      return;
    }
    if (!birthPlace.trim()) {
      setErrorMessage('Le lieu de naissance est obligatoire.');
      return;
    }

    let finalPaternalClan = paternalClan;
    if (isAddingNewPaternalClan) {
      if (!customPaternalClan.trim()) {
        setErrorMessage('Veuillez saisir le nom du nouveau clan paternel.');
        return;
      }
      const created = await onAddNewClan(customPaternalClan.trim(), customPaternalClanTribe);
      finalPaternalClan = created.name;
    } else if (!finalPaternalClan) {
      setErrorMessage('Veuillez sélectionner ou ajouter votre clan paternel.');
      return;
    }

    let finalMaternalClan = maternalClan;
    if (isAddingNewMaternalClan) {
      if (!customMaternalClan.trim()) {
        setErrorMessage('Veuillez saisir le nom du nouveau clan maternel.');
        return;
      }
      const created = await onAddNewClan(customMaternalClan.trim(), customMaternalClanTribe);
      finalMaternalClan = created.name;
    } else if (!finalMaternalClan) {
      setErrorMessage('Veuillez sélectionner ou ajouter votre clan maternel.');
      return;
    }

    let finalVillage = villageOfOrigin;
    if (isAddingNewVillage) {
      if (!customVillage.trim()) {
        setErrorMessage('Veuillez saisir le nom du nouveau village d’origine.');
        return;
      }
      const targetClanName = customVillageClan || finalPaternalClan || 'Non rattaché';
      const targetClanObj = clans.find(c => c.name === targetClanName);
      const targetTribe = targetClanObj?.tribe || tribe;

      const created = await onAddNewVillage(
        customVillage.trim(), 
        targetClanName, 
        targetTribe, 
        customVillageRegion.trim() || undefined
      );
      finalVillage = created.name;
    } else if (!finalVillage) {
      setErrorMessage('Veuillez sélectionner ou saisir votre village d’origine.');
      return;
    }

    if (!termsAccepted || !dataUsageAccepted) {
      setErrorMessage(
        "Vous devez accepter les Conditions Générales de la plateforme et valider l'autorisation d'utilisation de vos données pour poursuivre."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete({
        fullName: fullName.trim(),
        displayName: fullName.trim(),
        contact: contact.trim(),
        birthDate: birthDate,
        birthPlace: birthPlace.trim(),
        tribe: tribe,
        paternalClan: finalPaternalClan,
        maternalClan: finalMaternalClan,
        villageOfOrigin: finalVillage,
        registrationCompleted: true,
        termsAccepted: true,
        dataUsageAccepted: true,
        consentVoiceUsage,
        consentImageUsage,
        partnerAssociation: 'Contributeur Individuel',
        electronicSignature: `Lu et approuvé - ${fullName.trim()}`,
        legalGuardianName: legalGuardianName.trim() || undefined,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: CURRENT_TERMS_VERSION,
        suspicionScore: 0,
        status: 'active',
        badges: Array.from(new Set([...(currentUser?.badges || []), 'badge-genealogie-verifiee']))
      });
    } catch (err: any) {
      setErrorMessage('Erreur enregistrement profil: ' + (err.message || 'Vérifiez votre connexion'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl my-auto warm-card-gradient border-2 border-[#d97706]/50 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 text-white max-h-[92vh] overflow-y-auto">
        {/* Header with App identity */}
        <div className="text-center space-y-3 border-b border-[#4a2412] pb-5">
          <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-[#c85a32] via-[#f59e0b] to-[#0d9488] shadow-lg">
            <div className="w-full h-full bg-white rounded-[14px] overflow-hidden flex items-center justify-center p-0.5 shadow-inner">
              <img 
                src="/assets/aistudio/LOGO-symbole_1c65e221.png" 
                alt="Logo OMPAGANO" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#c85a32]/30 text-[#fde047] border border-[#c85a32]/50">
            <Lock className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span>Enregistrement Obligatoire • Protocole OMPAGANO</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Bienvenue dans OMPAGANO
          </h2>
          <p className="text-xs sm:text-sm text-[#fed7aa] max-w-lg mx-auto leading-relaxed">
            <strong className="text-[#f59e0b]">« Ompagano »</strong> est le programme participatif de sauvegarde de la langue Myènè. 
            Renseignez votre filiation clanique et vos origines territoriales pour accéder au corpus et contribuer.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-[#7f1d1d]/60 border border-[#ef4444] rounded-2xl text-xs text-[#fecaca] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Mandatory Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-xs sm:text-sm">
          {/* Identity Block */}
          <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#f59e0b] flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              <span>1. Identité Civile & Contact</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[#fed7aa] font-medium mb-1">
                  Nom Complet & Prénoms <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Jean Onanga"
                  className="w-full px-3.5 py-2.5 bg-[#24130a] border border-[#522915] rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div>
                <label className="block text-[#fed7aa] font-medium mb-1">
                  Contact (Tél / WhatsApp) <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="+241 074 00 00 00"
                  className="w-full px-3.5 py-2.5 bg-[#24130a] border border-[#522915] rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div>
                <label className="block text-[#fed7aa] font-medium mb-1">
                  Date de Naissance <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#24130a] border border-[#522915] rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div>
                <label className="block text-[#fed7aa] font-medium mb-1">
                  Lieu de Naissance <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  placeholder="Ex: Lambaréné, Port-Gentil, Libreville..."
                  className="w-full px-3.5 py-2.5 bg-[#24130a] border border-[#522915] rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-[#f59e0b]"
                />
              </div>
            </div>
          </div>

          {/* Genealogy & Tribal Heritage Block */}
          <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#f59e0b] flex items-center gap-1.5">
              <Globe2 className="w-4 h-4" />
              <span>2. Filiation Généalogique & Origines</span>
            </h3>

            {/* Tribu Principale */}
            <div>
              <label className="block text-[#fed7aa] font-medium mb-1.5">
                Votre Tribu Myènè Principale <span className="text-[#ef4444]">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {MYENE_TRIBES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handlePrimaryTribeChange(t)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                      tribe === t
                        ? 'terracotta-gradient text-white shadow-lg ring-1 ring-[#f59e0b]'
                        : 'bg-[#24130a] text-[#a8826d] hover:bg-[#341b10] hover:text-[#fed7aa]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Clan Paternel : Rattaché à une Tribu */}
            <div className="p-3.5 bg-[#24130a] rounded-xl border border-[#522915] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[#fed7aa] font-semibold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#f59e0b]" />
                  <span>Clan Paternel (rattaché à une tribu) <span className="text-[#ef4444]">*</span></span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewPaternalClan(!isAddingNewPaternalClan)}
                  className="text-xs text-[#f59e0b] hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isAddingNewPaternalClan ? 'Choisir existant' : 'Créer nouveau clan'}</span>
                </button>
              </div>

              {!isAddingNewPaternalClan ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-[#a8826d] mb-0.5">Tribu du père :</label>
                    <select
                      value={paternalTribe}
                      onChange={(e) => {
                        setPaternalTribe(e.target.value as TribeName);
                        setPaternalClan('');
                      }}
                      className="w-full px-2.5 py-2 bg-[#180d07] border border-[#522915] rounded-lg text-white text-xs focus:outline-none focus:border-[#f59e0b]"
                    >
                      {MYENE_TRIBES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-[#a8826d] mb-0.5">Clan paternel disponible :</label>
                    <select
                      value={paternalClan}
                      onChange={(e) => setPaternalClan(e.target.value)}
                      className="w-full px-3 py-2 bg-[#180d07] border border-[#522915] rounded-lg text-white text-xs focus:outline-none focus:border-[#f59e0b]"
                    >
                      <option value="">-- Sélectionnez le clan ({paternalTribe}) --</option>
                      {paternalClansList.map((c) => (
                        <option key={c.id} value={c.name}>
                          Clan {c.name} (Tribu: {c.tribe})
                        </option>
                      ))}
                      <option value="Non précisé">Non précisé / À définir ({paternalTribe})</option>
                    </select>
                    {paternalClansList.length === 0 && (
                      <p className="text-[10px] text-[#fde047] mt-1">
                        Les clans {paternalTribe} sont en cours de validation orthographique. Vous pouvez choisir « Non précisé » ou cliquer sur « Créer nouveau clan ».
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] text-[#a8826d] mb-0.5">Tribu de rattachement :</label>
                    <select
                      value={customPaternalClanTribe}
                      onChange={(e) => setCustomPaternalClanTribe(e.target.value as TribeName)}
                      className="w-full px-2.5 py-2 bg-[#180d07] border border-[#c85a32] rounded-lg text-white text-xs focus:outline-none"
                    >
                      {MYENE_TRIBES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-[#a8826d] mb-0.5">Nom du nouveau clan :</label>
                    <input
                      type="text"
                      value={customPaternalClan}
                      onChange={(e) => setCustomPaternalClan(e.target.value)}
                      placeholder="Ex: Avandji, Ndiwa, Asiga..."
                      className="w-full px-3 py-2 bg-[#180d07] border border-[#c85a32] rounded-lg text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Clan Maternel : Rattaché à une Tribu */}
            <div className="p-3.5 bg-[#24130a] rounded-xl border border-[#522915] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[#fed7aa] font-semibold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#c85a32]" />
                  <span>Clan Maternel (rattaché à une tribu) <span className="text-[#ef4444]">*</span></span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewMaternalClan(!isAddingNewMaternalClan)}
                  className="text-xs text-[#f59e0b] hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isAddingNewMaternalClan ? 'Choisir existant' : 'Créer nouveau clan'}</span>
                </button>
              </div>

              {!isAddingNewMaternalClan ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-[#a8826d] mb-0.5">Tribu de la mère :</label>
                    <select
                      value={maternalTribe}
                      onChange={(e) => {
                        setMaternalTribe(e.target.value as TribeName);
                        setMaternalClan('');
                      }}
                      className="w-full px-2.5 py-2 bg-[#180d07] border border-[#522915] rounded-lg text-white text-xs focus:outline-none focus:border-[#f59e0b]"
                    >
                      {MYENE_TRIBES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-[#a8826d] mb-0.5">Clan maternel disponible :</label>
                    <select
                      value={maternalClan}
                      onChange={(e) => setMaternalClan(e.target.value)}
                      className="w-full px-3 py-2 bg-[#180d07] border border-[#522915] rounded-lg text-white text-xs focus:outline-none focus:border-[#f59e0b]"
                    >
                      <option value="">-- Sélectionnez le clan ({maternalTribe}) --</option>
                      {maternalClansList.map((c) => (
                        <option key={c.id} value={c.name}>
                          Clan {c.name} (Tribu: {c.tribe})
                        </option>
                      ))}
                      <option value="Non précisé">Non précisé / À définir ({maternalTribe})</option>
                    </select>
                    {maternalClansList.length === 0 && (
                      <p className="text-[10px] text-[#fde047] mt-1">
                        Les clans {maternalTribe} sont en cours de validation orthographique. Vous pouvez choisir « Non précisé » ou cliquer sur « Créer nouveau clan ».
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] text-[#a8826d] mb-0.5">Tribu de rattachement :</label>
                    <select
                      value={customMaternalClanTribe}
                      onChange={(e) => setCustomMaternalClanTribe(e.target.value as TribeName)}
                      className="w-full px-2.5 py-2 bg-[#180d07] border border-[#c85a32] rounded-lg text-white text-xs focus:outline-none"
                    >
                      {MYENE_TRIBES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-[#a8826d] mb-0.5">Nom du nouveau clan :</label>
                    <input
                      type="text"
                      value={customMaternalClan}
                      onChange={(e) => setCustomMaternalClan(e.target.value)}
                      placeholder="Ex: Agulamba, Imvona, Azowa..."
                      className="w-full px-3 py-2 bg-[#180d07] border border-[#c85a32] rounded-lg text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Village d'Origine : Rattaché à un Clan & une Tribu */}
            <div className="p-3.5 bg-[#24130a] rounded-xl border border-[#522915] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[#fed7aa] font-semibold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#10b981]" />
                  <span>Village d'Origine (rattaché à un clan) <span className="text-[#ef4444]">*</span></span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewVillage(!isAddingNewVillage)}
                  className="text-xs text-[#f59e0b] hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isAddingNewVillage ? 'Choisir existant' : 'Créer nouveau village'}</span>
                </button>
              </div>

              {!isAddingNewVillage ? (
                <div>
                  <select
                    value={villageOfOrigin}
                    onChange={(e) => setVillageOfOrigin(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#180d07] border border-[#522915] rounded-xl text-white text-xs focus:outline-none focus:border-[#f59e0b]"
                  >
                    <option value="">-- Sélectionnez votre village d’origine --</option>
                    {filteredVillages.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name} (Clan: {v.clan || 'Non rattaché'}, Tribu: {v.tribe})
                      </option>
                    ))}
                    <option value="Non précisé">Non précisé / À définir</option>
                  </select>
                  {filteredVillages.length === 0 && (
                    <p className="text-[10px] text-[#fde047] mt-1">
                      Aucun village n'est encore enregistré pour cette sélection. Vous pouvez choisir « Non précisé » ou cliquer sur « Créer nouveau village ».
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#a8826d] mb-0.5">Nom du village :</label>
                      <input
                        type="text"
                        value={customVillage}
                        onChange={(e) => setCustomVillage(e.target.value)}
                        placeholder="Ex: Ozouri, Alumbè..."
                        className="w-full px-3 py-2 bg-[#180d07] border border-[#c85a32] rounded-lg text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#a8826d] mb-0.5">Clan de rattachement :</label>
                      <select
                        value={customVillageClan || paternalClan || 'Non rattaché'}
                        onChange={(e) => setCustomVillageClan(e.target.value)}
                        className="w-full px-3 py-2 bg-[#180d07] border border-[#c85a32] rounded-lg text-white text-xs focus:outline-none"
                      >
                        <option value="Non rattaché">Non rattaché / À définir</option>
                        {paternalClan && paternalClan !== 'Non précisé' && !clans.some(c => c.name === paternalClan) && (
                          <option value={paternalClan}>Clan {paternalClan} ({paternalTribe})</option>
                        )}
                        {clans.map(c => (
                          <option key={c.id} value={c.name}>Clan {c.name} ({c.tribe})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={customVillageRegion}
                      onChange={(e) => setCustomVillageRegion(e.target.value)}
                      placeholder="Région / Province (facultatif, ex: Moyen-Ogooué)"
                      className="w-full px-3 py-1.5 bg-[#180d07] border border-[#522915] rounded-lg text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Conditions de la Plateforme & Consentement d'Utilisation des Données (Contributeur Individuel) */}
          <div className="p-4 bg-[#180d07] rounded-2xl border border-[#f59e0b]/40 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3b1d10] pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#f59e0b] flex items-center gap-1.5">
                <Scale className="w-4 h-4" />
                <span>3. Conditions de la Plateforme & Utilisation des Données</span>
              </h3>

              <div className="flex items-center gap-2">
                {onOpenFullContractModal && (
                  <button
                    type="button"
                    onClick={onOpenFullContractModal}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#27150c] hover:bg-[#381e11] text-[#fde047] border border-[#f59e0b]/40 text-[11px] font-bold transition"
                  >
                    <FileText className="w-3 h-3 text-[#f59e0b]" />
                    <span>Lire les Conditions & Système de Badges/Points</span>
                  </button>
                )}
              </div>
            </div>

            {/* Synthèse des engagements du contributeur individuel */}
            <div className="p-3 rounded-xl bg-[#24130a] border border-[#3b1d10] text-[11px] text-[#d4af94] space-y-1.5 leading-relaxed">
              <div className="font-bold text-[#fde047] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#f59e0b]" />
                <span>Synthèse du Consentement du Contributeur Individuel (Essaka Engineering) :</span>
              </div>
              <p>
                <strong>(1)</strong> Mes textes, traductions, images et enregistrements vocaux sont collectés par <strong>Essaka Engineering</strong> (Port-Gentil, Gabon, RCCM RG/POG 2022 A 1290) dans le cadre du programme participatif <strong>OMPAGANO</strong>.{' '}
                <strong>(2)</strong> Ils servent à entraîner et améliorer des modèles d'intelligence artificielle valorisant les langues gabonaises, utilisés notamment dans l'application <strong>NKALA</strong>.{' '}
                <strong>(3)</strong> Ma participation individuelle est valorisée par un système de <strong>Points d'Expérience (XP), de Rangs culturels, de Badges et de Défis</strong> pouvant donner lieu à des récompenses en fonction de mes accomplissements validés.{' '}
                <strong>(4)</strong> Je dispose d'un droit d'accès, de correction, de suppression (sous 60 jours) et de retrait (Loi n° 001/2011 & CNPDCP).{' '}
                <strong>(5)</strong> Je participe librement et conserve mes droits d'auteur (OAPI Accord de Bangui Annexe VII).
              </p>
            </div>

            {/* Représentant légal si mineur */}
            <div>
              <label className="block text-[11px] text-[#fed7aa] font-medium mb-1">
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

            {/* Checkboxes */}
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#24130a] border border-[#522915] hover:border-[#f59e0b] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#f59e0b] rounded shrink-0"
                />
                <span className="text-xs text-white leading-snug">
                  <strong className="text-[#fde047]">J'accepte les Conditions Générales de la plateforme OMPAGANO / NKALA</strong> applicables aux contributeurs individuels. <span className="text-[#ef4444] font-bold">*</span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#24130a] border border-[#522915] hover:border-[#f59e0b] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={dataUsageAccepted}
                  onChange={(e) => setDataUsageAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#f59e0b] rounded shrink-0"
                />
                <span className="text-xs text-white leading-snug">
                  <strong className="text-[#fde047]">Je valide l'utilisation de mes données personnelles et linguistiques</strong> pour l'entraînement des Modèles IA d'Essaka Engineering et l'attribution de mes points, badges et récompenses d'accomplissement. <span className="text-[#ef4444] font-bold">*</span>
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-[#24130a]/70 border border-[#3b1d10] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentVoiceUsage}
                    onChange={(e) => setConsentVoiceUsage(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#c85a32] rounded shrink-0"
                  />
                  <Mic className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
                  <span className="text-[11px] text-[#fed7aa]">J'autorise l'usage de ma <strong>voix</strong> (enregistrements audio)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-[#24130a]/70 border border-[#3b1d10] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentImageUsage}
                    onChange={(e) => setConsentImageUsage(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#c85a32] rounded shrink-0"
                  />
                  <ImageIcon className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                  <span className="text-[11px] text-[#fed7aa]">J'autorise l'usage de mon <strong>image</strong> (facultatif)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl terracotta-gradient hover:opacity-95 text-white font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validation de la filiation & du consentement...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 text-[#fde047]" />
                  <span>Valider mon Enregistrement, mes Conditions & Accéder au Programme</span>
                  <Sparkles className="w-4 h-4 text-[#fde047]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
