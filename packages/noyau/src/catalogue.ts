import { api } from './api';
import type { QuestionnaireItem } from './types';

/**
 * Stockage local du catalogue (SQLite sur mobile, mémoire sur le web). La synchronisation écrit page par page
 * et enregistre le curseur à chaque page : une coupure reprend là où elle s'était arrêtée (comme le web).
 */
export interface StockageCatalogue {
  lireCurseur(): Promise<{ curseur: string | null; epoque: string | null }>;
  ecrirePage(fiches: QuestionnaireItem[], supprimees: string[], curseur: string | null, epoque: string | null): Promise<void>;
  vider(): Promise<void>;
  compter(): Promise<number>;
  /** Fiche suivante d'un dialecte (null = tous), après `apresId` dans l'ordre des identifiants. */
  suivante(dialecte: string | null, apresId: string | null): Promise<QuestionnaireItem | null>;
}

export interface Progression { fait: number; total: number }

interface PageSync {
  records: (QuestionnaireItem & { deletedAt?: string })[];
  cursor: string | null;
  hasMore: boolean;
  epoch?: string;
  reset?: boolean;
  total?: number;
}

const PAGE = 500;

export async function synchroniserCatalogue(
  stock: StockageCatalogue,
  surProgression?: (p: Progression) => void
): Promise<{ ok: boolean; changees: number }> {
  try {
    const etat = await stock.lireCurseur();
    let curseur = (await stock.compter()) > 0 ? etat.curseur : null;
    let epoque = etat.epoque;
    let total = 0, lu = 0, changees = 0;
    for (;;) {
      const qs = new URLSearchParams({ limit: String(PAGE) });
      if (curseur) qs.set('since', curseur);
      if (epoque) qs.set('epoch', epoque);
      const page = await api<PageSync>('GET', `/v1/sync/items?${qs}`);
      // Données remises à zéro côté serveur : le catalogue local repart de zéro
      if (page.reset) { await stock.vider(); curseur = null; }
      if (!total && typeof page.total === 'number') total = page.total;
      lu += page.records.length;
      if (total) surProgression?.({ fait: Math.min(lu, total), total });
      if (page.epoch) epoque = page.epoch;
      const supprimees = page.records.filter(r => r.deletedAt).map(r => r.id);
      const fiches = page.records.filter(r => !r.deletedAt);
      if (page.cursor) curseur = page.cursor;
      await stock.ecrirePage(fiches, supprimees, curseur, epoque);
      changees += page.records.length;
      if (!page.hasMore) break;
    }
    return { ok: true, changees };
  } catch {
    return { ok: false, changees: 0 };
  }
}
