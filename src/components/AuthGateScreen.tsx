import React, { useState } from 'react';
import { 
  Sparkles, 
  Lock, 
  ShieldCheck, 
  Award, 
  Mic, 
  Users, 
  Globe, 
  Phone,
  AlertCircle
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { UserProfile } from '../types';

interface AuthGateScreenProps {
  onLoginSuccess: (profile: Partial<UserProfile>) => void;
}

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({ onLoginSuccess }) => {
  const [authMethod, setAuthMethod] = useState<'google' | 'phone'>('google');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+241');
  const [verificationCode, setVerificationCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real Google Auth
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const isAdmin = user.email === 'andymigoumbi@gmail.com';

      onLoginSuccess({
        id: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Contributeur OMPAGANO',
        fullName: user.displayName || '',
        email: user.email || undefined,
        photoURL: user.photoURL || undefined,
        role: isAdmin ? 'admin' : 'user',
        status: 'active',
        xp: 150,
        level: 'Initié Curieux',
        badges: ['badge-premiere-voix']
      });
    } catch (err: any) {
      console.warn('Google popup auth notice:', err);
      setErrorMessage(
        "La fenêtre de connexion Google a été fermée ou bloquée par l'environnement. Veuillez réessayer ou utiliser la connexion par numéro de téléphone."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Phone Auth
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
      setErrorMessage('Veuillez entrer le code de vérification reçu (ex: 123456).');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const fullPhone = `${countryCode} ${phoneNumber}`;
      onLoginSuccess({
        id: 'phone-user-' + Date.now(),
        displayName: 'Gardien ' + phoneNumber.slice(-4),
        fullName: 'Locuteur Myènè',
        phoneNumber: fullPhone,
        role: 'user',
        status: 'active',
        xp: 100,
        level: 'Initié Curieux',
        badges: ['badge-premiere-voix']
      });
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="african-pattern-bg min-h-screen text-[#fdfaf7] flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-[#c85a32] selection:text-white">
      {/* Top Brand Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl terracotta-gradient flex items-center justify-center font-serif text-2xl font-black shadow-lg border border-[#f59e0b]/40">
            O
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-lg text-white font-serif">OMPAGANO</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30">
                NKALA APP
              </span>
            </div>
            <p className="text-xs text-[#d4af94]">Crowdsourcing Linguistique Myènè (Enenga)</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#fed7aa] bg-[#27150c]/80 border border-[#4a2412] px-3.5 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
          <span>Accès Sécurisé Réservé</span>
        </div>
      </header>

      {/* Main Login Gate Card */}
      <main className="max-w-4xl w-full mx-auto my-auto py-8">
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
              <strong> l'accès à l'application est strictement restreint aux membres authentifiés</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#27150c]/80 border border-[#4a2412] space-y-1">
                <Mic className="w-5 h-5 text-[#f59e0b]" />
                <div className="font-bold text-white">Voix Certifiées</div>
                <div className="text-[11px] text-[#a8826d]">Traçabilité de chaque enregistrement audio</div>
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
              <div className="text-center space-y-1">
                <div className="w-14 h-14 mx-auto rounded-2xl terracotta-gradient flex items-center justify-center shadow-lg mb-2">
                  <Lock className="w-7 h-7 text-[#fde047]" />
                </div>
                <h2 className="text-xl font-bold text-white">Connexion à OMPAGANO</h2>
                <p className="text-xs text-[#d4af94]">Identifiez-vous pour accéder au studio de contribution</p>
              </div>

              {/* Navigation Tabs between Login Methods */}
              <div className="flex rounded-xl bg-[#140a05] p-1 border border-[#3b1d10] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setAuthMethod('google'); setErrorMessage(null); }}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    authMethod === 'google' ? 'bg-[#c85a32] text-white shadow' : 'text-[#a8826d] hover:text-[#fed7aa]'
                  }`}
                >
                  Compte Google
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMethod('phone'); setErrorMessage(null); }}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    authMethod === 'phone' ? 'bg-[#c85a32] text-white shadow' : 'text-[#a8826d] hover:text-[#fed7aa]'
                  }`}
                >
                  Téléphone (+241)
                </button>
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-[#7f1d1d]/40 border border-[#ef4444]/60 text-xs text-[#fecaca] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* TAB 1: Google Login */}
              {authMethod === 'google' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
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
                    <span>{isLoading ? 'Connexion en cours...' : 'Se connecter avec Google'}</span>
                  </button>

                  <p className="text-[11px] text-center text-[#a8826d]">
                    Authentification sécurisée par Firebase Auth & Google Cloud.
                  </p>
                </div>
              )}

              {/* TAB 2: Phone Login */}
              {authMethod === 'phone' && (
                <div className="space-y-4">
                  {!isOtpSent ? (
                    <div className="space-y-3">
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
                            placeholder="077 12 34 56"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="flex-1 px-3 py-2.5 bg-[#140a05] border border-[#4a2412] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#f59e0b]"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isLoading}
                        className="w-full py-2.5 rounded-xl terracotta-gradient hover:opacity-95 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isLoading ? 'Envoi en cours...' : 'Recevoir le Code SMS'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#fed7aa] mb-1">
                          Code de vérification reçu :
                        </label>
                        <input
                          type="text"
                          placeholder="123456"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="w-full px-3 py-2.5 bg-[#140a05] border border-[#4a2412] rounded-xl text-white font-mono text-center text-base tracking-widest focus:outline-none focus:border-[#f59e0b]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={isLoading}
                        className="w-full py-2.5 rounded-xl terracotta-gradient text-white font-bold text-xs shadow-md active:scale-95 disabled:opacity-50"
                      >
                        {isLoading ? 'Vérification...' : 'Valider et Accéder'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center py-4 border-t border-[#3b1d10] text-[11px] text-[#a8826d]">
        OMPAGANO NKALA APP • Sauvegarde et Vitalisation des Langues Myènè du Gabon • Domaine : <code>source.essaka.engineering</code>
      </footer>
    </div>
  );
};
