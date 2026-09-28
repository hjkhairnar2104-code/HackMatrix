import React from 'react';
import { 
  ShieldAlert, 
  Map, 
  LayoutDashboard, 
  FileText, 
  Truck, 
  History, 
  CloudRain, 
  Radio, 
  RefreshCw,
  AlertTriangle,
  KeyRound,
  Wifi
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, systemState, onRefresh, onReset, onOpenApiModal, wsConnected }) {
  const mode = systemState?.mode || 'LIVE';
  const weather = systemState?.weather || {};

  return (
    <header className="top-navbar">
      <div className="nav-brand">
        <div className="brand-badge flex items-center gap-1">
          <ShieldAlert size={16} />
          <span>MISC-04</span>
        </div>
        <div>
          <span className="brand-title">ResQGrid</span>
        </div>
        <span className="brand-tagline hidden md:inline">
          From scattered flood signals to prioritized rescue decisions
        </span>
      </div>

      <nav className="nav-links">
        <button 
          className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={15} />
          <span>Dashboard</span>
        </button>

        <button 
          className={`nav-button ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <Map size={15} />
          <span>Disaster Map</span>
        </button>

        <button 
          className={`nav-button ${activeTab === 'incidents' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidents')}
        >
          <AlertTriangle size={15} />
          <span>Risk & Priorities</span>
        </button>

        <button 
          className={`nav-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileText size={15} />
          <span>Ground Reports</span>
        </button>

        <button 
          className={`nav-button ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('routes')}
        >
          <Truck size={15} />
          <span>Resources & Routes</span>
        </button>

        <button 
          className={`nav-button ${activeTab === 'replay' ? 'active' : ''}`}
          onClick={() => setActiveTab('replay')}
        >
          <History size={15} />
          <span>Replay & Evaluation</span>
        </button>
      </nav>

      <div className="status-pills">
        {/* Weather ticker */}
        <div style={{
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          fontSize: '11px', 
          color: '#cbd5e1', 
          background: '#1e293b', 
          padding: '4px 10px', 
          borderRadius: '6px',
          border: '1px solid #334155'
        }}>
          <CloudRain size={13} style={{ color: '#38bdf8' }} />
          <span>{weather.precipitation !== undefined ? `${weather.precipitation} mm` : '42 mm'}</span>
          <span style={{ color: '#64748b' }}>|</span>
          <span>{weather.temperature !== undefined ? `${weather.temperature}°C` : '26°C'}</span>
          <span style={{ 
            fontSize: '9px', 
            background: weather.source === 'OPEN_METEO_API' ? '#065f46' : '#854d0e',
            color: '#ffffff',
            padding: '1px 5px',
            borderRadius: '4px',
            fontWeight: 700
          }}>
            {weather.source === 'OPEN_METEO_API' ? 'LIVE API' : 'CACHED'}
          </span>
        </div>

        {/* WebSocket Connection Live Indicator */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 8px',
          borderRadius: '6px',
          background: wsConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: wsConnected ? '#10b981' : '#f87171',
          border: wsConnected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <Wifi size={12} />
          <span>{wsConnected ? 'WS LIVE' : 'WS RECONNECTING'}</span>
        </span>

        {/* Operating Mode Pill */}
        {mode === 'LIVE' && (
          <span className="status-badge live">
            <span className="pulse-dot"></span>
            LIVE OPERATION
          </span>
        )}
        {mode === 'DEMO_SIMULATION' && (
          <span className="status-badge simulated">
            <Radio size={12} />
            DEMO SIMULATION
          </span>
        )}
        {mode === 'REPLAYED_DATA' && (
          <span className="status-badge replay">
            <History size={12} />
            REPLAYED / NOT LIVE
          </span>
        )}

        <button 
          onClick={onReset}
          title="Reset to Step 1 Baseline"
          style={{
            background: 'transparent',
            border: '1px solid #334155',
            color: '#94a3b8',
            borderRadius: '6px',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <RefreshCw size={13} />
        </button>
      </div>
    </header>
  );
}
