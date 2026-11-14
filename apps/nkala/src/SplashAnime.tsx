/**
 * Écran de démarrage animé : il prend le relais de l'image fixe de l'écran natif (même place, même taille : 240 points),
 * puis les quatre barres du symbole ondulent comme une voix tant que l'application se prépare (charte : « une onde qui passe »).
 * Quand l'app est prête, les barres se redressent et l'écran s'efface en fondu.
 * Aucune police chargée n'est utilisée : il s'affiche avant elles.
 */
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native';

const FOND = '#170D08';
const TAILLE = 240;            // largeur de l'image de l'écran natif (app.json, plugin expo-splash-screen)
const K = TAILLE / 1024;       // l'image source fait 1024 × 1024
const NATIF = Platform.OS !== 'web';

// Barres du symbole, en coordonnées de l'image source : centre x, haut, bas, couleur.
const BARRES = [
  { x: 339, haut: 90, bas: 525, couleur: '#C85A32' },
  { x: 454, haut: 140, bas: 371, couleur: '#F59E0B' },
  { x: 569, haut: 243, bas: 474, couleur: '#F59E0B' },
  { x: 685, haut: 90, bas: 525, couleur: '#C85A32' },
];
const LARGEUR_BARRE = 78;
const HAUT_MOT = 600;          // le mot « nkala » commence ici dans l'image source

export function SplashAnime({ visible, auRetrait, auPremierAffichage }: { visible: boolean; auRetrait?: () => void; auPremierAffichage?: () => void }) {
  const [monte, setMonte] = useState(true);
  const [reduit, setReduit] = useState(false);
  const onde = useRef(new Animated.Value(0)).current;
  const entree = useRef(new Animated.Value(0)).current;
  const sortie = useRef(new Animated.Value(0)).current;
  const progres = useRef(new Animated.Value(0)).current;

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduit).catch(() => {}); }, []);

  // L'onde démarre doucement (pas de saut depuis l'image fixe), puis tourne en boucle.
  useEffect(() => {
    Animated.timing(entree, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: NATIF }).start();
    const boucle = Animated.loop(Animated.timing(onde, { toValue: 1, duration: reduit ? 2400 : 1300, easing: Easing.linear, useNativeDriver: NATIF }));
    const barre = Animated.loop(Animated.sequence([
      Animated.timing(progres, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: NATIF }),
      Animated.timing(progres, { toValue: 0, duration: 0, useNativeDriver: NATIF }),
    ]));
    boucle.start(); barre.start();
    return () => { boucle.stop(); barre.stop(); };
  }, [onde, entree, progres, reduit]);

  // App prête : fondu de sortie, puis démontage.
  useEffect(() => {
    if (visible) return;
    Animated.timing(sortie, { toValue: 1, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: NATIF }).start(() => { setMonte(false); auRetrait?.(); });
  }, [visible, sortie, auRetrait]);

  if (!monte) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      onLayout={auPremierAffichage}
      accessible accessibilityRole="progressbar" accessibilityLabel="Nkala se prépare"
      style={[StyleSheet.absoluteFill, s.fond, { opacity: sortie.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
      <Animated.View style={{ width: TAILLE, height: TAILLE, transform: [{ scale: sortie.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }}>
        {/* le mot « nkala », découpé dans l'image de l'écran natif */}
        <View style={[s.mot, { top: HAUT_MOT * K, height: TAILLE - HAUT_MOT * K }]}>
          <Image source={require('../assets/splash-icon.png')} style={{ width: TAILLE, height: TAILLE, marginTop: -HAUT_MOT * K }} resizeMode="contain" />
        </View>
        {/* les quatre barres, qui ondulent */}
        {BARRES.map((b, i) => {
          const h = (b.bas - b.haut) * K;
          const dec = i * 0.18;
          // Chaque barre respire avec un léger décalage : l'onde passe de gauche à droite.
          const amplitude = reduit ? 0.08 : i === 0 || i === 3 ? 0.22 : 0.42;
          const phase = Animated.modulo(Animated.add(onde, dec), 1);
          const sinus = phase.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 1, 0, -1, 0] });
          return (
            <Animated.View key={i} style={{
              position: 'absolute', left: (b.x - LARGEUR_BARRE / 2) * K, top: b.haut * K, width: LARGEUR_BARRE * K, height: h, borderRadius: (LARGEUR_BARRE * K) / 2, backgroundColor: b.couleur,
              transform: [{ scaleY: Animated.add(1, Animated.multiply(Animated.multiply(sinus, amplitude), entree)) }],
            }} />
          );
        })}
      </Animated.View>
      {/* fin trait de progression sous le logo */}
      <View style={s.piste}>
        <Animated.View style={[s.trait, {
          opacity: entree,
          transform: [{ translateX: progres.interpolate({ inputRange: [0, 1], outputRange: [-60, 120] }) }],
        }]} />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  fond: { backgroundColor: FOND, alignItems: 'center', justifyContent: 'center', zIndex: 1000, elevation: 1000 },
  mot: { position: 'absolute', left: 0, width: TAILLE, overflow: 'hidden' },
  piste: { position: 'absolute', bottom: '18%', width: 120, height: 3, borderRadius: 2, backgroundColor: 'rgba(254,215,170,0.12)', overflow: 'hidden' },
  trait: { width: 60, height: 3, borderRadius: 2, backgroundColor: '#F59E0B' },
});
