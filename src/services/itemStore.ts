/**
 * Catalogue local des phrases (IndexedDB), conçu pour de vieux téléphones : les ~45 000 fiches ne sont
 * JAMAIS toutes chargées en mémoire. L'application lit uniquement ce dont elle a besoin (une fiche, une page,
 * une liste d'identifiants) et les compteurs (par dialecte, par thème) sont tenus à jour à chaque modification.
 * Une synchronisation n'écrit que les fiches modifiées.
 */
import type { QuestionnaireItem } from '../types';
import { chiffrementDisponible, chiffrer, dechiffrer, obtenirCle } from './chiffrement';

// Base chiffrée (fiches et texte de recherche scellés en AES-GCM ; seuls l'identifiant, le dialecte et le thème restent en clair
// pour les index). L'ancienne base en clair est supprimée au premier lancement : le catalogue est alors retéléchargé.
const DB_NAME = 'ompangano_catalogue_c';
const DB_VERSION = 1;
const LEGACY_DB_NAME = 'ompangano_catalogue';
const MIGRATION_KEY = 'ompangano_catalogue_chiffre';
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

interface Scelle { id: string; dialect?: string; category: string; iv?: Uint8Array; ct?: ArrayBuffer; raw?: QuestionnaireItem }

async function sceller(it: QuestionnaireItem): Promise<Scelle> {
  const base = { id: it.id, dialect: it.dialect as string | undefined, category: categoryOf(it) };
  if (!chiffrementDisponible()) return { ...base, raw: it };
  const s = await chiffrer(it);
  return { ...base, iv: s.iv, ct: s.ct };
}
async function ouvrir(r: Scelle | undefined): Promise<QuestionnaireItem | null> {
  if (!r) return null;
  if (r.raw) return r.raw;
  if (!r.iv || !r.ct) return null;
  try { return await dechiffrer<QuestionnaireItem>({ iv: r.iv, ct: r.ct }); } catch { signalerIllisible(); return null; }
}

// Des fiches présentes mais illisibles (clé perdue, base abîmée) ne servent à rien : après quelques échecs, le catalogue local
// est effacé et la page rechargée, ce qui retélécharge proprement. Au plus une réparation toutes les 10 minutes.
let echecsLecture = 0;
function signalerIllisible() { if (++echecsLecture >= 3) void reparerCatalogue('fiches illisibles'); }
let reparation: Promise<void> | null = null;
export function reparerCatalogue(raison: string): Promise<void> {
  if (reparation) return reparation;
  try {
    const derniere = Number(sessionStorage.getItem('ompangano_reparation')) || 0;
    if (Date.now() - derniere < 10 * 60_000) return Promise.resolve();
    sessionStorage.setItem('ompangano_reparation', String(Date.now()));
  } catch {}
  console.warn('[catalogue] réparation automatique :', raison);
  reparation = (async () => {
    try { await clearCatalogue({ silent: true }); } catch {}
    oublierCurseurs();
    location.reload();
  })();
  return reparation;
}
const ouvrirTout = async (rows: Scelle[]) => (await Promise.all(rows.map(ouvrir))).filter((x): x is QuestionnaireItem => !!x);

/** Curseurs de synchronisation : à effacer quand le contenu local n'est plus utilisable, pour retélécharger */
function oublierCurseurs() {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k === 'ompangano_prio_download' || (k.startsWith('ompangano_sync_cursor_') && /_items(_epoch)?$/.test(k))) localStorage.removeItem(k);
    }
  } catch {}
}
function purgerAncienneBase() {
  try {
    if (localStorage.getItem(MIGRATION_KEY) === '1') return;
    indexedDB.deleteDatabase(LEGACY_DB_NAME);
    oublierCurseurs();
    localStorage.setItem(MIGRATION_KEY, '1');
  } catch {}
}

