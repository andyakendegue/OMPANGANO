import { useEffect, useState } from 'react';

/** État de synchronisation visible dans l'en-tête : téléchargement du catalogue ou envoi des contributions en attente. */
export interface EtatSync { genre: 'telechargement' | 'envoi' | null; fait: number; total: number }
let etat: EtatSync = { genre: null, fait: 0, total: 0 };
const abonnes = new Set<(e: EtatSync) => void>();
export const definirSync = (e: EtatSync) => { etat = e; abonnes.forEach(f => f(e)); };
export const lireSync = () => etat;
export function useEtatSync(): EtatSync {
  const [e, setE] = useState(etat);
  useEffect(() => { abonnes.add(setE); setE(etat); return () => { abonnes.delete(setE); }; }, []);
  return e;
}
