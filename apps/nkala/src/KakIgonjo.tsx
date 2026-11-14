/** Kak'Igonjo (« Kaka Igonjo »), le vieux sage du village : mascotte de Nkala et assistant IA. Dessin seul, sans dépendance aux autres écrans. */
import Svg, { Circle, Defs, Ellipse, Path, Pattern, Rect } from 'react-native-svg';
import { marque } from './theme';

// ------------------------------------------------------------------ le vieil Orungu (dessin)
const PEAU = '#8A5232', PEAU_OMBRE = '#744023', TRAIT = '#5E3219', BLANC = '#FDFAF7', POIL = '#F4EEE8', PLI = '#D8C6B8', ROUGE = '#B3261E';

/** Buste complet dans un carré de 120 ; la tête tient dans la zone (39–81, 11–77). */
export function VieilOrungu({ taille = 120 }: { taille?: number }) {
  const dentelle = (x1: number, y1: number, x2: number, y2: number) => [0.12, 0.38, 0.64, 0.9].map(t => <Circle key={`${x1}-${t}`} cx={x1 + (x2 - x1) * t} cy={y1 + (y2 - y1) * t} r={1.15} fill="#FFFFFF" />);
  return (
    <Svg width={taille} height={taille} viewBox="0 0 120 120">
      <Defs>
        <Pattern id="okoroue" patternUnits="userSpaceOnUse" width={12} height={12} patternTransform="rotate(-18)">
          <Rect width={12} height={12} fill={marque.bronze} />
          <Path d="M6 0.8 L11.2 6 L6 11.2 L0.8 6 Z" fill={marque.ambre} />
          <Circle cx={6} cy={6} r={1.6} fill={marque.brun} />
          <Circle cx={0} cy={0} r={1.1} fill={marque.jaune} /><Circle cx={12} cy={0} r={1.1} fill={marque.jaune} />
          <Circle cx={0} cy={12} r={1.1} fill={marque.jaune} /><Circle cx={12} cy={12} r={1.1} fill={marque.jaune} />
        </Pattern>
      </Defs>

      {/* vêtement blanc */}
      <Path d="M 12 120 C 12 98 28 88 47 84 L 73 84 C 92 88 108 98 108 120 Z" fill={BLANC} />
      <Path d="M 96 120 Q 97 106 92 97" stroke={PLI} strokeWidth={1} fill="none" />
      {/* cou */}
      <Path d="M 51 66 L 51 85 Q 60 93 69 85 L 69 66 Z" fill={PEAU_OMBRE} />
      <Path d="M 47 84 Q 60 97 73 84" stroke={PLI} strokeWidth={1.2} fill="none" />

      {/* okorouè : couvre le buste, monte vers l'épaule droite (à gauche de l'image) */}
      <Path d="M 24 91 L 29 82 L 41 83 C 56 97 82 105 101 106 L 105 120 L 19 120 C 19 108 21 97 24 91 Z" fill="url(#okoroue)" />
      <Path d="M 41 83 C 56 97 82 105 101 106" stroke={marque.rougeSombre} strokeWidth={1.4} fill="none" />
      {/* les deux extrémités retombent du nœud en plis souples : l'une sur le bras, l'autre sur la poitrine ; bordure rouge, dentelle blanche */}
      <Path d="M 27 78.5 C 23 80 21 85 20.5 91 Q 20.2 95 21 99 Q 24.5 101 28 99 C 27.2 93 27.6 88 29.5 84.5 Z" fill="url(#okoroue)" stroke={marque.rougeSombre} strokeWidth={0.6} />
      <Path d="M 20.5 91.5 Q 20.2 95 21 99 Q 24.5 101 28 99 C 27.6 96.4 27.4 94 27.5 92 Q 24 93.4 20.5 91.5 Z" fill={ROUGE} />
      <Path d="M 20.5 95.2 Q 24 97 27.6 95.6" stroke="#FFFFFF" strokeWidth={0.9} strokeDasharray="1.2 1" fill="none" />
      {dentelle(21, 99.5, 28, 99.5)}
      <Path d="M 24.5 82 C 22.8 85 22.6 88 22.8 90.5" stroke={marque.rougeSombre} strokeWidth={0.6} opacity={0.55} fill="none" />
      <Path d="M 28 84 C 25 91 26 98 23.5 105.5 Q 28 108.5 33 107.5 C 34.5 99 33 92 35.5 85 Z" fill="url(#okoroue)" stroke={marque.rougeSombre} strokeWidth={0.6} />
      <Path d="M 25.2 98.8 C 24.8 101 24.2 103.5 23.5 105.5 Q 28 108.5 33 107.5 C 33.4 105 33.6 102.6 33.6 100.4 Q 29 101.4 25.2 98.8 Z" fill={ROUGE} />
      <Path d="M 24.6 102.2 Q 28.8 104.8 33.5 103.8" stroke="#FFFFFF" strokeWidth={0.9} strokeDasharray="1.2 1" fill="none" />
      {dentelle(23.8, 106, 33, 107.8)}
      <Path d="M 30.5 86.5 C 28.8 91 29.8 95 29 98.5" stroke={marque.rougeSombre} strokeWidth={0.6} opacity={0.55} fill="none" />
      {/* le nœud : une boule de tissu serrée, posée sur l'épaule droite */}
      <Path d="M 25 79.5 C 25 75.5 30 74.5 33.5 75.8 C 37 77 37.5 81.5 35.5 84.5 C 33 87 27.5 86.8 25.8 84 C 25 82.5 25 81 25 79.5 Z" fill="url(#okoroue)" stroke={marque.rougeSombre} strokeWidth={1.3} />
      <Path d="M 27 78 Q 31 82 35.5 79.5" stroke={marque.rougeSombre} strokeWidth={0.9} fill="none" />
      <Path d="M 28 84.5 Q 31 82 34 84.5" stroke={marque.rougeSombre} strokeWidth={0.7} fill="none" />

      {/* tête */}
      <Ellipse cx={40.6} cy={47} rx={3.6} ry={6} fill={PEAU_OMBRE} />
      <Ellipse cx={79.4} cy={47} rx={3.6} ry={6} fill={PEAU_OMBRE} />
      <Path d="M 42 40 C 42 26 78 26 78 40 L 78 50 C 78 63 70 71 60 71 C 50 71 42 63 42 50 Z" fill={PEAU} />
      <Path d="M 41 36 Q 39.5 41 41.5 45.5 L 44 44 Q 43 40 44 36 Z" fill={POIL} />
      <Path d="M 79 36 Q 80.5 41 78.5 45.5 L 76 44 Q 77 40 76 36 Z" fill={POIL} />
      {/* barbe et moustache blanches */}
      <Path d="M 42 49 C 43 66 51 77 60 77 C 69 77 77 66 78 49 C 76.5 58 70 64.5 60 64.5 C 50 64.5 43.5 58 42 49 Z" fill={POIL} />
      <Path d="M 50.5 59.5 Q 55 55.5 60 57.2 Q 65 55.5 69.5 59.5 Q 64.5 58.6 60 59.4 Q 55.5 58.6 50.5 59.5 Z" fill={POIL} />
      <Path d="M 55.5 61.4 Q 60 64 64.5 61.4" stroke={marque.brun} strokeWidth={1.3} strokeLinecap="round" fill="none" />
      {/* nez, rides */}
      <Path d="M 59.2 44 Q 57 51 56.6 53 Q 60 56 63.4 53" stroke={TRAIT} strokeWidth={1.2} strokeLinecap="round" fill="none" />
      <Path d="M 52 35.4 Q 60 34 68 35.4" stroke={TRAIT} strokeWidth={0.8} opacity={0.7} fill="none" />
      <Path d="M 47.5 52 Q 46.4 55.5 48 58.5" stroke={TRAIT} strokeWidth={0.8} opacity={0.7} fill="none" />
      <Path d="M 72.5 52 Q 73.6 55.5 72 58.5" stroke={TRAIT} strokeWidth={0.8} opacity={0.7} fill="none" />
      {/* yeux et sourcils */}
      <Ellipse cx={51.5} cy={45} rx={3.3} ry={2.4} fill={BLANC} /><Ellipse cx={68.5} cy={45} rx={3.3} ry={2.4} fill={BLANC} />
      <Circle cx={51.8} cy={45.2} r={1.8} fill="#170D08" /><Circle cx={68.2} cy={45.2} r={1.8} fill="#170D08" />
      <Circle cx={52.4} cy={44.6} r={0.55} fill="#FFFFFF" /><Circle cx={68.8} cy={44.6} r={0.55} fill="#FFFFFF" />
      <Path d="M 47.6 44 Q 51.5 41.4 55.4 44" stroke={TRAIT} strokeWidth={1} fill="none" />
      <Path d="M 64.6 44 Q 68.5 41.4 72.4 44" stroke={TRAIT} strokeWidth={1} fill="none" />
      <Path d="M 46.8 40.6 Q 51.5 37.6 56.4 40.2" stroke={POIL} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Path d="M 63.6 40.2 Q 68.5 37.6 73.2 40.6" stroke={POIL} strokeWidth={2.2} strokeLinecap="round" fill="none" />

      {/* duku : toque blanche souple, calée sur le côté, sur un bord ; sans gland */}
      <Path d="M 41 30 C 38 18 48 9 62 9 C 78 9 90 15 89 25 C 88.5 30 84 32.5 80 31 Z" fill={BLANC} stroke={PLI} strokeWidth={0.8} />
      <Path d="M 49 13 Q 63 17 80 29.5 M 62 10.5 Q 75 15 85.5 27" stroke="#E6D8CC" strokeWidth={0.8} fill="none" />
      <Path d="M 39.5 29 Q 60 24 80.5 29 L 80.5 35 Q 60 30 39.5 35 Z" fill="#FFFFFF" stroke={PLI} strokeWidth={0.8} />
    </Svg>
  );
}
