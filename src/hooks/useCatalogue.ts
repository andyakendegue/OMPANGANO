import { useEffect, useMemo, useState } from 'react';
import { isCatalogueSettled, isInitialDownload, subscribeCatalogueSettled } from '../firebase';
import { CatalogueMeta, getCatalogueMetaStrict, subscribeCatalogue } from '../services/itemStore';
import { MYENE_TRIBES, mapDialectToTribeName } from '../services/seedData';

const EMPTY: CatalogueMeta = { total: 0, byDialect: {}, byDialectCategory: {} };

/** Compteurs du catalogue local (IndexedDB), relus quand il change. Ne charge aucune fiche. */
export function useCatalogue() {
  const [state, setState] = useState<{ meta: CatalogueMeta; version: number; read: boolean }>({ meta: EMPTY, version: 0, read: false });
  const [settled, setSettled] = useState(isCatalogueSettled());
  useEffect(() => subscribeCatalogueSettled(() => setSettled(true)), []);

  useEffect(() => {
    let alive = true;
    let seq = 0;
    let retry: ReturnType<typeof setTimeout> | null = null;
    // Une lecture ratée ou plus ancienne que la dernière ne remplace jamais l'affichage (pas de faux « 0 »)
    const refresh = () => {
      const mine = ++seq;
      getCatalogueMetaStrict().then(meta => {
        if (alive && mine === seq) setState(prev => ({ meta: { ...meta }, version: prev.version + 1, read: true }));
      }).catch(() => {
        if (alive && mine === seq) { if (retry) clearTimeout(retry); retry = setTimeout(refresh, 2000); }
      });
    };
    refresh();
    const off = subscribeCatalogue(refresh);
    return () => { alive = false; if (retry) clearTimeout(retry); off(); };
  }, []);

  const tribeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of MYENE_TRIBES) counts[t] = 0;
    for (const [dialect, n] of Object.entries(state.meta.byDialect)) {
      const t = mapDialectToTribeName(dialect);
      counts[t] = (counts[t] || 0) + n;
    }
    return counts;
  }, [state.meta]);

  // « Chargement » : copie locale pas encore lue, vide, ou téléchargement du catalogue en cours.
  // Les écrans affichent alors un indicateur au lieu de « 0 » ou d'un message « aucune fiche ».
  const loading = !state.read || (!settled && (state.meta.total === 0 || isInitialDownload()));
  // Écran de préparation : seulement tant qu'il y a moins de 2 fiches. Dès que 2 fiches sont là, l'application s'affiche
  // et le reste arrive au fur et à mesure (les moins répondues d'abord).
  const initialLoading = !settled && (!state.read || state.meta.total < 2);
  return { loading, initialLoading, meta: state.meta, version: state.version, total: state.meta.total, tribeCounts };
}
