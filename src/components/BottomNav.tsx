import React from 'react';
import { Mic, BookOpen, Trophy, User, CheckCircle, Crown } from 'lucide-react';
import { UserRole } from '../types';

export type AppTab = 'crowdsource' | 'explore' | 'leaderboard' | 'validator' | 'admin' | 'profile';
export type AppSection = 'contribute' | 'admin' | 'profile';

export const tabSection = (tab: AppTab): AppSection =>
  tab === 'admin' ? 'admin' : tab === 'profile' ? 'profile' : 'contribute';

/** Sous-navigation de la section Contribuer (un seul onglet principal). */
export const CrowdsourceSubNav: React.FC<{
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  userRole?: UserRole;
  pendingCount?: number;
}> = ({ currentTab, onSelectTab, userRole = 'user', pendingCount = 0 }) => {
  const items = [
    { id: 'crowdsource' as AppTab, label: 'Contribuer', icon: Mic, visible: true },
    { id: 'explore' as AppTab, label: 'Ezango', icon: BookOpen, visible: true },
    { id: 'leaderboard' as AppTab, label: 'Classement', icon: Trophy, visible: true },
    // Administrateurs et validateurs (et eux seuls) accèdent à la validation.
    { id: 'validator' as AppTab, label: 'Validation', icon: CheckCircle, visible: userRole === 'admin' || userRole === 'validator' }
  ].filter(i => i.visible);
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 border-b border-[#3f2113]">
      {items.map(i => {
        const Icon = i.icon;
        const active = currentTab === i.id;
        return (
          <button
            key={i.id}
            type="button"
            onClick={() => onSelectTab(i.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              active ? 'bg-[#c85a32] text-white shadow-md font-bold' : 'bg-[#27150c] text-[#d4af94] hover:bg-[#341b10]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{i.label}</span>
            {i.id === 'validator' && pendingCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-[#ef4444] text-white text-[9px] font-bold flex items-center justify-center">{pendingCount}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

interface BottomNavProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  userRole?: UserRole;
  pendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  userRole = 'user',
  pendingCount = 0
}) => {
  // Trois entrées seulement : tout le crowdsourcing tient dans « Contribuer »
  // (sous-onglets dans CrowdsourceSubNav), la modération des contributions est dans l'administration.
  const section = tabSection(currentTab);
  const navItems = [
    { id: 'crowdsource' as AppTab, section: 'contribute' as const, label: 'Contribuer', icon: Mic, visible: true,
      badge: undefined as number | undefined },
    { id: 'admin' as AppTab, section: 'admin' as const, label: 'Administration', icon: Crown, visible: userRole === 'admin',
      badge: userRole === 'admin' && pendingCount > 0 ? pendingCount : undefined },
    { id: 'profile' as AppTab, section: 'profile' as const, label: 'Profil', icon: User, visible: true, badge: undefined as number | undefined }
  ].filter(tab => tab.visible);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#170d08]/98 backdrop-blur-lg border-t border-[#3d1f11] py-1.5 px-2 max-w-lg mx-auto sm:max-w-2xl md:max-w-4xl shadow-2xl">
      <div className="flex items-center justify-around">
        {navItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = section === tab.section;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-[#f59e0b]'
                  : 'text-[#a8826d] hover:text-[#fed7aa]'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'terracotta-gradient text-white shadow-lg scale-110'
                    : 'bg-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${isActive ? 'font-bold text-white' : ''}`}>
                {tab.label}
              </span>

              {tab.badge !== undefined && (
                <span className="absolute top-1 right-1.5 w-4 h-4 rounded-full bg-[#ef4444] text-white text-[9px] font-bold flex items-center justify-center shadow">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
