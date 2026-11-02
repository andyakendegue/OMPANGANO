// Règles d'encodage DONDO (_contexte/REGLES_ENCODAGE.md) : NFC partout, zéro caractère perdu.

/** Normalise en NFC. À appeler à l'entrée et à la sortie de tout texte myènè. */
export const nfc = (t: string): string => t.normalize('NFC');

/** Pièges à unifier : une forme officielle par caractère. */
const EQUIVALENCES: [RegExp, string][] = [
  [/ε/g, 'ɛ'], // ε grec → ɛ latin
  [/ṉ/g, 'ṉ'], // n + macron souscrit → ṉ précomposé
];

export const unifierGraphies = (t: string): string =>
  nfc(EQUIVALENCES.reduce((s, [re, to]) => s.replace(re, to), nfc(t)));

export interface RapportCaracteres {
  perdus: string[];
  nfdRestant: boolean;
  suspects: boolean;
}

const comptes = (t: string): Map<string, number> => {
  const m = new Map<string, number>();
  for (const c of nfc(t)) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
};

/** Contrôle anti-perte : refuse une étape qui fait diminuer un caractère de l'alphabet myènè. */
export function controlerCaracteres(avant: string, apres: string): RapportCaracteres {
  const a = comptes(avant);
  const b = comptes(apres);
  const perdus: string[] = [];
  for (const [c, n] of a) if (/[^\x00-\x7f]/.test(c) && (b.get(c) ?? 0) < n) perdus.push(c);
  return { perdus, nfdRestant: apres !== nfc(apres), suspects: /[?�]/.test(apres) && !/[?�]/.test(avant) };
}
