/**
 * Visionneuse 360° plein écran : rotation au doigt (ou à la souris), zoom, gyroscope activable, passage à la 360 suivante.
 * La vignette floue reste affichée tant que l'image complète n'est pas chargée.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { libellePiece } from '@nkala/noyau';
import { Ic, T } from '../kit';
import { Panorama, type PanoramaRef } from './Panorama';

export interface Pano { id: string; url: string; urlHd?: string; apercu?: string; piece?: string }

function BoutonRond({ icone, label, onPress, actif }: { icone: string; label: string; onPress: () => void; actif?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}
      style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: actif ? '#F59E0B' : 'rgba(23,13,8,0.72)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)' }}>
      <Ic nom={icone} taille={22} couleur={actif ? '#170D08' : '#FED7AA'} />
    </Pressable>
  );
}

/** Panorama intégré (dans la page détail), sans les commandes plein écran. */
export function Panorama360({ pano, hauteur = 260 }: { pano: Pano; hauteur?: number }) {
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <View style={{ height: hauteur, borderRadius: 18, overflow: 'hidden', backgroundColor: '#170D08' }}>
      <Panorama key={pano.id} url={pano.url} apercu={pano.apercu} onCharge={() => setCharge(true)} onErreur={setErreur} />
      {!charge && !erreur && pano.apercu && <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}><Image source={{ uri: pano.apercu }} blurRadius={8} style={{ width: '100%', height: '100%' }} /></View>}
      {erreur && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 20 }}><T v="petit" couleur="#FED7AA" style={{ textAlign: 'center' }}>{erreur}</T></View>}
    </View>
  );
}

export function Visionneuse360({ panos, depart = 0, visible, onClose }: { panos: Pano[]; depart?: number; visible: boolean; onClose: () => void }) {
  const ins = useSafeAreaInsets();
  const [i, setI] = useState(depart);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [gyro, setGyro] = useState(false);
  const [hd, setHd] = useState(false);
  const ref = useRef<PanoramaRef>(null);
  useEffect(() => { if (visible) setI(depart); }, [visible, depart]);
  useEffect(() => { setCharge(false); setErreur(null); setGyro(false); }, [i, hd]);
  const p = panos[i];
  const basculerGyro = useCallback(() => { const n = !gyro; setGyro(n); ref.current?.gyro(n); }, [gyro]);
  if (!p) return null;
  const url = hd && p.urlHd ? p.urlHd : p.url;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <View style={{ flex: 1, backgroundColor: '#170D08' }}>
        <Panorama key={`${p.id}-${hd ? 'hd' : 'n'}`} ref={ref} url={url} apercu={p.apercu} onCharge={() => setCharge(true)} onErreur={setErreur} />
        {!charge && !erreur && p.apercu && <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}><Image source={{ uri: p.apercu }} blurRadius={10} style={{ width: '100%', height: '100%' }} /></View>}
        {erreur && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24 }}><T v="corps" couleur="#FED7AA" style={{ textAlign: 'center' }}>{erreur}</T></View>}
        <View pointerEvents="box-none" style={{ position: 'absolute', top: ins.top + 10, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BoutonRond icone="fermer" label="Fermer la visionneuse" onPress={onClose} />
          <View style={{ flex: 1, backgroundColor: 'rgba(23,13,8,0.72)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
            <T v="carte" couleur="#FDFAF7" numberOfLines={1}>{libellePiece(p.piece) || 'Photo 360°'}</T>
            <T v="petit" couleur="#FED7AA">{panos.length > 1 ? `${i + 1} / ${panos.length} · ` : ''}{Platform.OS === 'web' ? 'Glissez pour regarder autour' : 'Glissez ou tournez le téléphone'}</T>
          </View>
        </View>
        <View pointerEvents="box-none" style={{ position: 'absolute', bottom: ins.bottom + 18, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <BoutonRond icone="precedent" label="360° précédente" onPress={() => setI((i - 1 + panos.length) % panos.length)} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <BoutonRond icone="remove" label="Dézoomer" onPress={() => ref.current?.zoom(15)} />
            <BoutonRond icone="add" label="Zoomer" onPress={() => ref.current?.zoom(-15)} />
            {Platform.OS !== 'web' && <BoutonRond icone="phone-portrait-outline" label={gyro ? 'Désactiver le gyroscope' : 'Activer le gyroscope'} actif={gyro} onPress={basculerGyro} />}
            {!!p.urlHd && <BoutonRond icone="expand" label={hd ? 'Version légère' : 'Haute définition'} actif={hd} onPress={() => setHd(!hd)} />}
          </View>
          <BoutonRond icone="suivantPiste" label="360° suivante" onPress={() => setI((i + 1) % panos.length)} />
        </View>
      </View>
    </Modal>
  );
}