let cleControlee = false;
let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB non supporté'));
      return;
    }
    purgerAncienneBase();
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
      // Clé de chiffrement perdue ou nouvelle alors que des fiches existent : elles sont illisibles, on repart de zéro
      (chiffrementDisponible() ? obtenirCle() : Promise.resolve({ creee: false })).then(({ creee }) => {
        // La clé n'est « nouvelle » qu'au premier contrôle de la session : une réouverture de la base ne doit jamais tout effacer
        const nouvelle = creee && !cleControlee;
        cleControlee = true;
        if (!nouvelle) { resolve(db); return; }
        const tx = db.transaction([STORE_ITEMS, STORE_META, STORE_SEARCH], 'readwrite');
        tx.objectStore(STORE_ITEMS).clear(); tx.objectStore(STORE_META).clear(); tx.objectStore(STORE_SEARCH).clear();
        tx.oncomplete = () => { oublierCurseurs(); resolve(db); };
        tx.onerror = () => resolve(db);
      }).catch(() => resolve(db));
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

/** Comme getCatalogueMeta, mais une lecture impossible lève l'erreur au lieu de répondre « 0 fiche ». */
export async function getCatalogueMetaStrict(): Promise<CatalogueMeta> {
  if (metaCache) return metaCache;
  {
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
  }
}

export async function getCatalogueMeta(): Promise<CatalogueMeta> {
  try { return await getCatalogueMetaStrict(); } catch { return emptyMeta(); }
}

async function saveMeta(meta: CatalogueMeta) {
  const db = await open();
  const tx = db.transaction(STORE_META, 'readwrite');
  tx.objectStore(STORE_META).put({ k: META_KEY, ...meta });
  await done(tx);
}

