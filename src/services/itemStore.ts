/**
 * Catalogue local des phrases (IndexedDB), conçu pour de vieux téléphones : les ~45 000 fiches ne sont
 * JAMAIS toutes chargées en mémoire. L'application lit uniquement ce dont elle a besoin (une fiche, une page,
 * une liste d'identifiants) et les compteurs (par dialecte, par thème) sont tenus à jour à chaque modification.
 * Une synchronisation n'écrit que les fiches modifiées.
 */
import type { QuestionnaireItem } from '../types';

const DB_NAME = 'ompangano_catalogue';
const DB_VERSION = 2;
const STORE_ITEMS = 'items';
const STORE_META = 'meta';
/** Texte de recherche réduit (minuscules) : parcourir ces petites lignes est bien plus rapide que les fiches complètes */
const STORE_SEARCH = 'search';
const META_KEY = 'summary';
export const DEFAULT_CATEGORY = 'vie_quotidienne_famille';

export interface CatalogueMeta {
  total: number;
  byDialect: Record<string, number>;
  /** dialecte -> thème -> nombre de fiches */
  byDialectCategory: Record<string, Record<string, number>>;
}

const emptyMeta = (): CatalogueMeta => ({ total: 0, byDialect: {}, byDialectCategory: {} });

export const searchTextOf = (it: Pick<QuestionnaireItem, 'frenchText' | 'myeneText' | 'contextNotes'>): string =>
  `${it.frenchText || ''}\u0001${it.myeneText || ''}\u0001${it.contextNotes || ''}`.toLowerCase();

export const categoryOf = (it: Pick<QuestionnaireItem, 'category' | 'theme'>): string =>
  it.category || (it.theme as string) || DEFAULT_CATEGORY;
export const dialectOf = (it: Pick<QuestionnaireItem, 'dialect'>): string => (it.dialect as string) || 'orungu';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB non supporté'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const s = db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
        s.createIndex('dialect', 'dialect');
        s.createIndex('category', 'category');
      }
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: 'k' });
      if (!db.objectStoreNames.contains(STORE_SEARCH)) db.createObjectStore(STORE_SEARCH, { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      // Une autre version de l'application veut mettre la base à jour : on la libère
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Base du catalogue bloquée'));
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction annulée'));
  });

const wrap = <T,>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// ---------------------------------------------------------------- compteurs et abonnés

let metaCache: CatalogueMeta | null = null;
let version = 0;
const listeners = new Set<() => void>();
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

/** Prévient les écrans que le catalogue a changé. Regroupé pour ne pas relire 45 000 fiches à chaque page téléchargée. */
function notifyChanged(immediate = false) {
  version++;
  if (notifyTimer) clearTimeout(notifyTimer);
  const fire = () => { notifyTimer = null; listeners.forEach(l => { try { l(); } catch {} }); };
  if (immediate) fire();
  else notifyTimer = setTimeout(fire, 1200);
}

/** À appeler quand une série d'écritures silencieuses est terminée (fin de synchronisation, page de temps en temps) */
export function notifyCatalogueChanged(immediate = true) { notifyChanged(immediate); }

