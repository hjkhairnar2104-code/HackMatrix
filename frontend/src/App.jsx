import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import SimulatorToolbar from './components/SimulatorToolbar';
import DashboardPage from './pages/DashboardPage';
import DisasterMapPage from './pages/DisasterMapPage';
import IncidentsPage from './pages/IncidentsPage';
import GroundReportsPage from './pages/GroundReportsPage';
import ResourcesRoutesPage from './pages/ResourcesRoutesPage';
import EvaluationReplayPage from './pages/EvaluationReplayPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemState, setSystemState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef(null);

  // Fetch current system state from backend via REST fallback
  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setSystemState(data);
      }
    } catch (err) {
      console.error('Failed to fetch system state:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-Time WebSocket Connection
  useEffect(() => {
    fetchState();

    let ws = null;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      // Connect to FastAPI WebSocket endpoint on port 8000
      const wsUrl = `ws://${window.location.hostname}:8000/ws/live`;
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          console.log('[ResQGrid WS] Connected to live event stream');
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.data) {
              setSystemState(msg.data);
            }
            if (msg.type === 'REPORT_CREATED') {
              showToast(`🚨 New Ground Report Ingested & AI Verified!`);
            } else if (msg.type === 'ROAD_STATUS_CHANGED') {
              showToast(`🚧 Road Network Altered: Routes Recalculated!`);
            } else if (msg.type === 'HAZARD_UPDATE') {
              showToast(`🌧️ Hazard Dynamic Shift: Risk & Priorities Updated!`);
            }
          } catch (e) {
            console.error('[ResQGrid WS] Message parse error:', e);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          console.log('[ResQGrid WS] Disconnected. Reconnecting in 3s...');
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (err) => {
          console.warn('[ResQGrid WS] Connection error:', err);
          ws.close();
        };
      } catch (err) {
        console.error('[ResQGrid WS] Failed to init WebSocket:', err);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    // Fallback sync polling every 10 seconds in case WebSocket drops
    const interval = setInterval(fetchState, 10000);

    return () => {
      clearInterval(interval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Hackathon Step Execution
  const handleSimulateStep = async (stepNum) => {
    try {
      const res = await fetch(`/api/simulate/step/${stepNum}`, { method: 'POST' });
      const data = await res.json();
      if (data && data.state) {
        setSystemState(data.state);
        showToast(`⚡ Step ${stepNum}: ${data.title}`);
      }
    } catch (err) {
      console.error('Error executing step:', err);
    }
  };

  // What-If Simulation Triggers
  const handleSimulateRainfall = async (incrementMm = 50) => {
    try {
      const res = await fetch('/api/simulate/rainfall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incrementMm })
      });
      const data = await res.json();
      if (data && data.updatedState) {
        setSystemState(data.updatedState);
        showToast(`🌧️ Simulated +${incrementMm}mm Rainfall. Risk & Priorities Recalculated!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateWaterLevel = async (incrementM = 0.6) => {
    try {
      const res = await fetch('/api/simulate/waterlevel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incrementM })
      });
      const data = await res.json();
      if (data && data.updatedState) {
        setSystemState(data.updatedState);
        showToast(`🌊 Simulated +${incrementM}m River Gauge. Gauges Updated!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRoad = async (roadId = 'R12') => {
    try {
      const res = await fetch('/api/simulate/road-blockage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadId })
      });
      const data = await res.json();
      if (data && data.updatedState) {
        setSystemState(data.updatedState);
        const road = data.updatedState.roads.find(r => r.id === roadId);
        showToast(`🚧 Road ${roadId} is now ${road?.status}. Route Invalidated & Alternative Re-checked!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReport = async (reportData) => {
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      const data = await res.json();
      if (data && data.updatedState) {
        setSystemState(data.updatedState);
        showToast(`📝 Field report analyzed by AI with ${Math.round((data.report.extractedInfo?.confidence || 0.9) * 100)}% confidence.`);
        return data;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const handleReplay = async () => {
    try {
      const res = await fetch('/api/simulate/replay', { method: 'POST' });
      const data = await res.json();
      if (data && data.updatedState) {
        setSystemState(data.updatedState);
        showToast(`⏮️ Replay Mode Loaded: 15 August 2026 Monsoon Surge`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/api/simulate/reset', { method: 'POST' });
      const data = await res.json();
      if (data && data.updatedState) {
        setSystemState(data.updatedState);
        showToast(`🔄 Reset to Hackathon Baseline Flood Scenario.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetRealWorldLive = async () => {
    try {
      const res = await fetch('/api/simulate/real-world-live', { method: 'POST' });
      const data = await res.json();
      if (data && data.updatedState) {
        setSystemState(data.updatedState);
        showToast(`🟢 Synced with Real-Time Outside Weather (0.0mm / Normal / No Flood)`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGeminiKey = async (key) => {
    const res = await fetch('/api/config/gemini-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geminiApiKey: key })
    });
    return res.json();
  };

  if (loading && !systemState) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#090f1d',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
          ResQGrid Decision Platform
        </div>
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
          Initializing Pune District telemetry & Open-Meteo feeds...
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 1. Header Navigation */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemState={systemState}
        onRefresh={fetchState}
        onReset={handleReset}
        wsConnected={wsConnected}
      />

      {/* 2. Interactive Hackathon Demo Stepper & What-If Controls */}
      <SimulatorToolbar 
        systemState={systemState}
        onSimulateStep={handleSimulateStep}
        onSimulateRainfall={handleSimulateRainfall}
        onSimulateWaterLevel={handleSimulateWaterLevel}
        onToggleRoad={handleToggleRoad}
        onReplay={handleReplay}
        onReset={handleReset}
        onSetRealWorldLive={handleSetRealWorldLive}
      />

      {/* 3. Main Views */}
      <main style={{ flex: 1 }}>
        {activeTab === 'dashboard' && (
          <DashboardPage 
            systemState={systemState}
            onToggleRoad={handleToggleRoad}
            onSimulateRainfall={handleSimulateRainfall}
            onSimulateWaterLevel={handleSimulateWaterLevel}
          />
        )}

        {activeTab === 'map' && (
          <DisasterMapPage 
            systemState={systemState}
            onToggleRoad={handleToggleRoad}
          />
        )}

        {activeTab === 'incidents' && (
          <IncidentsPage 
            systemState={systemState}
          />
        )}

        {activeTab === 'reports' && (
          <GroundReportsPage 
            systemState={systemState}
            onSubmitReport={handleSubmitReport}
          />
        )}

        {activeTab === 'routes' && (
          <ResourcesRoutesPage 
            systemState={systemState}
            onToggleRoad={handleToggleRoad}
          />
        )}

        {activeTab === 'replay' && (
          <EvaluationReplayPage 
            systemState={systemState}
            onReplay={handleReplay}
            onReset={handleReset}
          />
        )}
      </main>

      {/* 5. Live Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 18px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
          border: '1px solid #334155',
          fontSize: '13px',
          fontWeight: 600,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
