/**
 * Formats immersifs des cours d'Onenji (15 nov. 2026) : illustrations animées, sons décrits dans leur propre système (API, articulation,
 * schéma de la bouche, flux d'air), mélodie des tons, écriture au doigt et scènes à explorer. Aucune comparaison au français :
 * le myènè a une phonétique plus riche (implosives, aspirées, labio-palatale, tons…) — consigne de Capp. Données : noyau/phonetique.ts.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { exempleComplet, exemplesSon, graphieDondo, melodie, phonemeDe, zonesDe, type Exercice, type Hauteur, type Phoneme, type ZoneScene } from '@nkala/noyau';
import { Bouton, Carte, Ic, T, Visuel, useBloquerDefilement } from './kit';
import { useMedia } from './OnenjiHorsLigne';
import { usePrefs, useTheme } from './Prefs';

// ------------------------------------------------------------------ outils d'animation
/** Horloge en secondes (≈ 30 images par seconde), arrêtée si les animations sont coupées. */
export function useHorloge(actif = true): number {
  const { reduireAnim } = usePrefs();
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!actif || reduireAnim) return;
    let id: ReturnType<typeof setTimeout>; const t0 = Date.now();
    const tic = () => { setT((Date.now() - t0) / 1000); id = setTimeout(tic, 33); };
    tic();
    return () => clearTimeout(id);
  }, [actif, reduireAnim]);
  return t;
}
/** Entrée d'un exercice : fondu et léger glissement vers le haut. */
export function EntreeAnimee({ cle, children }: { cle: string; children: React.ReactNode }) {
  const { reduireAnim } = usePrefs();
  const v = useRef(new Animated.Value(reduireAnim ? 1 : 0)).current;
  useEffect(() => { if (reduireAnim) return; v.setValue(0); Animated.timing(v, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>{children}</Animated.View>;
}

// ------------------------------------------------------------------ illustration
/** Illustration d'un exercice : photo (avec crédit) si elle existe, sinon émoji animé (« pop » puis légère respiration). */
export function Illustration({ image, illustration, credit, taille = 150 }: { image?: string | null; illustration?: string | null; credit?: string | null; taille?: number }) {
  const { c } = useTheme();
  const uri = useMedia(image);
  const t = useHorloge(!image && !!illustration);
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => { pop.setValue(0); Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start(); }, [image, illustration]); // eslint-disable-line react-hooks/exhaustive-deps
  if (image) return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}><Visuel uri={uri} largeur={taille} hauteur={taille} rayon={24} icone="image" /></Animated.View>
      {!!credit && <T v="petit" style={{ fontSize: 10, color: c.discret, maxWidth: taille + 80, textAlign: 'center' }}>{credit}</T>}
    </View>
  );
  if (!illustration) return null;
  const respire = 1 + Math.sin(t * 2) * 0.035;
  return (
    <Animated.View style={{ alignItems: 'center', justifyContent: 'center', width: taille, height: taille, borderRadius: taille / 2, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord,
      transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}>
      <T style={{ fontSize: taille * 0.55, lineHeight: taille * 0.7, transform: [{ scale: respire }] }} accessibilityElementsHidden>{illustration}</T>
    </Animated.View>
  );
}

// ------------------------------------------------------------------ bouche (voyelles)
/** Lèvres vues de face : ouverture selon le degré d'aperture (1 fermé → 4 ouvert), arrondies pour la série postérieure. */
export function Bouche({ aperture = 2, serie = 'antérieure', taille = 170 }: { aperture?: number; serie?: Phoneme['serie']; taille?: number }) {
  const t = useHorloge();
  const pulse = (Math.sin(t * 2.4) + 1) / 2; // l'animation montre le geste : on ouvre jusqu'à la position du son, puis on revient
  const ouvert = 0.18 + ((aperture - 1) / 3) * 0.82;
  const h = 10 + ouvert * 46 * (0.55 + 0.45 * pulse);
  const arrondie = serie === 'postérieure';
  const l = arrondie ? 40 + (1 - ouvert) * 6 : serie === 'centrale' ? 70 : 82;
  const cx = 100, cy = 70;
  return (
    <Svg width={taille} height={taille * 0.7} viewBox="0 0 200 140" accessibilityLabel={`Lèvres : aperture ${aperture} sur 4, ${arrondie ? 'arrondies' : 'étirées'}`}>
      <Ellipse cx={cx} cy={cy} rx={l + 16} ry={h / 2 + 16} fill="#C2410C" />
      <Ellipse cx={cx} cy={cy} rx={l} ry={h / 2} fill="#2A0E05" />
      {aperture >= 2 && <Rect x={cx - l * 0.6} y={cy - h / 2} width={l * 1.2} height={Math.min(10, h / 3)} rx={3} fill="#FFF7ED" />}
      {aperture >= 3 && <Ellipse cx={cx} cy={cy + h / 2 - 6} rx={l * 0.45} ry={Math.max(3, h / 6)} fill="#E11D48" opacity={0.85} />}
    </Svg>
  );
}

// ------------------------------------------------------------------ lieu d'articulation (consonnes)
const LIEUX: Record<NonNullable<Phoneme['lieu']>, { x: number; y: number }[]> = {
  'lèvres': [{ x: 34, y: 92 }], 'lèvres-dents': [{ x: 38, y: 84 }], 'alvéoles': [{ x: 58, y: 74 }], 'palais': [{ x: 92, y: 62 }],
  'voile': [{ x: 128, y: 70 }], 'lèvres-palais': [{ x: 34, y: 92 }, { x: 92, y: 62 }], 'lèvres-voile': [{ x: 34, y: 92 }, { x: 128, y: 70 }],
};
/** Coupe de profil de la bouche : le lieu d'articulation pulse ; l'air entre (implosive) ou souffle (aspirée). */
export function SchemaArticulation({ p, taille = 220 }: { p: Phoneme; taille?: number }) {
  const { c } = useTheme();
  const t = useHorloge();
  const points = p.lieu ? LIEUX[p.lieu] : [];
  const r = 7 + Math.sin(t * 4) * 2.5;
  const fl = (t * 0.9) % 1;
  return (
    <Svg width={taille} height={taille * 0.75} viewBox="0 0 180 135" accessibilityLabel={`Lieu d'articulation : ${p.lieu ?? 'non précisé'}${p.air === 'implosif' ? ', l\'air entre' : p.air === 'aspiré' ? ', souffle' : ''}`}>
      {/* profil : nez, lèvres, menton, gorge */}
      <Path d="M150 10 C 110 4, 60 8, 46 30 L 30 52 L 40 56 L 34 70 C 28 80, 30 86, 36 88 L 30 94 C 30 100, 36 104, 42 104 L 44 120 C 70 132, 110 132, 140 120" fill="none" stroke={c.fort} strokeWidth={2.5} />
      {/* palais et voile */}
      <Path d="M48 76 C 70 58, 110 54, 138 66" fill="none" stroke={c.discret} strokeWidth={2} strokeDasharray="4 3" />
      {/* langue */}
      <Path d="M46 96 C 70 80, 112 80, 140 92 L 140 108 L 46 104 Z" fill="#E11D48" opacity={0.75} />
      {points.map((q, i) => <Circle key={i} cx={q.x} cy={q.y} r={r} fill={c.accent} opacity={0.9} />)}
      {p.air === 'implosif' && <G>{[0, 1, 2].map(k => { const x = 10 + ((fl + k / 3) % 1) * 26; return <Line key={k} x1={x} y1={92} x2={x + 6} y2={92} stroke={c.accent} strokeWidth={2} />; })}<Path d="M30 86 l6 6 l-6 6" stroke={c.accent} strokeWidth={2} fill="none" /></G>}
      {p.air === 'aspiré' && <G>{[0, 1, 2].map(k => { const x = 26 - ((fl + k / 3) % 1) * 22; return <Circle key={k} cx={x} cy={92 - k * 3} r={2 + k} fill={c.discret} opacity={0.6} />; })}</G>}
    </Svg>
  );
}

// ------------------------------------------------------------------ mélodie tonale
const HAUT: Record<Hauteur, [number, number]> = { H: [0.15, 0.15], A: [0.48, 0.48], B: [0.82, 0.82], HB: [0.15, 0.82], AB: [0.48, 0.82] };
/** Mélodie d'une transcription : chaque syllabe à sa hauteur (haut, haut-abaissé, bas) ; les tons modulés glissent ; un point balaie la phrase. */
export function MelodieTonale({ transcription, largeur = 300 }: { transcription: string; largeur?: number }) {
  const { c } = useTheme();
  const t = useHorloge();
  const syl = useMemo(() => melodie(transcription), [transcription]);
  const n = Math.max(1, syl.length), pas = (largeur - 30) / n, hh = 110;
  const pts: { x: number; y: number }[] = [];
  syl.forEach((s, i) => { const [a, b] = HAUT[s.ton ?? 'A']; pts.push({ x: 15 + i * pas + pas * 0.25, y: 12 + a * (hh - 30) }); pts.push({ x: 15 + i * pas + pas * 0.75, y: 12 + b * (hh - 30) }); });
  const k = Math.floor(((t * 0.6) % 1) * n);
  return (
    <Svg width={largeur} height={hh + 26} accessibilityLabel={`Mélodie : ${syl.map(s => `${s.syllabe} ${s.ton ?? 'sans ton noté'}`).join(', ')}`}>
      {[['haut', 0.15], ['abaissé', 0.48], ['bas', 0.82]].map(([nom, y]) => <Line key={String(nom)} x1={10} x2={largeur - 10} y1={12 + Number(y) * (hh - 30)} y2={12 + Number(y) * (hh - 30)} stroke={c.bord} strokeDasharray="3 4" />)}
      <Polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={c.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {syl.map((s, i) => (
        <G key={i}>
          <Circle cx={pts[i * 2].x} cy={pts[i * 2].y} r={i === k ? 8 : 5} fill={i === k ? c.accent : c.fort} />
          <SvgText x={15 + i * pas + pas / 2} y={hh + 14} fontSize={16} fill={c.fort} textAnchor="middle" fontStyle="italic">{s.syllabe.trim()}</SvgText>
        </G>
      ))}
    </Svg>
  );
}

// ------------------------------------------------------------------ cartes
/** Carte d'un son : API géant, graphie DONDO, articulation, schéma animé (bouche ou lieu d'articulation), distribution et exemples. */
export function CarteSon({ ex, enfant, onSuite, Son }: { ex: Exercice; enfant: boolean; onSuite: () => void; Son: React.ComponentType<{ audio?: string | null; lent?: boolean; auto?: boolean; grand?: boolean }> }) {
  const { c } = useTheme();
  const p = phonemeDe(ex.graphie);
  const exemples = exemplesSon(ex.options);
  // Exemples du contenu d'abord, puis ceux de la table des sons (Ambouroue, avec les tons) qui ne font pas doublon.
  const duContenu = exemples.map(e => ({ ...exempleComplet(e), illustration: e.illustration }));
  // Chaque mot avec son écriture, sa transcription (tons) et son sens : l'écriture vient de la transcription si le corpus ne la donne pas.
  const deLaTable = (p?.exemples ?? []).map(e => ({ ...exempleComplet(e), illustration: null as string | null }));
  const cle = (e: { mot: string; sens: string }) => `${e.mot.toLowerCase()}|${e.sens.toLowerCase()}`;
  const liste = [...duContenu, ...deLaTable.filter(e => !duContenu.some(d => cle(d) === cle(e) || (!!e.mot && d.mot.toLowerCase() === e.mot.toLowerCase())))];
  return (
    <View style={{ gap: 14, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: 120, height: 120, borderRadius: 30, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 54, lineHeight: 64, color: c.surAccent }} accessibilityLabel={`Son ${p?.api ?? ex.graphie}`}>{p?.api ?? ex.graphie}</T>
        </View>
        {!!ex.audio && <Son audio={ex.audio} lent grand />}
      </View>
      {p && <T v="sousTitre" style={{ textAlign: 'center' }}>Graphie : <T v="sousTitre" style={{ fontStyle: 'italic' }} couleur={c.accent}>{p.graphie}</T></T>}
      {p && !enfant && <T v="corps" style={{ textAlign: 'center' }}>{p.articulation}</T>}
      {p?.type === 'voyelle' ? <Bouche aperture={p.aperture} serie={p.serie} /> : p ? <SchemaArticulation p={p} /> : null}
      {p?.air && <T v="petit" couleur={c.accent}>{p.air === 'implosif' ? 'Implosive : l\'air entre dans la bouche au relâchement.' : 'Aspirée : un souffle suit l\'occlusion.'}</T>}
      {!!p?.distribution && !enfant && <Carte plat style={{ alignSelf: 'stretch' }}><View style={{ padding: 12 }}><T v="petit">{p.distribution}</T></View></Carte>}
      {!!ex.texte && <T v="corps" style={{ textAlign: 'center' }}>{ex.texte}</T>}
      <View style={{ alignSelf: 'stretch', gap: 8 }}>
        {liste.map((e, i) => (
          <Carte key={i} plat><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
            {!!e.illustration && <T style={{ fontSize: 34 }}>{e.illustration}</T>}
            <View style={{ flex: 1 }}>
              {!!e.mot && <T v="carte" style={{ fontStyle: 'italic' }}>{e.mot}</T>}
              {!!e.phonetique && <T v="corps" couleur={c.accent}>{e.phonetique}</T>}
              <T v="petit">« {e.sens} »</T>
            </View>
          </View></Carte>
        ))}
      </View>
      <Bouton label="J'ai compris" onPress={onSuite} />
    </View>
  );
}

/** Carte des tons : la mélodie de la transcription, puis la consigne ou l'explication. */
export function CarteTon({ ex, onSuite }: { ex: Exercice; onSuite: () => void }) {
  const { c } = useTheme();
  const [w, setW] = useState(300);
  const paires = exemplesSon(ex.options);
  return (
    <View style={{ gap: 14 }} onLayout={(e: LayoutChangeEvent) => setW(Math.min(420, e.nativeEvent.layout.width))}>
      {!!(ex.mot_myene || ex.phonetique) && <T v="titre" style={{ textAlign: 'center', fontStyle: 'italic' }}>{ex.mot_myene || graphieDondo(ex.phonetique)}</T>}
      {!!ex.phonetique && <><T v="sousTitre" style={{ textAlign: 'center' }} couleur={c.accent}>{ex.phonetique}</T><View style={{ alignItems: 'center' }}><MelodieTonale transcription={ex.phonetique} largeur={w} /></View></>}
      {!!ex.mot_francais && <T v="corps" style={{ textAlign: 'center' }}>« {ex.mot_francais} »</T>}
      {!!ex.texte && <Carte plat><View style={{ padding: 12 }}><T v="corps">{ex.texte}</T></View></Carte>}
      {paires.map((p, i) => (
        <Carte key={i} plat><View style={{ padding: 12, gap: 4 }}>
          <T v="carte" style={{ fontStyle: 'italic' }}>{p.mot || graphieDondo(p.phonetique)}</T>{!!p.phonetique && <T v="corps" couleur={c.accent}>{p.phonetique}</T>}<T v="petit">« {p.sens} »</T>
          {!!p.phonetique && <MelodieTonale transcription={p.phonetique} largeur={Math.min(w - 24, 280)} />}
        </View></Carte>
      ))}
      <Bouton label="Continuer" onPress={onSuite} />
    </View>
  );
}

// ------------------------------------------------------------------ écrire au doigt
/** Écrire la lettre au doigt sur un modèle en pointillés. Entraînement : la trace doit couvrir assez la zone du modèle. */
export function Tracer({ ex, onSuite }: { ex: Exercice; onSuite: () => void }) {
  const { c } = useTheme();
  const T_ = 260;
  const [traits, setTraits] = useState<{ x: number; y: number }[][]>([]);
  const courant = useRef<{ x: number; y: number }[]>([]);
  const [, maj] = useState(0);
  const lettre = (ex.graphie ?? ex.mot_myene ?? '').trim();
  // Le geste appartient à la zone d'écriture : capture, refus de le céder, défilement de l'écran bloqué pendant le tracé
  // (sinon la page défile sous le doigt). Coordonnées relatives à la zone (pageX/Y moins sa position) : locationX/Y
  // change de référence quand le doigt passe sur le tracé SVG.
  const bloquer = useBloquerDefilement();
  const zone = useRef<View>(null);
  const origine = useRef({ x: 0, y: 0 });
  const point = (e: GestureResponderEvent) => ({ x: Math.max(0, Math.min(T_, e.nativeEvent.pageX - origine.current.x)), y: Math.max(0, Math.min(T_, e.nativeEvent.pageY - origine.current.y)) });
  const finir = () => { bloquer(false); const t = courant.current; courant.current = []; if (t.length > 2) setTraits(a => [...a, t]); else maj(n => n + 1); };
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true, onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false, onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: e => {
      bloquer(true);
      const { pageX, pageY, locationX, locationY } = e.nativeEvent;
      origine.current = { x: pageX - locationX, y: pageY - locationY };
      courant.current = [point(e)]; maj(n => n + 1);
    },
    onPanResponderMove: e => { courant.current.push(point(e)); maj(n => n + 1); },
    onPanResponderRelease: finir, onPanResponderTerminate: finir,
  }), [bloquer]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => bloquer(false), [bloquer]);
  const tous = [...traits, courant.current];
  const longueur = tous.reduce((s, tr) => s + tr.slice(1).reduce((m, p, i) => m + Math.hypot(p.x - tr[i].x, p.y - tr[i].y), 0), 0);
  const assez = longueur > T_ * 1.4;
  return (
    <View style={{ gap: 12, alignItems: 'center' }}>
      <T v="petit">Écris « {lettre} » avec le doigt, en suivant le modèle.</T>
      <View ref={zone} {...pan.panHandlers} style={[{ width: T_, height: T_, borderRadius: 24, backgroundColor: c.carte, borderWidth: 2, borderColor: assez ? c.succes : c.bord, overflow: 'hidden' }, Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none', cursor: 'crosshair' } as object) : null]}>
        <Svg width={T_} height={T_} pointerEvents="none">
          <SvgText x={T_ / 2} y={T_ * 0.74} fontSize={T_ * 0.62} textAnchor="middle" fill="none" stroke={c.discret} strokeWidth={2} strokeDasharray="6 6">{lettre}</SvgText>
          {tous.map((tr, i) => tr.length > 1 && <Polyline key={i} points={tr.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={c.accent} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />)}
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Bouton label="Effacer" variante="fantome" petit large={false} onPress={() => setTraits([])} />
        <Bouton label={assez ? 'Bien écrit, continuer' : 'Continuer'} petit large={false} variante={assez ? 'ambre' : 'brique'} onPress={onSuite} />
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ scènes à explorer
/** Décor animé (lagune ou village) : ciel, soleil, eau ou sol ; les éléments viennent du contenu (colonne « zones »). */
function Decor({ scene, l, h, t }: { scene: string; l: number; h: number; t: number }) {
  const vague = (dy: number, amp: number, ph: number) => { let d = `M 0 ${h * dy}`; for (let x = 0; x <= l; x += 20) d += ` L ${x} ${h * dy + Math.sin(x / 40 + t * 1.6 + ph) * amp}`; return d + ` L ${l} ${h} L 0 ${h} Z`; };
  return (
    <>
      <Defs>
        <LinearGradient id="ciel" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#38BDF8" /><Stop offset="1" stopColor="#FDE68A" /></LinearGradient>
        <LinearGradient id="eau" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#0EA5E9" /><Stop offset="1" stopColor="#075985" /></LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={l} height={h} fill="url(#ciel)" />
      <G>{Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2 + t * 0.3; return <Line key={i} x1={l * 0.82 + Math.cos(a) * 24} y1={h * 0.16 + Math.sin(a) * 24} x2={l * 0.82 + Math.cos(a) * 36} y2={h * 0.16 + Math.sin(a) * 36} stroke="#FBBF24" strokeWidth={3} />; })}</G>
      <Circle cx={l * 0.82} cy={h * 0.16} r={20} fill="#F59E0B" />
      {scene === 'village' ? <>
        <Rect x={0} y={h * 0.62} width={l} height={h * 0.38} fill="#A16207" />
        <Path d={`M ${l * 0.1} ${h * 0.62} L ${l * 0.2} ${h * 0.44} L ${l * 0.3} ${h * 0.62} Z`} fill="#78350F" />
        <Rect x={l * 0.13} y={h * 0.62} width={l * 0.14} height={h * 0.14} fill="#D6A15E" />
      </> : <>
        <Path d={vague(0.58, 5, 0)} fill="url(#eau)" />
        <Path d={vague(0.68, 4, 1.7)} fill="#0369A1" opacity={0.6} />
        <Path d={`M 0 ${h * 0.6} Q ${l * 0.18} ${h * 0.5} ${l * 0.32} ${h * 0.6} L ${l * 0.32} ${h} L 0 ${h} Z`} fill="#65A30D" />
      </>}
      {/* palmier */}
      <Line x1={l * 0.08} y1={h * 0.6} x2={l * 0.12} y2={h * 0.28} stroke="#78350F" strokeWidth={5} />
      {[-1.2, -0.5, 0.3, 1.0].map((a, i) => <Path key={i} d={`M ${l * 0.12} ${h * 0.28} q ${Math.cos(a + Math.sin(t) * 0.05) * 30} ${-14 + Math.sin(a) * 10} ${Math.cos(a) * 52} ${Math.sin(a) * 22 + 6}`} stroke="#15803D" strokeWidth={5} fill="none" />)}
    </>
  );
}

/** Scène : on touche chaque élément pour le découvrir (mot, sens, son), puis Kak'Igonjo demande d'en retrouver trois. */
export function SceneImmersive({ ex, onRepondre, Son }: { ex: Exercice; onRepondre: (juste: boolean) => void; Son: React.ComponentType<{ audio?: string | null; auto?: boolean }> }) {
  const { c } = useTheme();
  const zones = useMemo(() => zonesDe(ex), [ex.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [l, setL] = useState(320); const h = Math.round(l * 0.68);
  const t = useHorloge();
  const [vus, setVus] = useState<Set<number>>(new Set());
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<{ cibles: number[]; i: number; bonnes: number } | null>(null);
  const [retour, setRetour] = useState<{ ok: boolean; z: number } | null>(null);
  const toucher = (i: number) => {
    if (quiz) {
      const ok = i === quiz.cibles[quiz.i]; setRetour({ ok, z: i });
      setTimeout(() => {
        setRetour(null);
        const bonnes = quiz.bonnes + (ok ? 1 : 0);
        if (quiz.i + 1 >= quiz.cibles.length) onRepondre(bonnes >= quiz.cibles.length - 1);
        else setQuiz({ ...quiz, i: quiz.i + 1, bonnes });
      }, ok ? 700 : 1300);
      return;
    }
    setOuvert(i); setVus(v => new Set(v).add(i));
  };
  const lancerQuiz = () => { const ord = [...zones.keys()].sort(() => Math.random() - 0.5).slice(0, Math.min(3, zones.length)); setOuvert(null); setQuiz({ cibles: ord, i: 0, bonnes: 0 }); };
  if (!zones.length) return <View style={{ gap: 12 }}><T v="corps">Cette scène n'a pas encore d'éléments.</T><Bouton label="Continuer" onPress={() => onRepondre(true)} /></View>;
  const z: ZoneScene | undefined = ouvert !== null ? zones[ouvert] : undefined;
  return (
    <View style={{ gap: 12 }} onLayout={e => setL(Math.min(520, e.nativeEvent.layout.width))}>
      <T v="petit">{quiz ? `Touche : « ${zones[quiz.cibles[quiz.i]].mot} »  (${quiz.i + 1}/${quiz.cibles.length})` : `Touche ce que tu vois pour l'apprendre (${vus.size}/${zones.length}).`}</T>
      <View style={{ width: l, height: h, borderRadius: 22, overflow: 'hidden', alignSelf: 'center' }}>
        <Svg width={l} height={h} pointerEvents="none"><Decor scene={ex.scene ?? 'lagune'} l={l} h={h} t={t} /></Svg>
        {zones.map((zo, i) => {
          const flotte = Math.sin(t * 1.8 + i) * 4, taille = Math.max(40, l * 0.12);
          const bord = retour?.z === i ? (retour.ok ? c.succes : c.erreur) : vus.has(i) && !quiz ? c.surAccent : 'transparent';
          return (
            <Pressable key={i} accessibilityRole="button" accessibilityLabel={quiz ? `Élément ${i + 1}` : `${zo.mot}, ${zo.sens}`} onPress={() => toucher(i)} hitSlop={6}
              style={{ position: 'absolute', left: (zo.x / 100) * l - taille / 2, top: (zo.y / 100) * h - taille / 2 + flotte, width: taille, height: taille, borderRadius: taille / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: bord, backgroundColor: 'rgba(255,255,255,0.18)' }}>
              <T style={{ fontSize: taille * 0.62, lineHeight: taille * 0.8 }}>{zo.illustration ?? '❔'}</T>
            </Pressable>
          );
        })}
      </View>
      {z && !quiz && <Carte><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <T style={{ fontSize: 40 }}>{z.illustration}</T>
        <View style={{ flex: 1 }}><T v="titre" style={{ fontStyle: 'italic' }}>{z.mot}</T><T v="corps">« {z.sens} »</T></View>
        {!!z.audio && <Son audio={z.audio} auto />}
      </View></Carte>}
      {!quiz && <Bouton label={vus.size >= zones.length ? 'À toi : retrouve-les' : `Encore ${zones.length - vus.size} à découvrir`} variante={vus.size >= zones.length ? 'ambre' : 'fantome'} desactive={vus.size < Math.min(zones.length, 3)} onPress={lancerQuiz} />}
    </View>
  );
}

/** « Quel son ? » : le mot (illustré, avec sa transcription), puis les sons proposés ; la bonne réponse se surligne dans le mot. */
export function QuelSon({ ex, onRepondre, Son, opts }: { ex: Exercice; onRepondre: (juste: boolean) => void; Son: React.ComponentType<{ audio?: string | null; auto?: boolean; lent?: boolean }>; opts: string[] }) {
  const { c } = useTheme();
  const [choisi, setChoisi] = useState<string | null>(null);
  const bon = (o: string) => o.trim() === (ex.reponse ?? '').trim();
  const fin = (o: string) => { if (choisi) return; setChoisi(o); const ok = bon(o); setTimeout(() => onRepondre(ok), ok ? 900 : 1700); };
  return (
    <View style={{ gap: 14, alignItems: 'center' }}>
      <Illustration image={ex.image} illustration={ex.illustration} credit={ex.credit_image} taille={130} />
      {!!(ex.mot_myene || ex.phonetique) && <T v="titre" style={{ fontStyle: 'italic', textAlign: 'center' }}>{ex.mot_myene || graphieDondo(ex.phonetique)}</T>}
      {!!ex.phonetique && <T v="sousTitre" couleur={c.accent}>{ex.phonetique}</T>}
      {!!ex.mot_francais && <T v="petit">« {ex.mot_francais} »</T>}
      {!!ex.audio && <Son audio={ex.audio} auto lent />}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {opts.map(o => {
          const etat = choisi ? (bon(o) ? 'ok' : choisi === o ? 'ko' : 'n') : 'n';
          return (
            <Pressable key={o} accessibilityRole="button" accessibilityLabel={o} disabled={!!choisi} onPress={() => fin(o)}
              style={{ minWidth: 72, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, alignItems: 'center', borderWidth: 2, backgroundColor: etat === 'ok' ? c.succes + '33' : etat === 'ko' ? c.erreur + '33' : c.carte, borderColor: etat === 'ok' ? c.succes : etat === 'ko' ? c.erreur : c.bord }}>
              <T style={{ fontSize: 26, lineHeight: 32 }} couleur={c.fort}>{o}</T>
            </Pressable>
          );
        })}
      </View>
      {choisi && !bon(choisi) && !!ex.indice && <T v="petit" accessibilityRole="alert">{ex.indice}</T>}
      {choisi && <Ic nom={bon(choisi) ? 'ok' : 'fermer'} taille={28} couleur={bon(choisi) ? c.succes : c.erreur} />}
    </View>
  );
}
