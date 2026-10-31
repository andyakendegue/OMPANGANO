/** Déduplication des phrases importées (CSV). Partagé entre l'application et l'API. */
import type { QuestionnaireItem } from '../src/types';

/**
 * Normalizes a Myènè or French phrase for reliable duplicate detection across imports
 * without altering the stored display text.
 */
export function normalizePhraseComparisonKey(text: string = ''): string {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^["'«»\s]+|["'«»\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds a unique content signature combining normalized Myènè and French texts.
 */
export function buildItemDeduplicationSignature(myeneText: string = '', frenchText: string = ''): string {
  return `${normalizePhraseComparisonKey(myeneText)}||${normalizePhraseComparisonKey(frenchText)}`;
}

/**
 * Ensures any CSV or generated record ID is 100% valid for both Firestore document paths
 * and Firebase Realtime Database keys (cannot contain '.', '$', '#', '[', ']', or '/').
 */
export function sanitizeFirebaseRecordId(rawId: string = ''): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[.$#[\]/\\]+/g, '_')
    .replace(/\s+/g, '_');
  return cleaned || `item_${Date.now()}`;
}

/**
 * Generates a deterministic ID from the phrase content when a CSV row has no explicit ID column,
 * so re-importing the same CSV file always maps to the exact same ID instead of generating random Date.now() IDs.
 */
export function generateDeterministicCsvItemId(
  myeneText: string,
  frenchText: string,
  dialect: string = 'orungu'
): string {
  const signature = `${normalizePhraseComparisonKey(dialect)}|${buildItemDeduplicationSignature(myeneText, frenchText)}`;
  let h1 = 0xdeadbeef ^ signature.length;
  let h2 = 0x41c6ce57 ^ signature.length;
  for (let i = 0; i < signature.length; i++) {
    const ch = signature.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hashHex = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  return `item_csv_${hashHex}`;
}

export interface CsvDeduplicationResult {
  /** Phrases absentes de la base : à créer. */
  newItemsToImport: QuestionnaireItem[];
  /** Phrases déjà présentes (même numéro, ou même texte) dont le contenu a changé : à mettre à jour. */
  itemsToUpdate: QuestionnaireItem[];
  /** Phrases déjà présentes et identiques : ignorées. */
  alreadyExistingItems: QuestionnaireItem[];
  internalDuplicatesCount: number;
  totalParsedCount: number;
}

/** Champs comparés pour savoir si une phrase existante doit être mise à jour. */
function csvContentChanged(existing: QuestionnaireItem, candidate: QuestionnaireItem): boolean {
  const norm = (v: unknown) => (v === undefined || v === null ? '' : String(v)).trim();
  const fields: (keyof QuestionnaireItem)[] = [
    'frenchText', 'myeneText', 'dialect', 'category', 'phoneticApi', 'grammaticalTarget', 'contextNotes', 'difficulty', 'moduleThematique'
  ];
  return fields.some(f => candidate[f] !== undefined && norm(candidate[f]) !== '' && norm(candidate[f]) !== norm(existing[f]));
}

/**
 * Compare les phrases d'un CSV à la base :
 * 1. Même numéro (colonne ID du fichier, ex. ORU_0001) qu'une phrase existante :
 *    la phrase est MISE À JOUR si son contenu a changé (sinon ignorée). L'identifiant,
 *    les compteurs, l'image et la date de création de la phrase existante sont conservés,
 *    donc les contributions déjà liées restent attachées.
 * 2. Sans numéro connu, même texte myènè + français qu'une phrase existante : ignorée.
 * 3. Sinon : nouvelle phrase.
 * Les lignes en double dans le fichier lui-même (même numéro ou même texte) ne sont prises qu'une fois.
 */
export function deduplicateParsedCsvItems(
  parsedItems: QuestionnaireItem[],
  existingItems: QuestionnaireItem[]
): CsvDeduplicationResult {
  const byId = new Map<string, QuestionnaireItem>();
  const bySignature = new Map<string, QuestionnaireItem>();

  for (const existing of existingItems || []) {
    if (!existing) continue;
    if (existing.id) {
      byId.set(existing.id.trim().toLowerCase(), existing);
      byId.set(sanitizeFirebaseRecordId(existing.id).toLowerCase(), existing);
    }
    if (existing.sourceRef) {
      byId.set(sanitizeFirebaseRecordId(existing.sourceRef).toLowerCase(), existing);
    }
    if (existing.myeneText || existing.frenchText) {
      bySignature.set(buildItemDeduplicationSignature(existing.myeneText, existing.frenchText), existing);
    }
  }

  const seenInCsvIds = new Set<string>();
  const seenInCsvSignatures = new Set<string>();

  const newItemsToImport: QuestionnaireItem[] = [];
  const itemsToUpdate: QuestionnaireItem[] = [];
  const alreadyExistingItems: QuestionnaireItem[] = [];
  let internalDuplicatesCount = 0;

  for (const candidate of parsedItems || []) {
    if (!candidate) continue;
    const safeId = sanitizeFirebaseRecordId(candidate.id);
    const lowerId = safeId.toLowerCase();
    const refKey = candidate.sourceRef ? sanitizeFirebaseRecordId(candidate.sourceRef).toLowerCase() : '';
    const sig = buildItemDeduplicationSignature(candidate.myeneText, candidate.frenchText);

    // Doublon à l'intérieur du même fichier
    if (seenInCsvIds.has(lowerId) || (refKey && seenInCsvIds.has(refKey)) || seenInCsvSignatures.has(sig)) {
      internalDuplicatesCount++;
      continue;
    }
    seenInCsvIds.add(lowerId);
    if (refKey) seenInCsvIds.add(refKey);
    seenInCsvSignatures.add(sig);

    // 1. Même numéro qu'une phrase existante → mise à jour si le contenu a changé
    const sameNumber = byId.get(lowerId) || (refKey ? byId.get(refKey) : undefined);
    if (sameNumber) {
      if (csvContentChanged(sameNumber, candidate)) {
        itemsToUpdate.push({
          ...sameNumber,
          frenchText: candidate.frenchText || sameNumber.frenchText,
          myeneText: candidate.myeneText || sameNumber.myeneText,
          dialect: candidate.dialect || sameNumber.dialect,
          category: candidate.category || sameNumber.category,
          theme: candidate.theme || sameNumber.theme,
          moduleThematique: candidate.moduleThematique || sameNumber.moduleThematique,
          phoneticApi: candidate.phoneticApi || sameNumber.phoneticApi,
          grammaticalTarget: candidate.grammaticalTarget || sameNumber.grammaticalTarget,
          durationSec: candidate.durationSec || sameNumber.durationSec,
          contextNotes: candidate.contextNotes || sameNumber.contextNotes,
          difficulty: candidate.difficulty || sameNumber.difficulty,
          sourceRef: candidate.sourceRef || sameNumber.sourceRef,
          status: 'active',
          updatedAt: new Date().toISOString()
        });
      } else {
        alreadyExistingItems.push(candidate);
      }
      continue;
    }

    // 2. Même texte qu'une phrase existante (sous un autre identifiant) → ignorée
    if (bySignature.has(sig)) {
      alreadyExistingItems.push(candidate);
      continue;
    }

    // 3. Nouvelle phrase
    newItemsToImport.push({
      ...candidate,
      id: safeId,
      updatedAt: candidate.updatedAt || new Date().toISOString()
    });
  }

  return {
    newItemsToImport,
    itemsToUpdate,
    alreadyExistingItems,
    internalDuplicatesCount,
    totalParsedCount: (parsedItems || []).length
  };
}
