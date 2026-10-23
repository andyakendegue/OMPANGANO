import React from 'react';
import { 
  Mic, 
  BookOpen, 
  Trophy, 
  ShieldCheck, 
  User,
  Sparkles
} from 'lucide-react';
import { UserRole } from '../types';

export type AppTab = 'crowdsource' | 'explore' | 'leaderboard' | 'admin' | 'profile';

interface BottomNavProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  userRole?: UserRole;
  pendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  pendingCount = 0
}) => {
  const tabs = [
    {
      id: 'crowdsource' as AppTab,
      label: 'Contribuer',
      icon: Mic,
      highlight: true
    },
    {
      id: 'explore' as AppTab,
      label: 'Vocabulaire',
      icon: BookOpen
    },
    {
      id: 'leaderboard' as AppTab,
      label: 'Classement',
      icon: Trophy
    },
    {
      id: 'admin' as AppTab,
      label: 'Validation & Admin',
      icon: ShieldCheck,
      badge: pendingCount > 0 ? pendingCount : undefined
    },
    {
      id: 'profile' as AppTab,
      label: 'Mon Profil',
      icon: User
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#170d08]/98 backdrop-blur-lg border-t border-[#3d1f11] py-1.5 px-2 max-w-lg mx-auto sm:max-w-2xl md:max-w-4xl shadow-2xl">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 ${
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

              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-bold text-white' : ''}`}>
                {tab.label}
              </span>

              {tab.badge && (
                <span className="absolute top-1 right-2.5 w-4 h-4 rounded-full bg-[#ef4444] text-white text-[9px] font-bold flex items-center justify-center shadow">
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
