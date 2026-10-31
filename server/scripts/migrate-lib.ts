/**
 * Migration Firebase -> VPS (logique pure, testable sans Firebase).
 * - lit Firestore ET la RTDB, garde la version au updatedAt le plus récent (Firestore gagne à égalité) ;
 * - copie les voix de Storage vers Garage (même chemin) et décode les anciens audios en base64 ;
 * - idempotent : par défaut une ligne déjà présente n'est pas touchée (--overwrite pour la bascule finale) ;
 * - ne supprime jamais rien côté Firebase (la source n'est lue qu'en lecture).
 */
import type { Db } from '../api/src/db.ts';
import type { MediaStorage } from '../api/src/storage.ts';

export interface Source {
  listFirestore(collection: string): Promise<Record<string, any>[]>;
  listRtdb(collection: string): Promise<Record<string, any>[]>;
  listStoragePaths(prefix: string): Promise<string[]>;
  downloadStorage(path: string): Promise<{ body: Uint8Array; contentType: string }>;
}

export interface MigrateOptions {
  dryRun?: boolean;
  overwrite?: boolean;
  skipMedia?: boolean;
  only?: string[];
  log?: (msg: string) => void;
}

export interface CollectionReport {
  firestore: number;
  rtdb: number;
  merged: number;
  written: number;
  skippedExisting: number;
  errors: string[];
}
export interface MediaReport { storageFiles: number; copied: number; alreadyThere: number; base64Decoded: number; missing: string[]; errors: string[] }
export interface Report {
  dryRun: boolean;
  collections: Record<string, CollectionReport>;
  media: MediaReport;
  postgresCounts?: Record<string, number>;
  notes: string[];
}

export const COLLECTIONS = ['users', 'admins', 'items', 'contributions', 'clans', 'villages', 'themes', 'badges', 'challenges', 'metrics'] as const;
const ARRAY_FIELDS = new Set(['badges', 'completedChallenges', 'countedChallengeIds', 'favoriteItemIds', 'clans', 'keywords']);
const ROLES = ['user', 'validator', 'admin'];
const STATUSES = ['active', 'flagged', 'suspended'];

/** RTDB renvoie les tableaux sous forme d'objets {0:…,1:…} ou les omet quand ils sont vides. */
export function normalizeRtdbValue(v: any, key?: string): any {
  if (v === null || v === undefined) return key && ARRAY_FIELDS.has(key) ? [] : v;
  if (Array.isArray(v)) return v.filter(x => x !== null && x !== undefined).map(x => normalizeRtdbValue(x));
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    if (key && ARRAY_FIELDS.has(key) && keys.length && keys.every(k => /^\d+$/.test(k))) {
      return keys.sort((a, b) => Number(a) - Number(b)).map(k => normalizeRtdbValue(v[k])).filter(x => x !== null && x !== undefined);
    }
    const out: Record<string, any> = {};
    for (const k of keys) out[k] = normalizeRtdbValue(v[k], k);
    return out;
  }
  return v;
}

const tsOf = (d: any): number => {
  for (const k of ['updatedAt', 'validatedAt', 'createdAt']) {
    const t = d?.[k] ? Date.parse(d[k]) : NaN;
    if (!Number.isNaN(t)) return t;
  }
  return 0;
};

/** Fusionne les deux sources : version la plus récente ; Firestore gagne à égalité. Renvoie aussi l'autre version (audio de secours). */
export function mergeSources(fs: Record<string, any>[], rt: Record<string, any>[]): { doc: any; other?: any }[] {
  const byId = new Map<string, { f?: any; r?: any }>();
  for (const d of fs) if (d?.id) byId.set(String(d.id), { f: d });
  for (const d of rt) {
    if (!d?.id) continue;
    const e = byId.get(String(d.id)) || {};
    e.r = d;
    byId.set(String(d.id), e);
  }
  return [...byId.values()].map(({ f, r }) => {
    if (f && r) return tsOf(r) > tsOf(f) ? { doc: r, other: f } : { doc: f, other: r };
    return { doc: (f || r)! };
  });
}

const iso = (v: any, fallback = new Date().toISOString()) => {
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? fallback : new Date(t).toISOString();
};
const num = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : d);
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
const strOrNull = (v: any) => (typeof v === 'string' && v ? v : null);

