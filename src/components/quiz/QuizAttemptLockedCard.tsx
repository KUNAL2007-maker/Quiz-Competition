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
} from 'lucide-react';
import { CompetitionResult, LeaderboardEntry } from '../../types';
import { formatDurationSeconds } from '../../utils/timerLogic';

interface QuizAttemptLockedCardProps {
  competitionTitle?: string;
  result?: CompetitionResult | null;
  leaderboardEntry?: LeaderboardEntry | null;
}

export const QuizAttemptLockedCard: React.FC<QuizAttemptLockedCardProps> = ({
  competitionTitle,
  result,
  leaderboardEntry,
}) => {
  const navigate = useNavigate();

  const finalScore = result?.finalScore ?? leaderboardEntry?.score ?? 0;
  const maxScore = result?.maxScore;
  const accuracy = result?.accuracyPercent ?? leaderboardEntry?.accuracyPercent;
  const timeTakenSec = result?.timeTakenSeconds ?? leaderboardEntry?.completionTimeSeconds;

  return (
    <div className="mx-auto max-w-xl py-8 space-y-6">
      <div className="rounded-2xl border border-[#252D38] bg-[#0C1017] p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        {/* Lock Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#B6FF3B]/40 bg-[#B6FF3B]/10 text-[#B6FF3B]">
          <Lock className="h-8 w-8" />
        </div>

        {/* Title & Warning */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B6FF3B]/30 bg-[#B6FF3B]/10 px-3 py-1 font-mono text-[11px] font-bold text-[#B6FF3B]">
            <CheckCircle2 className="h-3.5 w-3.5" /> 1 ATTEMPT COMPLETED & RECORDED
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F0F3F7]">
            Quiz Access Locked
          </h1>
          <p className="text-xs sm:text-sm text-[#929DAC] leading-relaxed max-w-md mx-auto">
            You have already completed <span className="font-semibold text-[#F0F3F7]">"{competitionTitle || 'this competition'}"</span>. Retakes are strictly prohibited to protect the competitive fairness of the tournament leaderboard.
          </p>
        </div>

        {/* Previous Attempt Summary Card */}
        <div className="rounded-xl border border-[#252D38] bg-[#111722] p-5 space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-[#252D38] pb-3">
            <span className="font-mono text-xs text-[#929DAC]">YOUR RECORDED SUBMISSION</span>
            <span className="font-mono text-xs font-semibold text-[#36F58A]">VERIFIED STANDING</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="rounded-lg bg-[#07090D] p-3 border border-[#252D38]">
              <span className="block text-[10px] text-[#929DAC]">FINAL SCORE</span>
              <span className="text-base sm:text-lg font-bold text-[#B6FF3B]">
                {finalScore} {maxScore ? `/ ${maxScore}` : 'pts'}
              </span>
            </div>

            {accuracy !== undefined && (
              <div className="rounded-lg bg-[#07090D] p-3 border border-[#252D38]">
                <span className="block text-[10px] text-[#929DAC]">ACCURACY</span>
                <span className="text-base sm:text-lg font-bold text-[#F0F3F7]">
                  {accuracy}%
                </span>
              </div>
            )}

            {timeTakenSec !== undefined && (
              <div className="rounded-lg bg-[#07090D] p-3 border border-[#252D38]">
                <span className="block text-[10px] text-[#929DAC]">TIME TAKEN</span>
                <span className="text-base sm:text-lg font-bold text-[#F0F3F7]">
                  {formatDurationSeconds(timeTakenSec)}
                </span>
              </div>
            )}

            {(result?.correctCount !== undefined || result?.incorrectCount !== undefined) && (
              <div className="rounded-lg bg-[#07090D] p-3 border border-[#252D38]">
                <span className="block text-[10px] text-[#929DAC]">ANSWERS</span>
                <span className="text-xs sm:text-sm font-bold text-[#F0F3F7] block mt-0.5">
                  <span className="text-[#36F58A]">{result?.correctCount ?? 0} Correct</span>
                  <span className="text-[#929DAC] mx-1">·</span>
                  <span className="text-[#FF365B]">{result?.incorrectCount ?? 0} Wrong</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/leaderboard')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#B6FF3B] px-6 py-2.5 text-xs font-bold text-[#07090D] hover:bg-[#c8ff66] transition-colors cursor-pointer shadow-lg"
          >
            <Trophy className="h-4 w-4" />
            <span>View Live Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/competitions')}
            className="w-full sm:w-auto rounded-lg border border-[#252D38] bg-[#111722] px-5 py-2.5 text-xs font-medium text-[#929DAC] hover:text-[#F0F3F7] transition-colors cursor-pointer"
          >
            Browse Other Tournaments
          </button>
        </div>
      </div>
    </div>
  );
};
