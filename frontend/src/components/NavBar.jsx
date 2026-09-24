import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

/* ── SVG Icon set ─────────────────────────────────────────── */
const Icons = {
  Dashboard: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  Compare: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  ),
  Advisory: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Alerts: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Simulation: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
};

const LINKS = [
  { to: '/',           label: 'Dashboard',        Icon: Icons.Dashboard, end: true  },
  { to: '/compare',    label: 'Multi-City',        Icon: Icons.Compare,   end: false },
  { to: '/advisory',   label: 'Citizen Advisory',  Icon: Icons.Advisory,  end: false },
  { to: '/alerts',     label: 'Alerts',            Icon: Icons.Alerts,    end: false },
  { to: '/simulation', label: 'Simulation',        Icon: Icons.Simulation,end: false },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar-brand">
        <a
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
          title="AirSense Home"
        >
          <div className="brand-logo-wrap">
            <img src="/favicon.png" alt="AirSense logo" width="26" height="26" />
          </div>
          <div>
            <div className="brand-name">AirSense</div>
            <div className="brand-sub">AI Urban Air Quality Intelligence</div>
          </div>
        </a>
      </div>

      {/* Desktop nav links */}
      <div className={`navbar-links${menuOpen ? ' open' : ''}`}>
        {LINKS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right badges */}
      <div className="navbar-right">
        <span className="badge-pill badge-demo" title="Using sample / test data">
          📊 Test Mode
        </span>
        <span className="badge-pill badge-live" title="Live data feed active">
          <span className="badge-live-dot" />
          Live
        </span>
        <span className="badge-pill badge-city" title="Current city context">
          🇮🇳 Delhi
        </span>
      </div>

      {/* Mobile hamburger */}
      <button
        className="navbar-hamburger"
        onClick={() => setMenuOpen(prev => !prev)}
        aria-label="Toggle navigation menu"
        title="Menu"
      >
        <span style={menuOpen ? { transform: 'rotate(45deg) translate(5px, 5px)' } : {}} />
        <span style={menuOpen ? { opacity: 0 } : {}} />
        <span style={menuOpen ? { transform: 'rotate(-45deg) translate(5px, -5px)' } : {}} />
      </button>
    </nav>
  );
}
