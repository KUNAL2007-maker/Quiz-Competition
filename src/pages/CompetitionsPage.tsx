import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldAlert, X, Clock, Play, Lock } from 'lucide-react';
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
    quizSession,
    currentUser,
    profile,
    isAdmin,
    selectCompetition,
    resetQuizSession,
    transitionCompetitionToLive,
    addToast,
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [upcomingModalComp, setUpcomingModalComp] = useState<Competition | null>(null);
  const [isModalUnlocked, setIsModalUnlocked] = useState(false);

  // Set of competition IDs the current user has already completed (Requirement 4)
  const completedCompetitionIds = useMemo(() => {
    const ids = new Set<string>();
    // 1. From results state
    results.forEach((r) => {
      if (r.competitionId) ids.add(r.competitionId);
    });
    // 2. From leaderboard entries
    leaderboard.forEach((l) => {
      if (l.isCurrentUser) {
        if (l.competitionId) ids.add(l.competitionId);
        if (currentUser && l.participantId.startsWith(`${currentUser.uid}_`)) {
          const compId = l.participantId.replace(`${currentUser.uid}_`, '');
          if (compId) ids.add(compId);
        }
      }
    });
    // 3. From active quizSession if submitted
    if (quizSession?.isSubmitted && quizSession?.competitionId) {
      ids.add(quizSession.competitionId);
    }
    // 4. From local storage cache
    if (typeof window !== 'undefined' && currentUser) {
      try {
        const prefix = `completed_comp_${currentUser.uid}_`;
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            ids.add(key.replace(prefix, ''));
          }
        }
      } catch {
        // Ignore local storage read errors
      }
    }
    // Do not include practice quiz in lockout - practice simulation is open for repeatable training
    const practiceCompIds = new Set(
      competitions.filter((c) => c.title.toLowerCase().includes('practice')).map((c) => c.id)
    );
    practiceCompIds.forEach((pId) => ids.delete(pId));
    return ids;
  }, [competitions, currentUser, results, leaderboard, quizSession?.isSubmitted, quizSession?.competitionId]);

  // Display only real, active competitions from Firestore
  const allDisplayCompetitions = competitions;

  const statusTabs: Array<{ id: StatusFilter; label: string; count: number }> = useMemo(() => {
    const allCount = allDisplayCompetitions.length;
    const upcomingCount = allDisplayCompetitions.filter(
      (c) =>
        c.status === 'upcoming' &&
        (!c.startTime || new Date(c.startTime).getTime() > Date.now()) &&
        !completedCompetitionIds.has(c.id)
    ).length;
    const liveCount = allDisplayCompetitions.filter((c) => {
      const isLive =
        c.status === 'live' ||
        (c.startTime &&
          new Date(c.startTime).getTime() <= Date.now() &&
          c.status !== 'completed');
      return isLive;
    }).length;
    const completedCount = allDisplayCompetitions.filter(
      (c) => c.status === 'completed' || completedCompetitionIds.has(c.id)
    ).length;

    return [
      { id: 'all', label: 'All', count: allCount },
      { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
      { id: 'live', label: 'Live', count: liveCount },
      { id: 'completed', label: 'Completed', count: completedCount },
    ];
  }, [allDisplayCompetitions, completedCompetitionIds]);

  const filteredCompetitions = useMemo(() => {
    return allDisplayCompetitions.filter((comp) => {
      if (statusFilter === 'completed') {
        const isCompletedByUser = completedCompetitionIds.has(comp.id);
        const isCompletedGlobally = comp.status === 'completed';
        if (!isCompletedByUser && !isCompletedGlobally) {
          return false;
        }
      } else if (statusFilter === 'live') {
        const isLive =
          comp.status === 'live' ||
          (comp.startTime &&
            new Date(comp.startTime).getTime() <= Date.now() &&
            comp.status !== 'completed');
        if (!isLive) {
          return false;
        }
      } else if (statusFilter === 'upcoming') {
        const isUpcoming =
          comp.status === 'upcoming' &&
          (!comp.startTime || new Date(comp.startTime).getTime() > Date.now()) &&
          !completedCompetitionIds.has(comp.id);
        if (!isUpcoming) {
          return false;
        }
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
  }, [allDisplayCompetitions, statusFilter, searchQuery, completedCompetitionIds]);

  const hasActiveFilters =
    statusFilter !== 'all' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
  };

  const handleEnterLiveQuiz = useCallback(
    (comp: Competition) => {
      if (!currentUser) {
        navigate('/login?redirect=/quiz');
        return;
      }
      if (!isAdmin && !profile.isProfileComplete) {
        addToast(
          'Profile 100% Completion Required',
          'You must complete your profile (Full Legal Name & WhatsApp contact number) before entering any quiz.',
          'alert'
        );
        navigate('/profile?required=1');
        return;
      }
      resetQuizSession();
      selectCompetition(comp);
      navigate('/quiz');
    },
    [currentUser, profile.isProfileComplete, selectCompetition, resetQuizSession, navigate, addToast, isAdmin]
  );

  const handleSelectCompetition = useCallback(
    (comp: Competition) => {
      const isPractice = comp.title.toLowerCase().includes('practice');
      // 1. If already completed attempt (for official competitions only, bypass for admin or live mode)
      if (!isPractice && !isAdmin && comp.status !== 'live' && completedCompetitionIds.has(comp.id)) {
        navigate('/leaderboard');
        return;
      }

      // 2. Check if live now OR admin testing mode
      const isLive =
        isAdmin ||
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
    [completedCompetitionIds, handleEnterLiveQuiz, navigate, isAdmin]
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
                className={`rounded px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#B6FF3B] text-[#07090D] font-semibold'
                    : 'text-[#929DAC] hover:text-[#F0F3F7]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded px-1.5 py-0.2 font-mono text-[10px] ${
                    active
                      ? 'bg-[#07090D] text-[#B6FF3B] font-bold'
                      : 'bg-[#111722] text-[#929DAC] border border-[#252D38]'
                  }`}
                >
                  {tab.count}
                </span>
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
        </div>
      </div>

      {/* Competitions Content Grid or Empty State */}
      {filteredCompetitions.length === 0 ? (
        <EmptyStateBlock
          icon={ShieldAlert}
          visualType="radar"
          codeLabel={
            statusFilter === 'completed'
              ? 'HISTORY · NO COMPLETED QUIZZES'
              : hasActiveFilters
              ? `FILTERED VIEW · ${statusFilter.toUpperCase()}`
              : 'COMPETITION REGISTRY · EMPTY'
          }
          title={
            statusFilter === 'completed'
              ? 'No Completed Competitions Found'
              : hasActiveFilters
              ? 'No Competitions Match Current Filter Criteria'
              : 'No Competitions Available'
          }
          description={
            statusFilter === 'completed'
              ? 'You have not submitted any quiz competitions yet or no records match your search criteria. Take an active competition to earn a permanent tournament ranking.'
              : hasActiveFilters
              ? 'No competition records match your selected status, clearance filter, or search query. Clear active filters to view all scheduled events.'
              : 'The tournament directory currently contains no scheduled, live, or completed competitions. Competitions will appear here once registered by event operations.'
          }
          actionLabel={
            statusFilter === 'completed'
              ? 'View Live Competitions'
              : hasActiveFilters
              ? 'Reset Active Filters'
              : 'View Leaderboard'
          }
          onAction={
            statusFilter === 'completed'
              ? () => setStatusFilter('live')
              : hasActiveFilters
              ? handleResetFilters
              : () => navigate('/leaderboard')
          }
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
              onEnterDirectly={handleEnterLiveQuiz}
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

              {isAdmin && upcomingModalComp && !isModalUnlocked && (
                <button
                  type="button"
                  onClick={() => {
                    const comp = upcomingModalComp;
                    setUpcomingModalComp(null);
                    handleEnterLiveQuiz(comp);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#B6FF3B] px-4 py-2 text-xs font-bold text-[#07090D] hover:bg-[#c8ff66] transition-colors cursor-pointer shadow-md"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Enter Quiz (Admin Test Mode)</span>
                </button>
              )}

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
