/**
 * Sécurité des profils et calcul des récompenses OMPANGANO.
 *
 * Principes :
 *  - Un contributeur ne modifie JAMAIS lui-même son rôle, son statut, ses XP,
 *    ses badges ou ses compteurs. Ces champs sont « protégés » : seuls les
 *    validateurs (récompenses) et les administrateurs (tout) les écrivent.
 *    Les règles Firestore / RTDB appliquent la même liste.
 *  - Les XP sont attribués au moment de la VALIDATION, pas de la soumission.
 *    Chaque contribution garde la trace de ce qu'elle a déjà rapporté
 *    (rewardedXp…), ce qui permet de corriger (ou retirer) sans double comptage.
 */
import type { Badge, Contribution, ContributionStatus, QuestionnaireItem, UserProfile, UserRole, WeeklyChallenge } from '../types';
import { getLevelForXp } from './seedData';

/** Champs du profil que le propriétaire ne peut pas modifier. Doit rester identique aux règles. */
export const PROTECTED_USER_FIELDS = [
  'role',
  'status',
  'suspicionScore',
  'xp',
  'level',
  'levelIndex',
  'badges',
  'contributionsCount',
  'recordingsCount',
  'validationsCount',
  'weeklyProgress',
  'completedChallenges'
] as const;

/** Champs protégés qu'un validateur peut mettre à jour sur SON propre profil. */
const STAFF_SELF_EDITABLE = new Set<string>(['validationsCount', 'badges']);

/** Valeurs initiales des champs protégés à la création d'un compte (vérifiées par les règles). */
export const NEW_USER_PROTECTED_DEFAULTS = {
  role: 'user' as UserRole,
  status: 'active' as const,
  suspicionScore: 0,
  xp: 0,
  level: 'Initié Curieux',
  levelIndex: 1,
  badges: [] as string[],
  contributionsCount: 0,
  recordingsCount: 0,
  validationsCount: 0
};

export function isStaffRole(role?: string | null): boolean {
  return role === 'admin' || role === 'validator';
}

/**
 * Retire du profil les champs que l'auteur de l'écriture n'a pas le droit de modifier.
 * - admin : rien n'est retiré
 * - validateur sur son propre profil : peut écrire validationsCount et badges
 * - contributeur : aucun champ protégé
 */
export function stripProtectedUserFields<T extends Partial<UserProfile>>(profile: T, actorRole?: string | null): Partial<T> {
  if (actorRole === 'admin') return { ...profile };
  const out: Record<string, unknown> = { ...profile };
  for (const key of PROTECTED_USER_FIELDS) {
    if (actorRole === 'validator' && STAFF_SELF_EDITABLE.has(key)) continue;
    delete out[key];
  }
  return out as Partial<T>;
}

/** Entrée publique du classement : uniquement ce qui peut être montré à tous. */
export interface LeaderboardEntry {
  id: string;
  displayName: string;
  fullName: string;
  photoURL?: string;
  tribe?: string;
  villageOfOrigin?: string;
  xp: number;
  level: string;
  levelIndex: number;
  contributionsCount: number;
  recordingsCount: number;
  validationsCount: number;
  badgesCount: number;
  updatedAt: string;
}

export function buildLeaderboardEntry(p: UserProfile): LeaderboardEntry {
  return {
    id: p.id,
    displayName: p.displayName || '',
    fullName: p.fullName || p.displayName || '',
    photoURL: p.photoURL || '',
    tribe: p.tribe || '',
    villageOfOrigin: p.villageOfOrigin || '',
    xp: p.xp || 0,
    level: p.level || getLevelForXp(p.xp || 0).name,
    levelIndex: p.levelIndex || getLevelForXp(p.xp || 0).index,
    contributionsCount: p.contributionsCount || 0,
    recordingsCount: p.recordingsCount || 0,
    validationsCount: p.validationsCount || 0,
    badgesCount: (p.badges || []).length,
    updatedAt: new Date().toISOString()
  };
}

