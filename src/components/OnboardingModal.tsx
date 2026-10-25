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
  Compass
} from 'lucide-react';
import { UserProfile, TribeName, ClanRegistry, VillageRegistry } from '../types';
import { MYENE_TRIBES } from '../services/seedData';

interface OnboardingModalProps {
  isOpen: boolean;
  currentUser: UserProfile | null;
  clans: ClanRegistry[];
  villages: VillageRegistry[];
  onComplete: (profileData: Partial<UserProfile>) => Promise<void>;
  onAddNewClan: (name: string, tribe: string) => Promise<ClanRegistry>;
  onAddNewVillage: (name: string, clan: string, tribe: string, region?: string) => Promise<VillageRegistry>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  currentUser,
  clans,
  villages,
  onComplete,
  onAddNewClan,
  onAddNewVillage
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
      const targetClanName = customVillageClan || finalPaternalClan || clans[0]?.name || 'Avandji';
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
      setErrorMessage('Veuillez sélectionner ou ajouter votre village d’origine.');
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
                    </select>
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
                    </select>
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
                        {v.name} (Clan: {v.clan || 'Enenga'}, Tribu: {v.tribe})
                      </option>
                    ))}
                    {filteredVillages.length === 0 && (
                      <option disabled value="">Aucun village enregistré pour ce clan, vous pouvez le créer.</option>
                    )}
                  </select>
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
                        placeholder="Ex: Lac Onangué, Ozouri, Glass..."
                        className="w-full px-3 py-2 bg-[#180d07] border border-[#c85a32] rounded-lg text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#a8826d] mb-0.5">Clan de rattachement :</label>
                      <select
                        value={customVillageClan || paternalClan || clans[0]?.name}
                        onChange={(e) => setCustomVillageClan(e.target.value)}
                        className="w-full px-3 py-2 bg-[#180d07] border border-[#c85a32] rounded-lg text-white text-xs focus:outline-none"
                      >
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
                  <span>Validation de la filiation OMPAGANO...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 text-[#fde047]" />
                  <span>Valider mon Enregistrement & Accéder au Programme</span>
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
