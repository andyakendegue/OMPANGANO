/**
 * Panorama 360° sur téléphone : Pannellum dans une WebView. L'image est d'abord téléchargée dans le cache de l'app,
 * puis passée en data URI : pas de souci de CORS ni de texture WebGL « contaminée », et elle reste visible hors ligne.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { htmlPanorama } from './pannellumHtml';

export interface PanoramaRef { gyro: (on: boolean) => void; zoom: (d: number) => void }
export interface PanoramaProps { url: string; apercu?: string; onCharge?: () => void; onErreur?: (m: string) => void }

const nomCache = (url: string) => {
  let h = 0; for (let i = 0; i < url.length; i++) h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  // L'adresse signée change toutes les 6 h : la clé ne garde que le chemin du fichier.
  const chemin = url.split('?')[0];
  let k = 0; for (let i = 0; i < chemin.length; i++) k = (Math.imul(31, k) + chemin.charCodeAt(i)) | 0;
  return `pano360_${(k >>> 0).toString(36)}.jpg`;
};

async function enDataUri(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  let fichier = url;
  if (!url.startsWith('file:')) {
    fichier = `${FileSystem.cacheDirectory}${nomCache(url)}`;
    const i = await FileSystem.getInfoAsync(fichier);
    if (!i.exists) {
      const r = await FileSystem.downloadAsync(url, fichier);
      if (r.status < 200 || r.status >= 300) { await FileSystem.deleteAsync(fichier, { idempotent: true }); throw new Error(`Téléchargement impossible (${r.status}).`); }
    }
  }
  const b64 = await FileSystem.readAsStringAsync(fichier, { encoding: FileSystem.EncodingType.Base64 });
  return `data:image/jpeg;base64,${b64}`;
}

export const Panorama = forwardRef<PanoramaRef, PanoramaProps>(function Panorama({ url, apercu, onCharge, onErreur }, ref) {
  const vue = useRef<WebView>(null);
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let vivant = true;
    setHtml(null);
    enDataUri(url).then(d => { if (vivant) setHtml(htmlPanorama({ url: d })); }).catch(e => vivant && onErreur?.((e as Error).message));
    return () => { vivant = false; };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  useImperativeHandle(ref, () => ({
    gyro: on => vue.current?.injectJavaScript(`window.nkala360&&window.nkala360.gyro(${on ? 'true' : 'false'});true;`),
    zoom: d => vue.current?.injectJavaScript(`window.nkala360&&window.nkala360.zoom(${Number(d) || 0});true;`),
  }), []);
  void apercu;
  if (!html) return <View style={{ flex: 1, backgroundColor: '#170D08' }} />;
  return (
    <WebView
      ref={vue}
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://nkala.local/' }}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      setSupportMultipleWindows={false}
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      style={{ flex: 1, backgroundColor: '#170D08' }}
      onMessage={e => {
        try { const m = JSON.parse(e.nativeEvent.data); if (m.t === 'chargee') onCharge?.(); else if (m.t === 'erreur') onErreur?.(m.message || 'Erreur de la visionneuse.'); } catch { /* message étranger */ }
      }}
      onError={e => onErreur?.(e.nativeEvent.description || 'Visionneuse indisponible.')}
    />
  );
});
