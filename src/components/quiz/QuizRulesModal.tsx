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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111110]/90 p-4 sm:p-6 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#2e2e2a] bg-[#1b1b19] p-6 sm:p-8 shadow-2xl my-auto">
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-4 border-b border-[#2e2e2a] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#7ab32e]/40 bg-[#8dc63f]/10 text-[#8dc63f] shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-[10px] sm:text-[11px] font-bold tracking-wider text-[#8dc63f] uppercase block">
                CRITICAL OPERATIONAL RULES & CODE OF CONDUCT
              </span>
              <h2
                id="rules-modal-title"
                className="font-display text-xl sm:text-2xl font-bold text-[#f5f5f2]"
              >
                Tournament Rules Briefing
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Close rules dialog"
            className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] p-1.5 text-[#a8a8a2] hover:text-[#f5f5f2] hover:border-[#2e2e2a] cursor-pointer shrink-0 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Target Tournament Badge */}
        <div className="mt-4 rounded-lg border border-[#7ab32e]/30 bg-[#8dc63f]/5 p-3 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
          <span className="text-[#a8a8a2]">Target Tournament:</span>
          <span className="font-semibold text-[#8dc63f]">
            {competition?.title || 'Cyber Quiz 2026'}
          </span>
        </div>

        {/* Admin Test Controls */}
        {isAdmin && (
          <div className="mt-3 rounded-lg border border-[#7ab32e]/40 bg-[#8dc63f]/10 p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#8dc63f] shrink-0" />
              <span className="font-mono text-xs font-bold text-[#8dc63f]">
                ADMIN TEST MODE · UNRESTRICTED ACCESS
              </span>
            </div>
            {onResetAdminSession && (
              <button
                type="button"
                onClick={onResetAdminSession}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#7ab32e]/50 bg-[#111110] px-3 py-1 font-mono text-xs font-semibold text-[#8dc63f] hover:bg-[#8dc63f]/20 cursor-pointer shadow-sm transition-colors"
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
          <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19]/80 hover:border-[#2e2e2a] transition-colors p-4 flex items-start gap-3.5">
            <div className="mt-0.5 rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-2 text-[#a8a8a2] shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-xs font-bold uppercase text-[#f5f5f2] tracking-wide">
                1. Tab-Switching Violation & Strike System (Max 2 Warnings)
              </h3>
              <p className="text-xs text-[#a8a8a2] leading-relaxed">
                Leaving the window, switching tabs, or opening other apps is an infraction. Max <strong className="text-[#f5f5f2]">2 warnings</strong>; a 3rd ends your exam with <strong className="text-[#FF365B]">ZERO (0 PTS)</strong>.
              </p>
            </div>
          </div>

          {/* Rule 2 & 3: Forward Progression & Timer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19]/80 hover:border-[#2e2e2a] transition-colors p-3.5 flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-2 text-[#a8a8a2] shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display text-xs font-bold uppercase text-[#f5f5f2]">
                  2. Strict Forward-Only
                </h4>
                <p className="text-[11px] text-[#a8a8a2] leading-relaxed">
                  Questions are sequential. Once submitted or the 15s timer expires, you <strong className="text-[#f5f5f2]">cannot go back</strong>.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19]/80 hover:border-[#2e2e2a] transition-colors p-3.5 flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-2 text-[#a8a8a2] shrink-0">
                <Hourglass className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display text-xs font-bold uppercase text-[#f5f5f2]">
                  3. {perQuestionSec}s Per Question
                </h4>
                <p className="text-[11px] text-[#a8a8a2] leading-relaxed">
                  Strict {perQuestionSec}-second countdown per question. At 0s, it auto-advances to the next question.
                </p>
              </div>
            </div>
          </div>

          {/* Rule 4 & 5: Anti-Copy & Zero AI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19]/80 hover:border-[#2e2e2a] transition-colors p-3.5 flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-2 text-[#a8a8a2] shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display text-xs font-bold uppercase text-[#f5f5f2]">
                  4. Anti-Copy & Screenshot Block
                </h4>
                <p className="text-[11px] text-[#a8a8a2] leading-relaxed">
                  Copy, cut, paste, right-click and screenshots (<strong className="text-[#f5f5f2]">PrintScreen, Win+Shift+S</strong>) are disabled and monitored.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19]/80 hover:border-[#2e2e2a] transition-colors p-3.5 flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-2 text-[#a8a8a2] shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display text-xs font-bold uppercase text-[#f5f5f2]">
                  5. Zero AI Assistance
                </h4>
                <p className="text-[11px] text-[#a8a8a2] leading-relaxed">
                  <strong className="text-[#f5f5f2]">ChatGPT, Claude, Gemini, Copilot, or any AI tool</strong> is strictly forbidden and causes instant disqualification.
                </p>
              </div>
            </div>
          </div>

          {/* Rule 6: Strictly One Attempt Per Email */}
          <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19]/80 hover:border-[#2e2e2a] transition-colors p-3.5 flex items-start gap-3">
            <div className="mt-0.5 rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-2 text-[#a8a8a2] shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display text-xs font-bold uppercase text-[#f5f5f2]">
                6. Strictly One Attempt Per Email
              </h4>
              <p className="text-[11px] text-[#a8a8a2] leading-relaxed">
                Only <strong className="text-[#f5f5f2]">ONE attempt per registered email address</strong>. Questions and options are uniquely randomized per candidate. Once started, refreshing or leaving locks your score permanently on the leaderboard.
              </p>
            </div>
          </div>
        </div>

        {/* Mandatory Agreement Checkbox */}
        <div className="mt-4 border-t border-[#2e2e2a] pt-4">
          <label className="flex items-start gap-3 rounded-xl border border-[#2e2e2a] bg-[#111110] p-3.5 cursor-pointer hover:border-[#2e2e2a] transition-colors">
            <input
              type="checkbox"
              id="rules-checkbox"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#2e2e2a] bg-[#1b1b19] text-[#8dc63f] focus:ring-[#7ab32e] cursor-pointer shrink-0"
            />
            <span className="text-xs text-[#f5f5f2] leading-relaxed select-none">
              I have read and accept all the rules above. I understand there is ONE attempt per email, questions are randomized, and exceeding 2 warnings means instant disqualification with score 0.
            </span>
          </label>
        </div>

        {/* Action Controls */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#2e2e2a] pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto rounded-lg border border-[#2e2e2a] bg-[#1b1b19] px-5 py-2.5 text-xs font-medium text-[#a8a8a2] hover:text-[#f5f5f2] transition-colors cursor-pointer"
          >
            Cancel & Return
          </button>

          <button
            type="button"
            disabled={!hasAgreed}
            onClick={onConfirmStart}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#8dc63f] px-6 py-2.5 text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg cursor-pointer"
          >
            <span>Start Quiz (Begin 3-2-1 Countdown)</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
