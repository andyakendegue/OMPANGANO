import { useEffect, useState } from 'react';
import { abonne, accesAvance, chargerDroits, chargerProfilAcces, rangPourXp, type DecisionAvancee, type DroitsUtilisateur, type DroitsServeur, type Ligne } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { useProgres } from './Progres';

let cache: { uid: string; d: DroitsServeur; t: number } | null = null;
const abonnes = new Set<() => void>();
/** À appeler après un achat : les droits sont relus au prochain affichage. */
export const oublierDroits = () => { cache = null; cacheAcces = null; abonnes.forEach(f => f()); };

/** Droits de l'utilisateur courant, lus sur le serveur (abonnements, achats) ; le rôle vient du profil. Sans compte ou hors ligne : aucun droit payant. */
export function useDroits(): DroitsUtilisateur & { abonne: boolean } {
  const { profil } = useAuth();
  const [d, setD] = useState<DroitsServeur | null>(cache && cache.uid === profil?.id ? cache.d : null);
  const [n, setN] = useState(0);
  useEffect(() => { const f = () => setN(x => x + 1); abonnes.add(f); return () => { abonnes.delete(f); }; }, []);
  useEffect(() => {
    if (!profil) { setD(null); return; }
    if (cache && cache.uid === profil.id && Date.now() - cache.t < 60_000) { setD(cache.d); return; }
    chargerDroits().then(r => { cache = { uid: profil.id, d: r, t: Date.now() }; setD(r); }).catch(() => {});
  }, [profil?.id, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const droits: DroitsUtilisateur = { role: profil?.role, abonneJusque: d?.abonneJusque ?? null, achats: d?.achats ?? [] };
  return { ...droits, abonne: abonne(droits) };
}

let cacheAcces: { uid: string; p: { plans: string[]; tout: boolean }; t: number } | null = null;

/**
 * Règles d'accès par niveau et par formule (colonnes « rang_min » et « plans » des contenus) : renvoie une fonction qui juge une ligne de contenu.
 * Le rang vient de l'XP (même sans compte) ; les formules viennent du serveur. Ne sert qu'à afficher le cadenas : le serveur refuse de toute façon.
 */
export function useRegle() {
  const { profil } = useAuth();
  const { xp } = useProgres();
  const [p, setP] = useState<{ plans: string[]; tout: boolean }>(cacheAcces && cacheAcces.uid === profil?.id ? cacheAcces.p : { plans: [], tout: false });
  useEffect(() => {
    if (!profil) { setP({ plans: [], tout: false }); return; }
    if (cacheAcces && cacheAcces.uid === profil.id && Date.now() - cacheAcces.t < 60_000) { setP(cacheAcces.p); return; }
    chargerProfilAcces().then(r => { cacheAcces = { uid: profil.id, p: { plans: r.plans, tout: r.tout }, t: Date.now() }; setP(cacheAcces.p); }).catch(() => {});
  }, [profil?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const rang = rangPourXp(xp).index + 1;
  return (l: Ligne | Record<string, any> | null | undefined): DecisionAvancee => accesAvance({ rangMin: Number(l?.rang_min) || 0, plans: Array.isArray(l?.plans) ? l!.plans : [] }, { rang, plans: p.plans, tout: p.tout });
}
export const oublierAcces = () => { cacheAcces = null; };
