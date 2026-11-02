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

  // « Chargement » : copie locale pas encore lue, ou vide tant que la première synchronisation n'est pas finie.
  // Les écrans affichent alors un indicateur au lieu de « 0 » ou d'un message « aucune fiche ».
  const loading = !state.read || (state.meta.total === 0 && !settled);
  // « Premier chargement » : appareil vide ou premier téléchargement complet encore en cours. L'interface attend sa fin.
  const initialLoading = !settled && (!state.read || state.meta.total === 0 || isInitialDownload());
  return { loading, initialLoading, meta: state.meta, version: state.version, total: state.meta.total, tribeCounts };
}
