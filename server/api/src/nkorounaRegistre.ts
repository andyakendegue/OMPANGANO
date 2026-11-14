/**
 * Registre du Nkorouna (NKR), le jeton de Nkala : partie double, mouvements immuables chaînés par SHA-256, racines de Merkle.
 * Aucune route ici (voir nkorouna.ts) : ce module ne dépend que de la base, pour être appelé aussi par achats.ts.
 *
 * Règles :
 *  - un mouvement = un débit et un crédit du même montant (entier, 1 = un nkorouna, pas de fraction) ;
 *  - un compte utilisateur ne passe jamais sous zéro ; un compte gelé ne peut plus être débité ;
 *  - chaque mouvement a une référence unique : rejouer le même paiement, reçu ou dépense ne crédite ou débite qu'une fois ;
 *  - empreinte(n) = SHA-256(empreinte(n-1) | contenu du mouvement n) : une ligne retouchée en base casse toute la suite.
 */
import { createHash, randomBytes } from 'node:crypto';
import type { Queryable } from './db.ts';

export const NKR = { nom: 'Nkorouna', symbole: 'NKR' } as const;
export const HASH_ORIGINE = '0'.repeat(64);
export const COMPTES_SYSTEME = { emission: 'sys:emission', bonus: 'sys:bonus', recettes: 'sys:recettes' } as const;
export type Nature = 'achat' | 'depense' | 'transfert' | 'bonus' | 'correction' | 'annulation';

export class ErreurNkr extends Error { constructor(public statut: number, message: string) { super(message); } }

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** JSON à clés triées : jsonb réordonne les clés, l'empreinte doit pourtant rester la même à la relecture. */
export function canonique(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonique).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v as object).sort().map(k => JSON.stringify(k) + ':' + canonique((v as any)[k])).join(',') + '}';
  return JSON.stringify(v ?? null);
}

export interface Mouvement { rang: number; id: string; nature: Nature; debit: string; credit: string; montant: number; reference: string; meta: Record<string, unknown>; par: string; created_at: string; hash_precedent: string; hash: string }

export function empreinte(precedent: string, m: Omit<Mouvement, 'hash' | 'hash_precedent'>): string {
  return sha256(precedent + '|' + canonique([m.rang, m.id, m.nature, m.debit, m.credit, String(m.montant), m.reference, m.meta, m.par, m.created_at]));
}

const lire = (r: any): Mouvement => ({ ...r, rang: Number(r.rang), montant: Number(r.montant), created_at: new Date(r.created_at).toISOString() });

export const compteDe = (uid: string) => 'u:' + uid;

export async function ouvrirCompte(q: Queryable, uid: string): Promise<string> {
  const id = compteDe(uid);
  await q.query(`INSERT INTO nkr_comptes (id, user_id, type) VALUES ($1, $2, 'utilisateur') ON CONFLICT (id) DO NOTHING`, [id, uid]);
  return id;
}

export async function solde(q: Queryable, uid: string): Promise<{ solde: number; gele: boolean }> {
  const r = (await q.query<any>(`SELECT solde, gele FROM nkr_comptes WHERE id = $1`, [compteDe(uid)]))[0];
  return { solde: Number(r?.solde ?? 0), gele: !!r?.gele };
}

/**
 * Écrit un mouvement. À appeler dans une transaction (db.tx). Si la référence existe déjà, renvoie le mouvement existant
 * sans rien écrire (deja: true), à condition qu'il soit identique ; sinon 409.
 */
