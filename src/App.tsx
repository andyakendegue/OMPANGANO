import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDocs, 
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
  OperationType 
} from './firebase';
import { 
  QuestionnaireItem, 
  Contribution, 
  UserProfile, 
  SystemMetric,
  OfflineSubmission,
  ClanRegistry,
  VillageRegistry,
  WeeklyChallenge,
  ThemeDefinition,
  Badge
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
import { AdminDashboard } from './components/AdminDashboard';
import { UserProfileView } from './components/UserProfileView';
import { AuthModal } from './components/AuthModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { OnboardingModal } from './components/OnboardingModal';
import { OfflinePackModal } from './components/OfflinePackModal';
import { ChallengeCelebrationModal } from './components/ChallengeCelebrationModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>('crowdsource');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Data states
  const [items, setItems] = useState<QuestionnaireItem[]>(INITIAL_ENENGA_ITEMS);
  const [currentItemIndex, setCurrentItemIndex] = useState<number>(0);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [clans, setClans] = useState<ClanRegistry[]>(INITIAL_CLANS);
  const [villages, setVillages] = useState<VillageRegistry[]>(INITIAL_VILLAGES);

  // Weekly Challenges states
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>(INITIAL_WEEKLY_CHALLENGES);
  const [activeChallengeId, setActiveChallengeId] = useState<string>('defi-peche-semaine');
  const [isChallengeFilterActive, setIsChallengeFilterActive] = useState<boolean>(false);
  const [celebrationChallenge, setCelebrationChallenge] = useState<WeeklyChallenge | null>(null);

  // Dynamic Themes & Dynamic Badges states
  const [themes, setThemes] = useState<ThemeDefinition[]>(THEMATIC_CATEGORIES);
  const [badges, setBadges] = useState<Badge[]>(SYSTEM_BADGES);

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

  // Auth & user state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    return {
      id: 'admin-andy',
      displayName: 'Andy Migoumbi',
      fullName: 'Andy Migoumbi',
      contact: 'andymigoumbi@gmail.com',
      birthDate: '1992-06-14',
      birthPlace: 'Lambaréné',
      tribe: 'Enenga',
      paternalClan: 'Avandji',
      maternalClan: 'Imvona',
      villageOfOrigin: 'Lambaréné (Moyen-Ogooué)',
      registrationCompleted: true,
      email: 'andymigoumbi@gmail.com',
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
      weeklyProgress: { 'defi-peche-semaine': 2, 'defi-voix-orungu': 1 },
      completedChallenges: [],
      badges: [
        'badge-genealogie-verifiee',
        'badge-premiere-voix',
        'badge-dix-traductions',
        'badge-cinq-validations',
        'badge-gardien-lacs',
        'badge-maitre-verbe'
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    };
  });

  // Registered users for admin management and fraud detection
  const [usersList, setUsersList] = useState<UserProfile[]>([
    {
      id: 'admin-andy',
      displayName: 'Andy Migoumbi',
      fullName: 'Andy Migoumbi',
      contact: 'andymigoumbi@gmail.com',
      birthDate: '1992-06-14',
      birthPlace: 'Lambaréné',
      tribe: 'Enenga',
      paternalClan: 'Avandji',
      maternalClan: 'Imvona',
      villageOfOrigin: 'Lambaréné (Moyen-Ogooué)',
      registrationCompleted: true,
      email: 'andymigoumbi@gmail.com',
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
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingOfflineData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of offline storage
    getPendingOfflineContributions().then(pending => {
      setPendingOfflineSubmissions(pending);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Firebase auth state subscription
  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const isAdmin = fbUser.email === 'andymigoumbi@gmail.com';
        setCurrentUser(prev => {
          const profile: UserProfile = {
            id: fbUser.uid,
            displayName: fbUser.displayName || prev?.displayName || fbUser.email?.split('@')[0] || 'Contributeur OMPAGANO',
            fullName: prev?.fullName || fbUser.displayName || '',
            contact: prev?.contact || fbUser.phoneNumber || fbUser.email || '',
            birthDate: prev?.birthDate || '',
            birthPlace: prev?.birthPlace || '',
            tribe: prev?.tribe || 'Enenga',
            paternalClan: prev?.paternalClan || '',
            maternalClan: prev?.maternalClan || '',
            villageOfOrigin: prev?.villageOfOrigin || '',
            registrationCompleted: prev?.registrationCompleted ?? false,
            email: fbUser.email || prev?.email,
            phoneNumber: fbUser.phoneNumber || prev?.phoneNumber,
            photoURL: fbUser.photoURL || prev?.photoURL,
            role: isAdmin ? 'admin' : (prev?.role || 'user'),
            status: prev?.status || 'active',
            suspicionScore: prev?.suspicionScore || 0,
            xp: prev?.xp || 150,
            level: prev?.level || 'Initié Curieux',
            levelIndex: prev?.levelIndex || 1,
            contributionsCount: prev?.contributionsCount || 0,
            recordingsCount: prev?.recordingsCount || 0,
            validationsCount: prev?.validationsCount || 0,
            streakDays: prev?.streakDays || 1,
            badges: prev?.badges || ['badge-premiere-voix'],
            createdAt: prev?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          if (!profile.registrationCompleted) {
            setIsOnboardingModalOpen(true);
          }
          return profile;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Firestore Real-time subscriptions & Initial Seeding
  useEffect(() => {
    // 1. Subscribe to Items collection
    const itemsPath = 'items';
    const unsubscribeItems = onSnapshot(
      collection(db, itemsPath),
      async (snapshot) => {
        if (!snapshot.empty) {
          const loaded: QuestionnaireItem[] = [];
          snapshot.forEach(docSnap => {
            loaded.push({ id: docSnap.id, ...docSnap.data() } as QuestionnaireItem);
          });
          setItems(loaded);
          cacheItemsLocally(loaded);
        } else {
          // Seed items into Firestore if empty
          try {
            for (const item of INITIAL_ENENGA_ITEMS) {
              await setDoc(doc(db, itemsPath, item.id), item);
            }
            cacheItemsLocally(INITIAL_ENENGA_ITEMS);
          } catch (e) {
            console.warn('Seeding notice:', e);
            setItems(INITIAL_ENENGA_ITEMS);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, itemsPath);
        // Fallback to cached items
        getCachedItemsLocally().then(cached => {
          if (cached && cached.length > 0) setItems(cached);
          else setItems(INITIAL_ENENGA_ITEMS);
        });
      }
    );

    // 2. Subscribe to Contributions collection
    const contribPath = 'contributions';
    const unsubscribeContrib = onSnapshot(
      collection(db, contribPath),
      (snapshot) => {
        const loaded: Contribution[] = [];
        snapshot.forEach(docSnap => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as Contribution);
        });
        if (loaded.length > 0) {
          setContributions(loaded);
        } else {
          // Provide sample contributions if empty for demonstration
          setContributions([
            {
              id: 'c-01',
              itemId: 'nkala-enenga-01',
              userId: 'user-mboumba',
              userDisplayName: 'Mboumba E.',
              frenchText: 'Bonjour à tous / Salutations fraternelles',
              originalMyeneText: 'Mbolo vana',
              isSpellingCorrect: true,
              proposedSpelling: 'Mbolo vana',
              status: 'approved',
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
              status: 'pending',
              createdAt: '2026-01-13T15:30:00Z'
            }
          ]);
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
      async (snapshot) => {
        if (!snapshot.empty) {
          const loaded: WeeklyChallenge[] = [];
          snapshot.forEach(docSnap => {
            loaded.push({ id: docSnap.id, ...docSnap.data() } as WeeklyChallenge);
          });
          setChallenges(loaded);
        } else {
          // Initial seed if empty
          try {
            for (const ch of INITIAL_WEEKLY_CHALLENGES) {
              await setDoc(doc(db, 'challenges', ch.id), ch);
            }
          } catch (e) {
            console.warn('Initial challenges seed notice:', e);
          }
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
      async (snapshot) => {
        if (!snapshot.empty) {
          const loaded: ThemeDefinition[] = [];
          snapshot.forEach(docSnap => {
            loaded.push({ id: docSnap.id, ...docSnap.data() } as ThemeDefinition);
          });
          setThemes(loaded);
        } else {
          try {
            for (const th of THEMATIC_CATEGORIES) {
              await setDoc(doc(db, 'themes', th.id), th);
            }
          } catch (e) {
            console.warn('Themes initial seeding notice:', e);
          }
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
      async (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Badge[] = [];
          snapshot.forEach(docSnap => {
            loaded.push({ id: docSnap.id, ...docSnap.data() } as Badge);
          });
          setBadges(loaded);
        } else {
          try {
            for (const bg of SYSTEM_BADGES) {
              await setDoc(doc(db, 'badges', bg.id), bg);
            }
          } catch (e) {
            console.warn('Badges initial seeding notice:', e);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, badgesPath);
      }
    );

    return () => {
      unsubscribeItems();
      unsubscribeContrib();
      unsubscribeMetrics();
      unsubscribeChallenges();
      unsubscribeThemes();
      unsubscribeBadges();
    };
  }, []);

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
          userDisplayName: currentUser?.displayName || 'Contributeur Enenga',
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
        console.warn('Storage direct upload notice:', err);
      }
    }

    const payload: Contribution = {
      id: contributionId,
      itemId: data.itemId || '',
      userId: currentUser?.id || 'guest-user',
      userDisplayName: currentUser?.displayName || 'Contributeur Enenga',
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
      await setDoc(doc(db, 'contributions', contributionId), payload);
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

  // Dynamic additions of Clans and Villages
  const handleAddNewClan = async (name: string, tribe: string): Promise<ClanRegistry> => {
    const id = 'clan-' + name.toLowerCase().replace(/\s+/g, '-');
    const newClan: ClanRegistry = {
      id,
      name,
      tribe,
      createdBy: currentUser?.id,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'clans', id), newClan);
    } catch {}
    setClans(prev => [...prev, newClan]);
    return newClan;
  };

  const handleAddNewVillage = async (name: string, tribe: string, region?: string): Promise<VillageRegistry> => {
    const id = 'vil-' + name.toLowerCase().replace(/\s+/g, '-');
    const newVillage: VillageRegistry = {
      id,
      name,
      tribe,
      region: region || 'Gabon',
      createdBy: currentUser?.id,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'villages', id), newVillage);
    } catch {}
    setVillages(prev => [...prev, newVillage]);
    return newVillage;
  };

  // Complete onboarding
  const handleCompleteOnboarding = async (profileData: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      ...profileData,
      registrationCompleted: true,
      updatedAt: new Date().toISOString()
    };
    setCurrentUser(updated);
    setUsersList(prev => prev.map(u => u.id === updated.id ? updated : u));

    try {
      await setDoc(doc(db, 'users', updated.id), updated, { merge: true });
    } catch {}

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
        validatorDisplayName: currentUser?.fullName || 'Andy Migoumbi',
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

  // Admin Anti-Fraud account status update
  const handleUpdateUserAccountStatus = async (userId: string, status: 'active' | 'flagged' | 'suspended') => {
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
    alert(`Le statut du profil a été mis à jour : ${status.toUpperCase()}`);
  };

  // Questionnaire management
  const handleSaveQuestionnaireItem = async (itemData: Partial<QuestionnaireItem>) => {
    const id = itemData.id || 'item-' + Date.now();
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
      contributionsCount: 0,
      recordingsCount: 0,
      createdBy: currentUser?.id || 'admin',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'items', id), fullItem);
    } catch {}

    setItems(prev => {
      const idx = prev.findIndex(i => i.id === id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = fullItem;
        return copy;
      }
      return [fullItem, ...prev];
    });
  };

  const handleDeleteQuestionnaireItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'items', itemId));
    } catch {}
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  // Weekly Challenge Admin Handlers
  const handleSaveChallenge = async (challengeData: Partial<WeeklyChallenge>) => {
    const id = challengeData.id || `defi-${Date.now()}`;
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

    try {
      await setDoc(doc(db, 'challenges', id), fullChallenge);
    } catch {}

    setChallenges(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = fullChallenge;
        return copy;
      }
      return [fullChallenge, ...prev];
    });

    setActiveChallengeId(id);
    NotificationService.sendLocalNotification('Nouveau Défi Hebdomadaire ! 🎯', {
      body: `Le défi "${fullChallenge.title}" est maintenant disponible.`
    });
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    try {
      await deleteDoc(doc(db, 'challenges', challengeId));
    } catch {}
    setChallenges(prev => prev.filter(c => c.id !== challengeId));
  };

  const handleToggleActiveChallenge = async (challengeId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    try {
      await updateDoc(doc(db, 'challenges', challengeId), { isActive: newStatus });
    } catch {}
    setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, isActive: newStatus } : c));
  };

  // Batch import phrases handler (CSV Import)
  const handleBatchImportItems = async (newItems: QuestionnaireItem[]) => {
    if (!newItems || newItems.length === 0) return;

    try {
      // Save items to Firestore in batches
      for (const it of newItems.slice(0, 50)) {
        await setDoc(doc(db, 'items', it.id), it);
      }
    } catch (e) {
      console.warn('Batch import firestore notice:', e);
    }

    setItems(prev => {
      const merged = [...newItems, ...prev];
      cacheItemsLocally(merged);
      return merged;
    });

    setSystemMetrics(prev => ({
      ...prev,
      totalItems: prev.totalItems + newItems.length,
      lastUpdated: new Date().toISOString()
    }));

    NotificationService.sendLocalNotification('Importation Réussie ! 📚', {
      body: `${newItems.length} phrases ont été importées et classées dans le corpus OMPAGANO.`
    });
  };

  // Dynamic Themes Handlers
  const handleSaveTheme = async (themeData: Partial<ThemeDefinition>) => {
    const themeId = themeData.id || `theme_${Date.now()}`;
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

    try {
      await setDoc(doc(db, 'themes', themeId), fullTheme);
    } catch (e) {
      console.warn('Error saving theme to Firestore:', e);
    }

    setThemes(prev => {
      const idx = prev.findIndex(t => t.id === themeId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = fullTheme;
        return updated;
      }
      return [...prev, fullTheme];
    });
  };

  const handleDeleteTheme = async (themeId: string) => {
    try {
      await deleteDoc(doc(db, 'themes', themeId));
    } catch (e) {
      console.warn('Error deleting theme:', e);
    }
    setThemes(prev => prev.filter(t => t.id !== themeId));
  };

  const handleBatchRegisterThemes = async (newThemes: ThemeDefinition[]) => {
    for (const th of newThemes) {
      try {
        await setDoc(doc(db, 'themes', th.id), th);
      } catch (e) {
        console.warn('Error registering theme:', e);
      }
    }
    setThemes(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const toAdd = newThemes.filter(nt => !existingIds.has(nt.id));
      return [...prev, ...toAdd];
    });
  };

  // Dynamic Badges Handlers
  const handleSaveBadge = async (badgeData: Partial<Badge>) => {
    const badgeId = badgeData.id || `badge_${Date.now()}`;
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

    try {
      await setDoc(doc(db, 'badges', badgeId), fullBadge);
    } catch (e) {
      console.warn('Error saving badge to Firestore:', e);
    }

    setBadges(prev => {
      const idx = prev.findIndex(b => b.id === badgeId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = fullBadge;
        return updated;
      }
      return [...prev, fullBadge];
    });
  };

  const handleDeleteBadge = async (badgeId: string) => {
    try {
      await deleteDoc(doc(db, 'badges', badgeId));
    } catch (e) {
      console.warn('Error deleting badge:', e);
    }
    setBadges(prev => prev.filter(b => b.id !== badgeId));
  };

  // Cloud Functions simulator trigger
  const handleTriggerCloudSync = async () => {
    const metricsPayload: SystemMetric = {
      id: 'summary',
      totalItems: items.length,
      totalContributions: contributions.length,
      totalRecordings: contributions.filter(c => !!c.audioUrl).length,
      totalValidated: contributions.filter(c => c.status === 'approved').length,
      totalUsers: usersList.length,
      lastUpdated: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'metrics', 'summary'), metricsPayload);
      setSystemMetrics(metricsPayload);
    } catch {
      setSystemMetrics(metricsPayload);
    }
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

  const currentItem = displayedItems[currentItemIndex] || displayedItems[0] || items[0] || INITIAL_ENENGA_ITEMS[0];

  return (
    <div className="african-pattern-bg min-h-screen text-[#fdfaf7] flex flex-col font-sans">
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
          fbSignOut(auth);
          setCurrentUser(null);
        }}
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3.5 sm:p-6">
        {currentTab === 'crowdsource' && (
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

        {currentTab === 'admin' && (
          <AdminDashboard
            items={items}
            contributions={contributions}
            systemMetrics={systemMetrics}
            usersList={usersList}
            challenges={challenges}
            themes={themes}
            badges={badges}
            onValidateContribution={handleValidateContribution}
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
            onUpdateUserLevelAndBadges={handleUpdateUserLevelAndBadges}
            onUpdateUserAccountStatus={handleUpdateUserAccountStatus}
            onTriggerCloudSync={handleTriggerCloudSync}
            currentUser={currentUser}
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
              fbSignOut(auth);
              setCurrentUser(null);
            }}
            onToggleRole={(newRole) => {
              if (currentUser) {
                setCurrentUser({ ...currentUser, role: newRole });
              }
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
        onSelectTab={setCurrentTab}
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
          const userObj: UserProfile = {
            id: profile.id || 'user-' + Date.now(),
            displayName: profile.displayName || 'Contributeur OMPAGANO',
            fullName: profile.displayName || 'Contributeur OMPAGANO',
            contact: profile.phoneNumber || profile.email || '',
            birthDate: '1995-05-15',
            birthPlace: 'Lambaréné',
            tribe: 'Enenga',
            paternalClan: 'Avandji',
            maternalClan: 'Imvona',
            villageOfOrigin: 'Lambaréné',
            registrationCompleted: false, // Forces genealogical onboarding gate!
            role: profile.role || 'user',
            status: 'active',
            suspicionScore: 0,
            xp: profile.xp || 150,
            level: profile.level || 'Initié Curieux',
            levelIndex: 1,
            contributionsCount: 3,
            recordingsCount: 2,
            validationsCount: 1,
            streakDays: 1,
            badges: profile.badges || ['badge-genealogie-verifiee'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setCurrentUser(userObj);
          setIsOnboardingModalOpen(true);
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
