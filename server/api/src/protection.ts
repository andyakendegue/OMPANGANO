/**
 * Protection du corpus contre les écrasements par d'anciennes données.
 *
 * Contexte (2 nov. 2026) : un navigateur d'administrateur garde une file de modifications hors-ligne et la rejoue
 * automatiquement. Une fiche corrigée pouvait ainsi être remplacée par son ancien texte, car le serveur appliquait
 * « la dernière écriture reçue ». Ce module apporte quatre garde-fous :
 *  1. une écriture plus ancienne que la version enregistrée est refusée ;
 *  2. une phrase de la liste des phrases écartées n'est jamais acceptée (écriture, lot ou import) ;
 *  3. les anciens textes des 10 phrases de départ sont corrigés dans la base (le seed ne se laisse pas écraser par un CSV) ;
 *  4. chaque modification, correction ou refus est inscrit dans un journal (item_audit).
 */
import { normalizePhraseComparisonKey } from '../../../shared/csvDedup.ts';
import type { Queryable } from './db.ts';
import { SEED_ANCIENS_TEXTES, SEED_ITEMS_CORRIGES } from './seedItems.ts';

export const SEED_CREATOR = 'system_ompangano';
export const cle = (t: unknown): string => normalizePhraseComparisonKey(typeof t === 'string' ? t : '');

// ------------------------------------------------------------------ phrases écartées

const ECARTEES_PAR_DEFAUT: { texte: string; raison: string }[] = [
  { texte: 'Irende si bendi go nongo', raison: "Phrase générée par IA, sans sens en myènè (signalée par Capp le 2 nov. 2026 ; voir ITEM_001, traçabilité du corpus)." },
  // Anciens textes IA des phrases de départ (corrigés le 30 oct. 2026), sauf s'ils s'écrivent comme le texte corrigé
  ...Object.entries(SEED_ANCIENS_TEXTES)
    .filter(([id, vieux]) => !SEED_ITEMS_CORRIGES.some(c => c.id === id && cle(c.myeneText) === cle(vieux)))
    .map(([id, vieux]) => ({ texte: vieux, raison: `Ancien texte généré par IA de la phrase de départ ${id} (incorrect, corrigé le 30 oct. 2026).` })),
];

export async function chargerEcartees(q: Queryable): Promise<Map<string, string>> {
  const rows = await q.query<any>(`SELECT key, reason FROM rejected_phrases`);
  return new Map(rows.map(r => [r.key as string, (r.reason as string) || '']));
}

/** Raison du refus si la phrase est écartée, sinon undefined. */
export const raisonEcartee = (liste: Map<string, string>, texte: unknown): string | undefined => {
  const k = cle(texte);
  return k && liste.has(k) ? liste.get(k) || 'Phrase écartée.' : undefined;
};

// ------------------------------------------------------------------ journal

export interface EntreeJournal {
  itemId: string; action: 'cree' | 'modifie' | 'corrige_seed' | 'rejete_ancien' | 'rejete_refusee';
  acteur?: string | null; source: 'put' | 'batch' | 'import' | 'serveur';
  ancienMyene?: string | null; nouveauMyene?: string | null; ancienFrancais?: string | null; nouveauFrancais?: string | null;
  dateClient?: string | null; dateServeur?: Date | string | null; detail?: string;
}

export async function journaliser(q: Queryable, entrees: EntreeJournal[]): Promise<void> {
  for (let i = 0; i < entrees.length; i += 500) {
    const part = entrees.slice(i, i + 500);
    await q.query(
      `INSERT INTO item_audit (item_id, action, actor, source, old_myene, new_myene, old_french, new_french, client_updated_at, server_updated_at, detail)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::timestamptz[], $11::text[])`,
      [
        part.map(e => e.itemId), part.map(e => e.action), part.map(e => e.acteur ?? null), part.map(e => e.source),
        part.map(e => e.ancienMyene ?? null), part.map(e => e.nouveauMyene ?? null), part.map(e => e.ancienFrancais ?? null), part.map(e => e.nouveauFrancais ?? null),
        part.map(e => e.dateClient ?? null), part.map(e => (e.dateServeur ? new Date(e.dateServeur).toISOString() : null)), part.map(e => e.detail ?? null),
      ]
    );
  }
}

// ------------------------------------------------------------------ écritures plus anciennes

const dateValide = (v: unknown): number | null => {
  if (typeof v !== 'string' || !v) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
};

/**
 * Une écriture est « plus ancienne » si la date qu'elle porte (`updatedAt`) précède la dernière modification enregistrée.
 * Pour les fiches (items) une écriture sans date valide sur une fiche déjà présente est aussi refusée : on ne peut pas
 * savoir si elle est récente. Pour les autres collections, l'absence de date reste acceptée (anciens écrans d'administration).
 */
export function estPlusAncienne(table: string, ecriture: Record<string, unknown>, existant: { updated_at: Date | string } | undefined): { refus: boolean; dateClient: string | null } {
  if (!existant) return { refus: false, dateClient: null };
  const t = dateValide(ecriture.updatedAt);
  const serveur = new Date(existant.updated_at).getTime();
  if (t === null) return { refus: table === 'items', dateClient: null };
  return { refus: t < serveur, dateClient: String(ecriture.updatedAt) };
}

// ------------------------------------------------------------------ préparation au démarrage

/** Corrige les phrases de départ qui portent encore leur ancien texte IA (le CSV ne peut pas les modifier : elles sont protégées). */
export async function corrigerSeed(q: Queryable): Promise<number> {
  let n = 0;
  for (const c of SEED_ITEMS_CORRIGES) {
    const vieux = SEED_ANCIENS_TEXTES[c.id];
    if (!vieux) continue;
    const row = (await q.query<any>(`SELECT id, updated_at, data FROM items WHERE id = $1 AND deleted_at IS NULL`, [c.id]))[0];
    if (!row || row.data?.myeneText === c.myeneText || cle(row.data?.myeneText) !== cle(vieux)) continue;
    await q.query(
      `UPDATE items SET dialect = $2, category = $3, data = data || $4::jsonb WHERE id = $1`,
      [c.id, c.dialect, c.category, JSON.stringify({
        frenchText: c.frenchText, myeneText: c.myeneText, dialect: c.dialect, category: c.category,
        contextNotes: c.contextNotes, difficulty: c.difficulty, updatedAt: new Date().toISOString(),
      })]
    );
    await journaliser(q, [{ itemId: c.id, action: 'corrige_seed', source: 'serveur', ancienMyene: row.data.myeneText, nouveauMyene: c.myeneText, ancienFrancais: row.data.frenchText, nouveauFrancais: c.frenchText, detail: 'Ancien texte IA de la phrase de départ remplacé par le texte corrigé.' }]);
    n++;
  }
  return n;
}

/** À appeler au démarrage (idempotent) : liste initiale des phrases écartées, puis correction des phrases de départ. */
export async function preparerProtection(q: Queryable): Promise<{ ecartees: number; seedCorrige: number }> {
  let ecartees = 0;
  for (const e of ECARTEES_PAR_DEFAUT) {
    const r = await q.query<any>(
      `INSERT INTO rejected_phrases (key, myene_text, reason, created_by) VALUES ($1, $2, $3, 'serveur') ON CONFLICT (key) DO NOTHING RETURNING key`,
      [cle(e.texte), e.texte, e.raison]
    );
    ecartees += r.length;
  }
  return { ecartees, seedCorrige: await corrigerSeed(q) };
}
