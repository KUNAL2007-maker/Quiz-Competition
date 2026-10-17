import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  // Data stores (strictly empty by default — zero fabricated data)
  competitions: Competition[];
  selectedCompetition: Competition | null;
  selectCompetition: (competition: Competition | null) => void;
  questions: QuizQuestion[];
  leaderboard: LeaderboardEntry[];
  results: CompetitionResult[];
  activities: ActivityRecord[];

  // Target countdown timestamp (null by default unless supplied via URL param or real event)
  targetStartTime: string | null;
  setTargetStartTime: (isoOrTimestamp: string | null) => void;

  // Quiz Session State
  quizSession: QuizSessionState;
  selectQuizAnswer: (questionId: string, optionId: string) => void;
  toggleMarkForReview: (questionId: string) => void;
  setCurrentQuestionIndex: (index: number) => void;
  submitQuizSession: () => void;
  resetQuizSession: () => void;

  // Operator Profile (local UI state, starts genuinely unpopulated)
  profile: OperatorProfile;
  updateProfile: (updated: Partial<OperatorProfile>) => void;

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
  biography: '',
  avatarUrl: null,
  avatarPreset: 'cipher-grid',
  createdAt: null,
  isVerified: null,
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
  // All data-driven collections start strictly empty
  const [competitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [questions] = useState<QuizQuestion[]>([]);
  const [leaderboard] = useState<LeaderboardEntry[]>([]);
  const [results] = useState<CompetitionResult[]>([]);
  const [activities] = useState<ActivityRecord[]>([]);

  // Check URL query param `?targetTime=` for configurable test timestamp verification without adding fake competition data
  const [targetStartTime, setTargetStartTime] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paramTime = params.get('targetTime');
      if (paramTime) return paramTime;
    }
    return null;
  });

  // Load persisted quiz deadline/answers from sessionStorage to handle page refreshes without blindly restarting timer
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

  const selectCompetition = useCallback((comp: Competition | null) => {
    setSelectedCompetition(comp);
    if (comp?.startTime) {
      setTargetStartTime(comp.startTime);
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

  const submitQuizSession = useCallback(() => {
    setQuizSession((prev) => ({
      ...prev,
      isSubmitted: true,
      submittedAt: new Date().toISOString(),
    }));
    addToast(
      'Assessment Session Locked',
      'Local session state recorded. Connect a backend service to persist final submission telemetry.',
      'success'
    );
  }, [addToast]);

  const resetQuizSession = useCallback(() => {
    setQuizSession(DEFAULT_QUIZ_SESSION);
    try {
      window.sessionStorage.removeItem(QUIZ_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const updateProfile = useCallback(
    (updated: Partial<OperatorProfile>) => {
      setProfile((prev) => ({
        ...prev,
        ...updated,
      }));
      addToast(
        'Local Operator Profile Updated',
        'Changes are stored in local browser session memory until a backend is connected.',
        'success'
      );
    },
    [addToast]
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

  // Apply accessibility classes to document root
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
