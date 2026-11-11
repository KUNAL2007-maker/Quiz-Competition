import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldAlert, X, Clock, Play, Lock, Trophy } from 'lucide-react';
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
  const [concludedModalComp, setConcludedModalComp] = useState<Competition | null>(null);
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
    // 3. From local storage cache (UID and Email)
    if (typeof window !== 'undefined') {
      try {
        if (currentUser) {
          const prefix = `completed_comp_${currentUser.uid}_`;
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && key.startsWith(prefix)) {
              ids.add(key.replace(prefix, ''));
            }
          }
        }
        if (currentUser?.email) {
          const cleanEmail = currentUser.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
          const emailPrefix = `completed_email_${cleanEmail}_`;
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && key.startsWith(emailPrefix)) {
              ids.add(key.replace(emailPrefix, ''));
            }
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
    // A competition that has not started yet cannot have been completed in this run.
    // Ignore stale completed flags (left by test attempts) for upcoming competitions,
    // so the countdown and the Upcoming filter stay correct.
    const upcomingCompIds = new Set(
      competitions
        .filter(
          (c) =>
            c.status === 'upcoming' &&
            (!c.startTime || new Date(c.startTime).getTime() > Date.now())
        )
        .map((c) => c.id)
    );
    upcomingCompIds.forEach((uId) => ids.delete(uId));
    return ids;
  }, [competitions, currentUser, results, leaderboard, quizSession?.isSubmitted, quizSession?.competitionId]);

  // Display only real, active competitions from Firestore
  const allDisplayCompetitions = competitions;

  const statusTabs: Array<{ id: StatusFilter; label: string; count: number }> = useMemo(() => {
    const allCount = allDisplayCompetitions.length;
    const upcomingCount = allDisplayCompetitions.filter((c) => {
      const isEnded = !c.title.toLowerCase().includes('practice') && (
        c.status === 'completed' || (c.endTime && new Date(c.endTime).getTime() <= Date.now())
      );
      return (
        !isEnded &&
        c.status === 'upcoming' &&
        (!c.startTime || new Date(c.startTime).getTime() > Date.now()) &&
        !completedCompetitionIds.has(c.id)
      );
    }).length;
    const liveCount = allDisplayCompetitions.filter((c) => {
      const isEnded = !c.title.toLowerCase().includes('practice') && (
        c.status === 'completed' || (c.endTime && new Date(c.endTime).getTime() <= Date.now())
      );
      return (
        !isEnded &&
        (c.status === 'live' ||
          (c.startTime &&
            new Date(c.startTime).getTime() <= Date.now() &&
            c.status !== 'completed'))
      );
    }).length;
    const completedCount = allDisplayCompetitions.filter((c) => {
      const isEnded = !c.title.toLowerCase().includes('practice') && (
        c.status === 'completed' || (c.endTime && new Date(c.endTime).getTime() <= Date.now())
      );
      return isEnded || c.status === 'completed' || completedCompetitionIds.has(c.id);
    }).length;

    return [
      { id: 'all', label: 'All', count: allCount },
      { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
      { id: 'live', label: 'Live', count: liveCount },
      { id: 'completed', label: 'Completed', count: completedCount },
    ];
  }, [allDisplayCompetitions, completedCompetitionIds]);

  const filteredCompetitions = useMemo(() => {
    return allDisplayCompetitions.filter((comp) => {
      const isEnded = !comp.title.toLowerCase().includes('practice') && (
        comp.status === 'completed' || (comp.endTime && new Date(comp.endTime).getTime() <= Date.now())
      );
      if (statusFilter === 'completed') {
        const isCompletedByUser = completedCompetitionIds.has(comp.id);
        if (!isCompletedByUser && !isEnded && comp.status !== 'completed') {
          return false;
        }
      } else if (statusFilter === 'live') {
        if (isEnded) return false;
        const isLive =
          comp.status === 'live' ||
          (comp.startTime &&
            new Date(comp.startTime).getTime() <= Date.now() &&
            comp.status !== 'completed');
        if (!isLive) {
          return false;
        }
      } else if (statusFilter === 'upcoming') {
        if (isEnded) return false;
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
      // Mandatory Profile Completion check must always precede quiz entry
      if (!isAdmin && !profile.isProfileComplete) {
        addToast(
          'Profile 100% Completion Required',
          'You must complete your profile (Full Legal Name & WhatsApp contact number) before entering any quiz.',
          'alert'
        );
        navigate('/profile?required=1');
        return;
      }
      const isPractice = comp.title.toLowerCase().includes('practice');
      // Strictly one attempt: if already completed, navigate to locked view
      if (!isPractice && completedCompetitionIds.has(comp.id)) {
        selectCompetition(comp);
        navigate('/quiz');
        return;
      }
      resetQuizSession();
      selectCompetition(comp);
      navigate('/quiz');
    },
    [currentUser, profile.isProfileComplete, selectCompetition, resetQuizSession, navigate, addToast, isAdmin, completedCompetitionIds]
  );

  const handleSelectCompetition = useCallback(
    (comp: Competition) => {
      const isPractice = comp.title.toLowerCase().includes('practice');
      const isEnded = !isPractice && (
        comp.status === 'completed' || (comp.endTime && new Date(comp.endTime).getTime() <= Date.now())
      );

      // 1. If tournament ended, navigate directly to its archived leaderboard & standings
      if (isEnded) {
        navigate(`/standings/${comp.id}`);
        return;
      }

      // 2. Mandatory Profile Completion check must always precede quiz entry
      if (!isAdmin && !profile.isProfileComplete) {
        addToast(
          'Profile 100% Completion Required',
          'You must complete your profile (Full Legal Name & WhatsApp contact number) before entering any quiz.',
          'alert'
        );
        navigate('/profile?required=1');
        return;
      }

      // 3. Strictly ONE attempt only: once completed, navigate to /quiz (shows locked attempt card with View Live Leaderboard button)
      if (!isPractice && completedCompetitionIds.has(comp.id)) {
        selectCompetition(comp);
        navigate('/quiz');
        return;
      }

      // 4. Check if live now OR admin testing mode
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

      // 5. If upcoming (strictly future start time and not ended), show countdown modal
      if (comp.startTime && new Date(comp.startTime).getTime() > Date.now()) {
        setIsModalUnlocked(false);
        setUpcomingModalComp(comp);
      }
    },
    [completedCompetitionIds, handleEnterLiveQuiz, selectCompetition, navigate, isAdmin, profile.isProfileComplete, addToast]
  );

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2e2e2a] pb-6">
        <div>
          <p className="font-mono text-xs tracking-wider text-[#8dc63f]">
            OPERATIONAL TOURNAMENTS
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#f5f5f2]">
            Competitions Directory
          </h1>
          <p className="mt-2 text-sm text-[#a8a8a2] max-w-2xl">
            Select an active quiz to enter directly, or inspect scheduled start timers for upcoming tournament rounds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/leaderboard')}
            className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-4 py-2 text-xs font-medium text-[#f5f5f2] hover:border-[#7ab32e] hover:text-[#8dc63f] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Live Rankings Ledger
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-4">
        {/* Status Segmented Filter Tabs */}
        <div
          role="group"
          aria-label="Filter competitions by status"
          className="flex flex-wrap items-center gap-1 rounded-md bg-[#111110] p-1 border border-[#2e2e2a]"
        >
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded px-3.5 py-2.5 min-h-11 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#8dc63f] text-[#141a09] font-semibold'
                    : 'text-[#a8a8a2] hover:text-[#f5f5f2]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded px-1.5 py-0.2 font-mono text-[10px] ${
                    active
                      ? 'bg-[#111110] text-[#8dc63f] font-bold'
                      : 'bg-[#1b1b19] text-[#a8a8a2] border border-[#2e2e2a]'
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
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8a8a2]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search competition title..."
              aria-label="Search competitions"
              className="w-full rounded-md border border-[#2e2e2a] bg-[#111110] py-1.5 pl-9 pr-8 text-xs text-[#f5f5f2] placeholder-[#a8a8a2]/60 focus:border-[#7ab32e] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a8a8a2] hover:text-[#f5f5f2] cursor-pointer"
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
              : 'The tournament directory currently contains no scheduled, live, or completed competitions. Competitions will appear here once announced by event operations.'
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
        }${
          upcomingModalComp?.endTime
            ? `  •  Ends: ${new Date(upcomingModalComp.endTime).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : ''
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
                className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-4 py-2 text-xs font-medium text-[#a8a8a2] hover:text-[#f5f5f2] cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#8dc63f] px-4 py-2 text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer shadow-md"
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
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#8dc63f] px-5 py-2 text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer shadow-md"
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
            <div className="text-xs text-[#a8a8a2] leading-relaxed">
              <span className="font-bold text-[#f5f5f2]">
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
            <div className="border-t border-[#2e2e2a] pt-4">
              <h4 className="font-mono text-xs text-[#a8a8a2] uppercase">
                Tournament Briefing
              </h4>
              <p className="mt-1 text-xs text-[#f5f5f2] leading-relaxed">
                {upcomingModalComp.description}
              </p>
            </div>
          )}
        </div>
      </ModalDialog>

      {/* Concluded Competition Dialog */}
      <ModalDialog
        isOpen={Boolean(concludedModalComp)}
        onClose={() => setConcludedModalComp(null)}
        title={concludedModalComp?.title || 'Tournament Concluded'}
        subtitle={"Ended: " + (concludedModalComp?.endTime ? new Date(concludedModalComp.endTime).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '5:00 PM IST')}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setConcludedModalComp(null)}
              className="rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-4 py-2 text-xs font-medium text-[#a8a8a2] hover:text-[#f5f5f2] cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                const targetId = concludedModalComp?.id || 'comp_1793963656835';
                setConcludedModalComp(null);
                navigate(`/standings/${targetId}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#8dc63f] px-5 py-2 text-xs font-bold text-[#141a09] hover:bg-[#a4d65e] transition-colors cursor-pointer shadow-md"
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>View Leaderboard & Winners</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#a4d65e]/30 bg-[#a4d65e]/10 text-[#a4d65e] shadow-lg shadow-[#8dc63f]/5">
            <Trophy className="h-7 w-7 text-[#8dc63f]" />
          </div>
          <div className="space-y-2">
            <span className="rounded bg-[#2e2e2a] px-3 py-1 font-mono text-[11px] font-bold text-[#a4d65e] tracking-wider uppercase">
              Tournament Concluded
            </span>
            <h3 className="text-xl font-display font-bold text-[#f5f5f2]">
              {concludedModalComp?.title || 'Cyber Quiz 2026'}
            </h3>
            <p className="text-xs text-[#a8a8a2] leading-relaxed max-w-md mx-auto pt-1">
              The competition window closed at{' '}
              <span className="font-mono text-[#f5f5f2] font-semibold">
                {concludedModalComp?.endTime
                  ? new Date(concludedModalComp.endTime).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '5:00 PM IST'}
              </span>
              . Test access is now locked. All verified scores, accuracy, and podium rankings are published on the live leaderboard.
            </p>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
};
