import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  Trophy,
  UserCheck,
  LogIn,
  KeyRound,
  X,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.FC<{ className?: string }>;
  group: 'primary' | 'operator' | 'admin';
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { currentUser, isAdmin } = useAppContext();

  const navItems: NavItem[] = [
    { label: 'Overview', to: '/', icon: LayoutDashboard, group: 'primary' },
    { label: 'Competitions', to: '/competitions', icon: ShieldAlert, group: 'primary' },
    { label: 'Live Rankings', to: '/leaderboard', icon: Trophy, group: 'primary' },
    { label: 'My Profile', to: '/profile', icon: UserCheck, group: 'operator' },
    {
      label: currentUser ? 'Operator Account' : 'Sign In',
      to: '/login',
      icon: LogIn,
      group: 'operator',
    },
    ...(isAdmin
      ? [
          {
            label: 'Admin Console',
            to: '/admin',
            icon: KeyRound,
            group: 'admin' as const,
          },
        ]
      : []),
  ];

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon;
    const isSpecialAdmin = item.group === 'admin';
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/'}
        onClick={onCloseMobile}
        className={({ isActive }) =>
          `group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            isActive
              ? isSpecialAdmin
                ? 'bg-[#8dc63f]/10 text-[#8dc63f] border border-[#7ab32e]/50'
                : 'bg-[#1b1b19] text-[#8dc63f] border border-[#2e2e2a]'
              : isSpecialAdmin
              ? 'text-[#8dc63f]/90 hover:bg-[#1b1b19]/80 hover:text-[#8dc63f] border border-transparent'
              : 'text-[#a8a8a2] hover:bg-[#1b1b19]/60 hover:text-[#f5f5f2] border border-transparent'
          }`
        }
      >
        <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" aria-hidden="true" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#1b1b19] border-r border-[#2e2e2a] w-64 select-none">
      <div>
        {/* Brand Identity Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-[#2e2e2a]">
          <NavLink
            to="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-[#f5f5f2] font-display whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#8dc63f]"
          >
            <svg className="h-5 w-5 text-[#8dc63f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
              <line x1="12" y1="22" x2="12" y2="15.5" />
              <polyline points="22 8.5 12 15.5 2 8.5" />
            </svg>
            <span>NULL ORIGIN</span>
          </NavLink>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden rounded-md p-1.5 text-[#a8a8a2] hover:bg-[#1b1b19] hover:text-[#f5f5f2] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav aria-label="Main Navigation" className="p-4 space-y-6">
          {isAdmin && (
            <div>
              <p className="px-3 mb-2 font-mono text-[11px] font-semibold text-[#8dc63f] tracking-wider">
                ADMINISTRATION
              </p>
              <div className="space-y-1">
                {navItems.filter((i) => i.group === 'admin').map(renderNavLink)}
              </div>
            </div>
          )}

          <div>
            <p className="px-3 mb-2 font-mono text-[11px] font-medium text-[#a8a8a2]/70">
              Command Network
            </p>
            <div className="space-y-1">
              {navItems.filter((i) => i.group === 'primary').map(renderNavLink)}
            </div>
          </div>


          <div>
            <p className="px-3 mb-2 font-mono text-[11px] font-medium text-[#a8a8a2]/70">
              Operator Dossier
            </p>
            <div className="space-y-1">
              {navItems.filter((i) => i.group === 'operator').map(renderNavLink)}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0">
        <div className="fixed inset-y-0 left-0 z-30 w-64">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#111110]/80 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 flex w-64 max-w-xs flex-1">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
