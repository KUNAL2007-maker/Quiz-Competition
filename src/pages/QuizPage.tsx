import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { calculateCountdown, calculateQuizProgress, formatPad } from '../utils/timerLogic';
import { QuestionPalette } from '../components/quiz/QuestionPalette';
import { EmptyStateBlock } from '../components/ui/EmptyStateBlock';
import { ModalDialog } from '../components/ui/ModalDialog';

export const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    selectedCompetition,
    questions,
    quizSession,
    isSubmitting,
    selectQuizAnswer,
    toggleMarkForReview,
    setCurrentQuestionIndex,
    submitQuizSession,
  } = useAppContext();

  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Update timer every second ONLY when a valid deadlineTimestamp is configured
  const timerState = calculateCountdown(quizSession.deadlineTimestamp, nowMs);

  useEffect(() => {
    if (!timerState.isValid || timerState.isExpired || quizSession.isSubmitted) {
      return;
    }
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => window.clearInterval(id);
  }, [timerState.isValid, timerState.isExpired, quizSession.isSubmitted]);

  // Automatically open submission flow when valid quiz timer reaches deadline
  useEffect(() => {
    if (timerState.isValid && timerState.isExpired && !quizSession.isSubmitted) {
      setIsSubmitDialogOpen(true);
    }
  }, [timerState.isValid, timerState.isExpired, quizSession.isSubmitted]);

  const questionIds = questions.map((q) => q.id);
  const progress = calculateQuizProgress(
    questionIds,
    quizSession.selectedAnswers,
    quizSession.markedForReview
  );

  const currentQuestion = questions[quizSession.currentQuestionIndex] || null;
  const isNearDeadline =
    timerState.isValid && !timerState.isExpired && timerState.totalMs <= 5 * 60 * 1000;

  return (
    <div className="space-y-6">
      {/* Focused Assessment Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-lg border border-[#252D38] bg-[#0C1017] p-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/arena')}
            aria-label="Return to waiting room"
            className="rounded-md border border-[#252D38] bg-[#111722] p-2 text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="font-mono text-xs text-[#929DAC]">
              FOCUSED ASSESSMENT ENVIRONMENT
            </p>
            <h1 className="font-display text-lg sm:text-xl font-bold text-[#F0F3F7]">
              {selectedCompetition?.title ||
                quizSession.competitionTitle ||
                'Cybersecurity Assessment Terminal'}
            </h1>
          </div>
        </div>

        {/* Assessment Progress & Real Target Deadline Timer */}
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
                ASSESSMENT TIMER
              </span>
              <span className="font-mono text-xs font-bold tabular-nums">
                {timerState.isValid
                  ? `${formatPad(timerState.hours)}:${formatPad(
                      timerState.minutes
                    )}:${formatPad(timerState.seconds)}`
                  : 'NO DEADLINE SET'}
              </span>
            </div>
          </div>

          {quizSession.isSubmitted ? (
            <button
              type="button"
              onClick={() => navigate('/results')}
              className="inline-flex items-center gap-2 rounded-md bg-[#36F58A] px-4 py-2.5 text-xs font-semibold text-[#07090D] transition-colors hover:bg-[#5affaa] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>View Results</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsSubmitDialogOpen(true)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#B6FF3B] px-4 py-2.5 text-xs font-semibold text-[#07090D] transition-colors hover:bg-[#c8ff66] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Quiz'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Assessment Layout: Question Area (2 cols) + Question Palette (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          {questions.length === 0 || !currentQuestion ? (
            <EmptyStateBlock
              icon={Terminal}
              visualType="terminal"
              codeLabel="QUIZ CONTENT · UNAVAILABLE"
              title="Quiz Content Unavailable"
              description="No assessment questions are currently loaded for this session. When an active cybersecurity competition supplies a question packet, prompts, code artifacts, and answer controls will render here."
              actionLabel="Return to Waiting Room"
              onAction={() => navigate('/arena')}
              secondaryActionLabel="Browse Competitions"
              onSecondaryAction={() => navigate('/competitions')}
            />
          ) : (
            /* Real Question Layout Contract (renders when real questions are provided) */
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

                <button
                  type="button"
                  disabled={quizSession.currentQuestionIndex >= questions.length - 1}
                  onClick={() =>
                    setCurrentQuestionIndex(quizSession.currentQuestionIndex + 1)
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#252D38] bg-[#111722] px-4 py-2 text-xs font-medium text-[#F0F3F7] hover:border-[#B6FF3B] disabled:opacity-40 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
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
            </dl>
          </div>
        </div>
      </div>

      {/* Submission Confirmation Dialog */}
      <ModalDialog
        isOpen={isSubmitDialogOpen}
        onClose={() => setIsSubmitDialogOpen(false)}
        title="Confirm Assessment Submission"
        subtitle="Review your local question states before locking this assessment session."
        footer={
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsSubmitDialogOpen(false)}
              className="rounded-md border border-[#252D38] bg-[#111722] px-4 py-2 text-xs font-medium text-[#F0F3F7] hover:bg-[#161E2C] disabled:opacity-50 cursor-pointer"
            >
              Cancel & Return
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                await submitQuizSession();
                setIsSubmitDialogOpen(false);
                navigate('/results');
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#B6FF3B] px-4 py-2 text-xs font-semibold text-[#07090D] hover:bg-[#c8ff66] disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Evaluating & Syncing...' : 'Confirm Final Submission'}</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="flex items-start gap-3 rounded-md border border-[#252D38] bg-[#111722] p-3.5">
              <AlertTriangle className="h-4 w-4 text-[#B6FF3B] shrink-0 mt-0.5" />
              <p className="text-xs text-[#929DAC] leading-relaxed">
                No quiz questions are currently loaded in this session. Confirming submission will evaluate your assessment session.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md border border-[#252D38] bg-[#111722] p-3">
                <span className="block font-mono text-lg font-bold text-[#36F58A] tabular-nums">
                  {progress.answered}
                </span>
                <span className="font-mono text-[10px] text-[#929DAC]">ANSWERED</span>
              </div>
              <div className="rounded-md border border-[#252D38] bg-[#111722] p-3">
                <span className="block font-mono text-lg font-bold text-[#929DAC] tabular-nums">
                  {progress.unanswered}
                </span>
                <span className="font-mono text-[10px] text-[#929DAC]">UNANSWERED</span>
              </div>
              <div className="rounded-md border border-[#252D38] bg-[#111722] p-3">
                <span className="block font-mono text-lg font-bold text-[#FF365B] tabular-nums">
                  {progress.markedForReview}
                </span>
                <span className="font-mono text-[10px] text-[#929DAC]">FOR REVIEW</span>
              </div>
            </div>
          )}

          <p className="text-xs text-[#929DAC] leading-relaxed">
            Your answers are evaluated deterministically by the Python logic engine and synced with your verified Firebase operator records.
          </p>
        </div>
      </ModalDialog>
    </div>
  );
};