export function subscribeCatalogue(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const getCatalogueVersion = () => version;

function bump(meta: CatalogueMeta, it: QuestionnaireItem, sign: 1 | -1) {
  const d = dialectOf(it);
  const c = categoryOf(it);
  meta.total += sign;
  meta.byDialect[d] = (meta.byDialect[d] || 0) + sign;
  const cats = (meta.byDialectCategory[d] ||= {});
  cats[c] = (cats[c] || 0) + sign;
  if (meta.byDialect[d] <= 0) { delete meta.byDialect[d]; delete meta.byDialectCategory[d]; }
  else if (cats[c] <= 0) delete cats[c];
}

export async function getCatalogueMeta(): Promise<CatalogueMeta> {
  if (metaCache) return metaCache;
  try {
    const db = await open();
    const stored = await wrap(db.transaction(STORE_META).objectStore(STORE_META).get(META_KEY));
    if (stored) {
      metaCache = { total: stored.total, byDialect: stored.byDialect, byDialectCategory: stored.byDialectCategory };
      return metaCache;
    }
    // Compteurs absents (premier passage) : un seul parcours, sans garder les fiches
    const meta = emptyMeta();
    await forEachItem(it => bump(meta, it, 1));
    metaCache = meta;
    await saveMeta(meta);
    return meta;
  } catch {
    return emptyMeta();
  }
}

async function saveMeta(meta: CatalogueMeta) {
  const db = await open();
  const tx = db.transaction(STORE_META, 'readwrite');
  tx.objectStore(STORE_META).put({ k: META_KEY, ...meta });
  await done(tx);
}

// ---------------------------------------------------------------- écriture

/**
 * Applique des modifications : fiches ajoutées ou remplacées, fiches supprimées. Seules ces fiches sont écrites.
 * `knownEmpty` : la base vient d'être vidée, inutile de relire les anciennes fiches.
 */
let writeQueue: Promise<unknown> = Promise.resolve();
/** Les écritures se font l'une après l'autre : les compteurs ne peuvent pas se marcher dessus */
function serialized<T>(job: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(job, job);
  writeQueue = run.catch(() => undefined);
  return run;
}

export function applyItemsDelta(
  upserts: QuestionnaireItem[],
  deleteIds: string[] = [],
  options: { silent?: boolean; knownEmpty?: boolean } = {}
): Promise<void> {
  if (upserts.length === 0 && deleteIds.length === 0) return Promise.resolve();
  return serialized(() => writeDelta(upserts, deleteIds, options));
}

async function writeDelta(
  upserts: QuestionnaireItem[],
  deleteIds: string[],
  options: { silent?: boolean; knownEmpty?: boolean }
): Promise<void> {
  const meta = await getCatalogueMeta();
  const db = await open();
  const tx = db.transaction([STORE_ITEMS, STORE_META, STORE_SEARCH], 'readwrite');
  const store = tx.objectStore(STORE_ITEMS);
  const searchStore = tx.objectStore(STORE_SEARCH);
  // La copie des compteurs n'est adoptée qu'à la fin : si la transaction échoue, les compteurs restent justes
  const next: CatalogueMeta = JSON.parse(JSON.stringify(meta));

  for (const raw of upserts) {
    // Le thème sert de catégorie quand elle manque : un seul index suffit pour filtrer par thème
    const it = raw.category ? raw : { ...raw, category: categoryOf(raw) };
    searchStore.put({ id: it.id, t: searchTextOf(it) });
    if (options.knownEmpty) {
      store.put(it);
      bump(next, it, 1);
    } else {
      store.get(it.id).onsuccess = (e) => {
        const old = (e.target as IDBRequest<QuestionnaireItem | undefined>).result;
        if (old) bump(next, old, -1);
        store.put(it);
        bump(next, it, 1);
      };
    }
  }
  for (const id of deleteIds) {
    store.get(id).onsuccess = (e) => {
      const old = (e.target as IDBRequest<QuestionnaireItem | undefined>).result;
      if (!old) return;
      bump(next, old, -1);
      store.delete(id);
      searchStore.delete(id);
    };
  }
  // Les compteurs sont écrits après les lectures ci-dessus (même transaction, requêtes dans l'ordre)
  store.count().onsuccess = () => {
    tx.objectStore(STORE_META).put({ k: META_KEY, ...next });
  };
  await done(tx);
  metaCache = next;
  if (!options.silent) notifyChanged(upserts.length + deleteIds.length <= 20);
}

export function clearCatalogue(): Promise<void> {
  return serialized(clearNow);
}
async function clearNow(): Promise<void> {
  const db = await open();
  const tx = db.transaction([STORE_ITEMS, STORE_META, STORE_SEARCH], 'readwrite');
  tx.objectStore(STORE_ITEMS).clear();
  tx.objectStore(STORE_SEARCH).clear();
  tx.objectStore(STORE_META).clear();
  await done(tx);
  metaCache = emptyMeta();
  notifyChanged(true);
}

/** Remplace une fiche (ajout, modification locale) */
export const putItem = (it: QuestionnaireItem) => applyItemsDelta([it]);
export const deleteItem = (id: string) => applyItemsDelta([], [id]);

// ---------------------------------------------------------------- lecture

export async function countItems(): Promise<number> {
  return (await getCatalogueMeta()).total;
}

export async function getItem(id: string): Promise<QuestionnaireItem | null> {
  if (!id) return null;
  try {
    const db = await open();
    return (await wrap(db.transaction(STORE_ITEMS).objectStore(STORE_ITEMS).get(id))) || null;
  } catch {
    return null;
  }
}

export async function getItemsByIds(ids: string[]): Promise<QuestionnaireItem[]> {
  if (ids.length === 0) return [];
  try {
    const db = await open();
    const store = db.transaction(STORE_ITEMS).objectStore(STORE_ITEMS);
    const found = await Promise.all(ids.map(id => wrap(store.get(id)).catch(() => undefined)));
    return found.filter((x): x is QuestionnaireItem => !!x);
  } catch {
    return [];
  }
}

/** Identifiants des fiches d'un ou plusieurs dialectes (sans lire les fiches elles-mêmes) */
export async function getIdsByDialects(dialects: string[]): Promise<string[]> {
  const db = await open();
  const idx = db.transaction(STORE_ITEMS).objectStore(STORE_ITEMS).index('dialect');
  const lists = await Promise.all(dialects.map(d => wrap(idx.getAllKeys(IDBKeyRange.only(d)))));
  return lists.flat() as string[];
}

export async function getAllIds(): Promise<string[]> {
  const db = await open();
  return (await wrap(db.transaction(STORE_ITEMS).objectStore(STORE_ITEMS).getAllKeys())) as string[];
}

export async function getIdsByCategory(category: string): Promise<string[]> {
  const db = await open();
  return (await wrap(db.transaction(STORE_ITEMS).objectStore(STORE_ITEMS).index('category').getAllKeys(IDBKeyRange.only(category)))) as string[];
}

/**
 * Parcourt toutes les fiches par lots de 1 000 (bien plus rapide qu'un curseur fiche par fiche, mémoire bornée).
 * Rendre `false` dans le rappel pour s'arrêter.
 */
export async function forEachItem(cb: (it: QuestionnaireItem) => void | boolean): Promise<void> {
  const db = await open();
  const BATCH = 1000;
  let after: IDBValidKey | null = null;
  for (;;) {
    const range: IDBKeyRange | null = after === null ? null : IDBKeyRange.lowerBound(after, true);
    const rows: QuestionnaireItem[] = await wrap(db.transaction(STORE_ITEMS).objectStore(STORE_ITEMS).getAll(range, BATCH));
    for (const it of rows) if (cb(it) === false) return;
    if (rows.length < BATCH) return;
    after = rows[rows.length - 1].id;
  }
}

let searchChecked = false;
/** Reconstruit le texte de recherche s'il manque (base créée avant son ajout) */
async function ensureSearchIndex() {
  if (searchChecked) return;
  const db = await open();
  const [items, search] = await Promise.all([
    wrap(db.transaction(STORE_ITEMS).objectStore(STORE_ITEMS).count()),
    wrap(db.transaction(STORE_SEARCH).objectStore(STORE_SEARCH).count())
  ]);
  if (items !== search) {
    // Par lots de 2 000, en plusieurs transactions courtes
    const ids = await getAllIds();
    for (let i = 0; i < ids.length; i += 2000) {
      const chunk = await getItemsByIds(ids.slice(i, i + 2000));
      const tx = db.transaction(STORE_SEARCH, 'readwrite');
      for (const it of chunk) tx.objectStore(STORE_SEARCH).put({ id: it.id, t: searchTextOf(it) });
      await done(tx);
    }
  }
  searchChecked = true;
}

/**
 * Identifiants des fiches dont le texte (français, myènè, notes) contient `query`.
 * `candidates` limite la recherche (tribu, thème déjà choisis) ; le nombre de résultats est plafonné.
 */
export async function searchIds(query: string, options: { candidates?: Set<string>; cap?: number } = {}): Promise<string[]> {
  const q = query.trim().toLowerCase();
  const cap = options.cap ?? 400;
  const out: string[] = [];
  if (!q) return out;
  await ensureSearchIndex();
  const db = await open();
  const BATCH = 2000;
  let after: IDBValidKey | null = null;
  for (;;) {
    const range: IDBKeyRange | null = after === null ? null : IDBKeyRange.lowerBound(after, true);
    const rows: { id: string; t: string }[] = await wrap(db.transaction(STORE_SEARCH).objectStore(STORE_SEARCH).getAll(range, BATCH));
    for (const r of rows) {
      if (r.t.includes(q) && (!options.candidates || options.candidates.has(r.id))) {
        out.push(r.id);
        if (out.length >= cap) return out;
      }
    }
    if (rows.length < BATCH) return out;
    after = rows[rows.length - 1].id;
  }
}

/** Fiches répondant à un critère, avec un plafond de résultats (mémoire bornée) */
export async function scanItems(
  predicate: (it: QuestionnaireItem) => boolean,
  options: { cap?: number; ids?: string[] } = {}
): Promise<QuestionnaireItem[]> {
  const cap = options.cap ?? 500;
  const out: QuestionnaireItem[] = [];
  if (options.ids) {
    const CHUNK = 500;
    for (let i = 0; i < options.ids.length && out.length < cap; i += CHUNK) {
      for (const it of await getItemsByIds(options.ids.slice(i, i + CHUNK))) {
        if (predicate(it)) { out.push(it); if (out.length >= cap) break; }
      }
    }
    return out;
  }
  await forEachItem(it => {
    if (predicate(it)) out.push(it);
    return out.length < cap;
  });
  return out;
}

/** Toutes les fiches en mémoire : réservé aux outils d'administration (ordinateur), jamais à l'affichage courant */
export async function getAllItems(): Promise<QuestionnaireItem[]> {
  const db = await open();
  return (await wrap(db.transaction(STORE_ITEMS).objectStore(STORE_ITEMS).getAll())) as QuestionnaireItem[];
}
