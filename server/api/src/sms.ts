/**
 * Connexion par SMS avec Twilio Verify (remplace Firebase Auth pour le téléphone).
 * Variables : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID (service Verify) et SESSION_SECRET.
 * Sans ces variables, l'envoi échoue proprement (503) ; SMS_FOURNISSEUR=simulation (hors production seulement)
 * accepte le code 000000 pour tester l'application avant de brancher Twilio.
 */
import { SignJWT, jwtVerify, decodeJwt } from 'jose';
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

export function fournisseurParDefaut(env = process.env): FournisseurSms {
  if (env.SMS_FOURNISSEUR === 'simulation' && env.NODE_ENV !== 'production') return fournisseurSimulation();
  return fournisseurTwilio(env);
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
  if (typeof payload.sub !== 'string' || !payload.sub.startsWith('tel_')) throw new Error('sub invalide');
  return { uid: payload.sub, email: null, emailVerified: false, provider: 'phone', name: typeof payload.name === 'string' ? payload.name : undefined, phone: String(payload.tel || '') };
}
