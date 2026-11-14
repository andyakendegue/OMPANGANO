/**
 * Une clé par usage (ISO 27001 A.8.24, règle S3 de SECURITE_ISO27001.md).
 * - sessions : SESSION_SECRET tel quel (le changer déconnecte toutes les sessions SMS) ;
 * - media    : MEDIA_SECRET, sinon SESSION_SECRET (compatibilité : les médias déjà chiffrés l'ont été avec lui).
 *              Procédure de séparation : poser MEDIA_SECRET = valeur actuelle de SESSION_SECRET, puis SESSION_SECRET peut tourner seul ;
 * - licences, manches, filigrane : LICENCE_SECRET / sinon dérivées de SESSION_SECRET par HKDF-SHA256 (jetons de quelques minutes :
 *              les changer n'interrompt que les lectures et parties en cours).
 */
import { hkdfSync } from 'node:crypto';

export interface Cles { sessions: string; media: string; licences: string; manches: string; filigrane: string }

export const deriver = (secret: string, usage: string): string => Buffer.from(hkdfSync('sha256', secret, 'nkala-cles-v1', usage, 32)).toString('hex');

export function deriverCles(secret: string, env: NodeJS.ProcessEnv = process.env): Cles {
  return {
    sessions: secret,
    media: env.MEDIA_SECRET || secret,
    licences: env.LICENCE_SECRET || deriver(secret, 'licences'),
    manches: deriver(secret, 'manches'),
    filigrane: deriver(secret, 'filigrane'),
  };
}