function omit(d: Record<string, any>, keys: string[]) {
  const o: Record<string, any> = {};
  for (const [k, v] of Object.entries(d)) if (!keys.includes(k) && v !== undefined && v !== null) o[k] = v;
  return o;
}

// ------------------------------------------------------------------ lignes SQL par table
interface Col { name: string; type: string }
interface TableSpec { cols: Col[] }
const TS = 'timestamptz';
const SPECS: Record<string, TableSpec> = {
  users: { cols: [
    { name: 'id', type: 'text' }, { name: 'email', type: 'text' }, { name: 'role', type: 'text' }, { name: 'status', type: 'text' },
    { name: 'suspicion_score', type: 'int' }, { name: 'xp', type: 'int' }, { name: 'level', type: 'text' }, { name: 'level_index', type: 'int' },
    { name: 'badges', type: 'jsonb' }, { name: 'contributions_count', type: 'int' }, { name: 'recordings_count', type: 'int' },
    { name: 'validations_count', type: 'int' }, { name: 'weekly_progress', type: 'jsonb' }, { name: 'completed_challenges', type: 'jsonb' },
    { name: 'last_contribution_date', type: 'text' }, { name: 'data', type: 'jsonb' }, { name: 'created_at', type: TS }] },
  contributions: { cols: [
    { name: 'id', type: 'text' }, { name: 'item_id', type: 'text' }, { name: 'user_id', type: 'text' }, { name: 'status', type: 'text' },
    { name: 'rewarded_xp', type: 'int' }, { name: 'rewarded_contribution', type: 'smallint' }, { name: 'rewarded_recording', type: 'smallint' },
    { name: 'counted_challenge_ids', type: 'jsonb' }, { name: 'audio_storage_path', type: 'text' }, { name: 'audio_mime_type', type: 'text' },
    { name: 'validator_id', type: 'text' }, { name: 'data', type: 'jsonb' }, { name: 'created_at', type: TS }] },
  items: { cols: [
    { name: 'id', type: 'text' }, { name: 'source_ref', type: 'text' }, { name: 'dialect', type: 'text' }, { name: 'category', type: 'text' },
    { name: 'status', type: 'text' }, { name: 'data', type: 'jsonb' }, { name: 'created_at', type: TS }] }
};
const GENERIC_SPEC: TableSpec = { cols: [{ name: 'id', type: 'text' }, { name: 'data', type: 'jsonb' }, { name: 'created_at', type: TS }] };

export function userRowValues(d: any, isAdmin: boolean): any[] {
  const role = isAdmin ? 'admin' : ROLES.includes(d.role) ? d.role : 'user';
  const protectedKeys = ['id', 'role', 'status', 'suspicionScore', 'xp', 'level', 'levelIndex', 'badges', 'contributionsCount', 'recordingsCount',
    'validationsCount', 'weeklyProgress', 'completedChallenges', 'lastContributionDate'];
  return [
    d.id, strOrNull(d.email)?.toLowerCase() ?? null, role, STATUSES.includes(d.status) ? d.status : 'active', num(d.suspicionScore),
    num(d.xp), d.level || 'Initié Curieux', num(d.levelIndex, 1) || 1, JSON.stringify(arr(d.badges)), num(d.contributionsCount), num(d.recordingsCount),
    num(d.validationsCount), JSON.stringify(d.weeklyProgress && typeof d.weeklyProgress === 'object' ? d.weeklyProgress : {}),
    JSON.stringify(arr(d.completedChallenges)), strOrNull(d.lastContributionDate), JSON.stringify(omit(d, protectedKeys)), iso(d.createdAt)
  ];
}

export function itemRowValues(d: any): any[] {
  return [d.id, strOrNull(d.sourceRef), strOrNull(d.dialect), strOrNull(d.category), d.status === 'archived' ? 'archived' : 'active',
    JSON.stringify(omit(d, ['id'])), iso(d.createdAt)];
}

export function contributionRowValues(d: any, audioPath: string | null): any[] {
  const own = ['id', 'itemId', 'userId', 'status', 'rewardedXp', 'rewardedContribution', 'rewardedRecording', 'countedChallengeIds',
    'audioStoragePath', 'audioMimeType', 'validatorId', 'audioUrl', 'audioBase64', 'offlineQueued'];
  return [d.id, strOrNull(d.itemId), String(d.userId || ''), d.status || 'pending', num(d.rewardedXp), num(d.rewardedContribution) ? 1 : 0,
    num(d.rewardedRecording) ? 1 : 0, JSON.stringify(arr(d.countedChallengeIds)), audioPath, strOrNull(d.audioMimeType), strOrNull(d.validatorId),
    JSON.stringify(omit(d, own)), iso(d.createdAt)];
}