// ---------------------------------------------------------------- état de synchronisation (copie dans la base)
// Le curseur et la reprise sont aussi gardés dans la base du catalogue : si le navigateur efface le stockage léger
// (localStorage) mais garde la base, la synchronisation reprend au lieu de tout retélécharger.
export interface SyncState {
  uid: string;
  cursor: string | null;
  epoch: string | null;
  prio: { offset: number; delta: string } | null;
}
export async function saveSyncState(state: SyncState): Promise<void> {
  try {
    const db = await open();
    const tx = db.transaction(STORE_META, 'readwrite');
    tx.objectStore(STORE_META).put({ k: 'sync', ...state });
    await done(tx);
  } catch {}
}
export async function loadSyncState(): Promise<SyncState | null> {
  try {
    const db = await open();
    const r = await wrap(db.transaction(STORE_META).objectStore(STORE_META).get('sync'));
    return r ? { uid: r.uid, cursor: r.cursor ?? null, epoch: r.epoch ?? null, prio: r.prio ?? null } : null;
  } catch { return null; }
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

const SEARCH_FLUSH_AT = 10000;
/** Textes de recherche en attente d'écriture (page de téléchargement par page) : l'index chiffré est réécrit par blocs */
const searchBuffer = new Map<string, string | null>();

async function writeDelta(
  upserts: QuestionnaireItem[],
  deleteIds: string[],
  options: { silent?: boolean; knownEmpty?: boolean }
): Promise<void> {
  const meta = await getCatalogueMeta();
  // Le chiffrement est asynchrone : il se fait avant d'ouvrir la transaction (qui se fermerait pendant l'attente)
  const prepared = await Promise.all(upserts.map(async raw => {
    // Le thème sert de catégorie quand elle manque : un seul index suffit pour filtrer par thème
    const it = raw.category ? raw : { ...raw, category: categoryOf(raw) };
    return { it, sealed: await sceller(it) };
  }));
  const db = await open();
  const tx = db.transaction([STORE_ITEMS, STORE_META], 'readwrite');
  const store = tx.objectStore(STORE_ITEMS);
  // La copie des compteurs n'est adoptée qu'à la fin : si la transaction échoue, les compteurs restent justes
  const next: CatalogueMeta = JSON.parse(JSON.stringify(meta));

  for (const { it, sealed } of prepared) {
    if (options.knownEmpty) {
      store.put(sealed);
      bump(next, it, 1);
    } else {
      store.get(it.id).onsuccess = (e) => {
        // Le dialecte et le thème de l'ancienne fiche sont en clair : pas besoin de la déchiffrer
        const old = (e.target as IDBRequest<Scelle | undefined>).result;
        if (old) bump(next, old as unknown as QuestionnaireItem, -1);
        store.put(sealed);
        bump(next, it, 1);
      };
    }
  }
  for (const id of deleteIds) {
    store.get(id).onsuccess = (e) => {
      const old = (e.target as IDBRequest<Scelle | undefined>).result;
      if (!old) return;
      bump(next, old as unknown as QuestionnaireItem, -1);
      store.delete(id);
    };
  }
  // Les compteurs sont écrits après les lectures ci-dessus (même transaction, requêtes dans l'ordre)
  store.count().onsuccess = () => {
    tx.objectStore(STORE_META).put({ k: META_KEY, ...next });
  };
  await done(tx);
  metaCache = next;
  for (const { it } of prepared) searchBuffer.set(it.id, searchTextOf(it));
  for (const id of deleteIds) searchBuffer.set(id, null);
  if (!options.silent || searchBuffer.size >= SEARCH_FLUSH_AT) await flushNow();
  if (!options.silent) notifyChanged(upserts.length + deleteIds.length <= 20);
}

/** `silent` : les écrans gardent leur affichage jusqu'aux premières pages (évite un passage visible par 0). */
export function clearCatalogue(options: { silent?: boolean } = {}): Promise<void> {
  return serialized(() => clearNow(!!options.silent));
}
async function clearNow(silent = false): Promise<void> {
  const db = await open();
  const tx = db.transaction([STORE_ITEMS, STORE_META, STORE_SEARCH], 'readwrite');
  tx.objectStore(STORE_ITEMS).clear();
  tx.objectStore(STORE_SEARCH).clear();
  tx.objectStore(STORE_META).clear();
  await done(tx);
  searchBuffer.clear();
  metaCache = emptyMeta();
  if (!silent) notifyChanged(true);
}

/** Supprime la base du catalogue elle-même (déconnexion) : connexion fermée, puis base effacée du téléphone. */
export async function deleteCatalogueDatabase(): Promise<void> {
  const pending = dbPromise;
  dbPromise = null;
  metaCache = null;
  searchChecked = false;
  if (pending) { try { (await pending).close(); } catch {} }
  if (typeof indexedDB === 'undefined') return;
  await new Promise<void>(resolve => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
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
    return await ouvrir(await wrap(db.transaction(STORE_ITEMS).objectStore(STORE_ITEMS).get(id)));
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
    return await ouvrirTout(found.filter((x): x is Scelle => !!x));
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
    const rows: Scelle[] = await wrap(db.transaction(STORE_ITEMS).objectStore(STORE_ITEMS).getAll(range, BATCH));
    for (const it of await ouvrirTout(rows)) if (cb(it) === false) return;
    if (rows.length < BATCH) return;
    after = rows[rows.length - 1].id;
  }
}

// ---------------------------------------------------------------- texte de recherche chiffré
// 64 blocs scellés (fiche -> bloc par empreinte de l'identifiant) : une recherche déchiffre 64 blocs, pas 45 000 lignes.
const SEARCH_BLOCKS = 64;
interface Bloc { id: number; n: number; iv?: Uint8Array; ct?: ArrayBuffer; raw?: Record<string, string> }
const blocDe = (id: string) => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % SEARCH_BLOCKS;
};
async function ouvrirBloc(b: Bloc | undefined): Promise<Record<string, string>> {
  if (!b) return {};
  if (b.raw) return b.raw;
  if (!b.iv || !b.ct) return {};
  try { return await dechiffrer<Record<string, string>>({ iv: b.iv, ct: b.ct }); } catch { return {}; }
}
async function sceller_bloc(id: number, contenu: Record<string, string>): Promise<Bloc> {
  const n = Object.keys(contenu).length;
  if (!chiffrementDisponible()) return { id, n, raw: contenu };
  const s = await chiffrer(contenu);
  return { id, n, iv: s.iv, ct: s.ct };
}

