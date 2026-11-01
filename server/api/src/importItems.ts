/**
 * Import de phrases (CSV déjà lu en objets). Même logique que le navigateur
 * (shared/csvDedup.ts) : même numéro = mise à jour, sinon même texte = ignoré, sinon création.
 */
import type { QuestionnaireItem } from '../../../src/types/index.ts';
import { deduplicateParsedCsvItems } from '../../../shared/csvDedup.ts';
import { cleanData } from './model.ts';
import type { Queryable } from './db.ts';

export interface ImportReport {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  internalDuplicates: number;
}

const CHUNK = 500;

function itemColumns(it: Record<string, any>) {
  return [it.sourceRef || null, it.dialect || null, it.category || null, it.status || 'active'];
}

export async function importItems(q: Queryable, parsed: QuestionnaireItem[], opts: { dryRun?: boolean } = {}): Promise<ImportReport> {
  const rows = await q.query<any>(`SELECT id, source_ref, data FROM items WHERE deleted_at IS NULL`);
  const existing = rows.map(r => ({ ...(r.data || {}), id: r.id, sourceRef: r.source_ref || r.data?.sourceRef }) as QuestionnaireItem);
  const res = deduplicateParsedCsvItems(parsed, existing);
  const report: ImportReport = {
    total: res.totalParsedCount,
    created: res.newItemsToImport.length,
    updated: res.itemsToUpdate.length,
    unchanged: res.alreadyExistingItems.length,
    internalDuplicates: res.internalDuplicatesCount
  };
  if (opts.dryRun) return report;

  for (let i = 0; i < res.newItemsToImport.length; i += CHUNK) {
    const part = res.newItemsToImport.slice(i, i + CHUNK);
    await q.query(
      `INSERT INTO items (id, source_ref, dialect, category, status, data)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::jsonb[])
       ON CONFLICT (id) DO NOTHING`,
      [
        part.map(p => p.id),
        part.map(p => itemColumns(p)[0]),
        part.map(p => itemColumns(p)[1]),
        part.map(p => itemColumns(p)[2]),
        part.map(p => itemColumns(p)[3]),
        part.map(p => JSON.stringify(cleanData(p as any)))
      ]
    );
  }
  for (let i = 0; i < res.itemsToUpdate.length; i += CHUNK) {
    const part = res.itemsToUpdate.slice(i, i + CHUNK);
    await q.query(
      `UPDATE items t SET source_ref = v.source_ref, dialect = v.dialect, category = v.category, status = v.status,
              data = t.data || v.data, deleted_at = NULL
       FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::jsonb[]) AS v(id, source_ref, dialect, category, status, data)
       WHERE t.id = v.id AND t.data->>'createdBy' IS DISTINCT FROM 'system_ompangano'`, // le seed initial n'est jamais écrasé par un CSV
      [
        part.map(p => p.id),
        part.map(p => itemColumns(p)[0]),
        part.map(p => itemColumns(p)[1]),
        part.map(p => itemColumns(p)[2]),
        part.map(p => itemColumns(p)[3]),
        part.map(p => JSON.stringify(cleanData(p as any)))
      ]
    );
  }
  return report;
}
