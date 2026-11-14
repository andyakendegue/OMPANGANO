/**
 * Panorama 360° sur le web : même page Pannellum dans une iframe (srcDoc). L'image est lue directement à l'adresse signée :
 * le stockage doit autoriser l'origine du site en CORS (server/scripts/set-bucket-cors.ts, GET).
 */
import { createElement, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { htmlPanorama } from './pannellumHtml';

export interface PanoramaRef { gyro: (on: boolean) => void; zoom: (d: number) => void }
export interface PanoramaProps { url: string; apercu?: string; onCharge?: () => void; onErreur?: (m: string) => void }

export const Panorama = forwardRef<PanoramaRef, PanoramaProps>(function Panorama({ url, apercu, onCharge, onErreur }, ref) {
  const cadre = useRef<HTMLIFrameElement | null>(null);
  const html = useMemo(() => htmlPanorama({ url, apercu }), [url, apercu]);
  useEffect(() => {
    const ecoute = (ev: MessageEvent) => {
      if (ev.source !== cadre.current?.contentWindow) return;
      try { const m = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; if (m?.source !== 'nkala360') return; if (m.t === 'chargee') onCharge?.(); else if (m.t === 'erreur') onErreur?.(m.message || 'Erreur de la visionneuse.'); } catch { /* étranger */ }
    };
    window.addEventListener('message', ecoute);
    return () => window.removeEventListener('message', ecoute);
  }, [onCharge, onErreur]);
  const envoyer = (m: Record<string, unknown>) => cadre.current?.contentWindow?.postMessage(JSON.stringify({ source: 'nkala-app', ...m }), '*');
  useImperativeHandle(ref, () => ({ gyro: on => envoyer({ t: 'gyro', on }), zoom: d => envoyer({ t: 'zoom', d }) }), []);
  return createElement('iframe', {
    ref: cadre, srcDoc: html, title: 'Photo 360°', allow: 'fullscreen; gyroscope; accelerometer',
    sandbox: 'allow-scripts allow-same-origin',
    style: { border: 0, width: '100%', height: '100%', flex: 1, backgroundColor: '#170D08', display: 'block' },
  });
});
