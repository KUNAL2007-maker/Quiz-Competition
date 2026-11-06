import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Search, SlidersHorizontal, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { EmptyStateBlock } from '../components/ui/EmptyStateBlock';
import { formatDurationSeconds } from '../utils/timerLogic';

export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { leaderboard, competitions } = useAppContext();

  const [selectedCompId, setSelectedCompId] = useState<string>('all');
  const [timePeriod, setTimePeriod] = useState<'all-time' | 'current-round' | '24h'>('all-time');
  const [categoryFilter, setCategoryFilter] = useState<string>('overall');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEntries = useMemo(() => {
    return leaderboard
      .filter((entry) => {
        // 1. Competition Filter
        if (selectedCompId !== 'all') {
          const entryCompId =
            entry.competitionId ||
            (entry.participantId.includes('_') ? entry.participantId.split('_').slice(1).join('_') : '');
          if (entryCompId !== selectedCompId) {
            return false;
          }
        }

        // 2. Category Filter
        if (categoryFilter !== 'overall') {
          const catLower = categoryFilter.toLowerCase();
          const targetComp = competitions.find(
            (c) => c.id === entry.competitionId || entry.participantId.endsWith(`_${c.id}`)
          );
          const compMatches =
            targetComp &&
            (targetComp.title.toLowerCase().includes(catLower) ||
              (targetComp.difficulty && targetComp.difficulty.toLowerCase().includes(catLower)) ||
              (targetComp.description && targetComp.description.toLowerCase().includes(catLower)));
          const entryMatches =
            entry.category && entry.category.toLowerCase().includes(catLower);

          if (!compMatches && !entryMatches) {
            return false;
          }
        }

        // 3. Time Period Filter
        if (timePeriod === '24h' && entry.createdAt) {
          const timeMs = new Date(entry.createdAt).getTime();
          if (!Number.isNaN(timeMs) && Date.now() - timeMs > 24 * 60 * 60 * 1000) {
            return false;
          }
        } else if (timePeriod === 'current-round') {
          // If a live competition is active, show only its entries
          const liveComp = competitions.find((c) => c.status === 'live');
          if (liveComp) {
            const entryCompId =
              entry.competitionId ||
              (entry.participantId.includes('_') ? entry.participantId.split('_').slice(1).join('_') : '');
            if (entryCompId !== liveComp.id) return false;
          }
        }

        // 4. Participant Search
        if (
          searchQuery.trim() !== '' &&
          !entry.displayName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(entry.username || '').toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        return true;
      })
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1, // Recompute dynamic rank after filtering
      }));
  }, [leaderboard, selectedCompId, categoryFilter, timePeriod, searchQuery, competitions]);

  const currentUserEntry = leaderboard.find((e) => e.isCurrentUser) || null;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#252D38] pb-6">
        <div>
          <p className="font-mono text-xs tracking-wider text-[#B6FF3B]">
            COMPETITIVE RANKING LEDGER
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#F0F3F7]">
            Live Leaderboard
          </h1>
          <p className="mt-2 text-sm text-[#929DAC] max-w-2xl">
            Verified operator standings, completion statuses, accuracy metrics, and execution times across cybersecurity tournaments.
          </p>
        </div>
      </div>

      {/* Current User Rank Slot (only displays real values when known) */}
      <div className="rounded-lg border border-[#252D38] bg-[#0C1017] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs text-[#929DAC]">
            OPERATOR STANDING SUMMARY
          </span>
          <p className="mt-1 text-sm font-medium text-[#F0F3F7]">
            {currentUserEntry
              ? `Ranked #${currentUserEntry.rank} — ${currentUserEntry.score} Points`
              : 'Your operator standing will appear here once you complete a ranked competition.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/competitions')}
          className="rounded-md border border-[#252D38] bg-[#111722] px-3.5 py-2 text-xs font-medium text-[#F0F3F7] hover:border-[#B6FF3B] hover:text-[#B6FF3B] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
        >
          Browse Competitions
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 rounded-lg border border-[#252D38] bg-[#0C1017] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#929DAC]" aria-hidden="true" />
            <label htmlFor="leaderboard-comp-select" className="sr-only">
              Select Competition
            </label>
            <select
              id="leaderboard-comp-select"
              value={selectedCompId}
              onChange={(e) => setSelectedCompId(e.target.value)}
              className="rounded-md border border-[#252D38] bg-[#07090D] px-3 py-1.5 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none cursor-pointer"
            >
              <option value="all">All Competitions</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <label htmlFor="leaderboard-category-select" className="sr-only">
            Ranking Category
          </label>
          <select
            id="leaderboard-category-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-[#252D38] bg-[#07090D] px-3 py-1.5 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none cursor-pointer"
          >
            <option value="overall">Overall Standings</option>
            <option value="cryptography">Cryptography &versing</option>
            <option value="forensics">Digital Forensics</option>
            <option value="network">Network Exploitation</option>
          </select>

          {/* Time Period Segmented Control */}
          <div
            role="group"
            aria-label="Time period filter"
            className="flex flex-wrap items-center gap-1 rounded-md border border-[#252D38] bg-[#07090D] p-1"
          >
            {[
              { id: 'all-time', label: 'All Time' },
              { id: 'current-round', label: 'Current Round' },
              { id: '24h', label: 'Last 24h' },
            ].map((period) => (
              <button
                key={period.id}
                type="button"
                onClick={() => setTimePeriod(period.id as typeof timePeriod)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  timePeriod === period.id
                    ? 'bg-[#B6FF3B] text-[#07090D] font-semibold'
                    : 'text-[#929DAC] hover:text-[#F0F3F7]'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Participant Search */}
        <div className="relative sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#929DAC]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter participant handle..."
            aria-label="Filter participant handle"
            className="w-full rounded-md border border-[#252D38] bg-[#07090D] py-1.5 pl-9 pr-8 text-xs text-[#F0F3F7] placeholder-[#929DAC]/60 focus:border-[#B6FF3B] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear participant search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Ranking Table Header Structure & Empty State */}
      <div className="rounded-lg border border-[#252D38] bg-[#0C1017] overflow-hidden">
        {/* Desktop Table Column Header */}
        <div className="hidden md:grid md:grid-cols-12 gap-4 border-b border-[#252D38] bg-[#111722] px-6 py-3.5 font-mono text-xs font-medium text-[#929DAC]">
          <div className="col-span-1">RANK</div>
          <div className="col-span-4">PARTICIPANT IDENTITY</div>
          <div className="col-span-2">COMPLETION STATUS</div>
          <div className="col-span-2 text-right">ACCURACY</div>
          <div className="col-span-1 text-right">TIME</div>
          <div className="col-span-2 text-right">SCORE</div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyStateBlock
              icon={Trophy}
              visualType="grid"
              codeLabel="RANKING LEDGER · NO MATCHING RECORDS"
              title={leaderboard.length > 0 ? "No Participants Match Filters" : "Ranking Data Not Yet Available"}
              description={
                leaderboard.length > 0
                  ? "No leaderboard scores found for the selected competition, category, or timeframe. Reset your filters to view all registered competitors."
                  : "No leaderboard records exist yet. Once competitors complete a quiz round, their verified standings will populate here."
              }
              actionLabel={leaderboard.length > 0 ? "Reset Filters" : "Browse Competitions"}
              onAction={() => {
                if (leaderboard.length > 0) {
                  setSelectedCompId('all');
                  setCategoryFilter('overall');
                  setTimePeriod('all-time');
                  setSearchQuery('');
                } else {
                  navigate('/competitions');
                }
              }}
            />
          </div>
        ) : (
          /* Desktop Table + Mobile Card Transformation when real data exists */
          <div>
            {/* Desktop Rows */}
            <div className="hidden md:block divide-y divide-[#252D38]">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.participantId}
                  className="grid grid-cols-12 gap-4 items-center px-6 py-4 text-sm hover:bg-[#111722]/60 transition-colors"
                >
                  <div className="col-span-1 font-mono font-bold text-[#B6FF3B] tabular-nums">
                    #{String(entry.rank).padStart(2, '0')}
                  </div>
                  <div className="col-span-4">
                    <p className="font-semibold text-[#F0F3F7]">{entry.displayName}</p>
                    {entry.username && (
                      <p className="font-mono text-xs text-[#929DAC]">@{entry.username}</p>
                    )}
                  </div>
                  <div className="col-span-2 font-mono text-xs text-[#36F58A]">
                    {entry.completionStatus}
                  </div>
                  <div className="col-span-2 text-right font-mono text-xs text-[#F0F3F7] tabular-nums">
                    {entry.accuracyPercent !== undefined ? `${entry.accuracyPercent}%` : '—'}
                  </div>
                  <div className="col-span-1 text-right font-mono text-xs text-[#929DAC] tabular-nums">
                    {formatDurationSeconds(entry.completionTimeSeconds)}
                  </div>
                  <div className="col-span-2 text-right font-mono font-bold text-[#F0F3F7] tabular-nums">
                    {entry.score.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[#252D38]">
              {filteredEntries.map((entry) => (
                <div key={entry.participantId} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#B6FF3B] tabular-nums">
                      RANK #{entry.rank}
                    </span>
                    <span className="font-mono text-sm font-bold text-[#F0F3F7] tabular-nums">
                      {entry.score.toLocaleString()} PTS
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-[#F0F3F7]">{entry.displayName}</p>
                  <div className="flex items-center justify-between font-mono text-xs text-[#929DAC] pt-1">
                    <span>{entry.completionStatus}</span>
                    {entry.accuracyPercent !== undefined && (
                      <span>ACC: {entry.accuracyPercent}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
