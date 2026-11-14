/**
 * Connexion par SMS avec Twilio Verify (remplace Firebase Auth pour le téléphone).
 * Variables : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID (service Verify) et SESSION_SECRET.
 * Sans ces variables, l'envoi échoue proprement (503) ; SMS_FOURNISSEUR=simulation (hors production seulement)
 * accepte le code 000000 pour tester l'application avant de brancher Twilio.
 * Numéro des examinateurs (Google Play, App Store) : REVUE_TELEPHONE (+241…) et REVUE_CODE (6 chiffres). Ce seul numéro
 * se connecte avec ce code fixe, sans SMS ni Twilio, y compris en production ; les autres numéros ne changent pas.
 */
import { timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import { normaliserTelephone } from '../../../packages/noyau/src/telephone.ts';
import type { AuthUser } from './auth.ts';

export interface FournisseurSms {
  envoyer(telephone: string): Promise<void>;
  /** true si le code est bon. */
  verifier(telephone: string, code: string): Promise<boolean>;
}

export class SmsIndisponible extends Error {}

export function fournisseurTwilio(env = process.env): FournisseurSms {
  const sid = env.TWILIO_ACCOUNT_SID, jeton = env.TWILIO_AUTH_TOKEN, service = env.TWILIO_VERIFY_SID;
  const entete = () => ({ Authorization: 'Basic ' + Buffer.from(`${sid}:${jeton}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' });
  const pret = () => { if (!sid || !jeton || !service) throw new SmsIndisponible('Le service SMS n\'est pas encore configuré.'); };
  const base = `https://verify.twilio.com/v2/Services/${service}`;
  return {
    async envoyer(tel) {
      pret();
      const r = await fetch(`${base}/Verifications`, { method: 'POST', headers: entete(), body: new URLSearchParams({ To: tel, Channel: 'sms', Locale: 'fr' }) });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        if (r.status === 429) throw new SmsIndisponible('Trop de demandes pour ce numéro. Réessaie plus tard.');
        throw new SmsIndisponible(`Envoi du SMS impossible (${r.status}) ${t.slice(0, 120)}`);
      }
    },
    async verifier(tel, code) {
      pret();
      const r = await fetch(`${base}/VerificationCheck`, { method: 'POST', headers: entete(), body: new URLSearchParams({ To: tel, Code: code }) });
      if (r.status === 404) return false; // vérification expirée ou déjà utilisée
      if (!r.ok) throw new SmsIndisponible(`Vérification impossible (${r.status})`);
      return (await r.json() as { status?: string }).status === 'approved';
    }
  };
}

export function fournisseurSimulation(): FournisseurSms {
  return { async envoyer() {}, async verifier(_t, code) { return code === '000000'; } };
}

/**
 * Ajoute le numéro des examinateurs devant un fournisseur ; sans configuration valide, le fournisseur est rendu tel quel.
 * Le numéro n'est actif que jusqu'à REVUE_JUSQU_AU (date ISO, 45 jours au plus après le démarrage) : ouvert pendant les
 * revues des magasins seulement, puis changer REVUE_CODE (SECURITE_ISO27001.md, écart P2).
 */
export function avecNumeroExaminateur(base: FournisseurSms, env = process.env, maintenant = () => Date.now()): FournisseurSms {
  const tel = env.REVUE_TELEPHONE ? normaliserTelephone(env.REVUE_TELEPHONE) : null;
  const code = env.REVUE_CODE || '';
  const fin = env.REVUE_JUSQU_AU ? Date.parse(env.REVUE_JUSQU_AU) : NaN;
  if (!tel || !/^\d{6}$/.test(code)) return base;
  if (Number.isNaN(fin) || fin - maintenant() > 45 * 86400_000) {
    console.warn('Numéro examinateur ignoré : définir REVUE_JUSQU_AU (date de fin de revue, 45 jours au plus).');
    return base;
  }
  const actif = (t: string) => t === tel && maintenant() < fin;
  const egal = (a: string) => a.length === code.length && timingSafeEqual(Buffer.from(a), Buffer.from(code));
  return {
    async envoyer(t) { if (!actif(t)) await base.envoyer(t); },
    async verifier(t, c) { return actif(t) ? egal(c) : base.verifier(t, c); }
  };
}

export function fournisseurParDefaut(env = process.env): FournisseurSms {
  if (env.SMS_FOURNISSEUR === 'simulation' && env.NODE_ENV !== 'production') return avecNumeroExaminateur(fournisseurSimulation(), env);
  return avecNumeroExaminateur(fournisseurTwilio(env), env);
}

// ------------------------------------------------------------------ jetons de session de l'API
const EMETTEUR = 'nkala-sms';
const DUREE = '30d';
const cle = (secret: string) => new TextEncoder().encode(secret);

export async function creerSession(secret: string, a: { uid: string; telephone: string; name?: string }): Promise<string> {
  return new SignJWT({ tel: a.telephone, name: a.name }).setProtectedHeader({ alg: 'HS256' }).setSubject(a.uid)
    .setIssuer(EMETTEUR).setIssuedAt().setExpirationTime(DUREE).sign(cle(secret));
}

export const estJetonSession = (token: string): boolean => { try { return decodeJwt(token).iss === EMETTEUR; } catch { return false; } };

export async function lireSession(secret: string, token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, cle(secret), { issuer: EMETTEUR, algorithms: ['HS256'] });
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('sub invalide');
  return { uid: payload.sub, email: null, emailVerified: false, provider: 'phone', name: typeof payload.name === 'string' ? payload.name : undefined, phone: String(payload.tel || ''), iat: typeof payload.iat === 'number' ? payload.iat : undefined };
}
