/**
 * WebRTC sur iOS et Android (react-native-webrtc). Le module natif n'existe que dans les versions compilées après son ajout
 * (13 nov. 2026) : une mise à jour JavaScript reçue par une version plus ancienne le trouve absent, et l'écran le dit au lieu de planter.
 * La version web est dans rtc.web.tsx.
 */
import { NativeModules } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

type Module = typeof import('react-native-webrtc');
let mod: Module | null = null;
if (NativeModules.WebRTCModule) {
  try { mod = require('react-native-webrtc') as Module; } catch { mod = null; }
}

export const rtcDisponible = !!mod;
/** Raison affichée quand la caméra et le micro ne sont pas utilisables dans cette version. */
export const rtcAbsent = 'Cette version de Nkala ne contient pas encore la caméra et le micro des cours à distance. Mets l\'application à jour depuis le magasin.';

export type Flux = { getTracks(): { kind: string; enabled: boolean; stop(): void }[]; getAudioTracks(): { enabled: boolean }[]; getVideoTracks(): { enabled: boolean; _switchCamera?: () => void }[]; toURL?: () => string };

export function nouvellePair(config: { iceServers: unknown[] }): any {
  if (!mod) throw new Error(rtcAbsent);
  return new mod.RTCPeerConnection(config as any);
}
export const description = (d: { type: string; sdp: string }) => (mod ? new mod.RTCSessionDescription(d as any) : d);
export const candidat = (c: unknown) => (mod ? new mod.RTCIceCandidate(c as any) : c);

export async function fluxLocal(video: boolean): Promise<Flux> {
  if (!mod) throw new Error(rtcAbsent);
  return (await mod.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: 'user', width: 640, height: 480, frameRate: 24 } : false } as any)) as unknown as Flux;
}
/** Passe de la caméra avant à la caméra arrière (téléphone seulement). */
export function retournerCamera(f: Flux | null) { try { f?.getVideoTracks()[0]?._switchCamera?.(); } catch { /* caméra unique */ } }
export const retournementPossible = true;

export function VueVideo({ flux, miroir, style }: { flux: Flux | null; miroir?: boolean; style?: StyleProp<ViewStyle> }) {
  if (!mod || !flux?.toURL) return null;
  const RTCView = mod.RTCView;
  return <RTCView streamURL={flux.toURL()} mirror={miroir} objectFit="cover" style={style as any} />;
}
