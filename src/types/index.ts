export type UserRole = 'user' | 'validator' | 'admin';

export type TribeName = 'Mpongwè' | 'Adyumba' | 'Enenga' | 'Nkomi' | 'Galoa' | 'Ôrungu';

export type AccountStatus = 'active' | 'flagged' | 'suspended';

export interface UserProfile {
  id: string;
  displayName: string;
  fullName: string;
  contact: string;
  birthDate: string;
  birthPlace: string;
  tribe: TribeName;
  paternalClan: string;
  maternalClan: string;
  villageOfOrigin: string;
  registrationCompleted: boolean;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  role: UserRole;
  status: AccountStatus;
  suspicionScore: number;
  xp: number;
  level: string;
  levelIndex: number;
  contributionsCount: number;
  recordingsCount: number;
  validationsCount: number;
  streakDays: number;
  lastContributionDate?: string;
  lastActiveAt?: string;
  badges: string[];
  weeklyProgress?: Record<string, number>; // challengeId -> currentCount
  completedChallenges?: string[]; // IDs of finished challenges
  // Conditions de la plateforme & Consentement d'utilisation des données (Contrat AMPANGANO / NKALA - Annexe 1)
  termsAccepted?: boolean;
  dataUsageAccepted?: boolean;
  consentVoiceUsage?: boolean;
  consentImageUsage?: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
  partnerAssociation?: string;
  electronicSignature?: string;
  legalGuardianName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClanRegistry {
  id: string;
  name: string;
  tribe: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
}

export interface VillageRegistry {
  id: string;
  name: string;
  clan: string; // Clan de rattachement
  clanId?: string;
  tribe: string; // Tribu de rattachement
  region?: string;
  createdBy?: string;
  createdAt: string;
}

export type DialectGroup = 'enenga' | 'mpongwe' | 'galwa' | 'nkomi' | 'orungu' | 'adyumba';

export type PresetThematicCategory =
  | 'peche_navigation'
  | 'chasse_faune_nature'
  | 'clans_histoire_rites'
  | 'cuisine_agriculture'
  | 'vie_quotidienne_famille'
  | 'oralite_proverbes_sagesse'
  | 'numeration_mesures'
  | 'artisanat_outils';

export type ThematicCategory = PresetThematicCategory | string;

export interface ThemeDefinition {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  keywords: string[];
  color: string;
  isCustom?: boolean;
  createdBy?: string;
  createdAt?: string;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  theme: string;
  targetCount: number;
  challengeType: 'contributions' | 'recordings' | 'validations' | 'all';
  xpReward: number;
  badgeRewardId: string;
  badgeRewardName: string;
  badgeRewardIcon: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface QuestionnaireItem {
  id: string;
  frenchText: string;
  myeneText: string;
  dialect: DialectGroup | string;
  clan?: string;
  clans?: string[];
  category: string;
  theme?: ThematicCategory | string;
  moduleThematique?: string;
  phoneticApi?: string;
  grammaticalTarget?: string;
  durationSec?: number;
  contextNotes: string;
  imageUrl: string;
  difficulty: 'debutant' | 'intermediaire' | 'avance';
  status: 'active' | 'archived';
  contributionsCount: number;
  recordingsCount: number;
  sampleAudioUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type ContributionStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'needs_revision'
  | 'audio_approved_text_revision' 
  | 'text_approved_audio_revision';

export type FrenchMeaningNuanceType =
  | 'exact'
  | 'correction_sens'
  | 'autre_tournure'
  | 'sens_secondaire';

export interface Contribution {
  id: string;
  itemId: string;
  userId: string;
  userDisplayName: string;
  userTribe?: string;
  userPaternalClan?: string;
  userMaternalClan?: string;
  userPhotoURL?: string;
  frenchText: string;
  originalMyeneText: string;
  isSpellingCorrect: boolean;
  isPronunciationCorrect?: boolean;
  proposedSpelling?: string;
  isFrenchMeaningExact?: boolean;
  frenchMeaningType?: FrenchMeaningNuanceType;
  proposedFrenchMeaning?: string;
  secondaryMeaning?: string;
  dialectVariant?: string;
  comment?: string;
  audioUrl?: string;
  audioStoragePath?: string;
  audioDuration?: number;
  status: ContributionStatus;
  spellingVerdict?: 'correct' | 'incorrect' | 'pending';
  pronunciationVerdict?: 'correct' | 'incorrect' | 'pending' | 'no_audio';
  validatorId?: string;
  validatorDisplayName?: string;
  validatorNotes?: string;
  validatedAt?: string;
  offlineQueued?: boolean;
  createdAt: string;
}

export interface Badge {
  id: string;
  title: string; // Dénomination dynamique du badge (ex: 'Sentinelle des Racines', 'Maître des Eaux & Pêche')
  description: string;
  icon: string;
  requiredXp?: number;
  requiredContributions?: number;
  requiredRecordings?: number;
  requiredValidations?: number;
  category: 'audio' | 'orthographe' | 'fidelite' | 'expert' | 'genealogie' | 'defi' | string;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemMetric {
  id: string;
  totalItems: number;
  totalContributions: number;
  totalRecordings: number;
  totalValidated: number;
  totalUsers: number;
  lastUpdated: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'reminder' | 'reward' | 'validation' | 'system' | 'security';
  read: boolean;
  createdAt: string;
}

export interface OfflineSubmission {
  id: string;
  itemId: string;
  frenchText: string;
  originalMyeneText: string;
  isSpellingCorrect: boolean;
  proposedSpelling?: string;
  isFrenchMeaningExact?: boolean;
  frenchMeaningType?: FrenchMeaningNuanceType;
  proposedFrenchMeaning?: string;
  secondaryMeaning?: string;
  dialectVariant?: string;
  comment?: string;
  audioBlob?: Blob;
  audioDataUrl?: string;
  audioDuration?: number;
  timestamp: number;
}

export interface OfflinePackStatus {
  isDownloaded: boolean;
  itemCount: number;
  downloadProgress: number;
  downloadDate?: string;
}

export interface SeedStatus {
  isSeeded: boolean;
  seededAt: string;
  seededBy: string;
  seededByName: string;
  itemsCount: number;
  clansCount: number;
  villagesCount: number;
  themesCount?: number;
  badgesCount?: number;
  version?: string;
}
