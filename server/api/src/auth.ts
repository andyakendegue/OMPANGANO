/**
 * Vérification des jetons Firebase Auth sans clé secrète : signature contrôlée avec les
 * clés publiques de Google (JWKS, mises en cache par jose), puis iss / aud / exp / sub.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { FIREBASE_PROJECT_ID } from './config.ts';

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  provider: string;
  name?: string;
  picture?: string;
  /** Numéro E.164 pour les comptes créés par SMS. */
  phone?: string;
}

export type TokenVerifier = (token: string) => Promise<AuthUser>;

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/** Contrôle les revendications d'un jeton déjà authentifié (utilisé aussi dans les tests). */
export function userFromClaims(p: Record<string, any>, projectId = FIREBASE_PROJECT_ID): AuthUser {
  if (p.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('iss invalide');
  if (p.aud !== projectId) throw new Error('aud invalide');
  if (typeof p.sub !== 'string' || !p.sub) throw new Error('sub vide');
  const provider = p.firebase?.sign_in_provider;
  if (!provider || provider === 'anonymous') throw new Error('session anonyme refusée');
  return {
    uid: p.sub,
    email: typeof p.email === 'string' ? p.email.toLowerCase() : null,
    emailVerified: p.email_verified === true,
    provider,
    name: typeof p.name === 'string' ? p.name : undefined,
    picture: typeof p.picture === 'string' ? p.picture : undefined
  };
}

export function createFirebaseVerifier(projectId = FIREBASE_PROJECT_ID): TokenVerifier {
  const jwks = createRemoteJWKSet(new URL(JWKS_URL), { cacheMaxAge: 3_600_000 });
  return async (token) => {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256']
    }); // jwtVerify contrôle aussi exp / nbf
    return userFromClaims(payload as Record<string, any>, projectId);
  };
}