export async function ecrire(q: Queryable, e: { nature: Nature; debit: string; credit: string; montant: number; reference: string; meta?: Record<string, unknown>; par: string }): Promise<{ mouvement: Mouvement; deja: boolean }> {
  if (!Number.isSafeInteger(e.montant) || e.montant <= 0) throw new ErreurNkr(400, 'Montant entier et positif attendu.');
  if (e.debit === e.credit) throw new ErreurNkr(400, 'Débit et crédit identiques.');
  if (!e.reference || e.reference.length > 200) throw new ErreurNkr(400, 'Référence attendue.');
  // Le verrou sur la tête de chaîne range les écritures l'une après l'autre (rang sans trou, empreinte précédente sûre).
  const tete = (await q.query<any>(`SELECT dernier_rang, dernier_hash FROM nkr_chaine WHERE id FOR UPDATE`))[0];
  const existant = (await q.query<any>(`SELECT * FROM nkr_mouvements WHERE reference = $1`, [e.reference]))[0];
  if (existant) {
    const m = lire(existant);
    if (m.debit !== e.debit || m.credit !== e.credit || m.montant !== e.montant || m.nature !== e.nature) throw new ErreurNkr(409, 'Cette référence a déjà servi pour un autre mouvement.');
    return { mouvement: m, deja: true };
  }
  const comptes = await q.query<any>(`SELECT id, type, solde, gele FROM nkr_comptes WHERE id IN ($1, $2) FOR UPDATE`, [e.debit, e.credit]);
  const d = comptes.find(c => c.id === e.debit), c = comptes.find(x => x.id === e.credit);
  if (!d || !c) throw new ErreurNkr(404, 'Compte Nkorouna introuvable.');
  if (d.type === 'utilisateur' && d.gele && e.nature !== 'correction') throw new ErreurNkr(423, 'Ce compte Nkorouna est gelé.');
  if (d.type === 'utilisateur' && Number(d.solde) < e.montant) throw new ErreurNkr(402, 'Solde de Nkorouna insuffisant.');

  const m: Omit<Mouvement, 'hash' | 'hash_precedent'> = {
    rang: Number(tete.dernier_rang) + 1, id: 'nkr_' + randomBytes(8).toString('hex'), nature: e.nature, debit: e.debit, credit: e.credit,
    montant: e.montant, reference: e.reference, meta: JSON.parse(canonique(e.meta ?? {})), par: e.par, created_at: new Date().toISOString(),
  };
  const hash = empreinte(tete.dernier_hash, m);
  await q.query(`INSERT INTO nkr_mouvements (rang, id, nature, debit, credit, montant, reference, meta, par, created_at, hash_precedent, hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [m.rang, m.id, m.nature, m.debit, m.credit, m.montant, m.reference, JSON.stringify(m.meta), m.par, m.created_at, tete.dernier_hash, hash]);
  await q.query(`UPDATE nkr_comptes SET solde = solde - $2 WHERE id = $1`, [e.debit, e.montant]);
  await q.query(`UPDATE nkr_comptes SET solde = solde + $2 WHERE id = $1`, [e.credit, e.montant]);
  await q.query(`UPDATE nkr_chaine SET dernier_rang = $1, dernier_hash = $2 WHERE id`, [m.rang, hash]);
  return { mouvement: { ...m, hash_precedent: tete.dernier_hash, hash }, deja: false };
}

/** Achat en FCFA confirmé (Mobile Money, reçu de magasin) : crée les jetons sur le compte de l'utilisateur. */
export async function crediterAchat(q: Queryable, uid: string, montant: number, reference: string, meta: Record<string, unknown>, par: string) {
  return ecrire(q, { nature: 'achat', debit: COMPTES_SYSTEME.emission, credit: await ouvrirCompte(q, uid), montant, reference, meta, par });
}

// ------------------------------------------------------------------ Merkle

const paire = (a: string, b: string) => sha256(a + b);

export function racineMerkle(feuilles: string[]): string {
  if (!feuilles.length) return HASH_ORIGINE;
  let niveau = feuilles;
  while (niveau.length > 1) {
    const suivant: string[] = [];
    for (let i = 0; i < niveau.length; i += 2) suivant.push(paire(niveau[i], niveau[i + 1] ?? niveau[i]));
    niveau = suivant;
  }
  return niveau[0];
}

/** Chemin de preuve pour la feuille n° index : chaque étape donne l'empreinte voisine et son côté. */
export function preuveMerkle(feuilles: string[], index: number): { cote: 'gauche' | 'droite'; hash: string }[] {
  const chemin: { cote: 'gauche' | 'droite'; hash: string }[] = [];
  let niveau = feuilles, i = index;
  while (niveau.length > 1) {
    const voisin = i % 2 === 0 ? (niveau[i + 1] ?? niveau[i]) : niveau[i - 1];
    chemin.push({ cote: i % 2 === 0 ? 'droite' : 'gauche', hash: voisin });
    const suivant: string[] = [];
    for (let k = 0; k < niveau.length; k += 2) suivant.push(paire(niveau[k], niveau[k + 1] ?? niveau[k]));
    niveau = suivant; i = Math.floor(i / 2);
  }
  return chemin;
}

export const verifierPreuve = (feuille: string, chemin: { cote: 'gauche' | 'droite'; hash: string }[], racine: string) =>
  chemin.reduce((h, p) => (p.cote === 'droite' ? paire(h, p.hash) : paire(p.hash, h)), feuille) === racine;

const feuillesEntre = async (q: Queryable, de: number, a: number) =>
  (await q.query<{ hash: string }>(`SELECT hash FROM nkr_mouvements WHERE rang BETWEEN $1 AND $2 ORDER BY rang`, [de, a])).map(r => r.hash);

/** Calcule la racine des mouvements pas encore ancrés et l'enregistre. Rien à ancrer : null. */
export async function preparerAncrage(q: Queryable): Promise<{ id: number; de: number; jusqua: number; racine: string } | null> {
  const dernier = Number((await q.query<any>(`SELECT COALESCE(max(jusqu_au_rang), 0) AS n FROM nkr_ancrages`))[0].n);
  const tete = Number((await q.query<any>(`SELECT dernier_rang FROM nkr_chaine WHERE id`))[0].dernier_rang);
  if (tete <= dernier) return null;
  const racine = racineMerkle(await feuillesEntre(q, dernier + 1, tete));
  const r = (await q.query<any>(`INSERT INTO nkr_ancrages (de_rang, jusqu_au_rang, racine) VALUES ($1,$2,$3) RETURNING id`, [dernier + 1, tete, racine]))[0];
  return { id: Number(r.id), de: dernier + 1, jusqua: tete, racine };
}

export async function preuveDe(q: Queryable, mouvementId: string) {
  const m = (await q.query<any>(`SELECT rang, hash FROM nkr_mouvements WHERE id = $1`, [mouvementId]))[0];
  if (!m) return null;
  const rang = Number(m.rang);
  const a = (await q.query<any>(`SELECT * FROM nkr_ancrages WHERE $1 BETWEEN de_rang AND jusqu_au_rang ORDER BY id LIMIT 1`, [rang]))[0];
  if (!a) return { rang, hash: m.hash, ancrage: null, preuve: [] };
  const feuilles = await feuillesEntre(q, Number(a.de_rang), Number(a.jusqu_au_rang));
  return { rang, hash: m.hash, ancrage: { id: Number(a.id), racine: a.racine, reseau: a.reseau, transaction: a.transaction, de: Number(a.de_rang), jusqua: Number(a.jusqu_au_rang) }, preuve: preuveMerkle(feuilles, rang - Number(a.de_rang)) };
}

// ------------------------------------------------------------------ vérification complète

/** Relit tout le registre : rangs sans trou, chaîne d'empreintes, soldes recalculés, somme nulle, racines des ancrages. */
export async function verifierRegistre(q: Queryable): Promise<{ ok: boolean; mouvements: number; erreurs: string[] }> {
  const erreurs: string[] = [], soldes = new Map<string, number>();
  let precedent = HASH_ORIGINE, attendu = 1;
  for (let depuis = 0; ; ) {
    const lot = (await q.query<any>(`SELECT * FROM nkr_mouvements WHERE rang > $1 ORDER BY rang LIMIT 5000`, [depuis])).map(lire);
    if (!lot.length) break;
    for (const m of lot) {
      if (m.rang !== attendu) erreurs.push(`Rang ${attendu} manquant (trouvé ${m.rang}).`);
      if (m.hash_precedent !== precedent) erreurs.push(`Mouvement ${m.rang} : empreinte précédente incorrecte.`);
      if (empreinte(m.hash_precedent, m) !== m.hash) erreurs.push(`Mouvement ${m.rang} : contenu modifié (empreinte incorrecte).`);
      soldes.set(m.debit, (soldes.get(m.debit) ?? 0) - m.montant);
      soldes.set(m.credit, (soldes.get(m.credit) ?? 0) + m.montant);
      precedent = m.hash; attendu = m.rang + 1; depuis = m.rang;
    }
    if (erreurs.length > 50) break;
  }
  const tete = (await q.query<any>(`SELECT dernier_rang, dernier_hash FROM nkr_chaine WHERE id`))[0];
  if (Number(tete.dernier_rang) !== attendu - 1 || tete.dernier_hash !== precedent) erreurs.push('Tête de chaîne différente du dernier mouvement.');
  let somme = 0;
  for (const c of await q.query<any>(`SELECT id, solde FROM nkr_comptes`)) {
    somme += Number(c.solde);
    if (Number(c.solde) !== (soldes.get(c.id) ?? 0)) erreurs.push(`Compte ${c.id} : solde ${c.solde}, mouvements ${soldes.get(c.id) ?? 0}.`);
  }
  if (somme !== 0) erreurs.push(`Somme des soldes non nulle (${somme}).`);
  for (const a of await q.query<any>(`SELECT * FROM nkr_ancrages ORDER BY id`))
    if (racineMerkle(await feuillesEntre(q, Number(a.de_rang), Number(a.jusqu_au_rang))) !== a.racine) erreurs.push(`Ancrage ${a.id} : racine différente des mouvements.`);
  return { ok: erreurs.length === 0, mouvements: attendu - 1, erreurs };
}
