import React, { useState } from 'react';
import { 
  Truck, 
  OctagonAlert, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Navigation, 
  MapPin, 
  Clock, 
  Ship, 
  ShieldAlert, 
  Building2, 
  Home,
  Check,
  RotateCw
} from 'lucide-react';

export default function ResourcesRoutesPage({ systemState, onValidateScenario, onToggleRoad }) {
  const [selectedScenario, setSelectedScenario] = useState(1);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [testingScenario, setTestingScenario] = useState(false);

  const resources = systemState?.resources || [];
  const roads = systemState?.roads || [];
  const route = systemState?.route || null;
  const recommendations = systemState?.recommendations || [];

  const handleRunScenario = async (scNum) => {
    setSelectedScenario(scNum);
    setTestingScenario(true);
    try {
      const res = await fetch('/api/routes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scNum, settlementId: 'S1' })
      });
      const data = await res.json();
      setScenarioResult(data);
    } catch (err) {
      console.error('Failed to validate scenario route:', err);
    } finally {
      setTestingScenario(false);
    }
  };

  const activeRouteData = scenarioResult || route;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Emergency Resources & Route Validation Engine
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
          NetworkX graph routing with dynamic road blockage invalidation and alternative route calculation.
        </p>
      </div>

      {/* SECTION 1: ROUTE VALIDITY TESTING SUITE (3 SCENARIOS) */}
      <div className="panel-card" style={{ marginBottom: '24px', border: '2px solid #2563eb' }}>
        <div className="panel-header" style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
          <div className="panel-title" style={{ color: '#1e40af' }}>
            <Navigation size={18} style={{ color: '#2563eb' }} />
            <span>Interactive Route Validity Testing Suite (Section 14 Requirement)</span>
          </div>
          <span style={{ fontSize: '11px', background: '#2563eb', color: 'white', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
            DEMONSTRABLE FROM UI
          </span>
        </div>

        <div className="panel-body">
          <p style={{ fontSize: '12px', color: '#334155', marginBottom: '14px' }}>
            Select any of the three required hackathon scenarios to test real-time route checking, path invalidation, and alternative corridor discovery:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {/* Scenario 1 */}
            <button
              onClick={() => handleRunScenario(1)}
              style={{
                background: selectedScenario === 1 ? '#eff6ff' : '#ffffff',
                border: selectedScenario === 1 ? '2px solid #2563eb' : '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: '13px', color: '#0f172a' }}>Scenario 1 — All Roads Open</b>
                <span style={{ fontSize: '10px', background: '#dcfce7', color: '#16a34a', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                  VALID
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Primary Causeway R12 open. Direct optimal rescue route clear.
              </div>
            </button>

            {/* Scenario 2 */}
            <button
              onClick={() => handleRunScenario(2)}
              style={{
                background: selectedScenario === 2 ? '#eff6ff' : '#ffffff',
                border: selectedScenario === 2 ? '2px solid #2563eb' : '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: '13px', color: '#0f172a' }}>Scenario 2 — Primary Road Blocked</b>
                <span style={{ fontSize: '10px', background: '#fef3c7', color: '#d97706', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                  ALTERNATIVE
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Causeway R12 BLOCKED. Original invalidated, R7 High-Ridge bypass found.
              </div>
            </button>

            {/* Scenario 3 */}
            <button
              onClick={() => handleRunScenario(3)}
              style={{
                background: selectedScenario === 3 ? '#fef2f2' : '#ffffff',
                border: selectedScenario === 3 ? '2px solid #dc2626' : '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: '13px', color: '#0f172a' }}>Scenario 3 — Multiple Roads Blocked</b>
                <span style={{ fontSize: '10px', background: '#fee2e2', color: '#dc2626', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                  ESCALATION
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Both Causeway R12 & Bypass R7 submerged. Surface impossible, helicopter needed.
              </div>
            </button>
          </div>

          {/* Scenario Result Output Box */}
          {activeRouteData && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    Route Analysis for: {activeRouteData.resourceName} → {activeRouteData.targetSettlementName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Route ID: <code style={{ color: '#2563eb' }}>{activeRouteData.routeId}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className={`route-card ${activeRouteData.originalRouteStatus === 'VALID' ? 'valid' : 'invalid'}`} style={{ padding: '6px 12px', margin: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: 700 }}>
                      Original: {activeRouteData.originalRouteStatus === 'VALID' ? '✓ VALID' : '❌ INVALID'}
                    </span>
                  </div>

                  {activeRouteData.alternativeRouteStatus && (
                    <div className={`route-card ${activeRouteData.alternativeRouteStatus === 'VALID' ? 'alt' : 'invalid'}`} style={{ padding: '6px 12px', margin: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700 }}>
                        Alternative: {activeRouteData.alternativeRouteStatus}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Path & Explanation */}
              <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', fontSize: '12px', color: '#334155' }}>
                <p style={{ lineHeight: 1.5, background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <b>Decision Engine Logic:</b> {activeRouteData.explanation}
                </p>

                {activeRouteData.alternativePath && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>Active Path Segments:</span>
                    {activeRouteData.alternativePath.map((node, i) => (
                      <React.Fragment key={i}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {node}
                        </span>
                        {i < activeRouteData.alternativePath.length - 1 && <span>→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: FLEET MANAGEMENT & RESOURCE RECOMMENDATION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Resource Fleet List */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <Truck size={16} style={{ color: '#16a34a' }} />
              <span>Emergency Fleet Assets ({resources.length})</span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Section 15 Specification</span>
          </div>

          <div className="panel-body">
            {resources.map((res) => {
              let iconComp = <Truck size={18} />;
              if (res.type === 'RESCUE_BOAT') iconComp = <Ship size={18} style={{ color: '#0284c7' }} />;
              if (res.type === 'AMBULANCE') iconComp = <Truck size={18} style={{ color: '#dc2626' }} />;
              if (res.type === 'RESCUE_TEAM') iconComp = <ShieldAlert size={18} style={{ color: '#f59e0b' }} />;
              if (res.type === 'HOSPITAL') iconComp = <Building2 size={18} style={{ color: '#16a34a' }} />;
              if (res.type === 'SHELTER') iconComp = <Home size={18} style={{ color: '#7c3aed' }} />;

              return (
                <div
                  key={res.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      {iconComp}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{res.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{res.locationName}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: res.status === 'AVAILABLE' ? '#dcfce7' : '#fee2e2',
                      color: res.status === 'AVAILABLE' ? '#166534' : '#991b1b'
                    }}>
                      {res.status}
                    </span>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                      {res.speedKmh > 0 ? `${res.speedKmh} km/h` : 'Stationary'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Road Network State */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <OctagonAlert size={16} style={{ color: '#ea580c' }} />
              <span>District Road Network Telemetry ({roads.length})</span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Click to Toggle Blockage</span>
          </div>

          <div className="panel-body">
            {roads.map((road) => (
              <div
                key={road.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: road.status === 'BLOCKED' ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                  background: road.status === 'BLOCKED' ? '#fef2f2' : '#ffffff',
                  marginBottom: '8px'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{road.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {road.source} → {road.destination} ({road.distanceKm} km)
                  </div>
                </div>

                <button
                  onClick={() => onToggleRoad(road.id)}
                  style={{
                    background: road.status === 'BLOCKED' ? '#dc2626' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="Click to toggle status"
                >
                  {road.status === 'BLOCKED' ? 'BLOCKED 🔴' : 'OPEN 🟢'}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
