import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithEmailAndPassword, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { basculerFavori, chargerProfil, enregistrerFavoris, messageErreurAuth, type UserProfile } from '@nkala/noyau';
import { auth } from './firebase';

interface Etat {
  /** false tant que la session enregistrée n'a pas été relue. */
  pret: boolean;
  profil: UserProfile | null;
  erreurProfil: string | null;
  connexion: (email: string, mdp: string, creer: boolean) => Promise<void>;
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

  const recharger = useCallback(async () => {
    if (!auth.currentUser) { setProfil(null); return; }
    try {
      setProfil(await chargerProfil());
      setErreurProfil(null);
    } catch (e) {
      setErreurProfil((e as Error).message);
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    if (u) await recharger(); else setProfil(null);
    setPret(true);
  }), [recharger]);

  const connexion = useCallback(async (email: string, mdp: string, creer: boolean) => {
    const e = email.trim().toLowerCase();
    try {
      await (creer ? createUserWithEmailAndPassword(auth, e, mdp) : signInWithEmailAndPassword(auth, e, mdp));
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

  const deconnexion = useCallback(async () => { await fbSignOut(auth); setProfil(null); }, []);

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
