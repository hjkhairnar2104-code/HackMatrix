import React, { useEffect, useState } from 'react';
import { 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Play, 
  RotateCcw, 
  FileCheck, 
  BarChart3,
  Info
} from 'lucide-react';

export default function EvaluationReplayPage({ systemState, onReplay, onReset }) {
  const [evalData, setEvalData] = useState(null);
  const isReplayMode = systemState?.mode === 'REPLAYED_DATA';

  useEffect(() => {
    fetch('/api/evaluation')
      .then(res => res.json())
      .then(data => setEvalData(data))
      .catch(err => console.error('Failed to load evaluation data:', err));
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Historical Replay & False-Alert Evaluation
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
          Verification modules for historical flash-flood replay and prototype decision accuracy assessment.
        </p>
      </div>

      {/* SECTION 1: HISTORICAL REPLAY MODE */}
      <div className="panel-card" style={{ marginBottom: '28px', border: isReplayMode ? '2px solid #dc2626' : '1px solid #cbd5e1' }}>
        <div className="panel-header" style={{ background: isReplayMode ? '#fef2f2' : '#fafafa', borderBottom: '1px solid #e2e8f0' }}>
          <div className="panel-title" style={{ color: isReplayMode ? '#991b1b' : '#0f172a' }}>
            <History size={18} style={{ color: isReplayMode ? '#dc2626' : '#64748b' }} />
            <span>Historical Event Replay (Section 23 Specification)</span>
          </div>

          {isReplayMode ? (
            <span style={{ fontSize: '12px', background: '#dc2626', color: 'white', fontWeight: 800, padding: '3px 10px', borderRadius: '4px', letterSpacing: '0.5px' }}>
              REPLAYED / NOT LIVE
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Current: Live Operational Baseline
            </span>
          )}
        </div>

        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 220px', gap: '20px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Monsoon Flash Flood Surge — 15 August 2026 Replay
              </div>
              <p style={{ fontSize: '12px', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
                Simulates an extreme 175mm atmospheric river precipitation event across the Mulshi-Pawana catchment basin.
                Observe how the downstream pipeline dynamically responds:
                <br/>
                <code>Rainfall ↑ → Risk ↑ → Affected Area ↑ → Priority Update → Road Invalidation → Alternative Routing</code>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={onReplay}
                className="btn btn-danger"
                style={{ padding: '10px 14px', fontSize: '12px', justifyContent: 'center' }}
              >
                <Play size={14} />
                <span>Launch 15-Aug Replay</span>
              </button>

              <button
                onClick={onReset}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '11px', justifyContent: 'center' }}
              >
                <RotateCcw size={13} />
                <span>Exit Replay & Reset</span>
              </button>
            </div>
          </div>

          {isReplayMode && (
            <div style={{ marginTop: '16px', background: '#fee2e2', border: '1px solid #fca5a5', padding: '12px', borderRadius: '6px', color: '#991b1b', fontSize: '12px' }}>
              ⚠️ <b>Active Replay State:</b> All dashboard values, rainfall charts, and risk numbers reflect the 15-August historical calibration dataset. Road R12 is severed by river overflow, triggering the alternative high-ridge bypass route.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: FALSE-ALERT EVALUATION MODULE */}
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title">
            <FileCheck size={18} style={{ color: '#16a34a' }} />
            <span>False-Alert Evaluation Module (Section 24 Specification)</span>
          </div>
          <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
            PROTOTYPE EVALUATION
          </span>
        </div>

        <div className="panel-body">
          {/* Mandatory User Prompt Disclaimer */}
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <Info size={16} />
            <b>Mandatory Note:</b> Prototype evaluation using simulated/replayed scenarios. Not certified real-world operational accuracy.
          </div>

          {/* Metric KPI cards */}
          {evalData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Alerts Tested</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', marginTop: '4px' }}>
                  {evalData.totalAlerts}
                </div>
              </div>

              <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '8px', border: '1px solid #86efac' }}>
                <div style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase', fontWeight: 700 }}>Correct Alerts</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', fontFamily: 'monospace', marginTop: '4px' }}>
                  {evalData.correctAlerts}
                </div>
              </div>

              <div style={{ background: '#fef2f2', padding: '14px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                <div style={{ fontSize: '11px', color: '#991b1b', textTransform: 'uppercase', fontWeight: 700 }}>False Alerts</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626', fontFamily: 'monospace', marginTop: '4px' }}>
                  {evalData.falseAlerts}
                </div>
              </div>

              <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '11px', color: '#1e40af', textTransform: 'uppercase', fontWeight: 700 }}>False Alert Rate</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', fontFamily: 'monospace', marginTop: '4px' }}>
                  {evalData.falseAlertRatePercent}%
                </div>
              </div>
            </div>
          )}

          {/* Sample Audit Case Table */}
          {evalData?.sampleCases && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                Simulated Scenario Validation Audit Cases:
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 10px' }}>Case ID</th>
                      <th style={{ padding: '8px 10px' }}>Location</th>
                      <th style={{ padding: '8px 10px' }}>Sensor / Hazard Signal</th>
                      <th style={{ padding: '8px 10px' }}>Ground Truth</th>
                      <th style={{ padding: '8px 10px' }}>Decision Engine Output</th>
                      <th style={{ padding: '8px 10px' }}>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalData.sampleCases.map((c) => (
                      <tr key={c.caseId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700 }}>{c.caseId}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{c.location}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{c.sensorSignal}</td>
                        <td style={{ padding: '8px 10px' }}>{c.groundTruth}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>{c.alertDecision}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: c.verdict === 'CORRECT_DETECTION' ? '#dcfce7' : '#fee2e2',
                            color: c.verdict === 'CORRECT_DETECTION' ? '#166534' : '#991b1b'
                          }}>
                            {c.verdict.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
