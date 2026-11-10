import { Image, Platform, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { couleurs, stylesDyn } from './theme';

/** Largeur au-delà de laquelle l'application passe en mise en page « grand écran » (navigateur, tablette). */
export const LARGE = 900;
export const useLarge = () => useWindowDimensions().width >= LARGE;

/** Motif à points du site web (african-pattern-bg). Propriété propre au web : ignorée sur iOS et Android. */
const motif: ViewStyle = Platform.OS === 'web'
  ? ({
      backgroundColor: couleurs.fond,
      backgroundImage: 'radial-gradient(#c85a32 0.75px, transparent 0.75px), radial-gradient(#d97706 0.75px, #170d08 0.75px)',
      backgroundSize: '30px 30px',
      backgroundPosition: '0 0, 15px 15px',
    } as unknown as ViewStyle)
  : { backgroundColor: couleurs.fond };

export const fond: ViewStyle = motif;

/** Page : fond à points, contenu centré et borné en largeur sur grand écran. */
export function Page({ children, largeur = 1100, style }: { children: React.ReactNode; largeur?: number; style?: ViewStyle }) {
  return (
    <View style={[{ flex: 1 }, motif]}>
      <View style={[{ flex: 1, width: '100%', maxWidth: largeur, alignSelf: 'center' }, style]}>{children}</View>
    </View>
  );
}

/** Logo Nkala (même visuel que l'en-tête du site web). */
export function Logo({ taille = 40 }: { taille?: number }) {
  return (
    <View style={[s.cadre, { width: taille, height: taille, borderRadius: taille / 4 }]}>
      <Image source={require('../assets/logo.png')} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel="Logo Nkala" />
    </View>
  );
}
export const Marque = ({ taille = 40 }: { taille?: number }) => (
  <View style={s.marque}>
    <Logo taille={taille} />
    <Text style={s.nom}>Nkala</Text><Text style={s.essaka}> ESSAKA </Text>
  </View>
);

const s = stylesDyn(() => ({
  cadre: { backgroundColor: '#fff', padding: 3, borderWidth: 2, borderColor: couleurs.ambre, overflow: 'hidden' },
  marque: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nom: { color: couleurs.texteClair, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  essaka: { color: '#fff', backgroundColor: couleurs.terre, fontSize: 10, fontWeight: '800', overflow: 'hidden', borderRadius: 4 },
}));
