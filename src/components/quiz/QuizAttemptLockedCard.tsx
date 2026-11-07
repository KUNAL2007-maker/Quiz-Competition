import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Trophy,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { CompetitionResult, LeaderboardEntry } from '../../types';
import { formatDurationSeconds } from '../../utils/timerLogic';

interface QuizAttemptLockedCardProps {
  competitionTitle?: string;
  result?: CompetitionResult | null;
  leaderboardEntry?: LeaderboardEntry | null;
  isAdmin?: boolean;
  onResetAdminSession?: () => void;
}

export const QuizAttemptLockedCard: React.FC<QuizAttemptLockedCardProps> = ({
  competitionTitle,
  result,
  leaderboardEntry,
  isAdmin,
  onResetAdminSession,
}) => {
  const navigate = useNavigate();

  const finalScore = result?.finalScore ?? leaderboardEntry?.score ?? 0;
  const maxScore = result?.maxScore;
  const accuracy = result?.accuracyPercent ?? leaderboardEntry?.accuracyPercent;
  const timeTakenSec = result?.timeTakenSeconds ?? leaderboardEntry?.completionTimeSeconds;

  return (
    <div className="mx-auto max-w-xl py-8 space-y-6">
      <div className="rounded-2xl border border-[#2e2e2a] bg-[#1b1b19] p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        {/* Lock Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#7ab32e]/40 bg-[#8dc63f]/10 text-[#8dc63f]">
          <Lock className="h-8 w-8" />
        </div>

        {/* Title & Warning */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7ab32e]/30 bg-[#8dc63f]/10 px-3 py-1 font-mono text-[11px] font-bold text-[#8dc63f]">
            <CheckCircle2 className="h-3.5 w-3.5" /> 1 ATTEMPT COMPLETED & RECORDED
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#f5f5f2]">
            Quiz Access Locked
          </h1>
          <p className="text-xs sm:text-sm text-[#a8a8a2] leading-relaxed max-w-md mx-auto">
            You have already completed <span className="font-semibold text-[#f5f5f2]">"{competitionTitle || 'this competition'}"</span>. Retakes are strictly prohibited to protect the competitive fairness of the tournament leaderboard.
          </p>
        </div>

        {/* Previous Attempt Summary Card */}
        <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-5 space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-[#2e2e2a] pb-3">
            <span className="font-mono text-xs text-[#a8a8a2]">YOUR RECORDED SUBMISSION</span>
            <span className="font-mono text-xs font-semibold text-[#a4d65e]">VERIFIED STANDING</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="rounded-lg bg-[#111110] p-3 border border-[#2e2e2a]">
              <span className="block text-[10px] text-[#a8a8a2]">FINAL SCORE</span>
              <span className="text-base sm:text-lg font-bold text-[#8dc63f]">
                {finalScore} {maxScore ? `/ ${maxScore}` : 'pts'}
              </span>
            </div>

            {accuracy !== undefined && (
              <div className="rounded-lg bg-[#111110] p-3 border border-[#2e2e2a]">
                <span className="block text-[10px] text-[#a8a8a2]">ACCURACY</span>
                <span className="text-base sm:text-lg font-bold text-[#f5f5f2]">
                  {accuracy}%
                </span>
              </div>
            )}

            {timeTakenSec !== undefined && (
              <div className="rounded-lg bg-[#111110] p-3 border border-[#2e2e2a]">
                <span className="block text-[10px] text-[#a8a8a2]">TIME TAKEN</span>
                <span className="text-base sm:text-lg font-bold text-[#f5f5f2]">
                  {formatDurationSeconds(timeTakenSec)}
                </span>
              </div>
            )}

            {(result?.correctCount !== undefined || result?.incorrectCount !== undefined) && (
              <div className="rounded-lg bg-[#111110] p-3 border border-[#2e2e2a]">
                <span className="block text-[10px] text-[#a8a8a2]">ANSWERS</span>
                <span className="text-xs sm:text-sm font-bold text-[#f5f5f2] block mt-0.5">
                  <span className="text-[#a4d65e]">{result?.correctCount ?? 0} Correct</span>
                  <span className="text-[#a8a8a2] mx-1">·</span>
                  <span className="text-[#FF365B]">{result?.incorrectCount ?? 0} Wrong</span>
                </span>
                {Boolean(result?.unwrittenCount) && (
                  <span className="block font-mono text-[9px] text-[#a8a8a2] mt-0.5">
                    ({result?.unwrittenCount} unwritten / timed out)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/leaderboard')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#8dc63f] px-6 py-2.5 text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer shadow-lg"
          >
            <Trophy className="h-4 w-4" />
            <span>View Live Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/competitions')}
            className="w-full sm:w-auto rounded-lg border border-[#2e2e2a] bg-[#1b1b19] px-5 py-2.5 text-xs font-medium text-[#a8a8a2] hover:text-[#f5f5f2] transition-colors cursor-pointer"
          >
            Browse Other Tournaments
          </button>
        </div>

        {isAdmin && onResetAdminSession && (
          <div className="pt-3 border-t border-[#2e2e2a]">
            <button
              type="button"
              onClick={onResetAdminSession}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[#7ab32e]/40 bg-[#8dc63f]/10 px-5 py-2 font-mono text-xs font-semibold text-[#8dc63f] hover:bg-[#8dc63f]/20 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Admin Reset Test (Clean New Attempt)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
