import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import SimulatorToolbar from './components/SimulatorToolbar';
import DashboardPage from './pages/DashboardPage';
import DisasterMapPage from './pages/DisasterMapPage';
import IncidentsPage from './pages/IncidentsPage';
import GroundReportsPage from './pages/GroundReportsPage';
import ResourcesRoutesPage from './pages/ResourcesRoutesPage';
import EvaluationReplayPage from './pages/EvaluationReplayPage';
import { api } from './utils';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemState, setSystemStateRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const toastTimer = useRef(null);

  // Responses can arrive out of order (poll vs. action vs. WebSocket); never replace newer state with older
  const setSystemState = useCallback((next) => {
    setSystemStateRaw((prev) => (!prev || !next?.version || next.instanceId !== prev.instanceId || next.version >= prev.version ? next : prev));
  }, []);

  const showToast = useCallback((msg, kind = 'info') => {
    setToast({ msg, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), kind === 'error' ? 6000 : 4000);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      setSystemState(await api('/api/state'));
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setSystemState]);

  useEffect(() => {
    fetchState();
    let ws = null;
    let reconnectTimeout = null;
    let closed = false;

    const connect = () => {
      let wsUrl = import.meta.env?.VITE_WS_URL;
      if (!wsUrl) {
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalDev && window.location.port !== '8000') {
          wsUrl = `ws://${window.location.hostname}:8000/ws/live`;
        } else {
          const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${proto}//${window.location.host}/ws/live`;
        }
      }
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.data) setSystemState(msg.data);
        } catch (e) {
          console.error('[ResQGrid WS] parse error', e);
        }
      };
      ws.onclose = () => {
        setWsConnected(false);
        if (!closed) reconnectTimeout = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    };
    connect();

    // REST fallback in case the socket drops
    const interval = setInterval(fetchState, 15000);
    return () => {
      closed = true;
      clearInterval(interval);
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [fetchState, setSystemState]);

  // Every action: loading state, error toast, state refresh from the response
  const run = useCallback(async (key, path, body, successMsg) => {
    setBusy(key);
    try {
      const data = await api(path, body ?? {});
      const next = data?.updatedState || data?.state;
      if (next) setSystemState(next);
      if (successMsg) showToast(typeof successMsg === 'function' ? successMsg(data) : successMsg);
      return data;
    } catch (err) {
      showToast(`⚠️ ${err.message}`, 'error');
      return null;
    } finally {
      setBusy(null);
    }
  }, [showToast, setSystemState]);

  const actions = {
    step: (n) => run(`step-${n}`, `/api/simulate/step/${n}`, {}, (d) => d.title),
    rainfall: (incrementMm = 50) => run('rainfall', '/api/simulate/rainfall', { incrementMm }, `Added ${incrementMm} mm of rain — plan updated`),
    waterLevel: (incrementM = 0.5) => run('water', '/api/simulate/waterlevel', { incrementM }, `River level raised ${incrementM} m — plan updated`),
    setRoad: (roadId, status) => run(`road-${roadId}`, '/api/simulate/road-blockage', { roadId, status },
      (d) => `Road ${roadId} is now ${d.updatedState.roads.find((r) => r.id === roadId)?.status.replace('_', ' ').toLowerCase()} — routes rechecked`),
    report: (payload) => run('report', '/api/reports', payload,
      (d) => `Report ${d.report.id} read by AI (${Math.round((d.report.extractedInfo?.confidence || 0) * 100)}% confidence) — plan updated`),
    scenario: (settlementId, scenario, apply) => run(`scenario-${scenario}`, '/api/routes/validate', { settlementId, scenario, apply },
      apply ? `Test ${scenario} applied to the live map` : null),
    resourceStatus: (id, status, assignment) => run(`res-${id}`, `/api/resources/${id}/status`, { status, assignment },
      `${id} is now ${status.toLowerCase()}`),
    explain: (settlementId) => run('explain', '/api/explain', { settlementId }),
    replay: () => run('replay', '/api/simulate/replay', {}, 'Replay started (not live data)'),
    stopReplay: () => run('replay-stop', '/api/simulate/replay/stop', {}, 'Replay paused'),
    reset: () => run('reset', '/api/simulate/reset', {}, 'Reset to a normal day'),
    live: () => run('live', '/api/simulate/real-world-live', {}, "Now using today's real rainfall"),
  };

  if (!systemState) {
    return (
      <div style={{ minHeight: '100vh', background: '#090f1d', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>ResQGrid Decision Platform</div>
        <div style={{ fontSize: 13, color: loadError ? '#f87171' : '#94a3b8' }}>
          {loading ? 'Connecting to the ResQGrid backend…' : `Backend unreachable: ${loadError}. Start it with: cd backend_py && .venv\\Scripts\\python -m uvicorn main:app --port 8000`}
        </div>
        {!loading && <button className="btn btn-primary" onClick={() => { setLoading(true); fetchState(); }}>Retry</button>}
      </div>
    );
  }

  const pageProps = { systemState, actions, busy };

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} systemState={systemState} onReset={actions.reset} wsConnected={wsConnected} />
      <SimulatorToolbar {...pageProps} />

      <main style={{ flex: 1 }}>
        {activeTab === 'dashboard' && <DashboardPage {...pageProps} />}
        {activeTab === 'map' && <DisasterMapPage {...pageProps} />}
        {activeTab === 'incidents' && <IncidentsPage {...pageProps} />}
        {activeTab === 'reports' && <GroundReportsPage {...pageProps} />}
        {activeTab === 'routes' && <ResourcesRoutesPage {...pageProps} />}
        {activeTab === 'replay' && <EvaluationReplayPage {...pageProps} />}
      </main>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999, maxWidth: 420,
          background: toast.kind === 'error' ? '#7f1d1d' : '#0f172a', color: '#fff',
          padding: '12px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          border: `1px solid ${toast.kind === 'error' ? '#ef4444' : '#334155'}`, boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
