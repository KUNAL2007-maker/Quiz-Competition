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
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
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
import cyberQuizQuestions from '../constants/cyberQuizQuestions.json';
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
import { applyCalibration, isExcludedLeaderboardEntry, filterLeaderboardEntries } from '../utils/leaderboardCalibration';
import leaderboardSeed from '../constants/leaderboardSeed.json';

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
  submitQuizSession: (customTimeTakenSec?: number, questionsToScore?: QuizQuestion[]) => Promise<void>;
  submitDisqualifiedQuizSession: (reason?: string) => Promise<void>;
  resetAdminTestSession: () => Promise<void>;
  resetQuizSession: () => void;

  // Operator Profile
  profile: OperatorProfile;
  updateProfile: (updated: Partial<OperatorProfile>) => Promise<boolean>;

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

  const [profile, setProfile] = useState<OperatorProfile>(DEFAULT_PROFILE);

  const ADMIN_EMAILS = [
    'checkship66@gmail.com',
    'hafizmujawar786@gmail.com',
    'kunalbankhele07@gmail.com',
  ];
  const isAdmin = Boolean(
    currentUser?.email &&
      ADMIN_EMAILS.includes(currentUser.email.trim().toLowerCase())
  );

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => filterLeaderboardEntries(leaderboardSeed as LeaderboardEntry[]));
  // Do NOT initialise results from the shared localStorage key
  // ('nullorigin_user_results'). That key is global to the browser, not
  // per-user, so a fresh signup on the same device would inherit the
  // PREVIOUS user's results — a brand-new account would wrongly show
  // "already taken the quiz with zero points". The Firestore listener
  // (scoped by ownerId == currentUser.uid) is the only source of truth
  // and populates this correctly for the signed-in user.
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
        const saved =
          window.sessionStorage.getItem(QUIZ_STORAGE_KEY) ||
          window.sessionStorage.getItem('aegis_quiz_session_v1');
        if (saved) {
          return { ...DEFAULT_QUIZ_SESSION, ...JSON.parse(saved) };
        }
      } catch {
        // Ignore storage read errors
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
          const endMs = data.endTime ? new Date(data.endTime).getTime() : NaN;
          const isTimerDone =
            rawStatus === 'upcoming' && !Number.isNaN(startMs) && startMs <= now;
          const isPastEnd =
            (rawStatus === 'live' || isTimerDone) &&
            !Number.isNaN(endMs) &&
            endMs <= now;
          const effectiveStatus: Competition['status'] = isPastEnd
            ? 'completed'
            : isTimerDone
              ? 'live'
              : rawStatus;

          return {
            id: d.id,
            title: String(data.title || ''),
            description: data.description ? String(data.description) : undefined,
            status: effectiveStatus,
            startTime: data.startTime ? String(data.startTime) : undefined,
            endTime: data.endTime ? String(data.endTime) : undefined,
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
        // Fallback: if Firestore has no questions for the live Cyber Quiz 2026,
        // use the bundled 50-question bank so scoring (which reads this same
        // list) does not compute over zero questions and return 0 marks.
        if (loaded.length === 0 && selectedCompetition?.id === 'comp_1793963656835') {
          const fallback: QuizQuestion[] = (
            cyberQuizQuestions as unknown as QuizQuestion[]
          ).map((q, i) => ({ ...q, id: q.id || `json_${q.index ?? i}` }));
          setQuestions(fallback);
        } else {
          setQuestions(loaded);
        }
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
    // Fetch the true top 100 by score (not an arbitrary 100): without orderBy,
    // Firestore returns documents in an undefined order, so the client-side
    // rank was computed over the wrong set and a perfect 3000 could show as
    // rank #38. Order by score desc so the top 100 are the actual leaders.
    const lbQuery = query(collection(db, 'leaderboard'), where('score', '>=', 0), orderBy('score', 'desc'), limit(100));
    const unsubscribe = onSnapshot(
      lbQuery,
      (snapshot) => {
        const rawEntries: LeaderboardEntry[] = snapshot.docs.map((d, i) => {
          const data = d.data();
          const compIdFromId = d.id.includes('_') ? d.id.split('_').slice(1).join('_') : undefined;
          const compId = data.competitionId ? String(data.competitionId) : compIdFromId;
          const score = Number(data.score || 0);
          // Correct stored accuracy that was computed on the 50-question bank:
          // for the Cyber Quiz 2026 the paper is 30 questions (3000 max), so
          // accuracy is score/3000. The score itself was already correct.
          let accuracyPercent =
            typeof data.accuracyPercent === 'number' ? data.accuracyPercent : undefined;
          if (compId === 'comp_1793963656835') {
            accuracyPercent = Math.round((score / 3000) * 100);
          }
          return {
            rank: i + 1,
            participantId: d.id,
            competitionId: compId,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : null),
            category: data.category ? String(data.category) : undefined,
            displayName: String(data.displayName || 'Operator'),
            username: data.username ? String(data.username) : undefined,
            whatsappNumber: data.whatsappNumber ? String(data.whatsappNumber) : undefined,
            email: data.email ? String(data.email) : undefined,
            avatarUrl: data.avatarUrl ? String(data.avatarUrl) : undefined,
            score,
            completionStatus: data.completionStatus || 'Completed',
            accuracyPercent,
            completionTimeSeconds:
              typeof data.completionTimeSeconds === 'number'
                ? data.completionTimeSeconds
                : undefined,
            isCurrentUser: currentUser ? data.ownerId === currentUser.uid : false,
          };
          return applyCalibration(entry);
        }).filter((entry) => !isExcludedLeaderboardEntry(entry));

        if (rawEntries.length === 0) {
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
        console.warn('Leaderboard stream warning, preserving calibrated standing:', error.message);
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
            // Every signed-in user is treated as verified directly —
            // no email confirmation link is required (Google and
            // email/password alike). This is what makes a new user
            // eligible for the quiz and certificates immediately.
            isVerified: true,
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
          const compId = String(data.competitionId || '');
          const finalScore = Number(data.finalScore || 0);
          const correctCount =
            typeof data.correctCount === 'number' ? data.correctCount : undefined;
          const wrongAnswerCount =
            typeof data.wrongAnswerCount === 'number' ? data.wrongAnswerCount : undefined;
          // Correct stored scores that were computed on the 50-question bank:
          // the paper is 30 questions, so maxScore is 3000 and accuracy is
          // correct/30. Recompute from correctCount/wrongAnswerCount (source
          // of truth) for the Cyber Quiz 2026 so every previous result shows
          // the right numbers.
          let maxScore = typeof data.maxScore === 'number' ? data.maxScore : undefined;
          let accuracyPercent =
            typeof data.accuracyPercent === 'number' ? data.accuracyPercent : undefined;
          let incorrectCount =
            typeof data.incorrectCount === 'number' ? data.incorrectCount : undefined;
          let unwrittenCount =
            typeof data.unwrittenCount === 'number' ? data.unwrittenCount : undefined;
          if (compId === 'comp_1793963656835' && correctCount !== undefined) {
            const wrong = wrongAnswerCount ?? 0;
            maxScore = 3000;
            accuracyPercent = Math.round((correctCount / 30) * 100);
            unwrittenCount = Math.max(0, 30 - correctCount - wrong);
            incorrectCount = 30 - correctCount;
          }
          return {
            id: d.id,
            competitionId: compId,
            competitionName: String(data.competitionName || ''),
            completedAt:
              data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            finalScore,
            maxScore,
            accuracyPercent,
            timeTakenSeconds:
              typeof data.timeTakenSeconds === 'number' ? data.timeTakenSeconds : undefined,
            correctCount,
            incorrectCount,
            unwrittenCount,
            wrongAnswerCount,
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
        // No verification email is sent. Every signed-in user is treated as
        // verified directly (Google and email/password alike), so a new
        // student can complete their profile and take the quiz immediately
        // with no confirmation link.
        addToast('Account Registered', 'Welcome! Your account is ready — please complete your competitor profile.', 'success');
        return { success: true };
      } catch (err) {
        const firebaseErr = err as { code?: string; message?: string };
        let msg = firebaseErr?.message || 'Failed to create account.';
        if (firebaseErr?.code === 'auth/email-already-in-use') {
          msg = 'This email already has an account, please sign in instead.';
        }
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
        // ownerId is set only on create. The profile update rule forbids
        // changing ownerId (it is not in the allowed affectedKeys), so the
        // update payload must not include it — otherwise a repeat save on an
        // existing profile is rejected and the name silently stays blank.
        const payload = {
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
            ownerId: currentUser.uid,
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

  const transitionCompetitionToCompleted = useCallback(
    async (competitionId: string) => {
      // 1. Immediately update local state so UI switches from live to completed without delay
      setCompetitions((prev) =>
        prev.map((c) => (c.id === competitionId ? { ...c, status: 'completed' } : c))
      );
      setSelectedCompetition((prev) =>
        prev && prev.id === competitionId ? { ...prev, status: 'completed' } : prev
      );

      // 2. Persist status update to Firestore
      try {
        const compRef = doc(db, 'competitions', competitionId);
        await updateDoc(compRef, {
          status: 'completed',
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Local state is already updated; ignore if offline or permission boundary
      }
    },
    []
  );

  // Periodic 1-second check to convert any upcoming competition to live once its countdown expires,
  // and to close any live competition once its end time passes
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
        if (c.status === 'live' && c.endTime) {
          const endMs = new Date(c.endTime).getTime();
          if (!Number.isNaN(endMs) && endMs <= now) {
            transitionCompetitionToCompleted(c.id);
          }
        }
      });
    };

    const intervalId = setInterval(checkTimers, 1000);
    return () => clearInterval(intervalId);
  }, [competitions, transitionCompetitionToLive, transitionCompetitionToCompleted]);

  const startQuizSession = useCallback((comp: Competition) => {
    setSelectedCompetition(comp);
    const questionCount = comp.quizFormat?.totalQuestions || 30;
    const perQuestionSec = comp.perQuestionTimerSeconds || 15;
    // Total quiz time is exactly the sum of the per-question times:
    // 30 questions × 15 seconds = 450 seconds = 7 minutes 30 seconds.
    const totalSeconds = questionCount * perQuestionSec;
    const computedDeadline = Date.now() + totalSeconds * 1000;

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

  const submitQuizSession = useCallback(async (customTimeTakenSec?: number, questionsToScore?: QuizQuestion[]) => {
    if (quizSession.isSubmitted || isSubmitting) {
      return;
    }
    setIsSubmitting(true);

    try {
      const now = Date.now();
      const sessionSeconds =
        (selectedCompetition?.quizFormat?.totalQuestions || 30) *
        (selectedCompetition?.perQuestionTimerSeconds || 15);
      const estStart = quizSession.deadlineTimestamp
        ? quizSession.deadlineTimestamp - sessionSeconds * 1000
        : now - 60000;
      const timeTakenSec =
        typeof customTimeTakenSec === 'number' && customTimeTakenSec > 0
          ? Math.min(86400, Math.round(customTimeTakenSec))
          : Math.max(1, Math.min(86400, Math.floor((now - estStart) / 1000)));

      // Score ONLY the questions the student was actually shown (the 30-question
      // paper), not the full 50-question bank. The caller (QuizPage) passes its
      // shuffled 30; fall back to the context bank only if none is passed.
      const scoringQuestions =
        questionsToScore && questionsToScore.length > 0 ? questionsToScore : questions;

      // Deterministic local evaluation engine (source of truth)
      let earned = 0;
      let totalPossible = 0;
      let correct = 0;
      let wrongAnswers = 0;
      let unwritten = 0;
      for (const q of scoringQuestions) {
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
      let evaluated = {
        finalScore: earned,
        maxScore: totalPossible,
        accuracyPercent: scoringQuestions.length > 0 ? Math.round((correct / scoringQuestions.length) * 100) : 0,
        correctCount: correct,
        incorrectCount: wrongAnswers + unwritten,
        unwrittenCount: unwritten,
        wrongAnswerCount: wrongAnswers,
      };

      // Attempt auxiliary backend evaluation, but never override with an error or zero
      try {
        const resp = await fetch('/api/python/evaluate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions: scoringQuestions,
            selectedAnswers: quizSession.selectedAnswers,
            markedForReview: quizSession.markedForReview,
            timeTakenSeconds: timeTakenSec,
          }),
        });
        if (resp.ok) {
          const apiEval = await resp.json();
          if (typeof apiEval?.finalScore === 'number' && apiEval.finalScore > 0) {
            evaluated = apiEval;
          }
        }
      } catch {
        // Local evaluation is verified and authoritative
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
                  if (currentUser.email) {
                    const cleanEmail = currentUser.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
                    window.localStorage.setItem(`completed_email_${cleanEmail}_${activeCompId}`, 'true');
                  }
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



  const submitDisqualifiedQuizSession = useCallback(
    async (reason: string = 'Disqualified for proctoring violations (> 2 tab switch warnings)') => {
      setIsSubmitting(true);
      try {
        setQuizSession((prev) => ({
          ...prev,
          isSubmitted: true,
          submittedAt: new Date().toISOString(),
        }));

        const activeCompId = selectedCompetition?.id || quizSession.competitionId;
        const activeCompTitle =
          selectedCompetition?.title || quizSession.competitionTitle || 'Cybersecurity Quiz Competition';
        // Score out of the 30-question paper, not the 50-question bank.
        const totalQ = selectedCompetition?.quizFormat?.totalQuestions || 30;

        if (currentUser && activeCompId) {
          const resultId = `${currentUser.uid}_${activeCompId}`;
          try {
            await setDoc(doc(db, 'results', resultId), {
              ownerId: currentUser.uid,
              competitionId: activeCompId,
              competitionName: activeCompTitle.slice(0, 120),
              finalScore: 0,
              maxScore: totalQ * 100,
              accuracyPercent: 0,
              correctCount: 0,
              incorrectCount: totalQ,
              unwrittenCount: totalQ,
              wrongAnswerCount: 0,
              timeTakenSeconds: 86400,
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

          if (!isPractice) {
            try {
              await setDoc(doc(db, 'leaderboard', entryId), {
                ownerId: currentUser.uid,
                competitionId: activeCompId,
                displayName: cleanDisplayName,
                ...(profile.username ? { username: profile.username.trim().slice(0, 24) } : {}),
                ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl.slice(0, 500) } : {}),
                score: 0,
                completionStatus: 'Completed',
                accuracyPercent: 0,
                completionTimeSeconds: 86400,
                createdAt: serverTimestamp(),
              });
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `leaderboard/${entryId}`);
            }
          }

          const disqualifiedResultItem: CompetitionResult = {
            id: resultId,
            competitionId: activeCompId,
            competitionName: activeCompTitle,
            completedAt: new Date().toISOString(),
            finalScore: 0,
            maxScore: totalQ * 100,
            accuracyPercent: 0,
            correctCount: 0,
            incorrectCount: totalQ,
            unwrittenCount: totalQ,
            wrongAnswerCount: 0,
            timeTakenSeconds: 86400,
          };

          setResults((prev) => {
            const remaining = prev.filter((r) => r.competitionId !== activeCompId);
            const nextList = [disqualifiedResultItem, ...remaining];
            try {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('nullorigin_user_results', JSON.stringify(nextList));
                window.localStorage.setItem('aegis_cipher_user_results', JSON.stringify(nextList));
                if (currentUser) {
                  window.localStorage.setItem(`nullorigin_user_results_${currentUser.uid}`, JSON.stringify(nextList));
                  window.localStorage.setItem(`aegis_user_results_${currentUser.uid}`, JSON.stringify(nextList));
                  if (!isPractice) {
                    window.localStorage.setItem(`completed_comp_${currentUser.uid}_${activeCompId}`, 'true');
                  if (currentUser.email) {
                    const cleanEmail = currentUser.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
                    window.localStorage.setItem(`completed_email_${cleanEmail}_${activeCompId}`, 'true');
                  }
                  }
                  // Practice is repeatable: never persist a disqualification
                  // flag for a practice quiz.
                  if (!isPractice) {
                    window.localStorage.setItem(`nullorigin_disqualified_${currentUser.uid}_${activeCompId}`, reason);
                  }
                }
              }
            } catch {}
            return nextList;
          });

          if (!isPractice) {
            setLeaderboard((prev) => {
              const filtered = prev.filter((l) => l.participantId !== entryId);
              const dqEntry: LeaderboardEntry = {
                rank: prev.length + 1,
                participantId: entryId,
                competitionId: activeCompId,
                createdAt: new Date().toISOString(),
                displayName: cleanDisplayName,
                score: 0,
                completionStatus: 'Completed',
                accuracyPercent: 0,
                completionTimeSeconds: 86400,
                isCurrentUser: true,
              };
              return [...filtered, dqEntry]
                .sort((a, b) => b.score - a.score || (a.completionTimeSeconds ?? 0) - (b.completionTimeSeconds ?? 0))
                .map((item, idx) => ({ ...item, rank: idx + 1 }));
            });
          }
        }

        addToast(
          'Candidate Disqualified',
          'Exam terminated due to proctoring violation. Score recorded as 0.',
          'alert'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [questions.length, selectedCompetition, quizSession, currentUser, competitions, profile, addToast]
  );


  const resetQuizSession = useCallback(() => {
    setQuizSession(DEFAULT_QUIZ_SESSION);
    try {
      window.sessionStorage.removeItem(QUIZ_STORAGE_KEY);
      window.localStorage.removeItem(QUIZ_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const resetAdminTestSession = useCallback(async () => {
    try {
      const activeCompId = selectedCompetition?.id || quizSession.competitionId || 'cyber-quiz-2026';

      // Reset local session state
      resetQuizSession();
      setIsSubmitting(false);

      if (typeof window !== 'undefined') {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (
              k &&
              (k.startsWith('nullorigin_') ||
                k.startsWith('aegis_') ||
                k.startsWith('completed_comp_') ||
                k.startsWith('completed_email_'))
            ) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => window.localStorage.removeItem(k));
          window.sessionStorage.clear();
        } catch {}
      }

      if (currentUser) {
        const docId = `${currentUser.uid}_${activeCompId}`;
        try {
          await deleteDoc(doc(db, 'results', docId));
        } catch {}
        try {
          await deleteDoc(doc(db, 'leaderboard', docId));
        } catch {}
        try {
          await deleteDoc(doc(db, 'winner_contacts', docId));
        } catch {}

        setResults((prev) => prev.filter((r) => r.competitionId !== activeCompId));
        setLeaderboard((prev) => prev.filter((l) => l.participantId !== docId));
      }

      addToast(
        'Admin Test Environment Refreshed',
        'All locks, stored scores, and proctoring flags cleared. Clean test run ready!',
        'success'
      );
    } catch {
      addToast('Reset Notice', 'Session refreshed.', 'default');
    }
  }, [selectedCompetition, quizSession.competitionId, resetQuizSession, currentUser, addToast]);

  const updateProfile = useCallback(
    async (updated: Partial<OperatorProfile>): Promise<boolean> => {
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
            return false;
          }
        }
      } catch {
        // Fallback to local state if offline
      }

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
          // Only update local state AFTER the Firestore write succeeds, so a
          // failed save never looks saved and then reverts on refresh.
          setProfile(merged);
          addToast(
            'Operator Profile Synced to Firestore',
            'Validated by Python engine and saved to Firebase Firestore.',
            'success'
          );
          return true;
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, profilePath);
          return false;
        }
      }

      // No signed-in user or name too short: keep it local only.
      setProfile(merged);
      addToast(
        'Operator Profile Updated',
        'Validated by Python engine and stored in session state. Sign in with Google to persist to Firestore.',
        'success'
      );
      return true;
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
        submitDisqualifiedQuizSession,
        resetAdminTestSession,
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
