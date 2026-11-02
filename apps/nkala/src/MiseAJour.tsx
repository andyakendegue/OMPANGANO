import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import { couleurs } from './theme';

/** Bannière « Mise à jour disponible » (équivalent de AppUpdateBanner du site web) : mises à jour du code publiées par EAS Update. */
export function MiseAJour() {
  const [version, setVersion] = useState<string | null>(null);
  const [recharge, setRecharge] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' || !Updates.isEnabled) return;
    let annule = false;
    const verifier = async () => {
      try {
        const r = await Updates.checkForUpdateAsync();
        if (r.isAvailable && !annule) { await Updates.fetchUpdateAsync(); if (!annule) setVersion(String((r.manifest as { id?: string } | undefined)?.id?.slice(0, 8) || '1.0')); }
      } catch { /* hors-ligne ou pas de publication */ }
    };
    verifier();
    const t = setInterval(verifier, 10 * 60_000);
    return () => { annule = true; clearInterval(t); };
  }, []);

  if (!version) return null;
  return (
    <View style={s.banniere}>
      <Text style={s.texte}>Mise à jour disponible ⚡ Une nouvelle version du code de Nkala est en ligne ({version}).</Text>
      <Pressable style={s.bouton} disabled={recharge} onPress={async () => { setRecharge(true); try { await Updates.reloadAsync(); } catch { setRecharge(false); } }}>
        <Text style={s.boutonTexte}>{recharge ? 'Actualisation...' : 'Actualiser'}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  banniere: { backgroundColor: '#065f46', paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  texte: { color: '#fff', fontSize: 12, flex: 1 },
  bouton: { backgroundColor: couleurs.ambre, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  boutonTexte: { color: '#180d07', fontWeight: '900', fontSize: 12 },
});
