import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Search,
  Radio,
  CheckCircle2,
  ArrowRight,
  Award,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatDurationSeconds } from '../utils/timerLogic';
import { isExcludedLeaderboardEntry } from '../utils/leaderboardCalibration';
import { CYBER_QUIZ_COMP_ID } from '../constants/tournaments';

export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { leaderboard, competitions } = useAppContext();

  // Find any active live competition (excluding practice quizzes and past cyber quiz)
  const activeLiveCompetition = useMemo(() => {
    const now = Date.now();
    return competitions.find((c) => {
      if (c.title.toLowerCase().includes('practice')) return false;
      if (c.id === CYBER_QUIZ_COMP_ID) return false; // Cyber Quiz 2026 is officially archived
      if (c.status === 'completed') return false;
      if (c.endTime && new Date(c.endTime).getTime() <= now) return false;
      if (c.status === 'live') return true;
      if (c.startTime && new Date(c.startTime).getTime() <= now) return true;
      return false;
    });
  }, [competitions]);

  // Live scoreboard ONLY shows entries from the currently active live tournament!
  // Past scores from completed tournaments are strictly quarantined to the /standings page.
  const liveEntries = useMemo(() => {
    if (!activeLiveCompetition) return [];

    return leaderboard
      .filter((entry) => {
        if (isExcludedLeaderboardEntry(entry)) return false;
        const entryCompId =
          entry.competitionId ||
          (entry.participantId.includes('_') ? entry.participantId.split('_').slice(1).join('_') : '');

        return (
          entryCompId === activeLiveCompetition.id ||
          entry.participantId.endsWith(`_${activeLiveCompetition.id}`)
        );
      })
      .sort((a, b) => {
        const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
        if (scoreDiff !== 0) return scoreDiff;

        const timeA =
          typeof a.completionTimeSeconds === 'number' && a.completionTimeSeconds >= 0
            ? a.completionTimeSeconds
            : 999999999;
        const timeB =
          typeof b.completionTimeSeconds === 'number' && b.completionTimeSeconds >= 0
            ? b.completionTimeSeconds
            : 999999999;
        const timeDiff = timeA - timeB;
        if (timeDiff !== 0) return timeDiff;

        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 9999999999999;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 9999999999999;
        return dateA - dateB;
      })
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [leaderboard, activeLiveCompetition]);

  const currentUserEntry = liveEntries.find((e) => e.isCurrentUser) || null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2e2e2a] pb-6">
        <div>
          <div className="flex items-center gap-2">
            {activeLiveCompetition ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a4d65e]/40 bg-[#a4d65e]/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#8dc63f] uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-[#8dc63f] animate-ping" />
                Live Telemetry Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2e2e2a] bg-[#1b1b19] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[#a8a8a2] uppercase tracking-wider">
                <Radio className="h-3 w-3 text-[#a8a8a2]" />
                Live Scoreboard Standby
              </span>
            )}
          </div>

          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#f5f5f2]">
            {activeLiveCompetition ? `Live Scoreboard: ${activeLiveCompetition.title}` : 'Live Scoreboard'}
          </h1>
          <p className="mt-2 text-sm text-[#a8a8a2] max-w-2xl leading-relaxed">
            {activeLiveCompetition
              ? 'Real-time telemetry and active standings for the tournament currently in progress. Scores update automatically.'
              : 'The live scoreboard displays real-time telemetry while a competition is actively running. Concluded tournament records are archived in Final Standings.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/standings')}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#b38d3a]/60 bg-[#1b1b19] px-3.5 py-2 text-xs font-semibold text-[#E6B450] hover:bg-[#b38d3a]/10 transition-colors cursor-pointer"
          >
            <Trophy className="h-4 w-4" />
            <span>View Final Standings (Past Quizzes)</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/competitions')}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#8dc63f] px-4 py-2 text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer"
          >
            <span>Browse Competitions</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Case 1: Active Live Competition Running */}
      {activeLiveCompetition ? (
        <div className="space-y-6">
          {/* Operator Standing Banner */}
          {currentUserEntry && (
            <div className="rounded-lg border border-[#7ab32e]/40 bg-[#8dc63f]/5 p-4 sm:p-5 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-[#8dc63f] font-semibold">
                  YOUR LIVE TOURNAMENT STANDING
                </span>
                <p className="mt-0.5 text-base font-bold text-[#f5f5f2]">
                  Rank #{currentUserEntry.rank} — {currentUserEntry.score} Points ({currentUserEntry.accuracyPercent ?? 0}% Accuracy)
                </p>
              </div>
              <span className="font-mono text-xs text-[#a4d65e] px-2.5 py-1 rounded bg-[#a4d65e]/15 border border-[#a4d65e]/30">
                LIVE
              </span>
            </div>
          )}

          {/* Live Table */}
          <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] overflow-hidden shadow-xl">
            <div className="border-b border-[#2e2e2a] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8dc63f] animate-ping" />
                <h2 className="font-display text-base font-bold text-[#f5f5f2]">
                  Live Standings: {activeLiveCompetition.title}
                </h2>
              </div>
              <span className="font-mono text-xs text-[#a8a8a2]">
                {liveEntries.length} ACTIVE PARTICIPANTS
              </span>
            </div>

            {liveEntries.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Trophy className="mx-auto h-8 w-8 text-[#a8a8a2]" />
                <p className="font-bold text-sm text-[#f5f5f2]">Waiting for First Submissions</p>
                <p className="text-xs text-[#a8a8a2] max-w-sm mx-auto">
                  The competition is live now! As participants complete questions and submit their results, their live standings will stream here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#2e2e2a]">
                {liveEntries.map((entry) => (
                  <div
                    key={entry.participantId}
                    className={`grid grid-cols-12 gap-4 items-center px-6 py-3.5 text-sm hover:bg-[#151513] transition-colors ${
                      entry.isCurrentUser ? 'bg-[#8dc63f]/10 border-l-2 border-[#8dc63f]' : ''
                    }`}
                  >
                    <div className="col-span-1 font-mono font-bold text-[#8dc63f] tabular-nums">
                      #{entry.rank}
                    </div>
                    <div className="col-span-5">
                      <p className="font-semibold text-[#f5f5f2] flex items-center gap-2">
                        <span>{entry.displayName}</span>
                        {entry.isCurrentUser && (
                          <span className="rounded bg-[#8dc63f]/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-[#8dc63f]">
                            YOU
                          </span>
                        )}
                      </p>
                      {entry.username && (
                        <p className="font-mono text-xs text-[#a8a8a2]">@{entry.username}</p>
                      )}
                    </div>
                    <div className="col-span-2 font-mono text-xs text-[#a4d65e] flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{entry.completionStatus}</span>
                    </div>
                    <div className="col-span-2 text-right font-mono text-xs text-[#f5f5f2] tabular-nums">
                      {entry.accuracyPercent !== undefined ? `${entry.accuracyPercent}%` : '—'}
                    </div>
                    <div className="col-span-2 text-right font-mono font-bold text-[#8dc63f] tabular-nums">
                      {entry.score.toLocaleString()} PTS
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Case 2: No Live Tournament Active (Clean Standby UI — NO past scores shown here!) */
        <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-8 sm:p-12 text-center space-y-6 shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#2e2e2a] bg-[#151513] text-[#8dc63f]">
            <Radio className="h-8 w-8 text-[#8dc63f]" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2e2e2a] bg-[#151513] px-3 py-1 font-mono text-[11px] font-bold text-[#a8a8a2] uppercase tracking-wider">
              Live Scoreboard Standby · No Active Quiz Running
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#f5f5f2]">
              Live Scoreboard is Currently Idle
            </h2>
            <p className="text-xs sm:text-sm text-[#a8a8a2] leading-relaxed">
              The live scoreboard is dedicated exclusively to real-time telemetry while a competition is actively running. There is currently no active quiz tournament in progress.
            </p>
          </div>

          {/* Notice to view Past Final Standings */}
          <div className="rounded-xl border border-[#b38d3a]/40 bg-[#b38d3a]/10 p-5 max-w-lg mx-auto text-left space-y-3">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#E6B450] uppercase tracking-wider">
              <Trophy className="h-4 w-4 text-[#E6B450]" />
              <span>Cyber Security Quiz 2026 — Final Standings</span>
            </div>
            <p className="text-xs text-[#f5f5f2] leading-relaxed">
              All 62 participant scores, accuracy percentiles, and top 3 winner placements for <strong className="text-[#8dc63f]">Cyber Security Quiz 2026</strong> are permanently showcased on the official Final Standings page.
            </p>
            <button
              type="button"
              onClick={() => navigate('/standings/comp_1793963656835')}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#E6B450] px-4 py-2 text-xs font-bold text-[#141a09] hover:bg-[#ffd166] transition-colors cursor-pointer shadow-md"
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>View Cyber Quiz 2026 Final Standings</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/competitions')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#8dc63f] px-6 py-2.5 text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer shadow-lg"
            >
              <span>Explore Competitions Directory</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/certification')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[#2e2e2a] bg-[#151513] px-5 py-2.5 text-xs font-medium text-[#f5f5f2] hover:border-[#7ab32e] hover:text-[#8dc63f] transition-colors cursor-pointer"
            >
              <Award className="h-4 w-4" />
              <span>Certificate Gateway</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