export function genericRowValues(d: any): any[] {
  return [d.id, JSON.stringify(omit(d, ['id'])), iso(d.createdAt)];
}

async function upsertRows(db: Db, table: string, spec: TableSpec, rows: any[][], overwrite: boolean): Promise<{ written: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let written = 0;
  let skipped = 0;
  const names = spec.cols.map(c => c.name);
  const setClause = names.filter(n => n !== 'id' && n !== 'created_at').map(n => `${n} = EXCLUDED.${n}`).join(', ');
  const conflict = overwrite ? `ON CONFLICT (id) DO UPDATE SET ${setClause}, deleted_at = NULL` : 'ON CONFLICT (id) DO NOTHING';
  const sql = `INSERT INTO ${table} (${names.join(', ')}) SELECT * FROM unnest(${spec.cols.map((c, i) => `$${i + 1}::${c.type}[]`).join(', ')}) ${conflict} RETURNING id`;
  const toParams = (part: any[][]) => spec.cols.map((_, ci) => part.map(r => r[ci]));
  const CHUNK = table === 'users' ? 500 : 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const part = rows.slice(i, i + CHUNK);
    try {
      const out = await db.query(sql, toParams(part));
      written += out.length;
      skipped += part.length - out.length;
    } catch {
      // Un lot refusé (ex. numéro de phrase en double) : ligne par ligne pour isoler le coupable
      for (const r of part) {
        try {
          const out = await db.query(sql, toParams([r]));
          written += out.length; skipped += 1 - out.length;
        } catch (e: any) {
          errors.push(`${table}/${r[0]} : ${String(e?.message || e).slice(0, 160)}`);
        }
      }
    }
  }
  return { written, skipped, errors };
}

const MIME_EXT: Record<string, string> = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/aac': 'm4a' };

function storagePathFromUrl(url: string): string | null {
  const m = /\/o\/([^?]+)/.exec(url);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
}

function parseDataUrl(u: string): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:([^;,]+)(?:;[^,]*)?;base64,(.*)$/s.exec(u);
  if (!m) return null;
  return { mime: m[1], bytes: Buffer.from(m[2], 'base64') };
}

