/**
 * Progression partagée par tous les modules : un profil, un XP, une série. Le serveur décide de l'XP ; hors ligne ou sans compte,
 * le calcul est fait sur l'appareil (essai sans compte) et les résultats en attente sont renvoyés au retour du réseau.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  chargerProgression, envoyerChapitre, envoyerLecon, envoyerPartie, envoyerUnite, jourLocal, progressionVide, rangPourXp, terminerLecon, uniteValidee, nouveauRang, XP_LECON,
  type EtatRang, type Lecon, type ProgressionServeur, type Rang, scorePartie,
} from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { useFetes } from './Fetes';

type Local = ProgressionServeur & { enAttente: { type: 'lecon' | 'unite' | 'partie' | 'chapitre'; payload: any }[] };
const vide = (): Local => ({ ...progressionVide(), parties: 0, victoires: 0, points: 0, succes: [], defisFaits: {}, amis: [], enAttente: [] } as unknown as Local);

interface Etat {
  donnees: Local; xp: number; rang: EtatRang; chargement: boolean;
  recharger: () => Promise<void>;
  terminerLecon: (l: Lecon, bonnes: number, erreurs: number) => Promise<{ xpGagne: number; nouveauRang: Rang | null }>;
  validerUnite: (uniteId: string, bonnes: number, sur: number) => Promise<{ valide: boolean }>;
  lireChapitre: (livreId: string, chapitreId: string, bonnes: number, sur: number) => Promise<{ xpGagne: number; premiereFois: boolean }>;
  enregistrerPartie: (p: { jeuId: string; bonnes: number; erreurs: number; secondesRestantes?: number; serie?: number; defiId?: string }) => Promise<{ score: number; xpGagne: number }>;
}
const Ctx = createContext<Etat | null>(null);
export const useProgres = () => { const c = useContext(Ctx); if (!c) throw new Error('useProgres hors de ProgresProvider'); return c; };

export function ProgresProvider({ children }: { children: React.ReactNode }) {
  const { profil } = useAuth();
  const { feter } = useFetes();
  const uid = profil?.id ?? 'invite';
  const cle = `nkala_progres_${uid}`;
  const [donnees, setDonnees] = useState<Local>(vide());
  const [chargement, setChargement] = useState(true);
  const ref = useRef(donnees); ref.current = donnees;

  const sauver = useCallback((d: Local) => { setDonnees(d); AsyncStorage.setItem(cle, JSON.stringify(d)).catch(() => {}); }, [cle]);

  const recharger = useCallback(async () => {
    setChargement(true);
    try {
      const brut = await AsyncStorage.getItem(cle);
      let local: Local = brut ? { ...vide(), ...JSON.parse(brut) } : vide();
      if (profil) {
        // Renvoie d'abord les résultats gardés hors ligne, puis relit le serveur
        const restes: Local['enAttente'] = [];
        for (const e of local.enAttente) {
          try {
            if (e.type === 'lecon') await envoyerLecon(e.payload.leconId, e.payload.bonnes, e.payload.erreurs);
            else if (e.type === 'unite') await envoyerUnite(e.payload.uniteId, e.payload.bonnes, e.payload.sur);
            else if (e.type === 'chapitre') await envoyerChapitre(e.payload.livreId, e.payload.chapitreId, e.payload.bonnes, e.payload.sur);
            else await envoyerPartie(e.payload);
          } catch (err) { if (((err as { status?: number }).status ?? 0) === 0 || ((err as { status?: number }).status ?? 0) >= 500) restes.push(e); }
        }
        try { const s = await chargerProgression(); local = { ...local, ...s, enAttente: restes }; } catch { local = { ...local, enAttente: restes }; }
      }
      sauver(local);
    } finally { setChargement(false); }
  }, [cle, profil, sauver]);

  useEffect(() => { recharger(); }, [recharger]);

  const xpBase = Math.max(ref.current.xp ?? 0, 0);

  const apresGain = (avant: number, gain: number, rangServeur: Rang | null | undefined): Rang | null => {
    const r = rangServeur ?? nouveauRang(avant, avant + gain);
    if (r) feter({ type: 'rang', rang: r });
    return r;
  };

  const lecon = useCallback(async (l: Lecon, bonnes: number, erreurs: number) => {
    const avant = ref.current.xp ?? 0;
    const xpLecon = Number(l.xp) > 0 ? Number(l.xp) : XP_LECON;
    const dejaFaite = !!ref.current.leconsTerminees[l.id];
    let local = { ...ref.current, ...terminerLecon(ref.current as any, l, { index: bonnes + erreurs, bonnes, erreurs, termine: true, xp: xpLecon }, jourLocal()) } as Local;
    let gain = dejaFaite ? 0 : xpLecon, rangS: Rang | null | undefined;
    if (profil) {
      try { const r = await envoyerLecon(l.id, bonnes, erreurs); gain = r.xpGagne; rangS = r.nouveauRang as Rang | null; local = { ...local, xp: r.xp, serie: r.serie, recordSerie: r.recordSerie }; }
      catch (e) { if (((e as { status?: number }).status ?? 0) === 0 || ((e as { status?: number }).status ?? 0) >= 500) local = { ...local, xp: avant + gain, enAttente: [...local.enAttente, { type: 'lecon', payload: { leconId: l.id, bonnes, erreurs } }] }; }
    } else local = { ...local, xp: avant + gain };
    sauver(local);
    return { xpGagne: gain, nouveauRang: apresGain(avant, gain, rangS) };
  }, [profil, sauver]); // eslint-disable-line react-hooks/exhaustive-deps

  const unite = useCallback(async (uniteId: string, bonnes: number, sur: number) => {
    const valide = uniteValidee(bonnes, sur);
    let local = { ...ref.current } as Local;
    const avant = local.xp ?? 0;
    if (valide && !local.unitesValidees.includes(uniteId)) local = { ...local, unitesValidees: [...local.unitesValidees, uniteId], xp: avant + 30 };
    if (profil) {
      try { const r = await envoyerUnite(uniteId, bonnes, sur); local = { ...local, xp: r.xp, unitesValidees: valide ? [...new Set([...local.unitesValidees, uniteId])] : local.unitesValidees }; apresGain(avant, r.xpGagne, r.nouveauRang as Rang | null); }
      catch (e) { if (((e as { status?: number }).status ?? 0) === 0 || ((e as { status?: number }).status ?? 0) >= 500) local = { ...local, enAttente: [...local.enAttente, { type: 'unite', payload: { uniteId, bonnes, sur } }] }; }
    } else if (valide) apresGain(avant, 30, null);
    sauver(local);
    return { valide };
  }, [profil, sauver]); // eslint-disable-line react-hooks/exhaustive-deps

  const partie = useCallback(async (p: { jeuId: string; bonnes: number; erreurs: number; secondesRestantes?: number; serie?: number; defiId?: string }) => {
    const avant = ref.current.xp ?? 0;
    const score = scorePartie(p);
    let local = { ...ref.current, parties: ref.current.parties + 1, points: ref.current.points + score, victoires: ref.current.victoires + (p.bonnes > p.erreurs ? 1 : 0) } as Local;
    let gain = Math.min(30, Math.floor(score / 50)), rangS: Rang | null | undefined;
    if (profil) {
      try {
        const r = await envoyerPartie(p); gain = r.xpGagne; rangS = r.nouveauRang as Rang | null; local = { ...local, xp: r.xp, serie: r.serie, succes: [...new Set([...local.succes, ...r.succesDebloques.map(s => s.id)])] };
        r.succesDebloques.forEach(s => feter({ type: 'succes', titre: s.titre, xp: s.xp }));
      } catch (e) { if (((e as { status?: number }).status ?? 0) === 0 || ((e as { status?: number }).status ?? 0) >= 500) local = { ...local, xp: avant + gain, enAttente: [...local.enAttente, { type: 'partie', payload: p }] }; }
    } else local = { ...local, xp: avant + gain };
    sauver(local);
    apresGain(avant, gain, rangS);
    return { score, xpGagne: gain };
  }, [profil, sauver]); // eslint-disable-line react-hooks/exhaustive-deps

  const chapitre = useCallback(async (livreId: string, chapitreId: string, bonnes: number, sur: number) => {
    const avant = ref.current.xp ?? 0;
    const lectures = { ...(ref.current.lectures ?? {}) };
    const premiereFois = !lectures[chapitreId];
    lectures[chapitreId] = { jour: jourLocal(), bonnes: Math.max(bonnes, lectures[chapitreId]?.bonnes ?? 0), sur };
    let local = { ...ref.current, lectures } as Local;
    let gain = premiereFois ? 6 + 2 * Math.min(bonnes, 5) : 0, rangS: Rang | null | undefined;
    if (profil) {
      try {
        const r = await envoyerChapitre(livreId, chapitreId, bonnes, sur); gain = r.xpGagne; rangS = r.nouveauRang as Rang | null; local = { ...local, xp: r.xp, serie: r.serie, succes: [...new Set([...local.succes, ...r.succesDebloques.map(s => s.id)])] };
        r.succesDebloques.forEach(s => feter({ type: 'succes', titre: s.titre, xp: s.xp }));
      } catch (e) { if (((e as { status?: number }).status ?? 0) === 0 || ((e as { status?: number }).status ?? 0) >= 500) local = { ...local, xp: avant + gain, enAttente: [...local.enAttente, { type: 'chapitre', payload: { livreId, chapitreId, bonnes, sur } }] }; else gain = 0; }
    } else local = { ...local, xp: avant + gain };
    sauver(local);
    apresGain(avant, gain, rangS);
    return { xpGagne: gain, premiereFois };
  }, [profil, sauver]); // eslint-disable-line react-hooks/exhaustive-deps

  const valeur = useMemo<Etat>(() => ({ donnees, xp: donnees.xp ?? xpBase, rang: rangPourXp(donnees.xp ?? 0), chargement, recharger, terminerLecon: lecon, validerUnite: unite, lireChapitre: chapitre, enregistrerPartie: partie }), [donnees, xpBase, chargement, recharger, lecon, unite, chapitre, partie]);
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}
