/**
 * Ogoni, le feu de bois de la veillée : un tas de bûches qui brûle. Chaque lettre ratée fait tomber une bûche ;
 * la flamme baisse avec le bois qui reste, puis il n'y a plus que des braises, de la cendre et un filet de fumée.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { usePrefs } from './Prefs';

/** Emplacements des bûches (centre, angle, longueur) dans un dessin de 240 × 210 : les trois premières forment le socle, les suivantes s'appuient dessus. */
const PLACES: { x: number; y: number; a: number; l: number; devant: boolean }[] = [
  { x: 120, y: 184, a: 0, l: 168, devant: true },
  { x: 92, y: 172, a: -16, l: 132, devant: true },
  { x: 148, y: 172, a: 16, l: 132, devant: true },
  { x: 120, y: 160, a: 2, l: 118, devant: false },
  { x: 90, y: 150, a: -38, l: 108, devant: false },
  { x: 150, y: 150, a: 38, l: 108, devant: false },
  { x: 106, y: 140, a: -62, l: 96, devant: false },
  { x: 134, y: 140, a: 62, l: 96, devant: false },
];
const BOIS = ['#8B4A22', '#7A3D1A', '#93522A', '#6E3716'];

/** Une bûche : écorce, veines, tranche claire avec ses cernes. Dessinée couchée, centrée sur (0,0). */
function Buche({ l, teinte, charbon }: { l: number; teinte: string; charbon?: boolean }) {
  const h = 20, x = -l / 2;
  const ecorce = charbon ? '#2B1D16' : teinte, veine = charbon ? '#1A110D' : '#4A230E', tranche = charbon ? '#3A2A22' : '#E7B77C', cerne = charbon ? '#231712' : '#B77A3F';
  return (
    <G>
      <Rect x={x} y={-h / 2} width={l} height={h} rx={h / 2} fill={ecorce} />
      <Path d={`M ${x + 14} -3 H ${x + l * 0.42} M ${x + l * 0.5} 4 H ${x + l - 22} M ${x + l * 0.22} 6 H ${x + l * 0.4} M ${x + l * 0.58} -5 H ${x + l * 0.8}`} stroke={veine} strokeWidth={1.6} strokeLinecap="round" opacity={0.75} />
      <Path d={`M ${x + l * 0.3} -${h / 2} q 6 4 2 10`} stroke={veine} strokeWidth={1.4} fill="none" opacity={0.6} />
      <Ellipse cx={x + l - 7} cy={0} rx={7} ry={h / 2} fill={tranche} />
      <Ellipse cx={x + l - 7} cy={0} rx={4.2} ry={h / 2 - 3.5} fill="none" stroke={cerne} strokeWidth={1.1} />
      <Ellipse cx={x + l - 7} cy={0} rx={1.6} ry={2.6} fill={cerne} />
      <Ellipse cx={x + 7} cy={0} rx={7} ry={h / 2} fill={veine} opacity={0.55} />
    </G>
  );
}

