import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Hourglass,
  Lock,
  Bot,
  ArrowRight,
  RotateCcw,
  X,
} from 'lucide-react';
import { Competition, OperatorProfile } from '../../types';

interface QuizRulesModalProps {
  isOpen: boolean;
  competition: Competition | null;
  profile: OperatorProfile;
  isAdmin?: boolean;
  onResetAdminSession?: () => void;
  onConfirmStart: () => void;
  onCancel: () => void;
}

export const QuizRulesModal: React.FC<QuizRulesModalProps> = ({
  isOpen,
  competition,
  profile,
  isAdmin = false,
  onResetAdminSession,
  onConfirmStart,
  onCancel,
}) => {
  const [hasAgreed, setHasAgreed] = useState(false);

  if (!isOpen) return null;

  const durationMin = competition?.durationMinutes || 15;
  const perQuestionSec = competition?.perQuestionTimerSeconds || 15;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090D]/90 p-4 sm:p-6 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#252D38] bg-[#0C1017] p-6 sm:p-8 shadow-2xl my-auto">
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-4 border-b border-[#252D38] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#FFB800]/40 bg-[#FFB800]/10 text-[#FFB800] shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-[10px] sm:text-[11px] font-bold tracking-wider text-[#929DAC] uppercase block">
                CRITICAL OPERATIONAL RULES & CODE OF CONDUCT
              </span>
              <h2
                id="rules-modal-title"
                className="font-display text-xl sm:text-2xl font-bold text-[#F0F3F7]"
              >
                Tournament Rules Briefing
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Close rules dialog"
            className="rounded-md border border-[#252D38] bg-[#111722] p-1.5 text-[#929DAC] hover:text-[#F0F3F7] hover:border-[#3A4656] cursor-pointer shrink-0 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Target Tournament Badge */}
        <div className="mt-4 rounded-lg border border-[#252D38] bg-[#111722] p-3 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
          <span className="text-[#929DAC]">Target Tournament:</span>
          <span className="font-semibold text-[#F0F3F7]">
            {competition?.title || 'Cyber Quiz 2026'}
          </span>
        </div>

        {/* Admin Test Controls */}
        {isAdmin && (
          <div className="mt-3 rounded-lg border border-[#FFB800]/40 bg-[#FFB800]/10 p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#FFB800] shrink-0" />
              <span className="font-mono text-xs font-bold text-[#FFB800]">
                ADMIN TEST MODE · UNRESTRICTED ACCESS
              </span>
            </div>
            {onResetAdminSession && (
              <button
                type="button"
                onClick={onResetAdminSession}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#252D38] bg-[#07090D] px-3 py-1 font-mono text-xs font-semibold text-[#929DAC] hover:bg-[#111722] hover:text-[#F0F3F7] cursor-pointer shadow-sm transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Everything (Clean Attempt)</span>
              </button>
            )}
          </div>
        )}

        {/* Scrollable Rules Cards Grid */}
        <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {/* Rule 1: Tab-Switching Violation & Strike Policy */}
          <div className="rounded-xl border border-[#252D38] bg-[#111722]/80 hover:border-[#3A4656] transition-colors p-4 flex items-start gap-3.5">
            <div className="mt-0.5 rounded-lg border border-[#FFB800]/40 bg-[#FFB800]/10 p-2 text-[#FFB800] shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-mono text-xs font-bold uppercase text-[#F0F3F7] tracking-wide">
                1. Tab-Switching Violation & Strike System (Max 2 Warnings)
              </h3>
              <p className="text-xs text-[#929DAC] leading-relaxed">
                Leaving the exam window, switching tabs, minimizing the browser, or opening secondary applications will immediately trigger a proctoring infraction. You are allowed a maximum of <strong className="text-[#F0F3F7]">2 warnings</strong>. A 3rd infraction (&gt; 2 warnings) will <strong className="text-[#FF365B]">IMMEDIATELY TERMINATE YOUR EXAM ON THE SPOT and record your score as ZERO (0 PTS)</strong> on the official leaderboard.
              </p>
            </div>
          </div>

          {/* Rule 2 & 3: Forward Progression & Timer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#252D38] bg-[#111722]/80 hover:border-[#3A4656] transition-colors p-3.5 flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-[#252D38] bg-[#111722] p-2 text-[#929DAC] shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-mono text-xs font-semibold text-[#F0F3F7]">
                  2. Strict Forward-Only
                </h4>
                <p className="text-[11px] text-[#929DAC] leading-relaxed">
                  Questions are strictly sequential. Once submitted or when the 15s timer expires, you <strong className="text-[#F0F3F7]">cannot go back</strong> to previous questions.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#252D38] bg-[#111722]/80 hover:border-[#3A4656] transition-colors p-3.5 flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-[#252D38] bg-[#111722] p-2 text-[#929DAC] shrink-0">
                <Hourglass className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-mono text-xs font-semibold text-[#F0F3F7]">
                  3. {perQuestionSec}s Per Question
                </h4>
                <p className="text-[11px] text-[#929DAC] leading-relaxed">
                  Each question has a strict {perQuestionSec}-second countdown. When it hits 0s, the terminal auto-advances to the next question.
                </p>
              </div>
            </div>
          </div>

          {/* Rule 4 & 5: Anti-Copy & Zero AI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#252D38] bg-[#111722]/80 hover:border-[#3A4656] transition-colors p-3.5 flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-[#252D38] bg-[#111722] p-2 text-[#929DAC] shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-mono text-xs font-semibold text-[#F0F3F7]">
                  4. Anti-Copy & Screenshot Block
                </h4>
                <p className="text-[11px] text-[#929DAC] leading-relaxed">
                  Copying, cutting, pasting, right-click, and screenshots (<strong className="text-[#F0F3F7]">PrintScreen, Win+Shift+S</strong>) are disabled and monitored.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#252D38] bg-[#111722]/80 hover:border-[#3A4656] transition-colors p-3.5 flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-[#252D38] bg-[#111722] p-2 text-[#929DAC] shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-mono text-xs font-semibold text-[#F0F3F7]">
                  5. Zero AI Assistance
                </h4>
                <p className="text-[11px] text-[#929DAC] leading-relaxed">
                  The use of <strong className="text-[#F0F3F7]">ChatGPT, Claude, Gemini, Copilot, or any AI tool</strong> is strictly forbidden and causes instant disqualification.
                </p>
              </div>
            </div>
          </div>

          {/* Rule 6: Strictly One Attempt Per Email */}
          <div className="rounded-xl border border-[#252D38] bg-[#111722]/80 hover:border-[#3A4656] transition-colors p-3.5 flex items-start gap-3">
            <div className="mt-0.5 rounded-lg border border-[#252D38] bg-[#111722] p-2 text-[#929DAC] shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-mono text-xs font-semibold text-[#F0F3F7]">
                6. Strictly One Attempt Per Email
              </h4>
              <p className="text-[11px] text-[#929DAC] leading-relaxed">
                You are granted only <strong className="text-[#F0F3F7]">ONE attempt per registered email address</strong>. Questions and answer choices are uniquely randomized per candidate to prevent sharing. Once started, refreshing or leaving locks your score permanently on the leaderboard.
              </p>
            </div>
          </div>
        </div>

        {/* Mandatory Agreement Checkbox */}
        <div className="mt-4 border-t border-[#252D38] pt-4">
          <label className="flex items-start gap-3 rounded-xl border border-[#252D38] bg-[#07090D] p-3.5 cursor-pointer hover:border-[#3A4656] transition-colors">
            <input
              type="checkbox"
              id="rules-checkbox"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#252D38] bg-[#111722] text-[#B6FF3B] focus:ring-[#B6FF3B] cursor-pointer shrink-0"
            />
            <span className="text-xs text-[#F0F3F7] leading-relaxed select-none">
              I have read, understood, and accept all the rules above. I acknowledge that I have strictly ONE attempt per email address, questions and options are randomized, and exceeding 2 warnings results in immediate score 0 disqualification.
            </span>
          </label>
        </div>

        {/* Action Controls */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#252D38] pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto rounded-lg border border-[#252D38] bg-[#111722] px-5 py-2.5 text-xs font-medium text-[#929DAC] hover:text-[#F0F3F7] transition-colors cursor-pointer"
          >
            Cancel & Return
          </button>

          <button
            type="button"
            disabled={!hasAgreed}
            onClick={onConfirmStart}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#B6FF3B] px-6 py-2.5 text-xs font-bold text-[#07090D] hover:bg-[#c8ff66] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg cursor-pointer"
          >
            <span>Start Quiz (Begin 3-2-1 Countdown)</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
