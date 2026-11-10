/**
 * Kit de composants Nkala (canevas Design : « Système de composants », clair et sombre).
 * Tous lisent le thème courant (useTheme) et respectent « réduire les animations ».
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import NetInfo from '@react-native-community/netinfo';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle, type KeyboardTypeOptions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { usePrefs, useTheme } from './Prefs';
import { degrades, marque, ombres, polices, rayons, texte as styles } from './theme';

// ------------------------------------------------------------------ icônes sémantiques → Ionicons
const ICONES: Record<string, keyof typeof Ionicons.glyphMap> = {
  coeur: 'heart', croix: 'medkit', batiment: 'business', panier: 'basket', voiture: 'car', couvert: 'restaurant', livre: 'book', piece: 'cash', maison: 'home', mallette: 'briefcase',
  etiquette: 'pricetag', outil: 'construct', patte: 'paw', texte: 'text', corps: 'body', feuille: 'leaf', de: 'dice', etoile: 'star', coupe: 'trophy', flamme: 'flame', micro: 'mic',
  alerte: 'warning', urne: 'archive', papier: 'document-text', bus: 'bus', accueil: 'home', apprendre: 'school', jouer: 'game-controller', ecouter: 'headset', village: 'location',
  plus: 'ellipsis-horizontal', cloche: 'notifications', chercher: 'search', retour: 'chevron-back', suivant: 'chevron-forward', fermer: 'close', ok: 'checkmark', verrou: 'lock-closed',
  lecture: 'play', pause: 'pause', precedent: 'play-skip-back', suivantPiste: 'play-skip-forward', aleatoire: 'shuffle', boucle: 'repeat', telecharger: 'download', partage: 'share-social',
  profil: 'person', reglages: 'settings', telephone: 'call', itineraire: 'navigate', horloge: 'time', calendrier: 'calendar', camera: 'camera', image: 'image', video: 'videocam', radio: 'radio',
  tv: 'tv', musique: 'musical-notes', haut_parleur: 'volume-high', muet: 'volume-mute', info: 'information-circle', aide: 'help-circle', bouclier: 'shield-checkmark', reseau: 'cloud-offline', envoyer: 'send',
  ajouter: 'add', supprimer: 'trash', modifier: 'create', filtre: 'options', carte: 'map', liste: 'list', grille: 'grid', amis: 'people', duel: 'flash', cadeau: 'gift', couronne: 'ribbon', diplome: 'ribbon',
  soleil: 'sunny', lune: 'moon', parents: 'lock-closed', famille: 'people', jeton: 'sparkles', ia: 'sparkles', mic_off: 'mic-off', fleche_haut: 'arrow-up', fleche_bas: 'arrow-down', gauche: 'arrow-back',
  paris: 'dice', wifi: 'wifi', exporter: 'share', fichier: 'document', dossier: 'folder', stats: 'stats-chart', surveiller: 'pulse', moderer: 'shield', vote: 'checkbox', taxi: 'car', magazine: 'newspaper',
};
export function Ic({ nom, taille = 22, couleur, style }: { nom: string; taille?: number; couleur?: string; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <Ionicons name={ICONES[nom] ?? (nom as keyof typeof Ionicons.glyphMap) ?? 'ellipse'} size={taille} color={couleur ?? c.texte} style={style} />;
}

// ------------------------------------------------------------------ texte
type Variante = 'titre' | 'sousTitre' | 'carte' | 'corps' | 'petit' | 'libelle' | 'myene';
export function T({ v = 'corps', couleur, fort, children, style, ...rest }: TextProps & { v?: Variante; couleur?: string; fort?: boolean }) {
  const { c } = useTheme();
  const { prefs } = usePrefs();
  const base = { ...(styles[v] as TextStyle) };
  if (prefs.mode === 'facile') { base.fontSize = Math.round(((base.fontSize as number) || 15) * 1.25); base.lineHeight = Math.round(((base.lineHeight as number) || 21) * 1.25); }
  const col = couleur ?? (v === 'titre' || v === 'sousTitre' || v === 'carte' || fort ? c.fort : v === 'libelle' || v === 'petit' ? c.discret : c.texte);
  return <Text {...rest} style={[base, { color: col }, v === 'myene' ? { fontSize: 15, lineHeight: 21 } : null, style]}>{children}</Text>;
}

// ------------------------------------------------------------------ écran
export function Ecran({ children, defile = true, bas = 0, halo = true, style, contenu, onRafraichir, rafraichit }: {
  children: React.ReactNode; defile?: boolean; bas?: number; halo?: boolean; style?: StyleProp<ViewStyle>; contenu?: StyleProp<ViewStyle>; onRafraichir?: () => void; rafraichit?: boolean;
}) {
  const { c, clair } = useTheme();
  const ins = useSafeAreaInsets();
  const motif = Platform.OS === 'web' && !clair ? ({ backgroundImage: 'radial-gradient(#c85a32 0.6px, transparent 0.6px)', backgroundSize: '30px 30px' } as unknown as ViewStyle) : null;
  const corps = defile
    ? <ScrollView style={{ flex: 1 }} contentContainerStyle={[{ paddingTop: ins.top + 12, paddingHorizontal: 20, paddingBottom: bas + 24, gap: 18, width: '100%', maxWidth: 640, alignSelf: 'center' }, contenu]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
    : <View style={[{ flex: 1, paddingTop: ins.top + 12, paddingHorizontal: 20, width: '100%', maxWidth: 640, alignSelf: 'center' }, contenu]}>{children}</View>;
  return (
    <View style={[{ flex: 1, backgroundColor: c.fond }, motif, style]}>
      {halo && <>
        <View pointerEvents="none" style={{ position: 'absolute', top: -90, left: -70, width: 260, height: 260, borderRadius: 130, backgroundColor: c.halo1 }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 160, right: -110, width: 240, height: 240, borderRadius: 120, backgroundColor: c.halo2 }} />
      </>}
      {corps}
    </View>
  );
}

// ------------------------------------------------------------------ boutons
export function Bouton({ label, onPress, variante = 'brique', icone, charge, desactive, petit, large = true, style, accessibilite }: {
  label: string; onPress?: () => void; variante?: 'brique' | 'ambre' | 'fantome'; icone?: string; charge?: boolean; desactive?: boolean; petit?: boolean; large?: boolean; style?: StyleProp<ViewStyle>; accessibilite?: string;
}) {
  const { c } = useTheme();
  const { vibrer } = usePrefs();
  const h = petit ? 44 : 54;
  const coul = variante === 'ambre' ? '#170D08' : variante === 'fantome' ? c.texte : '#FDFAF7';
  const contenu = <>
    {charge ? <ActivityIndicator color={coul} /> : icone ? <Ic nom={icone} taille={petit ? 18 : 20} couleur={coul} /> : null}
    <Text style={{ fontFamily: polices.titre, fontSize: petit ? 14 : 16, color: coul }}>{label}</Text>
  </>;
  const interieur: ViewStyle = { height: h, borderRadius: petit ? 14 : 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: petit ? 16 : 22 };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilite ?? label} accessibilityState={{ disabled: !!desactive || !!charge }} disabled={desactive || charge}
      onPress={() => { vibrer('leger'); onPress?.(); }} style={({ pressed }) => [{ opacity: desactive ? 0.45 : pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], alignSelf: large ? 'stretch' : 'flex-start' }, variante !== 'fantome' ? ombres.bouton : null, style]}>
      {variante === 'fantome'
        ? <View style={[interieur, { borderWidth: 1.5, borderColor: c.bord }]}>{contenu}</View>
        : <LinearGradient colors={[...(variante === 'ambre' ? degrades.ambre : degrades.brique)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={interieur}>{contenu}</LinearGradient>}
    </Pressable>
  );
}

export function BoutonIcone({ nom, onPress, label, rond, taille = 44, actif, couleur }: { nom: string; onPress?: () => void; label: string; rond?: boolean; taille?: number; actif?: boolean; couleur?: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={onPress}
      style={({ pressed }) => ({ width: taille, height: taille, borderRadius: rond ? taille / 2 : 14, alignItems: 'center', justifyContent: 'center', backgroundColor: actif ? c.accent : c.carte, borderWidth: 1, borderColor: c.bord, opacity: pressed ? 0.8 : 1 })}>
      <Ic nom={nom} taille={taille * 0.5} couleur={couleur ?? (actif ? c.surAccent : c.texte)} />
    </Pressable>
  );
}

export function Puce({ label, actif, onPress, icone, couleur }: { label: string; actif?: boolean; onPress?: () => void; icone?: string; couleur?: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!actif }} onPress={onPress} style={{ minHeight: 34, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: actif ? (couleur ?? c.accent) : c.carte, borderWidth: 1, borderColor: actif ? 'transparent' : c.bord }}>
      {icone && <Ic nom={icone} taille={15} couleur={actif ? c.surAccent : c.texte} />}
      <Text style={{ fontFamily: polices.corpsGras, fontSize: 13, color: actif ? c.surAccent : c.texte }}>{label}</Text>
    </Pressable>
  );
}

export function Pastille({ label, couleur, fond }: { label: string; couleur?: string; fond?: string }) {
  const { c } = useTheme();
  return <View style={{ alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: fond ?? c.squelette }}><Text style={{ fontFamily: polices.corpsTresGras, fontSize: 12, color: couleur ?? c.texte }}>{label}</Text></View>;
}

// ------------------------------------------------------------------ cartes
export function Carte({ children, onPress, style, plat, accent, label }: { children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; plat?: boolean; accent?: string; label?: string }) {
  const { c } = useTheme();
  const base: ViewStyle = { borderRadius: plat ? 16 : 20, borderWidth: 1, borderColor: plat ? c.bord : c.bordAmbre, overflow: 'hidden' };
  // Les propriétés de disposition (largeur, flex…) vont sur l'enveloppe cliquable ; le reste sur la carte elle-même.
  const { width, flex, flexGrow, flexShrink, flexBasis, alignSelf, maxWidth, minWidth, ...reste } = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const mise = { width, flex, flexGrow, flexShrink, flexBasis, alignSelf, maxWidth, minWidth };
  const interne = onPress ? reste : style;
  const interieur = plat
    ? <View style={[base, { backgroundColor: c.carte }, interne]}>{children}</View>
    : <LinearGradient colors={accent ? [accent + '55', c.carteBas] : [c.carteHaut, c.carteBas]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={[base, ombres.carte, interne]}>{children}</LinearGradient>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [mise, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}>{interieur}</Pressable> : interieur;
}

export function Barre({ valeur, couleur, hauteur = 8 }: { valeur: number; couleur?: string; hauteur?: number }) {
  const { c } = useTheme();
  const v = Math.max(0, Math.min(1, valeur || 0));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }} style={{ height: hauteur, borderRadius: 999, backgroundColor: c.squelette, overflow: 'hidden' }}>
      <LinearGradient colors={couleur ? [couleur, couleur] : ['#C85A32', '#F59E0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${v * 100}%`, height: '100%', borderRadius: 999 }} />
    </View>
  );
}

export function Anneau({ valeur, taille = 64, epaisseur = 7, couleur, children }: { valeur: number; taille?: number; epaisseur?: number; couleur?: string; children?: React.ReactNode }) {
  const { c } = useTheme();
  const r = (taille - epaisseur) / 2, circ = 2 * Math.PI * r, v = Math.max(0, Math.min(1, valeur || 0));
  return (
    <View style={{ width: taille, height: taille, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={taille} height={taille} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={taille / 2} cy={taille / 2} r={r} stroke={c.squelette} strokeWidth={epaisseur} fill="none" />
        <Circle cx={taille / 2} cy={taille / 2} r={r} stroke={couleur ?? c.accent} strokeWidth={epaisseur} fill="none" strokeLinecap="round" strokeDasharray={`${circ * v} ${circ}`} />
      </Svg>
      {children}
    </View>
  );
}

// ------------------------------------------------------------------ champs
export function Champ({ valeur, onChange, placeholder, icone, secret, clavier, lignes, auto, maxLength, onSubmit, focus, style, label }: {
  valeur: string; onChange: (t: string) => void; placeholder?: string; icone?: string; secret?: boolean; clavier?: KeyboardTypeOptions; lignes?: number; auto?: 'none' | 'sentences' | 'words'; maxLength?: number; onSubmit?: () => void; focus?: boolean; style?: StyleProp<ViewStyle>; label?: string;
}) {
  const { c } = useTheme();
  const [f, setF] = useState(false);
  return (
    <View style={[{ minHeight: 56, borderRadius: 16, backgroundColor: c.carte, borderWidth: 1.5, borderColor: f ? c.accent : c.bord, flexDirection: 'row', alignItems: lignes ? 'flex-start' : 'center', gap: 10, paddingHorizontal: 16, paddingVertical: lignes ? 12 : 0 }, style]}>
      {icone && <Ic nom={icone} taille={20} couleur={c.discret} />}
      <TextInput accessibilityLabel={label ?? placeholder} value={valeur} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.discret} secureTextEntry={secret} keyboardType={clavier} multiline={!!lignes} numberOfLines={lignes}
        autoCapitalize={auto ?? 'none'} maxLength={maxLength} onSubmitEditing={onSubmit} autoFocus={focus} onFocus={() => setF(true)} onBlur={() => setF(false)}
        style={[{ flex: 1, fontFamily: polices.corps, fontSize: 16, color: c.fort, minHeight: lignes ? lignes * 22 : 54 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null]} />
    </View>
  );
}

// ------------------------------------------------------------------ animations
function useBoucle(duree: number, actif = true) {
  const v = useRef(new Animated.Value(0)).current;
  const { reduireAnim } = usePrefs();
  useEffect(() => {
    if (!actif || reduireAnim) { v.setValue(0.5); return; }
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: duree, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }));
    a.start();
    return () => a.stop();
  }, [actif, reduireAnim, duree, v]);
  return v;
}

export function Squelette({ l = '100%', h = 16, r = 10, style }: { l?: number | `${number}%`; h?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const v = useBoucle(1400);
  return <Animated.View style={[{ width: l, height: h, borderRadius: r, backgroundColor: c.squelette, opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.5] }) }, style]} />;
}

/** Onde sonore animée (barres qui pulsent). Moins de barres sur appareil modeste. */
export function Onde({ actif = true, barres = 18, hauteur = 48, couleur }: { actif?: boolean; barres?: number; hauteur?: number; couleur?: string }) {
  const { prefs } = usePrefs();
  const n = prefs.animations === 'legeres' ? Math.min(barres, 10) : barres;
  const v = useBoucle(1100, actif);
  const teintes = useMemo(() => [marque.ambre, marque.terre, marque.jaune], []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: hauteur }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: n }, (_, i) => {
        const dec = (i * 0.17) % 1;
        const echelle = v.interpolate({ inputRange: [0, 0.25 + dec * 0.1, 0.5, 0.75, 1], outputRange: [0.35, 1, 0.5, 0.9, 0.35] });
        return <Animated.View key={i} style={{ width: 5, height: hauteur, borderRadius: 4, backgroundColor: couleur ?? teintes[i % 3], transform: [{ scaleY: actif ? echelle : 0.35 }] }} />;
      })}
    </View>
  );
}

