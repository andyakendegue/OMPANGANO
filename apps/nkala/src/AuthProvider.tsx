import AsyncStorage from '@react-native-async-storage/async-storage';
import { ecrireSecret, effacerSecret, lireSecret } from './coffre';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { api, basculerFavori, chargerProfil, definirSessionSms, enregistrerFavoris, jetonSessionSms, messageErreurAuth, verifierCodeSms, type UserProfile } from '@nkala/noyau';
import { usePrefs } from './Prefs';
import { auth } from './firebase';

interface Etat {
  /** false tant que la session enregistrée n'a pas été relue. */
  pret: boolean;
  profil: UserProfile | null;
  erreurProfil: string | null;
  deconnexion: () => Promise<void>;
  /** Web : fenêtre Google de Firebase. */
  googleWeb: () => Promise<void>;
  /** Mobile : jeton d'identité Google obtenu par expo-auth-session. */
  googleJeton: (idToken: string) => Promise<void>;
  recharger: () => Promise<void>;
  /** Connexion par SMS (Twilio) : le code reçu par message ouvre une session de l'API. */
  connexionSms: (telephone: string, code: string) => Promise<void>;
  /** Essai sans compte : jeux, leçons et écoute en local ; contribuer, annonces et classements demandent un compte. */
  invite: boolean;
  entrerInvite: () => void;
  /** Ajoute ou retire une fiche des favoris (mise à jour immédiate, puis envoi au serveur). */
  favori: (itemId: string) => Promise<void>;
}

const Ctx = createContext<Etat | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth hors de AuthProvider');
  return c;
};

