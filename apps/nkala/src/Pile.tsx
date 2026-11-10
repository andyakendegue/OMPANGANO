import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

/** Petite pile d'écrans interne à un module (équivalent d'un navigateur sans routes) ; le bouton retour d'Android dépile. */
export function usePile<T>(racine: T, actif = true) {
  const [pile, setPile] = useState<T[]>([racine]);
  const pousser = useCallback((e: T) => setPile(p => [...p, e]), []);
  const retour = useCallback(() => setPile(p => (p.length > 1 ? p.slice(0, -1) : p)), []);
  const remplacer = useCallback((e: T) => setPile(p => [...p.slice(0, -1), e]), []);
  const racineVers = useCallback((e: T = racine) => setPile([e]), [racine]);
  useEffect(() => {
    if (!actif || pile.length < 2) return;
    const s = BackHandler.addEventListener('hardwareBackPress', () => { retour(); return true; });
    return () => s.remove();
  }, [pile.length, actif, retour]);
  return { ecran: pile[pile.length - 1], profondeur: pile.length, pousser, retour, remplacer, racine: racineVers };
}
