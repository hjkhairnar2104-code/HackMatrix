import React from 'react';
import { 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  HelpCircle, 
  ChevronRight, 
  CheckCircle2, 
  Users, 
  Droplets, 
  Mountain,
  FileText
} from 'lucide-react';

export default function IncidentsPage({ systemState }) {
  const settlements = systemState?.settlements || [];

  return (
    <div style={{ padding: '24px' }}>
      
      {/* Header Banner */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Risk Assessment & Dynamic Priority Engine
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
          Explainable multi-factor scoring connecting physical hazard dynamics to tactical rescue sequencing.
        </p>
      </div>

      {/* Dual Comparative Visual Chart: Risk vs Response Priority */}
      <div className="panel-card" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <div className="panel-title">
            <TrendingUp size={16} style={{ color: '#2563eb' }} />
            <span>Comparative Analysis: Flood Risk vs Tactical Response Priority</span>
          </div>
          <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
            DEMONSTRATING: PRIORITY ≠ RISK
          </span>
        </div>

        <div className="panel-body">
          <p style={{ fontSize: '12px', color: '#475569', marginBottom: '20px' }}>
            Notice that a location with slightly lower flood risk may receive <b>higher response priority</b> due to greater population exposure, severing of road access, or urgent ground distress reports.
          </p>

          {/* Native SVG / HTML Bar Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {settlements.map((s) => (
              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 140px', gap: '14px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Pop: {s.population.toLocaleString()} | Elev: {s.elevation}m</div>
                </div>

                {/* Progress Dual Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Risk Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '80px', fontSize: '11px', fontWeight: 600, color: '#ea580c' }}>
                      Risk: {s.riskScore}
                    </span>
                    <div style={{ flex: 1, background: '#f1f5f9', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${s.riskScore}%`, 
                          height: '100%', 
                          background: s.riskStatus === 'CRITICAL' ? '#dc2626' : s.riskStatus === 'HIGH' ? '#ea580c' : '#d97706',
                          borderRadius: '5px',
                          transition: 'width 0.4s ease'
                        }} 
                      />
                    </div>
                  </div>

                  {/* Priority Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '80px', fontSize: '11px', fontWeight: 600, color: '#2563eb' }}>
                      Priority: {s.responsePriority}
                    </span>
                    <div style={{ flex: 1, background: '#f1f5f9', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${s.responsePriority}%`, 
                          height: '100%', 
                          background: '#2563eb',
                          borderRadius: '5px',
                          transition: 'width 0.4s ease'
                        }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Badge Column */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    background: s.priorityRank === 1 ? '#2563eb' : '#f1f5f9',
                    color: s.priorityRank === 1 ? '#ffffff' : '#334155',
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}>
                    RANK #{s.priorityRank}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '20px', fontSize: '11px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '10px', background: '#ea580c', borderRadius: '2px', display: 'inline-block' }}></span>
              <span>Flood Risk Score (Hazard Severity)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '10px', background: '#2563eb', borderRadius: '2px', display: 'inline-block' }}></span>
              <span>Response Priority Score (Tactical Rescue Sequencing)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Settlement Breakdown Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {settlements.map((s) => {
          let badgeClass = 'badge-moderate';
          if (s.riskStatus === 'CRITICAL') badgeClass = 'badge-critical';
          if (s.riskStatus === 'HIGH') badgeClass = 'badge-high';
          if (s.riskStatus === 'LOW') badgeClass = 'badge-low';

          return (
            <div key={s.id} className="panel-card" style={{ margin: 0 }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Elevation: {s.elevation}m | Rainfall: {s.rainfall}mm
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className={`status-badge ${badgeClass}`}>
                    {s.riskStatus} ({s.riskScore}/100)
                  </span>
                </div>
              </div>

              <div className="panel-body">
                {/* Priority Rank Big Callout */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: s.priorityRank === 1 ? '#eff6ff' : '#f8fafc',
                  border: s.priorityRank === 1 ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: s.priorityRank === 1 ? '#2563eb' : '#64748b',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '12px',
                      padding: '3px 8px',
                      borderRadius: '4px'
                    }}>
                      PRIORITY #{s.priorityRank}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                      Rescue Sequencing
                    </span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: s.priorityRank === 1 ? '#1d4ed8' : '#0f172a' }}>
                    {s.responsePriority}/100
                  </div>
                </div>

                {/* Contributing Telemetry */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px', textAlign: 'center' }}>
                  <div style={{ background: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Population</div>
                    <b style={{ fontSize: '13px' }}>{s.population.toLocaleString()}</b>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Water Gauge</div>
                    <b style={{ fontSize: '13px', color: s.waterLevel === 'CRITICAL' ? '#dc2626' : '#ea580c' }}>
                      {s.waterLevelMeters}m
                    </b>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Reports</div>
                    <b style={{ fontSize: '13px' }}>{s.groundReportsCount}</b>
                  </div>
                </div>

                {/* Explainable Why Points */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                    Contributing Evidence Factors:
                  </div>
                  <ul style={{ margin: '0 0 0 16px', padding: 0, fontSize: '11px', color: '#334155', lineHeight: 1.5 }}>
                    {(s.whyExplanation || []).map((why, i) => (
                      <li key={i} style={{ marginBottom: '2px' }}>{why}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
