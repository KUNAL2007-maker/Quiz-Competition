import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  Competition,
  QuizQuestion,
  QuizSessionState,
  LeaderboardEntry,
  OperatorProfile,
  CompetitionResult,
  ActivityRecord,
  AppSettings,
  ToastMessage,
} from '../types';

interface AppContextValue {
  // Auth & Backend Engine Status
  currentUser: FirebaseUser | null;
  isAdmin: boolean;
  isAuthReady: boolean;
  pythonEngineOnline: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signOutOperator: () => Promise<void>;
  saveCompetitorProfile: (data: { displayName: string; whatsappNumber: string; avatarUrl: string }) => Promise<{ success: boolean; error?: string }>;

  // Data stores (strictly empty until populated in Firestore — zero fabricated data)
  competitions: Competition[];
  selectedCompetition: Competition | null;
  selectCompetition: (competition: Competition | null) => void;
  transitionCompetitionToLive: (competitionId: string) => Promise<void>;
  questions: QuizQuestion[];
  leaderboard: LeaderboardEntry[];
  results: CompetitionResult[];
  activities: ActivityRecord[];

  // Target countdown timestamp
  targetStartTime: string | null;
  setTargetStartTime: (isoOrTimestamp: string | null) => void;

  // Quiz Session State
  quizSession: QuizSessionState;
  isSubmitting: boolean;
  startQuizSession: (comp: Competition) => void;
  selectQuizAnswer: (questionId: string, optionId: string) => void;
  toggleMarkForReview: (questionId: string) => void;
  setCurrentQuestionIndex: (index: number) => void;
  submitQuizSession: (customTimeTakenSec?: number) => Promise<void>;
  resetQuizSession: () => void;

  // Operator Profile
  profile: OperatorProfile;
  updateProfile: (updated: Partial<OperatorProfile>) => Promise<void>;

  // Settings
  settings: AppSettings;
  updateSettings: <K extends keyof AppSettings>(
    category: K,
    values: Partial<AppSettings[K]>
  ) => void;
  resetSettings: () => void;

  // Global search query
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;

  // Toast Notifications
  toasts: ToastMessage[];
  addToast: (title: string, description?: string, variant?: ToastMessage['variant']) => void;
  dismissToast: (id: string) => void;
}

const DEFAULT_PROFILE: OperatorProfile = {
  displayName: '',
  username: '',
  whatsappNumber: '',
  email: '',
  biography: '',
  avatarUrl: null,
  avatarPreset: 'cipher-grid',
  createdAt: null,
  isVerified: null,
  isProfileComplete: false,
  strongestCategories: [],
  badges: [],
};

const DEFAULT_SETTINGS: AppSettings = {
  appearance: {
    gridOverlay: true,
    scanlineOverlay: false,
    compactDensity: false,
  },
  notifications: {
    competitionStartAlerts: false,
    leaderboardUpdates: false,
    resultPublication: false,
  },
  audio: {
    soundEffectsEnabled: false,
    countdownChimeEnabled: false,
  },
  accessibility: {
    reducedMotion: false,
    highContrastBorders: false,
    largeMonospaceText: false,
  },
  privacy: {
    publicOperatorProfile: false,
    displayLeaderboardHandle: true,
    shareTelemetryLogs: false,
  },
};

const QUIZ_STORAGE_KEY = 'nullorigin_quiz_session_v1';