/** Convertit une entrée du classement en profil minimal pour l'affichage (classement, explorateur). */
export function leaderboardEntryToProfile(e: LeaderboardEntry): UserProfile {
  return {
    id: e.id,
    displayName: e.displayName,
    fullName: e.fullName,
    photoURL: e.photoURL,
    tribe: (e.tribe || 'Ôrungu') as UserProfile['tribe'],
    villageOfOrigin: e.villageOfOrigin || '',
    xp: e.xp || 0,
    level: e.level,
    levelIndex: e.levelIndex,
    contributionsCount: e.contributionsCount || 0,
    recordingsCount: e.recordingsCount || 0,
    validationsCount: e.validationsCount || 0,
    badges: [],
    contact: '',
    birthDate: '',
    birthPlace: '',
    paternalClan: '',
    maternalClan: '',
    registrationCompleted: true,
    role: 'user',
    status: 'active',
    suspicionScore: 0,
    streakDays: 0,
    createdAt: '',
    updatedAt: e.updatedAt
  };
}

// ---------------------------------------------------------------------------
// Récompenses
// ---------------------------------------------------------------------------

export const XP_AUDIO = 120;
export const XP_TEXT = 50;
export const XP_AUDIO_PART = 70;
export const XP_NUANCE_BONUS = 20;

export interface RewardTarget {
  xp: number;
  contribution: 0 | 1;
  recording: 0 | 1;
}

/** Ce qu'une contribution doit rapporter pour un statut de validation donné. */
export function rewardForStatus(c: Contribution, status: ContributionStatus): RewardTarget {
  const hasAudio = !!(c.audioUrl || c.audioStoragePath);
  const hasNuance = !!((c.proposedFrenchMeaning || '').trim() || (c.secondaryMeaning || '').trim());
  const nuance = hasNuance ? XP_NUANCE_BONUS : 0;
  switch (status) {
    case 'approved':
      return { xp: (hasAudio ? XP_AUDIO : XP_TEXT) + nuance, contribution: 1, recording: hasAudio ? 1 : 0 };
    case 'audio_approved_text_revision':
      return { xp: hasAudio ? XP_AUDIO_PART : 0, contribution: hasAudio ? 1 : 0, recording: hasAudio ? 1 : 0 };
    case 'text_approved_audio_revision':
      return { xp: XP_TEXT + nuance, contribution: 1, recording: 0 };
    default:
      return { xp: 0, contribution: 0, recording: 0 };
  }
}

/** Un défi est-il en cours (actif et dans ses dates, si elles sont renseignées) ? */
export function isChallengeRunning(ch: WeeklyChallenge, now: Date = new Date()): boolean {
  if (!ch.isActive) return false;
  const start = ch.startDate ? Date.parse(ch.startDate) : NaN;
  const end = ch.endDate ? Date.parse(ch.endDate) : NaN;
  if (!Number.isNaN(start) && now.getTime() < start) return false;
  if (!Number.isNaN(end) && now.getTime() > end) return false;
  return true;
}

function challengeMatches(ch: WeeklyChallenge, c: Contribution, item?: QuestionnaireItem): boolean {
  const itemTheme = item?.category || item?.theme;
  const themeOk = ch.theme === 'all' || (!!itemTheme && itemTheme === ch.theme);
  const hasAudio = !!(c.audioUrl || c.audioStoragePath);
  const typeOk =
    ch.challengeType === 'all' ||
    ch.challengeType === 'contributions' ||
    (ch.challengeType === 'recordings' && hasAudio);
  return themeOk && typeOk;
}

export interface RewardComputation {
  /** Champs protégés à écrire sur le profil du contributeur (null = rien à changer). */
  userPatch: Partial<UserProfile> | null;
  /** Champs de suivi à écrire sur la contribution. */
  contributionPatch: Partial<Contribution>;
  /** Défis terminés grâce à cette validation. */
  completedChallenges: WeeklyChallenge[];
}

/**
 * Calcule l'écart entre ce que la contribution a déjà rapporté et ce qu'elle doit
 * rapporter avec le nouveau statut, puis le profil mis à jour du contributeur.
 */
