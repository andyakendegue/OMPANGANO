/** Droits de la personne sur ses données (SECURITE_ISO27001.md, P1) : export, suppression du compte, déconnexion partout. */
import { api } from './api';

export const exporterMesDonnees = () => api<Record<string, unknown>>('GET', '/v1/me/donnees');

export interface OptionsSuppressionCompte { garderEnregistrements?: boolean; abandonnerSoldeNkorouna?: boolean }
export const supprimerMonCompte = (o: OptionsSuppressionCompte = {}) =>
  api<{ supprime: boolean }>('DELETE', '/v1/me', { confirmation: 'SUPPRIMER', ...o });

export const revoquerMesSessions = () => api<{ revoque: boolean }>('POST', '/v1/me/sessions/revoquer', {});
