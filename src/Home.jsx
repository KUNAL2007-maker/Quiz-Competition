import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldAlert, Trophy, UserCheck } from 'lucide-react';
import { useEvents } from './events.jsx';
import Symbol from './branding/Symbol';

const shortcuts = [
  { to: '/competitions', title: 'Browse Competitions', description: 'Browse upcoming and active quiz tournaments.', Icon: ShieldAlert },
  { to: '/leaderboard', title: 'Open Leaderboard', description: 'See live tournament rankings and final standings.', Icon: Trophy },
  { to: '/profile', title: 'View Profile', description: 'Manage your callsign and competition profile.', Icon: UserCheck },
];
export default function Home() {
  const { events = [], error, loading } = useEvents();
  return <div className="origin-home">
    <section className="origin-hero">
      <div className="origin-hero-copy">
        <p className="origin-hero-kicker">Global competitive quiz tournament network</p>
        <h1>ENTER THE ARENA</h1>
        <p>Compete in real-time quiz tournaments across technology, science, cybersecurity, and specialized arenas. Challenge peers on the live leaderboard, earn certificates, and test your speed.</p>
        <div className="origin-actions"><Link className="origin-primary" to="/competitions">Browse Competitions <ArrowRight size={16} /></Link>
          <Link className="origin-secondary" to="/leaderboard"><Trophy size={16} /> Live Standings Ledger</Link></div>
      </div>
      <Symbol />
    </section>
    <section aria-labelledby="origin-shortcuts"><h2 id="origin-shortcuts">Quick Command Shortcuts</h2>
      <div className="origin-shortcuts">{shortcuts.map(({ to, title, description, Icon }) => <Link className="origin-shortcut" key={to} to={to}>
        <Icon aria-hidden="true" size={18} /><h3>{title}</h3><p>{description}</p><span>Open Section <ArrowRight size={13} /></span>
      </Link>)}</div>
    </section>
    <section aria-labelledby="origin-competitions"><div className="origin-heading-line"><h2 id="origin-competitions">Active Competition Overview</h2><Link to="/competitions">View Directory</Link></div>
      {error ? <div className="origin-empty" role="status"><h3>Competition directory unavailable</h3><p>Open the directory to try again.</p><Link to="/competitions">Open competitions <ArrowRight size={14} /></Link></div> :
        loading && !events.length ? <div className="origin-empty" role="status">Loading competitions…</div> :
        events.length ? <div className="origin-events">{events.slice(0, 6).map(event => <Link className="origin-event" key={event.id} to={'/quiz/' + event.id}>
          <ShieldAlert size={19} /><div><h3>{event.title}</h3><span>Competition details</span></div><ArrowRight size={16} /></Link>)}</div> :
        <div className="origin-empty"><ShieldAlert aria-hidden="true" size={28} /><h3>No competitions scheduled</h3>
          <p>New tournaments appear here when the host publishes them.</p><Link to="/competitions">Explore Competitions <ArrowRight size={14} /></Link></div>}
    </section>
  </div>;
}
