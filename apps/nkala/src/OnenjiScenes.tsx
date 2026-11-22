/**
 * Scènes immersives d'Onênji (lot 11 du cursus v3, 22 nov. 2026 ; demande de Capp : « immerger l'apprenant et lui faire
 * découvrir un environnement assez riche »).
 * - Un décor dessiné par thème (lagune et mangrove, mer, forêt, marché, maison, village, ciel), en panorama plus large que
 *   l'écran qu'on fait glisser au doigt, avec des plans en profondeur (le fond défile moins vite) ;
 * - de la vie : oiseaux, pirogue, poissons qui sautent, fumée, gens qui passent, et le jour qui avance (ciel, soleil, lune) ;
 * - une ambiance sonore par décor (boucles synthétisées, assets/ambiance), coupable ; la voix du mot reste au toucher ;
 * - 15 à 25 éléments, dont des éléments cachés (à peine visibles) à trouver ;
 * - au toucher : le mot, son sens, sa voix, et une phrase courte qui le met en action (reprise des leçons validées) ;
 * - après la découverte, trois jeux : « Trouve tout », « Écoute et montre » (voix enregistrées), « Qu'est-ce qui manque ? » ;
 * - des chemins vers les scènes voisines (petite carte à explorer), puis retour.
 * Rien sur les sources côté apprenant.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { useAudioPlayer } from 'expo-audio';
import { liensDe, zonesDe, type Exercice, type LienScene, type ZoneScene } from '@nkala/noyau';
import { Bouton, Carte, Ic, T } from './kit';
import { usePrefs, useTheme } from './Prefs';

/* eslint-disable @typescript-eslint/no-require-imports */
const AMBIANCES: Record<string, number> = {
  lagune: require('../assets/ambiance/lagune.m4a'), mer: require('../assets/ambiance/mer.m4a'), foret: require('../assets/ambiance/foret.m4a'),
  marche: require('../assets/ambiance/marche.m4a'), village: require('../assets/ambiance/village.m4a'), maison: require('../assets/ambiance/maison.m4a'),
  ciel: require('../assets/ambiance/ciel.m4a'),
};
/* eslint-enable @typescript-eslint/no-require-imports */
const NOMS_LIEUX: Record<string, string> = { lagune: 'Tu es à la lagune.', mer: 'Tu es au bord de la mer.', foret: 'Tu es dans la forêt.', marche: 'Tu es au marché.', village: 'Tu es au village.', maison: 'Tu es dans la maison.', ciel: 'Tu regardes le ciel.' };

