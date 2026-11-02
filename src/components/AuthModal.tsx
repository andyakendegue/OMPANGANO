import React, { useState } from 'react';
import {
  X,
  AlertCircle
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: Partial<UserProfile>) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Google Popup Auth
  const handleGooglePopupLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      onLoginSuccess({
        id: user.uid,
        displayName:
          user.displayName || user.email?.split('@')[0] || 'Contributeur Nkala',
        fullName: user.displayName || '',
        email: user.email || undefined,
        photoURL: user.photoURL || undefined,
        // rôle, XP, badges : jamais décidés par le navigateur (voir userSecurity.ts)
        tribe: 'Ôrungu'
      });
      onClose();
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
          'La fenêtre popup a été bloquée par le navigateur. Veuillez autoriser les fenêtres contextuelles.'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md warm-card-gradient border-2 border-[#d97706]/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#27150c] text-[#a8826d] hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-[#c85a32] via-[#f59e0b] to-[#0d9488] shadow-lg mb-1">
            <div className="w-full h-full bg-white rounded-[14px] overflow-hidden flex items-center justify-center p-0.5 shadow-inner">
              <img
                src="/assets/aistudio/LOGO-symbole_1c65e221.png"
                alt="Logo Nkala"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-white font-serif">
              Connexion à Nkala
            </h3>
            <p className="text-xs text-[#d4af94]">
              Accès réservé aux contributeurs et locuteurs Myènè
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#7f1d1d]/40 border border-[#ef4444]/40 rounded-xl text-xs text-[#fecaca] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* TAB 1: Google */}
        {(
          <div className="space-y-3.5">
            <button
              onClick={handleGooglePopupLogin}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-[#1f2937] font-bold text-xs shadow-md flex items-center justify-center gap-3 active:scale-98 transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                {isLoading ? 'Connexion en cours...' : 'Continuer avec Google'}
              </span>
            </button>

            <div className="p-3 bg-[#180d07] rounded-xl border border-[#3b1d10] text-[11px] text-[#a8826d] text-center">
              🔒 Connexion sécurisée au compte contributeur Nkala.
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
