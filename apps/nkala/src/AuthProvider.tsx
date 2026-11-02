import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { chargerProfil, messageErreurAuth, type UserProfile } from '@nkala/noyau';
import { auth } from './firebase';

interface Etat {
  /** false tant que la session enregistrée n'a pas été relue. */
  pret: boolean;
  profil: UserProfile | null;
  erreurProfil: string | null;
  connexion: (email: string, mdp: string, creer: boolean) => Promise<void>;
  deconnexion: () => Promise<void>;
  recharger: () => Promise<void>;
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

  const deconnexion = useCallback(async () => { await fbSignOut(auth); setProfil(null); }, []);

  const valeur = useMemo(() => ({ pret, profil, erreurProfil, connexion, deconnexion, recharger }), [pret, profil, erreurProfil, connexion, deconnexion, recharger]);
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}