export function Flamme({ taille = 28, eteinte }: { taille?: number; eteinte?: boolean }) {
  const { prefs, reduireAnim } = usePrefs();
  const v = useBoucle(1600, !eteinte && prefs.animations === 'completes');
  return (
    <Animated.View style={{ transform: reduireAnim || prefs.animations !== 'completes' ? [] : [{ scale: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.1, 1] }) }] }}>
      <Ic nom="flamme" taille={taille} couleur={eteinte ? '#7a6256' : '#F59E0B'} />
    </Animated.View>
  );
}

/** Ozangué (« la lumière »), la mascotte : la barre de voix du symbole, avec deux yeux. */
export function Mascotte({ taille = 96, humeur = 'content' }: { taille?: number; humeur?: 'content' | 'triste' | 'parle' | 'dort' }) {
  const v = useBoucle(2400);
  const { prefs } = usePrefs();
  const rebond = prefs.animations === 'completes' ? v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -4, 0] }) : 0;
  const w = taille, h = taille;
  const bouche = humeur === 'triste' ? 'M 40 74 Q 50 66 60 74' : humeur === 'parle' ? 'M 42 70 Q 50 82 58 70 Z' : humeur === 'dort' ? 'M 42 72 L 58 72' : 'M 40 70 Q 50 80 60 70';
  return (
    <Animated.View style={{ transform: [{ translateY: rebond as number }] }} accessibilityLabel="Ozangué, la mascotte" accessible>
      <Svg width={w} height={h} viewBox="0 0 100 100">
        <Rect x={6} y={30} width={10} height={42} rx={5} fill="#C85A32" opacity={0.55} />
        <Rect x={84} y={30} width={10} height={42} rx={5} fill="#C85A32" opacity={0.55} />
        <Rect x={19} y={38} width={9} height={26} rx={4.5} fill="#F59E0B" opacity={0.6} />
        <Rect x={72} y={38} width={9} height={26} rx={4.5} fill="#F59E0B" opacity={0.6} />
        <Rect x={30} y={8} width={40} height={84} rx={20} fill="#B84A28" />
        <Rect x={34} y={12} width={14} height={30} rx={7} fill="#FFFFFF" opacity={0.12} />
        {humeur === 'dort' ? <>
          <Rect x={37} y={40} width={10} height={3} rx={1.5} fill="#FDFAF7" /><Rect x={53} y={40} width={10} height={3} rx={1.5} fill="#FDFAF7" />
        </> : <>
          <Ellipse cx={42} cy={42} rx={6.5} ry={8} fill="#FDFAF7" /><Ellipse cx={58} cy={42} rx={6.5} ry={8} fill="#FDFAF7" />
          <Circle cx={43} cy={43} r={3.4} fill="#170D08" /><Circle cx={59} cy={43} r={3.4} fill="#170D08" />
        </>}
        <Path d={bouche} fill={humeur === 'parle' ? '#170D08' : 'none'} stroke="#170D08" strokeWidth={3} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

// ------------------------------------------------------------------ feuilles, états, toasts
export function Feuille({ visible, onClose, titre, children }: { visible: boolean; onClose: () => void; titre?: string; children: React.ReactNode }) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel="Fermer" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(8,4,2,0.55)' }} />
      <View style={{ backgroundColor: c.fond2, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: c.bordAmbre, paddingHorizontal: 20, paddingTop: 12, paddingBottom: ins.bottom + 20, gap: 14, maxHeight: '88%', width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 9, backgroundColor: c.bord }} />
        {titre && <T v="sousTitre">{titre}</T>}
        <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

export function EtatVide({ icone = 'info', titre, texte, action, onAction, mascotte }: { icone?: string; titre: string; texte?: string; action?: string; onAction?: () => void; mascotte?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 12, paddingVertical: 36, paddingHorizontal: 12 }}>
      {mascotte ? <Mascotte taille={92} humeur="dort" /> : <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord, alignItems: 'center', justifyContent: 'center' }}><Ic nom={icone} taille={32} couleur={c.accent} /></View>}
      <T v="sousTitre" style={{ textAlign: 'center' }}>{titre}</T>
      {!!texte && <T v="corps" style={{ textAlign: 'center', color: c.discret }}>{texte}</T>}
      {!!action && <Bouton label={action} onPress={onAction} large={false} petit />}
    </View>
  );
}

