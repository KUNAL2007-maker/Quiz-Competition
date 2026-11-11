import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal,
  RotateCcw,
  ShieldAlert,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Lock,
  LogIn,
  User,
  Target,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  calculateCountdown,
  calculateQuizProgress,
  formatPad,
  formatDurationSeconds,
} from '../utils/timerLogic';
import { QuestionPalette } from '../components/quiz/QuestionPalette';
import { getShuffledQuiz } from '../utils/shuffleQuiz';
import { QuizQuestion } from '../types';
import cyberQuizQuestions from '../constants/cyberQuizQuestions.json';
import practiceQuizQuestions from '../constants/practiceQuizQuestions.json';
import cyberDefenseQuestions from '../constants/cyberDefenseQuestions.json';
import { CYBER_DEFENSE_COMP_ID } from '../constants/tournaments';
import { EmptyStateBlock } from '../components/ui/EmptyStateBlock';
import { CompetitorProfileModal } from '../components/profile/CompetitorProfileModal';
import { QuizRulesModal } from '../components/quiz/QuizRulesModal';
import { QuizCountdownOverlay } from '../components/quiz/QuizCountdownOverlay';
import { QuizAttemptLockedCard } from '../components/quiz/QuizAttemptLockedCard';
import { CountdownTimer } from '../components/competition/CountdownTimer';
import { playCountdownTick, playCountdownGo } from '../utils/audioEffects';