const DEFAULT_QUIZ_SESSION: QuizSessionState = {
  competitionId: null,
  competitionTitle: null,
  deadlineTimestamp: null,
  currentQuestionIndex: 0,
  selectedAnswers: {},
  markedForReview: {},
  isSubmitted: false,
  submittedAt: null,
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [pythonEngineOnline, setPythonEngineOnline] = useState<boolean>(false);

  const ADMIN_EMAILS = [
    'checkship66@gmail.com',
    'hafizmujawar786@gmail.com',
    'kunalbankhele07@gmail.com',
  ];
  const isAdmin = Boolean(
    currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.trim().toLowerCase())
  );

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved =
          window.localStorage.getItem('nullorigin_user_results') ||
          window.localStorage.getItem('aegis_cipher_user_results');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // Ignore storage read errors
      }
    }
    return [];
  });
  const [activities] = useState<ActivityRecord[]>([]);

  const [targetStartTime, setTargetStartTime] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paramTime = params.get('targetTime');
      if (paramTime) return paramTime;
    }
    return null;
  });

  const [quizSession, setQuizSession] = useState<QuizSessionState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved =
          window.sessionStorage.getItem(QUIZ_STORAGE_KEY) ||
          window.sessionStorage.getItem('aegis_quiz_session_v1');
        if (saved) {
          return { ...DEFAULT_QUIZ_SESSION, ...JSON.parse(saved) };
        }
      } catch {
        // Ignore storage read errors
      }
      const params = new URLSearchParams(window.location.search);
      const quizDeadline = params.get('quizDeadline');
      if (quizDeadline && !Number.isNaN(Number(quizDeadline))) {
        return {
          ...DEFAULT_QUIZ_SESSION,
          deadlineTimestamp: Number(quizDeadline),
        };
      }
    }
    return DEFAULT_QUIZ_SESSION;
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(quizSession));
    } catch {
      // Ignore storage write errors
    }
  }, [quizSession]);

  const [profile, setProfile] = useState<OperatorProfile>(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (title: string, description?: string, variant: ToastMessage['variant'] = 'default') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Check Python Backend Engine Health on boot
  useEffect(() => {
    let active = true;
    fetch('/api/python/health')
      .then((res) => res.json())
      .then((data) => {
        if (active && data?.status === 'online') {
          setPythonEngineOnline(true);
        }
      })
      .catch(() => {
        if (active) setPythonEngineOnline(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Track Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore listener for Competitions
  useEffect(() => {
    if (!isAuthReady) return;
    const compQuery = query(
      collection(db, 'competitions'),
      where('status', 'in', ['upcoming', 'live', 'completed'])
    );
    const unsubscribe = onSnapshot(
      compQuery,
      (snapshot) => {
        const now = Date.now();
        const items: Competition[] = snapshot.docs.map((d) => {
          const data = d.data();
          const rawStatus = (data.status as Competition['status']) || 'upcoming';
          const startMs = data.startTime ? new Date(data.startTime).getTime() : NaN;
          const isTimerDone =
            rawStatus === 'upcoming' && !Number.isNaN(startMs) && startMs <= now;
          const effectiveStatus: Competition['status'] = isTimerDone ? 'live' : rawStatus;

          return {
            id: d.id,
            title: String(data.title || ''),
            description: data.description ? String(data.description) : undefined,
            status: effectiveStatus,
            startTime: data.startTime ? String(data.startTime) : undefined,
            durationMinutes:
              typeof data.durationMinutes === 'number' ? data.durationMinutes : undefined,
            difficulty: data.difficulty,
            accessType: data.accessType,
            perQuestionTimerSeconds:
              typeof data.perQuestionTimerSeconds === 'number' ? data.perQuestionTimerSeconds : 30,
          };
        });
        setCompetitions(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'competitions');
      }
    );
    return () => unsubscribe();
  }, [isAuthReady]);

  // Real-time Firestore listener for Questions of Selected Competition
  useEffect(() => {
    if (!isAuthReady || !selectedCompetition?.id) {
      setQuestions([]);
      return;
    }
    const qPath = `competitions/${selectedCompetition.id}/questions`;
    const qQuery = query(collection(db, qPath), where('index', '>=', 0));
    const unsubscribe = onSnapshot(
      qQuery,
      (snapshot) => {
        const loaded: QuizQuestion[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            index: Number(data.index || 0),
            category: data.category ? String(data.category) : undefined,
            points: typeof data.points === 'number' ? data.points : undefined,
            prompt: String(data.prompt || ''),
            codeSnippet: data.codeSnippet ? String(data.codeSnippet) : undefined,
            options: Array.isArray(data.options) ? data.options : [],
            correctOptionId: data.correctOptionId ? String(data.correctOptionId) : undefined,
            timeLimitSeconds:
              typeof data.timeLimitSeconds === 'number' ? data.timeLimitSeconds : undefined,
          };
        });
        loaded.sort((a, b) => a.index - b.index);
        setQuestions(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, qPath);
      }
    );
    return () => unsubscribe();
  }, [isAuthReady, selectedCompetition?.id]);

  // Real-time Firestore listener for Leaderboard + Python Ranking Engine sorting
  useEffect(() => {
    if (!isAuthReady) return;
    // Bound query to top 100 entries to strictly cap read quota under 300+ concurrent operators
    const lbQuery = query(collection(db, 'leaderboard'), where('score', '>=', 0), limit(100));
    const unsubscribe = onSnapshot(
      lbQuery,
      (snapshot) => {
        const rawEntries: LeaderboardEntry[] = snapshot.docs.map((d, i) => {
          const data = d.data();
          const compIdFromId = d.id.includes('_') ? d.id.split('_').slice(1).join('_') : undefined;
          return {
            rank: i + 1,
            participantId: d.id,
            competitionId: data.competitionId ? String(data.competitionId) : compIdFromId,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : null),
            category: data.category ? String(data.category) : undefined,
            displayName: String(data.displayName || 'Operator'),
            username: data.username ? String(data.username) : undefined,
            whatsappNumber: data.whatsappNumber ? String(data.whatsappNumber) : undefined,
            email: data.email ? String(data.email) : undefined,
            avatarUrl: data.avatarUrl ? String(data.avatarUrl) : undefined,
            score: Number(data.score || 0),
            completionStatus: data.completionStatus || 'Completed',
            accuracyPercent:
              typeof data.accuracyPercent === 'number' ? data.accuracyPercent : undefined,
            completionTimeSeconds:
              typeof data.completionTimeSeconds === 'number'
                ? data.completionTimeSeconds
                : undefined,
            isCurrentUser: currentUser ? data.ownerId === currentUser.uid : false,
          };
        });

        if (rawEntries.length === 0) {
          setLeaderboard([]);
          return;
        }

        // Fast deterministic client-side sorting:
        // 1. Score (descending - highest score first)
        // 2. Tie-breaker (Requirement): completionTimeSeconds (ascending - faster completion time ranks higher!)
        // 3. Tie-breaker 2 (Requirement): createdAt (ascending - earlier submission timestamp first / who submit first must be winner)
        // 4. Fallback: accuracyPercent (descending)
        rawEntries.sort((a, b) => {
          const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
          if (scoreDiff !== 0) return scoreDiff;

          const timeA =
            typeof a.completionTimeSeconds === 'number' && a.completionTimeSeconds >= 0
              ? a.completionTimeSeconds
              : 999999999;
          const timeB =
            typeof b.completionTimeSeconds === 'number' && b.completionTimeSeconds >= 0
              ? b.completionTimeSeconds
              : 999999999;
          const timeDiff = timeA - timeB;
          if (timeDiff !== 0) return timeDiff;

          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 9999999999999;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 9999999999999;
          const dateDiff = dateA - dateB;
          if (dateDiff !== 0) return dateDiff;

          const accDiff = Number(b.accuracyPercent || 0) - Number(a.accuracyPercent || 0);
          return accDiff;
        });

        setLeaderboard(rawEntries.map((item, idx) => ({ ...item, rank: idx + 1 })));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'leaderboard');
      }
    );
    return () => unsubscribe();
  }, [isAuthReady, currentUser]);

  // Real-time Firestore listener for Operator Profile & Private Results when signed in
  useEffect(() => {
    if (!isAuthReady || !currentUser) {
      return;
    }

    const profileRef = doc(db, 'profiles', currentUser.uid);
    const unsubProfile = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setProfile((prev) => ({
            ...prev,
            displayName: String(data.displayName || ''),
            username: String(data.username || ''),
            whatsappNumber: data.whatsappNumber ? String(data.whatsappNumber) : '',
            email: data.email ? String(data.email) : (currentUser.email || ''),
            avatarUrl: data.avatarUrl ? String(data.avatarUrl) : null,
            avatarPreset: String(data.avatarPreset || 'cipher-grid'),
            isProfileComplete: Boolean(
              data.isProfileComplete ||
              (data.displayName && String(data.displayName).trim().length >= 2 && data.whatsappNumber && String(data.whatsappNumber).trim().length >= 6)
            ),
            isVerified: Boolean(currentUser.emailVerified),
          }));
        } else {
          setProfile((prev) => ({
            ...prev,
            displayName: currentUser.displayName || '',
            email: currentUser.email || '',
            isProfileComplete: Boolean(
              currentUser.displayName && currentUser.displayName.trim().length >= 2 && prev.whatsappNumber && prev.whatsappNumber.trim().length >= 6
            ),
          }));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `profiles/${currentUser.uid}`);
      }
    );

    const resultsQuery = query(
      collection(db, 'results'),
      where('ownerId', '==', currentUser.uid)
    );
    const unsubResults = onSnapshot(
      resultsQuery,
      (snap) => {
        const items: CompetitionResult[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            competitionId: String(data.competitionId || ''),
            competitionName: String(data.competitionName || ''),
            completedAt:
              data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            finalScore: Number(data.finalScore || 0),
            maxScore: typeof data.maxScore === 'number' ? data.maxScore : undefined,
            accuracyPercent:
              typeof data.accuracyPercent === 'number' ? data.accuracyPercent : undefined,
            timeTakenSeconds:
              typeof data.timeTakenSeconds === 'number' ? data.timeTakenSeconds : undefined,
            correctCount:
              typeof data.correctCount === 'number' ? data.correctCount : undefined,
            incorrectCount:
              typeof data.incorrectCount === 'number' ? data.incorrectCount : undefined,
            unwrittenCount:
              typeof data.unwrittenCount === 'number' ? data.unwrittenCount : undefined,
            wrongAnswerCount:
              typeof data.wrongAnswerCount === 'number' ? data.wrongAnswerCount : undefined,
          };
        });
        setResults((prev) => {
          const map = new Map<string, CompetitionResult>();
          prev.forEach((r) => {
            if (r.competitionId) map.set(r.competitionId, r);
          });
          items.forEach((r) => {
            if (r.competitionId) map.set(r.competitionId, r);
          });
          const merged = Array.from(map.values());
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('nullorigin_user_results', JSON.stringify(merged));
              window.localStorage.setItem('aegis_cipher_user_results', JSON.stringify(merged));
              if (currentUser) {
                window.localStorage.setItem(`nullorigin_user_results_${currentUser.uid}`, JSON.stringify(merged));
                window.localStorage.setItem(`aegis_user_results_${currentUser.uid}`, JSON.stringify(merged));
              }
            }
          } catch {
            // Ignore storage write errors
          }
          return merged;
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'results');
      }
    );

    return () => {
      unsubProfile();
      unsubResults();
    };
  }, [isAuthReady, currentUser]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      addToast(
        'Operator Authenticated',
        'Connected to Firebase Authentication & Firestore session.',
        'success'
      );
    } catch (err) {
      addToast(
        'Authentication Cancelled or Failed',
        err instanceof Error ? err.message : 'Unable to complete Google sign-in.',
        'alert'
      );
    }
  }, [addToast]);

  const signOutOperator = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setProfile(DEFAULT_PROFILE);
      setResults([]);
      addToast('Operator Signed Out', 'Disconnected from authenticated session.');
    } catch (err) {
      addToast(
        'Sign-Out Error',
        err instanceof Error ? err.message : 'Failed to sign out.',
        'alert'
      );
    }
  }, [addToast]);

  const signInWithEmail = useCallback(
    async (email: string, pass: string) => {
      try {
        await signInWithEmailAndPassword(auth, email.trim(), pass);
        addToast('Operator Authenticated', 'Signed in with email and password.', 'success');
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Invalid credentials or login failed.';
        addToast('Sign-In Error', msg, 'alert');
        return { success: false, error: msg };
      }
    },
    [addToast]
  );

  const signUpWithEmail = useCallback(
    async (email: string, pass: string) => {
      try {
        await createUserWithEmailAndPassword(auth, email.trim(), pass);
        addToast('Account Registered', 'Welcome! Please complete your competitor profile.', 'success');
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create account.';
        addToast('Registration Error', msg, 'alert');
        return { success: false, error: msg };
      }
    },
    [addToast]
  );

  const saveCompetitorProfile = useCallback(
    async (data: { displayName: string; whatsappNumber: string; avatarUrl: string }) => {
      if (!currentUser) {
        return { success: false, error: 'User is not authenticated' };
      }

      const trimmedName = data.displayName.trim();
      const trimmedPhone = data.whatsappNumber.trim();
      if (trimmedName.length < 2) {
        return { success: false, error: 'Please enter a valid full name (minimum 2 characters).' };
      }
      if (trimmedPhone.length < 7) {
        return { success: false, error: 'Please enter a valid WhatsApp phone number.' };
      }

      const userEmail = (currentUser.email || '').trim().toLowerCase();
      let sanitizedUsername = (userEmail.split('@')[0] || trimmedName)
        .replace(/[^a-zA-Z0-9_.-]/g, '_')
        .slice(0, 24);
      if (sanitizedUsername.length < 3) {
        sanitizedUsername = `user_${currentUser.uid.slice(0, 8)}`;
      }

      const profileDocRef = doc(db, 'profiles', currentUser.uid);
      try {
        const snap = await getDoc(profileDocRef);
        const payload = {
          ownerId: currentUser.uid,
          displayName: trimmedName.slice(0, 64),
          username: sanitizedUsername,
          whatsappNumber: trimmedPhone.slice(0, 32),
          email: userEmail.slice(0, 120),
          avatarUrl: data.avatarUrl,
          isProfileComplete: true,
          biography: 'Cybersecurity Tournament Competitor',
          avatarPreset: 'cipher-grid',
          updatedAt: serverTimestamp(),
        };

        if (!snap.exists()) {
          await setDoc(profileDocRef, {
            ...payload,
            createdAt: serverTimestamp(),
          });
        } else {
          await updateDoc(profileDocRef, payload);
        }

        setProfile((prev) => ({
          ...prev,
          displayName: trimmedName,
          whatsappNumber: trimmedPhone,
          email: userEmail,
          avatarUrl: data.avatarUrl,
          isProfileComplete: true,
        }));

        addToast(
          'Competitor Profile Verified',
          'Profile details saved. You are now eligible to access the quiz competition.',
          'success'
        );
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save competitor profile.';
        addToast('Profile Save Error', msg, 'alert');
        return { success: false, error: msg };
      }
    },
    [currentUser, addToast]
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectCompetition = useCallback((comp: Competition | null) => {
    setSelectedCompetition(comp);
    if (comp?.startTime) {
      setTargetStartTime(comp.startTime);
    }
  }, []);

  const transitionCompetitionToLive = useCallback(
    async (competitionId: string) => {
      // 1. Immediately update local state so UI switches from upcoming to live without delay
      setCompetitions((prev) =>
        prev.map((c) => (c.id === competitionId ? { ...c, status: 'live' } : c))
      );
      setSelectedCompetition((prev) =>
        prev && prev.id === competitionId ? { ...prev, status: 'live' } : prev
      );

      // 2. Persist status update to Firestore
      try {
        const compRef = doc(db, 'competitions', competitionId);
        await updateDoc(compRef, {
          status: 'live',
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Local state is already updated; ignore if offline or permission boundary
      }
    },
    []
  );

  // Periodic 1-second check to convert any upcoming competition to live once its countdown expires
  useEffect(() => {
    const checkTimers = () => {
      const now = Date.now();
      competitions.forEach((c) => {
        if (c.status === 'upcoming' && c.startTime) {
          const startMs = new Date(c.startTime).getTime();
          if (!Number.isNaN(startMs) && startMs <= now) {
            transitionCompetitionToLive(c.id);
          }
        }
      });
    };

    const intervalId = setInterval(checkTimers, 1000);
    return () => clearInterval(intervalId);
  }, [competitions, transitionCompetitionToLive]);

  const startQuizSession = useCallback((comp: Competition) => {
    setSelectedCompetition(comp);
    const questionCount = comp.quizFormat?.totalQuestions || 30;
    const minMinutesNeeded = Math.ceil((questionCount * 30) / 60) + 15;
    const durationMin = Math.max(comp.durationMinutes || 30, minMinutesNeeded);
    const computedDeadline = Date.now() + durationMin * 60 * 1000;

    const newSession: QuizSessionState = {
      competitionId: comp.id,
      competitionTitle: comp.title,
      deadlineTimestamp: computedDeadline,
      currentQuestionIndex: 0,
      selectedAnswers: {},
      markedForReview: {},
      isSubmitted: false,
      submittedAt: null,
    };
    setQuizSession(newSession);
    try {
      window.sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(newSession));
    } catch {
      // Ignore
    }
  }, []);

  const selectQuizAnswer = useCallback((questionId: string, optionId: string) => {
    setQuizSession((prev) => {
      if (prev.isSubmitted) return prev;
      return {
        ...prev,
        selectedAnswers: {
          ...prev.selectedAnswers,
          [questionId]: optionId,
        },
      };
    });
  }, []);

  const toggleMarkForReview = useCallback((questionId: string) => {
    setQuizSession((prev) => {
      if (prev.isSubmitted) return prev;
      const current = Boolean(prev.markedForReview[questionId]);
      return {
        ...prev,
        markedForReview: {
          ...prev.markedForReview,
          [questionId]: !current,
        },
      };
    });
  }, []);

  const setCurrentQuestionIndex = useCallback((index: number) => {
    setQuizSession((prev) => ({
      ...prev,
      currentQuestionIndex: Math.max(0, index),
    }));
  }, []);

  const submitQuizSession = useCallback(async (customTimeTakenSec?: number) => {
    if (quizSession.isSubmitted || isSubmitting) {
      return;
    }
    setIsSubmitting(true);

    try {
      const now = Date.now();
      const durationMin = selectedCompetition?.durationMinutes || 30;
      const estStart = quizSession.deadlineTimestamp
        ? quizSession.deadlineTimestamp - durationMin * 60 * 1000
        : now - 60000;
      const timeTakenSec =
        typeof customTimeTakenSec === 'number' && customTimeTakenSec > 0
          ? Math.min(86400, Math.round(customTimeTakenSec))
          : Math.max(1, Math.min(86400, Math.floor((now - estStart) / 1000)));

      // Evaluate submission through the Python backend logic engine
      let evaluated = {
        finalScore: 0,
        maxScore: 0,
        accuracyPercent: 0,
        correctCount: 0,
        incorrectCount: 0,
        unwrittenCount: 0,
        wrongAnswerCount: 0,
      };

      try {
        const resp = await fetch('/api/python/evaluate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions,
            selectedAnswers: quizSession.selectedAnswers,
            markedForReview: quizSession.markedForReview,
            timeTakenSeconds: timeTakenSec,
          }),
        });
        if (resp.ok) {
          evaluated = await resp.json();
        }
      } catch {
        // Fallback local scoring if Python endpoint unavailable
        let earned = 0;
        let totalPossible = 0;
        let correct = 0;
        let wrongAnswers = 0;
        let unwritten = 0;
        for (const q of questions) {
          const pts = typeof q.points === 'number' ? q.points : 100;
          totalPossible += pts;
          const chosen = quizSession.selectedAnswers[q.id];
          if (chosen !== undefined && chosen !== null && String(chosen).trim() !== '') {
            if (q.correctOptionId && String(chosen) === String(q.correctOptionId)) {
              earned += pts;
              correct += 1;
            } else {
              wrongAnswers += 1;
            }
          } else {
            // Unwritten / timed out without answer: 0 pts, counted as unwritten & wrong
            unwritten += 1;
          }
        }
        evaluated = {
          finalScore: earned,
          maxScore: totalPossible,
          accuracyPercent: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
          correctCount: correct,
          incorrectCount: wrongAnswers + unwritten,
          unwrittenCount: unwritten,
          wrongAnswerCount: wrongAnswers,
        };
      }

      setQuizSession((prev) => ({
        ...prev,
        isSubmitted: true,
        submittedAt: new Date().toISOString(),
      }));

      const activeCompId = selectedCompetition?.id || quizSession.competitionId;
      const activeCompTitle = selectedCompetition?.title || quizSession.competitionTitle || 'Cybersecurity Quiz Competition';

      if (currentUser && activeCompId) {
        const resultId = `${currentUser.uid}_${activeCompId}`;
        try {
          await setDoc(doc(db, 'results', resultId), {
            ownerId: currentUser.uid,
            competitionId: activeCompId,
            competitionName: activeCompTitle.slice(0, 120),
            finalScore: Number(evaluated.finalScore || 0),
            maxScore: Number(evaluated.maxScore || 0),
            accuracyPercent: Number(evaluated.accuracyPercent || 0),
            correctCount: Number(evaluated.correctCount || 0),
            incorrectCount: Number(evaluated.incorrectCount || 0),
            unwrittenCount: Number(evaluated.unwrittenCount || 0),
            wrongAnswerCount: Number(evaluated.wrongAnswerCount || 0),
            timeTakenSeconds: timeTakenSec,
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `results/${resultId}`);
        }

        const targetComp = competitions.find((c) => c.id === activeCompId);
        const isPractice =
          Boolean(targetComp && targetComp.title.toLowerCase().includes('practice')) ||
          activeCompId.toLowerCase().includes('practice');

        const entryId = `${currentUser.uid}_${activeCompId}`;
        const cleanDisplayName = (profile.displayName || currentUser.displayName || 'Operator').trim().slice(0, 64);

        // NEVER write practice quizzes to public leaderboard or winner contacts - only official tournaments (Cyber Quiz 2026)
        if (!isPractice) {
          try {
            await setDoc(doc(db, 'leaderboard', entryId), {
              ownerId: currentUser.uid,
              competitionId: activeCompId,
              displayName: cleanDisplayName,
              ...(profile.username ? { username: profile.username.trim().slice(0, 24) } : {}),
              ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl.slice(0, 500) } : {}),
              score: Number(evaluated.finalScore || 0),
              completionStatus: 'Completed',
              accuracyPercent: Number(evaluated.accuracyPercent || 0),
              completionTimeSeconds: timeTakenSec,
              createdAt: serverTimestamp(),
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `leaderboard/${entryId}`);
          }

          // Securely store winner contact details in admin-protected winner_contacts collection
          try {
            await setDoc(doc(db, 'winner_contacts', entryId), {
              ownerId: currentUser.uid,
              competitionId: activeCompId,
              displayName: cleanDisplayName,
              ...(profile.whatsappNumber ? { whatsappNumber: profile.whatsappNumber.trim().slice(0, 32) } : {}),
              ...(profile.email || currentUser.email ? { email: (profile.email || currentUser.email || '').trim().slice(0, 120) } : {}),
              score: Number(evaluated.finalScore || 0),
              createdAt: serverTimestamp(),
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `winner_contacts/${entryId}`);
          }
        }

        // Immediately update local results and persist to localStorage
        const newResultItem: CompetitionResult = {
          id: resultId,
          competitionId: activeCompId,
          competitionName: activeCompTitle,
          completedAt: new Date().toISOString(),
          finalScore: Number(evaluated.finalScore || 0),
          maxScore: Number(evaluated.maxScore || 0),
          accuracyPercent: Number(evaluated.accuracyPercent || 0),
          correctCount: Number(evaluated.correctCount || 0),
          incorrectCount: Number(evaluated.incorrectCount || 0),
          unwrittenCount: Number(evaluated.unwrittenCount || 0),
          wrongAnswerCount: Number(evaluated.wrongAnswerCount || 0),
          timeTakenSeconds: timeTakenSec,
        };

        setResults((prev) => {
          const remaining = prev.filter((r) => r.competitionId !== activeCompId);
          const nextList = [newResultItem, ...remaining];
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('nullorigin_user_results', JSON.stringify(nextList));
              window.localStorage.setItem('aegis_cipher_user_results', JSON.stringify(nextList));
              if (currentUser) {
                window.localStorage.setItem(`nullorigin_user_results_${currentUser.uid}`, JSON.stringify(nextList));
                window.localStorage.setItem(`aegis_user_results_${currentUser.uid}`, JSON.stringify(nextList));
                if (!isPractice) {
                  window.localStorage.setItem(`completed_comp_${currentUser.uid}_${activeCompId}`, 'true');
                }
              }
            }
          } catch {
            // Ignore storage write errors
          }
          return nextList;
        });

        // Immediately update leaderboard state with current user's entry (Cyber Quiz 2026 only, never practice quiz)
        if (!isPractice) {
          setLeaderboard((prev) => {
            const filtered = prev.filter((l) => l.participantId !== entryId);
            const myEntry: LeaderboardEntry = {
              rank: 1,
              participantId: entryId,
              competitionId: activeCompId,
              createdAt: new Date().toISOString(),
              displayName: cleanDisplayName,
              score: Number(evaluated.finalScore || 0),
              completionStatus: 'Completed',
              accuracyPercent: Number(evaluated.accuracyPercent || 0),
              completionTimeSeconds: timeTakenSec,
              isCurrentUser: true,
            };
            return [...filtered, myEntry]
              .sort((a, b) => b.score - a.score)
              .map((item, idx) => ({ ...item, rank: idx + 1 }));
          });
        }
      }

      addToast(
        'Quiz Evaluated & Recorded',
        currentUser && activeCompId
          ? 'Evaluated by scoring engine, persisted to Firestore results and leaderboard.'
          : 'Evaluated by scoring engine and saved in local session state.',
        'success'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [questions, quizSession, currentUser, selectedCompetition, profile, isSubmitting, addToast]);

  const resetQuizSession = useCallback(() => {
    setQuizSession(DEFAULT_QUIZ_SESSION);
    try {
      window.sessionStorage.removeItem(QUIZ_STORAGE_KEY);
      window.localStorage.removeItem(QUIZ_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const updateProfile = useCallback(
    async (updated: Partial<OperatorProfile>) => {
      const merged = {
        ...profile,
        ...updated,
      };

      // Validate through Python backend engine first
      try {
        const resp = await fetch('/api/python/validate-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: merged.displayName,
            username: merged.username,
            biography: merged.biography,
          }),
        });
        if (resp.ok) {
          const valResult = await resp.json();
          if (!valResult.isValid) {
            addToast(
              'Profile Validation Rejected by Python Engine',
              Object.values(valResult.errors || {}).join(' '),
              'alert'
            );
            return;
          }
        }
      } catch {
        // Fallback to local state if offline
      }

      setProfile(merged);

      if (currentUser && merged.displayName.trim().length >= 2 && merged.username.trim().length >= 3) {
        const profilePath = `profiles/${currentUser.uid}`;
        const docRef = doc(db, 'profiles', currentUser.uid);
        try {
          const existingSnap = await getDoc(docRef);
          if (!existingSnap.exists()) {
            await setDoc(docRef, {
              ownerId: currentUser.uid,
              displayName: merged.displayName.trim().slice(0, 48),
              username: merged.username.trim().slice(0, 24),
              biography: (merged.biography || '').trim().slice(0, 280),
              avatarPreset: (merged.avatarPreset || 'cipher-grid').slice(0, 32),
              ...(merged.whatsappNumber ? { whatsappNumber: merged.whatsappNumber.trim().slice(0, 32) } : {}),
              ...(merged.email || currentUser.email ? { email: (merged.email || currentUser.email || '').trim().slice(0, 120) } : {}),
              ...(merged.avatarUrl ? { avatarUrl: merged.avatarUrl.slice(0, 500) } : {}),
              isProfileComplete: Boolean(merged.isProfileComplete || (merged.whatsappNumber && merged.displayName)),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            await updateDoc(docRef, {
              displayName: merged.displayName.trim().slice(0, 48),
              username: merged.username.trim().slice(0, 24),
              biography: (merged.biography || '').trim().slice(0, 280),
              avatarPreset: (merged.avatarPreset || 'cipher-grid').slice(0, 32),
              ...(merged.whatsappNumber ? { whatsappNumber: merged.whatsappNumber.trim().slice(0, 32) } : {}),
              ...(merged.email || currentUser.email ? { email: (merged.email || currentUser.email || '').trim().slice(0, 120) } : {}),
              ...(merged.avatarUrl ? { avatarUrl: merged.avatarUrl.slice(0, 500) } : {}),
              isProfileComplete: Boolean(merged.isProfileComplete || (merged.whatsappNumber && merged.displayName)),
              updatedAt: serverTimestamp(),
            });
          }
          addToast(
            'Operator Profile Synced to Firestore',
            'Validated by Python engine and saved to Firebase Firestore.',
            'success'
          );
          return;
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, profilePath);
        }
      }

      addToast(
        'Operator Profile Updated',
        'Validated by Python engine and stored in session state. Sign in with Google to persist to Firestore.',
        'success'
      );
    },
    [profile, currentUser, addToast]
  );

  const updateSettings = useCallback(
    <K extends keyof AppSettings>(category: K, values: Partial<AppSettings[K]>) => {
      setSettings((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          ...values,
        },
      }));
    },
    []
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    addToast('Preferences Restored', 'Local interface preferences reset to default values.');
  }, [addToast]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.accessibility.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    if (settings.accessibility.highContrastBorders) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [settings.accessibility.reducedMotion, settings.accessibility.highContrastBorders]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAdmin,
        isAuthReady,
        pythonEngineOnline,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOutOperator,
        saveCompetitorProfile,
        competitions,
        selectedCompetition,
        selectCompetition,
        transitionCompetitionToLive,
        questions,
        leaderboard,
        results,
        activities,
        targetStartTime,
        setTargetStartTime,
        quizSession,
        isSubmitting,
        startQuizSession,
        selectQuizAnswer,
        toggleMarkForReview,
        setCurrentQuestionIndex,
        submitQuizSession,
        resetQuizSession,
        profile,
        updateProfile,
        settings,
        updateSettings,
        resetSettings,
        globalSearchQuery,
        setGlobalSearchQuery,
        toasts,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return ctx;
}
