import { csvVersObjets } from './csv';
import { schemaDe, type Champ, type SchemaContenu } from './schemas';

export interface ErreurLigne { ligne: number; champ?: string; message: string }
export interface RapportImportContenu {
  collection: string;
  total: number;
  valides: number;
  erreurs: ErreurLigne[];
  avertissements: ErreurLigne[];
  /** Lignes converties, prêtes à être enregistrées (seulement celles qui sont valides). */
  lignes: Record<string, unknown>[];
}

const ID_RE = /^[A-Za-z0-9_.-]{1,120}$/;
const OUI = ['oui', 'true', '1', 'vrai', 'yes', 'o', 'x'];
const NON = ['non', 'false', '0', 'faux', 'no', 'n', ''];
const URL_RE = /^(https?:\/\/|\/|[A-Za-z0-9_-]+\/)[^\s]*$/;

/** Convertit une valeur de CSV ou de JSON vers le type du champ ; renvoie [valeur, erreur]. */
export function convertir(c: Champ, brut: unknown): [unknown, string | null] {
  const vide = brut === undefined || brut === null || (typeof brut === 'string' && brut.trim() === '');
  if (vide) return [c.type === 'booleen' ? false : c.type === 'liste' ? [] : null, c.requis ? 'valeur obligatoire' : null];
  const t = typeof brut === 'string' ? brut.trim() : brut;
  switch (c.type) {
    case 'texte': case 'long': return [String(t), null];
    case 'entier': { const n = Number(typeof t === 'string' ? t.replace(',', '.') : t); return Number.isInteger(n) ? [n, null] : [null, 'nombre entier attendu']; }
    case 'nombre': { const n = Number(typeof t === 'string' ? t.replace(',', '.') : t); return Number.isFinite(n) ? [n, null] : [null, 'nombre attendu']; }
    case 'booleen': { const s = String(t).toLowerCase(); return OUI.includes(s) ? [true, null] : NON.includes(s) ? [false, null] : [false, 'oui ou non attendu']; }
    case 'liste': return [Array.isArray(t) ? t.map(String) : String(t).split('|').map(x => x.trim()).filter(Boolean), null];
    case 'date': return /^\d{4}-\d{2}-\d{2}$/.test(String(t)) && !Number.isNaN(Date.parse(String(t))) ? [String(t), null] : [null, 'date AAAA-MM-JJ attendue'];
    case 'url': return URL_RE.test(String(t)) ? [String(t), null] : [null, 'adresse https ou chemin attendu'];
    case 'choix': return c.choix?.includes(String(t)) ? [String(t), null] : [null, `valeur permise : ${c.choix?.join(', ')}`];
    case 'json': {
      if (typeof t !== 'string') return [t, null];
      try { return [JSON.parse(t), null]; } catch { return [null, 'JSON invalide']; }
    }
  }
}

/** Valide des lignes déjà en objets (JSON ou CSV converti). `existants` : identifiants connus par collection, pour les références. */
export function validerLignes(schema: SchemaContenu, brutes: Record<string, unknown>[], existants: Record<string, Set<string>> = {}): RapportImportContenu {
  const rapport: RapportImportContenu = { collection: schema.id, total: brutes.length, valides: 0, erreurs: [], avertissements: [], lignes: [] };
  const vus = new Set<string>();
  const connus = new Set(schema.champs.map(c => c.nom));
  brutes.forEach((brute, i) => {
    const ligne = i + 2; // ligne 1 = en-têtes dans un CSV
    const sortie: Record<string, unknown> = {};
    let ok = true;
    for (const c of schema.champs) {
      const [v, err] = convertir(c, brute[c.nom]);
      if (err) { rapport.erreurs.push({ ligne, champ: c.nom, message: err }); ok = false; }
      sortie[c.nom] = v;
    }
    for (const k of Object.keys(brute)) if (!connus.has(k)) rapport.avertissements.push({ ligne, champ: k, message: 'colonne inconnue, ignorée' });
    const idv = sortie.id as string | null;
    if (idv) {
      if (!ID_RE.test(idv)) { rapport.erreurs.push({ ligne, champ: 'id', message: 'identifiant invalide (lettres, chiffres, - _ .)' }); ok = false; }
      else if (vus.has(idv)) { rapport.erreurs.push({ ligne, champ: 'id', message: `identifiant en double : ${idv}` }); ok = false; }
      vus.add(idv);
    }
    for (const c of schema.champs) {
      if (!c.ref || sortie[c.nom] == null) continue;
      const attendus = existants[c.ref];
      if (!attendus) continue; // collection non fournie : référence non contrôlée
      const valeurs = Array.isArray(sortie[c.nom]) ? (sortie[c.nom] as string[]) : [String(sortie[c.nom])];
      for (const val of valeurs) if (!attendus.has(val)) rapport.avertissements.push({ ligne, champ: c.nom, message: `référence inconnue dans « ${c.ref} » : ${val}` });
    }
    // Règle du corpus : tout contenu myènè porte sa source.
    if ((sortie.mot_myene || sortie.myene) && !sortie.source && schema.champs.some(c => c.nom === 'source'))
      rapport.avertissements.push({ ligne, champ: 'source', message: 'mot myènè sans source : à compléter avant publication' });
    if (ok) { rapport.valides++; rapport.lignes.push(sortie); }
  });
  return rapport;
}

/** Texte brut (CSV ou JSON) → rapport. Le format est détecté : « [ » ou « { » = JSON. */
export function validerTexte(collection: string, texte: string, existants: Record<string, Set<string>> = {}): RapportImportContenu {
  const schema = schemaDe(collection);
  if (!schema) return { collection, total: 0, valides: 0, erreurs: [{ ligne: 0, message: `collection inconnue : ${collection}` }], avertissements: [], lignes: [] };
  const t = texte.replace(/^﻿/, '').trim();
  let brutes: Record<string, unknown>[];
  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      const j = JSON.parse(t);
      brutes = Array.isArray(j) ? j : Array.isArray(j?.lignes) ? j.lignes : Array.isArray(j?.[collection]) ? j[collection] : [j];
    } catch (e) {
      return { collection, total: 0, valides: 0, erreurs: [{ ligne: 0, message: `JSON invalide : ${(e as Error).message}` }], avertissements: [], lignes: [] };
    }
  } else brutes = csvVersObjets(t);
  return validerLignes(schema, brutes, existants);
}

/** Modèle CSV d'une collection : en-têtes + une ligne d'exemple. */
export function modeleCsv(schema: SchemaContenu): string {
  const e = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return '﻿' + schema.champs.map(c => c.nom).join(',') + '\r\n' + schema.champs.map(c => e(c.exemple ?? '')).join(',') + '\r\n';
}
