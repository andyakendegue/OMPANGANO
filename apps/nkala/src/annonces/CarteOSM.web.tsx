/** Carte OpenStreetMap des annonces sur le web : même page dans une iframe. */
import { createElement, useEffect, useMemo, useRef } from 'react';
import { htmlCarte, type ConfigCarte } from './leafletHtml';

export interface CarteProps extends ConfigCarte { hauteur?: number; onChoix?: (id: string) => void }

export function CarteOSM({ hauteur = 380, onChoix, ...cfg }: CarteProps) {
  const cadre = useRef<HTMLIFrameElement | null>(null);
  const html = useMemo(() => htmlCarte(cfg), []); // eslint-disable-line react-hooks/exhaustive-deps
  const cle = JSON.stringify(cfg);
  useEffect(() => { cadre.current?.contentWindow?.postMessage(JSON.stringify({ source: 'nkala-app', t: 'maj', cfg: { ...cfg, recadrer: true } }), '*'); }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const ecoute = (ev: MessageEvent) => {
      if (ev.source !== cadre.current?.contentWindow) return;
      try { const m = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; if (m?.source === 'nkala-carte' && m.t === 'choix') onChoix?.(m.id); } catch { /* étranger */ }
    };
    window.addEventListener('message', ecoute);
    return () => window.removeEventListener('message', ecoute);
  }, [onChoix]);
  return createElement('iframe', { ref: cadre, srcDoc: html, title: 'Carte des annonces', sandbox: 'allow-scripts allow-same-origin allow-popups',
    style: { border: 0, width: '100%', height: hauteur, borderRadius: 20, display: 'block' } });
}
