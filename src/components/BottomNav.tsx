import React from 'react';
import { 
  Mic, 
  BookOpen, 
  Trophy, 
  ShieldCheck, 
  User,
  CheckCircle,
  Crown
} from 'lucide-react';
import { UserRole } from '../types';

export type AppTab = 'crowdsource' | 'explore' | 'leaderboard' | 'validator' | 'admin' | 'profile';

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
  // Build role-tailored navigation items (RBAC)
  const navItems = [
    {
      id: 'crowdsource' as AppTab,
      label: 'Contribuer',
      icon: Mic,
      visible: true
    },
    {
      id: 'explore' as AppTab,
      label: 'Vocabulaire',
      icon: BookOpen,
      visible: true
    },
    {
      id: 'leaderboard' as AppTab,
      label: 'Classement',
      icon: Trophy,
      visible: true
    },
    // Validator Tab: only visible to Validators and Admins
    {
      id: 'validator' as AppTab,
      label: 'Validation Voix',
      icon: CheckCircle,
      badge: pendingCount > 0 ? pendingCount : undefined,
      visible: userRole === 'validator' || userRole === 'admin'
    },
    // Admin Tab: ONLY visible to Admins
    {
      id: 'admin' as AppTab,
      label: 'Administration',
      icon: Crown,
      visible: userRole === 'admin'
    },
    {
      id: 'profile' as AppTab,
      label: 'Mon Profil',
      icon: User,
      visible: true
    }
  ].filter(tab => tab.visible);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#170d08]/98 backdrop-blur-lg border-t border-[#3d1f11] py-1.5 px-2 max-w-lg mx-auto sm:max-w-2xl md:max-w-4xl shadow-2xl">
      <div className="flex items-center justify-around">
        {navItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

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