export const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    isAuthReady,
    profile,
    selectedCompetition,
    competitions,
    questions: rawQuestions,
    quizSession,
    isSubmitting,
    results,
    leaderboard,
    isAdmin,
    selectCompetition,
    transitionCompetitionToLive,
    startQuizSession,
    selectQuizAnswer,
    toggleMarkForReview,
    setCurrentQuestionIndex,
    submitQuizSession,
    submitDisqualifiedQuizSession,
    resetAdminTestSession,
    resetQuizSession,
    addToast,
  } = useAppContext();

  // Determine active competition
  const activeCompetition = useMemo(() => {
    if (selectedCompetition) return selectedCompetition;
    if (quizSession.competitionId) {
      const found = competitions.find((c) => c.id === quizSession.competitionId);
      if (found) return found;
    }
    return competitions[0] || null;
  }, [selectedCompetition, quizSession.competitionId, competitions]);

  const activeCompId = activeCompetition?.id || quizSession.competitionId;

  const isPracticeQuiz = useMemo(() => {
    const comp = competitions.find((c) => c.id === activeCompId);
    return Boolean(
      comp?.title?.toLowerCase().includes('practice') ||
      activeCompetition?.title?.toLowerCase().includes('practice') ||
      activeCompId?.toLowerCase().includes('practice')
    );
  }, [competitions, activeCompetition, activeCompId]);

  // Deterministic question and option shuffling per candidate session (prevents answer-sharing)
  const questions = useMemo(() => {
    // Fallback: if Firestore has no questions for the live Cyber Defense Challenge, Cyber Quiz 2026, or Practice Quiz,
    // use the bundled banks so tests are never blocked.
    const CYBER_QUIZ_ID = 'comp_1793963656835';
    const isPractice =
      isPracticeQuiz ||
      Boolean(activeCompId?.toLowerCase().includes('practice')) ||
      Boolean(activeCompetition?.title?.toLowerCase().includes('practice'));

    const isCyberDefense =
      activeCompId === CYBER_DEFENSE_COMP_ID ||
      Boolean(activeCompId?.toLowerCase().includes('cyber_defense')) ||
      Boolean(activeCompetition?.title?.toLowerCase().includes('cyber defense'));

    const isLegacyCyberQuiz =
      activeCompId === CYBER_QUIZ_ID ||
      Boolean(activeCompetition?.title?.toLowerCase().includes('cyber quiz 2026'));

    const fallbackBank: QuizQuestion[] = isPractice
      ? (practiceQuizQuestions as unknown as QuizQuestion[]).map((q, i) => ({
          ...q,
          id: q.id || `practice_${q.index ?? i}`,
        }))
      : isCyberDefense
      ? (cyberDefenseQuestions as unknown as QuizQuestion[]).map((q, i) => ({
          ...q,
          id: q.id || `defense_${q.index ?? i}`,
        }))
      : isLegacyCyberQuiz
      ? (cyberQuizQuestions as unknown as QuizQuestion[]).map((q, i) => ({
          ...q,
          id: q.id || `json_${q.index ?? i}`,
        }))
      : [];

    let bank: QuizQuestion[] = [];
    if (isPractice) {
      const hasPracticeQuestions =
        rawQuestions &&
        rawQuestions.length > 0 &&
        (rawQuestions[0].category?.toLowerCase().includes('practice') ||
          rawQuestions[0].id?.includes('practice'));
      bank = hasPracticeQuestions ? rawQuestions : fallbackBank;
    } else if (isCyberDefense) {
      const hasDefenseQuestions =
        rawQuestions &&
        rawQuestions.length > 0 &&
        (rawQuestions[0].id?.includes('defense') || rawQuestions[0].prompt?.includes('SQL'));
      bank = hasDefenseQuestions ? rawQuestions : fallbackBank;
    } else {
      bank = rawQuestions && rawQuestions.length > 0 ? rawQuestions : fallbackBank;
    }

    if (!currentUser || !bank || bank.length === 0) return bank || [];
    const seed = `${currentUser.email || currentUser.uid}_${activeCompId}`;
    const targetCount =
      activeCompetition?.quizFormat?.totalQuestions ||
      bank.length ||
      10;
    return getShuffledQuiz(bank, seed, targetCount);
  }, [rawQuestions, currentUser, activeCompId, isPracticeQuiz, activeCompetition]);


  // Ensure active competition is synced into context
  useEffect(() => {
    if (!selectedCompetition && activeCompetition) {
      selectCompetition(activeCompetition);
    }
  }, [selectedCompetition, activeCompetition, selectCompetition]);

  // Check if participant has ALREADY attempted this competition (Requirement 4)
  const previousResult = useMemo(() => {
    if (!currentUser || !activeCompId) return null;
    return results.find((r) => r.competitionId === activeCompId) || null;
  }, [currentUser, activeCompId, results]);

  const previousLeaderboardEntry = useMemo(() => {
    if (!currentUser || !activeCompId) return null;
    return (
      leaderboard.find(
        (l) => l.participantId === `${currentUser.uid}_${activeCompId}`
      ) || null
    );
  }, [currentUser, activeCompId, leaderboard]);

  // ORGANISER RESET (live finale, 8 Nov 2026): the questions outage (~12:03 PM)
  // locked out / disqualified many students. Those outage-era attempts (created
  // BEFORE the reset fix went live) get exactly ONE fresh retake. Any attempt
  // created AFTER the cutoff is a real post-fix attempt, so the single-attempt
  // lock and anti-cheat apply normally — no unlimited retakes, no re-entry
  // after copying/cheating. A fresh submission overwrites the old result.
  // ALSO: a 0-score result with no correct answers and NO disqualification flag
  // is the scoring-bug case (correct answers scored 0) — those students also
  // get one fresh retake, so the bug does not cost them the quiz.
  const RESET_CUTOFF_ISO = '2026-11-08T06:41:00.000Z'; // 12:11 PM IST
  const isOutageEraBlock = useMemo(() => {
    const isCyberQuiz = activeCompId === 'comp_1793963656835';
    const isCyberDefense = activeCompId === CYBER_DEFENSE_COMP_ID;
    if (!isCyberQuiz && !isCyberDefense) return false;

    const hasDqFlag = (() => {
      try {
        if (window.localStorage.getItem(`nullorigin_disqualified_${currentUser?.uid}_${activeCompId}`)) return true;
        if (currentUser?.email) {
          const cleanEmail = currentUser.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
          if (window.localStorage.getItem(`nullorigin_disqualified_email_${cleanEmail}_${activeCompId}`)) return true;
        }
      } catch {}
      return false;
    })();

    // For Cyber Defense Challenge: if there is an accidental 0-score or unwritten glitch with no cheating flag,
    // allow a clean fresh attempt so candidates can actually take their quiz!
    if (isCyberDefense) {
      if (
        previousResult &&
        (previousResult.finalScore === 0 || (previousResult.accuracyPercent ?? 100) <= 3) &&
        !hasDqFlag
      ) {
        return true;
      }
      if (!previousResult && !previousLeaderboardEntry) {
        return true;
      }
      return false;
    }

    const cutoff = new Date(RESET_CUTOFF_ISO).getTime();
    const resultTime = previousResult?.completedAt
      ? new Date(previousResult.completedAt).getTime()
      : null;
    const lbTime = previousLeaderboardEntry?.createdAt
      ? new Date(previousLeaderboardEntry.createdAt).getTime()
      : null;

    if (
      previousResult &&
      (previousResult.accuracyPercent ?? 100) <= 3 &&
      !hasDqFlag
    ) {
      return true;
    }
    // Outage-era if the stored attempt predates the cutoff. If there is a
    // local completion/disqualification flag but NO Firestore result at all,
    // treat it as outage-era too (the Firestore write likely failed then).
    if (resultTime !== null) return resultTime < cutoff;
    if (lbTime !== null) return lbTime < cutoff;
    if (typeof window !== 'undefined' && currentUser && activeCompId) {
      try {
        const uidKey = `completed_comp_${currentUser.uid}_${activeCompId}`;
        const dqKey = `nullorigin_disqualified_${currentUser.uid}_${activeCompId}`;
        if (
          window.localStorage.getItem(uidKey) === 'true' ||
          window.localStorage.getItem(dqKey)
        ) {
          return true;
        }
        if (currentUser.email) {
          const cleanEmail = currentUser.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
          if (
            window.localStorage.getItem(`completed_email_${cleanEmail}_${activeCompId}`) === 'true' ||
            window.localStorage.getItem(`nullorigin_disqualified_email_${cleanEmail}_${activeCompId}`)
          ) {
            return true;
          }
        }
      } catch {}
    }
    return false;
  }, [activeCompId, previousResult, previousLeaderboardEntry, currentUser]);

  const hasAlreadyAttempted = useMemo(() => {
    // Practice simulations allow repeatable calibration and training
    if (isPracticeQuiz) return false;

    // One fresh retake only for outage-era blocks on the Cyber Quiz 2026.
    if (isOutageEraBlock) return false;

    // 1. Check if competitor has submitted results in Firestore
    if (previousResult) return true;

    // 2. Check if competitor has recorded score on the leaderboard
    if (previousLeaderboardEntry) return true;

    // 3. Check active session submission state
    if (quizSession.competitionId === activeCompId && quizSession.isSubmitted) return true;

    // 4. Strict enforcement of ONE attempt per email in client storage
    if (typeof window !== 'undefined' && currentUser && activeCompId) {
      try {
        const uidKey = `completed_comp_${currentUser.uid}_${activeCompId}`;
        if (window.localStorage.getItem(uidKey) === 'true') {
          return true;
        }

        if (currentUser.email) {
          const cleanEmail = currentUser.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
          const emailKey = `completed_email_${cleanEmail}_${activeCompId}`;
          if (window.localStorage.getItem(emailKey) === 'true') {
            return true;
          }
        }
      } catch {
        // ignore
      }
    }
    return false;
  }, [
    isPracticeQuiz,
    isOutageEraBlock,
    previousResult,
    previousLeaderboardEntry,
    quizSession.competitionId,
    activeCompId,
    quizSession.isSubmitted,
    currentUser,
  ]);


  // Anti-Cheat & Tab-Switching Proctoring States (Persisted in storage so reloads cannot erase warnings)
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState<number>(() => {
    // Practice simulations allow repeatable calibration: every new run starts with 0 warnings.
    // ORGANISER RESET: an outage-era block starts its one fresh retake with 0 tab-switch warnings.
    if (isPracticeQuiz || isOutageEraBlock) {
      try {
        if (typeof window !== 'undefined' && activeCompId) {
          window.sessionStorage.removeItem(`nullorigin_tab_warnings_${activeCompId}`);
          window.localStorage.removeItem(`nullorigin_tab_warnings_${activeCompId}`);
        }
      } catch {}
      return 0;
    }
    if (typeof window !== 'undefined' && activeCompId) {
      try {
        const saved =
          window.sessionStorage.getItem(`nullorigin_tab_warnings_${activeCompId}`) ||
          window.localStorage.getItem(`nullorigin_tab_warnings_${activeCompId}`);
        if (saved) return Math.min(3, Math.max(0, parseInt(saved, 10) || 0));
      } catch {}
    }
    return 0;
  });
  const [activeTabWarningModal, setActiveTabWarningModal] = useState<number | null>(null);
  const [isDisqualified, setIsDisqualified] = useState<boolean>(false);
  const [disqualificationReason, setDisqualificationReason] = useState<string>('');
  const lastTabSwitchViolationRef = useRef<number>(0);

  // Check stored disqualification status on load (UID & email)
  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser && activeCompId) {
      try {
        let dqReason = window.localStorage.getItem(
          `nullorigin_disqualified_${currentUser.uid}_${activeCompId}`
        );
        if (!dqReason && currentUser.email) {
          const cleanEmail = currentUser.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
          dqReason = window.localStorage.getItem(
            `nullorigin_disqualified_email_${cleanEmail}_${activeCompId}`
          );
        }
        // Practice quizzes are repeatable: a stale disqualification flag must
        // never block a practice retake, even for the same email/account.
        // ORGANISER RESET: ignore the flag only for an outage-era block (one
        // fresh retake). A post-fix disqualification still blocks re-entry.
        if (dqReason && !isPracticeQuiz && !isOutageEraBlock) {
          setIsDisqualified(true);
          setDisqualificationReason(dqReason);
        }
      } catch {}
    }
  }, [currentUser, activeCompId, isPracticeQuiz, isOutageEraBlock]);

  // Active quiz session state: automatically resumes ONLY if active session belongs to this competition and deadline not passed
  const [isQuizActive, setIsQuizActive] = useState<boolean>(() => {
    if (
      typeof window !== 'undefined' &&
      quizSession.competitionId === activeCompId &&
      quizSession.deadlineTimestamp &&
      !quizSession.isSubmitted
    ) {
      return quizSession.deadlineTimestamp > Date.now();
    }
    return false;
  });

  // Reset quiz session if active competition mismatches session competitionId
  useEffect(() => {
    if (quizSession.competitionId && activeCompId && quizSession.competitionId !== activeCompId) {
      resetQuizSession();
      setIsQuizActive(false);
    }
  }, [quizSession.competitionId, activeCompId, resetQuizSession]);

  // Animated 3-2-1 Countdown State (Requirement 3)
  const [countdownValue, setCountdownValue] = useState<number | null>(null);

  // Practice Simulation Summary State (Never saved to history or Firestore)
  const [practiceSummary, setPracticeSummary] = useState<{
    score: number;
    maxScore: number;
    accuracy: number;
    correct: number;
    total: number;
    timeSeconds: number;
  } | null>(null);

  // Completed submission result state for official tournaments (shown on QuizAttemptLockedCard)
  const [submissionResult, setSubmissionResult] = useState<CompetitionResult | null>(null);

  // When active quiz is practice simulation, ensure stale disqualification/submission state is cleared
  // so candidates can freely retake the practice quiz without restrictions.
  useEffect(() => {
    if (isPracticeQuiz) {
      try {
        if (activeCompId) {
          window.sessionStorage.removeItem(`nullorigin_tab_warnings_${activeCompId}`);
          window.localStorage.removeItem(`nullorigin_tab_warnings_${activeCompId}`);
          if (currentUser) {
            window.localStorage.removeItem(`nullorigin_disqualified_${currentUser.uid}_${activeCompId}`);
            if (currentUser.email) {
              const cleanEmail = currentUser.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
              window.localStorage.removeItem(`nullorigin_disqualified_email_${cleanEmail}_${activeCompId}`);
            }
          }
        }
      } catch {}
      if (quizSession.isSubmitted && !practiceSummary && !isDisqualified) {
        resetQuizSession();
        setIsQuizActive(false);
      }
    }
  }, [isPracticeQuiz, activeCompId, currentUser, quizSession.isSubmitted, practiceSummary, isDisqualified, resetQuizSession]);

  const [nowMs, setNowMs] = useState(() => Date.now());

  // Per-Question Completion Time Tracking (Neatly calculate completion time of each question and total them together at the end)
  const questionStartTimeRef = useRef<number>(Date.now());
  const questionTimesRef = useRef<Record<number, number>>({});

  const recordQuestionTime = useCallback(
    (qIndex: number) => {
      const q = questions[qIndex];
      const limit = activeCompetition?.perQuestionTimerSeconds ?? q?.timeLimitSeconds ?? 15;
      const elapsed = Math.min(limit, Math.max(1, Math.round((Date.now() - questionStartTimeRef.current) / 1000)));
      questionTimesRef.current[qIndex] = Math.min(limit, (questionTimesRef.current[qIndex] || 0) + elapsed);
      questionStartTimeRef.current = Date.now();
    },
    [questions, activeCompetition?.perQuestionTimerSeconds]
  );

  // Direct Quiz Submission Handler (No confirmation popup)
  const handleDirectSubmit = useCallback(async () => {
    if (isSubmitting || quizSession.isSubmitted) return;
    try {
      // 1. Record time spent on current final question
      recordQuestionTime(quizSession.currentQuestionIndex);

      // 2. Neatly total the completion time of each question together
      let totalCompletionTimeSec = 0;
      for (let i = 0; i < questions.length; i++) {
        totalCompletionTimeSec += questionTimesRef.current[i] || 0;
      }
      totalCompletionTimeSec = Math.max(1, totalCompletionTimeSec);

      // Pass the 30 shuffled questions actually shown, so scoring (maxScore,
      // accuracy) is computed on the paper, not the 50-question bank.
      const evaluated = await submitQuizSession(totalCompletionTimeSec, questions);
      if (isPracticeQuiz) {
        setPracticeSummary({
          score: evaluated?.finalScore ?? 0,
          maxScore: evaluated?.maxScore ?? 3000,
          accuracy: evaluated?.accuracyPercent ?? 0,
          correct: evaluated?.correctCount ?? 0,
          total: questions.length,
          timeSeconds: totalCompletionTimeSec,
        });
        setIsQuizActive(false);
      } else {
        // Requirement: Do NOT automatically navigate away to /leaderboard on submit!
        // Immediately render QuizAttemptLockedCard with the verified submission results
        // and the "View Live Leaderboard" button. The user views the live leaderboard
        // only when they click on that button.
        if (evaluated) {
          setSubmissionResult({
            id: `${currentUser?.uid}_${activeCompId}`,
            competitionId: activeCompId || '',
            competitionName: activeCompetition?.title || quizSession.competitionTitle || 'Cybersecurity Quiz Competition',
            completedAt: new Date().toISOString(),
            finalScore: Number(evaluated.finalScore || 0),
            maxScore: Number(evaluated.maxScore || 1000),
            accuracyPercent: Number(evaluated.accuracyPercent || 0),
            correctCount: Number(evaluated.correctCount || 0),
            incorrectCount: Number(evaluated.incorrectCount || 0),
            unwrittenCount: Number(evaluated.unwrittenCount || 0),
            wrongAnswerCount: Number(evaluated.wrongAnswerCount || 0),
            timeTakenSeconds: totalCompletionTimeSec,
          });
        }
        setIsQuizActive(false);
      }
    } catch (err) {
      addToast(
        'Submission Error',
        err instanceof Error ? err.message : 'Failed to submit quiz session.',
        'alert'
      );
    }
  }, [
    isSubmitting,
    quizSession.isSubmitted,
    quizSession.currentQuestionIndex,
    questions,
    recordQuestionTime,
    submitQuizSession,
    isPracticeQuiz,
    activeCompetition,
    activeCompId,
    navigate,
    addToast,
  ]);

  // Countdown timer calculations
  const timerState = calculateCountdown(quizSession.deadlineTimestamp, nowMs);

  // Total assessment clock: ticks ONLY when isQuizActive is true
  useEffect(() => {
    if (
      !isQuizActive ||
      !timerState.isValid ||
      timerState.isExpired ||
      quizSession.isSubmitted
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => window.clearInterval(id);
  }, [isQuizActive, timerState.isValid, timerState.isExpired, quizSession.isSubmitted]);

  // Auto-submit directly when total assessment clock expires
  useEffect(() => {
    if (isQuizActive && timerState.isValid && timerState.isExpired && !quizSession.isSubmitted) {
      handleDirectSubmit();
    }
  }, [isQuizActive, timerState.isValid, timerState.isExpired, quizSession.isSubmitted, handleDirectSubmit]);

  const questionIds = questions.map((q) => q.id);
  const progress = calculateQuizProgress(
    questionIds,
    quizSession.selectedAnswers,
    quizSession.markedForReview
  );

  const currentQuestion = questions[quizSession.currentQuestionIndex] || null;
  // An option must be selected for the current question before Next / Submit
  // can be used, so an accidental click cannot skip or submit it unanswered.
  // (The per-question timer still auto-advances on expiry, so a student who
  // does not know the answer can simply let the timer run out.)
  const hasSelectedCurrentAnswer = Boolean(
    currentQuestion && quizSession.selectedAnswers[currentQuestion.id]
  );
  const isNearDeadline =
    timerState.isValid && !timerState.isExpired && timerState.totalMs <= 5 * 60 * 1000;

  // Per-Question countdown timer setting: defaults to 15s if not customized by admin
  const questionTimeLimit =
    currentQuestion?.timeLimitSeconds ??
    activeCompetition?.perQuestionTimerSeconds ??
    15;

  const [questionSecondsLeft, setQuestionSecondsLeft] = useState<number>(questionTimeLimit);

  // Reset per-question countdown whenever navigating questions or question limit changes
  useEffect(() => {
    if (!isQuizActive) return;
    const currentQ = questions[quizSession.currentQuestionIndex];
    const limit =
      currentQ?.timeLimitSeconds ??
      activeCompetition?.perQuestionTimerSeconds ??
      30;
    setQuestionSecondsLeft(limit);
  }, [
    isQuizActive,
    quizSession.currentQuestionIndex,
    questions,
    activeCompetition?.perQuestionTimerSeconds,
  ]);


  // Audio alert tone generator on proctoring infractions
  const playWarningBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }, []);

  // Anti-Cheat 1: Strict Copy, Cut, Paste, Text Selection, Context Menu & Drag Blocking
  useEffect(() => {
    if (!isQuizActive || quizSession.isSubmitted || isDisqualified) return;

    // Apply global unselectable styles to document while quiz is active
    const originalUserSelect = document.body.style.userSelect;
    const originalWebkitUserSelect = (document.body.style as any).webkitUserSelect;
    document.body.style.userSelect = 'none';
    (document.body.style as any).webkitUserSelect = 'none';

    const preventCopyCutPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      addToast('Action Blocked', 'Copying, cutting, and pasting are disabled during the examination.', 'alert');
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      addToast('Action Blocked', 'Right-click context menu is disabled during the examination.', 'alert');
    };

    const preventSelectStart = (e: Event) => {
      e.preventDefault();
    };

    const preventDrag = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener('copy', preventCopyCutPaste);
    document.addEventListener('cut', preventCopyCutPaste);
    document.addEventListener('paste', preventCopyCutPaste);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('selectstart', preventSelectStart);
    document.addEventListener('dragstart', preventDrag);

    return () => {
      document.body.style.userSelect = originalUserSelect;
      (document.body.style as any).webkitUserSelect = originalWebkitUserSelect;
      document.removeEventListener('copy', preventCopyCutPaste);
      document.removeEventListener('cut', preventCopyCutPaste);
      document.removeEventListener('paste', preventCopyCutPaste);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('selectstart', preventSelectStart);
      document.removeEventListener('dragstart', preventDrag);
    };
  }, [isQuizActive, quizSession.isSubmitted, isDisqualified, addToast]);

  // Anti-Cheat 2: Block Screenshot Key Combinations, Print, and DevTools
  useEffect(() => {
    if (!isQuizActive || quizSession.isSubmitted || isDisqualified) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen Key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        try {
          navigator.clipboard?.writeText('').catch(() => {});
        } catch {}
        addToast('Screenshot Blocked', 'Taking screenshots is strictly prohibited during the exam.', 'alert');
        return;
      }

      // Windows Snipping tool / Screenshot combinations: Win+Shift+S / Cmd+Shift+3,4,5
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        addToast('Screenshot Blocked', 'Screenshot shortcuts are disabled.', 'alert');
        return;
      }

      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        addToast('Screenshot Blocked', 'Screenshot shortcuts are disabled.', 'alert');
        return;
      }

      // Print Command: Ctrl+P / Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        addToast('Print Blocked', 'Printing is disabled during the examination.', 'alert');
        return;
      }

      // Developer Tools: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key))
      ) {
        e.preventDefault();
        addToast('DevTools Blocked', 'Developer inspection tools are strictly prohibited.', 'alert');
        return;
      }

      // Save Page / View Source: Ctrl+S / Ctrl+U
      if ((e.ctrlKey || e.metaKey) && ['s', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        try {
          navigator.clipboard?.writeText('').catch(() => {});
        } catch {}
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isQuizActive, quizSession.isSubmitted, isDisqualified, addToast]);

  // Anti-Cheat 3: Multi-Layer Tab-Switching, Blur, Focus Loss & Heartbeat Proctoring
  useEffect(() => {
    if (!isQuizActive || quizSession.isSubmitted || isDisqualified) return;

    const handleTabSwitchEvent = (triggerReason = 'Tab switched or window lost focus') => {
      // If warning modal is already on screen waiting for acknowledgment, do not double-increment
      if (activeTabWarningModal !== null) return;

      const now = Date.now();
      // Debounce events firing in rapid succession (1500ms window)
      if (now - lastTabSwitchViolationRef.current < 1500) {
        return;
      }
      lastTabSwitchViolationRef.current = now;

      playWarningBeep();

      setTabSwitchWarnings((prev) => {
        const next = prev + 1;
        try {
          if (typeof window !== 'undefined' && activeCompId) {
            window.sessionStorage.setItem(`nullorigin_tab_warnings_${activeCompId}`, String(next));
            window.localStorage.setItem(`nullorigin_tab_warnings_${activeCompId}`, String(next));
          }
        } catch {}

        if (next > 2) {
          // Exceeded 2 warnings (3rd infraction) -> ON THE SPOT DISQUALIFICATION with score 0
          setIsDisqualified(true);
          setIsQuizActive(false);
          const fullReason = `Exceeded maximum permitted proctoring infractions (> 2 warnings: ${triggerReason}). Disqualified on the spot with score 0.`;
          setDisqualificationReason(fullReason);
          submitDisqualifiedQuizSession(fullReason);
          // Practice is repeatable: never persist a disqualification or
          // completed flag for a practice quiz, so the same email can retake
          // it as many times as they like, even after a cheating disqualification.
          if (!isPracticeQuiz && currentUser?.email) {
            const cleanEmail = currentUser.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
            try {
              window.localStorage.setItem(`nullorigin_disqualified_email_${cleanEmail}_${activeCompId}`, fullReason);
              window.localStorage.setItem(`completed_email_${cleanEmail}_${activeCompId}`, 'true');
            } catch {}
          }
          return next;
        } else {
          setActiveTabWarningModal(next);
          return next;
        }
      });
    };

    // Layer 1: Document Visibility Change (Tab switch, minimize, app switch)
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        // Hide the questions instantly so a background-tab screenshot shows nothing
        document.body.classList.add('exam-hidden');
        handleTabSwitchEvent('Tab switched, minimized, or moved to background');
      } else {
        document.body.classList.remove('exam-hidden');
      }
    };

    // Layer 2: Window Blur (Focus leaves browser window, Alt+Tab, click secondary monitor, taskbar)
    const handleWindowBlur = () => {
      handleTabSwitchEvent('Browser window lost focus or secondary application opened');
    };

    // Layer 3: Focus Out (Losing focus to system dialog or other app)
    const handleFocusOut = (e: FocusEvent) => {
      if (!e.relatedTarget && (document.hidden || !document.hasFocus())) {
        handleTabSwitchEvent('Window focus lost to external application');
      }
    };

    // Layer 4: Heartbeat Proctoring Poll (Every 400ms) - Catches split screen, devtools, dual monitor, or swallowed events
    const heartbeatTimer = window.setInterval(() => {
      if (!isQuizActive || quizSession.isSubmitted || isDisqualified) return;
      if (document.hidden || document.visibilityState === 'hidden' || !document.hasFocus()) {
        handleTabSwitchEvent('Heartbeat proctoring: exam window was out of focus');
      }
    }, 400);

    // Layer 5: Native beforeunload confirmation prompt
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Warning: Leaving or reloading this exam window is strictly monitored.';
      return e.returnValue;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focusout', handleFocusOut);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.body.classList.remove('exam-hidden');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.clearInterval(heartbeatTimer);
    };
  }, [
    isQuizActive,
    quizSession.isSubmitted,
    isDisqualified,
    activeTabWarningModal,
    activeCompId,
    currentUser,
    playWarningBeep,
    submitDisqualifiedQuizSession,
  ]);

  // Pure countdown ticker: ticks every 1000ms and decrements questionSecondsLeft towards 0
  useEffect(() => {
    if (
      !isQuizActive ||
      quizSession.isSubmitted ||
      questions.length === 0 ||
      !currentQuestion
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setQuestionSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isQuizActive, quizSession.isSubmitted, questions.length, currentQuestion]);

  // Synchronous auto-advance effect when questionSecondsLeft hits 0
  useEffect(() => {
    if (
      !isQuizActive ||
      quizSession.isSubmitted ||
      questions.length === 0 ||
      !currentQuestion
    ) {
      return;
    }

    if (questionSecondsLeft === 0) {
      const currIdx = quizSession.currentQuestionIndex;
      const totalQ = questions.length;
      const currQ = questions[currIdx];
      const currLimit = activeCompetition?.perQuestionTimerSeconds ?? currQ?.timeLimitSeconds ?? 15;
      questionTimesRef.current[currIdx] = currLimit;
      questionStartTimeRef.current = Date.now();

      if (currIdx < totalQ - 1) {
        // Move to the next question cleanly without intrusive toasts
        const nextIdx = currIdx + 1;
        setCurrentQuestionIndex(nextIdx);
        const nextQ = questions[nextIdx];
        const nextLimit =
          activeCompetition?.perQuestionTimerSeconds ??
          nextQ?.timeLimitSeconds ??
          30;
        setQuestionSecondsLeft(nextLimit);
      } else {
        // Final question timer reached 0: direct submit
        handleDirectSubmit();
      }
    }
  }, [
    questionSecondsLeft,
    isQuizActive,
    quizSession.isSubmitted,
    quizSession.currentQuestionIndex,
    questions,
    currentQuestion,
    activeCompetition?.perQuestionTimerSeconds,
    setCurrentQuestionIndex,
    handleDirectSubmit,
  ]);

  // Animated 3-2-1 Countdown Timer Effect (Requirement 3)
  useEffect(() => {
    if (countdownValue === null) return;

    if (countdownValue > 0) {
      playCountdownTick(countdownValue);
      const timer = window.setTimeout(() => {
        setCountdownValue((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => window.clearTimeout(timer);
    }

    if (countdownValue === 0) {
      playCountdownGo();
      const timer = window.setTimeout(() => {
        setCountdownValue(null);
        if (activeCompetition) {
          startQuizSession(activeCompetition);
        }
        setIsQuizActive(true);
        // Practice is repeatable: every fresh practice attempt starts with a
        // clean proctoring slate. Reset the tab-switch warning count to 0 so
        // the student gets their 2 warnings again before the test is stopped
        // on a 3rd infraction. (For the real Cyber Quiz the stored count is
        // kept, so a reload mid-quiz cannot erase warnings.)
        if (isPracticeQuiz && activeCompId) {
          setTabSwitchWarnings(0);
          setActiveTabWarningModal(null);
          try {
            window.sessionStorage.removeItem(`nullorigin_tab_warnings_${activeCompId}`);
            window.localStorage.removeItem(`nullorigin_tab_warnings_${activeCompId}`);
          } catch {}
        }
        setCurrentQuestionIndex(0);
        questionStartTimeRef.current = Date.now();
        questionTimesRef.current = {};
        const firstLimit = activeCompetition?.perQuestionTimerSeconds ?? questions[0]?.timeLimitSeconds ?? 15;
        setQuestionSecondsLeft(firstLimit);
        addToast(
          'Quiz Commenced',
          `Quiz started with ${firstLimit}s per-question timer. Good luck!`,
          'success'
        );
      }, 750);
      return () => window.clearTimeout(timer);
    }
  }, [countdownValue, activeCompetition, questionTimeLimit, startQuizSession, addToast]);

    const handleSelectQuestionIndex = useCallback(
    (idx: number) => {
      if (idx <= quizSession.currentQuestionIndex) {
        addToast('Locked Question', 'Strict Forward Progression: You cannot return to previous questions.', 'alert');
      } else {
        addToast('Sequential Progression', 'Questions must be answered sequentially. Use "Next" to advance.', 'alert');
      }
    },
    [quizSession.currentQuestionIndex, addToast]
  );


  // Proctoring Disqualification View: candidate scored 0
  if (isDisqualified) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 sm:px-6">
        <div className="rounded-2xl border border-[#FF365B]/60 bg-[#1b1b19] p-8 text-center space-y-6 shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-[#FF365B]/40 bg-[#FF365B]/15 text-[#FF365B]">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF365B]">
              PROCTORING ENFORCEMENT ACTION
            </span>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#f5f5f2]">
              EXAMINATION TERMINATED · CANDIDATE DISQUALIFIED
            </h1>
            <p className="mt-2 text-xs text-[#a8a8a2] leading-relaxed max-w-md mx-auto">
              {disqualificationReason || 'Exceeded maximum permitted window/tab switching infractions (> 2 warnings).'}
            </p>
          </div>

          <div className="rounded-xl border border-[#FF365B]/30 bg-[#FF365B]/5 p-6 space-y-2 font-mono">
            <div className="text-xs text-[#a8a8a2] uppercase tracking-wider">OFFICIAL SCORE RECORDED</div>
            <div className="text-5xl font-black text-[#FF365B] tracking-tight">0 PTS</div>
            <p className="text-[11px] text-[#a8a8a2] pt-2">
              {isPracticeQuiz
                ? 'Practice attempt ended with 0. Practice scores are never recorded — you can retake the practice quiz as many times as you like.'
                : 'Status: Disqualified. Result permanently logged to scoreboard.'}
            </p>
          </div>

          {isPracticeQuiz ? (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  resetQuizSession();
                  setIsDisqualified(false);
                  setDisqualificationReason('');
                  setTabSwitchWarnings(0);
                  setActiveTabWarningModal(null);
                  setIsQuizActive(false);
                  setCountdownValue(3);
                  setCurrentQuestionIndex(0);
                  questionTimesRef.current = {};
                  try {
                    if (activeCompId) {
                      window.sessionStorage.removeItem(`nullorigin_tab_warnings_${activeCompId}`);
                      window.localStorage.removeItem(`nullorigin_tab_warnings_${activeCompId}`);
                      if (currentUser) {
                        window.localStorage.removeItem(`nullorigin_disqualified_${currentUser.uid}_${activeCompId}`);
                        if (currentUser.email) {
                          const cleanEmail = currentUser.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
                          window.localStorage.removeItem(`nullorigin_disqualified_email_${cleanEmail}_${activeCompId}`);
                        }
                      }
                    }
                  } catch {}
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#8dc63f] px-6 py-2.5 font-mono text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer shadow-lg"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Retake Practice Quiz ↺</span>
              </button>
            </div>
          ) : isAdmin ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  await resetAdminTestSession();
                  setIsDisqualified(false);
                  setDisqualificationReason('');
                  setTabSwitchWarnings(0);
                  setActiveTabWarningModal(null);
                  setIsQuizActive(false);
                  setCountdownValue(null);
                  try {
                    if (activeCompId) {
                      window.sessionStorage.removeItem(`nullorigin_tab_warnings_${activeCompId}`);
                      window.localStorage.removeItem(`nullorigin_tab_warnings_${activeCompId}`);
                    }
                  } catch {}
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[#7ab32e] bg-[#8dc63f]/20 px-6 py-2.5 font-mono text-xs font-bold text-[#8dc63f] hover:bg-[#8dc63f]/30 cursor-pointer shadow-lg"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Admin Reset Disqualification & Retake Test</span>
              </button>
            </div>
          ) : null}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-[#2e2e2a]">
            <button
              type="button"
              onClick={() => {
                if (isPracticeQuiz) {
                  resetQuizSession();
                  setIsDisqualified(false);
                  setDisqualificationReason('');
                  setTabSwitchWarnings(0);
                  setActiveTabWarningModal(null);
                }
                navigate('/dashboard');
              }}
              className="w-full sm:w-auto rounded-lg bg-[#8dc63f] px-6 py-2.5 font-mono text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer"
            >
              Return to Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                if (isPracticeQuiz) {
                  resetQuizSession();
                  setIsDisqualified(false);
                  setDisqualificationReason('');
                  setTabSwitchWarnings(0);
                  setActiveTabWarningModal(null);
                }
                navigate('/competitions');
              }}
              className="w-full sm:w-auto rounded-lg border border-[#2e2e2a] bg-[#1b1b19] px-5 py-2.5 font-mono text-xs font-medium text-[#a8a8a2] hover:text-[#f5f5f2] transition-colors cursor-pointer"
            >
              Browse Tournaments
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wait for Firebase auth state to resolve: currentUser starts as null while
  // the session restores, and must not be mistaken for "signed out".
  if (!isAuthReady) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-[#f5f5f2]">
            Checking sign-in...
          </h1>
          <p className="text-xs text-[#a8a8a2] leading-relaxed max-w-sm mx-auto">
            Please wait while we verify your session.
          </p>
        </div>
      </div>
    );
  }

  // Guard 1: User must be signed in with Google or tournament credentials
  if (!currentUser) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#2e2e2a] bg-[#1b1b19] text-[#8dc63f]">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-[#f5f5f2]">
            Authentication Required
          </h1>
          <p className="text-xs text-[#a8a8a2] leading-relaxed max-w-sm mx-auto">
            You must sign in with your Google or tournament account to participate in this cybersecurity quiz and record scores on the live leaderboard.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/login?redirect=/quiz')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#8dc63f] px-6 py-2.5 text-xs font-semibold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer shadow-lg"
          >
            <LogIn className="h-4 w-4" />
            <span>Sign In to Access Quiz</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/competitions')}
            className="w-full sm:w-auto rounded-lg border border-[#2e2e2a] bg-[#1b1b19] px-5 py-2.5 text-xs font-medium text-[#a8a8a2] hover:text-[#f5f5f2] cursor-pointer"
          >
            Browse Tournaments
          </button>
        </div>
      </div>
    );
  }

  // Practice Simulation Completion Screen (Unlimited retakes, 0 records saved)
  if (practiceSummary && isPracticeQuiz) {
    return (
      <div className="mx-auto max-w-2xl py-8 px-4 sm:px-6">
        <div className="rounded-2xl border border-[#7ab32e]/40 bg-[#1b1b19] p-6 sm:p-8 text-center space-y-6 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#7ab32e]/40 bg-[#8dc63f]/10 text-[#8dc63f]">
            <Target className="h-8 w-8" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#7ab32e]/40 bg-[#8dc63f]/10 px-3 py-1 font-mono text-xs font-bold text-[#8dc63f] mb-3">
              <RotateCcw className="h-3.5 w-3.5" />
              <span>UNLIMITED PRACTICE SIMULATION COMPLETE</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#f5f5f2]">
              Practice Run Finished
            </h1>
            <p className="mt-2 text-xs text-[#a8a8a2] leading-relaxed max-w-md mx-auto">
              Zero-stakes practice run. Practice scores are never saved to your profile history or the live scoreboard, so you can practice freely as many times as you like.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-xl border border-[#2e2e2a] bg-[#111110] p-4">
              <div className="font-mono text-[10px] text-[#a8a8a2] uppercase">Score</div>
              <div className="mt-1 font-display text-xl font-bold text-[#8dc63f]">
                {practiceSummary.score.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#a8a8a2]">/ {practiceSummary.maxScore} PTS</div>
            </div>
            <div className="rounded-xl border border-[#2e2e2a] bg-[#111110] p-4">
              <div className="font-mono text-[10px] text-[#a8a8a2] uppercase">Accuracy</div>
              <div className="mt-1 font-display text-xl font-bold text-[#a4d65e]">
                {practiceSummary.accuracy}%
              </div>
              <div className="text-[10px] text-[#a8a8a2]">{practiceSummary.correct} / {practiceSummary.total} Correct</div>
            </div>
            <div className="rounded-xl border border-[#2e2e2a] bg-[#111110] p-4">
              <div className="font-mono text-[10px] text-[#a8a8a2] uppercase">Time Elapsed</div>
              <div className="mt-1 font-display text-xl font-bold text-[#f5f5f2]">
                {formatDurationSeconds(practiceSummary.timeSeconds)}
              </div>
              <div className="text-[10px] text-[#a8a8a2]">Total Time</div>
            </div>
            <div className="rounded-xl border border-[#2e2e2a] bg-[#111110] p-4">
              <div className="font-mono text-[10px] text-[#a8a8a2] uppercase">History</div>
              <div className="mt-1 font-display text-xl font-bold text-[#8dc63f]">
                Not Saved
              </div>
              <div className="text-[10px] text-[#a8a8a2]">Zero Impact</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-[#2e2e2a]">
            <button
              type="button"
              onClick={() => {
                resetQuizSession();
                setPracticeSummary(null);
                setIsQuizActive(false);
                setCountdownValue(3);
                setCurrentQuestionIndex(0);
                questionTimesRef.current = {};
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#8dc63f] px-6 py-2.5 font-mono text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer shadow-lg"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retake Practice Quiz ↺</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/competitions')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[#2e2e2a] bg-[#111110] px-5 py-2.5 font-mono text-xs font-semibold text-[#a8a8a2] hover:text-[#f5f5f2] transition-colors cursor-pointer"
            >
              <span>Browse Competitions →</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[#2e2e2a] bg-[#111110] px-4 py-2.5 font-mono text-xs font-medium text-[#a8a8a2] hover:text-[#f5f5f2] transition-colors cursor-pointer"
            >
              <span>View Profile</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard 2: Mandatory Profile Completion (100% Required)
  // Must always be completed before any quiz can be accessed or started
  if (!isAdmin && !profile.isProfileComplete) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center space-y-6">
        <div className="rounded-2xl border border-[#FFB800]/40 bg-[#1b1b19] p-8 text-center space-y-5 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FFB800]/50 bg-[#FFB800]/10 text-[#FFB800]">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <span className="rounded bg-[#FFB800]/20 px-3 py-1 font-mono text-xs font-bold text-[#FFB800] tracking-wider uppercase">
              100% Profile Completion Required
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold text-[#f5f5f2]">
              Complete Your Operator Profile
            </h2>
            <p className="text-xs text-[#a8a8a2] max-w-md mx-auto leading-relaxed">
              Official tournament integrity rules require a 100% completed profile (Full Legal Name and WhatsApp contact number) before accessing or starting any quiz competition.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => navigate('/profile?required=1')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#8dc63f] px-6 py-2.5 text-xs font-semibold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer shadow-lg"
            >
              <User className="h-4 w-4" />
              <span>Go to My Profile & Complete (100%)</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/competitions')}
              className="w-full sm:w-auto rounded-lg border border-[#2e2e2a] bg-[#1b1b19] px-5 py-2.5 text-xs font-medium text-[#a8a8a2] hover:text-[#f5f5f2] cursor-pointer"
            >
              Return to Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard 2.5: Single Attempt Enforcement (Requirement 4)
  if (hasAlreadyAttempted || submissionResult) {
    const isLiveAttempt =
      activeCompetition?.status === 'live' ||
      (activeCompetition?.startTime &&
        new Date(activeCompetition.startTime).getTime() <= Date.now() &&
        activeCompetition.status !== 'completed' &&
        (!activeCompetition.endTime || new Date(activeCompetition.endTime).getTime() > Date.now()));

    return (
      <QuizAttemptLockedCard
        competitionTitle={activeCompetition?.title || quizSession.competitionTitle || 'Cybersecurity Quiz Competition'}
        competition={activeCompetition}
        isLive={Boolean(isLiveAttempt)}
        result={submissionResult || previousResult}
        leaderboardEntry={previousLeaderboardEntry}
        isAdmin={isAdmin}
        onResetAdminSession={async () => {
          setSubmissionResult(null);
          await resetAdminTestSession();
          setIsDisqualified(false);
          setDisqualificationReason('');
          setTabSwitchWarnings(0);
          setActiveTabWarningModal(null);
          setIsQuizActive(false);
          setCountdownValue(null);
          try {
            if (activeCompId) {
              window.sessionStorage.removeItem(`nullorigin_tab_warnings_${activeCompId}`);
              window.localStorage.removeItem(`nullorigin_tab_warnings_${activeCompId}`);
            }
          } catch {}
        }}
      />
    );
  }

  // Guard 2.5: Tournament Not Started Yet (Locked Until Start Time - Timer Shown Directly)
  const isCompetitionStarted =
    isAdmin ||
    !activeCompetition ||
    activeCompetition.status === 'live' ||
    (activeCompetition.startTime
      ? new Date(activeCompetition.startTime).getTime() <= Date.now()
      : activeCompetition.status !== 'upcoming');

  if (!isCompetitionStarted) {
    return (
      <div className="mx-auto max-w-2xl py-8 space-y-6">
        <div className="rounded-xl border border-[#00E5FF]/40 bg-[#1b1b19] p-6 text-center space-y-4 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#00E5FF]/50 bg-[#00E5FF]/10 text-[#00E5FF]">
            <Clock className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <span className="rounded bg-[#00E5FF]/20 px-3 py-1 font-mono text-xs font-bold text-[#00E5FF] tracking-wider uppercase">
              UPCOMING QUIZ COMPETITION
            </span>
            <h1 className="mt-2 font-display text-2xl font-bold text-[#f5f5f2]">
              {activeCompetition?.title || 'Cybersecurity Quiz Competition'}
            </h1>
            <p className="text-xs text-[#a8a8a2] leading-relaxed max-w-md mx-auto">
              This competition is scheduled to start at{' '}
              <span className="font-mono text-[#00E5FF]">
                {activeCompetition?.startTime
                  ? new Date(activeCompetition.startTime).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'its scheduled time'}
              </span>
              . The quiz unlocks automatically when the timer reaches zero.
            </p>
          </div>

          <CountdownTimer
            targetStartTime={activeCompetition?.startTime}
            onCountdownZero={() => {
              if (activeCompetition) {
                transitionCompetitionToLive(activeCompetition.id);
              }
              setIsQuizActive(false);
            }}
          />

          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/competitions')}
              className="inline-flex items-center gap-2 rounded-lg border border-[#2e2e2a] bg-[#1b1b19] px-6 py-2.5 text-xs font-medium text-[#a8a8a2] hover:text-[#f5f5f2] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Competitions Directory</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard 2.6: Tournament Ended (no new entries after the end time; students already
  // mid-quiz are NOT kicked out — isQuizActive stays true for them)
  if (!isAdmin && !isQuizActive && activeCompetition && activeCompetition.status === 'completed') {
    return (
      <div className="mx-auto max-w-2xl py-8 space-y-6">
        <div className="rounded-xl border border-[#FF5C5C]/40 bg-[#1b1b19] p-6 text-center space-y-4 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#FF5C5C]/50 bg-[#FF5C5C]/10 text-[#FF5C5C]">
            <Clock className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <span className="rounded bg-[#FF5C5C]/20 px-3 py-1 font-mono text-xs font-bold text-[#FF5C5C] tracking-wider uppercase">
              Competition Ended
            </span>
            <h1 className="mt-2 font-display text-2xl font-bold text-[#f5f5f2]">
              {activeCompetition?.title || 'Cybersecurity Quiz Competition'}
            </h1>
            <p className="text-xs text-[#a8a8a2] leading-relaxed max-w-md mx-auto">
              This competition ended at{' '}
              <span className="font-mono text-[#FF5C5C]">
                {activeCompetition?.endTime
                  ? new Date(activeCompetition.endTime).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'the scheduled end time'}
              </span>
              . New entries are closed. Check the leaderboard for results.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/competitions')}
              className="inline-flex items-center gap-2 rounded-lg border border-[#2e2e2a] bg-[#1b1b19] px-6 py-2.5 text-xs font-medium text-[#a8a8a2] hover:text-[#f5f5f2] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Competitions Directory</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard 4: Rules Briefing & 3-2-1 Animated Countdown (Requirement 2 & 3)
  if (!isQuizActive) {
    return (
      <>
        {countdownValue !== null ? (
          <QuizCountdownOverlay value={countdownValue} />
        ) : (
          <QuizRulesModal
            isOpen={true}
            competition={activeCompetition}
            profile={profile}
            isAdmin={isAdmin}
            onResetAdminSession={resetAdminTestSession}
            onConfirmStart={() => setCountdownValue(3)}
            onCancel={() => navigate('/competitions')}
          />
        )}
      </>
    );
  }

  // Active Quiz Environment (Renders ONLY after 3-2-1 countdown finishes)
  return (
    <div id="quiz-content" className="space-y-6 select-none">
      {/* Tab Switch Warning Modal Dialog */}
      {activeTabWarningModal !== null && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#111110]/95 p-4 backdrop-blur-md"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-[#FF365B]/60 bg-[#1b1b19] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-[#2e2e2a] pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#FF365B]/40 bg-[#FF365B]/15 text-[#FF365B] animate-pulse">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FF365B]">
                  PROCTORING INFRACTION DETECTED
                </span>
                <h3 className="font-display text-lg font-bold text-[#f5f5f2]">
                  {activeTabWarningModal === 1
                    ? 'WARNING 1 OF 2: TAB SWITCHING DETECTED'
                    : 'CRITICAL FINAL WARNING (2 OF 2): LAST CHANCE'}
                </h3>
              </div>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="rounded-lg border border-[#FF365B]/30 bg-[#FF365B]/5 p-3.5 text-[#f5f5f2] leading-relaxed">
                {activeTabWarningModal === 1 ? (
                  <>
                    You navigated away from the exam window. Tab switching, minimizing the browser, or opening other applications is strictly prohibited.
                    <div className="mt-2 text-[#E6B450] font-semibold">
                      You have 1 warning remaining. A 3rd infraction will immediately terminate the exam with a score of 0.
                    </div>
                  </>
                ) : (
                  <>
                    CRITICAL: You have navigated away from the exam tab 2 times. This is your LAST AND FINAL WARNING.
                    <div className="mt-2 text-[#FF365B] font-bold">
                      Any further tab switch (&gt; 2 warnings) will ON THE SPOT DISQUALIFY YOU, lock your quiz, and record your score as ZERO (0) on the scoreboard.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  lastTabSwitchViolationRef.current = Date.now();
                  setActiveTabWarningModal(null);
                  try {
                    window.focus();
                  } catch {}
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#8dc63f] px-5 py-2.5 font-mono text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer shadow-lg"
              >
                <span>I Understand & Acknowledge (Return to Question)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Focused Quiz Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/competitions')}
            aria-label="Return to competitions directory"
            className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] p-2 text-[#a8a8a2] hover:text-[#f5f5f2] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="font-mono text-xs text-[#a8a8a2]">
              FOCUSED QUIZ ENVIRONMENT · 1 ATTEMPT IN PROGRESS
            </p>
            <h1 className="font-display text-lg sm:text-xl font-bold text-[#f5f5f2]">
              {activeCompetition?.title ||
                quizSession.competitionTitle ||
                'Cybersecurity Quiz Competition'}
            </h1>
          </div>
        </div>

        {/* Quiz Progress & Real Target Deadline Timer */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-3.5 py-2">
            <span className="block font-mono text-[10px] text-[#a8a8a2]">
              PROGRESS
            </span>
            <span className="font-mono text-xs font-semibold text-[#f5f5f2] tabular-nums">
              {questions.length > 0
                ? `${progress.answered} / ${progress.total} Answered`
                : 'No Questions Loaded'}
            </span>
          </div>

          <div
            className={`flex items-center gap-2.5 rounded-md border px-3.5 py-2 ${
              isNearDeadline
                ? 'border-[#FF365B] bg-[#FF365B]/10 text-[#FF365B]'
                : 'border-[#2e2e2a] bg-[#1b1b19] text-[#f5f5f2]'
            }`}
          >
            <Clock className="h-4 w-4 shrink-0 text-[#a8a8a2]" aria-hidden="true" />
            <div>
              <span className="block font-mono text-[10px] text-[#a8a8a2]">
                QUIZ TIMER
              </span>
              <span className="font-mono text-xs font-bold tabular-nums">
                {timerState.isValid
                  ? `${formatPad(timerState.hours)}:${formatPad(
                      timerState.minutes
                    )}:${formatPad(timerState.seconds)}`
                  : '15:00'}
              </span>
            </div>
          </div>

          {quizSession.isSubmitted ? (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-2 rounded-md bg-[#a4d65e] px-4 py-2.5 text-xs font-semibold text-[#141a09] transition-colors hover:bg-[#5affaa] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>View Profile & History</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDirectSubmit}
              disabled={isSubmitting || !hasSelectedCurrentAnswer}
              className="inline-flex items-center gap-2 rounded-md bg-[#8dc63f] px-4 py-2.5 text-xs font-semibold text-[#141a09] transition-colors hover:bg-[#a4d65e] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer shadow-md"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Quiz'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Quiz Layout: Question Area (2 cols) + Question Palette (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          {questions.length === 0 || !currentQuestion ? (
            <EmptyStateBlock
              icon={Terminal}
              visualType="terminal"
              codeLabel="QUIZ CONTENT · STANDBY"
              title="Quiz Questions Loading"
              description="No active questions found in the tournament container. If you are an administrator, add questions via the Admin Dashboard."
              actionLabel="Return to Competitions"
              onAction={() => navigate('/competitions')}
              secondaryActionLabel="Live Leaderboard"
              onSecondaryAction={() => navigate('/leaderboard')}
            />
          ) : (
            <div className="relative overflow-hidden rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-4 sm:p-6 md:p-8 space-y-6">
              {/* Anti-cheat watermark: candidate identity on any screenshot */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden opacity-[0.07]">
                <div className="absolute -inset-10 flex flex-wrap content-center items-center justify-center gap-x-10 gap-y-8 rotate-[-16deg] font-mono text-sm font-bold text-[#f5f5f2] whitespace-nowrap">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span key={i}>{currentUser?.email || profile?.username || 'NULLORIGIN'}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2e2e2a] pb-4">
                <div className="flex items-center gap-2 font-mono text-xs text-[#a8a8a2]">
                  <span className="text-[#8dc63f] font-semibold">
                    QUESTION {String(quizSession.currentQuestionIndex + 1).padStart(2, '0')} OF{' '}
                    {String(questions.length).padStart(2, '0')}
                  </span>
                  {currentQuestion.category && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{currentQuestion.category}</span>
                    </>
                  )}
                  {currentQuestion.points !== undefined && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{currentQuestion.points} PTS</span>
                    </>
                  )}
                </div>

              </div>

              {/* Per-Question Live Countdown Banner */}
              <div
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 transition-colors ${
                  questionSecondsLeft <= 5
                    ? 'border-[#FF365B]/60 bg-[#FF365B]/10'
                    : 'border-[#2e2e2a] bg-[#111110]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-bold transition-all ${
                      questionSecondsLeft <= 5
                        ? 'bg-[#FF365B] text-[#111110] animate-pulse'
                        : 'bg-[#1b1b19] text-[#8dc63f] border border-[#2e2e2a]'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-semibold text-[#f5f5f2]">
                      QUESTION TIMER:
                    </span>
                    <span
                      className={`ml-2 font-mono text-xs font-bold tabular-nums ${
                        questionSecondsLeft <= 5 ? 'text-[#FF365B]' : 'text-[#8dc63f]'
                      }`}
                    >
                      {questionSecondsLeft}s remaining
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#a8a8a2]">
                    Limit: {questionTimeLimit}s
                  </span>
                  <div className="w-20 sm:w-28 h-1.5 rounded-full bg-[#1b1b19] overflow-hidden border border-[#2e2e2a]">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        questionSecondsLeft <= 5 ? 'bg-[#FF365B]' : 'bg-[#8dc63f]'
                      }`}
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (questionSecondsLeft / questionTimeLimit) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-lg font-medium text-[#f5f5f2] leading-relaxed">
                  {currentQuestion.prompt}
                </h2>

                {currentQuestion.codeSnippet && (
                  <pre className="overflow-x-auto rounded-md border border-[#2e2e2a] bg-[#111110] p-4 font-mono text-xs text-[#f5f5f2]">
                    <code>{currentQuestion.codeSnippet}</code>
                  </pre>
                )}
              </div>

              {/* Answer Options */}
              <div className="space-y-3" role="radiogroup" aria-label="Answer options">
                {currentQuestion.options.map((opt) => {
                  const isSelected =
                    quizSession.selectedAnswers[currentQuestion.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={quizSession.isSubmitted}
                      onClick={() => selectQuizAnswer(currentQuestion.id, opt.id)}
                      className={`flex w-full items-start gap-3.5 rounded-lg border p-4 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[#7ab32e] bg-[#1b1b19] text-[#f5f5f2]'
                          : 'border-[#2e2e2a] bg-[#1b1b19]/50 text-[#a8a8a2] hover:border-[#a8a8a2]/50 hover:text-[#f5f5f2]'
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border font-mono text-xs font-semibold ${
                          isSelected
                            ? 'border-[#7ab32e] bg-[#8dc63f] text-[#141a09]'
                            : 'border-[#2e2e2a] bg-[#111110] text-[#a8a8a2]'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-sm leading-relaxed pt-0.5">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Forward-Only Navigation (Previous strictly disabled to prevent timer reset) */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[#2e2e2a] pt-5">
                <div className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-md border border-[#2e2e2a] bg-[#111110] px-3 py-2 font-mono text-xs sm:text-[11px] text-[#a8a8a2]">
                  <Lock className="h-3.5 w-3.5 text-[#E6B450]" />
                  <span>Strict Forward Progression · Returning Disabled</span>
                </div>

                {quizSession.currentQuestionIndex >= questions.length - 1 ? (
                  <button
                    type="button"
                    disabled={isSubmitting || quizSession.isSubmitted || !hasSelectedCurrentAnswer}
                    onClick={handleDirectSubmit}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-md bg-[#8dc63f] px-5 py-2 text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] disabled:opacity-40 cursor-pointer transition-colors shadow-md"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Quiz'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!hasSelectedCurrentAnswer}
                    onClick={() => {
                      recordQuestionTime(quizSession.currentQuestionIndex);
                      setCurrentQuestionIndex(quizSession.currentQuestionIndex + 1);
                    }}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-4 py-2 text-xs font-medium text-[#f5f5f2] hover:border-[#7ab32e] disabled:opacity-40 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Question Navigator & Session Summary Sidebar */}
        <div className="space-y-6">
          <QuestionPalette
            questions={questions}
            currentIndex={quizSession.currentQuestionIndex}
            selectedAnswers={quizSession.selectedAnswers}
            markedForReview={quizSession.markedForReview}
            onSelectIndex={handleSelectQuestionIndex}
          />

          <div className="rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-5 space-y-3">
            <h3 className="font-display text-sm font-semibold text-[#f5f5f2]">
              Session Telemetry Summary
            </h3>
            <dl className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <dt className="text-[#a8a8a2]">Total Questions</dt>
                <dd className="text-[#f5f5f2] tabular-nums">{progress.total}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#a8a8a2]">Answered</dt>
                <dd className="text-[#a4d65e] tabular-nums">{progress.answered}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#a8a8a2]">Unanswered</dt>
                <dd className="text-[#a8a8a2] tabular-nums">{progress.unanswered}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#a8a8a2]">Marked for Review</dt>
                <dd className="text-[#FF365B] tabular-nums">{progress.markedForReview}</dd>
              </div>
              <div className="flex justify-between border-t border-[#2e2e2a] pt-2">
                <dt className="text-[#a8a8a2]">Per-Question Limit</dt>
                <dd className="text-[#8dc63f] tabular-nums font-semibold">{questionTimeLimit}s</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};