const CLE_SMS = 'nkala_session_sms';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { prefs, regler } = usePrefs();
  const [pret, setPret] = useState(false);
  const [smsPret, setSmsPret] = useState(false);
  const [profil, setProfil] = useState<UserProfile | null>(null);
  const [erreurProfil, setErreurProfil] = useState<string | null>(null);

  // Copie locale du profil : sans réseau au démarrage (village), la session et le profil sont restaurés comme sur le site web.
  const CLE_PROFIL = 'nkala_profil_cache';
  const recharger = useCallback(async () => {
    if (!auth.currentUser && !jetonSessionSms()) { setProfil(null); return; }
    const uidCourant = auth.currentUser?.uid ?? (jetonSessionSms() ? 'sms' : '');
    try {
      let p = await chargerProfil();
      try {
        const local = JSON.parse((await AsyncStorage.getItem(`nkala_favoris_${p.id}`)) || 'null');
        if (local?.enAttente && Array.isArray(local.ids)) {
          p = { ...p, favoriteItemIds: local.ids };
          enregistrerFavoris(local.ids).then(() => AsyncStorage.setItem(`nkala_favoris_${p.id}`, JSON.stringify({ ids: local.ids, enAttente: false }))).catch(() => {});
        }
      } catch { /* pas de copie locale */ }
      setProfil(p);
      setErreurProfil(null);
      AsyncStorage.setItem(CLE_PROFIL, JSON.stringify(p)).catch(() => {});
    } catch (e) {
      try {
        const copie = JSON.parse((await AsyncStorage.getItem(CLE_PROFIL)) || 'null');
        if (copie && (copie.id === auth.currentUser?.uid || (uidCourant === 'sms' && String(copie.id).startsWith('tel_'))) && (((e as { status?: number }).status ?? 0) === 0 || ((e as { status?: number }).status ?? 0) >= 500)) { setProfil(prev => prev ?? copie); setErreurProfil(null); return; }
      } catch { /* pas de copie */ }
      // Session SMS expirée ou révoquée : retour à l'écran de connexion
      if ((e as { status?: number }).status === 401 && jetonSessionSms() && !auth.currentUser) { definirSessionSms(null); effacerSecret(CLE_SMS); setProfil(null); return; }
      setErreurProfil((e as Error).message);
    }
  }, []);

  // Relecture au retour du réseau et au retour dans l'application (validations, XP, rôle).
  useEffect(() => {
    let etaitHorsLigne = false;
    const r = NetInfo.addEventListener(e => { const hors = e.isConnected === false; if (etaitHorsLigne && !hors) recharger(); etaitHorsLigne = hors; });
    const a = AppState.addEventListener('change', st => { if (st === 'active') recharger(); });
    return () => { r(); a.remove(); };
  }, [recharger]);

  // Session SMS restaurée au démarrage
  useEffect(() => {
    lireSecret(CLE_SMS).then(v => { if (v) definirSessionSms(JSON.parse(v).jeton); }).catch(() => {}).finally(() => setSmsPret(true));
  }, []);

  useEffect(() => { if (!smsPret) return; return onAuthStateChanged(auth, async (u) => {
    if (u || jetonSessionSms()) await recharger(); else setProfil(null);
    setPret(true);
  }); }, [recharger, smsPret]);

  const connexionSms = useCallback(async (telephone: string, code: string) => {
    const r = await verifierCodeSms(telephone, code);
    definirSessionSms(r.jeton);
    await ecrireSecret(CLE_SMS, JSON.stringify({ jeton: r.jeton, uid: r.uid, telephone: r.telephone }));
    regler({ invite: false });
    await recharger();
  }, [recharger, regler]);

  const entrerInvite = useCallback(() => regler({ invite: true }), [regler]);

  const googleWeb = useCallback(async () => {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(auth, p); }
    catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') return;
      throw new Error(messageErreurAuth(String(err?.code || '')).replace('par e-mail', 'avec Google'));
    }
  }, []);

  const googleJeton = useCallback(async (idToken: string) => {
    try { await signInWithCredential(auth, GoogleAuthProvider.credential(idToken)); }
    catch (err: any) { throw new Error(messageErreurAuth(String(err?.code || '')).replace('par e-mail', 'avec Google')); }
  }, []);

  const deconnexion = useCallback(async () => {
    if (auth.currentUser) await fbSignOut(auth);
    definirSessionSms(null); effacerSecret(CLE_SMS);
    setProfil(null); regler({ invite: false }); AsyncStorage.removeItem('nkala_profil_cache').catch(() => {});
  }, [regler]);

  // Favoris : mise à jour immédiate et copie locale ; si le serveur est injoignable ils sont gardés et renvoyés plus tard (comme le web).
  const cleFavoris = (uid: string) => `nkala_favoris_${uid}`;
  const favori = useCallback(async (itemId: string) => {
    if (!profil) return;
    const avant = profil.favoriteItemIds || [];
    const apres = basculerFavori(avant, itemId);
    setProfil({ ...profil, favoriteItemIds: apres });
    await AsyncStorage.setItem(cleFavoris(profil.id), JSON.stringify({ ids: apres, enAttente: true })).catch(() => {});
    try {
      await enregistrerFavoris(apres);
      await AsyncStorage.setItem(cleFavoris(profil.id), JSON.stringify({ ids: apres, enAttente: false })).catch(() => {});
    } catch (e) {
      const st = (e as { status?: number }).status ?? 0;
      if (st !== 0 && st < 500) { // refus définitif du serveur : on annule
        setProfil(p => (p ? { ...p, favoriteItemIds: avant } : p));
        await AsyncStorage.setItem(cleFavoris(profil.id), JSON.stringify({ ids: avant, enAttente: false })).catch(() => {});
      }
    }
  }, [profil]);

  const valeur = useMemo(() => ({ pret, profil, erreurProfil, deconnexion, googleWeb, googleJeton, recharger, favori, connexionSms, invite: prefs.invite, entrerInvite }), [pret, profil, erreurProfil, deconnexion, googleWeb, googleJeton, recharger, favori, connexionSms, prefs.invite, entrerInvite]);
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}
