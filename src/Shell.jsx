import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Award, KeyRound, LayoutDashboard, LogIn, Menu, Search, Settings, ShieldAlert, Trophy, UserCheck, X } from 'lucide-react';
import { useAccount } from './account.jsx';
import { useEvents } from './events.jsx';
import { NullOriginLogo } from './branding/NullOriginLogo';
import './index.css';
import './shell.css';

const mainNav = [
  ['/', 'Overview', LayoutDashboard],
  ['/competitions', 'Competitions', ShieldAlert],
  ['/leaderboard', 'Live Rankings', Trophy],
  ['/certification', 'Certification', Award],
];
const profileNav = [['/profile', 'My Profile', UserCheck], ['/settings', 'Settings', Settings]];
const titles = {
  '/': 'Overview', '/competitions': 'Competitions', '/leaderboard': 'Live Rankings', '/certification': 'Certification',
  '/profile': 'My Profile', '/settings': 'Settings', '/login': 'Operator Access', '/admin': 'Admin Console', '/quiz': 'Competition Arena',
  '/standings': 'Final Standings', '/about': 'About Us', '/terms': 'Terms & Conditions', '/privacy': 'Privacy Policy',
  '/auth': 'Account Verification', '/verify': 'Certificate Verification', '/results': 'Quiz Results',
};
function MenuContent({ close, user, admin }) {
  const accountNav = [...profileNav, ['/login', user ? 'Operator Account' : 'Sign In', LogIn]];
  const groups = [['Command Network', mainNav], ['Operator Dossier', accountNav]];
  if (admin) groups.unshift(['Administration', [['/admin', 'Admin Console', KeyRound]]]);
  return <>
    <div className="origin-brand-row"><Link to="/" className="origin-brand" onClick={close}><NullOriginLogo />NULL ORIGIN</Link>
      {close && <button type="button" className="origin-icon" aria-label="Close navigation" onClick={close}><X /></button>}
    </div>
    <nav aria-label="Main navigation" className="origin-nav">
      {groups.map(([title, links]) => <div key={title}><div className="origin-nav-title">{title}</div>
        {links.map(([path, label, Icon]) => <NavLink key={path} to={path} end={path === '/'} onClick={close}
          className={({ isActive }) => isActive ? 'origin-nav-link selected' : 'origin-nav-link'}><Icon size={17} />{label}</NavLink>)}
      </div>)}
    </nav>
  </>;
}
function SearchContent({ close }) {
  const [query, setQuery] = useState('');
  const { events = [], error } = useEvents();
  const needle = query.trim().toLowerCase();
  const items = [...mainNav.map(([to, title]) => ({ to, title })), ...events.map(event => ({ to: '/quiz/' + event.id, title: event.title }))];
  const matches = needle ? items.filter(({ title }) => title.toLowerCase().includes(needle)).slice(0, 12) : [];
  return <><div className="origin-dialog-heading"><h2>Search Null Origin</h2><button type="button" className="origin-icon" aria-label="Close search" onClick={close}><X /></button></div>
    <label className="origin-search-field"><Search size={18} /><input type="search" autoFocus aria-label="Search pages and competitions"
      placeholder="Search pages and competitions" value={query} onChange={e => setQuery(e.target.value)} /></label>
    {needle && <div className="origin-search-results" aria-live="polite">
      {matches.map(item => <Link key={item.to} to={item.to} onClick={close}>{item.title}</Link>)}
      {!matches.length && <p>{error ? 'Competition search is temporarily unavailable.' : 'No matching pages or competitions.'}</p>}
    </div>}
  </>;
}
export default function Shell() {
  const { user, admin } = useAccount();
  const { pathname } = useLocation();
  const title = titles['/' + pathname.split('/')[1]] || 'Null Origin';
  const dialog = useRef(null);
  const [panel, setPanel] = useState(null);
  function close() { dialog.current?.close(); setPanel(null); }
  useEffect(() => {
    if (panel && !dialog.current.open) dialog.current.showModal();
  }, [panel]);
  useEffect(() => {
    dialog.current?.close();
    setPanel(null);
    document.title = title + ' | Null Origin';
    window.scrollTo(0, 0);
  }, [pathname, title]);
  return <div className="origin-shell">
    <a className="origin-skip" href="#origin-main">Skip to content</a>
    <aside className="origin-sidebar"><MenuContent user={user} admin={admin} /></aside>
    <div className="origin-workspace">
      <header className="origin-header">
        <div className="origin-page-name"><button type="button" className="origin-icon origin-menu-trigger" aria-label="Open navigation" onClick={() => setPanel('menu')}><Menu /></button>
          <span>{title}</span></div>
        <button type="button" className="origin-search-trigger" aria-label="Search pages and competitions" onClick={() => setPanel('search')}><Search size={16} /><span>Search competitions or pages…</span></button>
        <div className="origin-account-actions"><Link to="/settings" className="origin-icon" aria-label="Settings"><Settings size={18} /></Link>
          <Link to={user ? '/profile' : '/login'} className="origin-account" aria-label={user ? 'Open profile' : 'Sign in'}><UserCheck size={16} /><span>{user ? 'My Profile' : 'Sign In'}</span></Link></div>
      </header>
      <main id="origin-main" tabIndex="-1" className="origin-main"><Outlet /></main>
      <footer className="origin-footer">
        <Link to="/" className="origin-brand"><NullOriginLogo />NULL ORIGIN</Link>
        <nav aria-label="Footer"><Link to="/about">About Us</Link><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms & Conditions</Link><a href="mailto:contact@nullorigin.live">Support</a></nav>
        <small>© {new Date().getFullYear()} Null Origin</small>
      </footer>
    </div>
    <dialog ref={dialog} className={panel === 'menu' ? 'origin-drawer' : 'origin-dialog'} aria-label={panel === 'menu' ? 'Navigation' : 'Site search'}
      onClose={() => setPanel(null)} onClick={event => {
        if (event.target === dialog.current) {
          const rect = dialog.current.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX >= rect.right || event.clientY < rect.top || event.clientY >= rect.bottom) close();
        }
      }}>
      {panel === 'menu' && <MenuContent user={user} admin={admin} close={close} />}
      {panel === 'search' && <SearchContent close={close} />}
    </dialog>
  </div>;
}