export async function migrate(db: Db, storage: MediaStorage, src: Source, opts: MigrateOptions = {}): Promise<Report> {
  const log = opts.log || (() => {});
  const dry = !!opts.dryRun;
  const report: Report = {
    dryRun: dry, collections: {},
    media: { storageFiles: 0, copied: 0, alreadyThere: 0, base64Decoded: 0, missing: [], errors: [] },
    notes: [
      'Les XP et compteurs existants sont repris tels quels (anciennes règles : points à la soumission). Les nouvelles validations suivent les règles du serveur.',
      'Les contributions sans suivi de récompense (rewardedXp absent) valent 0 : une re-validation leur ferait gagner des points une fois.'
    ]
  };
  const wanted = (c: string) => !opts.only || opts.only.includes(c);

  // ---- 1. Fichiers Storage -> Garage (même chemin)
  const copied = new Set<string>();
  if (!opts.skipMedia && wanted('contributions')) {
    const paths = await src.listStoragePaths('recordings/');
    report.media.storageFiles = paths.length;
    for (const p of paths) {
      try {
        if (!dry && (await storage.exists(p))) { report.media.alreadyThere++; copied.add(p); continue; }
        if (dry) { copied.add(p); continue; }
        const f = await src.downloadStorage(p);
        await storage.put(p, f.body, f.contentType || 'audio/webm');
        report.media.copied++; copied.add(p);
      } catch (e: any) {
        report.media.errors.push(`${p} : ${String(e?.message || e).slice(0, 160)}`);
      }
    }
    log(`Storage : ${paths.length} fichier(s), ${report.media.copied} copié(s), ${report.media.alreadyThere} déjà présent(s)`);
  }

  // ---- 2. Collections
  const adminIds = new Set<string>();
  if (wanted('admins') || wanted('users')) {
    for (const { doc } of mergeSources(await src.listFirestore('admins'), (await src.listRtdb('admins')).map(d => normalizeRtdbValue(d)))) adminIds.add(doc.id);
  }

  for (const col of COLLECTIONS) {
    if (!wanted(col)) continue;
    const fsDocs = await src.listFirestore(col);
    const rtDocs = (await src.listRtdb(col)).map(d => normalizeRtdbValue(d));
    const merged = mergeSources(fsDocs, rtDocs);
    const rep: CollectionReport = { firestore: fsDocs.length, rtdb: rtDocs.length, merged: merged.length, written: 0, skippedExisting: 0, errors: [] };
    report.collections[col] = rep;

    let spec: TableSpec;
    let rows: any[][] = [];
    if (col === 'users') {
      spec = SPECS.users;
      rows = merged.map(({ doc }) => userRowValues(doc, adminIds.has(doc.id) || (doc.email || '').toLowerCase() === 'andymigoumbi@gmail.com' && doc.role === 'admin'));
    } else if (col === 'items') {
      spec = SPECS.items;
      rows = merged.map(({ doc }) => itemRowValues(doc));
    } else if (col === 'contributions') {
      spec = SPECS.contributions;
      for (const { doc, other } of merged) {
        let audioPath: string | null = strOrNull(doc.audioStoragePath) || strOrNull(other?.audioStoragePath);
        const url = strOrNull(doc.audioUrl) || strOrNull(other?.audioUrl) || strOrNull(doc.audioBase64) || strOrNull(other?.audioBase64);
        if (!audioPath && url && /^https?:/.test(url)) audioPath = storagePathFromUrl(url);
        if (!audioPath && url && url.startsWith('data:')) {
          const parsed = parseDataUrl(url);
          if (parsed) {
            const ext = MIME_EXT[parsed.mime.split(';')[0]] || 'webm';
            const path = `recordings/${doc.userId || 'inconnu'}/${String(doc.id).replace(/[^A-Za-z0-9_-]/g, '_')}_migre.${ext}`;
            try {
              if (!dry && !(await storage.exists(path))) await storage.put(path, parsed.bytes, parsed.mime);
              report.media.base64Decoded++;
              audioPath = path;
              if (!doc.audioMimeType) doc.audioMimeType = parsed.mime;
            } catch (e: any) {
              report.media.errors.push(`${doc.id} (base64) : ${String(e?.message || e).slice(0, 160)}`);
            }
          }
        }
        if (audioPath && !opts.skipMedia && !copied.has(audioPath) && !dry && !(await storage.exists(audioPath))) {
          report.media.missing.push(`${doc.id} -> ${audioPath}`);
          doc.audioMissingPath = audioPath; // trace conservée dans data
          audioPath = null;
        }
        rows.push(contributionRowValues(doc, audioPath));
      }
    } else {
      spec = GENERIC_SPEC;
      rows = merged.map(({ doc }) => genericRowValues(doc));
    }
    // Un document sans identifiant ne peut pas être migré
    rows = rows.filter(r => r[0]);
    if (col === 'contributions') rows = rows.filter(r => r[2]); // userId requis

    if (dry) {
      rep.written = rows.length;
    } else {
      const res = await upsertRows(db, col, spec, rows, !!opts.overwrite);
      rep.written = res.written; rep.skippedExisting = res.skipped; rep.errors = res.errors;
    }
    log(`${col} : Firestore ${rep.firestore}, RTDB ${rep.rtdb}, fusionnés ${rep.merged}, ${dry ? 'à écrire' : 'écrits'} ${rep.written}${rep.skippedExisting ? `, déjà présents ${rep.skippedExisting}` : ''}${rep.errors.length ? `, ${rep.errors.length} erreur(s)` : ''}`);
  }

  // ---- 3. Rôle admin cohérent avec la table admins
  if (!dry && adminIds.size) {
    await db.query(`UPDATE users SET role = 'admin' WHERE id = ANY($1::text[]) AND role <> 'admin'`, [[...adminIds]]);
  }

  // ---- 4. Comptes dans PostgreSQL (comparés à la fusion dans le rapport)
  if (!dry) {
    report.postgresCounts = {};
    for (const col of COLLECTIONS) {
      if (!wanted(col)) continue;
      const r = await db.query<{ n: string | number }>(`SELECT count(*) AS n FROM ${col} WHERE deleted_at IS NULL`);
      report.postgresCounts[col] = Number(r[0].n);
    }
  }
  return report;
}
