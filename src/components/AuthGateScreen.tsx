import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  Award,
  Mic,
  Users,
  Globe,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { useOfflineShellStatus } from '../services/pwaOfflineManager';

interface AuthGateScreenProps {
  onLoginSuccess: (profile: Partial<UserProfile>) => void;
}

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const offlineShell = useOfflineShellStatus();

  // Google Popup Auth
  const handleGooglePopupLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const existingFbUser =
        auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser : null;
      const user = existingFbUser || (await signInWithPopup(auth, googleProvider)).user;

      onLoginSuccess({
        id: user.uid,
        displayName:
          user.displayName || user.email?.split('@')[0] || 'Contributeur Nkala',
        fullName: user.displayName || user.email?.split('@')[0] || 'Locuteur Myènè',
        contact: user.email || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        // rôle, XP, badges : jamais décidés par le navigateur (voir userSecurity.ts)
        tribe: 'Ôrungu'
      });
    } catch (err: any) {
      console.warn('Google popup notice:', err);
      const isDomainBlocked =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain');
      const isPopupBlocked =
        err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user';

      if (isDomainBlocked) {
        setErrorMessage(
          "Connexion Google indisponible sur ce domaine. Veuillez réessayer depuis le site officiel."
        );
      } else if (isPopupBlocked) {
        setErrorMessage(
          'La fenêtre popup a été bloquée par le navigateur. Veuillez autoriser les fenêtres contextuelles pour continuer avec Google.'
        );
      } else {
        setErrorMessage(
          err.message ||
            "La connexion Google n'a pas pu aboutir. Veuillez réessayer."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="african-pattern-bg min-h-screen text-[#fdfaf7] flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-[#c85a32] selection:text-white">
      {/* Top Brand Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between gap-2 py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-[#c85a32] via-[#f59e0b] to-[#0d9488] shadow-lg border border-[#f59e0b]/40">
            <div className="w-full h-full bg-white rounded-[14px] overflow-hidden flex items-center justify-center p-0.5 shadow-inner">
              <img
                src="/assets/aistudio/LOGO-symbole_1c65e221.png"
                alt="Logo Nkala"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-lg text-white font-serif">
                Nkala
              </span>
            </div>
            <p className="text-xs text-[#d4af94]">
              Crowdsourcing & Sauvegarde de la Langue Myènè
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />
          {offlineShell.isReady && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#86efac] bg-[#14532d]/40 border border-[#22c55e]/30 px-2.5 py-1.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
              <span>Mode Avion Prêt</span>
            </div>
          )}
          <div className="hidden md:flex items-center gap-2 text-xs text-[#fed7aa] bg-[#27150c]/80 border border-[#4a2412] px-3.5 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
            <span>Accès Sécurisé Réservé</span>
          </div>
        </div>
      </header>

      {/* Main Login Gate Card */}
      <main className="max-w-4xl w-full mx-auto my-auto py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Context & Value proposition */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c85a32]/20 border border-[#c85a32]/40 text-[#fed7aa] text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>Authentification Obligatoire</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight font-serif">
              Gardons Vivante la Parole de nos Aïeux
            </h1>

            <p className="text-sm text-[#d4af94] leading-relaxed">
              Pour garantir l'authenticité patrimoniale des enregistrements oraux, l'ancrage tribal et généalogique des locuteurs et l'intégrité du corpus linguistique,
              <strong> l'accès à l'application est strictement réservé aux membres identifiés</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#27150c]/80 border border-[#4a2412] space-y-1">
                <Mic className="w-5 h-5 text-[#f59e0b]" />
                <div className="font-bold text-white">Voix Certifiées</div>
                <div className="text-[11px] text-[#a8826d]">
                  Traçabilité de chaque enregistrement vocal
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#27150c]/80 border border-[#4a2412] space-y-1">
                <Users className="w-5 h-5 text-[#c85a32]" />
                <div className="font-bold text-white">Ancrage Tribal</div>
                <div className="text-[11px] text-[#a8826d]">
                  6 tribus Myènè, filiation et village d'origine
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#27150c]/80 border border-[#4a2412] space-y-1">
                <Award className="w-5 h-5 text-[#f59e0b]" />
                <div className="font-bold text-white">Titres & Badges</div>
                <div className="text-[11px] text-[#a8826d]">
                  Progression de sagesse et récompenses
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#27150c]/80 border border-[#4a2412] space-y-1">
                <Globe className="w-5 h-5 text-[#22c55e]" />
                <div className="font-bold text-white">Mode Hors-Ligne</div>
                <div className="text-[11px] text-[#a8826d]">
                  Collecte autonome dans les villages
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-6">
            <div className="warm-card-gradient border-2 border-[#d97706]/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 mx-auto rounded-3xl overflow-hidden p-1 bg-gradient-to-tr from-[#c85a32] via-[#f59e0b] to-[#0d9488] shadow-2xl">
                  <div className="w-full h-full bg-white rounded-[20px] overflow-hidden flex items-center justify-center p-1 shadow-inner">
                    <img
                      src="/assets/aistudio/LOGO-symbole_1c65e221.png"
                      alt="Logo Nkala"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white font-serif">
                    Connexion à Nkala
                  </h2>
                  <p className="text-xs text-[#d4af94]">
                    Identifiez-vous pour accéder au studio de contribution
                  </p>
                </div>
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-[#7f1d1d]/40 border border-[#ef4444]/60 text-xs text-[#fecaca] flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* TAB 1: Google OAuth Login */}
              {(
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleGooglePopupLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>
                      {isLoading ? 'Connexion en cours...' : 'Se connecter avec Google'}
                    </span>
                  </button>

                  <div className="p-3 bg-[#180d07] rounded-xl border border-[#3b1d10] text-[11px] text-[#a8826d] leading-relaxed text-center">
                    🔒 Authentification sécurisée par le protocole Nkala.
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center py-4 border-t border-[#3b1d10] text-[11px] text-[#a8826d]">
        Nkala • Sauvegarde et Vitalisation des Langues Myènè du Gabon
      </footer>
    </div>
  );
};