// ------------------------------------------------------------------ temps et couleurs
/** Horloge en secondes à environ 15 images par seconde (assez pour un décor vivant, léger pour un petit téléphone). */
function useTemps(actif = true): number {
  const { reduireAnim } = usePrefs();
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!actif || reduireAnim) return;
    let id: ReturnType<typeof setTimeout>; const t0 = Date.now();
    const tic = () => { setT((Date.now() - t0) / 1000); id = setTimeout(tic, 66); };
    tic();
    return () => clearTimeout(id);
  }, [actif, reduireAnim]);
  return t;
}
const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const melange = (a: string, b: string, k: number) => { const [x, y] = [hex(a), hex(b)]; return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
/** Ciel selon l'heure (0 = aube, 0,5 = fin d'après-midi, 0,7 = nuit) : [haut, bas, nuit 0-1]. */
function ciel(jour: number): [string, string, number] {
  const P: [number, string, string, number][] = [[0, '#F59E0B', '#FDE68A', 0.2], [0.12, '#38BDF8', '#FDE68A', 0], [0.45, '#0EA5E9', '#FEF3C7', 0], [0.58, '#7C2D12', '#F59E0B', 0.3], [0.68, '#1E1B4B', '#7C2D12', 0.8], [0.8, '#0B1026', '#1E3A8A', 1], [0.92, '#1E1B4B', '#B45309', 0.6], [1, '#F59E0B', '#FDE68A', 0.2]];
  for (let i = 0; i < P.length - 1; i++) {
    const [a, b] = [P[i], P[i + 1]];
    if (jour >= a[0] && jour <= b[0]) { const k = (jour - a[0]) / (b[0] - a[0]); return [melange(a[1], b[1], k), melange(a[2], b[2], k), a[3] + (b[3] - a[3]) * k]; }
  }
  return ['#38BDF8', '#FDE68A', 0];
}

// ------------------------------------------------------------------ éléments de décor
type P = { W: number; h: number; t: number; jour: number; fond: number; sansSoleil?: boolean; sansLune?: boolean };
const Oiseau = ({ x, y, s, t, c = '#1F2937' }: { x: number; y: number; s: number; t: number; c?: string }) => {
  const b = Math.sin(t * 8 + x) * s * 0.5;
  return <Path d={`M ${x - s} ${y - b} Q ${x - s / 2} ${y - s * 0.4} ${x} ${y} Q ${x + s / 2} ${y - s * 0.4} ${x + s} ${y - b}`} stroke={c} strokeWidth={2} fill="none" />;
};
const Vol = ({ W, h, t, n = 4, y0 = 0.18, c }: { W: number; h: number; t: number; n?: number; y0?: number; c?: string }) => (
  <G>{Array.from({ length: n }, (_, i) => { const x = (((t * (18 + i * 5)) / W + i * 0.27) % 1.15 - 0.07) * W; return <Oiseau key={i} x={x} y={h * (y0 + (i % 3) * 0.05) + Math.sin(t + i) * 6} s={7 + (i % 2) * 3} t={t} c={c} />; })}</G>
);
const AstreEtCiel = ({ W, h, jour, t, fond, id, sansSoleil, sansLune }: P & { id: string }) => {
  const [haut, bas, nuit] = ciel(jour);
  const kSoleil = jour < 0.62 ? jour / 0.62 : -1, kLune = jour >= 0.6 ? (jour - 0.6) / 0.4 : -1;
  const arc = (k: number) => ({ x: (0.08 + k * 0.84) * W, y: h * (0.5 - Math.sin(k * Math.PI) * 0.4) });
  return (
    <G>
      <Defs><LinearGradient id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={haut} /><Stop offset="1" stopColor={bas} /></LinearGradient></Defs>
      <Rect x={0} y={0} width={W} height={h} fill={`url(#${id})`} />
      {nuit > 0.3 && <G opacity={nuit}>{Array.from({ length: 40 }, (_, i) => <Circle key={i} cx={((i * 137) % 100) / 100 * W} cy={((i * 59) % 45) / 100 * h} r={1 + (i % 3) * 0.5} fill="#FEF3C7" opacity={0.5 + 0.5 * Math.sin(t * 2 + i)} />)}</G>}
      {kSoleil >= 0 && !sansSoleil && <G transform={`translate(${arc(kSoleil).x + fond * 0.6},${arc(kSoleil).y})`}><Circle r={26} fill="#FBBF24" opacity={0.35} /><Circle r={17} fill="#F59E0B" /></G>}
      {kLune >= 0 && !sansLune && <G transform={`translate(${arc(kLune).x + fond * 0.6},${arc(kLune).y})`}><Circle r={14} fill="#FEF3C7" /><Circle r={12} cx={6} cy={-3} fill={haut} /></G>}
      {/* nuages qui passent */}
      {[0, 1, 2].map(i => { const x = (((t * 6 + i * 300) / W) % 1.2 - 0.1) * W + fond * 0.5; return <G key={i} opacity={0.75 - nuit * 0.5}><Ellipse cx={x} cy={h * (0.12 + i * 0.07)} rx={46} ry={13} fill="#FFFFFF" /><Ellipse cx={x + 26} cy={h * (0.1 + i * 0.07)} rx={28} ry={12} fill="#FFFFFF" /></G>; })}
    </G>
  );
};
const Palmier = ({ x, y, s, t, c = '#15803D' }: { x: number; y: number; s: number; t: number; c?: string }) => (
  <G>
    <Path d={`M ${x} ${y} Q ${x + s * 0.15} ${y - s * 0.5} ${x + s * 0.08} ${y - s}`} stroke="#78350F" strokeWidth={s * 0.06} fill="none" />
    {[-2.6, -1.9, -1.2, -0.5, 0.2].map((a, i) => { const aa = a + Math.sin(t * 1.2 + i) * 0.06; return <Path key={i} d={`M ${x + s * 0.08} ${y - s} q ${Math.cos(aa) * s * 0.3} ${Math.sin(aa) * s * 0.25 - s * 0.1} ${Math.cos(aa) * s * 0.55} ${Math.sin(aa) * s * 0.3 + s * 0.1}`} stroke={c} strokeWidth={s * 0.05} fill="none" strokeLinecap="round" />; })}
  </G>
);
const Arbre = ({ x, y, s, c = '#166534', t = 0 }: { x: number; y: number; s: number; c?: string; t?: number }) => (
  <G>
    <Rect x={x - s * 0.06} y={y - s * 0.55} width={s * 0.12} height={s * 0.55} fill="#5B3A1E" />
    <Circle cx={x + Math.sin(t * 0.8 + x) * 2} cy={y - s * 0.7} r={s * 0.32} fill={c} />
    <Circle cx={x - s * 0.22} cy={y - s * 0.55} r={s * 0.22} fill={c} />
    <Circle cx={x + s * 0.22} cy={y - s * 0.55} r={s * 0.22} fill={c} />
  </G>
);
const Paletuvier = ({ x, y, s }: { x: number; y: number; s: number }) => (
  <G>
    {[-0.5, -0.25, 0, 0.25, 0.5].map((k, i) => <Path key={i} d={`M ${x} ${y - s * 0.45} Q ${x + k * s * 0.6} ${y - s * 0.3} ${x + k * s} ${y + s * 0.08}`} stroke="#5B3A1E" strokeWidth={2.5} fill="none" />)}
    <Rect x={x - 3} y={y - s * 0.75} width={6} height={s * 0.32} fill="#5B3A1E" />
    <Ellipse cx={x} cy={y - s * 0.85} rx={s * 0.45} ry={s * 0.25} fill="#166534" />
  </G>
);
const Case = ({ x, y, s, mur = '#D6A15E', toit = '#78350F' }: { x: number; y: number; s: number; mur?: string; toit?: string }) => (
  <G>
    <Rect x={x - s / 2} y={y - s * 0.55} width={s} height={s * 0.55} fill={mur} />
    <Polygon points={`${x - s * 0.62},${y - s * 0.52} ${x},${y - s * 1.05} ${x + s * 0.62},${y - s * 0.52}`} fill={toit} />
    <Rect x={x - s * 0.1} y={y - s * 0.3} width={s * 0.2} height={s * 0.3} fill="#3B1D10" />
  </G>
);
const Personne = ({ x, y, s, c = '#B84A28', t = 0 }: { x: number; y: number; s: number; c?: string; t?: number }) => {
  const p = Math.sin(t * 6) * s * 0.08;
  return (<G><Circle cx={x} cy={y - s * 0.9} r={s * 0.14} fill="#5B3A1E" /><Path d={`M ${x - s * 0.18} ${y - s * 0.72} L ${x + s * 0.18} ${y - s * 0.72} L ${x + s * 0.24} ${y - s * 0.25} L ${x - s * 0.24} ${y - s * 0.25} Z`} fill={c} />
    <Line x1={x - s * 0.08} y1={y - s * 0.25} x2={x - s * 0.08 - p} y2={y} stroke="#5B3A1E" strokeWidth={3} /><Line x1={x + s * 0.08} y1={y - s * 0.25} x2={x + s * 0.08 + p} y2={y} stroke="#5B3A1E" strokeWidth={3} /></G>);
};
const Fumee = ({ x, y, t }: { x: number; y: number; t: number }) => (
  <G>{[0, 1, 2, 3].map(i => { const k = ((t * 0.4 + i / 4) % 1); return <Circle key={i} cx={x + Math.sin(k * 6 + i) * 6} cy={y - k * 70} r={5 + k * 12} fill="#E7E5E4" opacity={(1 - k) * 0.55} />; })}</G>
);
const Pirogue = ({ x, y, s, t }: { x: number; y: number; s: number; t: number }) => (
  <G transform={`translate(${x},${y + Math.sin(t * 2) * 2})`}>
    <Path d={`M ${-s} 0 Q 0 ${s * 0.32} ${s} 0 Z`} fill="#78350F" />
    <Personne x={s * 0.1} y={-1} s={s * 0.7} c="#C85A32" t={0} />
    <Line x1={s * 0.35} y1={-s * 0.45} x2={s * 0.75 + Math.sin(t * 2.5) * 5} y2={s * 0.3} stroke="#A16207" strokeWidth={3} />
  </G>
);
const Vague = ({ W, h, y, amp, t, ph, fill, op = 1 }: { W: number; h: number; y: number; amp: number; t: number; ph: number; fill: string; op?: number }) => {
  let d = `M 0 ${h * y}`; for (let x = 0; x <= W; x += 24) d += ` L ${x} ${h * y + Math.sin(x / 45 + t * 1.5 + ph) * amp}`;
  return <Path d={d + ` L ${W} ${h} L 0 ${h} Z`} fill={fill} opacity={op} />;
};

// ------------------------------------------------------------------ décors
function Decor({ scene, ...p }: P & { scene: string }) {
  const { W, h, t, fond } = p;
  const lointain = (enfants: React.ReactNode) => <G transform={`translate(${fond * 0.35},0)`}>{enfants}</G>;
  const id = `ciel-${scene}`;
  switch (scene) {
    case 'mer': return (<>
      <AstreEtCiel {...p} id={id} />
      {lointain(<><Path d={`M 0 ${h * 0.44} Q ${W * 0.2} ${h * 0.4} ${W * 0.4} ${h * 0.44} L ${W * 0.4} ${h * 0.46} L 0 ${h * 0.46} Z`} fill="#14532D" opacity={0.7} /><Path d={`M ${W * 0.75} ${h * 0.45} l 10 -8 l 10 8 Z`} fill="#FDFAF7" opacity={0.8} /></>)}
      <Vague W={W} h={h} y={0.45} amp={3} t={t} ph={0} fill="#0EA5E9" />
      <Vague W={W} h={h} y={0.55} amp={5} t={t} ph={1.3} fill="#0284C7" op={0.85} />
      <Pirogue x={((t * 10) % (W * 1.2)) - W * 0.1} y={h * 0.53} s={34} t={t} />
      <Vague W={W} h={h} y={0.66} amp={6} t={t * 1.2} ph={2.1} fill="#0369A1" op={0.8} />
      {/* plage et écume */}
      <Path d={`M 0 ${h * 0.76} Q ${W * 0.25} ${h * (0.72 + Math.sin(t) * 0.01)} ${W * 0.5} ${h * 0.76} T ${W} ${h * 0.75} L ${W} ${h} L 0 ${h} Z`} fill="#FDE68A" />
      <Path d={`M 0 ${h * 0.76} Q ${W * 0.25} ${h * (0.72 + Math.sin(t) * 0.01)} ${W * 0.5} ${h * 0.76} T ${W} ${h * 0.75}`} stroke="#FFFFFF" strokeWidth={4} fill="none" opacity={0.8} />
      {[0.06, 0.18, 0.84, 0.95].map((k, i) => <Palmier key={i} x={W * k} y={h * 0.86} s={h * 0.5} t={t} />)}
      <Vol W={W} h={h} t={t} n={5} y0={0.16} c="#FDFAF7" />
    </>);
    case 'foret': return (<>
      <AstreEtCiel {...p} id={id} />
      {lointain(<>{Array.from({ length: 16 }, (_, i) => <Arbre key={i} x={(i / 15) * W} y={h * 0.62} s={h * (0.42 + (i % 3) * 0.06)} c="#14532D" />)}</>)}
      <Rect x={0} y={h * 0.6} width={W} height={h * 0.4} fill="#3F6212" />
      {/* rayons de lumière */}
      {[0.2, 0.45, 0.7].map((k, i) => <Polygon key={i} points={`${W * k},0 ${W * k + 30},0 ${W * k + 110},${h * 0.9} ${W * k + 40},${h * 0.9}`} fill="#FEF3C7" opacity={0.12 + 0.05 * Math.sin(t + i)} />)}
      {Array.from({ length: 10 }, (_, i) => <Arbre key={i} x={(i / 9) * W + 20} y={h * 0.8} s={h * (0.6 + (i % 2) * 0.15)} c={i % 2 ? '#166534' : '#15803D'} t={t} />)}
      {/* lianes */}
      {[0.12, 0.38, 0.63, 0.88].map((k, i) => <Path key={i} d={`M ${W * k} 0 Q ${W * k + 20 + Math.sin(t + i) * 8} ${h * 0.3} ${W * k} ${h * 0.5}`} stroke="#4D7C0F" strokeWidth={3} fill="none" />)}
      {Array.from({ length: 14 }, (_, i) => <Ellipse key={i} cx={(i / 13) * W} cy={h * 0.95} rx={30} ry={10} fill="#365314" />)}
      <Vol W={W} h={h} t={t} n={3} y0={0.1} />
    </>);
    case 'marche': return (<>
      <AstreEtCiel {...p} id={id} />
      {lointain(<>{[0.05, 0.2, 0.4, 0.6, 0.8, 0.95].map((k, i) => <Case key={i} x={W * k} y={h * 0.5} s={h * 0.22} mur="#E7C9A0" toit="#9A3412" />)}</>)}
      <Rect x={0} y={h * 0.5} width={W} height={h * 0.5} fill="#B45309" />
      <Rect x={0} y={h * 0.5} width={W} height={h * 0.5} fill="#78350F" opacity={0.25} />
      {/* étals à auvents rayés */}
      {Array.from({ length: 7 }, (_, i) => { const x = (i / 6.6) * W + 10, l = W / 8; return (
        <G key={i}>
          <Rect x={x} y={h * 0.62} width={l} height={h * 0.08} fill="#7C2D12" />
          <Rect x={x + 4} y={h * 0.7} width={4} height={h * 0.12} fill="#3B1D10" /><Rect x={x + l - 8} y={h * 0.7} width={4} height={h * 0.12} fill="#3B1D10" />
          {Array.from({ length: 6 }, (_, j) => <Rect key={j} x={x + (j * l) / 6} y={h * 0.4} width={l / 6} height={h * 0.08} fill={j % 2 ? '#F59E0B' : '#B84A28'} />)}
          <Line x1={x + 2} y1={h * 0.48} x2={x + 2} y2={h * 0.62} stroke="#3B1D10" strokeWidth={3} /><Line x1={x + l - 2} y1={h * 0.48} x2={x + l - 2} y2={h * 0.62} stroke="#3B1D10" strokeWidth={3} />
        </G>); })}
      {/* passants */}
      {[0, 1, 2, 3].map(i => { const x = ((t * (14 + i * 4) + i * 260) % (W * 1.1)) - W * 0.05; return <Personne key={i} x={i % 2 ? W - x : x} y={h * 0.97} s={h * 0.2} c={['#B84A28', '#F59E0B', '#7C2D12', '#C85A32'][i]} t={t + i} />; })}
      <Vol W={W} h={h} t={t} n={2} y0={0.15} />
    </>);
    case 'maison': return (<>
      {/* mur, sol en planches */}
      <Rect x={0} y={0} width={W} height={h} fill="#E7C9A0" />
      <Rect x={0} y={0} width={W} height={h * 0.06} fill="#B45309" />
      <Rect x={0} y={h * 0.62} width={W} height={h * 0.38} fill="#92400E" />
      {Array.from({ length: 9 }, (_, i) => <Line key={i} x1={0} y1={h * (0.66 + i * 0.04)} x2={W} y2={h * (0.66 + i * 0.04)} stroke="#78350F" strokeWidth={1.5} />)}
      {/* fenêtre de la cuisine : le dehors suit l'heure */}
      <G><Rect x={W * 0.1} y={h * 0.16} width={W * 0.09} height={h * 0.26} fill={ciel(p.jour)[0]} stroke="#5B3A1E" strokeWidth={5} /><Line x1={W * 0.145} y1={h * 0.16} x2={W * 0.145} y2={h * 0.42} stroke="#5B3A1E" strokeWidth={3} /></G>
      {/* étagère et foyer */}
      <Rect x={W * 0.2} y={h * 0.42} width={W * 0.24} height={6} fill="#5B3A1E" />
      <Ellipse cx={W * 0.1} cy={h * 0.82} rx={36} ry={8} fill="#3B1D10" />
      <Fumee x={W * 0.1} y={h * 0.72} t={t} />
      {/* cloison, porte */}
      <Rect x={W * 0.47} y={h * 0.06} width={10} height={h * 0.56} fill="#B45309" />
      <Rect x={W * 0.48} y={h * 0.22} width={W * 0.05} height={h * 0.4} fill="#7C2D12" />
      {/* chambre : lit, rideau, lampe */}
      <Rect x={W * 0.66} y={h * 0.66} width={W * 0.16} height={h * 0.1} fill="#7C2D12" />
      <Rect x={W * 0.66} y={h * 0.6} width={W * 0.16} height={h * 0.07} fill="#F5F5F4" />
      <Rect x={W * 0.67} y={h * 0.57} width={W * 0.04} height={h * 0.04} fill="#FDFAF7" />
      <Path d={`M ${W * 0.9} ${h * 0.12} Q ${W * 0.91 + Math.sin(t) * 4} ${h * 0.35} ${W * 0.9} ${h * 0.6}`} stroke="#B84A28" strokeWidth={14} fill="none" />
      <Circle cx={W * 0.6} cy={h * 0.08} r={30 + Math.sin(t * 2) * 2} fill="#FDE68A" opacity={0.3} />
      <Line x1={W * 0.6} y1={0} x2={W * 0.6} y2={h * 0.06} stroke="#3B1D10" strokeWidth={2} />
    </>);
    case 'ciel': return (<>
      <AstreEtCiel {...p} id={id} />
      {/* pluie de temps en temps */}
      {Math.sin(t * 0.25) > 0.6 && <G opacity={0.6}>{Array.from({ length: 40 }, (_, i) => { const x = ((i * 53) % 100) / 100 * W, y = ((t * 220 + i * 37) % (h * 0.7)); return <Line key={i} x1={x} y1={y} x2={x - 4} y2={y + 12} stroke="#BFDBFE" strokeWidth={1.5} />; })}</G>}
      {lointain(<Path d={`M 0 ${h * 0.8} ${Array.from({ length: 30 }, (_, i) => `L ${(i / 29) * W} ${h * (0.74 + ((i * 7) % 5) * 0.012)}`).join(' ')} L ${W} ${h} L 0 ${h} Z`} fill="#14532D" />)}
      <Rect x={0} y={h * 0.86} width={W} height={h * 0.14} fill="#3F6212" />
      {[0.1, 0.24, 0.36, 0.62, 0.78].map((k, i) => <Case key={i} x={W * k} y={h * 0.9} s={h * 0.13} />)}
      <Vol W={W} h={h} t={t} n={4} y0={0.3} />
    </>);
    case 'village': return (<>
      <AstreEtCiel {...p} id={id} />
      {lointain(<>{Array.from({ length: 12 }, (_, i) => <Arbre key={i} x={(i / 11) * W} y={h * 0.5} s={h * 0.3} c="#166534" />)}</>)}
      <Rect x={0} y={h * 0.5} width={W} height={h * 0.5} fill="#A16207" />
      <Path d={`M ${W * 0.9} ${h} Q ${W * 0.7} ${h * 0.75} ${W * 0.98} ${h * 0.52}`} stroke="#D6A15E" strokeWidth={26} fill="none" />
      {[0.1, 0.22, 0.6, 0.8].map((k, i) => <Case key={i} x={W * k} y={h * 0.62} s={h * 0.3} />)}
      {[0.04, 0.42, 0.72].map((k, i) => <Palmier key={i} x={W * k} y={h * 0.6} s={h * 0.42} t={t} />)}
      <Ellipse cx={W * 0.44} cy={h * 0.9} rx={22} ry={6} fill="#3B1D10" />
      <Fumee x={W * 0.44} y={h * 0.85} t={t} />
      {/* fil à linge */}
      <Line x1={W * 0.08} y1={h * 0.5} x2={W * 0.34} y2={h * 0.52} stroke="#3B1D10" strokeWidth={1.5} />
      {[0, 1].map(i => { const x = ((t * (9 + i * 5) + i * 400) % (W * 1.1)) - W * 0.05; return <Personne key={i} x={i ? W - x : x} y={h * 0.7} s={h * 0.18} c={i ? '#F59E0B' : '#7C2D12'} t={t + i} />; })}
      <Vol W={W} h={h} t={t} n={4} y0={0.18} />
    </>);
    default: return (<>{/* lagune et mangrove */}
      <AstreEtCiel {...p} id={id} />
      {lointain(<>{Array.from({ length: 14 }, (_, i) => <Arbre key={i} x={(i / 13) * W} y={h * 0.52} s={h * 0.26} c="#14532D" />)}</>)}
      <Vague W={W} h={h} y={0.52} amp={3} t={t * 0.6} ph={0} fill="#0E7490" />
      <Vague W={W} h={h} y={0.62} amp={4} t={t * 0.7} ph={1.4} fill="#155E75" op={0.85} />
      {[0.26, 0.32, 0.38, 0.9].map((k, i) => <Paletuvier key={i} x={W * k} y={h * 0.66} s={h * 0.36} />)}
      <Pirogue x={W * 0.6 + Math.sin(t * 0.15) * W * 0.12} y={h * 0.66} s={36} t={t} />
      {/* poisson qui saute */}
      {(() => { const k = (t * 0.5) % 1; return k < 0.3 ? <Ellipse cx={W * 0.74 + k * 60} cy={h * 0.7 - Math.sin((k / 0.3) * Math.PI) * 30} rx={9} ry={4} fill="#94A3B8" /> : null; })()}
      <Vague W={W} h={h} y={0.74} amp={4} t={t * 0.8} ph={2.4} fill="#164E63" op={0.9} />
      <Path d={`M 0 ${h * 0.6} Q ${W * 0.08} ${h * 0.52} ${W * 0.16} ${h * 0.62} L ${W * 0.16} ${h} L 0 ${h} Z`} fill="#4D7C0F" />
      <Palmier x={W * 0.05} y={h * 0.6} s={h * 0.4} t={t} />
      {Array.from({ length: 10 }, (_, i) => <Line key={i} x1={W * (0.18 + i * 0.006)} y1={h * 0.78} x2={W * (0.18 + i * 0.006) + Math.sin(t + i) * 3} y2={h * 0.68} stroke="#65A30D" strokeWidth={2} />)}
      <Vol W={W} h={h} t={t} n={4} y0={0.2} c="#FDFAF7" />
    </>);
  }
}

// ------------------------------------------------------------------ panorama
type Retour = { ok: boolean; z: number } | null;
function Panorama({ scene, zones, liens, l, vus, retour, cibleCachee, jeu, onZone, onLien }: {
  scene: string; zones: ZoneScene[]; liens: LienScene[]; l: number; vus: Set<number>; retour: Retour; cibleCachee?: number | null; jeu: boolean;
  onZone: (i: number) => void; onLien?: (i: number) => void;
}) {
  const { c } = useTheme();
  const t = useTemps();
  const h = Math.round(l * 0.82), W = Math.round(l * 2.6);
  const [fond, setFond] = useState(0);
  const [glisse, setGlisse] = useState(false);
  const periode = scene === 'ciel' ? 48 : 150;
  const jour = scene === 'maison' ? ((t / 150) + 0.2) % 1 : ((t / periode) + 0.15) % 1;
  const base = Math.max(36, l * 0.105);
  return (
    <View style={{ width: l, height: h, borderRadius: 22, overflow: 'hidden', alignSelf: 'center' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEventThrottle={32} bounces={false} nestedScrollEnabled
        onScroll={e => { setFond(e.nativeEvent.contentOffset.x); if (!glisse && e.nativeEvent.contentOffset.x > 20) setGlisse(true); }}>
        <View style={{ width: W, height: h }}>
          {/* Le soleil ou la lune à toucher remplacent l'astre dessiné (pas deux soleils). */}
          <Svg width={W} height={h} pointerEvents="none"><Decor scene={scene} W={W} h={h} t={t} jour={jour} fond={fond} sansSoleil={zones.some(z => /onghwêyi/i.test(z.mot))} sansLune={zones.some(z => /ogwêli/i.test(z.mot))} /></Svg>
          {zones.map((zo, i) => {
            if (cibleCachee === i) return null;
            const taille = base * [0.8, 1, 1.2][Math.max(0, Math.min(2, Number(zo.plan ?? 1)))];
            const cache = !!zo.cache && !vus.has(i) && !jeu;
            const flotte = cache ? 0 : Math.sin(t * 1.8 + i) * 3;
            const bord = retour?.z === i ? (retour.ok ? c.succes : c.erreur) : vus.has(i) && !jeu ? 'rgba(253,250,247,0.85)' : 'transparent';
            return (
              <Pressable key={i} accessibilityRole="button" accessibilityLabel={jeu ? `Élément ${i + 1}` : cache ? 'Quelque chose se cache ici' : `${zo.mot}, ${zo.sens}`} onPress={() => onZone(i)} hitSlop={6}
                style={{ position: 'absolute', left: (zo.x / 100) * W - taille / 2, top: (zo.y / 100) * h - taille / 2 + flotte, width: taille, height: taille, borderRadius: taille / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: bord, backgroundColor: cache ? 'transparent' : 'rgba(255,255,255,0.16)', opacity: cache ? 0.28 : 1 }}>
                <T style={{ fontSize: taille * (cache ? 0.5 : 0.62), lineHeight: taille * 0.8 }}>{zo.illustration ?? '❔'}</T>
              </Pressable>
            );
          })}
          {!jeu && liens.map((li, i) => (
            <Pressable key={`l${i}`} accessibilityRole="button" accessibilityLabel={li.libelle} onPress={() => onLien?.(i)} hitSlop={8}
              style={{ position: 'absolute', left: Math.min(W - 128, Math.max(4, (li.x / 100) * W - 62)), top: (li.y / 100) * h - 22, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(23,13,8,0.78)', borderWidth: 1, borderColor: '#F59E0B' }}>
              <T style={{ fontSize: 16 }}>🛤️</T><T v="petit" fort couleur="#FED7AA">{li.libelle}</T>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {!glisse && <View pointerEvents="none" style={{ position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(23,13,8,0.7)', transform: [{ translateX: Math.sin(t * 2) * 8 }] }}>
        <Ic nom="retour" taille={14} couleur="#FED7AA" /><T v="petit" couleur="#FED7AA">Fais glisser le paysage</T><Ic nom="suivant" taille={14} couleur="#FED7AA" />
      </View>}
    </View>
  );
}

/** Ambiance sonore en boucle, coupable ; démarre au premier toucher sur le web (lecture automatique bloquée). */
function useAmbiance(scene: string, actif: boolean) {
  const lecteur = useAudioPlayer(AMBIANCES[scene] ?? AMBIANCES.lagune);
  useEffect(() => {
    try { lecteur.loop = true; lecteur.volume = 0.35; if (actif) lecteur.play(); else lecteur.pause(); } catch { /* lecteur indisponible */ }
    return () => { try { lecteur.pause(); } catch { /* */ } };
  }, [lecteur, actif]);
  return () => { try { if (actif && !lecteur.playing) lecteur.play(); } catch { /* */ } };
}

type Jeu = { mode: 'trouve' | 'montre' | 'manque'; cibles: number[]; i: number; bonnes: number; options?: number[]; regarder?: boolean };

export function SceneRiche({ ex, onRepondre, Son }: { ex: Exercice; onRepondre: (juste: boolean) => void; Son: React.ComponentType<{ audio?: string | null; auto?: boolean }> }) {
  const { c } = useTheme();
  const zones = useMemo(() => zonesDe(ex), [ex.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const liens = useMemo(() => liensDe(ex), [ex.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [l, setL] = useState(340);
  const [vue, setVue] = useState<number | null>(null); // scène voisine ouverte
  const [vus, setVus] = useState<Set<number>>(new Set());
  const [vusAilleurs, setVusAilleurs] = useState<Record<string, Set<number>>>({});
  const [ouvert, setOuvert] = useState<ZoneScene | null>(null);
  const [jeu, setJeu] = useState<Jeu | null>(null);
  const [retour, setRetour] = useState<Retour>(null);
  const [fin, setFin] = useState<{ bonnes: number; sur: number } | null>(null);
  const [son, setSon] = useState(true);
  const lieu = vue !== null ? liens[vue] : null;
  const scene = lieu?.scene ?? ex.scene ?? 'lagune';
  const relancer = useAmbiance(scene, son);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current); }, []);
  if (!zones.length) return <View style={{ gap: 12 }}><T v="corps">Cette scène n'a pas encore d'éléments.</T><Bouton label="Continuer" onPress={() => onRepondre(true)} /></View>;

  const melanger = (a: number[]) => a.map(v => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(v => v[1]);
  const avecVoix = zones.map((z, i) => (z.audio ? i : -1)).filter(i => i >= 0);
  const assez = vus.size >= Math.ceil(zones.length * 0.7);
  const lancer = (mode: Jeu['mode']) => {
    setOuvert(null); setFin(null);
    if (mode === 'trouve') setJeu({ mode, cibles: melanger([...zones.keys()]), i: 0, bonnes: 0 });
    if (mode === 'montre') setJeu({ mode, cibles: melanger(avecVoix).slice(0, 8), i: 0, bonnes: 0 });
    if (mode === 'manque') nouvelleManque({ mode, cibles: melanger(zones.map((z, i) => (z.cache ? -1 : i)).filter(i => i >= 0)).slice(0, 4), i: 0, bonnes: 0 });
  };
  const nouvelleManque = (j: Jeu) => {
    const cible = j.cibles[j.i];
    const autres = melanger(zones.map((_, k) => k).filter(k => k !== cible && !zones[k].cache)).slice(0, 2);
    setJeu({ ...j, options: melanger([cible, ...autres]), regarder: true });
    minuteur.current = setTimeout(() => setJeu(x => (x ? { ...x, regarder: false } : x)), 3500);
  };
  const suiteJeu = (j: Jeu, ok: boolean) => {
    const bonnes = j.bonnes + (ok ? 1 : 0);
    if (j.i + 1 >= j.cibles.length) { setJeu(null); setFin({ bonnes, sur: j.cibles.length }); return; }
    const n = { ...j, i: j.i + 1, bonnes };
    if (j.mode === 'manque') nouvelleManque(n); else setJeu(n);
  };
  const toucher = (i: number) => {
    relancer();
    if (lieu) { const k = lieu.scene; setVusAilleurs(v => ({ ...v, [k]: new Set(v[k] ?? []).add(i) })); setOuvert(lieu.zones[i]); return; }
    if (jeu && (jeu.mode === 'trouve' || jeu.mode === 'montre')) {
      const ok = i === jeu.cibles[jeu.i]; setRetour({ ok, z: i });
      minuteur.current = setTimeout(() => { setRetour(null); suiteJeu(jeu, ok); }, ok ? 700 : 1300);
      return;
    }
    if (jeu) return;
    setOuvert(zones[i]); setVus(v => new Set(v).add(i));
  };
  const repondreManque = (k: number) => {
    if (!jeu || jeu.mode !== 'manque' || jeu.regarder) return;
    const ok = k === jeu.cibles[jeu.i]; setRetour({ ok, z: k });
    minuteur.current = setTimeout(() => { setRetour(null); suiteJeu(jeu, ok); }, ok ? 800 : 1400);
  };

  const cibleJeu = jeu && jeu.mode !== 'manque' ? zones[jeu.cibles[jeu.i]] : null;
  const consigne = lieu ? `${NOMS_LIEUX[lieu.scene] ?? 'Tu es dans un autre lieu.'} ${lieu.consigne ?? ''}`
    : jeu?.mode === 'manque' ? (jeu.regarder ? 'Regarde bien la scène…' : 'Qu\'est-ce qui manque ?')
    : jeu?.mode === 'montre' ? `Écoute, puis touche ce que tu entends (${jeu.i + 1}/${jeu.cibles.length}).`
    : cibleJeu ? `Touche : « ${cibleJeu.mot} »  (${(jeu?.i ?? 0) + 1}/${jeu?.cibles.length})`
    : `Touche ce que tu vois pour l'apprendre (${vus.size}/${zones.length}).`;
  const zonesVue = lieu ? lieu.zones : zones;
  const vusVue = lieu ? (vusAilleurs[lieu.scene] ?? new Set<number>()) : vus;
  const cacheManque = jeu?.mode === 'manque' && !jeu.regarder ? jeu.cibles[jeu.i] : null;
  return (
    <View style={{ gap: 12 }} onLayout={e => setL(Math.min(520, Math.round(e.nativeEvent.layout.width)))}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T v="petit" style={{ flex: 1 }}>{consigne}</T>
        <Pressable accessibilityRole="button" accessibilityLabel={son ? 'Couper le son d\'ambiance' : 'Remettre le son d\'ambiance'} onPress={() => setSon(s => !s)} hitSlop={8}
          style={{ padding: 6, borderRadius: 999, borderWidth: 1, borderColor: c.bord, backgroundColor: c.carte }}><Ic nom={son ? 'haut_parleur' : 'muet'} taille={18} couleur={c.texte} /></Pressable>
      </View>
      <Panorama key={scene} scene={scene} zones={zonesVue} liens={lieu ? [] : liens} l={l} vus={vusVue} retour={jeu?.mode === 'manque' ? null : retour} jeu={!!jeu && !lieu}
        cibleCachee={cacheManque} onZone={toucher} onLien={i => { relancer(); setOuvert(null); setVue(i); }} />
      {jeu?.mode === 'montre' && cibleJeu && <View style={{ alignItems: 'center' }}><Son key={jeu.i} audio={cibleJeu.audio} auto /></View>}
      {jeu?.mode === 'manque' && !jeu.regarder && jeu.options && <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
        {jeu.options.map(k => (
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={zones[k].mot} onPress={() => repondreManque(k)}
            style={{ flex: 1, alignItems: 'center', padding: 10, gap: 4, borderRadius: 16, borderWidth: 2, borderColor: retour?.z === k ? (retour.ok ? c.succes : c.erreur) : c.bord, backgroundColor: c.carte }}>
            <T style={{ fontSize: 34 }}>{zones[k].illustration}</T><T v="petit" fort style={{ fontStyle: 'italic', textAlign: 'center' }}>{zones[k].mot}</T>
          </Pressable>
        ))}
      </View>}
      {ouvert && !jeu && <Carte><View style={{ padding: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <T style={{ fontSize: 40 }}>{ouvert.illustration}</T>
          <View style={{ flex: 1 }}><T v="titre" style={{ fontStyle: 'italic' }}>{ouvert.mot}</T><T v="corps">« {ouvert.sens} »</T></View>
          {!!ouvert.audio && <Son audio={ouvert.audio} auto />}
        </View>
        {!!ouvert.phrase && <View style={{ borderTopWidth: 1, borderTopColor: c.bord, paddingTop: 8 }}><T v="corps" style={{ fontStyle: 'italic' }}>{ouvert.phrase}</T>{!!ouvert.phrase_fr && <T v="petit">« {ouvert.phrase_fr} »</T>}</View>}
      </View></Carte>}
      {fin && !lieu && <Carte><View style={{ padding: 16, gap: 6, alignItems: 'center' }}><T v="sousTitre">{fin.bonnes} / {fin.sur}</T><T v="petit">{fin.bonnes >= fin.sur * 0.6 ? 'Bravo, tu connais bien ce lieu !' : 'Regarde encore la scène, puis rejoue.'}</T></View></Carte>}
      {lieu ? <Bouton label={`Revenir`} icone="retour" variante="fantome" onPress={() => { setOuvert(null); setVue(null); }} />
        : !jeu && <>
          {!assez && <T v="petit" style={{ textAlign: 'center' }}>Découvre encore {Math.ceil(zones.length * 0.7) - vus.size} élément(s) pour jouer. Certains se cachent : cherche bien.</T>}
          {assez && <View style={{ gap: 8 }}>
            <Bouton label="Trouve tout" variante="ambre" onPress={() => lancer('trouve')} />
            <Bouton label={avecVoix.length ? 'Écoute et montre' : 'Écoute et montre (les voix arrivent bientôt)'} variante="fantome" desactive={!avecVoix.length} onPress={() => lancer('montre')} />
            <Bouton label="Qu'est-ce qui manque ?" variante="fantome" onPress={() => lancer('manque')} />
          </View>}
          {fin ? <Bouton label="Continuer" onPress={() => onRepondre(fin.bonnes >= fin.sur * 0.6)} />
            : assez && <Pressable accessibilityRole="button" onPress={() => onRepondre(true)} hitSlop={8} style={{ alignSelf: 'center', padding: 6 }}><T v="petit" style={{ textDecorationLine: 'underline' }}>Continuer sans jouer</T></Pressable>}
        </>}
    </View>
  );
}
