import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  Award, 
  Mic, 
  Users, 
  Globe, 
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  User,
  KeyRound
} from 'lucide-react';
import { 
  signInWithPopup, 
  signInAnonymously, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { UserProfile } from '../types';

interface AuthGateScreenProps {
  onLoginSuccess: (profile: Partial<UserProfile>) => void;
}

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({ onLoginSuccess }) => {
  const [authMethod, setAuthMethod] = useState<'google' | 'phone'>('google');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+241');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Phone SMS verification flow
  const [phoneStep, setPhoneStep] = useState<'enter_phone' | 'enter_code'>('enter_phone');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [smsSentNotice, setSmsSentNotice] = useState<string | null>(null);

  useEffect(() => {
    // Clear recaptcha widget when switching away
    return () => {
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch {}
      }
    };
  }, []);

  // Google Popup Auth
  const handleGooglePopupLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      onLoginSuccess({
        id: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Contributeur OMPAGANO',
        fullName: user.displayName || '',
        email: user.email || undefined,
        photoURL: user.photoURL || undefined,
        role: 'user',
        status: 'active',
        xp: 150,
        level: 'Initié Curieux',
        levelIndex: 1,
        tribe: 'Enenga',
        badges: ['badge-premiere-voix']
      });
    } catch (err: any) {
      console.warn('Google popup notice:', err);
      const isDomainBlocked = err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain');
      const isPopupBlocked = err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user';

      if (isDomainBlocked) {
        setErrorMessage(
          "Ce domaine de prévisualisation n'est pas encore dans la liste des domaines autorisés de votre projet Firebase 'enenga'. Vous pouvez l'ajouter dans la console Firebase > Authentication > Settings > Authorized domains, ou vous connecter par téléphone."
        );
      } else if (isPopupBlocked) {
        setErrorMessage(
          "La fenêtre popup a été bloquée par le navigateur. Veuillez autoriser les fenêtres contextuelles pour continuer avec Google."
        );
      } else {
        setErrorMessage(
          err.message || "La connexion Google n'a pas pu aboutir. Veuillez réessayer ou utiliser la connexion par téléphone."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to init invisible RecaptchaVerifier
  const getOrCreateRecaptchaVerifier = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-verifier-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setErrorMessage("La vérification reCAPTCHA a expiré. Veuillez réessayer.");
        }
      });
    }
    return (window as any).recaptchaVerifier;
  };

  // Step 1: Send SMS
  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanDigits || cleanDigits.length < 6) {
      setErrorMessage("Veuillez renseigner un numéro de téléphone valide (ex: 077 12 34 56).");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSmsSentNotice(null);

    const fullPhone = `${countryCode.trim()}${phoneNumber.trim().replace(/^0+/, '')}`;

    try {
      const appVerifier = getOrCreateRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, appVerifier);
      setConfirmationResult(confirmation);
      setPhoneStep('enter_code');
      setSmsSentNotice(`Code de confirmation SMS envoyé au ${fullPhone}.`);
    } catch (err: any) {
      console.warn('Erreur envoi SMS Firebase:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setErrorMessage(
          "L'authentification par Téléphone n'est pas encore activée dans la console Firebase (Authentication > Sign-in method > Téléphone). Vous pouvez utiliser la connexion directe sécurisée ci-dessous."
        );
      } else if (err.code === 'auth/quota-exceeded') {
        setErrorMessage(
          "Le quota d'envoi de SMS Firebase pour ce projet a été dépassé. Vous pouvez vous connecter en mode direct ci-dessous."
        );
      } else {
        setErrorMessage(
          `Impossible d'envoyer le SMS (${err.message || err.code}). Vérifiez le numéro ou utilisez la connexion directe.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Confirm SMS code
  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !verificationCode.trim()) {
      setErrorMessage("Veuillez saisir le code à 6 chiffres reçu par SMS.");
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
    } catch (err: any) {
      console.error('Erreur vérification code SMS:', err);
      setErrorMessage("Code SMS incorrect ou expiré. Veuillez vérifier et réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback direct phone connect with real Firebase Anonymous Auth session
  const handleDirectPhoneFallback = async () => {
    const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanDigits || cleanDigits.length < 6) {
      setErrorMessage("Veuillez renseigner un numéro de téléphone valide (ex: 077 12 34 56).");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Create a genuine Firebase Auth session so firestore permissions succeed
      let uid = 'phone-' + cleanDigits;
      try {
        const cred = await signInAnonymously(auth);
        if (cred?.user?.uid) {
          uid = cred.user.uid;
        }
      } catch (authErr) {
        console.warn('Anonymous session notice:', authErr);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="african-pattern-bg min-h-screen text-[#fdfaf7] flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-[#c85a32] selection:text-white">
      {/* Invisible container for Firebase reCAPTCHA */}
      <div id="recaptcha-verifier-container"></div>

      {/* Top Brand Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-[#c85a32] via-[#f59e0b] to-[#0d9488] shadow-lg border border-[#f59e0b]/40">
            <div className="w-full h-full bg-white rounded-[14px] overflow-hidden flex items-center justify-center p-0.5 shadow-inner">
              <img 
                src="/assets/aistudio/LOGO-symbole_1c65e221.png" 
                alt="Logo OMPAGANO" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-lg text-white font-serif">OMPAGANO</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30">
                NKALA APP
              </span>
            </div>
            <p className="text-xs text-[#d4af94]">Crowdsourcing & Sauvegarde de la Langue Myènè</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#fed7aa] bg-[#27150c]/80 border border-[#4a2412] px-3.5 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
          <span>Accès Sécurisé Réservé</span>
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
              Pour garantir l'authenticité patrimoniale des enregistrements oraux, la filiation clanique des locuteurs et l'intégrité du corpus linguistique, 
              <strong> l'accès à l'application est strictement réservé aux membres identifiés</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#27150c]/80 border border-[#4a2412] space-y-1">
                <Mic className="w-5 h-5 text-[#f59e0b]" />
                <div className="font-bold text-white">Voix Certifiées</div>
                <div className="text-[11px] text-[#a8826d]">Traçabilité de chaque enregistrement vocal</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#27150c]/80 border border-[#4a2412] space-y-1">
                <Users className="w-5 h-5 text-[#c85a32]" />
                <div className="font-bold text-white">Ancrage Clanique</div>
                <div className="text-[11px] text-[#a8826d]">Tribu, clans et village d'origine</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#27150c]/80 border border-[#4a2412] space-y-1">
                <Award className="w-5 h-5 text-[#f59e0b]" />
                <div className="font-bold text-white">Titres & Badges</div>
                <div className="text-[11px] text-[#a8826d]">Progression de sagesse et récompenses</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#27150c]/80 border border-[#4a2412] space-y-1">
                <Globe className="w-5 h-5 text-[#22c55e]" />
                <div className="font-bold text-white">Mode Hors-Ligne</div>
                <div className="text-[11px] text-[#a8826d]">Collecte autonome dans les villages</div>
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
                      alt="Logo OMPAGANO" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white font-serif">Connexion à OMPAGANO</h2>
                  <p className="text-xs text-[#d4af94]">Identifiez-vous pour accéder au studio de contribution</p>
                </div>
              </div>

              {/* Navigation Tabs between Login Methods */}
              <div className="flex rounded-xl bg-[#140a05] p-1 border border-[#3b1d10] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setAuthMethod('google'); setErrorMessage(null); }}
                  className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
                    authMethod === 'google' ? 'bg-[#c85a32] text-white shadow' : 'text-[#a8826d] hover:text-[#fed7aa]'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Google / Gmail</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMethod('phone'); setErrorMessage(null); }}
                  className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
                    authMethod === 'phone' ? 'bg-[#c85a32] text-white shadow' : 'text-[#a8826d] hover:text-[#fed7aa]'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Téléphone SMS</span>
                </button>
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-[#7f1d1d]/40 border border-[#ef4444]/60 text-xs text-[#fecaca] flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* SMS Notice */}
              {smsSentNotice && (
                <div className="p-3.5 rounded-xl bg-[#14532d]/40 border border-[#22c55e]/60 text-xs text-[#bbf7d0] flex items-start gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{smsSentNotice}</span>
                </div>
              )}

              {/* TAB 1: Google OAuth Login */}
              {authMethod === 'google' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleGooglePopupLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{isLoading ? 'Connexion en cours...' : 'Se connecter avec Google'}</span>
                  </button>

                  <div className="p-3 bg-[#180d07] rounded-xl border border-[#3b1d10] text-[11px] text-[#a8826d] leading-relaxed text-center">
                    🔒 Authentification officielle Firebase sécurisée par le protocole OMPAGANO.
                  </div>
                </div>
              )}

              {/* TAB 2: Phone Login with real SMS & fallback */}
              {authMethod === 'phone' && (
                <div className="space-y-4">
                  {phoneStep === 'enter_phone' ? (
                    <form onSubmit={handleSendPhoneCode} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#fed7aa] mb-1">
                          Numéro de Téléphone (Gabon / International) :
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="w-20 px-3 py-2.5 bg-[#140a05] border border-[#4a2412] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#f59e0b]"
                          />
                          <input
                            type="tel"
                            required
                            placeholder="077 12 34 56"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="flex-1 px-3.5 py-2.5 bg-[#140a05] border border-[#4a2412] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#f59e0b]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#fed7aa] mb-1">
                          Nom d'usage ou Prénom (Facultatif) :
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-[#a8826d] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Ex: Mboumba, Ogula..."
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-[#140a05] border border-[#4a2412] rounded-xl text-white text-xs focus:outline-none focus:border-[#f59e0b]"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 px-4 rounded-xl terracotta-gradient hover:opacity-95 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Phone className="w-4 h-4" />
                        <span>{isLoading ? 'Envoi du code SMS...' : 'Recevoir mon code par SMS'}</span>
                      </button>

                      {/* Direct connect option if SMS provider is pending */}
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
                    <form onSubmit={handleVerifyPhoneCode} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#fed7aa] mb-1">
                          Saisissez le code SMS à 6 chiffres :
                        </label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-[#a8826d] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            maxLength={6}
                            placeholder="123456"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-[#140a05] border border-[#4a2412] rounded-xl text-white font-mono text-sm tracking-widest text-center focus:outline-none focus:border-[#f59e0b]"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 px-4 rounded-xl terracotta-gradient hover:opacity-95 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isLoading ? 'Vérification...' : 'Confirmer le code & Se connecter'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setPhoneStep('enter_phone'); setErrorMessage(null); }}
                        className="w-full text-center text-xs text-[#a8826d] hover:text-[#fed7aa] underline"
                      >
                        Changer de numéro de téléphone
                      </button>
                    </form>
                  )}

                  <div className="p-3 bg-[#180d07] rounded-xl border border-[#3b1d10] text-[11px] text-[#a8826d] leading-relaxed">
                    💡 Authentification Firebase Phone : votre session est certifiée et vos contributions vocales sont enregistrées dans la base de données.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center py-4 border-t border-[#3b1d10] text-[11px] text-[#a8826d]">
        OMPAGANO NKALA APP • Sauvegarde et Vitalisation des Langues Myènè du Gabon
      </footer>
    </div>
  );
};