/** Bûche qui tombe quand on la perd : elle glisse, tourne et s'efface. */
function BucheAnimee({ place, index, presente, anim }: { place: typeof PLACES[number]; index: number; presente: boolean; anim: boolean }) {
  const v = useRef(new Animated.Value(presente ? 0 : 1)).current;
  useEffect(() => {
    if (!anim) { v.setValue(presente ? 0 : 1); return; }
    Animated.timing(v, { toValue: presente ? 0 : 1, duration: presente ? 250 : 650, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
  }, [presente, anim, v]);
  const cote = place.a < 0 || (place.a === 0 && index % 2 === 0) ? -1 : 1;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: 240, height: 210, opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0] }),
      transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, cote * 46] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 34] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${cote * 38}deg`] }) }] }}>
      <Svg width={240} height={210} viewBox="0 0 240 210">
        <G transform={`translate(${place.x} ${place.y}) rotate(${place.a})`}><Buche l={place.l} teinte={BOIS[index % BOIS.length]} /></G>
      </Svg>
    </Animated.View>
  );
}

const FLAMME = 'M50 2 C58 22 84 38 82 66 C81 86 67 99 50 99 C33 99 19 86 18 66 C17 47 33 41 37 22 C41 31 44 35 46 40 C46 25 47 12 50 2 Z';

export function FeuDeBois({ total, restant, largeur = 240 }: { total: number; restant: number; largeur?: number }) {
  const { prefs, reduireAnim } = usePrefs();
  const anim = !reduireAnim && prefs.animations !== 'aucune';
  const n = Math.max(1, Math.min(PLACES.length, total));
  const r = Math.max(0, Math.min(n, restant));
  const part = r / n;
  const danse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!anim || r === 0) return;
    const b = Animated.loop(Animated.sequence([
      Animated.timing(danse, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(danse, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    b.start();
    return () => b.stop();
  }, [anim, r === 0, danse]); // eslint-disable-line react-hooks/exhaustive-deps
  // La flamme : hauteur selon le bois restant ; elle part du cœur du tas.
  const hF = 46 + 108 * part, lF = hF * 0.74, piedF = 172;
  const echelle = largeur / 240;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={r === 0 ? 'Le feu de bois est éteint' : `Feu de bois : ${r} bûche${r > 1 ? 's' : ''} sur ${n}`}
      style={{ width: largeur, height: 210 * echelle }}>
      <View style={{ width: 240, height: 210, transform: [{ scale: echelle }], transformOrigin: 'top left' as never }}>
        <Svg width={240} height={210} viewBox="0 0 240 210" style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id="lueur" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#F59E0B" stopOpacity={0.5 * part} /><Stop offset="1" stopColor="#F59E0B" stopOpacity={0} /></RadialGradient>
          </Defs>
          {r > 0 && <Circle cx={120} cy={126} r={106} fill="url(#lueur)" />}
          {/* cendres et pierres du foyer */}
          <Ellipse cx={120} cy={194} rx={104} ry={11} fill="#3B2A21" opacity={0.55} />
          {[[26, 192], [48, 199], [192, 199], [214, 192], [78, 203], [162, 203]].map(([x, y], i) => <Ellipse key={i} cx={x} cy={y} rx={12} ry={7.5} fill={i % 2 ? '#8A7C73' : '#74675F'} />)}
          {/* braises : il en reste toujours un peu, même sans flamme */}
          {[[96, 190], [112, 193], [128, 191], [144, 193], [120, 187]].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={3.2} fill={r === 0 ? '#5A2414' : i % 2 ? '#F59E0B' : '#E2522B'} opacity={r === 0 ? 0.9 : 0.95} />)}
        </Svg>
        {PLACES.slice(0, n).map((p, i) => !p.devant && <BucheAnimee key={i} place={p} index={i} presente={i < r} anim={anim} />)}
        {r > 0 && (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 120 - lF / 2, top: piedF - hF, width: lF, height: hF, transformOrigin: 'bottom' as never,
            transform: anim ? [{ scaleY: danse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }, { scaleX: danse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }) }, { rotate: danse.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '2deg'] }) }] : [] }}>
            <Svg width={lF} height={hF} viewBox="0 0 100 100" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="f1" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#F97316" /><Stop offset="1" stopColor="#C2410C" /></LinearGradient>
                <LinearGradient id="f2" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FBBF24" /><Stop offset="1" stopColor="#F59E0B" /></LinearGradient>
              </Defs>
              <Path d={FLAMME} fill="url(#f1)" />
              <G transform="translate(50 99) scale(0.68) translate(-50 -99)"><Path d={FLAMME} fill="url(#f2)" /></G>
              <G transform="translate(50 99) scale(0.38) translate(-50 -99)"><Path d={FLAMME} fill="#FEF3C7" /></G>
              {/* langues de feu sur les côtés */}
              <Path d="M22 96 C12 84 16 68 26 58 C25 72 31 78 34 88 Z" fill="#F97316" opacity={0.9} />
              <Path d="M78 96 C89 85 86 70 76 60 C76 73 70 79 67 89 Z" fill="#F97316" opacity={0.9} />
            </Svg>
          </Animated.View>
        )}
        {r === 0 && (
          <Svg width={240} height={210} viewBox="0 0 240 210" style={{ position: 'absolute' }}>
            <Path d="M112 150 C100 128 124 116 112 94 C104 78 120 68 114 50" stroke="#9A8F88" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.55} />
            <Path d="M130 156 C140 138 122 128 132 108 C138 96 128 88 132 74" stroke="#B5ABA4" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.45} />
            <G transform="translate(120 184)"><Buche l={150} teinte="#2B1D16" charbon /></G>
          </Svg>
        )}
        {PLACES.slice(0, n).map((p, i) => p.devant && <BucheAnimee key={i} place={p} index={i} presente={i < r} anim={anim} />)}
        {/* étincelles */}
        {r > 0 && anim && [[-34, 0.9], [30, 0.6], [6, 0.75]].map(([dx, k], i) => (
          <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', left: 120 + dx, top: piedF - hF * k, width: 5, height: 5, borderRadius: 3, backgroundColor: '#FDE047',
            opacity: danse.interpolate({ inputRange: [0, 1], outputRange: i % 2 ? [0.1, 0.9] : [0.9, 0.1] }), transform: [{ translateY: danse.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }} />
        ))}
      </View>
    </View>
  );
}