export function EtatErreur({ texte = 'Rien n\'est perdu. Vérifie ta connexion et réessaie.', onRetry }: { texte?: string; onRetry?: () => void }) {
  return <EtatVide icone="alerte" titre="Quelque chose a coincé" texte={texte} action={onRetry ? 'Réessayer' : undefined} onAction={onRetry} />;
}

export function Chargement({ lignes = 3 }: { lignes?: number }) {
  return <View style={{ gap: 12 }}>{Array.from({ length: lignes }, (_, i) => <Squelette key={i} h={i === 0 ? 120 : 64} r={18} />)}</View>;
}

export function useEnLigne() {
  const [en, setEn] = useState(true);
  useEffect(() => { const u = NetInfo.addEventListener(e => setEn(e.isConnected !== false)); return u; }, []);
  return en;
}

export function BandeauHorsLigne() {
  const en = useEnLigne();
  const { c } = useTheme();
  if (en) return null;
  return <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bord }}><Ic nom="reseau" taille={16} couleur={c.accent} /><T v="petit" couleur={c.texte}>Hors ligne : tes actions sont gardées et envoyées au retour du réseau.</T></View>;
}

type Gravite = 'info' | 'succes' | 'erreur';
const ToastCtx = createContext<(m: string, g?: Gravite) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [liste, setListe] = useState<{ id: number; m: string; g: Gravite }[]>([]);
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const montrer = useCallback((m: string, g: Gravite = 'info') => {
    const id = Date.now() + Math.random();
    setListe(l => [...l.slice(-2), { id, m, g }]);
    setTimeout(() => setListe(l => l.filter(x => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={montrer}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', top: ins.top + 8, left: 16, right: 16, gap: 8, alignItems: 'center', zIndex: 99 }}>
        {liste.map(t => (
          <View key={t.id} accessibilityLiveRegion="polite" style={{ maxWidth: 520, flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: c.fond2, borderWidth: 1, borderColor: t.g === 'erreur' ? c.erreur : t.g === 'succes' ? c.succes : c.bordAmbre, ...ombres.carte }}>
            <Ic nom={t.g === 'erreur' ? 'alerte' : t.g === 'succes' ? 'ok' : 'info'} taille={20} couleur={t.g === 'erreur' ? c.erreur : t.g === 'succes' ? c.succes : c.accent} />
            <Text style={{ flex: 1, fontFamily: polices.corpsMoyen, fontSize: 14, color: c.fort }}>{t.m}</Text>
          </View>
        ))}
      </View>
    </ToastCtx.Provider>
  );
}

// ------------------------------------------------------------------ éléments courants
export function Avatar({ nom, taille = 44, couleur }: { nom?: string; taille?: number; couleur?: string }) {
  const { c } = useTheme();
  const ini = (nom || '?').trim().split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();
  return <View style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: couleur ?? marque.brique, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.bordAmbre }}><Text style={{ fontFamily: polices.titre, fontSize: taille * 0.38, color: '#FDFAF7' }}>{ini}</Text></View>;
}

export function Entete({ titre, sous, retour, droite }: { titre: string; sous?: string; retour?: () => void; droite?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {retour && <BoutonIcone nom="retour" label="Retour" onPress={retour} />}
      <View style={{ flex: 1 }}><T v="sousTitre" numberOfLines={1}>{titre}</T>{!!sous && <T v="petit" numberOfLines={1}>{sous}</T>}</View>
      {droite}
    </View>
  );
}

export function SectionTitre({ titre, action, onAction }: { titre: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <T v="sousTitre" accessibilityRole="header">{titre}</T>
      {action && <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}><Text style={{ fontFamily: polices.corpsGras, fontSize: 13, color: c.accent }}>{action}</Text></Pressable>}
    </View>
  );
}

export function Rangee({ children, espace = 12 }: { children: React.ReactNode; espace?: number }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: espace }}>{children}</ScrollView>;
}

/** Image avec repli (couleur dominante) quand l'adresse manque ou ne charge pas. */
export function Visuel({ uri, couleur, taille, largeur, hauteur, rayon = 16, icone = 'image', style }: { uri?: string | null; couleur?: string; taille?: number; largeur?: number | `${number}%`; hauteur?: number; rayon?: number; icone?: string; style?: StyleProp<ViewStyle> }) {
  const [ko, setKo] = useState(false);
  const w = largeur ?? taille, h = hauteur ?? taille;
  return (
    <View style={[{ width: w as number, height: h, borderRadius: rayon, overflow: 'hidden', backgroundColor: couleur ?? marque.brun, alignItems: 'center', justifyContent: 'center' }, style]}>
      {uri && !ko ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setKo(true)} accessibilityIgnoresInvertColors /> : <Ic nom={icone} taille={Math.min(40, (h ?? 60) * 0.4)} couleur="rgba(254,215,170,0.55)" />}
    </View>
  );
}

export const rayonsKit = rayons;
