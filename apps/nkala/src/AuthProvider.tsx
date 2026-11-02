import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithEmailAndPassword, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { api, basculerFavori, chargerProfil, enregistrerFavoris, messageErreurAuth, type UserProfile } from '@nkala/noyau';
import { auth } from './firebase';

interface Etat {
  /** false tant que la session enregistrée n'a pas été relue. */
  pret: boolean;
  profil: UserProfile | null;
  erreurProfil: string | null;
  connexion: (email: string, mdp: string, creer: boolean, nomUsage?: string) => Promise<void>;
  deconnexion: () => Promise<void>;
  /** Web : fenêtre Google de Firebase. */
  googleWeb: () => Promise<void>;
  /** Mobile : jeton d'identité Google obtenu par expo-auth-session. */
  googleJeton: (idToken: string) => Promise<void>;
  recharger: () => Promise<void>;
  /** Ajoute ou retire une fiche des favoris (mise à jour immédiate, puis envoi au serveur). */
  favori: (itemId: string) => Promise<void>;
}

const Ctx = createContext<Etat | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth hors de AuthProvider');
  return c;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [pret, setPret] = useState(false);
  const [profil, setProfil] = useState<UserProfile | null>(null);
  const [erreurProfil, setErreurProfil] = useState<string | null>(null);

  // Copie locale du profil : sans réseau au démarrage (village), la session et le profil sont restaurés comme sur le site web.
  const CLE_PROFIL = 'nkala_profil_cache';
  const recharger = useCallback(async () => {
    if (!auth.currentUser) { setProfil(null); return; }
    try {
      const p = await chargerProfil();
      setProfil(p);
      setErreurProfil(null);
      AsyncStorage.setItem(CLE_PROFIL, JSON.stringify(p)).catch(() => {});
    } catch (e) {
      try {
        const copie = JSON.parse((await AsyncStorage.getItem(CLE_PROFIL)) || 'null');
        if (copie && copie.id === auth.currentUser?.uid && (((e as { status?: number }).status ?? 0) === 0 || ((e as { status?: number }).status ?? 0) >= 500)) { setProfil(prev => prev ?? copie); setErreurProfil(null); return; }
      } catch { /* pas de copie */ }
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

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    if (u) await recharger(); else setProfil(null);
    setPret(true);
  }), [recharger]);

  const connexion = useCallback(async (email: string, mdp: string, creer: boolean, nomUsage?: string) => {
    const e = email.trim().toLowerCase();
    try {
      await (creer ? createUserWithEmailAndPassword(auth, e, mdp) : signInWithEmailAndPassword(auth, e, mdp));
      // Nom d'usage choisi à la création du compte (facultatif)
      if (creer && nomUsage?.trim()) await api('PATCH', '/v1/me', { displayName: nomUsage.trim() }).catch(() => {});
    } catch (err: any) {
      throw new Error(messageErreurAuth(String(err?.code || '')));
    }
  }, []);

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

  const deconnexion = useCallback(async () => { await fbSignOut(auth); setProfil(null); AsyncStorage.removeItem('nkala_profil_cache').catch(() => {}); }, []);

  const favori = useCallback(async (itemId: string) => {
    if (!profil) return;
    const avant = profil.favoriteItemIds || [];
    const apres = basculerFavori(avant, itemId);
    setProfil({ ...profil, favoriteItemIds: apres });
    try { await enregistrerFavoris(apres); }
    catch { setProfil(p => (p ? { ...p, favoriteItemIds: avant } : p)); }
  }, [profil]);

  const valeur = useMemo(() => ({ pret, profil, erreurProfil, connexion, deconnexion, googleWeb, googleJeton, recharger, favori }), [pret, profil, erreurProfil, connexion, deconnexion, googleWeb, googleJeton, recharger, favori]);
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}
