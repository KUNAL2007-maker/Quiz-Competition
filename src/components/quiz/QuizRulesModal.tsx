import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Hourglass,
  Lock,
  Phone,
  Mail,
  Bot,
  CheckCircle2,
  ArrowRight,
  X,
} from 'lucide-react';
import { Competition, OperatorProfile } from '../../types';

interface QuizRulesModalProps {
  isOpen: boolean;
  competition: Competition | null;
  profile: OperatorProfile;
  currentUserEmail?: string | null;
  onConfirmStart: () => void;
  onCancel: () => void;
}

export const QuizRulesModal: React.FC<QuizRulesModalProps> = ({
  isOpen,
  competition,
  profile,
  currentUserEmail,
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
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#252D38] bg-[#0C1017] p-6 sm:p-8 shadow-2xl my-8">
        {/* Top Warning Banner */}
        <div className="flex items-start justify-between gap-4 border-b border-[#252D38] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#FF365B]/40 bg-[#FF365B]/10 text-[#FF365B]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <span className="font-mono text-[11px] font-bold tracking-wider text-[#FF365B] uppercase">
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
            className="rounded-md border border-[#252D38] bg-[#111722] p-1.5 text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Competition Context */}
        <div className="mt-4 rounded-lg border border-[#B6FF3B]/30 bg-[#B6FF3B]/5 p-3.5 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
          <span className="text-[#929DAC]">Target Tournament:</span>
          <span className="font-semibold text-[#B6FF3B]">
            {competition?.title || 'Official Cybersecurity Assessment'}
          </span>
        </div>

        {/* Rules Cards Grid */}
        <div className="mt-5 space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
          {/* Rule 1: Zero AI */}
          <div className="rounded-xl border border-[#FF365B]/30 bg-[#FF365B]/5 p-4 flex items-start gap-3.5">
            <div className="mt-0.5 rounded-lg border border-[#FF365B]/40 bg-[#FF365B]/10 p-2 text-[#FF365B] shrink-0">
              <Bot className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-mono text-xs font-bold uppercase text-[#FF365B] tracking-wide">
                1. Strict Zero-AI & No External Assistance Policy
              </h3>
              <p className="text-xs text-[#929DAC] leading-relaxed">
                The use of <strong className="text-[#F0F3F7]">ChatGPT, Claude, Gemini, Copilot, DeepSeek, or any AI tool</strong> is strictly forbidden. Searching Google, consulting notes, using secondary devices, or switching tabs during the assessment is monitored by anti-cheat controls. Any detected violation will lead to immediate disqualification and a permanent ban.
              </p>
            </div>
          </div>

          {/* Rule 2: Timers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#252D38] bg-[#111722]/80 p-4 flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-[#00E5FF]/40 bg-[#00E5FF]/10 p-2 text-[#00E5FF] shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-mono text-xs font-semibold text-[#00E5FF]">
                  Total Time: {durationMin} Mins
                </h4>
                <p className="text-[11px] text-[#929DAC] leading-relaxed">
                  The entire tournament has a hard limit of {durationMin} minutes. The assessment locks and submits automatically when time expires.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#252D38] bg-[#111722]/80 p-4 flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-[#B6FF3B]/40 bg-[#B6FF3B]/10 p-2 text-[#B6FF3B] shrink-0">
                <Hourglass className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-mono text-xs font-semibold text-[#B6FF3B]">
                  Per-Question: {perQuestionSec}s
                </h4>
                <p className="text-[11px] text-[#929DAC] leading-relaxed">
                  Each question has an individual {perQuestionSec}-second timer. When it reaches 0s, the terminal auto-advances to the next question.
                </p>
              </div>
            </div>
          </div>

          {/* Rule 3: Single Attempt */}
          <div className="rounded-xl border border-[#252D38] bg-[#111722]/80 p-4 flex items-start gap-3">
            <div className="mt-0.5 rounded-lg border border-[#B6FF3B]/40 bg-[#B6FF3B]/10 p-2 text-[#B6FF3B] shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-mono text-xs font-semibold text-[#F0F3F7]">
                3. Strictly One Attempt Only
              </h4>
              <p className="text-[11px] text-[#929DAC] leading-relaxed">
                You are granted <strong className="text-[#B6FF3B]">only ONE attempt</strong> at this competition. Once started, refreshing the browser or leaving the assessment will not grant a second chance. All scores are permanent on the leaderboard.
              </p>
            </div>
          </div>

          {/* Rule 4: Verification of Winners */}
          <div className="rounded-xl border border-[#252D38] bg-[#111722]/80 p-4 flex items-start gap-3">
            <div className="mt-0.5 rounded-lg border border-[#252D38] bg-[#07090D] p-2 text-[#929DAC] shrink-0">
              <Phone className="h-4 w-4 text-[#B6FF3B]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-mono text-xs font-semibold text-[#F0F3F7]">
                4. Winner Verification
              </h4>
              <p className="text-[11px] text-[#929DAC] leading-relaxed">
                Tournament administrators will contact winners using your registered details: WhatsApp (<span className="font-mono text-[#F0F3F7]">{profile.whatsappNumber || 'Registered phone'}</span>) and Email (<span className="font-mono text-[#F0F3F7]">{profile.email || currentUserEmail || 'Registered email'}</span>).
              </p>
            </div>
          </div>
        </div>

        {/* Mandatory Agreement Checkbox */}
        <div className="mt-5 border-t border-[#252D38] pt-5">
          <label className="flex items-start gap-3 rounded-xl border border-[#252D38] bg-[#07090D] p-4 cursor-pointer hover:border-[#B6FF3B]/60 transition-colors">
            <input
              type="checkbox"
              id="rules-checkbox"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#252D38] bg-[#111722] text-[#B6FF3B] focus:ring-[#B6FF3B] cursor-pointer"
            />
            <span className="text-xs text-[#F0F3F7] leading-relaxed select-none">
              I have read, understood, and accept all the rules above. I pledge not to use AI, search engines, or external help, and I acknowledge that I have strictly <strong>ONE attempt</strong> for this competition.
            </span>
          </label>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#252D38] pt-5">
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
