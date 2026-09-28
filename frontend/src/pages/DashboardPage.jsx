import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Users, 
  OctagonAlert, 
  Bell, 
  Truck, 
  MapPin, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  Cpu, 
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import MapView from '../components/MapView';

export default function DashboardPage({ systemState, onToggleRoad, onSimulateRainfall, onSimulateWaterLevel }) {
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  const kpi = systemState?.kpi || {
    criticalAreas: 2,
    affectedPopulation: 3990,
    blockedRoads: 1,
    activeWarnings: 2,
    availableResources: 3,
    lastUpdated: '12:00:00'
  };

  const settlements = systemState?.settlements || [];
  const roads = systemState?.roads || [];
  const resources = systemState?.resources || [];
  const route = systemState?.route || null;
  const recommendations = systemState?.recommendations || [];
  const alerts = systemState?.alerts || [];
  const aiExplanation = systemState?.aiExplanation || '';

  const topRecommendation = recommendations[0] || null;
  const isR12Blocked = roads.some(r => r.id === 'R12' && r.status === 'BLOCKED');

  return (
    <div style={{ padding: '20px 24px' }}>
      
      {/* 1. TOP KPI SUMMARY CARDS */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Critical Areas</span>
            <AlertTriangle className="kpi-icon" style={{ color: '#dc2626' }} />
          </div>
          <div className="kpi-value" style={{ color: '#dc2626' }}>
            {kpi.criticalAreas}
          </div>
          <div className="kpi-subtext">Immediate intervention needed</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Affected Population</span>
            <Users className="kpi-icon" style={{ color: '#ea580c' }} />
          </div>
          <div className="kpi-value" style={{ color: '#ea580c' }}>
            {kpi.affectedPopulation.toLocaleString()}
          </div>
          <div className="kpi-subtext">In high/critical hazard zones</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Blocked Roads</span>
            <OctagonAlert className="kpi-icon" style={{ color: isR12Blocked ? '#dc2626' : '#10b981' }} />
          </div>
          <div className="kpi-value" style={{ color: isR12Blocked ? '#dc2626' : '#10b981' }}>
            {kpi.blockedRoads}
          </div>
          <div className="kpi-subtext">
            {isR12Blocked ? 'Wakad Causeway (R12) submerged' : 'All corridors open'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Active Warnings</span>
            <Bell className="kpi-icon" style={{ color: '#dc2626' }} />
          </div>
          <div className="kpi-value" style={{ color: '#dc2626' }}>
            {kpi.activeWarnings}
          </div>
          <div className="kpi-subtext">Verified flood emergencies</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Available Resources</span>
            <Truck className="kpi-icon" style={{ color: '#16a34a' }} />
          </div>
          <div className="kpi-value" style={{ color: '#16a34a' }}>
            {kpi.availableResources}
          </div>
          <div className="kpi-subtext">Rescue boats, teams & medics</div>
        </div>
      </div>

      {/* 2. MAIN DASHBOARD SPLIT GRID */}
      <div className="dashboard-grid">
        
        {/* Left Column: GIS Map & Active Alerts */}
        <div>
          {/* Map Panel */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title">
                <MapPin size={16} style={{ color: '#2563eb' }} />
                <span>Operational GIS Situation Map — {systemState?.district?.districtName || 'Pune Basin'}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Click marker to inspect settlement
                </span>
              </div>
            </div>
            <div style={{ padding: '0' }}>
              <MapView 
                settlements={settlements}
                roads={roads}
                resources={resources}
                route={route}
                onSelectSettlement={setSelectedSettlement}
                height="460px"
              />
            </div>
          </div>

          {/* Active Alerts + Evidence & Confidence Panel */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title">
                <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                <span>Active Warnings & Contributing Evidence</span>
              </div>
              <span style={{ fontSize: '11px', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                {alerts.length} ALERTS ACTIVE
              </span>
            </div>
            <div className="panel-body">
              {alerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  No active critical alerts. Operating within baseline parameters.
                </div>
              ) : (
                alerts.map((al) => (
                  <div 
                    key={al.id}
                    style={{
                      background: al.severity === 'CRITICAL' ? '#fef2f2' : '#fff7ed',
                      border: `1px solid ${al.severity === 'CRITICAL' ? '#fca5a5' : '#fdba74'}`,
                      borderRadius: '8px',
                      padding: '14px 16px',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: al.severity === 'CRITICAL' ? '#991b1b' : '#9a3412', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{al.title}</span>
                          <span style={{ fontSize: '10px', background: al.severity === 'CRITICAL' ? '#dc2626' : '#ea580c', color: 'white', padding: '1px 6px', borderRadius: '4px' }}>
                            {al.severity}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                          {al.message}
                        </p>
                      </div>

                      <div style={{ textAlign: 'right', minWidth: '90px' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                          Confidence
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                          {Math.round(al.confidence * 100)}%
                        </div>
                      </div>
                    </div>

                    {/* Contributing Evidence Bullets */}
                    <div style={{ marginTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Why did the system trigger this warning? (Evidence):
                      </div>
                      <ul className="evidence-list">
                        {(al.evidence || []).map((ev, i) => (
                          <li key={i} className="evidence-item">
                            <span className="evidence-check">✓</span>
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommended Action */}
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.7)', padding: '8px 12px', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                        <span>Recommended Action:</span>
                        <span style={{ color: '#2563eb' }}>{al.recommendedAction}</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>{al.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Priority Engine, Route Validation, AI Explanation */}
        <div>
          
          {/* Dynamic Response Priority Engine Card */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title">
                <ShieldCheck size={16} style={{ color: '#2563eb' }} />
                <span>Dynamic Response Priority Engine</span>
              </div>
              <span style={{ fontSize: '10px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                PRIORITY ≠ RISK
              </span>
            </div>
            <div className="panel-body" style={{ padding: '12px' }}>
              <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px', lineHeight: 1.4 }}>
                Calculated dynamically: Flood Risk (40%) + Population Exposed (25%) + Road Accessibility (15%) + Ground Distress Reports (20%).
              </p>

              {settlements.slice(0, 4).map((s) => (
                <div 
                  key={s.id}
                  style={{
                    background: s.priorityRank === 1 ? '#eff6ff' : '#ffffff',
                    border: s.priorityRank === 1 ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginBottom: '8px',
                    boxShadow: s.priorityRank === 1 ? '0 2px 4px rgba(37,99,235,0.08)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        background: s.priorityRank === 1 ? '#2563eb' : '#64748b',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        #{s.priorityRank}
                      </span>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{s.name}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Score:</span>
                      <b style={{ fontSize: '14px', fontFamily: 'monospace', color: s.priorityRank === 1 ? '#1d4ed8' : '#0f172a' }}>
                        {s.responsePriority}
                      </b>
                    </div>
                  </div>

                  {/* Why is it this priority? */}
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#475569' }}>
                    <div style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                      <ChevronRight size={12} style={{ color: '#2563eb' }} />
                      <span>Why Priority #{s.priorityRank}?</span>
                    </div>
                    <ul style={{ margin: '2px 0 0 16px', padding: 0, listStyle: 'disc' }}>
                      {(s.whyExplanation || []).slice(0, 2).map((why, i) => (
                        <li key={i}>{why}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Route Validation Intelligence Card */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title">
                <OctagonAlert size={16} style={{ color: '#ea580c' }} />
                <span>Rescue Route Validation</span>
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: route?.originalRouteStatus === 'INVALID' ? '#fee2e2' : '#dcfce7',
                color: route?.originalRouteStatus === 'INVALID' ? '#dc2626' : '#15803d'
              }}>
                {route?.originalRouteStatus === 'INVALID' ? 'DIVERSION ACTIVE' : 'ROUTE CLEAR'}
              </span>
            </div>
            <div className="panel-body">
              {/* Original Route Status */}
              <div className={`route-card ${route?.originalRouteStatus === 'VALID' ? 'valid' : 'invalid'}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}>
                    {route?.originalRouteStatus === 'VALID' ? (
                      <CheckCircle size={15} style={{ color: '#16a34a' }} />
                    ) : (
                      <XCircle size={15} style={{ color: '#dc2626' }} />
                    )}
                    <span>Original Primary Route: Wakad Causeway (R12)</span>
                  </div>
                  <b style={{ fontSize: '11px', color: route?.originalRouteStatus === 'VALID' ? '#16a34a' : '#dc2626' }}>
                    {route?.originalRouteStatus}
                  </b>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  {route?.originalRouteStatus === 'VALID' 
                    ? 'Primary direct access corridor is fully open.' 
                    : 'Corridor impassable due to bridge submergence.'}
                </div>
              </div>

              {/* Alternative Route Status (when road blocked) */}
              {route?.alternativeRouteStatus && route.alternativeRouteStatus !== 'NOT_NEEDED' && (
                <div className="route-card alt">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px', color: '#1d4ed8' }}>
                      <CheckCircle size={15} style={{ color: '#2563eb' }} />
                      <span>Alternative Route: High-Ridge Bypass (R7)</span>
                    </div>
                    <b style={{ fontSize: '11px', color: '#1d4ed8' }}>
                      VALID
                    </b>
                  </div>
                  <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Distance: {route.distanceKm} km</span>
                    <span>ETA: {route.etaMinutes} mins</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Elevation Verified</span>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '11px', color: '#475569', marginTop: '8px', lineHeight: 1.4, background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <b>Route Intelligence:</b> {route?.explanation}
              </p>
            </div>
          </div>

          {/* Recommended Resource Card */}
          {topRecommendation && (
            <div className="panel-card">
              <div className="panel-header">
                <div className="panel-title">
                  <Truck size={16} style={{ color: '#16a34a' }} />
                  <span>Resource Recommendation</span>
                </div>
                <span style={{ fontSize: '10px', background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  RECOMMENDED
                </span>
              </div>
              <div className="panel-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      {topRecommendation.recommendedResourceName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Target: <b>{topRecommendation.settlementName}</b> (Priority #{topRecommendation.priorityRank})
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>
                      {topRecommendation.etaMinutes} min ETA
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {topRecommendation.distanceKm} km
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Why was this resource selected?
                  </div>
                  <ul style={{ margin: '0 0 0 16px', padding: 0, fontSize: '11px', color: '#334155' }}>
                    {(topRecommendation.whySelected || []).map((why, i) => (
                      <li key={i} style={{ marginBottom: '2px' }}>{why}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* AI Decision Explanation Card */}
          <div className="panel-card" style={{ border: '1px solid #c7d2fe', background: '#f5f3ff' }}>
            <div className="panel-header" style={{ background: '#ede9fe', borderBottom: '1px solid #ddd6fe' }}>
              <div className="panel-title" style={{ color: '#5b21b6' }}>
                <Sparkles size={16} style={{ color: '#7c3aed' }} />
                <span>Explainable AI Decision Audit</span>
              </div>
              <span style={{ fontSize: '9px', background: '#7c3aed', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                NON-HALLUCINATING LLM
              </span>
            </div>
            <div className="panel-body">
              <p style={{ fontSize: '12px', color: '#3730a3', lineHeight: 1.5, fontStyle: 'italic' }}>
                "{aiExplanation}"
              </p>
              <div style={{ marginTop: '8px', fontSize: '10px', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Info size={12} />
                <span>Synthesized strictly from structured system telemetry (Rainfall, Topography, Road Graph).</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
