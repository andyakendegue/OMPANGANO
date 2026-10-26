import React, { useState, useEffect } from 'react';
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
  dualDeleteRecord,
  ensureFirebaseAuthSession,
  convertBlobToBase64,
  replayPendingOfflineAdminMutations,
  checkIsAdminEmail,
  isRealtimeDatabaseEmpty
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
  getLevelForXp 
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
  getCachedVillagesLocally
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

const DELETED_RECORDS_STORAGE_KEY = 'nkala_deleted_records_v1';

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

  // Data states (filtered against any locally deleted IDs)
  const [items, setItems] = useState<QuestionnaireItem[]>(() =>
    INITIAL_ENENGA_ITEMS.filter(i => !getDeletedIds('items').has(i.id))
  );
  const [currentItemIndex, setCurrentItemIndex] = useState<number>(0);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [clans, setClans] = useState<ClanRegistry[]>(() =>
    INITIAL_CLANS.filter(c => !getDeletedIds('clans').has(c.id))
  );
  const [villages, setVillages] = useState<VillageRegistry[]>(() =>
    INITIAL_VILLAGES.filter(v => !getDeletedIds('villages').has(v.id))
  );

  // Weekly Challenges states
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>(() =>
    INITIAL_WEEKLY_CHALLENGES.filter(c => !getDeletedIds('challenges').has(c.id))
  );
  const [activeChallengeId, setActiveChallengeId] = useState<string>('defi-peche-semaine');
  const [isChallengeFilterActive, setIsChallengeFilterActive] = useState<boolean>(false);
  const [celebrationChallenge, setCelebrationChallenge] = useState<WeeklyChallenge | null>(null);

  // Dynamic Themes & Dynamic Badges states
  const [themes, setThemes] = useState<ThemeDefinition[]>(() =>
    THEMATIC_CATEGORIES.filter(t => !getDeletedIds('themes').has(t.id))
  );
  const [badges, setBadges] = useState<Badge[]>(() =>
    SYSTEM_BADGES.filter(b => !getDeletedIds('badges').has(b.id))
  );

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

  // Seed status state (tracking official Firebase seed marker /metrics/seed_status)
  const [seedStatus, setSeedStatus] = useState<SeedStatus | null>(null);
  const [isSeedingDatabase, setIsSeedingDatabase] = useState<boolean>(false);

  // Auth & user state: null by default (unauthenticated users must log in on AuthGateScreen)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isFirebaseAuthReady, setIsFirebaseAuthReady] = useState<boolean>(false);

  // Registered users for admin management and fraud detection
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
      paternalClan: 'Ilongo n\'Adjena',
      maternalClan: 'Agenjé',
      villageOfOrigin: 'Alumbè (Ogooué-Maritime)',
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
    },
    {
      id: 'u-mboumba',
      displayName: 'Mboumba Éric',
      fullName: 'Mboumba Éric Daniel',
      contact: '+241 077 12 34 56',
      birthDate: '1988-11-20',
      birthPlace: 'Port-Gentil',
      tribe: 'Galoa',
      paternalClan: 'Agulamba',
      maternalClan: 'Ogula',
      villageOfOrigin: 'Adolinanongo',
      registrationCompleted: true,
      role: 'user',
      status: 'active',
      suspicionScore: 5,
      xp: 1420,
      level: 'Maître de la Parole',
      levelIndex: 4,
      contributionsCount: 21,
      recordingsCount: 16,
      validationsCount: 8,
      streakDays: 4,
      badges: ['badge-genealogie-verifiee', 'badge-premiere-voix', 'badge-dix-traductions'],
      createdAt: '2026-01-05T00:00:00Z',
      updatedAt: '2026-01-05T00:00:00Z'
    },
    {
      id: 'u-kombila',
      displayName: 'Kombila Rose',
      fullName: 'Kombila Rose Marie',
      contact: '+241 066 98 76 54',
      birthDate: '1995-03-08',
      birthPlace: 'Fernan Vaz',
      tribe: 'Nkomi',
      paternalClan: 'Asiga',
      maternalClan: 'Agwempolo',
      villageOfOrigin: 'Sainte-Anne du Fernan Vaz',
      registrationCompleted: true,
      role: 'validator',
      status: 'active',
      suspicionScore: 0,
      xp: 980,
      level: 'Gardien du Verbe',
      levelIndex: 3,
      contributionsCount: 15,
      recordingsCount: 12,
      validationsCount: 10,
      streakDays: 3,
      badges: ['badge-genealogie-verifiee', 'badge-premiere-voix', 'badge-cinq-validations'],
      createdAt: '2026-01-08T00:00:00Z',
      updatedAt: '2026-01-08T00:00:00Z'
    },
    {
      id: 'u-suspect-1',
      displayName: 'Inconnu-77',
      fullName: 'John Unknown',
      contact: 'test999@tempmail.com',
      birthDate: '2000-01-01',
      birthPlace: 'Inconnu',
      tribe: 'Mpongwè',
      paternalClan: 'Avandji',
      maternalClan: 'Avandji',
      villageOfOrigin: 'Non spécifié',
      registrationCompleted: true,
      role: 'user',
      status: 'flagged',
      suspicionScore: 85,
      xp: 0,
      level: 'Initié Curieux',
      levelIndex: 1,
      contributionsCount: 0,
      recordingsCount: 0,
      validationsCount: 0,
      streakDays: 0,
      badges: [],
      createdAt: '2026-01-14T00:00:00Z',
      updatedAt: '2026-01-14T00:00:00Z'
    },
    {
      id: 'u-suspect-2',
      displayName: 'Observer_Gbn',
      fullName: 'Pierre Observateur',
      contact: '+33 6 00 00 00 00',
      birthDate: '1999-05-12',
      birthPlace: 'Paris',
      tribe: 'Ôrungu',
      paternalClan: 'Inconnu',
      maternalClan: 'Inconnu',
      villageOfOrigin: '',
      registrationCompleted: true,
      role: 'user',
      status: 'flagged',
      suspicionScore: 70,
      xp: 0,
      level: 'Initié Curieux',
      levelIndex: 1,
      contributionsCount: 0,
      recordingsCount: 0,
      validationsCount: 0,
      streakDays: 0,
      badges: [],
      createdAt: '2026-01-16T00:00:00Z',
      updatedAt: '2026-01-16T00:00:00Z'
    }
  ]);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isOfflinePackModalOpen, setIsOfflinePackModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(1);

  // Monitor online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // 1. Replay queued admin modifications (items, clans, villages, challenges, themes, badges)
      try {
        const replayed = await replayPendingOfflineAdminMutations();
        if (replayed > 0) {
          NotificationService.sendLocalNotification('Connexion Rétablie ⚡', {
            body: `${replayed} modification(s) administrative(s) synchronisée(s) avec Firebase.`
          });
        }
      } catch (err) {
        console.warn('Erreur synchronisation admin replay:', err);
      }
      // 2. Replay voice & text submissions
      await syncPendingOfflineData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of offline storage & hydrate local IndexedDB cache for Airplane Mode
    getPendingOfflineContributions().then(pending => {
      setPendingOfflineSubmissions(pending);
    });
    const deletedItemsSet = getDeletedIds('items');
    getCachedItemsLocally().then(cached => {
      const filtered = (cached || []).filter(i => !deletedItemsSet.has(i.id));
      if (filtered.length > 0) {
        setItems(filtered);
      } else if (!isDatabaseMarkedSeeded()) {
        cacheItemsLocally(INITIAL_ENENGA_ITEMS.filter(i => !deletedItemsSet.has(i.id)));
      }
    });
    const deletedClansSet = getDeletedIds('clans');
    getCachedClansLocally().then(cached => {
      const filtered = (cached || []).filter(c => !deletedClansSet.has(c.id));
      if (filtered.length > 0) {
        setClans(filtered);
      } else if (!isDatabaseMarkedSeeded()) {
        cacheClansLocally(INITIAL_CLANS.filter(c => !deletedClansSet.has(c.id)));
      }
    });
    const deletedVillagesSet = getDeletedIds('villages');
    getCachedVillagesLocally().then(cached => {
      const filtered = (cached || []).filter(v => !deletedVillagesSet.has(v.id));
      if (filtered.length > 0) {
        setVillages(filtered);
      } else if (!isDatabaseMarkedSeeded()) {
        cacheVillagesLocally(INITIAL_VILLAGES.filter(v => !deletedVillagesSet.has(v.id)));
      }
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
          setCurrentUser(parsedSaved);
          setIsOnboardingModalOpen(!parsedSaved.registrationCompleted);
          setIsAuthChecking(false);
        }
      }
    } catch {}

    // 1. Cross-tab storage synchronization: when Tab 1 completes onboarding, Tab 2 updates immediately
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nkala_authenticated_user' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.id) {
            if (checkIsAdminEmail(parsed.email) && parsed.role !== 'admin') {
              parsed.role = 'admin';
            }
            setCurrentUser(parsed);
            if (parsed.registrationCompleted) {
              setIsOnboardingModalOpen(false);
            }
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
        try {
          const cachedRaw = localStorage.getItem('nkala_authenticated_user');
          if (cachedRaw) {
            const cachedProfile = JSON.parse(cachedRaw) as UserProfile;
            if (cachedProfile && cachedProfile.id === fbUser.uid) {
              if (isSuperAdmin && cachedProfile.role !== 'admin') {
                cachedProfile.role = 'admin';
              }
              setCurrentUser(cachedProfile);
              setIsOnboardingModalOpen(!cachedProfile.registrationCompleted);
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

        // Replay any pending offline admin mutations now that we have a valid Firebase Auth token
        if (typeof navigator === 'undefined' || navigator.onLine) {
          replayPendingOfflineAdminMutations().catch(() => {});
        }

        // Query Firestore to see if user profile already exists with full filiation!
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            let cloudProfile = userDoc.data() as UserProfile;

            // MANDATORY: Ensure andymigoumbi@gmail.com is unconditionally role 'admin'
            // If they are not admin yet, upgrade their profile in Firestore & RTDB before granting access to UI!
            if (isSuperAdmin && cloudProfile.role !== 'admin') {
              cloudProfile = {
                ...cloudProfile,
                role: 'admin',
                updatedAt: new Date().toISOString()
              };
              await dualSaveRecord('users', fbUser.uid, { role: 'admin', updatedAt: cloudProfile.updatedAt });
              await dualSaveRecord('admins', fbUser.uid, {
                userId: fbUser.uid,
                email: fbUser.email,
                role: 'admin',
                updatedAt: new Date().toISOString()
              });
            }

            setCurrentUser(cloudProfile);
            try {
              localStorage.setItem('nkala_authenticated_user', JSON.stringify(cloudProfile));
            } catch {}
            if (cloudProfile.registrationCompleted) {
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

        // 3. Create and persist user profile in Firestore & RTDB immediately upon first login!
        const isAdmin = isSuperAdmin || (fbUser.email && fbUser.email.toLowerCase().includes('admin')) || false;
        const initialProfile: UserProfile = {
          id: fbUser.uid,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Contributeur OMPAGANO',
          fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Locuteur Myènè',
          contact: fbUser.email || fbUser.phoneNumber || '',
          birthDate: '',
          birthPlace: '',
          tribe: 'Enenga',
          paternalClan: '',
          maternalClan: '',
          villageOfOrigin: '',
          registrationCompleted: false,
          email: fbUser.email || '',
          phoneNumber: fbUser.phoneNumber || '',
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Persist immediately to Firestore and RTDB so Google users are created in database at login!
        await dualSaveRecord('users', initialProfile.id, initialProfile);
        if (isAdmin) {
          await dualSaveRecord('admins', initialProfile.id, {
            userId: initialProfile.id,
            email: initialProfile.email,
            role: 'admin',
            updatedAt: new Date().toISOString()
          });
        }

        try {
          localStorage.setItem('nkala_authenticated_user', JSON.stringify(initialProfile));
        } catch {}

        setCurrentUser(initialProfile);
        setUsersList(prev => [initialProfile, ...prev.filter(u => u.id !== initialProfile.id)]);
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
        setCurrentUser(null);
      }
      setIsAuthChecking(false);
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsubscribe();
    };
  }, []);

  // Firestore Real-time subscriptions & Seed Status - Active ONLY when currentUser AND Firebase Auth are ready
  useEffect(() => {
    if (!currentUser || !isFirebaseAuthReady || !auth.currentUser) return;

    // 0. Subscribe to Seed Status Marker (/metrics/seed_status)
    const unsubscribeSeed = onSnapshot(
      doc(db, 'metrics', 'seed_status'),
      (snapshot) => {
        if (snapshot.exists()) {
          const status = snapshot.data() as SeedStatus;
          setSeedStatus(status);
          if (status?.isSeeded) {
            markDatabaseSeeded();
          }
        } else if (!snapshot.metadata.fromCache) {
          setSeedStatus(null);
        }
      },
      (err) => {
        console.warn('Notice listening to seed_status:', err);
      }
    );

    // 1. Subscribe to Items collection
    const itemsPath = 'items';
    const unsubscribeItems = onSnapshot(
      collection(db, itemsPath),
      (snapshot) => {
        const deletedSet = getDeletedIds('items');
        if (!snapshot.empty) {
          markDatabaseSeeded();
          const loaded: QuestionnaireItem[] = [];
          snapshot.forEach(docSnap => {
            if (!deletedSet.has(docSnap.id)) {
              loaded.push({ id: docSnap.id, ...docSnap.data() } as QuestionnaireItem);
            }
          });
          setItems(loaded);
          cacheItemsLocally(loaded);
        } else {
          if (isDatabaseMarkedSeeded()) {
            setItems([]);
            cacheItemsLocally([]);
          } else {
            getCachedItemsLocally().then(cached => {
              const filteredCache = (cached || []).filter(i => !deletedSet.has(i.id));
              if (filteredCache.length > 0 && deletedSet.size === 0) {
                setItems(filteredCache);
              } else {
                const remainingInitial = INITIAL_ENENGA_ITEMS.filter(i => !deletedSet.has(i.id));
                setItems(remainingInitial);
                cacheItemsLocally(remainingInitial);
              }
            });
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, itemsPath);
        const deletedSet = getDeletedIds('items');
        getCachedItemsLocally().then(cached => {
          const filteredCache = (cached || []).filter(i => !deletedSet.has(i.id));
          if (filteredCache.length > 0) setItems(filteredCache);
          else if (!isDatabaseMarkedSeeded()) {
            setItems(INITIAL_ENENGA_ITEMS.filter(i => !deletedSet.has(i.id)));
          }
        });
      }
    );

    // 2. Subscribe to Contributions collection
    const contribPath = 'contributions';
    const unsubscribeContrib = onSnapshot(
      collection(db, contribPath),
      (snapshot) => {
        const deletedSet = getDeletedIds('contributions');
        const loaded: Contribution[] = [];
        snapshot.forEach(docSnap => {
          if (!deletedSet.has(docSnap.id)) {
            loaded.push({ id: docSnap.id, ...docSnap.data() } as Contribution);
          }
        });
        if (!snapshot.empty || isDatabaseMarkedSeeded() || deletedSet.size > 0) {
          setContributions(loaded);
        } else {
          const sampleContribs: Contribution[] = [
            {
              id: 'c-01',
              itemId: 'nkala-enenga-01',
              userId: 'user-mboumba',
              userDisplayName: 'Mboumba E.',
              frenchText: 'Bonjour à tous / Salutations fraternelles',
              originalMyeneText: 'Mbolo vana',
              isSpellingCorrect: true,
              proposedSpelling: 'Mbolo vana',
              status: 'approved' as ContributionStatus,
              createdAt: '2026-01-11T12:00:00Z'
            },
            {
              id: 'c-02',
              itemId: 'nkala-enenga-03',
              userId: 'user-kombila',
              userDisplayName: 'Kombila R.',
              frenchText: 'La pirogue glisse sur les eaux calmes du lac',
              originalMyeneText: 'Irende si bendi go nongo y’omvwa',
              isSpellingCorrect: false,
              proposedSpelling: 'Irende si bendi go nongo y’omvua',
              dialectVariant: 'galwa',
              comment: 'Prononciation avec "u" doux vers Lambaréné.',
              status: 'pending' as ContributionStatus,
              createdAt: '2026-01-13T15:30:00Z'
            }
          ].filter(c => !deletedSet.has(c.id));
          setContributions(sampleContribs);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, contribPath);
      }
    );

    // 3. Subscribe to Metrics
    const metricsPath = 'metrics/summary';
    const unsubscribeMetrics = onSnapshot(
      doc(db, 'metrics', 'summary'),
      (snapshot) => {
        if (snapshot.exists()) {
          setSystemMetrics(snapshot.data() as SystemMetric);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, metricsPath);
      }
    );

    // 4. Subscribe to Weekly Challenges
    const challengesPath = 'challenges';
    const unsubscribeChallenges = onSnapshot(
      collection(db, challengesPath),
      (snapshot) => {
        const deletedSet = getDeletedIds('challenges');
        if (!snapshot.empty) {
          const loaded: WeeklyChallenge[] = [];
          snapshot.forEach(docSnap => {
            if (!deletedSet.has(docSnap.id)) {
              loaded.push({ id: docSnap.id, ...docSnap.data() } as WeeklyChallenge);
            }
          });
          setChallenges(loaded);
        } else if (isDatabaseMarkedSeeded()) {
          setChallenges([]);
        } else {
          setChallenges(INITIAL_WEEKLY_CHALLENGES.filter(c => !deletedSet.has(c.id)));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, challengesPath);
      }
    );

    // 5. Subscribe to Dynamic Themes
    const themesPath = 'themes';
    const unsubscribeThemes = onSnapshot(
      collection(db, themesPath),
      (snapshot) => {
        const deletedSet = getDeletedIds('themes');
        if (!snapshot.empty) {
          const loaded: ThemeDefinition[] = [];
          snapshot.forEach(docSnap => {
            if (!deletedSet.has(docSnap.id)) {
              loaded.push({ id: docSnap.id, ...docSnap.data() } as ThemeDefinition);
            }
          });
          setThemes(loaded);
        } else if (isDatabaseMarkedSeeded()) {
          setThemes([]);
        } else {
          setThemes(THEMATIC_CATEGORIES.filter(t => !deletedSet.has(t.id)));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, themesPath);
      }
    );

    // 6. Subscribe to Dynamic Badges
    const badgesPath = 'badges';
    const unsubscribeBadges = onSnapshot(
      collection(db, badgesPath),
      (snapshot) => {
        const deletedSet = getDeletedIds('badges');
        if (!snapshot.empty) {
          const loaded: Badge[] = [];
          snapshot.forEach(docSnap => {
            if (!deletedSet.has(docSnap.id)) {
              loaded.push({ id: docSnap.id, ...docSnap.data() } as Badge);
            }
          });
          setBadges(loaded);
        } else if (isDatabaseMarkedSeeded()) {
          setBadges([]);
        } else {
          setBadges(SYSTEM_BADGES.filter(b => !deletedSet.has(b.id)));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, badgesPath);
      }
    );

    // 7. Subscribe to Users collection
    const usersPath = 'users';
    const unsubscribeUsers = onSnapshot(
      collection(db, usersPath),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: UserProfile[] = [];
          snapshot.forEach(docSnap => {
            loaded.push({ id: docSnap.id, ...docSnap.data() } as UserProfile);
          });
          setUsersList(loaded);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, usersPath);
      }
    );

    // 8. Subscribe to Clans collection
    const clansPath = 'clans';
    const unsubscribeClans = onSnapshot(
      collection(db, clansPath),
      (snapshot) => {
        const deletedSet = getDeletedIds('clans');
        if (!snapshot.empty) {
          const loaded: ClanRegistry[] = [];
          snapshot.forEach(docSnap => {
            if (!deletedSet.has(docSnap.id)) {
              loaded.push({ id: docSnap.id, ...docSnap.data() } as ClanRegistry);
            }
          });
          setClans(loaded);
          cacheClansLocally(loaded);
        } else if (isDatabaseMarkedSeeded()) {
          setClans([]);
          cacheClansLocally([]);
        } else {
          getCachedClansLocally().then(cached => {
            const filtered = (cached || []).filter(c => !deletedSet.has(c.id));
            if (filtered.length > 0 && deletedSet.size === 0) setClans(filtered);
            else {
              const rem = INITIAL_CLANS.filter(c => !deletedSet.has(c.id));
              setClans(rem);
              cacheClansLocally(rem);
            }
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, clansPath);
        const deletedSet = getDeletedIds('clans');
        getCachedClansLocally().then(cached => {
          const filtered = (cached || []).filter(c => !deletedSet.has(c.id));
          if (filtered.length > 0) setClans(filtered);
        });
      }
    );

    // 9. Subscribe to Villages collection
    const villagesPath = 'villages';
    const unsubscribeVillages = onSnapshot(
      collection(db, villagesPath),
      (snapshot) => {
        const deletedSet = getDeletedIds('villages');
        if (!snapshot.empty) {
          const loaded: VillageRegistry[] = [];
          snapshot.forEach(docSnap => {
            if (!deletedSet.has(docSnap.id)) {
              loaded.push({ id: docSnap.id, ...docSnap.data() } as VillageRegistry);
            }
          });
          setVillages(loaded);
          cacheVillagesLocally(loaded);
        } else if (isDatabaseMarkedSeeded()) {
          setVillages([]);
          cacheVillagesLocally([]);
        } else {
          getCachedVillagesLocally().then(cached => {
            const filtered = (cached || []).filter(v => !deletedSet.has(v.id));
            if (filtered.length > 0 && deletedSet.size === 0) setVillages(filtered);
            else {
              const rem = INITIAL_VILLAGES.filter(v => !deletedSet.has(v.id));
              setVillages(rem);
              cacheVillagesLocally(rem);
            }
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, villagesPath);
        const deletedSet = getDeletedIds('villages');
        getCachedVillagesLocally().then(cached => {
          const filtered = (cached || []).filter(v => !deletedSet.has(v.id));
          if (filtered.length > 0) setVillages(filtered);
        });
      }
    );

    return () => {
      unsubscribeSeed();
      unsubscribeItems();
      unsubscribeContrib();
      unsubscribeMetrics();
      unsubscribeChallenges();
      unsubscribeThemes();
      unsubscribeBadges();
      unsubscribeUsers();
      unsubscribeClans();
      unsubscribeVillages();
    };
  }, [currentUser?.id, isFirebaseAuthReady]);

  // Sync offline queue to Firestore and Storage
  const syncPendingOfflineData = async () => {
    try {
      const pending = await getPendingOfflineContributions();
      if (!pending || pending.length === 0) return;

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
            console.warn('Storage upload notice (falling back to dataUrl):', storageErr);
          }
        }

        // Add to Firestore contributions
        await setDoc(doc(db, 'contributions', item.id), {
          id: item.id,
          itemId: item.itemId,
          userId: currentUser?.id || 'offline_user',
          userDisplayName: currentUser?.fullName || currentUser?.displayName || 'Contributeur Myènè',
          frenchText: item.frenchText,
          originalMyeneText: item.originalMyeneText,
          isSpellingCorrect: item.isSpellingCorrect,
          proposedSpelling: item.proposedSpelling,
          dialectVariant: item.dialectVariant || 'enenga',
          comment: item.comment || '',
          audioUrl: uploadedAudioUrl,
          audioDuration: item.audioDuration || 3,
          status: 'pending',
          createdAt: new Date(item.timestamp).toISOString(),
          offlineQueued: false
        });

        await removeOfflineContribution(item.id);
      }

      setPendingOfflineSubmissions([]);
      NotificationService.sendLocalNotification('Synchronisation Réussie ! ⚡', {
        body: `${pending.length} contribution(s) enregistrée(s) hors-ligne ont été synchronisées avec succès.`
      });
    } catch (err) {
      console.warn('Erreur synchronisation offline:', err);
    }
  };

  // Submit contribution handler
  const handleSaveContribution = async (data: Partial<Contribution>, audioBlob?: Blob): Promise<boolean> => {
    const contributionId = 'contrib-' + Date.now();
    let finalAudioUrl = data.audioUrl;

    if (audioBlob) {
      try {
        const storagePath = `recordings/${data.itemId}_${Date.now()}.webm`;
        const audioRef = ref(storage, storagePath);
        await uploadBytes(audioRef, audioBlob);
        finalAudioUrl = await getDownloadURL(audioRef);
      } catch (err) {
        console.warn('Storage direct upload notice, convertissant en audio permanent:', err);
      }

      // Fallback: If Firebase Storage upload did not produce a remote URL, convert blob to permanent Base64
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
      userId: currentUser?.id || 'guest-user',
      userDisplayName: currentUser?.fullName || currentUser?.displayName || 'Contributeur Myènè',
      userPhotoURL: currentUser?.photoURL,
      frenchText: data.frenchText || '',
      originalMyeneText: data.originalMyeneText || '',
      isSpellingCorrect: !!data.isSpellingCorrect,
      proposedSpelling: data.proposedSpelling || data.originalMyeneText,
      dialectVariant: data.dialectVariant || 'enenga',
      comment: data.comment,
      audioUrl: finalAudioUrl,
      audioDuration: data.audioDuration,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await dualSaveRecord('contributions', contributionId, payload);
      setContributions(prev => [payload, ...prev]);

      // Track Weekly Challenge progression
      const activeChallenge = challenges.find(c => c.id === activeChallengeId);
      const currentItemForContrib = items.find(i => i.id === data.itemId);
      if (currentUser && activeChallenge && activeChallenge.isActive) {
        const itemTheme = currentItemForContrib?.category || currentItemForContrib?.theme;
        const isThemeMatch = activeChallenge.theme === 'all' || itemTheme === activeChallenge.theme;
        const isTypeMatch = activeChallenge.challengeType === 'all' ||
          activeChallenge.challengeType === 'contributions' ||
          (activeChallenge.challengeType === 'recordings' && !!(audioBlob || data.audioUrl));

        if (isThemeMatch && isTypeMatch) {
          const currentCount = currentUser.weeklyProgress?.[activeChallenge.id] || 0;
          const newCount = currentCount + 1;
          const wasCompleted = currentUser.completedChallenges?.includes(activeChallenge.id);

          const updatedWeeklyProgress = {
            ...(currentUser.weeklyProgress || {}),
            [activeChallenge.id]: newCount
          };

          let updatedCompleted = currentUser.completedChallenges || [];
          let updatedBadges = [...currentUser.badges];
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

          const updatedUser: UserProfile = {
            ...currentUser,
            xp: (currentUser.xp || 0) + bonusXp,
            badges: updatedBadges,
            weeklyProgress: updatedWeeklyProgress,
            completedChallenges: updatedCompleted,
            updatedAt: new Date().toISOString()
          };

          setCurrentUser(updatedUser);
          try {
            setDoc(doc(db, 'users', currentUser.id), updatedUser, { merge: true }).catch(() => {});
          } catch {}
        }
      }

      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'contributions/' + contributionId);
      // Fallback: save to local memory
      setContributions(prev => [payload, ...prev]);
      return true;
    }
  };

  // Gamification rewards handler
  const handleRewardEarned = (xpGained: number, newBadges: string[]) => {
    if (!currentUser) return;
    const newXp = (currentUser.xp || 0) + xpGained;
    const newLvl = getLevelForXp(newXp);
    const updatedBadges = Array.from(new Set([...(currentUser.badges || []), ...newBadges]));

    const updatedProfile: UserProfile = {
      ...currentUser,
      xp: newXp,
      level: newLvl.name,
      levelIndex: newLvl.index,
      contributionsCount: (currentUser.contributionsCount || 0) + 1,
      recordingsCount: (currentUser.recordingsCount || 0) + (newBadges.includes('badge-premiere-voix') ? 1 : 0),
      badges: updatedBadges,
      updatedAt: new Date().toISOString()
    };

    setCurrentUser(updatedProfile);

    // Save user update to Firestore
    try {
      setDoc(doc(db, 'users', currentUser.id), updatedProfile, { merge: true }).catch(() => {});
    } catch {
      // offline fallback
    }
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
  };

  const handleDeleteClan = async (clanId: string) => {
    markIdAsDeleted('clans', clanId);
    setClans(prev => {
      const next = prev.filter(c => c.id !== clanId);
      cacheClansLocally(next);
      return next;
    });
    await dualDeleteRecord('clans', clanId);
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
    return newVillage;
  };

  const handleSaveVillage = async (villageData: Partial<VillageRegistry>) => {
    const id = villageData.id || ('vil-' + (villageData.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-'));
    unmarkIdAsDeleted('villages', id);
    const fullVillage: VillageRegistry = {
      id,
      name: villageData.name || 'Nouveau Village',
      clan: villageData.clan || clans[0]?.name || 'Avandji',
      tribe: villageData.tribe || 'Enenga',
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
  };

  const handleDeleteVillage = async (villageId: string) => {
    markIdAsDeleted('villages', villageId);
    setVillages(prev => {
      const next = prev.filter(v => v.id !== villageId);
      cacheVillagesLocally(next);
      return next;
    });
    await dualDeleteRecord('villages', villageId);
  };

  // Complete onboarding with guaranteed Firebase Auth session & dual write
  const handleCompleteOnboarding = async (profileData: Partial<UserProfile>) => {
    if (!currentUser) return;
    await ensureFirebaseAuthSession();

    const isSuperAdmin = checkIsAdminEmail(currentUser.email) || checkIsAdminEmail(profileData.email);
    const updated: UserProfile = {
      ...currentUser,
      ...profileData,
      role: isSuperAdmin ? 'admin' : (profileData.role || currentUser.role),
      registrationCompleted: true,
      updatedAt: new Date().toISOString()
    };
    setCurrentUser(updated);
    setUsersList(prev => {
      const idx = prev.findIndex(u => u.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [updated, ...prev];
    });

    try {
      localStorage.setItem('nkala_authenticated_user', JSON.stringify(updated));
    } catch {}

    // Persist user directly to Firestore and Realtime Database
    await dualSaveRecord('users', updated.id, updated);
    if (updated.role === 'admin') {
      await dualSaveRecord('admins', updated.id, {
        userId: updated.id,
        role: 'admin',
        updatedAt: new Date().toISOString()
      });
    }

    setIsOnboardingModalOpen(false);
    NotificationService.sendLocalNotification('Filiation OMPAGANO Validée 📜', {
      body: `Bienvenue dans le programme ${updated.fullName} de la tribu ${updated.tribe} !`
    });
  };

  // Admin validation handler
  const handleValidateContribution = async (
    contributionId: string, 
    status: 'approved' | 'rejected' | 'needs_revision',
    notes?: string
  ) => {
    try {
      await updateDoc(doc(db, 'contributions', contributionId), {
        status,
        validatorId: currentUser?.id || 'admin',
        validatorDisplayName: currentUser?.fullName || 'Andy AKENDENGUE',
        validatorNotes: notes || '',
        validatedAt: new Date().toISOString()
      });
    } catch {}

    setContributions(prev =>
      prev.map(c => c.id === contributionId ? { ...c, status, validatorNotes: notes } : c)
    );

    if (currentUser) {
      const updatedValids = (currentUser.validationsCount || 0) + 1;
      const extraBadges = [...currentUser.badges];
      if (updatedValids >= 5 && !extraBadges.includes('badge-cinq-validations')) {
        extraBadges.push('badge-cinq-validations');
      }
      setCurrentUser({
        ...currentUser,
        validationsCount: updatedValids,
        badges: extraBadges
      });
    }
  };

  // Dedicated Validator Workspace handler with explicit oral vs written nuance
  // "l'écrit peut être bon mais pas la prononciation, la prononciation est bonne mais il a mal écrit"
  const handleValidateGranular = async (
    contributionId: string,
    payload: {
      status: ContributionStatus;
      spellingVerdict: 'correct' | 'incorrect';
      pronunciationVerdict: 'correct' | 'incorrect' | 'no_audio';
      notes?: string;
    }
  ) => {
    const updatePayload: Partial<Contribution> = {
      status: payload.status,
      spellingVerdict: payload.spellingVerdict,
      pronunciationVerdict: payload.pronunciationVerdict,
      isSpellingCorrect: payload.spellingVerdict === 'correct',
      isPronunciationCorrect: payload.pronunciationVerdict === 'correct',
      validatorId: currentUser?.id || 'validator',
      validatorDisplayName: currentUser?.fullName || currentUser?.displayName || 'Validateur',
      validatorNotes: payload.notes || '',
      validatedAt: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'contributions', contributionId), updatePayload);
    } catch (e) {
      console.warn('Notice saving granular validation to Firestore:', e);
    }

    setContributions(prev =>
      prev.map(c => c.id === contributionId ? { ...c, ...updatePayload } : c)
    );

    if (currentUser) {
      const updatedValids = (currentUser.validationsCount || 0) + 1;
      const extraBadges = [...currentUser.badges];
      if (updatedValids >= 5 && !extraBadges.includes('badge-cinq-validations')) {
        extraBadges.push('badge-cinq-validations');
      }
      setCurrentUser({
        ...currentUser,
        validationsCount: updatedValids,
        badges: extraBadges
      });
    }

    NotificationService.sendLocalNotification('Évaluation Enregistrée 🎯', {
      body: `La contribution a été évaluée avec nuance.`
    });
  };

  // Admin User level & badge manual manager
  const handleUpdateUserLevelAndBadges = async (
    userId: string,
    newLevelIndex: number,
    badges: string[],
    newXp?: number
  ) => {
    const lvl = USER_LEVELS.find(l => l.index === newLevelIndex) || USER_LEVELS[0];
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          levelIndex: newLevelIndex,
          level: lvl.name,
          badges,
          xp: newXp !== undefined ? newXp : u.xp
        };
      }
      return u;
    }));

    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? {
        ...prev,
        levelIndex: newLevelIndex,
        level: lvl.name,
        badges,
        xp: newXp !== undefined ? newXp : prev.xp
      } : null);
    }
  };

  // Authentication Gate handler - PRESERVES FIRESTORE DATA ON RECONNECT
  const handleLoginSuccess = async (profileData: Partial<UserProfile>) => {
    if (!profileData.id) return;

    setIsAuthChecking(true);
    try {
      await ensureFirebaseAuthSession();
      if (auth.currentUser) {
        setIsFirebaseAuthReady(true);
      }

      // 1. FIRST: Check if the user already exists in Firestore to NEVER wipe out their data or console edits!
      let existingProfile: UserProfile | null = null;
      try {
        const snap = await getDoc(doc(db, 'users', profileData.id));
        if (snap.exists()) {
          existingProfile = snap.data() as UserProfile;
        }
      } catch (err) {
        console.warn('Notice checking existing user in Firestore:', err);
      }

      const isSuperAdmin = checkIsAdminEmail(profileData.email) || checkIsAdminEmail(existingProfile?.email);

      if (existingProfile) {
        // PRESERVE ALL VALUES FROM FIRESTORE (including manual edits in Firebase Console)
        const merged: UserProfile = {
          ...existingProfile,
          photoURL: profileData.photoURL || existingProfile.photoURL,
          email: profileData.email || existingProfile.email,
          role: isSuperAdmin ? 'admin' : existingProfile.role
        };

        // If user is super-admin and was previously stored as user, upgrade them immediately in Firestore & RTDB
        if (isSuperAdmin && existingProfile.role !== 'admin') {
          try {
            await dualSaveRecord('users', merged.id, { role: 'admin', updatedAt: new Date().toISOString() });
            await dualSaveRecord('admins', merged.id, {
              userId: merged.id,
              email: merged.email,
              role: 'admin',
              updatedAt: new Date().toISOString()
            });
          } catch (upgradeErr) {
            console.warn('Notice upgrading super-admin in database:', upgradeErr);
          }
        }

        try {
          localStorage.setItem('nkala_authenticated_user', JSON.stringify(merged));
        } catch {}

        setCurrentUser(merged);
        setUsersList(prev => [merged, ...prev.filter(u => u.id !== merged.id)]);

        // If registration was already completed, DO NOT reopen onboarding modal!
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        localStorage.setItem('nkala_authenticated_user', JSON.stringify(fullProfile));
      } catch {}
      setCurrentUser(fullProfile);
      setUsersList(prev => [fullProfile, ...prev.filter(u => u.id !== fullProfile.id)]);

      try {
        await ensureFirebaseAuthSession();
        await dualSaveRecord('users', fullProfile.id, fullProfile);
        if (fullProfile.role === 'admin') {
          await dualSaveRecord('admins', fullProfile.id, { 
            userId: fullProfile.id,
            email: fullProfile.email,
            role: 'admin', 
            updatedAt: new Date().toISOString() 
          });
        }
      } catch (err) {
        console.warn('Notice syncing profile to database:', err);
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

      // 5. Seed Badges
      for (const badge of SYSTEM_BADGES) {
        await dualSaveRecord('badges', badge.id, badge);
      }
      setBadges(SYSTEM_BADGES);

      // 6. Seed Weekly Challenges
      for (const challenge of INITIAL_WEEKLY_CHALLENGES) {
        await dualSaveRecord('challenges', challenge.id, challenge);
      }
      setChallenges(INITIAL_WEEKLY_CHALLENGES);

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

  // Admin User Role Management (DECIDER QUI EST ADMIN)
  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await setDoc(doc(db, 'users', userId), { role: newRole, updatedAt: new Date().toISOString() }, { merge: true });
      if (newRole === 'admin') {
        await setDoc(doc(db, 'admins', userId), { role: 'admin', updatedAt: new Date().toISOString() }, { merge: true });
      } else {
        await deleteDoc(doc(db, 'admins', userId)).catch(() => {});
      }
    } catch (e) {
      console.warn('Notice updating user role in Firestore:', e);
    }

    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, role: newRole } : null);
    }
    alert(`Rôle mis à jour : l'utilisateur est désormais ${newRole === 'admin' ? 'ADMINISTRATEUR 👑' : newRole === 'validator' ? 'VALIDATEUR 🔍' : 'CONTRIBUTEUR'}.`);
  };

  // Delete Contribution / Response
  const handleDeleteContribution = async (contributionId: string) => {
    markIdAsDeleted('contributions', contributionId);
    setContributions(prev => prev.filter(c => c.id !== contributionId));
    await dualDeleteRecord('contributions', contributionId);
  };

  // Admin Anti-Fraud account status update
  const handleUpdateUserAccountStatus = async (userId: string, status: 'active' | 'flagged' | 'suspended') => {
    try {
      await setDoc(doc(db, 'users', userId), { status, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn('Notice updating account status in Firestore:', e);
    }
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, status } : null);
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
      category: itemData.category || 'vie_quotidienne',
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
  };

  const handleDeleteQuestionnaireItem = async (itemId: string) => {
    markIdAsDeleted('items', itemId);
    setItems(prev => {
      const remaining = prev.filter(i => i.id !== itemId);
      cacheItemsLocally(remaining);
      return remaining;
    });
    await dualDeleteRecord('items', itemId);
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
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = fullChallenge;
        return copy;
      }
      return [fullChallenge, ...prev];
    });

    await dualSaveRecord('challenges', id, fullChallenge);

    setActiveChallengeId(id);
    NotificationService.sendLocalNotification('Nouveau Défi Hebdomadaire ! 🎯', {
      body: `Le défi "${fullChallenge.title}" est maintenant disponible.`
    });
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    markIdAsDeleted('challenges', challengeId);
    setChallenges(prev => prev.filter(c => c.id !== challengeId));
    await dualDeleteRecord('challenges', challengeId);
  };

  const handleToggleActiveChallenge = async (challengeId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const target = challenges.find(c => c.id === challengeId);
    setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, isActive: newStatus } : c));
    if (target) {
      await dualSaveRecord('challenges', challengeId, { ...target, isActive: newStatus });
    }
  };

  // Batch import phrases handler (CSV Import)
  const handleBatchImportItems = async (newItems: QuestionnaireItem[]) => {
    if (!newItems || newItems.length === 0) return;

    for (const it of newItems) {
      unmarkIdAsDeleted('items', it.id);
    }

    setItems(prev => {
      const merged = [...newItems, ...prev];
      cacheItemsLocally(merged);
      return merged;
    });

    for (const it of newItems) {
      await dualSaveRecord('items', it.id, it);
    }

    setSystemMetrics(prev => ({
      ...prev,
      totalItems: prev.totalItems + newItems.length,
      lastUpdated: new Date().toISOString()
    }));

    NotificationService.sendLocalNotification('Importation Réussie ! 📚', {
      body: `${newItems.length} phrases ont été importées et synchronisées dans Firebase.`
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
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = fullTheme;
        return updated;
      }
      return [...prev, fullTheme];
    });

    await dualSaveRecord('themes', themeId, fullTheme);
  };

  const handleDeleteTheme = async (themeId: string) => {
    markIdAsDeleted('themes', themeId);
    setThemes(prev => prev.filter(t => t.id !== themeId));
    await dualDeleteRecord('themes', themeId);
  };

  const handleBatchRegisterThemes = async (newThemes: ThemeDefinition[]) => {
    for (const th of newThemes) {
      unmarkIdAsDeleted('themes', th.id);
    }
    setThemes(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const toAdd = newThemes.filter(nt => !existingIds.has(nt.id));
      return [...prev, ...toAdd];
    });
    for (const th of newThemes) {
      await dualSaveRecord('themes', th.id, th);
    }
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
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = fullBadge;
        return updated;
      }
      return [...prev, fullBadge];
    });

    await dualSaveRecord('badges', badgeId, fullBadge);
  };

  const handleDeleteBadge = async (badgeId: string) => {
    markIdAsDeleted('badges', badgeId);
    setBadges(prev => prev.filter(b => b.id !== badgeId));
    await dualDeleteRecord('badges', badgeId);
  };

  // Full bidirectional Database Sync (Items, Clans, Villages, Users, Metrics)
  const handleTriggerCloudSync = async () => {
    await ensureFirebaseAuthSession();

    // 1. Sync all Items (Questions/Expressions)
    for (const it of items) {
      await dualSaveRecord('items', it.id, it);
    }

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

    NotificationService.sendLocalNotification('Base de données synchronisée ☁️', {
      body: `${items.length} questions, ${clans.length} clans et ${villages.length} villages synchronisés avec Firebase.`
    });
  };

  // Active challenge selection & filter
  const activeChallenge = challenges.find(c => c.id === activeChallengeId) || challenges[0];

  const displayedItems = React.useMemo(() => {
    if (!isChallengeFilterActive || !activeChallenge || activeChallenge.theme === 'all') {
      return items;
    }
    const filtered = items.filter(
      item => item.category === activeChallenge.theme || item.theme === activeChallenge.theme
    );
    return filtered.length > 0 ? filtered : items;
  }, [items, isChallengeFilterActive, activeChallenge]);

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

  // SESSION RESTORATION / AUTOMATIC RECONNECTION LOADING SCREEN:
  // Displayed while Firebase Auth & Firestore check if the user is already authenticated in the background,
  // preventing the user from seeing the login screen and clicking "Se connecter" unnecessarily.
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
  // "Tant qu'on n'est pas connecté on ne peut pas accéder à l'app et on reste sur l'écran de connexion."
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
        pendingOfflineCount={pendingOfflineSubmissions.length}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenNotifications={() => {
          setIsNotificationModalOpen(true);
          setUnreadNotificationsCount(0);
        }}
        onOpenOfflinePack={() => setIsOfflinePackModalOpen(true)}
        onSyncOffline={syncPendingOfflineData}
        onSignOut={() => {
          try {
            localStorage.removeItem('nkala_authenticated_user');
          } catch {}
          fbSignOut(auth).catch(() => {});
          setCurrentUser(null);
        }}
        currentTab={currentTab}
        onSelectTab={handleTabNavigation}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3.5 sm:p-6">
        {currentTab === 'crowdsource' && (
          currentItem ? (
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
          )
        )}

        {currentTab === 'explore' && (
          <VocabularyExplorer
            items={items}
            onSelectExpression={(index) => {
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
            onUpdateUserLevelAndBadges={handleUpdateUserLevelAndBadges}
            onUpdateUserAccountStatus={handleUpdateUserAccountStatus}
            onUpdateUserRole={handleUpdateUserRole}
            onTriggerCloudSync={handleTriggerCloudSync}
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
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenOnboarding={() => setIsOnboardingModalOpen(true)}
            onOpenOfflinePack={() => setIsOfflinePackModalOpen(true)}
            onSignOut={() => {
              try {
                localStorage.removeItem('nkala_authenticated_user');
              } catch {}
              fbSignOut(auth).catch(() => {});
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
