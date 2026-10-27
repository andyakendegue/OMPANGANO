import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  db, 
  auth, 
  storage, 
  testFirestoreConnection, 
  handleFirestoreError, 
  OperationType,
  dualSaveRecord,
  dualBatchSaveRecords,
  dualDeleteRecord,
  ensureFirebaseAuthSession,
  convertBlobToBase64,
  replayPendingOfflineAdminMutations,
  getOfflineAdminMutations,
  checkIsAdminEmail,
  isRealtimeDatabaseEmpty,
  smartFetchCollection,
  smartGetUserProfile,
  subscribeToCatalogSignals
} from './firebase';
import { 
  QuestionnaireItem, 
  Contribution, 
  ContributionStatus,
  UserProfile, 
  SystemMetric,
  OfflineSubmission,
  ClanRegistry,
  VillageRegistry,
  WeeklyChallenge,
  ThemeDefinition,
  Badge,
  UserRole,
  SeedStatus
} from './types';
import { 
  INITIAL_ENENGA_ITEMS, 
  SYSTEM_BADGES, 
  USER_LEVELS, 
  INITIAL_CLANS, 
  INITIAL_VILLAGES, 
  INITIAL_WEEKLY_CHALLENGES,
  THEMATIC_CATEGORIES,
  getLevelForXp,
  deduplicateParsedCsvItems,
  deduplicateParsedCsvClans,
  deduplicateParsedCsvVillages,
  mergeOfficialClans,
  cleanObsoleteSeedVillages,
  sanitizeAndDeduplicateItems,
  auditAndSanitizeDatabaseState,
  DEMO_MOCK_USER_IDS,
  MYENE_TRIBES,
  mapDialectToTribeName
} from './services/seedData';
import { 
  getPendingOfflineContributions, 
  saveOfflineContribution, 
  removeOfflineContribution, 
  cacheItemsLocally, 
  getCachedItemsLocally,
  cacheClansLocally,
  getCachedClansLocally,
  cacheVillagesLocally,
  getCachedVillagesLocally,
  cacheContributionsLocally,
  getCachedContributionsLocally,
  cacheChallengesLocally,
  getCachedChallengesLocally,
  cacheThemesLocally,
  getCachedThemesLocally,
  cacheBadgesLocally,
  getCachedBadgesLocally,
  cacheUsersLocally,
  getCachedUsersLocally
} from './services/offlineStorage';
import { NotificationService } from './services/notificationService';

import { Navbar } from './components/Navbar';
import { BottomNav, AppTab } from './components/BottomNav';
import { CrowdsourceCard } from './components/CrowdsourceCard';
import { VocabularyExplorer } from './components/VocabularyExplorer';
import { LeaderboardAndRewards } from './components/LeaderboardAndRewards';
import { ValidatorWorkspace } from './components/ValidatorWorkspace';
import { AdminDashboard } from './components/AdminDashboard';
import { UserProfileView } from './components/UserProfileView';
import { AuthModal } from './components/AuthModal';
import { AuthGateScreen } from './components/AuthGateScreen';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { OnboardingModal } from './components/OnboardingModal';
import { OfflinePackModal } from './components/OfflinePackModal';
import { ChallengeCelebrationModal } from './components/ChallengeCelebrationModal';
import { AppUpdateBanner } from './components/AppUpdateBanner';
import { TermsConsentModal, TermsConsentPayload } from './components/TermsConsentModal';
import { VisualGuideModal, VISUAL_GUIDE_SEEN_KEY } from './components/VisualGuideModal';
import { ContributionFaqSection } from './components/ContributionFaqSection';

const DELETED_RECORDS_STORAGE_KEY = 'nkala_deleted_records_v1';
const FAVORITE_VOCAB_STORAGE_KEY = 'nkala_favorite_vocab_ids_v1';

function getSavedFavoriteIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITE_VOCAB_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function saveFavoriteIdsToStorage(ids: string[]): void {
  try {
    localStorage.setItem(FAVORITE_VOCAB_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

function getDeletedIds(collectionName: string): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_RECORDS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed[collectionName]) ? parsed[collectionName] : []);
  } catch {
    return new Set();
  }
}

