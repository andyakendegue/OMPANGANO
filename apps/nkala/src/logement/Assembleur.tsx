/** Assemblage du panorama sur téléphone : page invisible dans une WebView (déjà présente dans la version 0.2.0). */
import { View } from 'react-native';
import type { WebView as WebViewT } from 'react-native-webview';
import { MiseAJourNecessaire, moduleRnPresent } from '../natif';
import { htmlAssemblage, type ConfigAssemblage, type ResultatAssemblage } from './assemblage360';
import { useEffect, useMemo } from 'react';

let WebViewCharge: typeof WebViewT | null | undefined;
function webView(): typeof WebViewT | null {
  if (WebViewCharge === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    WebViewCharge = moduleRnPresent('RNCWebViewModule') ? (require('react-native-webview') as { WebView: typeof WebViewT }).WebView : null;
  }
  return WebViewCharge;
}

export function Assembleur({ config, onFini, onErreur }: { config: ConfigAssemblage; onFini: (r: ResultatAssemblage) => void; onErreur: (m: string) => void }) {
  const WebView = webView();
  const html = useMemo(() => htmlAssemblage(config), [config]);
  useEffect(() => { if (!WebView) onErreur(new MiseAJourNecessaire().message); }, [WebView]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!WebView) return null;
  return (
    <View style={{ position: 'absolute', width: 2, height: 2, opacity: 0, left: -10, top: -10 }} pointerEvents="none">
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://nkala.local/' }}
        javaScriptEnabled
        style={{ width: 2, height: 2 }}
        onMessage={e => {
          try { const m = JSON.parse(e.nativeEvent.data); if (m.t === 'fini') onFini(m); else if (m.t === 'erreur') onErreur(m.message || 'Assemblage impossible.'); } catch { /* étranger */ }
        }}
        onError={e => onErreur(e.nativeEvent.description || 'Assemblage impossible.')}
      />
    </View>
  );
}