export function computeValidationReward(params: {
  contributor: UserProfile;
  contribution: Contribution;
  newStatus: ContributionStatus;
  item?: QuestionnaireItem;
  challenges: WeeklyChallenge[];
  badges: Badge[];
}): RewardComputation {
  const { contributor, contribution: c, newStatus, item, challenges, badges } = params;
  const target = rewardForStatus(c, newStatus);
  const prevXp = c.rewardedXp || 0;
  const prevContrib = (c.rewardedContribution || 0) as 0 | 1;
  const prevRec = (c.rewardedRecording || 0) as 0 | 1;

  const dXp = target.xp - prevXp;
  const dContrib = target.contribution - prevContrib;
  const dRec = target.recording - prevRec;

  const contributionPatch: Partial<Contribution> = {
    rewardedXp: target.xp,
    rewardedContribution: target.contribution,
    rewardedRecording: target.recording
  };

  if (dXp === 0 && dContrib === 0 && dRec === 0) {
    return { userPatch: null, contributionPatch, completedChallenges: [] };
  }

  let xp = Math.max(0, (contributor.xp || 0) + dXp);
  const contributionsCount = Math.max(0, (contributor.contributionsCount || 0) + dContrib);
  const recordingsCount = Math.max(0, (contributor.recordingsCount || 0) + dRec);
  const weeklyProgress: Record<string, number> = { ...(contributor.weeklyProgress || {}) };
  const completed = new Set(contributor.completedChallenges || []);
  const badgeSet = new Set(contributor.badges || []);
  const newlyCompleted: WeeklyChallenge[] = [];

  // Défis : une contribution compte au plus une fois par défi (suivi dans countedChallengeIds)
  const counted = new Set(c.countedChallengeIds || []);
  if (dContrib !== 0) {
    for (const ch of challenges) {
      if (dContrib > 0) {
        if (counted.has(ch.id) || !isChallengeRunning(ch) || !challengeMatches(ch, c, item)) continue;
        counted.add(ch.id);
        const next = (weeklyProgress[ch.id] || 0) + 1;
        weeklyProgress[ch.id] = next;
        if (next >= ch.targetCount && !completed.has(ch.id)) {
          completed.add(ch.id);
          if (ch.badgeRewardId) badgeSet.add(ch.badgeRewardId);
          xp += ch.xpReward || 0;
          newlyCompleted.push(ch);
        }
      } else if (counted.has(ch.id)) {
        // Contribution invalidée : on retire sa progression (le défi déjà gagné reste acquis)
        counted.delete(ch.id);
        weeklyProgress[ch.id] = Math.max(0, (weeklyProgress[ch.id] || 0) - 1);
      }
    }
  }
  contributionPatch.countedChallengeIds = Array.from(counted);

  // Badges à seuil (XP, contributions, enregistrements) : attribués quand le seuil est atteint
  for (const b of badges) {
    const hasThreshold = !!(b.requiredXp || b.requiredContributions || b.requiredRecordings);
    if (!hasThreshold || b.requiredValidations) continue;
    const ok =
      (!b.requiredXp || xp >= b.requiredXp) &&
      (!b.requiredContributions || contributionsCount >= b.requiredContributions) &&
      (!b.requiredRecordings || recordingsCount >= b.requiredRecordings);
    if (ok) badgeSet.add(b.id);
  }

  const lvl = getLevelForXp(xp);
  const userPatch: Partial<UserProfile> = {
    xp,
    level: lvl.name,
    levelIndex: lvl.index,
    contributionsCount,
    recordingsCount,
    weeklyProgress,
    completedChallenges: Array.from(completed),
    badges: Array.from(badgeSet),
    lastContributionDate: c.createdAt,
    updatedAt: new Date().toISOString()
  };

  return { userPatch, contributionPatch, completedChallenges: newlyCompleted };
}

/** Badges de validation (ex. « 5 validations ») pour le validateur lui-même. */
export function validationBadgesFor(validationsCount: number, currentBadges: string[], badges: Badge[]): string[] {
  const set = new Set(currentBadges);
  for (const b of badges) {
    if (b.requiredValidations && validationsCount >= b.requiredValidations) set.add(b.id);
  }
  if (validationsCount >= 5) set.add('badge-cinq-validations');
  return Array.from(set);
}
