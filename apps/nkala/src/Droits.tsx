import { useEffect, useState } from 'react';
import { abonne, chargerDroits, type DroitsUtilisateur, type DroitsServeur } from '@nkala/noyau';
import { useAuth } from './AuthProvider';

let cache: { uid: string; d: DroitsServeur; t: number } | null = null;
const abonnes = new Set<() => void>();
/** À appeler après un achat : les droits sont relus au prochain affichage. */
export const oublierDroits = () => { cache = null; abonnes.forEach(f => f()); };

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
