import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
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
  const [authMethod, setAuthMethod] = useState<'options' | 'phone'>('options');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+241');
  const [verificationCode, setVerificationCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const isAdmin = user.email === 'andymigoumbi@gmail.com';

      onLoginSuccess({
        id: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Contributeur Enenga',
        email: user.email || undefined,
        photoURL: user.photoURL || undefined,
        role: isAdmin ? 'admin' : 'user',
        xp: 150,
        level: 'Initié Curieux',
        badges: ['badge-premiere-voix']
      });
      onClose();
    } catch (err: any) {
      console.warn('Google Auth popup notice:', err);
      // Fallback in case popup was blocked in iframe
      setErrorMessage("Le popup Google s'est fermé ou a été bloqué par le navigateur. Vous pouvez continuer avec votre numéro de téléphone ou en mode direct.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = () => {
    if (!phoneNumber || phoneNumber.length < 6) {
      setErrorMessage('Veuillez saisir un numéro de téléphone valide.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsOtpSent(true);
      setIsLoading(false);
    }, 700);
  };

  const handleVerifyOtp = () => {
    if (!verificationCode || verificationCode.length < 4) {
      setErrorMessage('Veuillez entrer le code de confirmation (Ex: 123456).');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const fullPhone = `${countryCode} ${phoneNumber}`;
      onLoginSuccess({
        id: 'phone-user-' + Date.now(),
        displayName: 'Gardien ' + phoneNumber.slice(-4),
        phoneNumber: fullPhone,
        role: 'user',
        xp: 100,
        level: 'Initié Curieux',
        badges: ['badge-plume-enenga']
      });
      setIsLoading(false);
      onClose();
    }, 600);
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
        <div className="text-center space-y-1">
          <div className="w-12 h-12 mx-auto rounded-2xl terracotta-gradient flex items-center justify-center shadow-lg mb-2">
            <Sparkles className="w-6 h-6 text-[#fde047]" />
          </div>
          <h3 className="text-xl font-black text-white">Connexion à OMPAGANO</h3>
          <p className="text-xs text-[#d4af94]">
            Rejoignez la communauté de préservation de la langue Myènè Enenga
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#7f1d1d]/40 border border-[#ef4444]/40 rounded-xl text-xs text-[#fecaca] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {authMethod === 'options' ? (
          <div className="space-y-3">
            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-neutral-100 text-[#1f2937] font-bold text-sm shadow-md flex items-center justify-center gap-3 active:scale-98 transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continuer avec Google</span>
            </button>

            {/* Phone Login Button */}
            <button
              onClick={() => setAuthMethod('phone')}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#2b170e] hover:bg-[#381e13] border border-[#d97706]/40 text-[#fed7aa] font-bold text-sm shadow-md flex items-center justify-center gap-3 active:scale-98 transition-all"
            >
              <Phone className="w-5 h-5 text-[#f59e0b]" />
              <span>Connexion avec Numéro de Téléphone</span>
            </button>
          </div>
        ) : (
          /* Phone OTP Flow */
          <div className="space-y-4">
            {!isOtpSent ? (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#fed7aa]">
                  Votre Numéro de Téléphone Mobile :
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-28 px-2 py-3 bg-[#180d07] border border-[#522915] rounded-xl text-xs text-white focus:outline-none focus:border-[#f59e0b]"
                  >
                    <option value="+241">🇬🇦 +241</option>
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+237">🇨🇲 +237</option>
                    <option value="+242">🇨🇬 +242</option>
                    <option value="+225">🇨🇮 +225</option>
                    <option value="+221">🇸🇳 +221</option>
                  </select>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="074 00 00 00"
                    className="flex-1 px-3 py-3 bg-[#180d07] border border-[#522915] rounded-xl text-white text-sm focus:outline-none focus:border-[#f59e0b] font-mono"
                  />
                </div>
                <button
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl terracotta-gradient text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>Recevoir le code par SMS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#fed7aa]">
                  Entrez le code reçu au {countryCode} {phoneNumber} :
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Code à 6 chiffres (ex: 849201)"
                  className="w-full px-4 py-3 bg-[#180d07] border border-[#522915] rounded-xl text-center text-lg tracking-widest text-white font-mono focus:outline-none focus:border-[#f59e0b]"
                />
                <button
                  onClick={handleVerifyOtp}
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl terracotta-gradient text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmer & Accéder</span>
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setAuthMethod('options');
                setIsOtpSent(false);
              }}
              className="w-full text-center text-xs text-[#a8826d] hover:text-white pt-1"
            >
              Retour aux options de connexion
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
