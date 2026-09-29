import React from 'react';
import { ShieldAlert } from 'lucide-react';

const TABS = [
  ['dashboard', 'Dashboard'],
  ['map', 'Disaster Map'],
  ['incidents', 'Incidents'],
  ['reports', 'Ground Reports'],
  ['routes', 'Resources & Routes'],
  ['replay', 'Replay & Evaluation'],
];

const MODES = {
  LIVE: { label: 'Live weather', bg: '#065f46', fg: '#a7f3d0' },
  DEMO_SIMULATION: { label: 'Scenario mode', bg: '#1e3a8a', fg: '#bfdbfe' },
  REPLAYED_DATA: { label: 'Replay — not live', bg: '#991b1b', fg: '#fecaca' },
};

export default function Navbar({ activeTab, setActiveTab, systemState, wsConnected }) {
  const mode = MODES[systemState?.mode] || MODES.DEMO_SIMULATION;
  const weather = systemState?.weather || {};
  const weatherLive = weather.source === 'OPEN_METEO_API';

  return (
    <header className="top-navbar">
      <div className="nav-brand">
        <ShieldAlert size={20} color="#38bdf8" />
        <span className="brand-title">ResQGrid</span>
      </div>

      <nav className="nav-links">
        {TABS.map(([key, label]) => (
          <button key={key} className={`nav-button ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)} style={{ whiteSpace: 'nowrap' }}>
            {label}
          </button>
        ))}
      </nav>

      <div className="status-pills">
        <span
          title={weatherLive ? 'Rainfall from Open-Meteo (past 24 hours)' : 'Weather service unreachable — using offline values'}
          style={{ fontSize: 12, color: '#cbd5e1', whiteSpace: 'nowrap' }}
        >
          Rain 24h: <b style={{ color: '#fff' }}>{weather.past24hMm ?? 0} mm</b>
          <span style={{ color: weatherLive ? '#34d399' : '#fbbf24', marginLeft: 6 }}>{weatherLive ? '● live' : '● offline'}</span>
        </span>
        <span
          title={wsConnected ? 'Receiving live updates' : 'Reconnecting to the server…'}
          style={{ background: mode.bg, color: mode.fg, fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 6, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: wsConnected ? '#34d399' : '#f87171' }} />
          {mode.label}
        </span>
      </div>
    </header>
  );
}
