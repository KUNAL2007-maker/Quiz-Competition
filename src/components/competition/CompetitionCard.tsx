import React, { useState, useEffect, useMemo } from 'react';
import { Competition } from '../../types';
import { ArrowRight, Clock, Shield, Users, CheckCircle2, Play, Lock, Trophy } from 'lucide-react';
import { calculateCountdown, formatPad } from '../../utils/timerLogic';
import { useAppContext } from '../../context/AppContext';

interface CompetitionCardProps {
  competition: Competition;
  isCompleted?: boolean;
  onSelect: (competition: Competition) => void;
  onEnterDirectly?: (competition: Competition) => void;
}

export const CompetitionCard: React.FC<CompetitionCardProps> = ({
  competition,
  isCompleted,
  onSelect,
  onEnterDirectly,
}) => {
  const { transitionCompetitionToLive, isAdmin } = useAppContext();
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const isPractice = competition.title.toLowerCase().includes('practice');

  // Total quiz time is the sum of the per-question times:
  // 30 questions × 15 seconds = 450 seconds = 7m 30s.
  const totalTimeLabel = useMemo(() => {
    const totalSeconds =
      (competition.quizFormat?.totalQuestions || 30) *
      (competition.perQuestionTimerSeconds || 15);
    const totalMin = Math.floor(totalSeconds / 60);
    const totalSec = totalSeconds % 60;
    return totalSec === 0 ? `${totalMin}m` : `${totalMin}m ${totalSec}s`;
  }, [competition.quizFormat?.totalQuestions, competition.perQuestionTimerSeconds]);
  const effectiveIsCompleted = isCompleted && !isPractice && competition.status !== 'live' && competition.status !== 'upcoming';

  const isEnded = useMemo(() => {
    if (isPractice) return false;
    if (competition.status === 'completed') return true;
    if (competition.endTime) {
      const endMs = new Date(competition.endTime).getTime();
      return !Number.isNaN(endMs) && endMs <= nowMs;
    }
    return false;
  }, [competition.status, competition.endTime, nowMs, isPractice]);

  const isLive = useMemo(() => {
    if (isEnded) return false;
    if (competition.status === 'live') return true;
    if (competition.startTime) {
      const startMs = new Date(competition.startTime).getTime();
      return !Number.isNaN(startMs) && startMs <= nowMs && competition.status !== 'completed';
    }
    return false;
  }, [competition.status, competition.startTime, nowMs, isEnded]);

  const isUpcoming = useMemo(() => {
    if (isEnded || effectiveIsCompleted || isLive || competition.status === 'completed') return false;
    if (competition.status === 'upcoming') {
      if (competition.startTime) {
        const startMs = new Date(competition.startTime).getTime();
        return !Number.isNaN(startMs) && startMs > nowMs;
      }
      return true;
    }
    if (competition.startTime) {
      const startMs = new Date(competition.startTime).getTime();
      return !Number.isNaN(startMs) && startMs > nowMs;
    }
    return false;
  }, [competition.status, competition.startTime, nowMs, isCompleted, isLive, isEnded]);

  const countdown = useMemo(() => {
    if (!isUpcoming || !competition.startTime) return null;
    return calculateCountdown(competition.startTime, nowMs);
  }, [isUpcoming, competition.startTime, nowMs]);

  // Update timer every second and convert upcoming to live when timer expires
  useEffect(() => {
    if (!isUpcoming) return;
    const interval = setInterval(() => {
      const currentNow = Date.now();
      setNowMs(currentNow);
      if (competition.startTime) {
        const startMs = new Date(competition.startTime).getTime();
        if (!Number.isNaN(startMs) && startMs <= currentNow) {
          transitionCompetitionToLive(competition.id);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isUpcoming, competition.startTime, competition.id, transitionCompetitionToLive]);

  return (
    <article className="group relative flex flex-col justify-between rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-5 sm:p-6 transition-all hover:border-[#7ab32e]/60 shadow-sm h-full">
      <div className="flex-1 flex flex-col space-y-3">
        {/* Metadata kicker */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#a8a8a2]">
          {isEnded ? (
            <span className="rounded bg-[#2e2e2a] border border-[#2e2e2a] px-2 py-0.5 font-mono text-[10px] font-bold text-[#a8a8a2]">
              TOURNAMENT CONCLUDED
            </span>
          ) : effectiveIsCompleted ? (
            <span className="inline-flex items-center gap-1 rounded bg-[#a4d65e]/15 border border-[#a4d65e]/30 px-2 py-0.5 font-mono text-[10px] font-bold text-[#a4d65e]">
              <CheckCircle2 className="h-3 w-3" /> ATTEMPT COMPLETED
            </span>
          ) : isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded bg-[#a4d65e]/15 border border-[#a4d65e]/40 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#a4d65e]">
              <span className="h-2 w-2 rounded-full bg-[#a4d65e] animate-ping" />
              LIVE QUIZ NOW
            </span>
          ) : isUpcoming ? (
            <span className="inline-flex items-center gap-1.5 rounded bg-[#00E5FF]/15 border border-[#00E5FF]/40 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#00E5FF]">
              <Clock className="h-3 w-3" />
              UPCOMING QUIZ
            </span>
          ) : (
            <span className="rounded bg-[#2e2e2a] px-2 py-0.5 font-mono text-[10px] text-[#a8a8a2]">
              COMPLETED
            </span>
          )}
        </div>

        <h3 className="font-display text-lg font-bold text-[#f5f5f2] group-hover:text-[#8dc63f] transition-colors line-clamp-1">
          {competition.title}
        </h3>

        <p className="text-xs text-[#a8a8a2] leading-relaxed line-clamp-2 min-h-[2.5rem]">
          {competition.description || 'Official Null Origin cybersecurity tournament and skills assessment.'}
        </p>

        {/* Real-time Countdown Banner for Upcoming Competitions */}
        {isUpcoming && countdown && countdown.isValid && !countdown.isExpired && (
          <div className="rounded-md border border-[#00E5FF]/30 bg-[#00E5FF]/5 p-2.5 flex items-center justify-between mt-auto">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#00E5FF]">
              <Clock className="h-3.5 w-3.5 text-[#00E5FF] animate-pulse" />
              <span>STARTS IN:</span>
            </div>
            <div className="font-mono text-xs font-bold text-[#f5f5f2] tabular-nums">
              {countdown.days > 0 ? `${countdown.days}d ` : ''}
              {formatPad(countdown.hours)}h {formatPad(countdown.minutes)}m {formatPad(countdown.seconds)}s
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-[#2e2e2a] pt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 min-h-[50px]">
        {/* Standardized 2-line metadata column on the left */}
        <div className="flex flex-col justify-end gap-1 font-mono text-xs text-[#a8a8a2] min-w-0 py-0.5">
          <div className="flex items-center gap-1.5 truncate">
            <Clock className="h-3.5 w-3.5 text-[#a8a8a2] shrink-0" aria-hidden="true" />
            <span className="truncate">
              {isEnded
                ? (competition.endTime
                    ? `Ended ${new Date(competition.endTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : 'Concluded Nov 8')
                : isLive
                ? (competition.startTime
                    ? `${new Date(competition.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : 'Live Now')
                : (competition.startTime
                    ? `Starts ${new Date(competition.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : 'Scheduled')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#a8a8a2]/90">
            <span className="inline-flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-[#a8a8a2] shrink-0" aria-hidden="true" />
              <span>{totalTimeLabel}</span>
            </span>
            {competition.participantCount !== undefined && competition.participantCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-[#a8a8a2] shrink-0" aria-hidden="true" />
                <span>{competition.participantCount}</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Button: standardized h-10 across all card states */}
        <div className="flex items-end justify-end shrink-0 w-full sm:w-auto">
          {isEnded ? (
            <button
              type="button"
              onClick={() => onSelect(competition)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1b1b19] border border-[#a4d65e]/40 px-4 h-10 text-xs font-semibold text-[#a4d65e] transition-colors hover:bg-[#a4d65e]/15 hover:border-[#a4d65e] whitespace-nowrap cursor-pointer shadow-sm"
            >
              <Trophy className="h-3.5 w-3.5 text-[#a4d65e]" />
              <span>View Final Standings</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : effectiveIsCompleted ? (
            <button
              type="button"
              onClick={() => onSelect(competition)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1b1b19] border border-[#a4d65e]/40 px-4 h-10 text-xs font-semibold text-[#a4d65e] transition-colors hover:bg-[#a4d65e]/15 hover:border-[#a4d65e] whitespace-nowrap cursor-pointer shadow-sm"
            >
              <Trophy className="h-3.5 w-3.5 text-[#a4d65e]" />
              <span>View Standings</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : isLive ? (
            <button
              type="button"
              onClick={() => onSelect(competition)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-[#8dc63f] px-4 h-10 text-xs font-bold text-[#141a09] transition-colors hover:bg-[#a4d65e] whitespace-nowrap cursor-pointer shadow-md"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Enter Quiz Directly</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : isUpcoming ? (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {isAdmin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEnterDirectly) {
                      onEnterDirectly(competition);
                    } else {
                      onSelect(competition);
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-[#8dc63f] px-3.5 h-10 text-xs font-bold text-[#141a09] transition-colors hover:bg-[#a4d65e] whitespace-nowrap cursor-pointer shadow-md"
                  title="Admin direct testing mode"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Test Quiz (Admin)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelect(competition)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1b1b19] border border-[#00E5FF]/40 px-3.5 h-10 text-xs font-semibold text-[#00E5FF] transition-colors hover:bg-[#00E5FF]/15 hover:border-[#00E5FF] whitespace-nowrap cursor-pointer shadow-sm"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {countdown && countdown.isValid && !countdown.isExpired
                    ? `Starts in ${countdown.days > 0 ? `${countdown.days}d ` : ''}${countdown.hours > 0 ? `${formatPad(countdown.hours)}h ` : ''}${formatPad(countdown.minutes)}m ${formatPad(countdown.seconds)}s`
                    : 'View Countdown'}
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSelect(competition)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1b1b19] border border-[#2e2e2a] px-4 h-10 text-xs font-medium text-[#f5f5f2] transition-colors hover:border-[#7ab32e] hover:text-[#8dc63f] whitespace-nowrap cursor-pointer shadow-sm"
            >
              <span>View Details</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
