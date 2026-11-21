/**
 * Carte OpenStreetMap des annonces (téléphone : WebView, déjà présente dans la 0.2.0). Filtre de distance posé sur la carte :
 * puces 1 / 3 / 5 / 10 km et cercle autour de la position de la personne.
 */
import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import type { WebView as WebViewT } from 'react-native-webview';
import { moduleRnPresent } from '../natif';
import { T } from '../kit';
import { htmlCarte, type ConfigCarte } from './leafletHtml';

let WebViewCharge: typeof WebViewT | null | undefined;
function webView(): typeof WebViewT | null {
  if (WebViewCharge === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    WebViewCharge = moduleRnPresent('RNCWebViewModule') ? (require('react-native-webview') as { WebView: typeof WebViewT }).WebView : null;
  }
  return WebViewCharge;
}

export interface CarteProps extends ConfigCarte { hauteur?: number; onChoix?: (id: string) => void }

export function CarteOSM({ hauteur = 380, onChoix, ...cfg }: CarteProps) {
  const WebView = webView();
  const vue = useRef<WebViewT>(null);
  // La page est créée une fois ; les changements passent par nkalaCarte.maj (pas de rechargement des fonds de carte).
  const html = useMemo(() => htmlCarte(cfg), []); // eslint-disable-line react-hooks/exhaustive-deps
  const cle = JSON.stringify(cfg);
  useEffect(() => { vue.current?.injectJavaScript(`window.nkalaCarte&&window.nkalaCarte.maj(${JSON.stringify({ ...cfg, recadrer: true }).replace(/</g, '\\u003c')});true;`); }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!WebView) return <View style={{ height: hauteur, alignItems: 'center', justifyContent: 'center' }}><T v="petit">Carte disponible dans la dernière version de l'application.</T></View>;
  return (
    <View style={{ height: hauteur, borderRadius: 20, overflow: 'hidden' }}>
      <WebView ref={vue} originWhitelist={['*']} source={{ html, baseUrl: 'https://nkala.essaka.engineering/' }} javaScriptEnabled domStorageEnabled
        style={{ flex: 1 }} nestedScrollEnabled
        onMessage={e => { try { const m = JSON.parse(e.nativeEvent.data); if (m.t === 'choix') onChoix?.(m.id); } catch { /* étranger */ } }} />
    </View>
  );
}
