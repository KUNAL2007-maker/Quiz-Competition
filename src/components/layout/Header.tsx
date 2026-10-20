import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  User,
  Trophy,
  Shield,
  X,
  KeyRound,
  LogIn,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Command Center Overview',
  '/competitions': 'Competitions Directory',
  '/quiz': 'Cybersecurity Quiz Competition',
  '/leaderboard': 'Live Leaderboard Ledger',
  '/profile': 'Operator Identity Dossier',
  '/login': 'Operator Identity & Authentication',
  '/admin': 'Admin Tournament & Quiz Console',
  '/about': 'About Aegis Cipher',
  '/privacy': 'Privacy Policy & Data Security',
};

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    globalSearchQuery,
    setGlobalSearchQuery,
    profile,
    competitions,
    currentUser,
    isAdmin,
    signInWithGoogle,
    signOutOperator,
  } = useAppContext();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const currentSectionTitle = ROUTE_TITLES[location.pathname] || 'Operations Terminal';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter real competitions if any exist; never generate fake search results
  const matchingCompetitions = globalSearchQuery.trim()
    ? competitions.filter((c) =>
        c.title.toLowerCase().includes(globalSearchQuery.toLowerCase())
      )
    : [];

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[#252D38] bg-[#0C1017]/95 px-4 md:px-8 backdrop-blur-xs">
      {/* Zone 1: Mobile Menu Trigger + Section Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden rounded-md p-2 text-[#929DAC] hover:bg-[#111722] hover:text-[#F0F3F7] focus-visible:outline-2 focus-visible:outline-[#B6FF3B] cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 truncate">
          <span className="font-display text-base font-semibold text-[#F0F3F7] truncate">
            {currentSectionTitle}
          </span>
        </div>
      </div>

      {/* Zone 2: Global Search Interface (without fake search results) */}
      <div ref={searchRef} className="relative flex-1 max-w-md hidden sm:block">
        <div className="relative flex items-center">
          <Search
            className="pointer-events-none absolute left-3 h-4 w-4 text-[#929DAC]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={globalSearchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setGlobalSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            placeholder="Query competitions or records..."
            aria-label="Global search"
            className="w-full rounded-md border border-[#252D38] bg-[#07090D] py-1.5 pl-9 pr-8 text-xs text-[#F0F3F7] placeholder-[#929DAC]/60 transition-colors focus:border-[#B6FF3B] focus:outline-none"
          />
          {globalSearchQuery && (
            <button
              type="button"
              onClick={() => setGlobalSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-2.5 text-[#929DAC] hover:text-[#F0F3F7] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Search Dropdown */}
        {isSearchOpen && globalSearchQuery.trim() !== '' && (
          <div className="absolute left-0 right-0 mt-2 rounded-lg border border-[#252D38] bg-[#111722] p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between text-[11px] font-mono text-[#929DAC]">
              <span>QUERY: "{globalSearchQuery.trim()}"</span>
              <span>{matchingCompetitions.length} RECORDS</span>
            </div>
            {matchingCompetitions.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-[#F0F3F7] font-medium">No matching records indexed</p>
                <p className="mt-1 text-xs text-[#929DAC]">
                  No competitions or leaderboard entries match your query in the current dataset.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#252D38]">
                {matchingCompetitions.map((comp) => (
                  <li key={comp.id} className="py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        navigate('/competitions');
                      }}
                      className="w-full text-left text-xs text-[#F0F3F7] hover:text-[#B6FF3B] cursor-pointer"
                    >
                      {comp.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Zone 3: Admin Badge, Sign In, Notifications & Operator Identity */}
      <div className="flex items-center gap-3 shrink-0">
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-[#B6FF3B]/60 bg-[#B6FF3B]/10 px-2.5 py-1.5 text-xs font-semibold text-[#B6FF3B] hover:bg-[#B6FF3B]/20 transition-colors cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Admin Console</span>
          </button>
        )}

        {!currentUser && (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#252D38] bg-[#111722] px-3 py-1.5 text-xs font-medium text-[#F0F3F7] hover:border-[#B6FF3B] hover:text-[#B6FF3B] transition-colors cursor-pointer"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </button>
        )}

        {/* Notifications Menu */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setIsNotifOpen((prev) => !prev);
              setIsProfileOpen(false);
            }}
            aria-label="Notifications"
            aria-expanded={isNotifOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#252D38] bg-[#111722] text-[#929DAC] transition-colors hover:border-[#929DAC]/50 hover:text-[#F0F3F7] focus-visible:outline-2 focus-visible:outline-[#B6FF3B] cursor-pointer"
          >
            <Bell className="h-4 w-4" />
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-[#252D38] bg-[#111722] p-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#252D38] pb-2.5">
                <span className="font-display text-xs font-semibold text-[#F0F3F7]">
                  Dispatches & Alerts
                </span>
                <span className="font-mono text-[11px] text-[#929DAC]">0 UNREAD</span>
              </div>
              <div className="py-6 text-center">
                <p className="text-xs font-medium text-[#F0F3F7]">No active security dispatches</p>
                <p className="mt-1 text-xs text-[#929DAC]">
                  Tournament announcements and round transitions will appear here once an event is scheduled.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(false);
                    navigate('/profile');
                  }}
                  className="mt-4 inline-flex items-center text-xs font-medium text-[#B6FF3B] hover:underline cursor-pointer"
                >
                  View operator dossier
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Operator Profile Menu (Neutral Avatar Placeholder, not a fake person) */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setIsProfileOpen((prev) => !prev);
              setIsNotifOpen(false);
            }}
            aria-label="Operator profile menu"
            aria-expanded={isProfileOpen}
            className="flex items-center gap-2.5 rounded-md border border-[#252D38] bg-[#111722] px-2.5 py-1.5 text-xs font-medium text-[#F0F3F7] transition-colors hover:border-[#929DAC]/50 focus-visible:outline-2 focus-visible:outline-[#B6FF3B] cursor-pointer"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#07090D] border border-[#252D38] text-[#B6FF3B]">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <span className="hidden md:inline font-mono text-xs text-[#F0F3F7] max-w-[120px] truncate">
              {profile.username ? `@${profile.username}` : 'Unassigned Operator'}
            </span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 sm:w-60 max-w-[calc(100vw-2rem)] rounded-lg border border-[#252D38] bg-[#111722] p-2 shadow-2xl">
              <div className="border-b border-[#252D38] px-3 py-2.5">
                <p className="text-xs font-semibold text-[#F0F3F7] truncate">
                  {profile.displayName || 'Unassigned Operator'}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-[#929DAC] truncate">
                  {profile.username ? `@${profile.username}` : 'Identity not configured'}
                </p>
              </div>

              <div className="py-1">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/admin');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-semibold text-[#B6FF3B] hover:bg-[#0C1017] cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-[#B6FF3B]" />
                    <span>Admin Console</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/profile');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs text-[#F0F3F7] hover:bg-[#0C1017] hover:text-[#B6FF3B] cursor-pointer"
                >
                  <Shield className="h-3.5 w-3.5 text-[#929DAC]" />
                  <span>Operator Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/leaderboard');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs text-[#F0F3F7] hover:bg-[#0C1017] hover:text-[#B6FF3B] cursor-pointer"
                >
                  <Trophy className="h-3.5 w-3.5 text-[#929DAC]" />
                  <span>Leaderboard Standings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/login');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs text-[#F0F3F7] hover:bg-[#0C1017] hover:text-[#B6FF3B] cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5 text-[#929DAC]" />
                  <span>Account & Authentication</span>
                </button>
              </div>

              <div className="border-t border-[#252D38] pt-1 mt-1">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      signOutOperator();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs text-[#FF365B] hover:bg-[#0C1017] cursor-pointer"
                  >
                    <span>Sign Out ({currentUser.email || 'Operator'})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/login');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-semibold text-[#B6FF3B] hover:bg-[#0C1017] cursor-pointer"
                  >
                    <span>Sign In with Google</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
