import { useEffect, useMemo, useState } from 'react';
import { CatalogueMeta, getCatalogueMeta, subscribeCatalogue } from '../services/itemStore';
import { MYENE_TRIBES, mapDialectToTribeName } from '../services/seedData';

const EMPTY: CatalogueMeta = { total: 0, byDialect: {}, byDialectCategory: {} };

/** Compteurs du catalogue local (IndexedDB), relus quand il change. Ne charge aucune fiche. */
export function useCatalogue() {
  const [state, setState] = useState<{ meta: CatalogueMeta; version: number }>({ meta: EMPTY, version: 0 });

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      getCatalogueMeta().then(meta => {
        if (alive) setState(prev => ({ meta: { ...meta }, version: prev.version + 1 }));
      });
    };
    refresh();
    const off = subscribeCatalogue(refresh);
    return () => { alive = false; off(); };
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

  return { meta: state.meta, version: state.version, total: state.meta.total, tribeCounts };
}
