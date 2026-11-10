/** Numéros de téléphone : format E.164, indicatif du Gabon (+241) par défaut. */
export const INDICATIF_DEFAUT = '241';

/** Renvoie « +241XXXXXXXX » (ou le numéro international donné), ou null si le numéro est impossible. */
export function normaliserTelephone(saisie: string, indicatif = INDICATIF_DEFAUT): string | null {
  let s = (saisie || '').replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('+')) return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
  if (!/^\d+$/.test(s)) return null;
  // Gabon : numéros à 8 chiffres avec le 0 initial (06…, 07…) ; les anciens numéros à 7 chiffres reçoivent un 0. Autres pays : le 0 national est retiré.
  if (indicatif === '241') { if (s.length === 7) s = '0' + s; }
  else if (s.startsWith('0')) s = s.replace(/^0+/, '');
  const n = '+' + indicatif + s;
  return /^\+[1-9]\d{7,14}$/.test(n) ? n : null;
}

/** Affichage lisible : +241 06 12 34 56. */
export function afficherTelephone(e164: string): string {
  const m = /^\+241(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+241 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}

/** Identifiant de compte stable pour un numéro (même numéro = même compte, quel que soit l'appareil). */
export const uidTelephone = (e164: string) => 'tel_' + e164.replace(/\D/g, '');
