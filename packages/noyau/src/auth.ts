import { api } from './api';
import type { UserProfile, UserRole } from './types';

/** Messages français des erreurs Firebase Auth (mêmes textes que la version web). */
export function messageErreurAuth(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Un compte existe déjà avec cette adresse. Choisissez « Se connecter ».';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Adresse e-mail ou mot de passe incorrect. Pas encore de compte ? Choisissez « Créer un compte ».';
    case 'auth/weak-password':
      return 'Mot de passe trop faible (6 caractères minimum).';
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    case 'auth/network-request-failed':
      return 'Pas de connexion Internet.';
    default:
      return "Impossible d'établir la connexion par e-mail.";
  }
}

/** Profil de l'utilisateur connecté. Le serveur le crée à la première requête et attribue le rôle. */
export const chargerProfil = () => api<UserProfile>('GET', '/v1/me');

export const peutModerer = (role?: UserRole) => role === 'admin';
/** Les validateurs ont leur espace dans « Contribuer » ; les administrateurs modèrent depuis l'administration. */
export const estValidateur = (role?: UserRole) => role === 'validator';
export const estAdmin = (role?: UserRole) => role === 'admin';
