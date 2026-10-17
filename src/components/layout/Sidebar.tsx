import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  Clock,
  Terminal,
  Trophy,
  UserCheck,
  BarChart3,
  Sliders,
  X,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.FC<{ className?: string }>;
  group: 'primary' | 'arena' | 'operator';
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', to: '/', icon: LayoutDashboard, group: 'primary' },
  { label: 'Competitions', to: '/competitions', icon: ShieldAlert, group: 'primary' },
  { label: 'Waiting Room', to: '/arena', icon: Clock, group: 'arena' },
  { label: 'Assessment UI', to: '/quiz', icon: Terminal, group: 'arena' },
  { label: 'Live Rankings', to: '/leaderboard', icon: Trophy, group: 'primary' },
  { label: 'My Profile', to: '/profile', icon: UserCheck, group: 'operator' },
  { label: 'Performance', to: '/results', icon: BarChart3, group: 'operator' },
  { label: 'Settings', to: '/settings', icon: Sliders, group: 'operator' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/'}
        onClick={onCloseMobile}
        className={({ isActive }) =>
          `group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            isActive
              ? 'bg-[#111722] text-[#B6FF3B] border border-[#252D38]'
              : 'text-[#929DAC] hover:bg-[#111722]/60 hover:text-[#F0F3F7] border border-transparent'
          }`
        }
      >
        <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" aria-hidden="true" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#0C1017] border-r border-[#252D38] w-64 select-none">
      <div>
        {/* Brand Identity Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-[#252D38]">
          <NavLink
            to="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-[#F0F3F7] font-display whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#B6FF3B]"
          >
            <svg className="h-5 w-5 text-[#B6FF3B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
              <line x1="12" y1="22" x2="12" y2="15.5" />
              <polyline points="22 8.5 12 15.5 2 8.5" />
            </svg>
            <span>AEGIS CIPHER</span>
          </NavLink>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden rounded-md p-1.5 text-[#929DAC] hover:bg-[#111722] hover:text-[#F0F3F7] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav aria-label="Main Navigation" className="p-4 space-y-6">
          <div>
            <p className="px-3 mb-2 font-mono text-[11px] font-medium text-[#929DAC]/70">
              Command Network
            </p>
            <div className="space-y-1">
              {NAV_ITEMS.filter((i) => i.group === 'primary').map(renderNavLink)}
            </div>
          </div>

          <div>
            <p className="px-3 mb-2 font-mono text-[11px] font-medium text-[#929DAC]/70">
              Tactical Environment
            </p>
            <div className="space-y-1">
              {NAV_ITEMS.filter((i) => i.group === 'arena').map(renderNavLink)}
            </div>
          </div>

          <div>
            <p className="px-3 mb-2 font-mono text-[11px] font-medium text-[#929DAC]/70">
              Operator Dossier
            </p>
            <div className="space-y-1">
              {NAV_ITEMS.filter((i) => i.group === 'operator').map(renderNavLink)}
            </div>
          </div>
        </nav>
      </div>

      {/* Bottom Environment Notice */}
      <div className="p-4 border-t border-[#252D38]">
        <div className="rounded-md bg-[#07090D] border border-[#252D38] p-3">
          <p className="font-mono text-[11px] text-[#929DAC]">
            TERMINAL · LOCAL SESSION
          </p>
          <p className="mt-1 text-xs text-[#929DAC]/80 leading-relaxed">
            No external data stream connected. Interface running in verified standalone mode.
          </p>
        </div>
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
            className="fixed inset-0 bg-[#07090D]/80 backdrop-blur-xs"
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