/** Écrit les textes en attente dans leurs blocs (lecture, modification en mémoire, réécriture). À appeler dans la file d'écriture. */
async function flushNow(): Promise<void> {
  if (searchBuffer.size === 0) return;
  const entries = Array.from(searchBuffer);
  searchBuffer.clear();
  try {
    const parBloc = new Map<number, [string, string | null][]>();
    for (const e of entries) {
      const n = blocDe(e[0]);
      (parBloc.get(n) || parBloc.set(n, []).get(n)!).push(e);
    }
    const db = await open();
    // Lectures d'abord (une transaction ne survit pas à l'attente du déchiffrement)
    const readStore = db.transaction(STORE_SEARCH).objectStore(STORE_SEARCH);
    const existants = new Map<number, Bloc | undefined>(
      await Promise.all(Array.from(parBloc.keys()).map(async n => [n, (await wrap(readStore.get(n))) as Bloc | undefined] as const))
    );
    const ecrire: Bloc[] = [];
    for (const [n, list] of parBloc) {
      const contenu = await ouvrirBloc(existants.get(n));
      for (const [id, t] of list) { if (t === null) delete contenu[id]; else contenu[id] = t; }
      ecrire.push(await sceller_bloc(n, contenu));
    }
    const tx = db.transaction(STORE_SEARCH, 'readwrite');
    for (const b of ecrire) tx.objectStore(STORE_SEARCH).put(b);
    await done(tx);
  } catch (err) {
    // Index incomplet : il sera reconstruit à la prochaine recherche
    searchChecked = false;
    searchBroken = true;
    throw err;
  }
}
/** Fin d'un téléchargement : l'index de recherche est écrit */
export function flushSearchIndex(): Promise<void> { return serialized(flushNow).catch(() => undefined); }

let searchChecked = false;
let searchBroken = false;
/** Reconstruit le texte de recherche s'il manque ou s'il est incomplet (base créée avant son ajout, écriture interrompue) */
async function ensureSearchIndex() {
  if (searchChecked && !searchBroken) return;
  const db = await open();
  const [items, blocs] = await Promise.all([
    wrap(db.transaction(STORE_ITEMS).objectStore(STORE_ITEMS).count()),
    wrap(db.transaction(STORE_SEARCH).objectStore(STORE_SEARCH).getAll()) as Promise<Bloc[]>
  ]);
  const indexees = blocs.reduce((t, b) => t + (b.n || 0), 0);
  if (items !== indexees || searchBroken) {
    const contenus: Record<string, string>[] = Array.from({ length: SEARCH_BLOCKS }, () => ({}));
    await forEachItem(it => { contenus[blocDe(it.id)][it.id] = searchTextOf(it); });
    const scelles = await Promise.all(contenus.map((c, n) => sceller_bloc(n, c)));
    const tx = db.transaction(STORE_SEARCH, 'readwrite');
    tx.objectStore(STORE_SEARCH).clear();
    for (const b of scelles) tx.objectStore(STORE_SEARCH).put(b);
    await done(tx);
    searchBroken = false;
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
  if (!q) return [];
  await flushSearchIndex();
  await serialized(ensureSearchIndex);
  const db = await open();
  const out: string[] = [];
  for (let n = 0; n < SEARCH_BLOCKS; n++) {
    const contenu = await ouvrirBloc(await wrap(db.transaction(STORE_SEARCH).objectStore(STORE_SEARCH).get(n)) as Bloc | undefined);
    for (const [id, t] of Object.entries(contenu)) {
      if (t.includes(q) && (!options.candidates || options.candidates.has(id))) out.push(id);
    }
  }
  // Même ordre qu'avant (par identifiant), puis plafond
  out.sort();
  return out.length > cap ? out.slice(0, cap) : out;
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
  return await ouvrirTout((await wrap(db.transaction(STORE_ITEMS).objectStore(STORE_ITEMS).getAll())) as Scelle[]);
}
