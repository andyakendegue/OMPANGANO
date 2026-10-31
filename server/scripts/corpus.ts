/**
 * Lecture des CSV du corpus myènè (ANCIEN_mis_a_jour : ITEM_xxxx, NOUVEAU_35000 : NEW_xxxxx).
 * Les colonnes en plus (provenance, source_page, statut, modifications…) sont gardées dans data.corpusMeta.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import type { QuestionnaireItem } from '../../src/types/index.ts';
import { sanitizeFirebaseRecordId } from '../../shared/csvDedup.ts';

const KNOWN = new Set(['id', 'frenchText', 'myeneText', 'theme', 'dialect', 'difficulty', 'contextNotes', 'imageUrl', 'transcription_phonetique']);
const DIFFICULTIES = ['debutant', 'intermediaire', 'avance'];

export function loadCorpusCsv(path: string, opts: { statuts?: string[]; createdAt?: string } = {}): QuestionnaireItem[] {
  const rows: Record<string, string>[] = parse(readFileSync(path, 'utf8'), { columns: true, bom: true, skip_empty_lines: true, relax_column_count: true });
  const now = opts.createdAt || new Date().toISOString();
  const out: QuestionnaireItem[] = [];
  for (const r of rows) {
    const ref = (r.id || '').trim();
    if (!ref || !r.myeneText?.trim() || !r.frenchText?.trim()) continue;
    if (opts.statuts?.length && !opts.statuts.includes((r.statut || '').trim())) continue;
    const meta: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) if (!KNOWN.has(k) && v !== '' && v != null) meta[k] = v;
    const theme = (r.theme || 'vie_quotidienne').trim();
    out.push({
      id: sanitizeFirebaseRecordId(ref),
      sourceRef: ref,
      frenchText: r.frenchText.trim(),
      myeneText: r.myeneText.trim(),
      dialect: (r.dialect || 'orungu').trim(),
      category: theme,
      theme,
      moduleThematique: theme,
      phoneticApi: r.transcription_phonetique || undefined,
      contextNotes: r.contextNotes || '',
      imageUrl: r.imageUrl || '',
      difficulty: (DIFFICULTIES.includes(r.difficulty) ? r.difficulty : 'debutant') as QuestionnaireItem['difficulty'],
      status: 'active',
      contributionsCount: 0,
      recordingsCount: 0,
      createdBy: 'import-corpus',
      createdAt: now,
      corpusMeta: meta
    } as QuestionnaireItem);
  }
  return out;
}
