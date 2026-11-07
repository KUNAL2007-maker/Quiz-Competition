import React, { useState, useEffect, useMemo } from 'react';
import { Competition } from '../../types';
import { ArrowRight, Clock, Shield, Users, CheckCircle2, Play, Lock } from 'lucide-react';
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

  const isLive = useMemo(() => {
    if (competition.status === 'live') return true;
    if (competition.startTime) {
      const startMs = new Date(competition.startTime).getTime();
      return !Number.isNaN(startMs) && startMs <= nowMs && competition.status !== 'completed';
    }
    return false;
  }, [competition.status, competition.startTime, nowMs]);

  const isUpcoming = useMemo(() => {
    if (effectiveIsCompleted || isLive || competition.status === 'completed') return false;
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
  }, [competition.status, competition.startTime, nowMs, isCompleted, isLive]);

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
    <article className="group relative flex flex-col justify-between rounded-lg border border-[#252D38] bg-[#111722] p-6 transition-colors hover:border-[#B6FF3B]/60 shadow-sm">
      <div className="space-y-3">
        {/* Metadata kicker */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#929DAC]">
          {effectiveIsCompleted ? (
            <span className="inline-flex items-center gap-1 rounded bg-[#36F58A]/15 border border-[#36F58A]/30 px-2 py-0.5 font-mono text-[10px] font-bold text-[#36F58A]">
              <CheckCircle2 className="h-3 w-3" /> ATTEMPT COMPLETED
            </span>
          ) : isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded bg-[#36F58A]/15 border border-[#36F58A]/40 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#36F58A]">
              <span className="h-2 w-2 rounded-full bg-[#36F58A] animate-ping" />
              LIVE QUIZ NOW
            </span>
          ) : isUpcoming ? (
            <span className="inline-flex items-center gap-1.5 rounded bg-[#00E5FF]/15 border border-[#00E5FF]/40 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#00E5FF]">
              <Clock className="h-3 w-3" />
              UPCOMING QUIZ
            </span>
          ) : (
            <span className="rounded bg-[#252D38] px-2 py-0.5 font-mono text-[10px] text-[#929DAC]">
              COMPLETED
            </span>
          )}
        </div>

        <h3 className="font-display text-lg font-bold text-[#F0F3F7] group-hover:text-[#B6FF3B] transition-colors">
          {competition.title}
        </h3>

        {competition.description && (
          <p className="text-xs text-[#929DAC] leading-relaxed line-clamp-2">
            {competition.description}
          </p>
        )}

        {/* Real-time Countdown Banner for Upcoming Competitions */}
        {isUpcoming && countdown && countdown.isValid && !countdown.isExpired && (
          <div className="rounded-md border border-[#00E5FF]/30 bg-[#00E5FF]/5 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#00E5FF]">
              <Clock className="h-3.5 w-3.5 text-[#00E5FF] animate-pulse" />
              <span>STARTS IN:</span>
            </div>
            <div className="font-mono text-xs font-bold text-[#F0F3F7] tabular-nums">
              {countdown.days > 0 ? `${countdown.days}d ` : ''}
              {formatPad(countdown.hours)}h {formatPad(countdown.minutes)}m {formatPad(countdown.seconds)}s
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-[#252D38] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3.5 font-mono text-xs text-[#929DAC]">
          {competition.startTime && (
            <span className="inline-flex items-center gap-1.5" title={`Scheduled: ${new Date(competition.startTime).toLocaleString()}`}>
              <Clock className="h-3.5 w-3.5 text-[#929DAC]" aria-hidden="true" />
              {new Date(competition.startTime).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-[#929DAC]" aria-hidden="true" />
            {totalTimeLabel}
          </span>
          {competition.participantCount !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#929DAC]" aria-hidden="true" />
              {competition.participantCount}
            </span>
          )}
        </div>

        {effectiveIsCompleted ? (
          <button
            type="button"
            onClick={() => onSelect(competition)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#0C1017] border border-[#36F58A]/40 px-3.5 py-2.5 min-h-11 text-xs font-semibold text-[#36F58A] transition-colors hover:bg-[#36F58A]/10 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>View Standings</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : isLive ? (
          <button
            type="button"
            onClick={() => onSelect(competition)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#B6FF3B] px-4 py-1.5 text-xs font-bold text-[#07090D] transition-colors hover:bg-[#c8ff66] whitespace-nowrap shrink-0 cursor-pointer shadow-md"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Enter Quiz Directly</span>
          </button>
        ) : isUpcoming ? (
          <div className="flex flex-wrap items-center gap-2">
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
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#B6FF3B] px-3.5 py-2.5 min-h-11 text-xs font-bold text-[#07090D] transition-colors hover:bg-[#c8ff66] whitespace-nowrap shrink-0 cursor-pointer shadow-md"
                title="Admin direct testing mode"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Test Quiz (Admin)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelect(competition)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#0C1017] border border-[#00E5FF]/40 px-3.5 py-2.5 min-h-11 text-xs font-semibold text-[#00E5FF] transition-colors hover:bg-[#00E5FF]/10 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
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
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#0C1017] border border-[#252D38] px-3.5 py-2.5 min-h-11 text-xs font-medium text-[#F0F3F7] transition-colors hover:border-[#B6FF3B] hover:text-[#B6FF3B] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>View Details</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
};
