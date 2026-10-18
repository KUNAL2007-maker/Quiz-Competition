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
  submitQuizSession: () => Promise<void>;
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

const QUIZ_STORAGE_KEY = 'aegis_quiz_session_v1';

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

  const isAdmin = Boolean(
    currentUser?.email && currentUser.email.trim().toLowerCase() === 'checkship66@gmail.com'
  );

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
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
        const saved = window.sessionStorage.getItem(QUIZ_STORAGE_KEY);
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
        const items: Competition[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: String(data.title || ''),
            description: data.description ? String(data.description) : undefined,
            status: data.status || 'upcoming',
            startTime: data.startTime ? String(data.startTime) : undefined,
            durationMinutes:
              typeof data.durationMinutes === 'number' ? data.durationMinutes : undefined,
            difficulty: data.difficulty,
            accessType: data.accessType,
            perQuestionTimerSeconds:
              typeof data.perQuestionTimerSeconds === 'number' ? data.perQuestionTimerSeconds : 15,
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
    const lbQuery = query(collection(db, 'leaderboard'), where('score', '>=', 0));
    const unsubscribe = onSnapshot(
      lbQuery,
      async (snapshot) => {
        const rawEntries: LeaderboardEntry[] = snapshot.docs.map((d, i) => {
          const data = d.data();
          return {
            rank: i + 1,
            participantId: d.id,
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

        try {
          const resp = await fetch('/api/python/rank-leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entries: rawEntries }),
          });
          if (resp.ok) {
            const rankedData = await resp.json();
            if (Array.isArray(rankedData.entries)) {
              setLeaderboard(rankedData.entries);
              return;
            }
          }
        } catch {
          // Fallback to local sort if Python endpoint is unreachable
        }
        rawEntries.sort((a, b) => b.score - a.score);
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
            isProfileComplete: Boolean(data.isProfileComplete),
            isVerified: Boolean(currentUser.emailVerified),
          }));
        } else {
          setProfile((prev) => ({
            ...prev,
            displayName: currentUser.displayName || '',
            email: currentUser.email || '',
            isProfileComplete: false,
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
          };
        });
        setResults(items);
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
      const sanitizedUsername = (userEmail.split('@')[0] || trimmedName)
        .replace(/[^a-zA-Z0-9_.-]/g, '_')
        .slice(0, 24) || `user_${currentUser.uid.slice(0, 6)}`;

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

  const startQuizSession = useCallback((comp: Competition) => {
    setSelectedCompetition(comp);
    const durationMin = comp.durationMinutes || 30;
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

  const submitQuizSession = useCallback(async () => {
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
      const timeTakenSec = Math.max(1, Math.min(86400, Math.floor((now - estStart) / 1000)));

      // Evaluate submission through the Python backend logic engine
      let evaluated = {
        finalScore: 0,
        maxScore: 0,
        accuracyPercent: 0,
        correctCount: 0,
        incorrectCount: 0,
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
        let answered = 0;
        for (const q of questions) {
          const pts = q.points || 100;
          totalPossible += pts;
          if (quizSession.selectedAnswers[q.id]) {
            earned += pts;
            answered += 1;
          }
        }
        evaluated = {
          finalScore: earned,
          maxScore: totalPossible,
          accuracyPercent: questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0,
          correctCount: answered,
          incorrectCount: Math.max(0, questions.length - answered),
        };
      }

      setQuizSession((prev) => ({
        ...prev,
        isSubmitted: true,
        submittedAt: new Date().toISOString(),
      }));

      const activeCompId = selectedCompetition?.id || quizSession.competitionId;
      const activeCompTitle = selectedCompetition?.title || quizSession.competitionTitle || 'Cybersecurity Assessment';

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
            timeTakenSeconds: timeTakenSec,
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `results/${resultId}`);
        }

        const entryId = `${currentUser.uid}_${activeCompId}`;
        try {
          await setDoc(doc(db, 'leaderboard', entryId), {
            ownerId: currentUser.uid,
            competitionId: activeCompId,
            displayName: (profile.displayName || currentUser.displayName || 'Operator').trim().slice(0, 64),
            ...(profile.username ? { username: profile.username.trim().slice(0, 24) } : {}),
            ...(profile.whatsappNumber ? { whatsappNumber: profile.whatsappNumber.trim().slice(0, 32) } : {}),
            ...(profile.email || currentUser.email ? { email: (profile.email || currentUser.email || '').trim().slice(0, 120) } : {}),
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
      }

      addToast(
        'Assessment Evaluated & Locked',
        currentUser && activeCompId
          ? 'Evaluated by Python engine, persisted to Firestore results and leaderboard.'
          : 'Evaluated by Python engine and locked in local session state.',
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
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            await updateDoc(docRef, {
              displayName: merged.displayName.trim().slice(0, 48),
              username: merged.username.trim().slice(0, 24),
              biography: (merged.biography || '').trim().slice(0, 280),
              avatarPreset: (merged.avatarPreset || 'cipher-grid').slice(0, 32),
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
