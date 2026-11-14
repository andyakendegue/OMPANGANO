/** WebRTC dans le navigateur (version web de Nkala) : API natives du navigateur, même interface que rtc.tsx. */
import { createElement, useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

const g = globalThis as any;
export const rtcDisponible = typeof g.RTCPeerConnection === 'function' && !!g.navigator?.mediaDevices?.getUserMedia;
export const rtcAbsent = 'Ce navigateur ne permet pas les appels vidéo. Essaie avec Chrome, Firefox, Edge ou Safari récents, ou avec l\'application.';

export type Flux = { getTracks(): { kind: string; enabled: boolean; stop(): void }[]; getAudioTracks(): { enabled: boolean }[]; getVideoTracks(): { enabled: boolean; _switchCamera?: () => void }[]; toURL?: () => string };

export function nouvellePair(config: { iceServers: unknown[] }): any {
  if (!rtcDisponible) throw new Error(rtcAbsent);
  return new g.RTCPeerConnection(config);
}
export const description = (d: { type: string; sdp: string }) => d;
export const candidat = (c: unknown) => c;

export async function fluxLocal(video: boolean): Promise<Flux> {
  if (!rtcDisponible) throw new Error(rtcAbsent);
  return g.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: video ? { facingMode: 'user', width: 640, height: 480, frameRate: 24 } : false });
}
export function retournerCamera(_f: Flux | null) { /* pas de caméra arrière choisie dans le navigateur */ }
export const retournementPossible = false;

/** Élément <video> du navigateur, rendu par react-native-web dans une View. */
export function VueVideo({ flux, miroir, style }: { flux: Flux | null; miroir?: boolean; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<any>(null);
  useEffect(() => { if (ref.current && ref.current.srcObject !== flux) ref.current.srcObject = flux; }, [flux]);
  if (!flux) return null;
  return (
    <View style={style}>
      {createElement('video', { ref, autoPlay: true, playsInline: true, muted: !!miroir, style: { width: '100%', height: '100%', objectFit: 'cover', transform: miroir ? 'scaleX(-1)' : undefined, background: '#000' } })}
    </View>
  );
}