function markIdAsDeleted(collectionName: string, id: string): void {
  try {
    const raw = localStorage.getItem(DELETED_RECORDS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const current: string[] = Array.isArray(parsed[collectionName]) ? parsed[collectionName] : [];
    if (!current.includes(id)) {
      parsed[collectionName] = [...current, id];
      localStorage.setItem(DELETED_RECORDS_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch {}
}

function unmarkIdAsDeleted(collectionName: string, id: string): void {
  try {
    const raw = localStorage.getItem(DELETED_RECORDS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const current: string[] = Array.isArray(parsed[collectionName]) ? parsed[collectionName] : [];
    if (current.includes(id)) {
      parsed[collectionName] = current.filter(x => x !== id);
      localStorage.setItem(DELETED_RECORDS_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch {}
}

function clearAllDeletedIds(): void {
  try {
    localStorage.removeItem(DELETED_RECORDS_STORAGE_KEY);
  } catch {}
}

function isDatabaseMarkedSeeded(): boolean {
  try {
    return localStorage.getItem('nkala_db_seeded') === 'true';
  } catch {
    return false;
  }
}

function markDatabaseSeeded(): void {
  try {
    localStorage.setItem('nkala_db_seeded', 'true');
  } catch {}
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>('crowdsource');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Data states (filtered against any locally deleted IDs and hydrated from local offline cache)
  const [items, setItems] = useState<QuestionnaireItem[]>(() =>
    INITIAL_ENENGA_ITEMS.filter(i => !getDeletedIds('items').has(i.id))
  );
  const [currentItemIndex, setCurrentItemIndex] = useState<number>(0);
  const [contributions, setContributions] = useState<Contribution[]>(() => {
    const cached = getCachedContributionsLocally();
    const deleted = getDeletedIds('contributions');
    return cached.filter(c => !deleted.has(c.id));
  });
  const [clans, setClans] = useState<ClanRegistry[]>(() =>
    INITIAL_CLANS.filter(c => !getDeletedIds('clans').has(c.id))
  );
  const [villages, setVillages] = useState<VillageRegistry[]>(() =>
    INITIAL_VILLAGES.filter(v => !getDeletedIds('villages').has(v.id))
  );

  // Weekly Challenges states
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>(() => {
    const cached = getCachedChallengesLocally();
    const deleted = getDeletedIds('challenges');
    const source = cached.length > 0 ? cached : INITIAL_WEEKLY_CHALLENGES;
    return source.filter(c => !deleted.has(c.id));
  });
  const [activeChallengeId, setActiveChallengeId] = useState<string>('defi-peche-semaine');
  const [isChallengeFilterActive, setIsChallengeFilterActive] = useState<boolean>(false);
  const [selectedQuestionTribe, setSelectedQuestionTribe] = useState<string>('all');
  const [celebrationChallenge, setCelebrationChallenge] = useState<WeeklyChallenge | null>(null);

  // Dynamic Themes & Dynamic Badges states
  const [themes, setThemes] = useState<ThemeDefinition[]>(() => {
    const cached = getCachedThemesLocally();
    const deleted = getDeletedIds('themes');
    const source = cached.length > 0 ? cached : THEMATIC_CATEGORIES;
    return source.filter(t => !deleted.has(t.id));
  });
  const [badges, setBadges] = useState<Badge[]>(() => {
    const cached = getCachedBadgesLocally();
    const deleted = getDeletedIds('badges');
    const source = cached.length > 0 ? cached : SYSTEM_BADGES;
    return source.filter(b => !deleted.has(b.id));
  });

  // Favorite vocabulary item IDs (persisted in localStorage & user profile for offline + online access)
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>(() => getSavedFavoriteIds());

  const [systemMetrics, setSystemMetrics] = useState<SystemMetric>({
    id: 'summary',
    totalItems: INITIAL_ENENGA_ITEMS.length,
    totalContributions: 24,
    totalRecordings: 18,
    totalValidated: 16,
    totalUsers: 8,
    lastUpdated: new Date().toISOString()
  });

  // Offline queue state
  const [pendingOfflineSubmissions, setPendingOfflineSubmissions] = useState<OfflineSubmission[]>([]);
  const [pendingAdminMutationsCount, setPendingAdminMutationsCount] = useState<number>(() =>
    getOfflineAdminMutations().length
  );

  // Seed status state (tracking official Firebase seed marker /metrics/seed_status)
  const [seedStatus, setSeedStatus] = useState<SeedStatus | null>(null);
  const [isSeedingDatabase, setIsSeedingDatabase] = useState<boolean>(false);

  // Auth & user state: null by default (unauthenticated users must log in on AuthGateScreen)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const currentUserRef = useRef<UserProfile | null>(null);
  const isSyncingOfflineRef = useRef<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isFirebaseAuthReady, setIsFirebaseAuthReady] = useState<boolean>(false);

  // Registered users for admin management and fraud detection (no fake demo users polluting the database)
  const [usersList, setUsersList] = useState<UserProfile[]>([
    {
      id: 'admin-andy',
      displayName: 'Andy AKENDENGUE',
      fullName: 'Andy AKENDENGUE',
      contact: 'andymigoumbi@gmail.com',
      email: 'andymigoumbi@gmail.com',
      birthDate: '1986-09-14',
      birthPlace: 'Libreville',
      tribe: 'Ôrungu',
      paternalClan: 'Ajena',
      maternalClan: 'Agenje',
      villageOfOrigin: 'Non précisé',
      registrationCompleted: true,
      role: 'admin',
      status: 'active',
      suspicionScore: 0,
      xp: 2850,
      level: 'Sage Ancien',
      levelIndex: 5,
      contributionsCount: 28,
      recordingsCount: 22,
      validationsCount: 19,
      streakDays: 7,
      badges: ['badge-genealogie-verifiee', 'badge-premiere-voix', 'badge-dix-traductions', 'badge-cinq-validations', 'badge-maitre-verbe'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  ]);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isTermsConsentModalOpen, setIsTermsConsentModalOpen] = useState(false);
  const [isVisualGuideOpen, setIsVisualGuideOpen] = useState(false);
  const [isPostOnboardingGuide, setIsPostOnboardingGuide] = useState(false);
  const [isOfflinePackModalOpen, setIsOfflinePackModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(1);
  const hasShownTermsReminderRef = useRef<string | null>(null);

  const refreshPendingMutationsCount = () => {
    setPendingAdminMutationsCount(getOfflineAdminMutations().length);
  };

  // Keep currentUserRef synchronized at all times
  useEffect(() => {
    currentUserRef.current = currentUser;
    if (currentUser?.favoriteItemIds && Array.isArray(currentUser.favoriteItemIds)) {
      setFavoriteItemIds(prev => {
        const merged = Array.from(new Set([...prev, ...(currentUser.favoriteItemIds || [])]));
        saveFavoriteIdsToStorage(merged);
        return merged;
      });
    }
  }, [currentUser]);

  // Unified helper to update currentUser in state + ref + localStorage + optional cloud/offline-queue write
  const updateAndPersistCurrentUser = async (
    updater: UserProfile | ((prev: UserProfile) => UserProfile),
    syncToCloud: boolean = true
  ): Promise<UserProfile | null> => {
    const base = currentUserRef.current || currentUser;
    if (!base && typeof updater === 'function') return null;
    const nextProfile = typeof updater === 'function' ? updater(base!) : updater;
    currentUserRef.current = nextProfile;
    setCurrentUser(nextProfile);

    try {
      localStorage.setItem('nkala_authenticated_user', JSON.stringify(nextProfile));
    } catch {}

    setUsersList(prev => {
      const idx = prev.findIndex(u => u.id === nextProfile.id);
      const updatedList = idx >= 0
        ? prev.map((u, i) => (i === idx ? nextProfile : u))
        : [nextProfile, ...prev];
      cacheUsersLocally(updatedList);
      return updatedList;
    });

    if (syncToCloud && nextProfile.id) {
      await dualSaveRecord('users', nextProfile.id, nextProfile);
      refreshPendingMutationsCount();
    }
    return nextProfile;
  };

  // Merge local cached user profile with cloud profile so offline XP, badges, terms, onboarding, or favorites are NEVER lost
  const mergeLocalAndCloudUserProfile = (
    localProf: UserProfile | null,
    cloudProf: UserProfile,
    isSuperAdmin: boolean
  ): { merged: UserProfile; needsCloudPush: boolean } => {
    if (!localProf || localProf.id !== cloudProf.id) {
      const role = isSuperAdmin ? 'admin' : cloudProf.role;
      return {
        merged: { ...cloudProf, role },
        needsCloudPush: isSuperAdmin && cloudProf.role !== 'admin'
      };
    }

    const mergedXp = Math.max(localProf.xp || 0, cloudProf.xp || 0);
    const lvl = getLevelForXp(mergedXp);
    const mergedContribs = Math.max(localProf.contributionsCount || 0, cloudProf.contributionsCount || 0);
    const mergedRecordings = Math.max(localProf.recordingsCount || 0, cloudProf.recordingsCount || 0);
    const mergedValidations = Math.max(localProf.validationsCount || 0, cloudProf.validationsCount || 0);
    const mergedStreak = Math.max(localProf.streakDays || 0, cloudProf.streakDays || 0);
    const mergedBadges = Array.from(new Set([...(cloudProf.badges || []), ...(localProf.badges || [])]));
    const mergedCompletedChallenges = Array.from(
      new Set([...(cloudProf.completedChallenges || []), ...(localProf.completedChallenges || [])])
    );
    const mergedFavorites = Array.from(
      new Set([...getSavedFavoriteIds(), ...(cloudProf.favoriteItemIds || []), ...(localProf.favoriteItemIds || [])])
    );

    const mergedWeeklyProgress: Record<string, number> = { ...(cloudProf.weeklyProgress || {}) };
    if (localProf.weeklyProgress) {
      for (const [k, v] of Object.entries(localProf.weeklyProgress)) {
        mergedWeeklyProgress[k] = Math.max(mergedWeeklyProgress[k] || 0, v || 0);
      }
    }

    const localNewer = (localProf.updatedAt || '') > (cloudProf.updatedAt || '');
    const IdentitySource = localNewer ? localProf : cloudProf;

    const merged: UserProfile = {
      ...cloudProf,
      ...IdentitySource,
      id: cloudProf.id,
      role: isSuperAdmin ? 'admin' : (localNewer ? localProf.role : cloudProf.role),
      registrationCompleted: !!(cloudProf.registrationCompleted || localProf.registrationCompleted),
      termsAccepted: !!(cloudProf.termsAccepted || localProf.termsAccepted),
      dataUsageAccepted: !!(cloudProf.dataUsageAccepted || localProf.dataUsageAccepted),
      consentVoiceUsage: localProf.consentVoiceUsage ?? cloudProf.consentVoiceUsage,
      consentImageUsage: localProf.consentImageUsage ?? cloudProf.consentImageUsage,
      termsAcceptedAt: localProf.termsAcceptedAt || cloudProf.termsAcceptedAt,
      termsVersion: localProf.termsVersion || cloudProf.termsVersion,
      electronicSignature: localProf.electronicSignature || cloudProf.electronicSignature,
      xp: mergedXp,
      level: lvl.name,
      levelIndex: lvl.index,
      contributionsCount: mergedContribs,
      recordingsCount: mergedRecordings,
      validationsCount: mergedValidations,
      streakDays: mergedStreak,
      badges: mergedBadges,
      weeklyProgress: mergedWeeklyProgress,
      completedChallenges: mergedCompletedChallenges,
      favoriteItemIds: mergedFavorites,
      updatedAt: localNewer ? localProf.updatedAt : cloudProf.updatedAt
    };

    const needsCloudPush =
      localNewer ||
      mergedXp > (cloudProf.xp || 0) ||
      mergedContribs > (cloudProf.contributionsCount || 0) ||
      mergedValidations > (cloudProf.validationsCount || 0) ||
      (merged.registrationCompleted && !cloudProf.registrationCompleted) ||
      (merged.termsAccepted && !cloudProf.termsAccepted) ||
      mergedFavorites.length > (cloudProf.favoriteItemIds?.length || 0) ||
      (isSuperAdmin && cloudProf.role !== 'admin');

    return { merged, needsCloudPush };
  };

  // Toggle favorite vocabulary item (works 100% offline and syncs to user profile online)
  const handleToggleFavoriteItem = async (itemId: string) => {
    if (!itemId) return;
    let nextFavorites: string[] = [];
    setFavoriteItemIds(prev => {
      const exists = prev.includes(itemId);
      nextFavorites = exists ? prev.filter(id => id !== itemId) : [itemId, ...prev];
      saveFavoriteIdsToStorage(nextFavorites);
      return nextFavorites;
    });

    if (currentUserRef.current) {
      await updateAndPersistCurrentUser(prev => ({
        ...prev,
        favoriteItemIds: nextFavorites,
        updatedAt: new Date().toISOString()
      }));
    }
  };

  // Automatic reminder for already-registered users who have not yet accepted Platform Terms & Data Usage Consent (Annexe 1)
  useEffect(() => {
    if (
      currentUser &&
      currentUser.registrationCompleted &&
      (!currentUser.termsAccepted || !currentUser.dataUsageAccepted) &&
      !isOnboardingModalOpen &&
      hasShownTermsReminderRef.current !== currentUser.id
    ) {
      hasShownTermsReminderRef.current = currentUser.id;
      setIsTermsConsentModalOpen(true);
    }
  }, [
    currentUser?.id,
    currentUser?.registrationCompleted,
    currentUser?.termsAccepted,
    currentUser?.dataUsageAccepted,
    isOnboardingModalOpen
  ]);

  // Monitor online/offline events & initial offline hydration
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await syncPendingOfflineData();
    };
    const handleOffline = () => {
      setIsOnline(false);
      refreshPendingMutationsCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of offline storage & hydrate local IndexedDB cache for Airplane Mode
    const deletedContribsSet = getDeletedIds('contributions');
    getPendingOfflineContributions().then(pending => {
      setPendingOfflineSubmissions(pending);
      if (pending && pending.length > 0) {
        setContributions(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const offlineMapped: Contribution[] = pending
            .filter(p => !existingIds.has(p.id) && !deletedContribsSet.has(p.id))
            .map(p => ({
              id: p.id,
              itemId: p.itemId,
              userId: currentUserRef.current?.id || 'offline_user',
              userDisplayName: currentUserRef.current?.fullName || currentUserRef.current?.displayName || 'Contributeur Myènè',
              userTribe: currentUserRef.current?.tribe,
              userPaternalClan: currentUserRef.current?.paternalClan,
              userMaternalClan: currentUserRef.current?.maternalClan,
              frenchText: p.frenchText,
              originalMyeneText: p.originalMyeneText,
              isSpellingCorrect: p.isSpellingCorrect,
              proposedSpelling: p.proposedSpelling,
              isFrenchMeaningExact: p.isFrenchMeaningExact ?? true,
              frenchMeaningType: p.frenchMeaningType || 'exact',
              proposedFrenchMeaning: p.proposedFrenchMeaning,
              secondaryMeaning: p.secondaryMeaning,
              dialectVariant: p.dialectVariant || 'enenga',
              comment: p.comment,
              audioUrl: p.audioDataUrl,
              audioDuration: p.audioDuration || 3,
              status: 'pending' as ContributionStatus,
              offlineQueued: true,
              createdAt: new Date(p.timestamp).toISOString()
            }));
          if (offlineMapped.length === 0) return prev;
          const merged = [...offlineMapped, ...prev];
          cacheContributionsLocally(merged);
          return merged;
        });
      }
    });

    const cachedUsers = getCachedUsersLocally().filter(u => !DEMO_MOCK_USER_IDS.has(u.id));
    if (cachedUsers.length > 0) {
      setUsersList(cachedUsers);
    }

    const deletedItemsSet = getDeletedIds('items');
    getCachedItemsLocally().then(cached => {
      const { cleanedItems } = sanitizeAndDeduplicateItems(cached || [], INITIAL_CLANS, deletedItemsSet);
      if (cleanedItems.length > 0) {
        setItems(cleanedItems);
        cacheItemsLocally(cleanedItems);
      } else if (!isDatabaseMarkedSeeded()) {
        cacheItemsLocally(INITIAL_ENENGA_ITEMS.filter(i => !deletedItemsSet.has(i.id)));
      }
    });
    const deletedClansSet = getDeletedIds('clans');
    getCachedClansLocally().then(cached => {
      const { merged } = mergeOfficialClans(cached || [], deletedClansSet);
      if (merged.length > 0) {
        setClans(merged);
        cacheClansLocally(merged);
      } else if (!isDatabaseMarkedSeeded()) {
        cacheClansLocally(INITIAL_CLANS.filter(c => !deletedClansSet.has(c.id)));
      }
    });
    const deletedVillagesSet = getDeletedIds('villages');
    getCachedVillagesLocally().then(cached => {
      const { cleaned } = cleanObsoleteSeedVillages(cached || [], deletedVillagesSet);
      setVillages(cleaned);
      cacheVillagesLocally(cleaned);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Firebase auth state subscription & Cross-tab synchronization
  useEffect(() => {
    if (typeof navigator === 'undefined' || navigator.onLine) {
      testFirestoreConnection();
    }

    // 0. Instant session restoration (Online & Airplane Mode):
    // Immediately restore the saved user profile from localStorage so the app opens in 0ms without waiting for network timeouts
    try {
      const rawSavedUser = localStorage.getItem('nkala_authenticated_user');
      if (rawSavedUser) {
        const parsedSaved = JSON.parse(rawSavedUser) as UserProfile;
        if (parsedSaved && parsedSaved.id) {
          if (checkIsAdminEmail(parsedSaved.email) && parsedSaved.role !== 'admin') {
            parsedSaved.role = 'admin';
            localStorage.setItem('nkala_authenticated_user', JSON.stringify(parsedSaved));
          }
          currentUserRef.current = parsedSaved;
          setCurrentUser(parsedSaved);
          setIsOnboardingModalOpen(!parsedSaved.registrationCompleted);
          setIsAuthChecking(false);
        }
      }
    } catch {}

    // 1. Cross-tab storage synchronization: when Tab 1 completes onboarding or favorites, Tab 2 updates immediately
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nkala_authenticated_user' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.id) {
            if (checkIsAdminEmail(parsed.email) && parsed.role !== 'admin') {
              parsed.role = 'admin';
            }
            currentUserRef.current = parsed;
            setCurrentUser(parsed);
            if (parsed.registrationCompleted) {
              setIsOnboardingModalOpen(false);
            }
          }
        } catch {}
      } else if (e.key === FAVORITE_VOCAB_STORAGE_KEY && e.newValue) {
        try {
          const parsedFavs = JSON.parse(e.newValue);
          if (Array.isArray(parsedFavs)) {
            setFavoriteItemIds(parsedFavs);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 2. Listen to Firebase Auth state (single source of truth for Firestore authentication)
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setIsFirebaseAuthReady(true);
        const isSuperAdmin = checkIsAdminEmail(fbUser.email);

        // Immediately hydrate from localStorage if matching user so UI never blocks on slow/offline networks
        let restoredFromLocal = false;
        let cachedProfile: UserProfile | null = null;
        try {
          const cachedRaw = localStorage.getItem('nkala_authenticated_user');
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw) as UserProfile;
            if (parsed && parsed.id === fbUser.uid) {
              if (isSuperAdmin && parsed.role !== 'admin') {
                parsed.role = 'admin';
              }
              cachedProfile = parsed;
              currentUserRef.current = parsed;
              setCurrentUser(parsed);
              setIsOnboardingModalOpen(!parsed.registrationCompleted);
              setIsAuthChecking(false);
              restoredFromLocal = true;
            }
          }
        } catch {}

        if (typeof navigator !== 'undefined' && !navigator.onLine && restoredFromLocal) {
          return;
        }

        if (!restoredFromLocal) {
          setIsAuthChecking(true);
        }

        // CRITICAL: Replay any pending offline mutations & offline voice/text submissions FIRST
        // before reading Firestore so offline edits are never overwritten by older cloud snapshots!
        if (typeof navigator === 'undefined' || navigator.onLine) {
          try {
            await replayPendingOfflineAdminMutations();
            refreshPendingMutationsCount();
            await syncPendingOfflineData();
          } catch {}
        }

        // Query User Profile (RTDB first = 0 Firestore reads, then local cache, then 1 Firestore doc fallback)
        try {
          const cloudProfile = await smartGetUserProfile<UserProfile>(fbUser.uid);
          if (cloudProfile) {
            const { merged, needsCloudPush } = mergeLocalAndCloudUserProfile(
              cachedProfile || currentUserRef.current,
              cloudProfile,
              isSuperAdmin
            );

            if (needsCloudPush) {
              await dualSaveRecord('users', fbUser.uid, merged);
              if (isSuperAdmin) {
                await dualSaveRecord('admins', fbUser.uid, {
                  userId: fbUser.uid,
                  email: fbUser.email,
                  role: 'admin',
                  updatedAt: new Date().toISOString()
                });
              }
              refreshPendingMutationsCount();
            }

            currentUserRef.current = merged;
            setCurrentUser(merged);
            try {
              localStorage.setItem('nkala_authenticated_user', JSON.stringify(merged));
            } catch {}
            if (merged.registrationCompleted) {
              setIsOnboardingModalOpen(false);
            } else {
              setIsOnboardingModalOpen(true);
            }
            setIsAuthChecking(false);
            return;
          }
        } catch (fetchErr) {
          console.warn('Notice checking cloud user profile:', fetchErr);
          if (restoredFromLocal) {
            setIsAuthChecking(false);
            return;
          }
        }

        // If user already completed registration locally while offline, push that local profile to cloud instead of resetting!
        if (cachedProfile && cachedProfile.registrationCompleted) {
          await dualSaveRecord('users', cachedProfile.id, cachedProfile);
          if (cachedProfile.role === 'admin' || isSuperAdmin) {
            await dualSaveRecord('admins', cachedProfile.id, {
              userId: cachedProfile.id,
              email: cachedProfile.email,
              role: 'admin',
              updatedAt: new Date().toISOString()
            });
          }
          refreshPendingMutationsCount();
          setIsAuthChecking(false);
          return;
        }

        // 3. Create and persist user profile in Firestore & RTDB immediately upon first login!
        const isAdmin = isSuperAdmin || (fbUser.email && fbUser.email.toLowerCase().includes('admin')) || false;
        const initialProfile: UserProfile = {
          id: fbUser.uid,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Contributeur OMPAGANO',
          fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Locuteur Myènè',
          contact: fbUser.email || '',
          birthDate: '',
          birthPlace: '',
          tribe: 'Enenga',
          paternalClan: '',
          maternalClan: '',
          villageOfOrigin: '',
          registrationCompleted: false,
          email: fbUser.email || '',
          phoneNumber: '',
          photoURL: fbUser.photoURL || '',
          role: isAdmin ? 'admin' : 'user',
          status: 'active',
          suspicionScore: 0,
          xp: 150,
          level: 'Initié Curieux',
          levelIndex: 1,
          contributionsCount: 0,
          recordingsCount: 0,
          validationsCount: 0,
          streakDays: 1,
          badges: ['badge-premiere-voix'],
          favoriteItemIds: getSavedFavoriteIds(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await dualSaveRecord('users', initialProfile.id, initialProfile);
        if (isAdmin) {
          await dualSaveRecord('admins', initialProfile.id, {
            userId: initialProfile.id,
            email: initialProfile.email,
            role: 'admin',
            updatedAt: new Date().toISOString()
          });
        }
        refreshPendingMutationsCount();

        try {
          localStorage.setItem('nkala_authenticated_user', JSON.stringify(initialProfile));
        } catch {}

        currentUserRef.current = initialProfile;
        setCurrentUser(initialProfile);
        setUsersList(prev => {
          const next = [initialProfile, ...prev.filter(u => u.id !== initialProfile.id)];
          cacheUsersLocally(next);
          return next;
        });
        setIsOnboardingModalOpen(true);
        setIsAuthChecking(false);
        return;
      } else {
        // Firebase Auth returned null: verify if a stored profile exists (especially in Airplane Mode!)
        try {
          const activeLocal = localStorage.getItem('nkala_authenticated_user');
          if (activeLocal) {
            const parsed = JSON.parse(activeLocal);
            if (parsed && parsed.id) {
              if (checkIsAdminEmail(parsed.email) && parsed.role !== 'admin') {
                parsed.role = 'admin';
                localStorage.setItem('nkala_authenticated_user', JSON.stringify(parsed));
              }

              // Always restore the saved profile immediately so Airplane Mode / weak network never logs the user out
              currentUserRef.current = parsed;
              setCurrentUser(parsed);
              setIsOnboardingModalOpen(!parsed.registrationCompleted);
              setIsAuthChecking(false);

              if (typeof navigator === 'undefined' || navigator.onLine) {
                ensureFirebaseAuthSession()
                  .then((fallbackAuth) => {
                    if (fallbackAuth) {
                      setIsFirebaseAuthReady(true);
                    }
                  })
                  .catch(() => {});
              }
              return;
            }
          }
        } catch {}
        setIsFirebaseAuthReady(false);
        currentUserRef.current = null;
        setCurrentUser(null);
      }
      setIsAuthChecking(false);
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsubscribe();
    };
  }, []);

  // SPARK 50,000 READS QUOTA-SAFE SYNCHRONIZATION ENGINE
  // Replaces 9 unbounded collection-wide `onSnapshot` listeners (which could consume 10,000+ reads per session)
  // with:
  // 1. RTDB-first & Local IndexedDB Cache-first loading (0 Firestore document reads!)
  // 2. Incremental Delta Queries (`where('updatedAt', '>', lastSyncTs)`) when Firestore is queried
  // 3. A single lightweight version signal listener (`metrics/catalog_versions`)
  useEffect(() => {
    if (!currentUser || !isFirebaseAuthReady || !auth.currentUser) return;
    let isMounted = true;

    const syncCollectionByName = async (colName: string) => {
      if (!isMounted) return;

      if (colName === 'items') {
        const deletedSet = getDeletedIds('items');
        const cached = (await getCachedItemsLocally()) || [];
        const { items: loaded } = await smartFetchCollection<QuestionnaireItem>('items', cached);
        if (!isMounted) return;
        const { cleanedItems, updatedItemsToSave, duplicateItemIdsToRemove } = sanitizeAndDeduplicateItems(
          loaded,
          clans,
          deletedSet
        );
        if (cleanedItems.length > 0) {
          markDatabaseSeeded();
          setItems(cleanedItems);
          cacheItemsLocally(cleanedItems);
          if (updatedItemsToSave.length > 0) {
            dualBatchSaveRecords(
              'items',
              updatedItemsToSave.map(it => ({ id: it.id, data: it }))
            ).then(refreshPendingMutationsCount).catch(() => {});
          }
          if (duplicateItemIdsToRemove.length > 0) {
            for (const dupId of duplicateItemIdsToRemove) {
              dualDeleteRecord('items', dupId).catch(() => {});
            }
          }
        } else if (!isDatabaseMarkedSeeded() && deletedSet.size === 0) {
          const fallback = INITIAL_ENENGA_ITEMS.filter(i => !deletedSet.has(i.id));
          setItems(fallback);
          cacheItemsLocally(fallback);
        }
      } else if (colName === 'contributions') {
        const deletedSet = getDeletedIds('contributions');
        const cached = getCachedContributionsLocally() || [];
        const isStaff = currentUserRef.current?.role === 'admin' || currentUserRef.current?.role === 'validator';
        const { items: loaded } = await smartFetchCollection<Contribution>(
          'contributions',
          cached,
          { maxFirestoreFallbackDocs: isStaff ? 500 : 150 }
        );
        if (!isMounted) return;
        const filtered = loaded.filter(c => !deletedSet.has(c.id));
        if (filtered.length > 0 || isDatabaseMarkedSeeded() || deletedSet.size > 0) {
          setContributions(prev => {
            const loadedIds = new Set(filtered.map(c => c.id));
            const stillQueuedOffline = prev.filter(c => c.offlineQueued && !loadedIds.has(c.id) && !deletedSet.has(c.id));
            const merged = [...stillQueuedOffline, ...filtered];
            cacheContributionsLocally(merged);
            return merged;
          });
        }
      } else if (colName === 'challenges') {
        const deletedSet = getDeletedIds('challenges');
        const cached = getCachedChallengesLocally() || [];
        const { items: loaded } = await smartFetchCollection<WeeklyChallenge>('challenges', cached);
        if (!isMounted) return;
        const filtered = loaded.filter(c => !deletedSet.has(c.id));
        if (filtered.length > 0) {
          setChallenges(filtered);
          cacheChallengesLocally(filtered);
        }
      } else if (colName === 'themes') {
        const deletedSet = getDeletedIds('themes');
        const cached = getCachedThemesLocally() || [];
        const { items: loaded } = await smartFetchCollection<ThemeDefinition>('themes', cached);
        if (!isMounted) return;
        const filtered = loaded.filter(t => !deletedSet.has(t.id));
        if (filtered.length > 0) {
          setThemes(filtered);
          cacheThemesLocally(filtered);
        }
      } else if (colName === 'badges') {
        const deletedSet = getDeletedIds('badges');
        const cached = getCachedBadgesLocally() || [];
        const { items: loaded } = await smartFetchCollection<Badge>('badges', cached);
        if (!isMounted) return;
        const filtered = loaded.filter(b => !deletedSet.has(b.id));
        if (filtered.length > 0) {
          setBadges(filtered);
          cacheBadgesLocally(filtered);
        }
      } else if (colName === 'users') {
        const cached = getCachedUsersLocally() || [];
        const isStaff = currentUserRef.current?.role === 'admin' || currentUserRef.current?.role === 'validator';
        const { items: loaded } = await smartFetchCollection<UserProfile>(
          'users',
          cached,
          { maxFirestoreFallbackDocs: isStaff ? 500 : 100 }
        );
        if (!isMounted) return;
        const cleanedLoaded = loaded.filter(u => !DEMO_MOCK_USER_IDS.has(u.id));
        if (cleanedLoaded.length > 0) {
          setUsersList(cleanedLoaded);
          cacheUsersLocally(cleanedLoaded);
        }
      } else if (colName === 'clans') {
        const deletedSet = getDeletedIds('clans');
        const cached = (await getCachedClansLocally()) || [];
        const { items: loaded } = await smartFetchCollection<ClanRegistry>('clans', cached);
        if (!isMounted) return;
        const { merged, newlyAddedOrUpdated, removedObsoleteIds } = mergeOfficialClans(loaded, deletedSet);
        if (merged.length > 0) {
          setClans(merged);
          cacheClansLocally(merged);
        }
        // Automatically propagate new official Ôrungu clans to Firebase if missing from existing database
        if (newlyAddedOrUpdated.length > 0) {
          dualBatchSaveRecords(
            'clans',
            newlyAddedOrUpdated.map(cl => ({ id: cl.id, data: cl }))
          ).then(refreshPendingMutationsCount).catch(() => {});
        }
        if (removedObsoleteIds.length > 0) {
          for (const obsId of removedObsoleteIds) {
            dualDeleteRecord('clans', obsId).catch(() => {});
          }
        }
      } else if (colName === 'villages') {
        const deletedSet = getDeletedIds('villages');
        const cached = (await getCachedVillagesLocally()) || [];
        const { items: loaded } = await smartFetchCollection<VillageRegistry>('villages', cached);
        if (!isMounted) return;
        const { cleaned, removedObsoleteVillageIds } = cleanObsoleteSeedVillages(loaded, deletedSet);
        setVillages(cleaned);
        cacheVillagesLocally(cleaned);
        if (removedObsoleteVillageIds.length > 0) {
          for (const obsVid of removedObsoleteVillageIds) {
            dualDeleteRecord('villages', obsVid).catch(() => {});
          }
        }
      }
    };

    // Initial smart sync (uses RTDB & Local Cache first -> 0 Firestore document reads!)
    const collectionsToHydrate = [
      'items',
      'clans',
      'villages',
      'challenges',
      'themes',
      'badges',
      'contributions',
      'users'
    ];
    collectionsToHydrate.forEach(col => {
      syncCollectionByName(col).catch(() => {});
    });

    // Listen to lightweight catalog version signals (0 Firestore reads via RTDB + 1-doc Firestore fallback)
    const unsubscribeSignals = subscribeToCatalogSignals({
      onSeedStatus: (status) => {
        if (!isMounted) return;
        if (status) {
          setSeedStatus(status as SeedStatus);
          if (status.isSeeded) {
            markDatabaseSeeded();
          }
        }
      },
      onSystemMetrics: (metrics) => {
        if (!isMounted || !metrics) return;
        setSystemMetrics(metrics as SystemMetric);
      },
      onCollectionVersionChanged: (changedCollection) => {
        if (!isMounted) return;
        syncCollectionByName(changedCollection).catch(() => {});
      }
    });

    return () => {
      isMounted = false;
      unsubscribeSignals();
    };
  }, [currentUser?.id, isFirebaseAuthReady]);

  // Unified offline-to-online synchronization (Replays both admin/profile/validation mutations AND voice/text contributions)
  const syncPendingOfflineData = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (isSyncingOfflineRef.current) return;
    isSyncingOfflineRef.current = true;

    try {
      await ensureFirebaseAuthSession();

      // 1. Replay queued mutations (users profile updates, validations, items, clans, villages, challenges, themes, badges)
      const replayedMutations = await replayPendingOfflineAdminMutations();
      refreshPendingMutationsCount();

      // 2. Sync current user profile if present to guarantee XP, badges, terms, and favorites are up-to-date in Firebase
      const activeProfile = currentUserRef.current;
      if (activeProfile && activeProfile.id) {
        await dualSaveRecord('users', activeProfile.id, activeProfile);
        refreshPendingMutationsCount();
      }

      // 3. Replay pending voice & text contributions from IndexedDB / localStorage fallback
      const pending = await getPendingOfflineContributions();
      let syncedContribCount = 0;

      if (pending && pending.length > 0) {
        for (const item of pending) {
          let uploadedAudioUrl = item.audioDataUrl;

          // Upload audio blob to Firebase Storage bucket if present
          if (item.audioBlob) {
            try {
              const storagePath = `recordings/${item.itemId}_${Date.now()}.webm`;
              const audioRef = ref(storage, storagePath);
              await uploadBytes(audioRef, item.audioBlob);
              uploadedAudioUrl = await getDownloadURL(audioRef);
            } catch (storageErr) {
              console.warn('Storage upload notice (falling back to permanent Base64):', storageErr);
            }

            if (!uploadedAudioUrl || uploadedAudioUrl.startsWith('blob:')) {
              try {
                uploadedAudioUrl = await convertBlobToBase64(item.audioBlob);
              } catch {}
            }
          }

          const syncedContribution: Contribution = {
            id: item.id,
            itemId: item.itemId,
            userId: activeProfile?.id || 'offline_user',
            userDisplayName: activeProfile?.fullName || activeProfile?.displayName || 'Contributeur Myènè',
            userTribe: activeProfile?.tribe,
            userPaternalClan: activeProfile?.paternalClan,
            userMaternalClan: activeProfile?.maternalClan,
            userPhotoURL: activeProfile?.photoURL,
            frenchText: item.frenchText || '',
            originalMyeneText: item.originalMyeneText || '',
            isSpellingCorrect: !!item.isSpellingCorrect,
            proposedSpelling: item.proposedSpelling || item.originalMyeneText || '',
            isFrenchMeaningExact: item.isFrenchMeaningExact ?? true,
            frenchMeaningType: item.frenchMeaningType || 'exact',
            proposedFrenchMeaning: item.proposedFrenchMeaning || '',
            secondaryMeaning: item.secondaryMeaning || '',
            dialectVariant: item.dialectVariant || 'enenga',
            comment: item.comment || '',
            audioUrl: uploadedAudioUrl,
            audioDuration: item.audioDuration || 3,
            status: 'pending',
            createdAt: new Date(item.timestamp || Date.now()).toISOString(),
            offlineQueued: false
          };

          // Use dualSaveRecord (which sanitizes undefined values and writes to both Firestore & RTDB)
          const writeResult = await dualSaveRecord('contributions', item.id, syncedContribution);
          if (writeResult.firestore || writeResult.rtdb) {
            await removeOfflineContribution(item.id);
            syncedContribCount++;
            setContributions(prev => {
              const exists = prev.some(c => c.id === item.id);
              const next = exists
                ? prev.map(c => (c.id === item.id ? syncedContribution : c))
                : [syncedContribution, ...prev];
              cacheContributionsLocally(next);
              return next;
            });
          }
        }
      }

      const remainingPending = await getPendingOfflineContributions();
      setPendingOfflineSubmissions(remainingPending);
      refreshPendingMutationsCount();

      if (syncedContribCount > 0 || replayedMutations > 0) {
        NotificationService.sendLocalNotification('Synchronisation En Ligne Réussie ! ⚡', {
          body: `${syncedContribCount > 0 ? `${syncedContribCount} contribution(s) ` : ''}${
            replayedMutations > 0 ? `et ${replayedMutations} mise(s) à jour ` : ''
          }synchronisée(s) avec Firebase.`
        });
      }
    } catch (err) {
      console.warn('Erreur synchronisation offline:', err);
    } finally {
      isSyncingOfflineRef.current = false;
    }
  };

  // Submit contribution handler (Unified for both Online & Offline / Airplane Mode)
  const handleSaveContribution = async (data: Partial<Contribution>, audioBlob?: Blob): Promise<boolean> => {
    const activeUser = currentUserRef.current || currentUser;

    // Chaque contributeur individuel doit valider électroniquement les conditions et l'utilisation de ses données avant toute contribution.
    if (activeUser && (!activeUser.termsAccepted || !activeUser.dataUsageAccepted)) {
      setIsTermsConsentModalOpen(true);
      NotificationService.sendLocalNotification('Validation des Conditions Requise 📜', {
        body: "Veuillez accepter les conditions de la plateforme et valider l'utilisation de vos données avant de soumettre votre contribution."
      });
      return false;
    }

    const currentlyOnline = typeof navigator === 'undefined' ? isOnline : navigator.onLine;
    const contributionId = (currentlyOnline ? 'contrib-' : 'off-') + Date.now();
    let finalAudioUrl = data.audioUrl;

    if (audioBlob) {
      if (currentlyOnline) {
        try {
          const storagePath = `recordings/${data.itemId}_${Date.now()}.webm`;
          const audioRef = ref(storage, storagePath);
          await uploadBytes(audioRef, audioBlob);
          finalAudioUrl = await getDownloadURL(audioRef);
        } catch (err) {
          console.warn('Storage direct upload notice, convertissant en audio permanent Base64:', err);
        }
      }

      // Always ensure we have a permanent Base64 dataUrl if offline or if Storage upload didn't return an https URL
      if (!finalAudioUrl || finalAudioUrl.startsWith('blob:')) {
        try {
          finalAudioUrl = await convertBlobToBase64(audioBlob);
        } catch (b64Err) {
          console.warn('Base64 audio fallback notice:', b64Err);
        }
      }
    }

    const payload: Contribution = {
      id: contributionId,
      itemId: data.itemId || '',
      userId: activeUser?.id || 'guest-user',
      userDisplayName: activeUser?.fullName || activeUser?.displayName || 'Contributeur Myènè',
      userTribe: activeUser?.tribe,
      userPaternalClan: activeUser?.paternalClan,
      userMaternalClan: activeUser?.maternalClan,
      userPhotoURL: activeUser?.photoURL,
      frenchText: data.frenchText || '',
      originalMyeneText: data.originalMyeneText || '',
      isSpellingCorrect: !!data.isSpellingCorrect,
      proposedSpelling: data.proposedSpelling || data.originalMyeneText || '',
      isFrenchMeaningExact: data.isFrenchMeaningExact ?? true,
      frenchMeaningType: data.frenchMeaningType || 'exact',
      proposedFrenchMeaning: data.proposedFrenchMeaning,
      secondaryMeaning: data.secondaryMeaning,
      dialectVariant: data.dialectVariant || 'enenga',
      comment: data.comment,
      audioUrl: finalAudioUrl,
      audioDuration: data.audioDuration || 3,
      status: 'pending',
      offlineQueued: !currentlyOnline,
      createdAt: new Date().toISOString()
    };

    try {
      if (!currentlyOnline) {
        // Save to offline IndexedDB + localStorage fallback
        const offlineSub: OfflineSubmission = {
          id: contributionId,
          itemId: payload.itemId,
          frenchText: payload.frenchText,
          originalMyeneText: payload.originalMyeneText,
          isSpellingCorrect: payload.isSpellingCorrect,
          proposedSpelling: payload.proposedSpelling,
          isFrenchMeaningExact: payload.isFrenchMeaningExact,
          frenchMeaningType: payload.frenchMeaningType,
          proposedFrenchMeaning: payload.proposedFrenchMeaning,
          secondaryMeaning: payload.secondaryMeaning,
          dialectVariant: payload.dialectVariant,
          comment: payload.comment,
          audioBlob: audioBlob || undefined,
          audioDataUrl: finalAudioUrl,
          audioDuration: payload.audioDuration,
          timestamp: Date.now()
        };
        await saveOfflineContribution(offlineSub);
        const updatedPending = await getPendingOfflineContributions();
        setPendingOfflineSubmissions(updatedPending);
      } else {
        const writeRes = await dualSaveRecord('contributions', contributionId, payload);
        if (!writeRes.firestore && !writeRes.rtdb) {
          payload.offlineQueued = true;
        }
        refreshPendingMutationsCount();
      }

      setContributions(prev => {
        const next = [payload, ...prev.filter(c => c.id !== payload.id)];
        cacheContributionsLocally(next);
        return next;
      });

      // Increment item contribution/recording counters locally in IndexedDB without mutating the 10,000-item catalog on Firestore on every contribution
      if (payload.itemId) {
        setItems(prev => {
          const next = prev.map(it => {
            if (it.id !== payload.itemId) return it;
            return {
              ...it,
              contributionsCount: (it.contributionsCount || 0) + 1,
              recordingsCount: (it.recordingsCount || 0) + (finalAudioUrl ? 1 : 0)
            };
          });
          cacheItemsLocally(next);
          return next;
        });
      }

      // Track Weekly Challenge progression
      const activeChallenge = challenges.find(c => c.id === activeChallengeId);
      const currentItemForContrib = items.find(i => i.id === data.itemId);
      const latestUser = currentUserRef.current;
      if (latestUser && activeChallenge && activeChallenge.isActive) {
        const itemTheme = currentItemForContrib?.category || currentItemForContrib?.theme;
        const isThemeMatch = activeChallenge.theme === 'all' || itemTheme === activeChallenge.theme;
        const isTypeMatch = activeChallenge.challengeType === 'all' ||
          activeChallenge.challengeType === 'contributions' ||
          (activeChallenge.challengeType === 'recordings' && !!(audioBlob || data.audioUrl));

        if (isThemeMatch && isTypeMatch) {
          const currentCount = latestUser.weeklyProgress?.[activeChallenge.id] || 0;
          const newCount = currentCount + 1;
          const wasCompleted = latestUser.completedChallenges?.includes(activeChallenge.id);

          const updatedWeeklyProgress = {
            ...(latestUser.weeklyProgress || {}),
            [activeChallenge.id]: newCount
          };

          let updatedCompleted = latestUser.completedChallenges || [];
          let updatedBadges = [...(latestUser.badges || [])];
          let bonusXp = 0;

          if (newCount >= activeChallenge.targetCount && !wasCompleted) {
            updatedCompleted = [...updatedCompleted, activeChallenge.id];
            if (!updatedBadges.includes(activeChallenge.badgeRewardId)) {
              updatedBadges.push(activeChallenge.badgeRewardId);
            }
            bonusXp = activeChallenge.xpReward;
            setCelebrationChallenge(activeChallenge);

            NotificationService.sendLocalNotification('🎉 Défi Hebdomadaire Accompli !', {
              body: `Félicitations ! Vous avez débloqué le badge "${activeChallenge.badgeRewardName}" (+${activeChallenge.xpReward} XP) !`
            });
          }

          const newXpTotal = (latestUser.xp || 0) + bonusXp;
          const newLvl = getLevelForXp(newXpTotal);

          await updateAndPersistCurrentUser(prev => ({
            ...prev,
            xp: newXpTotal,
            level: newLvl.name,
            levelIndex: newLvl.index,
            badges: updatedBadges,
            weeklyProgress: updatedWeeklyProgress,
            completedChallenges: updatedCompleted,
            updatedAt: new Date().toISOString()
          }));
        }
      }

      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'contributions/' + contributionId);
      setContributions(prev => {
        const next = [payload, ...prev.filter(c => c.id !== payload.id)];
        cacheContributionsLocally(next);
        return next;
      });
      return true;
    }
  };

  // Gamification rewards handler (persists to localStorage + dualSaveRecord offline queue & cloud)
  const handleRewardEarned = (xpGained: number, newBadges: string[]) => {
    const latestUser = currentUserRef.current || currentUser;
    if (!latestUser) return;

    const newXp = (latestUser.xp || 0) + xpGained;
    const newLvl = getLevelForXp(newXp);
    const updatedBadges = Array.from(new Set([...(latestUser.badges || []), ...newBadges]));

    const updatedProfile: UserProfile = {
      ...latestUser,
      xp: newXp,
      level: newLvl.name,
      levelIndex: newLvl.index,
      contributionsCount: (latestUser.contributionsCount || 0) + 1,
      recordingsCount: (latestUser.recordingsCount || 0) + (newBadges.includes('badge-premiere-voix') ? 1 : 0),
      badges: updatedBadges,
      updatedAt: new Date().toISOString()
    };

    updateAndPersistCurrentUser(updatedProfile).catch(() => {});
  };

  // Dynamic additions and administration of Clans and Villages
  const handleAddNewClan = async (name: string, tribe: string): Promise<ClanRegistry> => {
    const id = 'clan-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    unmarkIdAsDeleted('clans', id);
    const newClan: ClanRegistry = {
      id,
      name,
      tribe,
      createdBy: currentUser?.id,
      createdAt: new Date().toISOString()
    };
    setClans(prev => {
      const idx = prev.findIndex(c => c.id === id);
      let updated: ClanRegistry[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = newClan;
      } else {
        updated = [...prev, newClan];
      }
      cacheClansLocally(updated);
      return updated;
    });
    await dualSaveRecord('clans', id, newClan);
    refreshPendingMutationsCount();
    return newClan;
  };

  const handleSaveClan = async (clanData: Partial<ClanRegistry>) => {
    const id = clanData.id || ('clan-' + (clanData.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-'));
    unmarkIdAsDeleted('clans', id);
    const fullClan: ClanRegistry = {
      id,
      name: clanData.name || 'Nouveau Clan',
      tribe: clanData.tribe || 'Enenga',
      description: clanData.description,
      historicalMeaning: clanData.historicalMeaning,
      geographicalOrigins: clanData.geographicalOrigins,
      mottoOrSymbol: clanData.mottoOrSymbol,
      createdAt: clanData.createdAt || new Date().toISOString()
    };
    setClans(prev => {
      const idx = prev.findIndex(c => c.id === id);
      let updated: ClanRegistry[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = fullClan;
      } else {
        updated = [...prev, fullClan];
      }
      cacheClansLocally(updated);
      return updated;
    });
    await dualSaveRecord('clans', id, fullClan);
    refreshPendingMutationsCount();
  };

  const handleDeleteClan = async (clanId: string) => {
    markIdAsDeleted('clans', clanId);
    setClans(prev => {
      const next = prev.filter(c => c.id !== clanId);
      cacheClansLocally(next);
      return next;
    });
    await dualDeleteRecord('clans', clanId);
    refreshPendingMutationsCount();
  };

  const handleAddNewVillage = async (name: string, clan: string, tribe: string, region?: string): Promise<VillageRegistry> => {
    const id = 'vil-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    unmarkIdAsDeleted('villages', id);
    const newVillage: VillageRegistry = {
      id,
      name,
      clan,
      tribe,
      region: region || 'Gabon',
      createdBy: currentUser?.id,
      createdAt: new Date().toISOString()
    };
    setVillages(prev => {
      const idx = prev.findIndex(v => v.id === id);
      let updated: VillageRegistry[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = newVillage;
      } else {
        updated = [...prev, newVillage];
      }
      cacheVillagesLocally(updated);
      return updated;
    });
    await dualSaveRecord('villages', id, newVillage);
    refreshPendingMutationsCount();
    return newVillage;
  };

  const handleSaveVillage = async (villageData: Partial<VillageRegistry>) => {
    const id = villageData.id || ('vil-' + (villageData.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-'));
    unmarkIdAsDeleted('villages', id);
    const fullVillage: VillageRegistry = {
      id,
      name: villageData.name || 'Nouveau Village',
      clan: villageData.clan || 'Non rattaché',
      tribe: villageData.tribe || 'Ôrungu',
      region: villageData.region,
      createdAt: villageData.createdAt || new Date().toISOString()
    };
    setVillages(prev => {
      const idx = prev.findIndex(v => v.id === id);
      let updated: VillageRegistry[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = fullVillage;
      } else {
        updated = [...prev, fullVillage];
      }
      cacheVillagesLocally(updated);
      return updated;
    });
    await dualSaveRecord('villages', id, fullVillage);
    refreshPendingMutationsCount();
  };

  const handleDeleteVillage = async (villageId: string) => {
    markIdAsDeleted('villages', villageId);
    setVillages(prev => {
      const next = prev.filter(v => v.id !== villageId);
      cacheVillagesLocally(next);
      return next;
    });
    await dualDeleteRecord('villages', villageId);
    refreshPendingMutationsCount();
  };

  const handleBatchImportClans = async (
    incomingClans: ClanRegistry[],
    onProgress?: (savedCount: number, totalCount: number) => void
  ) => {
    if (!incomingClans || incomingClans.length === 0) return;
    const { newClansToImport } = deduplicateParsedCsvClans(incomingClans, clans);
    if (newClansToImport.length === 0) {
      onProgress?.(0, 0);
      return;
    }
    for (const cl of newClansToImport) {
      unmarkIdAsDeleted('clans', cl.id);
    }
    const updatedClansList = [...clans, ...newClansToImport];
    setClans(updatedClansList);
    cacheClansLocally(updatedClansList);

    await dualBatchSaveRecords(
      'clans',
      newClansToImport.map(cl => ({ id: cl.id, data: cl })),
      onProgress
    );
    refreshPendingMutationsCount();
  };

  const handleBatchImportVillages = async (
    incomingVillages: VillageRegistry[],
    onProgress?: (savedCount: number, totalCount: number) => void
  ) => {
    if (!incomingVillages || incomingVillages.length === 0) return;
    const { newVillagesToImport } = deduplicateParsedCsvVillages(incomingVillages, villages);
    if (newVillagesToImport.length === 0) {
      onProgress?.(0, 0);
      return;
    }
    for (const vi of newVillagesToImport) {
      unmarkIdAsDeleted('villages', vi.id);
    }
    const updatedVillagesList = [...villages, ...newVillagesToImport];
    setVillages(updatedVillagesList);
    cacheVillagesLocally(updatedVillagesList);

    await dualBatchSaveRecords(
      'villages',
      newVillagesToImport.map(vi => ({ id: vi.id, data: vi })),
      onProgress
    );
    refreshPendingMutationsCount();
  };

  // Complete onboarding with guaranteed offline/online persistence & dual write
  const handleCompleteOnboarding = async (profileData: Partial<UserProfile>) => {
    const baseUser = currentUserRef.current || currentUser;
    if (!baseUser) return;
    if (typeof navigator === 'undefined' || navigator.onLine) {
      await ensureFirebaseAuthSession();
    }

    const isSuperAdmin = checkIsAdminEmail(baseUser.email) || checkIsAdminEmail(profileData.email);
    const updated: UserProfile = {
      ...baseUser,
      ...profileData,
      role: isSuperAdmin ? 'admin' : (profileData.role || baseUser.role),
      registrationCompleted: true,
      updatedAt: new Date().toISOString()
    };

    await updateAndPersistCurrentUser(updated, true);

    if (updated.role === 'admin') {
      await dualSaveRecord('admins', updated.id, {
        userId: updated.id,
        role: 'admin',
        updatedAt: new Date().toISOString()
      });
      refreshPendingMutationsCount();
    }

    setIsOnboardingModalOpen(false);
    // Open the post-onboarding visual guide & objectives automatically right after onboarding!
    setIsPostOnboardingGuide(true);
    setIsVisualGuideOpen(true);

    NotificationService.sendLocalNotification('Filiation OMPAGANO Validée 📜', {
      body: `Bienvenue dans le programme ${updated.fullName} de la tribu ${updated.tribe} !`
    });
  };

  // Accept Platform Terms & Data Usage Consent (Annexe 1 - for already registered or updating users)
  const handleAcceptTermsConsent = async (consentData: TermsConsentPayload) => {
    const baseUser = currentUserRef.current || currentUser;
    if (!baseUser) return;
    if (typeof navigator === 'undefined' || navigator.onLine) {
      await ensureFirebaseAuthSession();
    }

    const updated: UserProfile = {
      ...baseUser,
      ...consentData,
      updatedAt: new Date().toISOString()
    };

    await updateAndPersistCurrentUser(updated, true);
    setIsTermsConsentModalOpen(false);

    // If the user has not seen the visual guide yet, display it after terms validation
    try {
      if (localStorage.getItem(VISUAL_GUIDE_SEEN_KEY) !== 'true') {
        setIsPostOnboardingGuide(true);
        setIsVisualGuideOpen(true);
      }
    } catch {}

    NotificationService.sendLocalNotification('Consentement Individuel Enregistré ✅', {
      body: `Merci ${updated.fullName} ! Votre validation des conditions et de l'utilisation des données est certifiée.`
    });
  };

  // Admin validation handler (works offline & syncs online via dualSaveRecord)
  const handleValidateContribution = async (
    contributionId: string, 
    status: 'approved' | 'rejected' | 'needs_revision',
    notes?: string
  ) => {
    const activeUser = currentUserRef.current || currentUser;
    const validationFields: Partial<Contribution> = {
      status,
      validatorId: activeUser?.id || 'admin',
      validatorDisplayName: activeUser?.fullName || 'Andy AKENDENGUE',
      validatorNotes: notes || '',
      validatedAt: new Date().toISOString()
    };

    let targetUpdatedContrib: Contribution | null = null;
    setContributions(prev => {
      const next = prev.map(c => {
        if (c.id === contributionId) {
          targetUpdatedContrib = { ...c, ...validationFields };
          return targetUpdatedContrib;
        }
        return c;
      });
      cacheContributionsLocally(next);
      return next;
    });

    await dualSaveRecord('contributions', contributionId, targetUpdatedContrib || { id: contributionId, ...validationFields });
    refreshPendingMutationsCount();

    if (activeUser) {
      const updatedValids = (activeUser.validationsCount || 0) + 1;
      const extraBadges = [...(activeUser.badges || [])];
      if (updatedValids >= 5 && !extraBadges.includes('badge-cinq-validations')) {
        extraBadges.push('badge-cinq-validations');
      }
      await updateAndPersistCurrentUser(prev => ({
        ...prev,
        validationsCount: updatedValids,
        badges: extraBadges,
        updatedAt: new Date().toISOString()
      }));
    }
  };

  // Dedicated Validator Workspace handler with explicit oral vs written nuance (works offline & syncs online)
  const handleValidateGranular = async (
    contributionId: string,
    payload: {
      status: ContributionStatus;
      spellingVerdict: 'correct' | 'incorrect';
      pronunciationVerdict: 'correct' | 'incorrect' | 'no_audio';
      notes?: string;
    }
  ) => {
    const activeUser = currentUserRef.current || currentUser;
    const updatePayload: Partial<Contribution> = {
      status: payload.status,
      spellingVerdict: payload.spellingVerdict,
      pronunciationVerdict: payload.pronunciationVerdict,
      isSpellingCorrect: payload.spellingVerdict === 'correct',
      isPronunciationCorrect: payload.pronunciationVerdict === 'correct',
      validatorId: activeUser?.id || 'validator',
      validatorDisplayName: activeUser?.fullName || activeUser?.displayName || 'Validateur',
      validatorNotes: payload.notes || '',
      validatedAt: new Date().toISOString()
    };

    let targetUpdatedContrib: Contribution | null = null;
    setContributions(prev => {
      const next = prev.map(c => {
        if (c.id === contributionId) {
          targetUpdatedContrib = { ...c, ...updatePayload };
          return targetUpdatedContrib;
        }
        return c;
      });
      cacheContributionsLocally(next);
      return next;
    });

    await dualSaveRecord('contributions', contributionId, targetUpdatedContrib || { id: contributionId, ...updatePayload });
    refreshPendingMutationsCount();

    if (activeUser) {
      const updatedValids = (activeUser.validationsCount || 0) + 1;
      const extraBadges = [...(activeUser.badges || [])];
      if (updatedValids >= 5 && !extraBadges.includes('badge-cinq-validations')) {
        extraBadges.push('badge-cinq-validations');
      }
      await updateAndPersistCurrentUser(prev => ({
        ...prev,
        validationsCount: updatedValids,
        badges: extraBadges,
        updatedAt: new Date().toISOString()
      }));
    }

    NotificationService.sendLocalNotification('Évaluation Enregistrée 🎯', {
      body: `La contribution a été évaluée avec nuance.`
    });
  };

  // Admin User level & badge manual manager (persists to Firestore + RTDB + offline queue)
  const handleUpdateUserLevelAndBadges = async (
    userId: string,
    newLevelIndex: number,
    badgesList: string[],
    newXp?: number
  ) => {
    const lvl = USER_LEVELS.find(l => l.index === newLevelIndex) || USER_LEVELS[0];
    const nowIso = new Date().toISOString();
    let updatedTargetUser: UserProfile | null = null;

    setUsersList(prev => {
      const next = prev.map(u => {
        if (u.id === userId) {
          updatedTargetUser = {
            ...u,
            levelIndex: newLevelIndex,
            level: lvl.name,
            badges: badgesList,
            xp: newXp !== undefined ? newXp : u.xp,
            updatedAt: nowIso
          };
          return updatedTargetUser;
        }
        return u;
      });
      cacheUsersLocally(next);
      return next;
    });

    if (currentUserRef.current?.id === userId) {
      await updateAndPersistCurrentUser(prev => ({
        ...prev,
        levelIndex: newLevelIndex,
        level: lvl.name,
        badges: badgesList,
        xp: newXp !== undefined ? newXp : prev.xp,
        updatedAt: nowIso
      }));
    } else {
      await dualSaveRecord(
        'users',
        userId,
        updatedTargetUser || {
          id: userId,
          levelIndex: newLevelIndex,
          level: lvl.name,
          badges: badgesList,
          ...(newXp !== undefined ? { xp: newXp } : {}),
          updatedAt: nowIso
        }
      );
      refreshPendingMutationsCount();
    }
  };

  // Authentication Gate handler - PRESERVES FIRESTORE & OFFLINE DATA ON RECONNECT
  const handleLoginSuccess = async (profileData: Partial<UserProfile>) => {
    if (!profileData.id) return;

    setIsAuthChecking(true);
    try {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await ensureFirebaseAuthSession();
        if (auth.currentUser) {
          setIsFirebaseAuthReady(true);
        }
        await replayPendingOfflineAdminMutations();
        refreshPendingMutationsCount();
      }

      // 1. FIRST: Check if the user already exists (RTDB first = 0 Firestore reads, then local cache, then 1 Firestore doc fallback)
      let existingProfile: UserProfile | null = null;
      if (typeof navigator === 'undefined' || navigator.onLine) {
        try {
          existingProfile = await smartGetUserProfile<UserProfile>(profileData.id);
        } catch (err) {
          console.warn('Notice checking existing user profile:', err);
        }
      }

      const isSuperAdmin = checkIsAdminEmail(profileData.email) || checkIsAdminEmail(existingProfile?.email);

      if (existingProfile) {
        const { merged, needsCloudPush } = mergeLocalAndCloudUserProfile(
          currentUserRef.current,
          {
            ...existingProfile,
            photoURL: profileData.photoURL || existingProfile.photoURL,
            email: profileData.email || existingProfile.email
          },
          isSuperAdmin
        );

        if (needsCloudPush) {
          await dualSaveRecord('users', merged.id, merged);
          if (isSuperAdmin) {
            await dualSaveRecord('admins', merged.id, {
              userId: merged.id,
              email: merged.email,
              role: 'admin',
              updatedAt: new Date().toISOString()
            });
          }
          refreshPendingMutationsCount();
        }

        await updateAndPersistCurrentUser(merged, false);

        if (merged.registrationCompleted) {
          setIsOnboardingModalOpen(false);
        } else {
          setIsOnboardingModalOpen(true);
        }
        return;
      }

      // 2. ONLY for brand-new users who have never existed in Firestore:
      const isAdmin = isSuperAdmin || profileData.role === 'admin' || (profileData.email && profileData.email.toLowerCase().includes('admin')) || false;
      const fullProfile: UserProfile = {
        id: profileData.id,
        displayName: profileData.displayName || (profileData.email ? profileData.email.split('@')[0] : 'Contributeur OMPAGANO'),
        fullName: profileData.fullName || profileData.displayName || 'Locuteur Myènè',
        contact: profileData.contact || profileData.email || profileData.phoneNumber || '',
        birthDate: '',
        birthPlace: '',
        tribe: 'Enenga',
        paternalClan: '',
        maternalClan: '',
        villageOfOrigin: '',
        registrationCompleted: false,
        email: profileData.email || '',
        phoneNumber: profileData.phoneNumber || '',
        photoURL: profileData.photoURL || '',
        role: isAdmin ? 'admin' : (profileData.role || 'user'),
        status: 'active',
        suspicionScore: 0,
        xp: 150,
        level: 'Initié Curieux',
        levelIndex: 1,
        contributionsCount: 0,
        recordingsCount: 0,
        validationsCount: 0,
        streakDays: 1,
        badges: ['badge-premiere-voix'],
        favoriteItemIds: getSavedFavoriteIds(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await updateAndPersistCurrentUser(fullProfile, true);
      if (fullProfile.role === 'admin') {
        await dualSaveRecord('admins', fullProfile.id, { 
          userId: fullProfile.id,
          email: fullProfile.email,
          role: 'admin', 
          updatedAt: new Date().toISOString() 
        });
        refreshPendingMutationsCount();
      }

      setIsOnboardingModalOpen(true);
    } finally {
      setIsAuthChecking(false);
    }
  };

  // Official First Database Seed (Performed by Admin once, marked permanently in Firestore & RTDB)
  const handleExecuteInitialSeed = async (silent: boolean = false) => {
    if (currentUser?.role !== 'admin') {
      if (!silent) alert("Seul un administrateur peut initialiser la base de données cloud.");
      return;
    }
    if (isSeedingDatabase) return;

    setIsSeedingDatabase(true);
    await ensureFirebaseAuthSession();

    try {
      clearAllDeletedIds();
      markDatabaseSeeded();

      // 1. Seed all Items (Questions/Expressions)
      for (const item of INITIAL_ENENGA_ITEMS) {
        await dualSaveRecord('items', item.id, item);
      }
      await cacheItemsLocally(INITIAL_ENENGA_ITEMS);
      setItems(INITIAL_ENENGA_ITEMS);

      // 2. Seed all Clans
      for (const clan of INITIAL_CLANS) {
        await dualSaveRecord('clans', clan.id, clan);
      }
      await cacheClansLocally(INITIAL_CLANS);
      setClans(INITIAL_CLANS);

      // 3. Seed all Villages
      for (const village of INITIAL_VILLAGES) {
        await dualSaveRecord('villages', village.id, village);
      }
      await cacheVillagesLocally(INITIAL_VILLAGES);
      setVillages(INITIAL_VILLAGES);

      // 4. Seed Themes
      for (const theme of THEMATIC_CATEGORIES) {
        await dualSaveRecord('themes', theme.id, theme);
      }
      setThemes(THEMATIC_CATEGORIES);
      cacheThemesLocally(THEMATIC_CATEGORIES);

      // 5. Seed Badges
      for (const badge of SYSTEM_BADGES) {
        await dualSaveRecord('badges', badge.id, badge);
      }
      setBadges(SYSTEM_BADGES);
      cacheBadgesLocally(SYSTEM_BADGES);

      // 6. Seed Weekly Challenges
      for (const challenge of INITIAL_WEEKLY_CHALLENGES) {
        await dualSaveRecord('challenges', challenge.id, challenge);
      }
      setChallenges(INITIAL_WEEKLY_CHALLENGES);
      cacheChallengesLocally(INITIAL_WEEKLY_CHALLENGES);

      // 7. Write the official permanent Seed Marker in Firestore & RTDB
      const markerPayload: SeedStatus = {
        isSeeded: true,
        seededAt: new Date().toISOString(),
        seededBy: currentUser.id,
        seededByName: currentUser.fullName || currentUser.displayName,
        itemsCount: INITIAL_ENENGA_ITEMS.length,
        clansCount: INITIAL_CLANS.length,
        villagesCount: INITIAL_VILLAGES.length,
        themesCount: THEMATIC_CATEGORIES.length,
        badgesCount: SYSTEM_BADGES.length,
        version: '1.0.0-ompagano'
      };

      await dualSaveRecord('metrics', 'seed_status', markerPayload);
      setSeedStatus(markerPayload);

      // 8. Update summary metric
      const metricsPayload: SystemMetric = {
        id: 'summary',
        totalItems: INITIAL_ENENGA_ITEMS.length,
        totalContributions: contributions.length,
        totalRecordings: contributions.filter(c => !!c.audioUrl).length,
        totalValidated: contributions.filter(c => c.status === 'approved').length,
        totalUsers: usersList.length,
        lastUpdated: new Date().toISOString()
      };
      await dualSaveRecord('metrics', 'summary', metricsPayload);
      setSystemMetrics(metricsPayload);
      refreshPendingMutationsCount();

      NotificationService.sendLocalNotification('Premier Seed Firebase Réussi 🌱', {
        body: `Base de données initialisée : ${INITIAL_ENENGA_ITEMS.length} questions et ${INITIAL_CLANS.length} clans propagés.`
      });
      if (!silent) {
        alert(`Félicitations ! Le premier Seed officiel de la base Firebase a été effectué avec succès.\n\n- ${INITIAL_ENENGA_ITEMS.length} questions injectées dans /items\n- ${INITIAL_CLANS.length} clans configurés dans /clans\n- ${INITIAL_VILLAGES.length} villages rattachés dans /villages\n\nLe marqueur permanent 'seed_status' est maintenant enregistré dans Firebase. Tous vos périphériques et utilisateurs accèdent désormais aux mêmes données en temps réel !`);
      }
    } catch (err: any) {
      console.error('Erreur lors du Seed initial:', err);
      if (!silent) {
        alert("Erreur lors du seed : " + (err.message || 'Vérifiez la connexion'));
      }
    } finally {
      setIsSeedingDatabase(false);
    }
  };

  // Admin User Role Management (DECIDER QUI EST ADMIN - works offline & syncs online)
  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    const nowIso = new Date().toISOString();
    setUsersList(prev => {
      const next = prev.map(u => (u.id === userId ? { ...u, role: newRole, updatedAt: nowIso } : u));
      cacheUsersLocally(next);
      return next;
    });

    if (currentUserRef.current?.id === userId) {
      await updateAndPersistCurrentUser(prev => ({ ...prev, role: newRole, updatedAt: nowIso }), true);
    } else {
      await dualSaveRecord('users', userId, { role: newRole, updatedAt: nowIso });
    }

    if (newRole === 'admin') {
      await dualSaveRecord('admins', userId, { userId, role: 'admin', updatedAt: nowIso });
    } else {
      await dualDeleteRecord('admins', userId);
    }
    refreshPendingMutationsCount();

    alert(`Rôle mis à jour : l'utilisateur est désormais ${newRole === 'admin' ? 'ADMINISTRATEUR 👑' : newRole === 'validator' ? 'VALIDATEUR 🔍' : 'CONTRIBUTEUR'}.`);
  };

  // Delete Contribution / Response
  const handleDeleteContribution = async (contributionId: string) => {
    markIdAsDeleted('contributions', contributionId);
    await removeOfflineContribution(contributionId);
    setContributions(prev => {
      const next = prev.filter(c => c.id !== contributionId);
      cacheContributionsLocally(next);
      return next;
    });
    await dualDeleteRecord('contributions', contributionId);
    refreshPendingMutationsCount();
  };

  // Admin Anti-Fraud account status update (works offline & syncs online)
  const handleUpdateUserAccountStatus = async (userId: string, status: 'active' | 'flagged' | 'suspended') => {
    const nowIso = new Date().toISOString();
    setUsersList(prev => {
      const next = prev.map(u => (u.id === userId ? { ...u, status, updatedAt: nowIso } : u));
      cacheUsersLocally(next);
      return next;
    });

    if (currentUserRef.current?.id === userId) {
      await updateAndPersistCurrentUser(prev => ({ ...prev, status, updatedAt: nowIso }), true);
    } else {
      await dualSaveRecord('users', userId, { status, updatedAt: nowIso });
      refreshPendingMutationsCount();
    }

    alert(`Le statut du profil a été mis à jour : ${status.toUpperCase()}`);
  };

  // Questionnaire management (Questions & Expressions)
  const handleSaveQuestionnaireItem = async (itemData: Partial<QuestionnaireItem>) => {
    const id = itemData.id || 'item-' + Date.now();
    unmarkIdAsDeleted('items', id);
    const fullItem: QuestionnaireItem = {
      id,
      frenchText: itemData.frenchText || '',
      myeneText: itemData.myeneText || '',
      dialect: itemData.dialect || 'enenga',
      clan: itemData.clan,
      clans: itemData.clans,
      category: itemData.category || 'vie_quotidienne',
      theme: itemData.theme || itemData.category || 'vie_quotidienne',
      contextNotes: itemData.contextNotes || '',
      imageUrl: itemData.imageUrl || 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=800&q=80',
      difficulty: itemData.difficulty || 'intermediaire',
      status: 'active',
      contributionsCount: itemData.contributionsCount || 0,
      recordingsCount: itemData.recordingsCount || 0,
      createdBy: currentUser?.id || 'admin',
      createdAt: itemData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setItems(prev => {
      const idx = prev.findIndex(i => i.id === id);
      let updated: QuestionnaireItem[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = fullItem;
      } else {
        updated = [fullItem, ...prev];
      }
      cacheItemsLocally(updated);
      return updated;
    });

    await dualSaveRecord('items', id, fullItem);
    refreshPendingMutationsCount();
  };

  const handleDeleteQuestionnaireItem = async (itemId: string) => {
    markIdAsDeleted('items', itemId);
    setItems(prev => {
      const remaining = prev.filter(i => i.id !== itemId);
      cacheItemsLocally(remaining);
      return remaining;
    });
    await dualDeleteRecord('items', itemId);
    refreshPendingMutationsCount();
  };

  // Weekly Challenge Admin Handlers
  const handleSaveChallenge = async (challengeData: Partial<WeeklyChallenge>) => {
    const id = challengeData.id || `defi-${Date.now()}`;
    unmarkIdAsDeleted('challenges', id);
    const fullChallenge: WeeklyChallenge = {
      id,
      title: challengeData.title || 'Défi Hebdomadaire',
      description: challengeData.description || '',
      theme: (challengeData.theme as any) || 'all',
      targetCount: challengeData.targetCount || 5,
      challengeType: challengeData.challengeType || 'contributions',
      xpReward: challengeData.xpReward || 250,
      badgeRewardId: challengeData.badgeRewardId || 'badge-defi-pecheur',
      badgeRewardName: challengeData.badgeRewardName || 'Maître du Défi',
      badgeRewardIcon: challengeData.badgeRewardIcon || '🎯',
      startDate: challengeData.startDate || new Date().toISOString(),
      endDate: challengeData.endDate || new Date(Date.now() + 7 * 86400000).toISOString(),
      isActive: challengeData.isActive ?? true
    };

    setChallenges(prev => {
      const idx = prev.findIndex(c => c.id === id);
      const next = idx >= 0
        ? prev.map((c, i) => (i === idx ? fullChallenge : c))
        : [fullChallenge, ...prev];
      cacheChallengesLocally(next);
      return next;
    });

    await dualSaveRecord('challenges', id, fullChallenge);
    refreshPendingMutationsCount();

    setActiveChallengeId(id);
    NotificationService.sendLocalNotification('Nouveau Défi Hebdomadaire ! 🎯', {
      body: `Le défi "${fullChallenge.title}" est maintenant disponible.`
    });
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    markIdAsDeleted('challenges', challengeId);
    setChallenges(prev => {
      const next = prev.filter(c => c.id !== challengeId);
      cacheChallengesLocally(next);
      return next;
    });
    await dualDeleteRecord('challenges', challengeId);
    refreshPendingMutationsCount();
  };

  const handleToggleActiveChallenge = async (challengeId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const target = challenges.find(c => c.id === challengeId);
    setChallenges(prev => {
      const next = prev.map(c => (c.id === challengeId ? { ...c, isActive: newStatus } : c));
      cacheChallengesLocally(next);
      return next;
    });
    if (target) {
      await dualSaveRecord('challenges', challengeId, { ...target, isActive: newStatus });
      refreshPendingMutationsCount();
    }
  };

  // Batch import phrases handler (CSV Import - Resumable, Deduplicated & Offline-Resilient)
  const handleBatchImportItems = async (
    incomingItems: QuestionnaireItem[],
    onProgress?: (savedCount: number, totalCount: number) => void
  ) => {
    if (!incomingItems || incomingItems.length === 0) return;

    // 1. Deduplicate against all currently existing items so re-uploading the same file NEVER creates duplicates
    const { newItemsToImport } = deduplicateParsedCsvItems(incomingItems, items);
    if (newItemsToImport.length === 0) {
      onProgress?.(0, 0);
      return;
    }

    for (const it of newItemsToImport) {
      unmarkIdAsDeleted('items', it.id);
    }

    const updatedItemsList = [...newItemsToImport, ...items];
    setItems(updatedItemsList);
    cacheItemsLocally(updatedItemsList);

    // 2. Commit in fast, safe chunks of 250 documents per Firestore writeBatch + RTDB update (or queue offline)
    await dualBatchSaveRecords(
      'items',
      newItemsToImport.map(it => ({ id: it.id, data: it })),
      onProgress
    );

    const updatedTotal = updatedItemsList.length;
    const nextMetrics: SystemMetric = {
      ...systemMetrics,
      id: 'summary',
      totalItems: updatedTotal,
      lastUpdated: new Date().toISOString()
    };
    setSystemMetrics(nextMetrics);
    await dualSaveRecord('metrics', 'summary', nextMetrics);
    refreshPendingMutationsCount();

    NotificationService.sendLocalNotification('Importation Réussie ! 📚', {
      body: `${newItemsToImport.length} nouvelles phrases ont été importées sans aucun doublon.`
    });
  };

  // Dynamic Themes Handlers
  const handleSaveTheme = async (themeData: Partial<ThemeDefinition>) => {
    const themeId = themeData.id || `theme_${Date.now()}`;
    unmarkIdAsDeleted('themes', themeId);
    const fullTheme: ThemeDefinition = {
      id: themeId,
      name: themeData.name || 'Nouveau Thème',
      shortName: themeData.shortName || themeData.name || 'Thème',
      icon: themeData.icon || '🏷️',
      description: themeData.description || '',
      keywords: themeData.keywords || [],
      color: themeData.color || '#0284c7',
      isCustom: true,
      createdAt: themeData.createdAt || new Date().toISOString()
    };

    setThemes(prev => {
      const idx = prev.findIndex(t => t.id === themeId);
      const next = idx >= 0
        ? prev.map((t, i) => (i === idx ? fullTheme : t))
        : [...prev, fullTheme];
      cacheThemesLocally(next);
      return next;
    });

    await dualSaveRecord('themes', themeId, fullTheme);
    refreshPendingMutationsCount();
  };

  const handleDeleteTheme = async (themeId: string) => {
    markIdAsDeleted('themes', themeId);
    setThemes(prev => {
      const next = prev.filter(t => t.id !== themeId);
      cacheThemesLocally(next);
      return next;
    });
    await dualDeleteRecord('themes', themeId);
    refreshPendingMutationsCount();
  };

  const handleBatchRegisterThemes = async (newThemes: ThemeDefinition[]) => {
    for (const th of newThemes) {
      unmarkIdAsDeleted('themes', th.id);
    }
    setThemes(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const toAdd = newThemes.filter(nt => !existingIds.has(nt.id));
      const next = [...prev, ...toAdd];
      cacheThemesLocally(next);
      return next;
    });
    for (const th of newThemes) {
      await dualSaveRecord('themes', th.id, th);
    }
    refreshPendingMutationsCount();
  };

  // Dynamic Badges Handlers
  const handleSaveBadge = async (badgeData: Partial<Badge>) => {
    const badgeId = badgeData.id || `badge_${Date.now()}`;
    unmarkIdAsDeleted('badges', badgeId);
    const fullBadge: Badge = {
      id: badgeId,
      title: badgeData.title || 'Nouveau Badge',
      description: badgeData.description || '',
      icon: badgeData.icon || '🏆',
      category: badgeData.category || 'defi',
      requiredXp: badgeData.requiredXp,
      requiredContributions: badgeData.requiredContributions,
      requiredRecordings: badgeData.requiredRecordings,
      requiredValidations: badgeData.requiredValidations,
      isCustom: true,
      updatedAt: new Date().toISOString()
    };

    setBadges(prev => {
      const idx = prev.findIndex(b => b.id === badgeId);
      const next = idx >= 0
        ? prev.map((b, i) => (i === idx ? fullBadge : b))
        : [...prev, fullBadge];
      cacheBadgesLocally(next);
      return next;
    });

    await dualSaveRecord('badges', badgeId, fullBadge);
    refreshPendingMutationsCount();
  };

  const handleDeleteBadge = async (badgeId: string) => {
    markIdAsDeleted('badges', badgeId);
    setBadges(prev => {
      const next = prev.filter(b => b.id !== badgeId);
      cacheBadgesLocally(next);
      return next;
    });
    await dualDeleteRecord('badges', badgeId);
    refreshPendingMutationsCount();
  };

  // Assainissement & Nettoyage complet Anti-Pollution (Clans, Villages, Fiches, Doublons & Profils fictifs)
  const handleSanitizeAndCleanDatabase = async (): Promise<string> => {
    await ensureFirebaseAuthSession();

    const audit = auditAndSanitizeDatabaseState({
      items,
      clans,
      villages,
      usersList,
      deletedItemIds: getDeletedIds('items'),
      deletedClanIds: getDeletedIds('clans'),
      deletedVillageIds: getDeletedIds('villages')
    });

    // 1. Mise à jour locale et cache IndexedDB
    setClans(audit.cleanedClans);
    cacheClansLocally(audit.cleanedClans);

    setVillages(audit.cleanedVillages);
    cacheVillagesLocally(audit.cleanedVillages);

    setItems(audit.cleanedItems);
    cacheItemsLocally(audit.cleanedItems);

    setUsersList(audit.cleanedUsers);
    cacheUsersLocally(audit.cleanedUsers);

    // 2. Suppression dans Firestore & Realtime Database des IDs obsolètes ou doublons
    for (const cid of audit.clanIdsToRemove) {
      await dualDeleteRecord('clans', cid);
    }
    for (const vid of audit.villageIdsToRemove) {
      await dualDeleteRecord('villages', vid);
    }
    for (const iid of audit.itemIdsToRemove) {
      await dualDeleteRecord('items', iid);
    }
    for (const uid of audit.demoUserIdsToRemove) {
      await dualDeleteRecord('users', uid);
    }

    // 3. Sauvegarde des clans officiels Ôrungu et des fiches corrigées
    if (audit.clansToSave.length > 0) {
      await dualBatchSaveRecords(
        'clans',
        audit.clansToSave.map(cl => ({ id: cl.id, data: cl }))
      );
    }
    if (audit.itemsToSave.length > 0) {
      await dualBatchSaveRecords(
        'items',
        audit.itemsToSave.map(it => ({ id: it.id, data: it }))
      );
    }

    // 4. Mise à jour des compteurs officiels (seed_status & summary)
    const updatedSeedStatus: SeedStatus = {
      isSeeded: true,
      seededAt: seedStatus?.seededAt || new Date().toISOString(),
      seededBy: currentUser?.id || 'admin',
      seededByName: currentUser?.fullName || currentUser?.displayName || 'Admin',
      itemsCount: audit.cleanedItems.length,
      clansCount: audit.cleanedClans.length,
      villagesCount: audit.cleanedVillages.length,
      themesCount: themes.length,
      badgesCount: badges.length,
      version: '1.1.0-ompagano-clean'
    };
    await dualSaveRecord('metrics', 'seed_status', updatedSeedStatus);
    setSeedStatus(updatedSeedStatus);

    const updatedSummary: SystemMetric = {
      id: 'summary',
      totalItems: audit.cleanedItems.length,
      totalContributions: contributions.length,
      totalRecordings: contributions.filter(c => !!c.audioUrl).length,
      totalValidated: contributions.filter(c => c.status === 'approved').length,
      totalUsers: audit.cleanedUsers.length,
      lastUpdated: new Date().toISOString()
    };
    await dualSaveRecord('metrics', 'summary', updatedSummary);
    setSystemMetrics(updatedSummary);
    refreshPendingMutationsCount();

    const report = `Base assainie : ${audit.cleanedClans.length} clans valides (${audit.clanIdsToRemove.length} obsolètes/doublons purgés), ${audit.cleanedVillages.length} villages (${audit.villageIdsToRemove.length} purgés), ${audit.cleanedItems.length} fiches (${audit.itemIdsToRemove.length} doublons supprimés, ${audit.itemsToSave.length} fiches mises à jour).`;
    NotificationService.sendLocalNotification('Base de données assainie 🧹', {
      body: report
    });
    return report;
  };

  // Full bidirectional Database Sync (Items, Clans, Villages, Users, Contributions, Metrics)
  const handleTriggerCloudSync = async () => {
    await ensureFirebaseAuthSession();
    await syncPendingOfflineData();

    // 1. Sync all Items in fast 250-doc batches (supports 10,000+ items cleanly)
    await dualBatchSaveRecords(
      'items',
      items.map(it => ({ id: it.id, data: it }))
    );

    // 2. Sync all Clans
    for (const cl of clans) {
      await dualSaveRecord('clans', cl.id, cl);
    }

    // 3. Sync all Villages
    for (const vi of villages) {
      await dualSaveRecord('villages', vi.id, vi);
    }

    // 4. Sync all Users
    for (const u of usersList) {
      await dualSaveRecord('users', u.id, u);
    }

    // 5. Sync Challenges, Themes, Badges
    for (const ch of challenges) {
      await dualSaveRecord('challenges', ch.id, ch);
    }
    for (const th of themes) {
      await dualSaveRecord('themes', th.id, th);
    }
    for (const bg of badges) {
      await dualSaveRecord('badges', bg.id, bg);
    }

    // 6. Metrics Summary
    const metricsPayload: SystemMetric = {
      id: 'summary',
      totalItems: items.length,
      totalContributions: contributions.length,
      totalRecordings: contributions.filter(c => !!c.audioUrl).length,
      totalValidated: contributions.filter(c => c.status === 'approved').length,
      totalUsers: usersList.length,
      lastUpdated: new Date().toISOString()
    };

    await dualSaveRecord('metrics', 'summary', metricsPayload);
    setSystemMetrics(metricsPayload);

    // 7. Ensure Seed Status Marker is also present in both Firestore & Realtime Database
    const markerPayload: SeedStatus = seedStatus || {
      isSeeded: true,
      seededAt: new Date().toISOString(),
      seededBy: currentUser?.id || 'admin',
      seededByName: currentUser?.fullName || currentUser?.displayName || 'Admin',
      itemsCount: items.length,
      clansCount: clans.length,
      villagesCount: villages.length,
      themesCount: themes.length,
      badgesCount: badges.length,
      version: '1.0.0-ompagano'
    };
    await dualSaveRecord('metrics', 'seed_status', markerPayload);
    setSeedStatus(markerPayload);
    refreshPendingMutationsCount();

    NotificationService.sendLocalNotification('Base de données synchronisée ☁️', {
      body: `${items.length} questions, ${clans.length} clans et ${villages.length} villages synchronisés avec Firebase.`
    });
  };

  // Active challenge selection & Tribe filter for questions
  const activeChallenge = challenges.find(c => c.id === activeChallengeId) || challenges[0];

  const tribeItemCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of MYENE_TRIBES) {
      counts[t] = 0;
    }
    for (const it of items) {
      const tName = mapDialectToTribeName(it.dialect);
      counts[tName] = (counts[tName] || 0) + 1;
    }
    return counts;
  }, [items]);

  const displayedItems = React.useMemo(() => {
    let base = items;
    if (selectedQuestionTribe !== 'all') {
      const byTribe = base.filter(
        item => mapDialectToTribeName(item.dialect) === selectedQuestionTribe
      );
      if (byTribe.length > 0) {
        base = byTribe;
      }
    }
    if (isChallengeFilterActive && activeChallenge && activeChallenge.theme !== 'all') {
      const byChallenge = base.filter(
        item => item.category === activeChallenge.theme || item.theme === activeChallenge.theme
      );
      if (byChallenge.length > 0) {
        base = byChallenge;
      }
    }
    return base;
  }, [items, selectedQuestionTribe, isChallengeFilterActive, activeChallenge]);

  // Navigation handlers
  const handleNextExpression = () => {
    if (currentItemIndex < displayedItems.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
    } else {
      setCurrentItemIndex(0);
    }
  };

  const handlePrevExpression = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
    }
  };

  // RBAC Tab Navigation handler
  const handleTabNavigation = (tab: AppTab) => {
    if (tab === 'admin' && currentUser?.role !== 'admin') {
      return;
    }
    if (tab === 'validator' && currentUser?.role !== 'validator' && currentUser?.role !== 'admin') {
      return;
    }
    setCurrentTab(tab);
  };

  // Guard active tab against role change
  useEffect(() => {
    if (currentUser) {
      if (currentTab === 'admin' && currentUser.role !== 'admin') {
        setCurrentTab('crowdsource');
      }
      if (currentTab === 'validator' && currentUser.role !== 'validator' && currentUser.role !== 'admin') {
        setCurrentTab('crowdsource');
      }
    }
  }, [currentUser?.role, currentTab]);

  const currentItem = displayedItems[currentItemIndex] || displayedItems[0] || items[0] || null;
  const totalPendingOfflineCount = pendingOfflineSubmissions.length + pendingAdminMutationsCount;

  // SESSION RESTORATION / AUTOMATIC RECONNECTION LOADING SCREEN
  if (isAuthChecking && !currentUser) {
    let cachedUserPreview: Partial<UserProfile> | null = null;
    try {
      const raw = localStorage.getItem('nkala_authenticated_user');
      if (raw) cachedUserPreview = JSON.parse(raw);
    } catch {}

    return (
      <div className="african-pattern-bg min-h-screen text-[#fdfaf7] flex flex-col items-center justify-center p-6 font-sans">
        <AppUpdateBanner />
        <div className="max-w-md w-full bg-[#1a1310]/95 border border-[#4a3525] rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#e67e22]/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#d35400]/15 rounded-full blur-2xl pointer-events-none" />

          {/* Animated Spinner */}
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-[#3a281d]" />
            <div className="absolute inset-0 rounded-full border-4 border-t-[#e67e22] border-r-[#f39c12] border-b-transparent border-l-transparent animate-spin" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e67e22] to-[#d35400] flex items-center justify-center shadow-lg">
              <span className="text-xl font-black text-white tracking-tighter">OM</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#e67e22]/15 border border-[#e67e22]/40 text-[#f39c12] text-xs font-bold uppercase tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-[#f39c12] animate-pulse" />
            Connexion automatique en cours
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-[#fdfaf7] mb-2">
            {cachedUserPreview?.fullName || cachedUserPreview?.displayName
              ? `Bon retour, ${cachedUserPreview.fullName || cachedUserPreview.displayName} !`
              : 'Restauration de votre session OMPAGANO...'}
          </h1>

          <p className="text-sm text-[#c2a896] leading-relaxed mb-6">
            Veuillez patienter quelques instants pendant la reconnexion sécurisée à votre compte et la synchronisation de vos données.
            <strong className="block text-[#f5efe6] mt-1.5 font-medium">
              Vous n'avez pas besoin d'appuyer sur « Se connecter ».
            </strong>
          </p>

          {cachedUserPreview?.email && (
            <div className="bg-[#241a15] border border-[#3a2a22] rounded-xl px-4 py-2.5 text-xs text-[#d5c3b5] inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Compte détecté : <strong className="text-white">{cachedUserPreview.email}</strong></span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MANDATORY AUTHENTICATION GATE:
  if (!currentUser) {
    return (
      <>
        <AppUpdateBanner />
        <AuthGateScreen
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="african-pattern-bg min-h-screen text-[#fdfaf7] flex flex-col font-sans">
      {/* Code Update Banner if new version available */}
      <AppUpdateBanner />

      {/* Top Navbar with OMPAGANO Branding */}
      <Navbar
        currentUser={currentUser}
        isOnline={isOnline}
        pendingOfflineCount={totalPendingOfflineCount}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenNotifications={() => {
          setIsNotificationModalOpen(true);
          setUnreadNotificationsCount(0);
        }}
        onOpenOfflinePack={() => setIsOfflinePackModalOpen(true)}
        onOpenVisualGuide={() => {
          setIsPostOnboardingGuide(false);
          setIsVisualGuideOpen(true);
        }}
        onSyncOffline={syncPendingOfflineData}
        onSignOut={() => {
          try {
            localStorage.removeItem('nkala_authenticated_user');
          } catch {}
          fbSignOut(auth).catch(() => {});
          currentUserRef.current = null;
          setCurrentUser(null);
        }}
        currentTab={currentTab}
        onSelectTab={handleTabNavigation}
      />

      {/* Persistent Reminder Banner for Already-Registered Users who have not yet accepted Platform Terms & Data Usage Consent */}
      {currentUser.registrationCompleted && (!currentUser.termsAccepted || !currentUser.dataUsageAccepted) && (
        <div className="bg-gradient-to-r from-[#7c2d12] via-[#9a3412] to-[#78350f] border-b border-[#f59e0b]/60 px-4 py-3 shadow-lg">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-[#f59e0b]/20 border border-[#f59e0b]/50 flex items-center justify-center text-base shrink-0">
                📜
              </span>
              <div className="text-xs leading-relaxed">
                <span className="font-black text-[#fde047] uppercase tracking-wider mr-2">
                  Rappel Contributeur Enregistré :
                </span>
                <span className="text-white font-medium">
                  Veuillez accepter les <strong>Conditions Générales de Contribution Individuelle (OMPAGANO / NKALA – Essaka Engineering)</strong> et valider l'utilisation de vos données pour poursuivre vos contributions et débloquer vos points, badges et récompenses d'accomplissement.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setIsTermsConsentModalOpen(true)}
                className="px-4 py-1.5 rounded-xl bg-[#f59e0b] hover:bg-[#fbbf24] text-[#180d07] font-black text-xs shadow-md transition active:scale-95"
              >
                Lire & Accepter les Conditions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3.5 sm:p-6">
        {currentTab === 'crowdsource' && (
          <>
            {currentItem ? (
              <CrowdsourceCard
                item={currentItem}
                currentUser={currentUser}
                isOnline={isOnline}
                onNext={handleNextExpression}
                onPrev={handlePrevExpression}
                hasPrev={currentItemIndex > 0}
                hasNext={currentItemIndex < displayedItems.length - 1}
                currentIndex={currentItemIndex}
                totalCount={displayedItems.length}
                onSubmitContribution={handleSaveContribution}
                onRewardEarned={handleRewardEarned}
                challenges={challenges.filter(c => c.isActive)}
                activeChallengeId={activeChallengeId}
                onSelectChallenge={setActiveChallengeId}
                userChallengeProgress={currentUser?.weeklyProgress?.[activeChallengeId] || 0}
                isChallengeCompleted={currentUser?.completedChallenges?.includes(activeChallengeId) || false}
                isChallengeFilterActive={isChallengeFilterActive}
                onToggleChallengeFilter={() => {
                  setIsChallengeFilterActive(prev => !prev);
                  setCurrentItemIndex(0);
                }}
                filteredChallengeItemsCount={items.filter(i => i.category === activeChallenge?.theme || i.theme === activeChallenge?.theme).length}
                onOpenVisualGuide={() => {
                  setIsPostOnboardingGuide(false);
                  setIsVisualGuideOpen(true);
                }}
                selectedQuestionTribe={selectedQuestionTribe}
                onSelectQuestionTribe={(tribe) => {
                  setSelectedQuestionTribe(tribe);
                  setCurrentItemIndex(0);
                }}
                tribeItemCounts={tribeItemCounts}
                totalCorpusCount={items.length}
              />
            ) : (
              <div className="bg-[#1b1411]/90 border border-[#3a2a22] rounded-2xl p-8 text-center my-8">
                <p className="text-lg font-semibold text-[#f5efe6] mb-2">Aucune fiche disponible pour le moment</p>
                <p className="text-sm text-[#c2a896] mb-4">
                  Toutes les fiches ont été supprimées ou aucune fiche n'est encore publiée dans la base de données.
                </p>
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => setCurrentTab('admin')}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition"
                  >
                    Ouvrir l'Administration pour ajouter des fiches
                  </button>
                )}
              </div>
            )}

            {/* Interactive FAQ Section on the Main Page with Real-Time Text Search */}
            <ContributionFaqSection
              userTribe={currentUser?.tribe}
              selectedTribeFilter={selectedQuestionTribe}
              onSelectTribeFilter={(tribe) => {
                setSelectedQuestionTribe(tribe);
                setCurrentItemIndex(0);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}

        {currentTab === 'explore' && (
          <VocabularyExplorer
            items={items}
            themes={themes}
            clans={clans}
            villages={villages}
            currentUser={currentUser}
            contributions={contributions}
            usersList={usersList}
            favoriteItemIds={favoriteItemIds}
            onToggleFavorite={handleToggleFavoriteItem}
            onSelectExpression={(index) => {
              setIsChallengeFilterActive(false);
              setCurrentItemIndex(index);
              setCurrentTab('crowdsource');
            }}
          />
        )}

        {currentTab === 'leaderboard' && (
          <LeaderboardAndRewards
            currentUser={currentUser}
            leaderboardUsers={usersList}
            badges={badges}
          />
        )}

        {/* Dedicated Validator Workspace: Oral vs Written nuance */}
        {currentTab === 'validator' && (currentUser?.role === 'validator' || currentUser?.role === 'admin') && (
          <ValidatorWorkspace
            contributions={contributions}
            currentUser={currentUser}
            onValidateGranular={handleValidateGranular}
          />
        )}

        {/* Administration: ONLY for Admins */}
        {currentTab === 'admin' && currentUser?.role === 'admin' && (
          <AdminDashboard
            items={items}
            contributions={contributions}
            systemMetrics={systemMetrics}
            usersList={usersList}
            challenges={challenges}
            themes={themes}
            badges={badges}
            onValidateContribution={handleValidateContribution}
            onDeleteContribution={handleDeleteContribution}
            onSaveQuestionnaireItem={handleSaveQuestionnaireItem}
            onDeleteQuestionnaireItem={handleDeleteQuestionnaireItem}
            onBatchImportItems={handleBatchImportItems}
            onSaveChallenge={handleSaveChallenge}
            onDeleteChallenge={handleDeleteChallenge}
            onToggleActiveChallenge={handleToggleActiveChallenge}
            onSaveTheme={handleSaveTheme}
            onDeleteTheme={handleDeleteTheme}
            onBatchRegisterThemes={handleBatchRegisterThemes}
            onSaveBadge={handleSaveBadge}
            onDeleteBadge={handleDeleteBadge}
            clans={clans}
            villages={villages}
            onSaveClan={handleSaveClan}
            onDeleteClan={handleDeleteClan}
            onSaveVillage={handleSaveVillage}
            onDeleteVillage={handleDeleteVillage}
            onBatchImportClans={handleBatchImportClans}
            onBatchImportVillages={handleBatchImportVillages}
            onUpdateUserLevelAndBadges={handleUpdateUserLevelAndBadges}
            onUpdateUserAccountStatus={handleUpdateUserAccountStatus}
            onUpdateUserRole={handleUpdateUserRole}
            onTriggerCloudSync={handleTriggerCloudSync}
            onSanitizeDatabase={handleSanitizeAndCleanDatabase}
            currentUser={currentUser}
            seedStatus={seedStatus}
            onExecuteInitialSeed={handleExecuteInitialSeed}
            isSeedingDatabase={isSeedingDatabase}
          />
        )}

        {currentTab === 'profile' && (
          <UserProfileView
            currentUser={currentUser}
            contributions={contributions}
            items={items}
            favoriteItemIds={favoriteItemIds}
            onToggleFavorite={handleToggleFavoriteItem}
            onSelectExpression={(index) => {
              setIsChallengeFilterActive(false);
              setCurrentItemIndex(index);
              setCurrentTab('crowdsource');
            }}
            onNavigateToExplorer={() => setCurrentTab('explore')}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenOnboarding={() => setIsOnboardingModalOpen(true)}
            onOpenTermsConsent={() => setIsTermsConsentModalOpen(true)}
            onOpenOfflinePack={() => setIsOfflinePackModalOpen(true)}
            onOpenVisualGuide={() => {
              setIsPostOnboardingGuide(false);
              setIsVisualGuideOpen(true);
            }}
            onSignOut={() => {
              try {
                localStorage.removeItem('nkala_authenticated_user');
              } catch {}
              fbSignOut(auth).catch(() => {});
              currentUserRef.current = null;
              setCurrentUser(null);
            }}
            onClearOfflineCache={() => {
              indexedDB.deleteDatabase('nkala_enenga_offline_db');
              setPendingOfflineSubmissions([]);
              alert('Cache hors-ligne réinitialisé.');
            }}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={handleTabNavigation}
        userRole={currentUser?.role}
        pendingCount={contributions.filter(c => c.status === 'pending').length}
      />

      {/* Mandatory Onboarding & Filiation Modal (Gating if not completed) */}
      <OnboardingModal
        isOpen={isOnboardingModalOpen || (currentUser !== null && !currentUser.registrationCompleted)}
        currentUser={currentUser}
        clans={clans}
        villages={villages}
        onComplete={handleCompleteOnboarding}
        onAddNewClan={handleAddNewClan}
        onAddNewVillage={handleAddNewVillage}
        onOpenFullContractModal={() => setIsTermsConsentModalOpen(true)}
      />

      {/* Post-Onboarding Visual Guide & Application Objectives Modal */}
      <VisualGuideModal
        isOpen={isVisualGuideOpen && !isOnboardingModalOpen && !isTermsConsentModalOpen}
        currentUser={currentUser}
        isPostOnboarding={isPostOnboardingGuide}
        onClose={() => setIsVisualGuideOpen(false)}
        onNavigateTab={(tab) => handleTabNavigation(tab)}
      />

      {/* Platform Terms & Data Usage Consent Modal (Annexe 1 + Partnership Contract + Reminder for Existing Users) */}
      <TermsConsentModal
        isOpen={isTermsConsentModalOpen}
        currentUser={currentUser}
        isReminderForExistingUser={
          !!(currentUser && currentUser.registrationCompleted && (!currentUser.termsAccepted || !currentUser.dataUsageAccepted))
        }
        onAcceptConsent={handleAcceptTermsConsent}
        onClose={() => setIsTermsConsentModalOpen(false)}
      />

      {/* Offline Pack Manager Modal */}
      <OfflinePackModal
        isOpen={isOfflinePackModalOpen}
        onClose={() => setIsOfflinePackModalOpen(false)}
        items={items}
        isOnline={isOnline}
        onSyncPendingQueue={syncPendingOfflineData}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(profile) => {
          handleLoginSuccess(profile);
          setIsAuthModalOpen(false);
        }}
      />

      {/* Notification Center */}
      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />

      {/* Challenge Celebration Modal */}
      <ChallengeCelebrationModal
        challenge={celebrationChallenge}
        isOpen={!!celebrationChallenge}
        onClose={() => setCelebrationChallenge(null)}
        onViewBadges={() => {
          setCelebrationChallenge(null);
          setCurrentTab('profile');
        }}
      />
    </div>
  );
}
