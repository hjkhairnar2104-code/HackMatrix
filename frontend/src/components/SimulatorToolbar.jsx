import React, { useState } from 'react';
import { 
  Play, 
  CloudRain, 
  Waves, 
  ShieldAlert, 
  RotateCcw, 
  ChevronRight, 
  Zap,
  OctagonAlert,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function SimulatorToolbar({ 
  systemState, 
  onSimulateStep, 
  onSimulateRainfall, 
  onSimulateWaterLevel, 
  onToggleRoad, 
  onReplay,
  onReset,
  onSetRealWorldLive 
}) {
  const [loading, setLoading] = useState(false);
  const currentStep = systemState?.simulation?.step || 1;
  const isR12Blocked = systemState?.roads?.some(r => r.id === 'R12' && r.status === 'BLOCKED');

  const steps = [
    { num: 1, label: "1. Baseline", desc: "Village A (HIGH), Village B (CRITICAL), R12 OPEN" },
    { num: 2, label: "2. Heavy Rain", desc: "Monsoon surge pushed rainfall to 145mm" },
    { num: 3, label: "3. Ground Report", desc: "AI extracts: Bridge blocked & water in houses" },
    { num: 4, label: "4. Road Closure", desc: "Road R12 Wakad Causeway marked BLOCKED" },
    { num: 5, label: "5. Route Recalc", desc: "Original INVALID -> Alternative R7 VALID" },
    { num: 6, label: "6. Final Plan", desc: "Priority #1 Village B, Boat 02 Assigned + AI Reason" }
  ];

  const handleStepClick = async (stepNum) => {
    setLoading(true);
    await onSimulateStep(stepNum);
    setLoading(false);
  };

  return (
    <div style={{ background: '#0b1329', borderBottom: '1px solid #1e293b', padding: '10px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        
        {/* Hackathon Demo Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Zap size={14} style={{ color: '#f59e0b' }} />
            <span>Hackathon Demo Stepper:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {steps.map((st) => (
              <button
                key={st.num}
                onClick={() => handleStepClick(st.num)}
                title={st.desc}
                style={{
                  background: currentStep === st.num ? '#2563eb' : '#1e293b',
                  color: currentStep === st.num ? '#ffffff' : '#94a3b8',
                  border: currentStep === st.num ? '1px solid #3b82f6' : '1px solid #334155',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s'
                }}
              >
                {currentStep === st.num ? <CheckCircle2 size={11} /> : null}
                <span>{st.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* What-If Live Mutation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>WHAT-IF CONTROLS:</span>

          <button
            onClick={() => onSimulateRainfall(50)}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '5px 10px', background: '#1e293b', color: '#e2e8f0', borderColor: '#334155' }}
            title="Increase rainfall by 50mm and trigger dynamic recalculation"
          >
            <CloudRain size={13} style={{ color: '#38bdf8' }} />
            <span>+Rainfall (+50mm)</span>
          </button>

          <button
            onClick={() => onSimulateWaterLevel(0.6)}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '5px 10px', background: '#1e293b', color: '#e2e8f0', borderColor: '#334155' }}
            title="Increase river gauge level by 0.6m"
          >
            <Waves size={13} style={{ color: '#06b6d4' }} />
            <span>+Water Level (+0.6m)</span>
          </button>

          <button
            onClick={() => onToggleRoad('R12')}
            className="btn"
            style={{ 
              fontSize: '11px', 
              padding: '5px 10px', 
              background: isR12Blocked ? '#dc2626' : '#1e293b',
              color: '#ffffff',
              border: isR12Blocked ? '1px solid #ef4444' : '1px solid #334155'
            }}
            title="Toggle Road R12 (Wakad Causeway) status between OPEN and BLOCKED"
          >
            <OctagonAlert size={13} style={{ color: isR12Blocked ? '#ffffff' : '#f87171' }} />
            <span>{isR12Blocked ? 'R12: BLOCKED 🔴 (Click to Open)' : 'Simulate R12 Blockage ⚠️'}</span>
          </button>

          <button
            onClick={onSetRealWorldLive}
            className="btn"
            style={{ fontSize: '11px', padding: '5px 10px', background: '#065f46', color: '#6ee7b7', border: '1px solid #059669' }}
            title="Switch strictly to actual real-time outside weather (Open-Meteo live reading 0.0mm / Calm Normal Rivers)"
          >
            <span>🟢 Live Outside (Actual 0mm)</span>
          </button>

          <button
            onClick={onReplay}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '5px 10px', background: '#450a0a', color: '#fca5a5', borderColor: '#991b1b' }}
            title="Load historical replay of 15 August 2026 Monsoon Surge"
          >
            <span>⏮️ Replay Event</span>
          </button>

          <button
            onClick={onReset}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '5px 8px', background: '#0f172a', color: '#94a3b8', borderColor: '#334155' }}
            title="Reset to Hackathon Baseline Flood Scenario"
          >
            <RotateCcw size={12} />
            <span>Scenario Reset</span>
          </button>
        </div>

      </div>

      {/* Description of current step banner */}
      <div style={{ marginTop: '8px', fontSize: '12px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(30, 41, 59, 0.6)', padding: '4px 10px', borderRadius: '4px', borderLeft: '3px solid #38bdf8' }}>
        <span style={{ fontWeight: 700, color: '#38bdf8' }}>Current Step {currentStep}:</span>
        <span>{systemState?.simulation?.title || 'Operational Baseline'}</span>
        <span style={{ color: '#64748b' }}>—</span>
        <span style={{ color: '#94a3b8', fontSize: '11px' }}>
          {currentStep === 1 && "Baseline state: Village A (HIGH risk 62), Village B (CRITICAL risk 82), Road R12 OPEN."}
          {currentStep === 2 && "Monsoon surge pushed rainfall to 145mm. Risk escalated to CRITICAL (91/100). Response priorities recalculated."}
          {currentStep === 3 && "Citizen report: 'Bridge near Village A is blocked'. AI parsed: Severity HIGH, Road BLOCKED, Confidence 94%."}
          {currentStep === 4 && "Road R12 marked BLOCKED. Settlement A accessibility downgraded to CUT_OFF on primary artery."}
          {currentStep === 5 && "Route rechecked: Original route INVALID. Alternative route generated via R7 High-Ridge Bypass (VALID)."}
          {currentStep === 6 && "Coordinated response locked: #1 Village B, #2 Village A. Recommended Rescue Boat 02. AI decision explained."}
        </span>
      </div>
    </div>
  );
}
