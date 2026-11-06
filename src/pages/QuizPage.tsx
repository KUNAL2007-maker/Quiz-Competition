import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal,
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
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { calculateCountdown, calculateQuizProgress, formatPad } from '../utils/timerLogic';
import { QuestionPalette } from '../components/quiz/QuestionPalette';
import { EmptyStateBlock } from '../components/ui/EmptyStateBlock';
import { CompetitorProfileModal } from '../components/profile/CompetitorProfileModal';
import { QuizRulesModal } from '../components/quiz/QuizRulesModal';
import { QuizCountdownOverlay } from '../components/quiz/QuizCountdownOverlay';
import { QuizAttemptLockedCard } from '../components/quiz/QuizAttemptLockedCard';
import { CountdownTimer } from '../components/competition/CountdownTimer';

export const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    profile,
    selectedCompetition,
    competitions,
    questions,
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

  const isPracticeQuiz = useMemo(() => {
    const comp = competitions.find((c) => c.id === activeCompId);
    return Boolean(
      comp?.title.toLowerCase().includes('practice') || activeCompId?.toLowerCase().includes('practice')
    );
  }, [competitions, activeCompId]);

  const hasAlreadyAttempted = useMemo(() => {
    // Admin testing bypass: allows repeatable verification of questions and timing
    if (isAdmin) return false;

    // Practice simulations allow repeatable calibration and training
    if (isPracticeQuiz) return false;

    if (
      previousResult ||
      previousLeaderboardEntry ||
      (quizSession.competitionId === activeCompId && quizSession.isSubmitted)
    ) {
      return true;
    }
    if (typeof window !== 'undefined' && currentUser && activeCompId) {
      try {
        if (
          window.localStorage.getItem(`completed_comp_${currentUser.uid}_${activeCompId}`) ===
          'true'
        ) {
          return true;
        }
      } catch {
        // ignore
      }
    }
    return false;
  }, [
    isPracticeQuiz,
    previousResult,
    previousLeaderboardEntry,
    quizSession.competitionId,
    activeCompId,
    quizSession.isSubmitted,
    currentUser,
  ]);

  // Active quiz session state: only true once 3-2-1 countdown finishes or if unexpired session resumed
  const [isQuizActive, setIsQuizActive] = useState<boolean>(() => {
    if (!quizSession.deadlineTimestamp || quizSession.isSubmitted) return false;
    if (activeCompId && quizSession.competitionId !== activeCompId) return false;
    return Date.now() < quizSession.deadlineTimestamp;
  });

  // Animated 3-2-1 Countdown State (Requirement 3)
  const [countdownValue, setCountdownValue] = useState<number | null>(null);

  const [nowMs, setNowMs] = useState(() => Date.now());

  // Direct Quiz Submission Handler (No confirmation popup)
  const handleDirectSubmit = useCallback(async () => {
    if (isSubmitting || quizSession.isSubmitted) return;
    try {
      await submitQuizSession();
      navigate('/profile');
    } catch (err) {
      addToast(
        'Submission Error',
        err instanceof Error ? err.message : 'Failed to submit quiz session.',
        'alert'
      );
    }
  }, [isSubmitting, quizSession.isSubmitted, submitQuizSession, navigate, addToast]);

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
  const isNearDeadline =
    timerState.isValid && !timerState.isExpired && timerState.totalMs <= 5 * 60 * 1000;

  // Per-Question countdown timer setting: defaults to 30s if not customized by admin
  const questionTimeLimit =
    currentQuestion?.timeLimitSeconds ??
    activeCompetition?.perQuestionTimerSeconds ??
    30;

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

      if (currIdx < totalQ - 1) {
        // Move to the next question cleanly without intrusive toasts
        const nextIdx = currIdx + 1;
        setCurrentQuestionIndex(nextIdx);
        const nextQ = questions[nextIdx];
        const nextLimit =
          nextQ?.timeLimitSeconds ??
          activeCompetition?.perQuestionTimerSeconds ??
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
      const timer = window.setTimeout(() => {
        setCountdownValue((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => window.clearTimeout(timer);
    }

    if (countdownValue === 0) {
      const timer = window.setTimeout(() => {
        setCountdownValue(null);
        if (activeCompetition) {
          startQuizSession(activeCompetition);
        }
        setIsQuizActive(true);
        setQuestionSecondsLeft(questionTimeLimit);
        addToast(
          'Quiz Commenced',
          `Quiz started with ${questionTimeLimit}s per-question timer. Good luck!`,
          'success'
        );
      }, 750);
      return () => window.clearTimeout(timer);
    }
  }, [countdownValue, activeCompetition, questionTimeLimit, startQuizSession, addToast]);

  // Guard 1: User must be signed in with Google or tournament credentials
  if (!currentUser) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#252D38] bg-[#0C1017] text-[#B6FF3B]">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-[#F0F3F7]">
            Authentication Required
          </h1>
          <p className="text-xs text-[#929DAC] leading-relaxed max-w-sm mx-auto">
            You must sign in with your Google or tournament account to participate in this cybersecurity quiz and record scores on the live leaderboard.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/login?redirect=/quiz')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#B6FF3B] px-6 py-2.5 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] transition-colors cursor-pointer shadow-lg"
          >
            <LogIn className="h-4 w-4" />
            <span>Sign In to Access Quiz</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/competitions')}
            className="w-full sm:w-auto rounded-lg border border-[#252D38] bg-[#111722] px-5 py-2.5 text-xs font-medium text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
          >
            Browse Tournaments
          </button>
        </div>
      </div>
    );
  }

  // Guard 2: Single Attempt Enforcement (Requirement 4)
  if (hasAlreadyAttempted) {
    return (
      <QuizAttemptLockedCard
        competitionTitle={activeCompetition?.title || quizSession.competitionTitle || 'Cybersecurity Quiz Competition'}
        result={previousResult}
        leaderboardEntry={previousLeaderboardEntry}
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
        <div className="rounded-xl border border-[#00E5FF]/40 bg-[#0C1017] p-6 text-center space-y-4 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#00E5FF]/50 bg-[#00E5FF]/10 text-[#00E5FF]">
            <Clock className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <span className="rounded bg-[#00E5FF]/20 px-3 py-1 font-mono text-xs font-bold text-[#00E5FF] tracking-wider uppercase">
              UPCOMING QUIZ COMPETITION
            </span>
            <h1 className="mt-2 font-display text-2xl font-bold text-[#F0F3F7]">
              {activeCompetition?.title || 'Cybersecurity Quiz Competition'}
            </h1>
            <p className="text-xs text-[#929DAC] leading-relaxed max-w-md mx-auto">
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
              className="inline-flex items-center gap-2 rounded-lg border border-[#252D38] bg-[#111722] px-6 py-2.5 text-xs font-medium text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Competitions Directory</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard 3: Mandatory Profile Completion (100% Required)
  // Timers DO NOT start while entering details!
  if (!isAdmin && !profile.isProfileComplete) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center space-y-6">
        <div className="rounded-2xl border border-[#FFB800]/40 bg-[#0C1017] p-8 text-center space-y-5 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FFB800]/50 bg-[#FFB800]/10 text-[#FFB800]">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <span className="rounded bg-[#FFB800]/20 px-3 py-1 font-mono text-xs font-bold text-[#FFB800] tracking-wider uppercase">
              100% Profile Completion Required
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold text-[#F0F3F7]">
              Complete Your Operator Profile
            </h2>
            <p className="text-xs text-[#929DAC] max-w-md mx-auto leading-relaxed">
              Official tournament integrity rules require a 100% completed profile (Full Legal Name and WhatsApp contact number) before accessing or starting any quiz competition.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => navigate('/profile?required=1')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#B6FF3B] px-6 py-2.5 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] transition-colors cursor-pointer shadow-lg"
            >
              <User className="h-4 w-4" />
              <span>Go to My Profile & Complete (100%)</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/competitions')}
              className="w-full sm:w-auto rounded-lg border border-[#252D38] bg-[#111722] px-5 py-2.5 text-xs font-medium text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
            >
              Return to Directory
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
            currentUserEmail={currentUser.email}
            isAdmin={isAdmin}
            onConfirmStart={() => setCountdownValue(3)}
            onCancel={() => navigate('/competitions')}
          />
        )}
      </>
    );
  }

  // Active Quiz Environment (Renders ONLY after 3-2-1 countdown finishes)
  return (
    <div className="space-y-6">
      {/* Focused Quiz Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-lg border border-[#252D38] bg-[#0C1017] p-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/competitions')}
            aria-label="Return to competitions directory"
            className="rounded-md border border-[#252D38] bg-[#111722] p-2 text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="font-mono text-xs text-[#929DAC]">
              FOCUSED QUIZ ENVIRONMENT · 1 ATTEMPT IN PROGRESS
            </p>
            <h1 className="font-display text-lg sm:text-xl font-bold text-[#F0F3F7]">
              {activeCompetition?.title ||
                quizSession.competitionTitle ||
                'Cybersecurity Quiz Competition'}
            </h1>
          </div>
        </div>

        {/* Quiz Progress & Real Target Deadline Timer */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-md border border-[#252D38] bg-[#111722] px-3.5 py-2">
            <span className="block font-mono text-[10px] text-[#929DAC]">
              PROGRESS
            </span>
            <span className="font-mono text-xs font-semibold text-[#F0F3F7] tabular-nums">
              {questions.length > 0
                ? `${progress.answered} / ${progress.total} Answered`
                : 'No Questions Loaded'}
            </span>
          </div>

          <div
            className={`flex items-center gap-2.5 rounded-md border px-3.5 py-2 ${
              isNearDeadline
                ? 'border-[#FF365B] bg-[#FF365B]/10 text-[#FF365B]'
                : 'border-[#252D38] bg-[#111722] text-[#F0F3F7]'
            }`}
          >
            <Clock className="h-4 w-4 shrink-0 text-[#929DAC]" aria-hidden="true" />
            <div>
              <span className="block font-mono text-[10px] text-[#929DAC]">
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
              className="inline-flex items-center gap-2 rounded-md bg-[#36F58A] px-4 py-2.5 text-xs font-semibold text-[#07090D] transition-colors hover:bg-[#5affaa] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>View Profile & History</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDirectSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#B6FF3B] px-4 py-2.5 text-xs font-semibold text-[#07090D] transition-colors hover:bg-[#c8ff66] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer shadow-md"
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
            <div className="rounded-lg border border-[#252D38] bg-[#0C1017] p-6 md:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#252D38] pb-4">
                <div className="flex items-center gap-2 font-mono text-xs text-[#929DAC]">
                  <span className="text-[#B6FF3B] font-semibold">
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

                <button
                  type="button"
                  onClick={() => toggleMarkForReview(currentQuestion.id)}
                  aria-pressed={Boolean(quizSession.markedForReview[currentQuestion.id])}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    quizSession.markedForReview[currentQuestion.id]
                      ? 'border-[#FF365B] bg-[#FF365B]/15 text-[#FF365B]'
                      : 'border-[#252D38] bg-[#111722] text-[#929DAC] hover:text-[#F0F3F7]'
                  }`}
                >
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {quizSession.markedForReview[currentQuestion.id]
                      ? 'Marked for Review'
                      : 'Mark for Review'}
                  </span>
                </button>
              </div>

              {/* Per-Question Live Countdown Banner */}
              <div
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 transition-colors ${
                  questionSecondsLeft <= 5
                    ? 'border-[#FF365B]/60 bg-[#FF365B]/10'
                    : 'border-[#252D38] bg-[#07090D]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-bold transition-all ${
                      questionSecondsLeft <= 5
                        ? 'bg-[#FF365B] text-[#07090D] animate-pulse'
                        : 'bg-[#111722] text-[#B6FF3B] border border-[#252D38]'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-semibold text-[#F0F3F7]">
                      QUESTION TIMER:
                    </span>
                    <span
                      className={`ml-2 font-mono text-xs font-bold tabular-nums ${
                        questionSecondsLeft <= 5 ? 'text-[#FF365B]' : 'text-[#B6FF3B]'
                      }`}
                    >
                      {questionSecondsLeft}s remaining
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#929DAC]">
                    Limit: {questionTimeLimit}s
                  </span>
                  <div className="w-20 sm:w-28 h-1.5 rounded-full bg-[#111722] overflow-hidden border border-[#252D38]">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        questionSecondsLeft <= 5 ? 'bg-[#FF365B]' : 'bg-[#B6FF3B]'
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
                <h2 className="font-display text-lg font-medium text-[#F0F3F7] leading-relaxed">
                  {currentQuestion.prompt}
                </h2>

                {currentQuestion.codeSnippet && (
                  <pre className="overflow-x-auto rounded-md border border-[#252D38] bg-[#07090D] p-4 font-mono text-xs text-[#F0F3F7]">
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
                          ? 'border-[#B6FF3B] bg-[#111722] text-[#F0F3F7]'
                          : 'border-[#252D38] bg-[#111722]/50 text-[#929DAC] hover:border-[#929DAC]/50 hover:text-[#F0F3F7]'
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border font-mono text-xs font-semibold ${
                          isSelected
                            ? 'border-[#B6FF3B] bg-[#B6FF3B] text-[#07090D]'
                            : 'border-[#252D38] bg-[#07090D] text-[#929DAC]'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-sm leading-relaxed pt-0.5">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Previous & Next Navigation */}
              <div className="flex items-center justify-between border-t border-[#252D38] pt-5">
                <button
                  type="button"
                  disabled={quizSession.currentQuestionIndex <= 0}
                  onClick={() =>
                    setCurrentQuestionIndex(quizSession.currentQuestionIndex - 1)
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#252D38] bg-[#111722] px-4 py-2 text-xs font-medium text-[#F0F3F7] hover:border-[#B6FF3B] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                {quizSession.currentQuestionIndex >= questions.length - 1 ? (
                  <button
                    type="button"
                    disabled={isSubmitting || quizSession.isSubmitted}
                    onClick={handleDirectSubmit}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#B6FF3B] px-5 py-2 text-xs font-bold text-[#07090D] hover:bg-[#c8ff66] disabled:opacity-40 cursor-pointer transition-colors shadow-md"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Quiz'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentQuestionIndex(quizSession.currentQuestionIndex + 1)
                    }
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#252D38] bg-[#111722] px-4 py-2 text-xs font-medium text-[#F0F3F7] hover:border-[#B6FF3B] cursor-pointer"
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
            onSelectIndex={setCurrentQuestionIndex}
          />

          <div className="rounded-lg border border-[#252D38] bg-[#0C1017] p-5 space-y-3">
            <h3 className="font-display text-sm font-semibold text-[#F0F3F7]">
              Session Telemetry Summary
            </h3>
            <dl className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <dt className="text-[#929DAC]">Total Questions</dt>
                <dd className="text-[#F0F3F7] tabular-nums">{progress.total}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#929DAC]">Answered</dt>
                <dd className="text-[#36F58A] tabular-nums">{progress.answered}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#929DAC]">Unanswered</dt>
                <dd className="text-[#929DAC] tabular-nums">{progress.unanswered}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#929DAC]">Marked for Review</dt>
                <dd className="text-[#FF365B] tabular-nums">{progress.markedForReview}</dd>
              </div>
              <div className="flex justify-between border-t border-[#252D38] pt-2">
                <dt className="text-[#929DAC]">Per-Question Limit</dt>
                <dd className="text-[#B6FF3B] tabular-nums font-semibold">{questionTimeLimit}s</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};
