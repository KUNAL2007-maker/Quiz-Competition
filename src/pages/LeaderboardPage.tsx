import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Trophy,
  Radio,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatDurationSeconds } from '../utils/timerLogic';
import { isExcludedLeaderboardEntry } from '../utils/leaderboardCalibration';
import { CYBER_QUIZ_COMP_ID } from '../constants/tournaments';

export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { competitionId: pathCompId } = useParams<{ competitionId?: string }>();
  const [searchParams] = useSearchParams();
  const queryCompId = searchParams.get('competitionId') || pathCompId;

  const { leaderboard, competitions, currentUser, profile, results } = useAppContext();

  // Find all active live competitions (excluding practice quizzes and past cyber quiz)
  // Sorted newest first so whenever a new competition is hosted, the live leaderboard
  // automatically points to that newly hosted competition!
  const availableLiveCompetitions = useMemo(() => {
    const now = Date.now();
    const liveList = competitions.filter((c) => {
      if (c.title.toLowerCase().includes('practice')) return false;
      if (c.id === CYBER_QUIZ_COMP_ID) return false; // Cyber Quiz 2026 is officially archived
      if (c.status === 'completed') return false;
      if (c.endTime && new Date(c.endTime).getTime() <= now) return false;
      if (c.status === 'live') return true;
      if (c.startTime && new Date(c.startTime).getTime() <= now) return true;
      return false;
    });

    return liveList.sort((a, b) => {
      // Prioritize newest competition: numeric timestamp ID or startTime
      const idTimeA = a.id.startsWith('comp_') ? Number(a.id.replace('comp_', '')) : 0;
      const idTimeB = b.id.startsWith('comp_') ? Number(b.id.replace('comp_', '')) : 0;
      if (!Number.isNaN(idTimeA) && !Number.isNaN(idTimeB) && idTimeA > 0 && idTimeB > 0) {
        if (idTimeB !== idTimeA) return idTimeB - idTimeA;
      }
      const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [competitions]);

  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);

  const activeLiveCompetition = useMemo(() => {
    if (selectedCompId) {
      const match = availableLiveCompetitions.find((c) => c.id === selectedCompId);
      if (match) return match;
    }
    if (queryCompId) {
      const match = availableLiveCompetitions.find((c) => c.id === queryCompId);
      if (match) return match;
    }
    // Default to the newest active live competition (first in sorted list)
    return availableLiveCompetitions[0] || null;
  }, [availableLiveCompetitions, selectedCompId, queryCompId]);

  // Live scoreboard shows telemetry & scores for the currently active live tournament!
  // Past scores from completed tournaments are strictly quarantined to the /standings page.
  // Requirement: ONLY genuine entries submitted AFTER competition start and BEFORE competition end
  // are shown. No fake or synthetic entries are added without explicit user directive.
  const liveEntries = useMemo(() => {
    if (!activeLiveCompetition) return [];

    const startMs = activeLiveCompetition.startTime
      ? new Date(activeLiveCompetition.startTime).getTime()
      : 0;
    const endMs = activeLiveCompetition.endTime
      ? new Date(activeLiveCompetition.endTime).getTime()
      : Infinity;

    const filtered = leaderboard
      .filter((entry) => {
        if (isExcludedLeaderboardEntry(entry)) return false;
        // Strictly exclude fake or synthetic entries
        if (entry.participantId.startsWith('live_op_') || entry.participantId.startsWith('sim_')) {
          return false;
        }

        const entryCompId =
          entry.competitionId ||
          (entry.participantId.includes('_') ? entry.participantId.split('_').slice(1).join('_') : '');

        const matchesComp =
          entryCompId === activeLiveCompetition.id ||
          entry.participantId.endsWith(`_${activeLiveCompetition.id}`);

        if (!matchesComp) return false;

        // Rule: Only entries submitted after competition start and before competition end
        if (entry.createdAt) {
          const entryTime = new Date(entry.createdAt).getTime();
          if (!Number.isNaN(entryTime)) {
            // Include a 60-second grace window to absorb any client/server clock skew
            if (startMs > 0 && entryTime < (startMs - 60000)) return false;
            if (Number.isFinite(endMs) && entryTime > (endMs + 60000)) return false;
          }
        }

        return true;
      });

    // Resilience: If current user has completed this active live competition,
    // guarantee their live score is present even if Firestore sync is pending or delayed!
    const userResult = results.find((r) => r.competitionId === activeLiveCompetition.id);
    const hasUser = filtered.some(
      (e) => e.isCurrentUser || (currentUser && (e.participantId.startsWith(currentUser.uid) || (e.email && e.email === currentUser.email)))
    );

    if (userResult && !hasUser && currentUser) {
      const resultTime = userResult.completedAt ? new Date(userResult.completedAt).getTime() : Date.now();
      const isValidWindow = (startMs === 0 || resultTime >= (startMs - 60000)) && (endMs === Infinity || resultTime <= (endMs + 60000));

      if (isValidWindow) {
        filtered.push({
          rank: 1,
          participantId: `${currentUser.uid}_${activeLiveCompetition.id}`,
          competitionId: activeLiveCompetition.id,
          createdAt: userResult.completedAt || new Date().toISOString(),
          displayName: profile.displayName || currentUser.displayName || 'Operator',
          username: profile.username || undefined,
          score: Number(userResult.finalScore || 0),
          completionStatus: 'Completed',
          accuracyPercent: userResult.accuracyPercent,
          completionTimeSeconds: userResult.timeTakenSeconds,
          isCurrentUser: true,
        });
      }
    }

    return filtered
      .map((entry) => {
        const isUser = Boolean(
          currentUser && (
            (entry as any).ownerId === currentUser.uid ||
            entry.participantId.startsWith(`${currentUser.uid}_`) ||
            (currentUser.email && entry.email && entry.email.toLowerCase() === currentUser.email.toLowerCase())
          )
        );
        return { ...entry, isCurrentUser: isUser };
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
  }, [leaderboard, activeLiveCompetition, results, currentUser, profile]);

  const currentUserEntry = useMemo(() => {
    return liveEntries.find((e) => e.isCurrentUser || (currentUser && e.participantId.startsWith(currentUser.uid))) || null;
  }, [liveEntries, currentUser]);

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

          {availableLiveCompetitions.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 pt-3">
              {availableLiveCompetitions.map((comp) => {
                const isSelected = comp.id === activeLiveCompetition?.id;
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => setSelectedCompId(comp.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#8dc63f] text-[#141a09] shadow-md'
                        : 'bg-[#1b1b19] border border-[#2e2e2a] text-[#a8a8a2] hover:text-[#f5f5f2]'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-[#141a09]' : 'bg-[#8dc63f] animate-ping'}`} />
                    <span>{comp.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {activeLiveCompetition && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/competitions')}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#8dc63f] px-4 py-2 text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer"
            >
              <span>Browse Competitions</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
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
                          <span className="rounded bg-[#8dc63f]/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#8dc63f]">
                            YOU
                          </span>
                        )}
                      </p>
                      {entry.username && (
                        <p className="font-mono text-xs text-[#a8a8a2]">@{entry.username}</p>
                      )}
                    </div>
                    <div className="col-span-2 font-mono text-xs text-[#a4d65e] flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>{entry.completionStatus}</span>
                      {entry.completionTimeSeconds !== undefined && (
                        <span className="text-[#a8a8a2] text-[11px] ml-1">({formatDurationSeconds(entry.completionTimeSeconds)})</span>
                      )}
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
        /* Case 2: No Live Tournament Active (Clean minimal standby) */
        <div className="rounded-xl border border-[#2e2e2a] bg-[#1b1b19] p-12 sm:p-20 text-center space-y-4 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2e2e2a] bg-[#151513] text-[#8dc63f]">
            <Radio className="h-7 w-7 text-[#8dc63f]" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#f5f5f2] tracking-tight">
              Live Scoreboard Standby · No Active Quiz Running
            </h2>
            <p className="text-xs sm:text-sm text-[#a8a8a2] leading-relaxed">
              When a competition starts, live scores and rankings will stream here automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
