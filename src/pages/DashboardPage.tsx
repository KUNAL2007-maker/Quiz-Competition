import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Trophy,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { EmptyStateBlock } from '../components/ui/EmptyStateBlock';
import { CompetitionCard } from '../components/competition/CompetitionCard';
import { NullSymbol3D } from '../components/home/NullSymbol3D';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    competitions,
    results,
    leaderboard,
    quizSession,
    currentUser,
    profile,
    selectCompetition,
    addToast,
  } = useAppContext();

  // Completed competition IDs for current user
  const completedCompetitionIds = useMemo(() => {
    const ids = new Set<string>();
    results.forEach((r) => {
      if (r.competitionId) ids.add(r.competitionId);
    });
    leaderboard.forEach((l) => {
      if (l.isCurrentUser) {
        if (l.competitionId) ids.add(l.competitionId);
        if (currentUser && l.participantId.startsWith(`${currentUser.uid}_`)) {
          const compId = l.participantId.replace(`${currentUser.uid}_`, '');
          if (compId) ids.add(compId);
        }
      }
    });
    if (quizSession?.isSubmitted && quizSession?.competitionId) {
      ids.add(quizSession.competitionId);
    }
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
        // ignore
      }
    }
    return ids;
  }, [currentUser, results, leaderboard, quizSession?.isSubmitted, quizSession?.competitionId]);

  const quickNavLinks = [
    {
      title: 'Browse Competitions',
      subtitle: 'Inspect upcoming and active quiz tournaments',
      icon: ShieldAlert,
      path: '/competitions',
      code: 'DIR · 01',
    },
    {
      title: 'Open Leaderboard',
      subtitle: 'Monitor tournament ranking ledger and standings',
      icon: Trophy,
      path: '/leaderboard',
      code: 'RNK · 02',
    },
    {
      title: 'View Profile',
      subtitle: 'Manage local operator callsign and identity dossier',
      icon: UserCheck,
      path: '/profile',
      code: 'OPR · 03',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Main Cinematic Welcome Banner */}
      <section className="relative overflow-hidden rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-6 md:p-10">
        {/* 3D Null Origin Symbol Accent */}
        <div
          className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 flex items-center justify-center md:justify-end pr-0 md:pr-4 pointer-events-none md:pointer-events-auto overflow-hidden"
          aria-hidden="true"
        >
          {/* Subtle Technical HUD Reticle centered behind 3D symbol */}
          <div className="pointer-events-none absolute w-[400px] h-[350px] flex items-center justify-center opacity-10 hidden lg:flex">
            <svg className="h-64 w-64 text-[#8dc63f]" viewBox="0 0 240 240" fill="none">
              <circle cx="120" cy="120" r="105" stroke="currentColor" strokeWidth="1" strokeDasharray="6 6" />
              <circle cx="120" cy="120" r="75" stroke="currentColor" strokeWidth="0.75" />
              <polygon points="120,30 200,75 200,165 120,210 40,165 40,75" stroke="currentColor" strokeWidth="0.75" />
            </svg>
          </div>

          <NullSymbol3D className="w-full md:w-[400px] h-64 md:h-[350px]" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <p className="font-mono text-xs tracking-widest text-[#8dc63f]">
            GLOBAL COMPETITIVE QUIZ TOURNAMENT NETWORK
          </p>

          <h1 className="mt-3 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#f5f5f2]">
            ENTER THE ARENA
          </h1>

          <p className="mt-4 text-sm sm:text-base text-[#a8a8a2] leading-relaxed">
            Compete in real-time quiz tournaments and skill competitions across technology, science, cybersecurity, and specialized arenas. Challenge peers on the live leaderboard, earn verified certificates, and test your speed.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/competitions')}
              className="inline-flex items-center gap-2 rounded-md bg-[#8dc63f] px-5 py-2.5 text-xs font-semibold text-[#141a09] transition-colors hover:bg-[#a4d65e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8dc63f] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Browse Competitions</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/leaderboard')}
              className="inline-flex items-center gap-2 rounded-md border border-[#2e2e2a] bg-[#1b1b19] px-4 py-2.5 text-xs font-medium text-[#f5f5f2] transition-colors hover:border-[#a8a8a2]/60 hover:bg-[#161E2C] focus-visible:outline-2 focus-visible:outline-[#8dc63f] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trophy className="h-4 w-4 text-[#a8a8a2]" aria-hidden="true" />
              <span>Live Standings Ledger</span>
            </button>
          </div>
        </div>
      </section>

      {/* Quick Navigation Shortcuts */}
      <section aria-labelledby="quick-navigation-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="quick-navigation-heading" className="font-display text-base sm:text-lg font-semibold text-[#f5f5f2]">
            01. Quick Command Shortcuts
          </h2>
          <span className="font-mono text-xs text-[#a8a8a2] whitespace-nowrap shrink-0">DIRECT ACCESS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickNavLinks.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className="group flex flex-col justify-between rounded-lg border border-[#2e2e2a] bg-[#1b1b19] p-5 text-left transition-colors hover:border-[#7ab32e]/60 focus-visible:outline-2 focus-visible:outline-[#8dc63f] cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#a8a8a2]">
                      {item.code}
                    </span>
                    <Icon
                      className="h-4 w-4 text-[#a8a8a2] transition-colors group-hover:text-[#8dc63f]"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-3 font-display text-base font-semibold text-[#f5f5f2] group-hover:text-[#8dc63f] transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-[#a8a8a2] leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-1.5 font-mono text-xs text-[#8dc63f]">
                  <span>Open Section</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Competition Overview (Full Width) */}
      <section className="space-y-4" aria-labelledby="comp-overview-heading">
        <div className="flex items-center justify-between">
          <h2 id="comp-overview-heading" className="font-display text-lg font-semibold text-[#f5f5f2]">
            02. Active Competition Overview
          </h2>
          <button
            type="button"
            onClick={() => navigate('/competitions')}
            className="text-xs font-medium text-[#8dc63f] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            View Directory
          </button>
        </div>

        {competitions.length === 0 ? (
          <EmptyStateBlock
            icon={ShieldAlert}
            visualType="radar"
            codeLabel="DIRECTORY · NO ACTIVE TOURNAMENTS"
            title="No Competition Information Available"
            description="There are currently no scheduled or active competitions connected to your session. When tournament rounds are published, their entry criteria, rules, and countdown schedules will appear here."
            actionLabel="Explore Competitions Page"
            onAction={() => navigate('/competitions')}
            secondaryActionLabel="Live Rankings"
            onSecondaryAction={() => navigate('/leaderboard')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.map((comp) => (
              <CompetitionCard
                key={comp.id}
                competition={comp}
                isCompleted={completedCompetitionIds.has(comp.id)}
                onSelect={(selected) => {
                  const isPractice = selected.title.toLowerCase().includes('practice');
                  const isEnded = !isPractice && (
                    selected.status === 'completed' ||
                    selected.id === 'comp_1793963656835' ||
                    (selected.endTime && new Date(selected.endTime).getTime() <= Date.now())
                  );
                  if (isEnded) {
                    navigate(`/standings/${selected.id}`);
                    return;
                  }
                  if (!isPractice && completedCompetitionIds.has(selected.id)) {
                    selectCompetition(selected);
                    navigate('/quiz');
                    return;
                  }

                  const isLive =
                    selected.status === 'live' ||
                    (selected.startTime &&
                      new Date(selected.startTime).getTime() <= Date.now() &&
                      selected.status !== 'completed');

                  if (isLive) {
                    if (!currentUser) {
                      navigate('/login?redirect=/quiz');
                      return;
                    }
                    if (!profile.isProfileComplete) {
                      addToast(
                        'Profile 100% Completion Required',
                        'You must complete your profile with Full Name and WhatsApp number before entering any quiz.',
                        'alert'
                      );
                      navigate('/profile?required=1');
                      return;
                    }
                    selectCompetition(selected);
                    navigate('/quiz');
                  } else {
                    // Navigate to competitions directory where the live countdown timer is shown
                    navigate('/competitions');
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
