import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const COULEURS = ['#c85a32', '#d97706', '#f59e0b', '#7c2d12', '#fde047'];

/** Pluie de confettis (mêmes couleurs que le site web) lancée à l'envoi d'une contribution. */
export function Confettis({ declencheur, nombre = 60 }: { declencheur: boolean; nombre?: number }) {
  const { width, height } = Dimensions.get('window');
  const particules = useRef(Array.from({ length: nombre }, (_, i) => ({
    x: Math.random() * width, dx: (Math.random() - 0.5) * 160, taille: 6 + Math.random() * 8, couleur: COULEURS[i % COULEURS.length],
    delai: Math.random() * 300, duree: 1600 + Math.random() * 900, v: new Animated.Value(0), rot: (Math.random() - 0.5) * 720,
  }))).current;

  useEffect(() => {
    if (!declencheur) return;
    particules.forEach(p => {
      p.v.setValue(0);
      Animated.timing(p.v, { toValue: 1, duration: p.duree, delay: p.delai, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
  }, [declencheur]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!declencheur) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particules.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: p.x, top: height * 0.55, width: p.taille, height: p.taille * 0.6, backgroundColor: p.couleur, borderRadius: 2,
          opacity: p.v.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
            { translateY: p.v.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, -height * 0.25, height * 0.35] }) },
            { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
          ],
        }} />
      ))}
    </View>
  );
}
