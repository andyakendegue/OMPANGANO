/** Conversion lignes SQL ↔ objets JSON de l'application (mêmes noms de champs que src/types). */
import type { UserProfile, Contribution } from '../../../src/types/index.ts';

export const GENERIC_TABLES = ['items', 'clans', 'villages', 'themes', 'badges', 'challenges', 'metrics', 'admins'] as const;
export type GenericTable = (typeof GENERIC_TABLES)[number];
export const SYNC_TABLES = [...GENERIC_TABLES, 'contributions', 'users'] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export const isGenericTable = (t: string): t is GenericTable => (GENERIC_TABLES as readonly string[]).includes(t);
export const isSyncTable = (t: string): t is SyncTable => (SYNC_TABLES as readonly string[]).includes(t);

export const iso = (d: Date | string | null | undefined): string | undefined =>
  d == null ? undefined : new Date(d).toISOString();

/** Clés de data gérées par le serveur : jamais acceptées telles quelles du navigateur. */
const SERVER_KEYS = ['id', 'updatedAt', 'deletedAt', '_cur'];
export function cleanData(body: Record<string, unknown>, extraDrop: readonly string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (SERVER_KEYS.includes(k) || extraDrop.includes(k) || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export function genericRow(r: any): Record<string, unknown> {
  return { createdAt: iso(r.created_at), ...(r.data || {}), id: r.id, updatedAt: iso(r.updated_at), ...(r.deleted_at ? { deletedAt: iso(r.deleted_at) } : {}) };
}

export function userRow(r: any): UserProfile & { deletedAt?: string } {
  const d = r.data || {};
  return {
    ...d,
    id: r.id,
    email: r.email ?? d.email,
    role: r.role,
    status: r.status,
    suspicionScore: r.suspicion_score,
    xp: r.xp,
    level: r.level,
    levelIndex: r.level_index,
    badges: r.badges || [],
    contributionsCount: r.contributions_count,
    recordingsCount: r.recordings_count,
    validationsCount: r.validations_count,
    weeklyProgress: r.weekly_progress || {},
    completedChallenges: r.completed_challenges || [],
    lastContributionDate: r.last_contribution_date ?? d.lastContributionDate,
    createdAt: d.createdAt || iso(r.created_at),
    updatedAt: iso(r.updated_at),
    ...(r.deleted_at ? { deletedAt: iso(r.deleted_at) } : {})
  } as UserProfile & { deletedAt?: string };
}

export function contributionRow(r: any): Contribution & { deletedAt?: string } {
  const d = r.data || {};
  const out: Record<string, unknown> = {
    ...d,
    id: r.id,
    itemId: r.item_id ?? d.itemId,
    userId: r.user_id,
    status: r.status,
    rewardedXp: r.rewarded_xp,
    rewardedContribution: r.rewarded_contribution,
    rewardedRecording: r.rewarded_recording,
    countedChallengeIds: r.counted_challenge_ids || [],
    createdAt: d.createdAt || iso(r.created_at),
    updatedAt: iso(r.updated_at)
  };
  if (r.audio_storage_path) {
    out.audioStoragePath = r.audio_storage_path;
    out.audioUrl = `media:${r.audio_storage_path}`; // marqueur « a un enregistrement » ; l'URL réelle vient de GET /v1/media/url
  }
  if (r.audio_mime_type) out.audioMimeType = r.audio_mime_type;
  if (r.validator_id) out.validatorId = r.validator_id;
  if (r.deleted_at) out.deletedAt = iso(r.deleted_at);
  return out as unknown as Contribution & { deletedAt?: string };
}

export function serializeRow(table: SyncTable, r: any) {
  if (table === 'users') return userRow(r);
  if (table === 'contributions') return contributionRow(r);
  return genericRow(r);
}

/** Sélection avec curseur de synchro à la microseconde (le JSON ISO de JS s'arrête à la milliseconde). */
export const CURSOR_SQL = `to_char(t.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
