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

/**
 * Vrai tant que la première synchronisation de la session n'est pas terminée (réussie ou non) : les écrans affichent
 * alors « Chargement… » au lieu de « 0 fiche » ou d'un message « aucun résultat ».
 */
let regle = false;
const abonnesRegle = new Set<(r: boolean) => void>();
export const reglerCatalogue = () => { if (!regle) { regle = true; abonnesRegle.forEach(f => f(true)); } };
export function useCatalogueEnChargement(): boolean {
  const [r, setR] = useState(regle);
  useEffect(() => { abonnesRegle.add(setR); setR(regle); return () => { abonnesRegle.delete(setR); }; }, []);
  return !r;
}
