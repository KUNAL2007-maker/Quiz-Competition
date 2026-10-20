import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldAlert, SlidersHorizontal, X, Clock, Play, Lock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { CompetitionCard } from '../components/competition/CompetitionCard';
import { EmptyStateBlock } from '../components/ui/EmptyStateBlock';
import { ModalDialog } from '../components/ui/ModalDialog';
import { CountdownTimer } from '../components/competition/CountdownTimer';
import { Competition } from '../types';

type StatusFilter = 'all' | 'upcoming' | 'live' | 'completed';

export const CompetitionsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    competitions,
    results,
    leaderboard,
    currentUser,
    profile,
    selectCompetition,
    transitionCompetitionToLive,
    addToast,
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [upcomingModalComp, setUpcomingModalComp] = useState<Competition | null>(null);
  const [isModalUnlocked, setIsModalUnlocked] = useState(false);

  const statusTabs: Array<{ id: StatusFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'live', label: 'Live' },
    { id: 'completed', label: 'Completed' },
  ];

  // Set of competition IDs the current user has already completed (Requirement 4)
  const completedCompetitionIds = useMemo(() => {
    if (!currentUser) return new Set<string>();
    const ids = new Set<string>();
    results.forEach((r) => ids.add(r.competitionId));
    leaderboard.forEach((l) => {
      if (l.isCurrentUser && l.participantId.startsWith(`${currentUser.uid}_`)) {
        const compId = l.participantId.replace(`${currentUser.uid}_`, '');
        if (compId) ids.add(compId);
      }
    });
    return ids;
  }, [currentUser, results, leaderboard]);

  const filteredCompetitions = useMemo(() => {
    return competitions.filter((comp) => {
      if (statusFilter !== 'all' && comp.status !== statusFilter) {
        return false;
      }
      if (difficultyFilter !== 'all' && comp.difficulty !== difficultyFilter) {
        return false;
      }
      if (
        searchQuery.trim() !== '' &&
        !comp.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(comp.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [competitions, statusFilter, difficultyFilter, searchQuery]);

  const hasActiveFilters =
    statusFilter !== 'all' || difficultyFilter !== 'all' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setStatusFilter('all');
    setDifficultyFilter('all');
    setSearchQuery('');
  };

  const handleEnterLiveQuiz = useCallback(
    (comp: Competition) => {
      if (!currentUser) {
        navigate('/login?redirect=/quiz');
        return;
      }
      if (!profile.isProfileComplete) {
        addToast(
          'Profile 100% Completion Required',
          'You must complete your profile (Full Legal Name & WhatsApp contact number) before entering any quiz.',
          'alert'
        );
        navigate('/profile?required=1');
        return;
      }
      selectCompetition(comp);
      navigate('/quiz');
    },
    [currentUser, profile.isProfileComplete, selectCompetition, navigate, addToast]
  );

  const handleSelectCompetition = useCallback(
    (comp: Competition) => {
      // 1. If already completed attempt
      if (completedCompetitionIds.has(comp.id)) {
        navigate('/leaderboard');
        return;
      }

      // 2. Check if live now
      const isLive =
        comp.status === 'live' ||
        (comp.startTime &&
          new Date(comp.startTime).getTime() <= Date.now() &&
          comp.status !== 'completed');

      if (isLive) {
        handleEnterLiveQuiz(comp);
        return;
      }

      // 3. If upcoming (not live), show the timer directly to the user
      setIsModalUnlocked(false);
      setUpcomingModalComp(comp);
    },
    [completedCompetitionIds, handleEnterLiveQuiz, navigate]
  );

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#252D38] pb-6">
        <div>
          <p className="font-mono text-xs tracking-wider text-[#B6FF3B]">
            OPERATIONAL TOURNAMENTS
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#F0F3F7]">
            Competitions Directory
          </h1>
          <p className="mt-2 text-sm text-[#929DAC] max-w-2xl">
            Select an active quiz to enter directly, or inspect scheduled start timers for upcoming cybersecurity rounds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/leaderboard')}
            className="rounded-md border border-[#252D38] bg-[#111722] px-4 py-2 text-xs font-medium text-[#F0F3F7] hover:border-[#B6FF3B] hover:text-[#B6FF3B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Live Rankings Ledger
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 rounded-lg border border-[#252D38] bg-[#0C1017] p-4">
        {/* Status Segmented Filter Tabs */}
        <div
          role="group"
          aria-label="Filter competitions by status"
          className="flex flex-wrap items-center gap-1 rounded-md bg-[#07090D] p-1 border border-[#252D38]"
        >
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#B6FF3B] text-[#07090D] font-semibold'
                    : 'text-[#929DAC] hover:text-[#F0F3F7]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Difficulty Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#929DAC]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search competition title..."
              aria-label="Search competitions"
              className="w-full rounded-md border border-[#252D38] bg-[#07090D] py-1.5 pl-9 pr-8 text-xs text-[#F0F3F7] placeholder-[#929DAC]/60 focus:border-[#B6FF3B] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#929DAC] shrink-0" aria-hidden="true" />
            <label htmlFor="difficulty-select" className="sr-only">
              Difficulty Clearance
            </label>
            <select
              id="difficulty-select"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="rounded-md border border-[#252D38] bg-[#07090D] px-3 py-1.5 text-xs text-[#F0F3F7] focus:border-[#B6FF3B] focus:outline-none cursor-pointer"
            >
              <option value="all">All Clearances</option>
              <option value="Field Operator">Field Operator</option>
              <option value="Senior Analyst">Senior Analyst</option>
              <option value="Zero-Day Specialist">Zero-Day Specialist</option>
              <option value="Classified">Classified</option>
            </select>
          </div>
        </div>
      </div>

      {/* Competitions Content Grid or Empty State */}
      {filteredCompetitions.length === 0 ? (
        <EmptyStateBlock
          icon={ShieldAlert}
          visualType="radar"
          codeLabel={
            hasActiveFilters
              ? `FILTERED VIEW · ${statusFilter.toUpperCase()}`
              : 'COMPETITION REGISTRY · EMPTY'
          }
          title={
            hasActiveFilters
              ? 'No Competitions Match Current Filter Criteria'
              : 'No Competitions Available'
          }
          description={
            hasActiveFilters
              ? 'No competition records match your selected status, clearance filter, or search query. Clear active filters to view all scheduled events.'
              : 'The tournament directory currently contains no scheduled, live, or completed competitions. Competitions will appear here once registered by event operations.'
          }
          actionLabel={hasActiveFilters ? 'Reset Active Filters' : 'View Leaderboard'}
          onAction={hasActiveFilters ? handleResetFilters : () => navigate('/leaderboard')}
          secondaryActionLabel="My Profile"
          onSecondaryAction={() => navigate('/profile')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompetitions.map((comp) => (
            <CompetitionCard
              key={comp.id}
              competition={comp}
              isCompleted={completedCompetitionIds.has(comp.id)}
              onSelect={handleSelectCompetition}
            />
          ))}
        </div>
      )}

      {/* Upcoming Quiz Countdown Modal (Shows live timer directly to user) */}
      <ModalDialog
        isOpen={Boolean(upcomingModalComp)}
        onClose={() => setUpcomingModalComp(null)}
        title={upcomingModalComp?.title || 'Upcoming Quiz Competition'}
        subtitle={`Scheduled Start: ${
          upcomingModalComp?.startTime
            ? new Date(upcomingModalComp.startTime).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Pending Start Time'
        }`}
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#00E5FF]">
                {isModalUnlocked ? 'Round Commenced!' : 'Locked until scheduled start'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUpcomingModalComp(null)}
                className="rounded-md border border-[#252D38] bg-[#111722] px-4 py-2 text-xs font-medium text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
              >
                Close
              </button>

              {isModalUnlocked && upcomingModalComp && (
                <button
                  type="button"
                  onClick={() => {
                    const comp = upcomingModalComp;
                    setUpcomingModalComp(null);
                    handleEnterLiveQuiz(comp);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#B6FF3B] px-5 py-2 text-xs font-bold text-[#07090D] hover:bg-[#c8ff66] transition-colors cursor-pointer shadow-md"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Enter Quiz Directly</span>
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="rounded-lg border border-[#00E5FF]/30 bg-[#00E5FF]/5 p-4 flex items-start gap-3">
            <Clock className="h-5 w-5 text-[#00E5FF] shrink-0 mt-0.5" />
            <div className="text-xs text-[#929DAC] leading-relaxed">
              <span className="font-bold text-[#F0F3F7]">
                Live Start Countdown:
              </span>{' '}
              This quiz is scheduled to go live at the configured timestamp. The quiz unlocks automatically when the countdown reaches zero.
            </div>
          </div>

          {upcomingModalComp && (
            <CountdownTimer
              targetStartTime={upcomingModalComp.startTime}
              onCountdownZero={() => {
                setIsModalUnlocked(true);
                if (upcomingModalComp) {
                  transitionCompetitionToLive(upcomingModalComp.id);
                }
              }}
              onEnterQuizNow={() => {
                const comp = upcomingModalComp;
                setUpcomingModalComp(null);
                handleEnterLiveQuiz(comp);
              }}
            />
          )}

          {upcomingModalComp?.description && (
            <div className="border-t border-[#252D38] pt-4">
              <h4 className="font-mono text-xs text-[#929DAC] uppercase">
                Tournament Briefing
              </h4>
              <p className="mt-1 text-xs text-[#F0F3F7] leading-relaxed">
                {upcomingModalComp.description}
              </p>
            </div>
          )}
        </div>
      </ModalDialog>
    </div>
  );
};
