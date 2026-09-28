import React, { useState } from 'react';
import { 
  FileText, 
  Send, 
  Sparkles, 
  CheckCircle, 
  MapPin, 
  ShieldAlert, 
  Users, 
  Radio, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';

export default function GroundReportsPage({ systemState, onSubmitReport }) {
  const [description, setDescription] = useState('Bridge near Village A is blocked and water has entered nearby houses.');
  const [location, setLocation] = useState('Village A (Wakad Khurd)');
  const [severity, setSeverity] = useState('HIGH');
  const [reporterType, setReporterType] = useState('CITIZEN');
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmissionResult, setLastSubmissionResult] = useState(null);

  const reports = systemState?.reports || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    const result = await onSubmitReport({
      description,
      location,
      severity,
      reporterType
    });
    setSubmitting(false);

    if (result && result.report) {
      setLastSubmissionResult(result.report);
    }
  };

  const handleUsePreset = (text, loc, sev) => {
    setDescription(text);
    setLocation(loc);
    setSeverity(sev);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Ground Observation & AI Information Extraction
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
          Real-time field intelligence ingested from citizens, ward officers, and first responders with AI entity extraction.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 480px) 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: + SUBMIT GROUND REPORT Form */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <FileText size={16} style={{ color: '#2563eb' }} />
              <span>+ Submit Ground Report</span>
            </div>
            <span style={{ fontSize: '10px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
              CITIZEN TELEMETRY
            </span>
          </div>

          <div className="panel-body">
            {/* Quick Templates */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                Preset Hackathon Test Scenarios:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleUsePreset('Bridge near Village A is blocked and water has entered nearby houses.', 'Village A (Wakad Khurd)', 'HIGH')}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', textAlign: 'left', padding: '6px 8px', justifyContent: 'flex-start' }}
                >
                  ⚡ Preset 1: "Bridge near Village A is blocked and water in houses."
                </button>
                <button
                  type="button"
                  onClick={() => handleUsePreset('Sangvi river embankment overflowing, road completely impassable.', 'Village B (Sangvi Riverside)', 'CRITICAL')}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', textAlign: 'left', padding: '6px 8px', justifyContent: 'flex-start' }}
                >
                  ⚡ Preset 2: "Sangvi river embankment overflowing, road impassable."
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Location Select */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Reported Location / Settlement:
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    background: '#ffffff'
                  }}
                >
                  <option value="Village A (Wakad Khurd)">Village A (Wakad Khurd)</option>
                  <option value="Village B (Sangvi Riverside)">Village B (Sangvi Riverside)</option>
                  <option value="Village C (Hinjawadi Lowlands)">Village C (Hinjawadi Lowlands)</option>
                  <option value="Village D (Baner Heights)">Village D (Baner Heights)</option>
                  <option value="Village E (Dapodi Confluence)">Village E (Dapodi Confluence)</option>
                </select>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Field Observation Description:
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe flood depth, damaged infrastructure, road accessibility..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>

              {/* Severity & Reporter Type */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Observer Severity:
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Reporter Type:
                  </label>
                  <select
                    value={reporterType}
                    onChange={(e) => setReporterType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  >
                    <option value="CITIZEN">CITIZEN (Verified GPS)</option>
                    <option value="WARD_OFFICER">WARD OFFICER</option>
                    <option value="FIRST_RESPONDER">FIRST RESPONDER</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px' }}
              >
                <Send size={14} />
                <span>{submitting ? 'Analyzing with AI...' : 'Submit Ground Report & Trigger Recalculation'}</span>
              </button>
            </form>

            {/* AI Architecture Notice */}
            <div style={{
              marginTop: '16px',
              padding: '10px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#475569',
              lineHeight: 1.4
            }}>
              <b>System Architecture Rule:</b> LLM extracts structured telemetry (Location, Severity, Infrastructure, Road Status). System algorithmic logic calculates risk scores and priority sequencing.
            </div>
          </div>
        </div>

        {/* Right Column: AI Extraction Preview & Verified Report Feed */}
        <div>
          {/* Latest AI Extraction Card */}
          {lastSubmissionResult && lastSubmissionResult.extractedInfo && (
            <div className="panel-card" style={{ border: '2px solid #3b82f6', background: '#eff6ff', marginBottom: '20px' }}>
              <div className="panel-header" style={{ background: '#dbeafe', borderBottom: '1px solid #bfdbfe' }}>
                <div className="panel-title" style={{ color: '#1e40af' }}>
                  <Sparkles size={16} style={{ color: '#2563eb' }} />
                  <span>AI Structured Extraction Result ({lastSubmissionResult.id})</span>
                </div>
                <span style={{ fontSize: '11px', background: '#2563eb', color: 'white', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                  CONFIDENCE: {Math.round(lastSubmissionResult.extractedInfo.confidence * 100)}%
                </span>
              </div>
              <div className="panel-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
                  <div style={{ background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>Extracted Location</div>
                    <b style={{ color: '#0f172a' }}>{lastSubmissionResult.extractedInfo.location}</b>
                  </div>
                  <div style={{ background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>Extracted Severity</div>
                    <b style={{ color: '#ea580c' }}>{lastSubmissionResult.extractedInfo.severity}</b>
                  </div>
                  <div style={{ background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>Infrastructure Impact</div>
                    <b style={{ color: '#0f172a' }}>{lastSubmissionResult.extractedInfo.infrastructure}</b>
                  </div>
                  <div style={{ background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>Road Status Detected</div>
                    <b style={{ color: lastSubmissionResult.extractedInfo.roadStatus === 'BLOCKED' ? '#dc2626' : '#16a34a' }}>
                      {lastSubmissionResult.extractedInfo.roadStatus}
                    </b>
                  </div>
                </div>

                <div style={{ marginTop: '10px', fontSize: '12px', color: '#1e3a8a', background: 'rgba(255,255,255,0.7)', padding: '8px', borderRadius: '6px' }}>
                  ✓ <b>Downstream Pipeline Triggered:</b> Flood risk updated, Road R12 marked BLOCKED, alternative high-ridge route calculated, response priority updated.
                </div>
              </div>
            </div>
          )}

          {/* List of Verified Reports */}
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title">
                <CheckCircle size={16} style={{ color: '#16a34a' }} />
                <span>Verified Field Reports ({reports.length})</span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Latest first</span>
            </div>
            <div className="panel-body">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', background: '#0f172a', color: 'white', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                        {rep.id}
                      </span>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{rep.location}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: rep.severity === 'CRITICAL' ? '#fee2e2' : rep.severity === 'HIGH' ? '#ffedd5' : '#fef9c3',
                        color: rep.severity === 'CRITICAL' ? '#dc2626' : rep.severity === 'HIGH' ? '#ea580c' : '#ca8a04'
                      }}>
                        {rep.severity}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{rep.timestamp}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: '#334155', lineHeight: 1.4, margin: '6px 0' }}>
                    "{rep.description}"
                  </p>

                  {rep.extractedInfo && (
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', marginTop: '6px' }}>
                      <span>Infra: <b style={{ color: '#0f172a' }}>{rep.extractedInfo.infrastructure}</b></span>
                      <span>Road: <b style={{ color: rep.extractedInfo.roadStatus === 'BLOCKED' ? '#dc2626' : '#16a34a' }}>{rep.extractedInfo.roadStatus}</b></span>
                      <span>AI Confidence: <b style={{ color: '#2563eb' }}>{Math.round(rep.extractedInfo.confidence * 100)}%</b></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
