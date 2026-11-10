/**
 * Lecture et écriture de CSV (RFC 4180) sans dépendance : séparateur virgule ou point-virgule (détecté),
 * guillemets doublés, retours à la ligne dans les champs, BOM ignoré. Partagé par l'application et l'API.
 */
export function detecterSeparateur(texte: string): ',' | ';' | '\t' {
  const ligne = texte.replace(/^﻿/, '').split(/\r?\n/, 1)[0] || '';
  const n = (c: string) => ligne.split(c).length - 1;
  const [v, p, t] = [n(','), n(';'), n('\t')];
  return t > v && t > p ? '\t' : p > v ? ';' : ',';
}

export function lireCsvBrut(texte: string): string[][] {
  const sep = detecterSeparateur(texte);
  const t = texte.replace(/^﻿/, '');
  const lignes: string[][] = [];
  let champ = '', ligne: string[] = [], entre = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (entre) {
      if (c === '"') { if (t[i + 1] === '"') { champ += '"'; i++; } else entre = false; }
      else champ += c;
    } else if (c === '"') entre = true;
    else if (c === sep) { ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      ligne.push(champ); champ = '';
      if (ligne.some(x => x.trim() !== '')) lignes.push(ligne);
      ligne = [];
    } else champ += c;
  }
  ligne.push(champ);
  if (ligne.some(x => x.trim() !== '')) lignes.push(ligne);
  return lignes;
}

/** CSV avec en-têtes → liste d'objets (clés = en-têtes sans espaces). */
export function csvVersObjets(texte: string): Record<string, string>[] {
  const l = lireCsvBrut(texte);
  if (l.length === 0) return [];
  const entetes = l[0].map(h => h.trim());
  return l.slice(1).map(cells => Object.fromEntries(entetes.map((h, i) => [h, (cells[i] ?? '').trim()])));
}

const echapper = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join('|') : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function objetsVersCsv(lignes: Record<string, unknown>[], colonnes: string[]): string {
  return '﻿' + [colonnes.join(','), ...lignes.map(o => colonnes.map(c => echapper(o[c])).join(','))].join('\r\n') + '\r\n';
}
