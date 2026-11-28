/**
 * Paiements locaux (Mobile Money, BambooPay, mode manuel) : version web seulement (décision de Capp, 28 nov. 2026).
 * Dans les applications iOS et Android, un contenu numérique se paie uniquement par les achats intégrés d'Apple et de Google
 * (Apple 3.1.1 et 3.1.3, règles de paiement de Google Play) : aucun bouton, lien ni texte n'y renvoie vers le site ou vers
 * Mobile Money. Ce qui a été payé sur le site s'ouvre quand même dans l'application (droits lus sur le serveur).
 * Détail : NKALA_PLAN_DEVELOPPEMENT.md, section « Décision du 28 novembre 2026 » (P0).
 */
import { Platform } from 'react-native';

export const PAIEMENT_LOCAL = Platform.OS === 'web';

/** Texte neutre tant que les achats intégrés (P8) ne sont pas branchés : ne cite ni le site ni un autre moyen de paiement. */
export const ACHAT_MOBILE_BIENTOT = 'L\'achat dans l\'application arrive bientôt.';
