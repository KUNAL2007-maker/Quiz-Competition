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

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    competitions,
    results,
    leaderboard,
    currentUser,
    profile,
    selectCompetition,
    addToast,
  } = useAppContext();

  // Completed competition IDs for current user
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

  const quickNavLinks = [
    {
      title: 'Browse Competitions',
      subtitle: 'Inspect upcoming and active security tournaments',
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
      <section className="relative overflow-hidden rounded-lg border border-[#252D38] bg-[#0C1017] p-6 md:p-10">
        {/* Technical SVG Background Accent */}
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-1/2 opacity-15 hidden md:flex items-center justify-end pr-8"
          aria-hidden="true"
        >
          <svg className="h-64 w-64 text-[#B6FF3B]" viewBox="0 0 240 240" fill="none">
            <circle cx="120" cy="120" r="105" stroke="currentColor" strokeWidth="1" strokeDasharray="6 6" />
            <circle cx="120" cy="120" r="75" stroke="currentColor" strokeWidth="1" />
            <polygon points="120,30 200,75 200,165 120,210 40,165 40,75" stroke="currentColor" strokeWidth="1" />
            <line x1="120" y1="0" x2="120" y2="240" stroke="currentColor" strokeWidth="0.75" />
            <line x1="0" y1="120" x2="240" y2="120" stroke="currentColor" strokeWidth="0.75" />
          </svg>
        </div>

        <div className="relative z-10 max-w-2xl">
          <p className="font-mono text-xs tracking-widest text-[#B6FF3B]">
            RESTRICTED TOURNAMENT COMMAND NETWORK
          </p>

          <h1 className="mt-3 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F0F3F7]">
            ENTER THE NETWORK
          </h1>

          <p className="mt-4 text-sm sm:text-base text-[#929DAC] leading-relaxed">
            Compete in timed cybersecurity quiz tournaments, cryptography challenges, and digital forensics evaluations. Enter live competitions directly, monitor the ranking ledger, and manage your operator profile.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/competitions')}
              className="inline-flex items-center gap-2 rounded-md bg-[#B6FF3B] px-5 py-2.5 text-xs font-semibold text-[#07090D] transition-colors hover:bg-[#c8ff66] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B6FF3B] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Browse Competitions</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/leaderboard')}
              className="inline-flex items-center gap-2 rounded-md border border-[#252D38] bg-[#111722] px-4 py-2.5 text-xs font-medium text-[#F0F3F7] transition-colors hover:border-[#929DAC]/60 hover:bg-[#161E2C] focus-visible:outline-2 focus-visible:outline-[#B6FF3B] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trophy className="h-4 w-4 text-[#929DAC]" aria-hidden="true" />
              <span>Live Standings Ledger</span>
            </button>
          </div>
        </div>
      </section>

      {/* Quick Navigation Shortcuts */}
      <section aria-labelledby="quick-navigation-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="quick-navigation-heading" className="font-display text-base sm:text-lg font-semibold text-[#F0F3F7]">
            01. Quick Command Shortcuts
          </h2>
          <span className="font-mono text-xs text-[#929DAC] whitespace-nowrap shrink-0">DIRECT ACCESS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickNavLinks.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className="group flex flex-col justify-between rounded-lg border border-[#252D38] bg-[#111722] p-5 text-left transition-colors hover:border-[#B6FF3B]/60 focus-visible:outline-2 focus-visible:outline-[#B6FF3B] cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#929DAC]">
                      {item.code}
                    </span>
                    <Icon
                      className="h-4 w-4 text-[#929DAC] transition-colors group-hover:text-[#B6FF3B]"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-3 font-display text-base font-semibold text-[#F0F3F7] group-hover:text-[#B6FF3B] transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-[#929DAC] leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-1.5 font-mono text-xs text-[#B6FF3B]">
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
          <h2 id="comp-overview-heading" className="font-display text-lg font-semibold text-[#F0F3F7]">
            02. Active Competition Overview
          </h2>
          <button
            type="button"
            onClick={() => navigate('/competitions')}
            className="text-xs font-medium text-[#B6FF3B] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
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
            description="There are currently no scheduled or active cybersecurity competitions connected to your session. When tournament rounds are published, their entry criteria, rules, and countdown schedules will appear here."
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
                  if (completedCompetitionIds.has(selected.id)) {
                    navigate('/leaderboard');
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
