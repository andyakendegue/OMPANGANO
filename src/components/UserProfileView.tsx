import React from 'react';
import { 
  User, 
  Award, 
  Flame, 
  Sparkles, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Database, 
  Trash2, 
  LogOut, 
  Globe2, 
  MapPin, 
  Users, 
  Calendar,
  Edit,
  DownloadCloud
} from 'lucide-react';
import { UserProfile, Contribution } from '../types';
import { getLevelForXp } from '../services/seedData';

interface UserProfileViewProps {
  currentUser: UserProfile | null;
  contributions: Contribution[];
  onOpenAuth: () => void;
  onOpenOnboarding: () => void;
  onOpenOfflinePack: () => void;
  onSignOut: () => void;
  onToggleRole: (newRole: 'user' | 'validator' | 'admin') => void;
  onClearOfflineCache: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  currentUser,
  contributions,
  onOpenAuth,
  onOpenOnboarding,
  onOpenOfflinePack,
  onSignOut,
  onToggleRole,
  onClearOfflineCache
}) => {
  const currentLevel = getLevelForXp(currentUser?.xp || 0);
  const myContributions = contributions.filter(c => c.userId === currentUser?.id);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-20">
      {/* Profile Card */}
      <div className="warm-card-gradient rounded-3xl p-6 border-2 border-[#d97706]/30 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl terracotta-gradient p-1 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-[#180d07] rounded-xl flex items-center justify-center text-2xl font-bold text-white">
                {(currentUser?.fullName || currentUser?.displayName || 'U').charAt(0).toUpperCase()}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">
                  {currentUser?.fullName || currentUser?.displayName || 'Visiteur OMPAGANO'}
                </h2>
                {currentUser?.role === 'admin' && (
                  <span className="text-[10px] bg-[#991b1b]/50 text-[#fca5a5] border border-[#ef4444]/40 px-2 py-0.5 rounded-full font-bold">
                    Aîné / Admin
                  </span>
                )}
              </div>

              <p className="text-xs text-[#f59e0b] font-medium mt-0.5">
                Niveau {currentLevel.index} : {currentLevel.name}
              </p>

              {currentUser?.contact && (
                <p className="text-xs text-[#a8826d] flex items-center gap-1.5 mt-1 font-mono">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{currentUser.contact}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onOpenOnboarding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#27150c] hover:bg-[#381e11] text-[#fed7aa] border border-[#4a2412] text-xs font-semibold self-start sm:self-center transition-colors"
          >
            <Edit className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span>Modifier Généalogie</span>
          </button>
        </div>

        {/* Filiation & Genealogical Summary Box */}
        <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#f59e0b] flex items-center gap-1.5">
              <Globe2 className="w-4 h-4" />
              <span>Filiation OMPAGANO Enregistrée</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#15803d]/30 text-[#86efac] border border-[#22c55e]/30 font-semibold">
              Certifiée Conforme
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[#a8826d] block text-[11px]">Tribu Myènè :</span>
              <span className="font-semibold text-white">{currentUser?.tribe || 'Enenga'}</span>
            </div>
            <div>
              <span className="text-[#a8826d] block text-[11px]">Clan Paternel :</span>
              <span className="font-semibold text-white">{currentUser?.paternalClan || 'Avandji'}</span>
            </div>
            <div>
              <span className="text-[#a8826d] block text-[11px]">Clan Maternel :</span>
              <span className="font-semibold text-white">{currentUser?.maternalClan || 'Imvona'}</span>
            </div>
            <div>
              <span className="text-[#a8826d] block text-[11px]">Village d'Origine :</span>
              <span className="font-semibold text-white">{currentUser?.villageOfOrigin || 'Lambaréné'}</span>
            </div>
            <div>
              <span className="text-[#a8826d] block text-[11px]">Lieu de Naissance :</span>
              <span className="font-semibold text-white">{currentUser?.birthPlace || 'Lambaréné'}</span>
            </div>
            <div>
              <span className="text-[#a8826d] block text-[11px]">Date de Naissance :</span>
              <span className="font-semibold text-white">{currentUser?.birthDate || 'Non spécifiée'}</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 bg-[#180d07] rounded-2xl border border-[#3b1d10] text-center">
            <div className="text-xl font-black text-[#f59e0b]">{currentUser?.xp || 0}</div>
            <div className="text-[10px] text-[#a8826d] uppercase font-semibold">Points XP</div>
          </div>
          <div className="p-3 bg-[#180d07] rounded-2xl border border-[#3b1d10] text-center">
            <div className="text-xl font-black text-[#c85a32]">{myContributions.length}</div>
            <div className="text-[10px] text-[#a8826d] uppercase font-semibold">Contributions</div>
          </div>
          <div className="p-3 bg-[#180d07] rounded-2xl border border-[#3b1d10] text-center">
            <div className="text-xl font-black text-[#22c55e]">
              {myContributions.filter(c => !!c.audioUrl).length}
            </div>
            <div className="text-[10px] text-[#a8826d] uppercase font-semibold">Voix données</div>
          </div>
        </div>

        {/* Role Selector */}
        <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#fed7aa]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#f59e0b]" />
              <span>Rôle dans la communauté OMPAGANO :</span>
            </span>
            <span className="text-[11px] text-[#a8826d] capitalize">{currentUser?.role || 'user'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => onToggleRole('user')}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                currentUser?.role === 'user' ? 'terracotta-gradient text-white shadow' : 'bg-[#27150c] text-[#a8826d] hover:bg-[#341b10]'
              }`}
            >
              Contributeur
            </button>
            <button
              onClick={() => onToggleRole('validator')}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                currentUser?.role === 'validator' ? 'terracotta-gradient text-white shadow' : 'bg-[#27150c] text-[#a8826d] hover:bg-[#341b10]'
              }`}
            >
              Relecteur
            </button>
            <button
              onClick={() => onToggleRole('admin')}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                currentUser?.role === 'admin' ? 'terracotta-gradient text-white shadow' : 'bg-[#27150c] text-[#a8826d] hover:bg-[#341b10]'
              }`}
            >
              Administrateur
            </button>
          </div>
        </div>

        {/* Offline Cache & Diagnostics */}
        <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-3">
          <div className="flex items-center justify-between text-xs text-[#fed7aa]">
            <span className="flex items-center gap-1.5 font-semibold">
              <Database className="w-4 h-4 text-[#c85a32]" />
              <span>Stockage Hors-ligne & PWA :</span>
            </span>
            <button
              onClick={onOpenOfflinePack}
              className="text-[11px] text-[#f59e0b] hover:underline flex items-center gap-1"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Gérer le pack</span>
            </button>
          </div>
          <button
            onClick={onClearOfflineCache}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#27150c] hover:bg-[#7f1d1d] text-xs text-[#fca5a5] border border-[#ef4444]/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vider le cache hors-ligne</span>
          </button>
        </div>

        {/* Auth action */}
        <div className="pt-2 flex justify-between items-center">
          {currentUser ? (
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-xs text-[#f87171] hover:underline"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full py-3 rounded-2xl terracotta-gradient text-white font-bold text-sm shadow-md"
            >
              Se connecter (Gmail / Téléphone)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
