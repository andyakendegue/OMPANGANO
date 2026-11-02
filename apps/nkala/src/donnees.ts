import { useEffect, useState } from 'react';

/** Compteur de versions des données : incrémenté quand le serveur signale une modification (flux temps réel, relecture périodique). */
const abonnes = new Set<() => void>();
let version = 0;
export const donneesChangees = () => { version++; abonnes.forEach(f => f()); };
export function useVersionDonnees(): number {
  const [v, setV] = useState(version);
  useEffect(() => { const f = () => setV(version); abonnes.add(f); return () => { abonnes.delete(f); }; }, []);
  return v;
}
