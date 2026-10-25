import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  User,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { 
  signInWithPopup, 
  signInAnonymously,
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult 
} from 'firebase/auth';
import { auth, googleProvider, checkIsAdminEmail } from '../firebase';
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
  const [authMethod, setAuthMethod] = useState<'google' | 'phone'>('google');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+241');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Phone verification state
  const [phoneStep, setPhoneStep] = useState<'enter_phone' | 'enter_code'>('enter_phone');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    return () => {
      if ((window as any).modalRecaptchaVerifier) {
        try {
          (window as any).modalRecaptchaVerifier.clear();
        } catch {}
      }
    };
  }, []);

  if (!isOpen) return null;

  // Google Popup Auth
  const handleGooglePopupLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const isUserAdmin = checkIsAdminEmail(user.email);
      onLoginSuccess({
        id: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Contributeur OMPAGANO',
        fullName: user.displayName || '',
        email: user.email || undefined,
        photoURL: user.photoURL || undefined,
        role: isUserAdmin ? 'admin' : 'user',
        status: 'active',
        xp: 150,
        level: 'Initié Curieux',
        levelIndex: 1,
        tribe: 'Enenga',
        badges: ['badge-premiere-voix']
      });
      onClose();
    } catch (err: any) {
      console.warn('Google popup notice:', err);
      const isDomainBlocked = err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain');
      const isPopupBlocked = err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user';

      if (isDomainBlocked) {
        setErrorMessage(
          "Ce domaine de prévisualisation n'est pas configuré dans Firebase. Utilisez la connexion téléphonique."
        );
      } else if (isPopupBlocked) {
        setErrorMessage(
          "La fenêtre popup a été bloquée par le navigateur. Veuillez autoriser les fenêtres contextuelles."
        );
      } else {
        setErrorMessage(
          err.message || "La connexion Google n'a pas pu aboutir. Veuillez utiliser la connexion par téléphone."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for RecaptchaVerifier
  const getOrCreateRecaptchaVerifier = () => {
    if (!(window as any).modalRecaptchaVerifier) {
      (window as any).modalRecaptchaVerifier = new RecaptchaVerifier(auth, 'modal-recaptcha-container', {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          setErrorMessage("reCAPTCHA expiré. Veuillez réessayer.");
        }
      });
    }
    return (window as any).modalRecaptchaVerifier;
  };

  // Step 1: Send SMS
  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanDigits || cleanDigits.length < 6) {
      setErrorMessage("Veuillez renseigner un numéro de téléphone valide.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const fullPhone = `${countryCode.trim()}${phoneNumber.trim().replace(/^0+/, '')}`;

    try {
      const appVerifier = getOrCreateRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, appVerifier);
      setConfirmationResult(confirmation);
      setPhoneStep('enter_code');
    } catch (err: any) {
      console.warn('Erreur envoi SMS Firebase:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setErrorMessage("L'authentification Téléphone doit être activée dans la console Firebase. Vous pouvez vous connecter en mode direct ci-dessous.");
      } else {
        setErrorMessage(`Impossible d'envoyer le SMS (${err.message || err.code}). Vous pouvez continuer avec la connexion directe.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Confirm SMS code
  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !verificationCode.trim()) {
      setErrorMessage("Veuillez saisir le code à 6 chiffres reçu.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const userCredential = await confirmationResult.confirm(verificationCode.trim());
      const user = userCredential.user;
      const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
      const fullPhone = `${countryCode.trim()} ${phoneNumber.trim()}`;
      const displayName = userName.trim() || ('Gardien ' + cleanDigits.slice(-4));
      const fullName = userName.trim() || 'Locuteur Myènè';

      onLoginSuccess({
        id: user.uid,
        phoneNumber: user.phoneNumber || fullPhone,
        contact: user.phoneNumber || fullPhone,
        displayName,
        fullName,
        role: 'user',
        status: 'active',
        xp: 150,
        level: 'Initié Curieux',
        levelIndex: 1,
        tribe: 'Enenga',
        badges: ['badge-premiere-voix']
      });
      onClose();
    } catch (err: any) {
      console.error('Erreur vérification code:', err);
      setErrorMessage("Code SMS incorrect ou expiré.");
    } finally {
      setIsLoading(false);
    }
  };

  // Direct Phone Fallback with Anonymous Auth
  const handleDirectPhoneFallback = async () => {
    const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanDigits || cleanDigits.length < 6) {
      setErrorMessage("Veuillez renseigner un numéro de téléphone valide.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      let uid = 'phone-' + cleanDigits;
      try {
        const cred = await signInAnonymously(auth);
        if (cred?.user?.uid) uid = cred.user.uid;
      } catch (authErr) {
        console.warn('Notice anonymous session:', authErr);
      }

      const fullPhone = `${countryCode.trim()} ${phoneNumber.trim()}`;
      const displayName = userName.trim() || ('Gardien ' + cleanDigits.slice(-4));
      const fullName = userName.trim() || 'Locuteur Myènè';

      onLoginSuccess({
        id: uid,
        phoneNumber: fullPhone,
        contact: fullPhone,
        displayName,
        fullName,
        role: 'user',
        status: 'active',
        xp: 150,
        level: 'Initié Curieux',
        levelIndex: 1,
        tribe: 'Enenga',
        badges: ['badge-premiere-voix']
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div id="modal-recaptcha-container"></div>
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
                alt="Logo OMPAGANO" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-white font-serif">Connexion à OMPAGANO</h3>
            <p className="text-xs text-[#d4af94]">
              Accès réservé aux contributeurs et locuteurs Myènè
            </p>
          </div>
        </div>

        {/* Navigation Tabs between Login Methods */}
        <div className="flex rounded-xl bg-[#140a05] p-1 border border-[#3b1d10] text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setAuthMethod('google'); setErrorMessage(null); }}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              authMethod === 'google' ? 'bg-[#c85a32] text-white shadow' : 'text-[#a8826d] hover:text-[#fed7aa]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Google</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('phone'); setErrorMessage(null); }}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              authMethod === 'phone' ? 'bg-[#c85a32] text-white shadow' : 'text-[#a8826d] hover:text-[#fed7aa]'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Téléphone SMS</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#7f1d1d]/40 border border-[#ef4444]/40 rounded-xl text-xs text-[#fecaca] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* TAB 1: Google */}
        {authMethod === 'google' && (
          <div className="space-y-3.5">
            <button
              onClick={handleGooglePopupLogin}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-[#1f2937] font-bold text-xs shadow-md flex items-center justify-center gap-3 active:scale-98 transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isLoading ? 'Connexion en cours...' : 'Continuer avec Google'}</span>
            </button>

            <div className="p-3 bg-[#180d07] rounded-xl border border-[#3b1d10] text-[11px] text-[#a8826d] text-center">
              🔒 Connexion sécurisée au compte contributeur OMPAGANO.
            </div>
          </div>
        )}

        {/* TAB 2: Phone */}
        {authMethod === 'phone' && (
          <div className="space-y-3.5">
            {phoneStep === 'enter_phone' ? (
              <form onSubmit={handleSendPhoneCode} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#fed7aa] mb-1">
                    Numéro de Téléphone :
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-20 px-2.5 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#f59e0b]"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="077 12 34 56"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#f59e0b]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#fed7aa] mb-1">
                    Nom d'usage (facultatif) :
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[#a8826d] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ex: Mboumba, Onanga..."
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-white text-xs focus:outline-none focus:border-[#f59e0b]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl terracotta-gradient hover:opacity-95 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Phone className="w-4 h-4" />
                  <span>{isLoading ? 'Envoi...' : 'Recevoir mon code SMS'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDirectPhoneFallback}
                  disabled={isLoading}
                  className="w-full py-2 px-3 rounded-xl bg-[#24130a] hover:bg-[#341b10] text-[#fed7aa] font-medium text-[11px] border border-[#4a2412] transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Continuer sans SMS (Connexion directe)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneCode} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#fed7aa] mb-1">
                    Code SMS reçu :
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-[#a8826d] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-[#140a05] border border-[#4a2412] rounded-xl text-white font-mono text-sm tracking-widest text-center focus:outline-none focus:border-[#f59e0b]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl terracotta-gradient hover:opacity-95 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isLoading ? 'Vérification...' : 'Valider le code'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setPhoneStep('enter_phone'); setErrorMessage(null); }}
                  className="w-full text-center text-[11px] text-[#a8826d] hover:text-[#fed7aa] underline"
                >
                  Changer de numéro
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
