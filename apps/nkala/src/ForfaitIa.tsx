/**
 * L'IA demande un forfait (décision de Capp, 15 nov. 2026) : sans forfait, quelques questions gratuites par semaine.
 * Quand le serveur répond 402 « forfait », les écrans de Kak'Igonjo montrent cet encart avec l'accès à la boutique.
 */
import { View } from 'react-native';
import { ApiError } from '@nkala/noyau';
import { useGlobale } from './Globale';
import { Bouton, T } from './kit';
import { useTheme } from './Prefs';

/** Le serveur a refusé la question : questions gratuites de la semaine épuisées. */
export const estRefusForfait = (e: unknown): boolean => e instanceof ApiError && e.status === 402 && e.corps?.code === 'forfait';

/** Phrase sur les questions gratuites restantes (rien pour un abonné). */
export function texteQuestionsGratuites(restantes: number | null | undefined): string | null {
  if (restantes === null || restantes === undefined) return null;
  if (restantes <= 0) return 'C\'était ta dernière question gratuite de la semaine.';
  return `Encore ${restantes} question${restantes > 1 ? 's' : ''} gratuite${restantes > 1 ? 's' : ''} cette semaine.`;
}

export function AppelForfait({ message }: { message: string }) {
  const { c } = useTheme();
  const { ouvrirBoutique } = useGlobale();
  return (
    <View accessibilityRole="alert" style={{ borderRadius: 16, borderWidth: 1, borderColor: c.accent, backgroundColor: c.carte, padding: 12, gap: 10 }}>
      <T v="corps" fort>Kak'Igonjo est inclus dans les formules</T>
      <T v="petit">{message}</T>
      <Bouton label="Voir les formules" icone="couronne" variante="ambre" onPress={ouvrirBoutique} />
    </View>
  );
}
