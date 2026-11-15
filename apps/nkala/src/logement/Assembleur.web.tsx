/** Assemblage du panorama sur le web : même page dans une iframe invisible. */
import { createElement, useEffect, useMemo, useRef } from 'react';
import { htmlAssemblage, type ConfigAssemblage, type ResultatAssemblage } from './assemblage360';

export function Assembleur({ config, onFini, onErreur }: { config: ConfigAssemblage; onFini: (r: ResultatAssemblage) => void; onErreur: (m: string) => void }) {
  const cadre = useRef<HTMLIFrameElement | null>(null);
  const html = useMemo(() => htmlAssemblage(config), [config]);
  useEffect(() => {
    const ecoute = (ev: MessageEvent) => {
      if (ev.source !== cadre.current?.contentWindow) return;
      try { const m = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; if (m?.source !== 'nkala-assemblage') return; if (m.t === 'fini') onFini(m); else if (m.t === 'erreur') onErreur(m.message || 'Assemblage impossible.'); } catch { /* étranger */ }
    };
    window.addEventListener('message', ecoute);
    return () => window.removeEventListener('message', ecoute);
  }, [onFini, onErreur]);
  return createElement('iframe', { ref: cadre, srcDoc: html, title: 'Assemblage 360°', sandbox: 'allow-scripts allow-same-origin', style: { position: 'absolute', width: 2, height: 2, opacity: 0, border: 0, left: -10, top: -10 } });
}
