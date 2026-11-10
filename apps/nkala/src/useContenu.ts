import { useCallback, useEffect, useState } from 'react';
import { chargerContenu, type Ligne } from '@nkala/noyau';

/** Charge une collection de contenus (serveur, copie locale ou démonstration). `demo` est vrai tant que le serveur n'a rien publié. */
export function useContenu<T extends Ligne = Ligne>(collection: string) {
  const [etat, setEtat] = useState<{ lignes: T[]; demo: boolean; chargement: boolean; erreur: boolean }>({ lignes: [], demo: false, chargement: true, erreur: false });
  const charger = useCallback(async (force = false) => {
    setEtat(e => ({ ...e, chargement: true }));
    try { const r = await chargerContenu<T>(collection, force); setEtat({ lignes: r.lignes, demo: r.demo, chargement: false, erreur: false }); }
    catch { setEtat(e => ({ ...e, chargement: false, erreur: true })); }
  }, [collection]);
  useEffect(() => { charger(); }, [charger]);
  return { ...etat, recharger: () => charger(true) };
}

/** Plusieurs collections à la fois. */
export function useContenus(collections: string[]) {
  const [res, setRes] = useState<Record<string, Ligne[]>>({});
  const [chargement, setChargement] = useState(true);
  const cle = collections.join(',');
  useEffect(() => {
    let annule = false;
    Promise.all(collections.map(c => chargerContenu(c).then(r => [c, r.lignes] as const))).then(r => { if (!annule) { setRes(Object.fromEntries(r)); setChargement(false); } });
    return () => { annule = true; };
  }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  return { res, chargement };
}
