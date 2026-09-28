import React, { useState } from 'react';
import { 
  MapPin, 
  Layers, 
  AlertTriangle, 
  Compass, 
  Eye, 
  Info,
  ShieldCheck,
  Truck,
  Droplets,
  Mountain,
  Users
} from 'lucide-react';
import MapView from '../components/MapView';

export default function DisasterMapPage({ systemState, onToggleRoad }) {
  const [selectedSettlement, setSelectedSettlement] = useState(systemState?.settlements?.[0] || null);

  const settlements = systemState?.settlements || [];
  const roads = systemState?.roads || [];
  const resources = systemState?.resources || [];
  const route = systemState?.route || null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', height: 'calc(100vh - 128px)', overflow: 'hidden' }}>
      
      {/* Fullscreen Interactive Map */}
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <MapView 
          settlements={settlements}
          roads={roads}
          resources={resources}
          route={route}
          onSelectSettlement={setSelectedSettlement}
          height="100%"
        />

        {/* Floating Quick Action overlay on Map */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '60px',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(6px)',
          color: 'white',
          padding: '8px 14px',
          borderRadius: '8px',
          zIndex: 400,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={14} style={{ color: '#38bdf8' }} />
            <span style={{ fontWeight: 700 }}>Pune District Basin GIS</span>
          </div>
          <span style={{ color: '#475569' }}>|</span>
          <span style={{ color: '#94a3b8' }}>Settlements: {settlements.length}</span>
          <span style={{ color: '#475569' }}>|</span>
          <span style={{ color: '#94a3b8' }}>Road Segments: {roads.length}</span>
        </div>
      </div>

      {/* Right Drawer: Settlement Detailed Inspector */}
      <div style={{ 
        background: '#ffffff', 
        borderLeft: '1px solid #cbd5e1', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        overflowY: 'auto'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            GIS Feature Inspector
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {selectedSettlement ? selectedSettlement.name : 'Select a Settlement'}
          </div>
          {selectedSettlement && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <span className={`status-badge ${selectedSettlement.riskStatus === 'CRITICAL' ? 'badge-critical' : selectedSettlement.riskStatus === 'HIGH' ? 'badge-high' : 'badge-moderate'}`}>
                Risk: {selectedSettlement.riskScore}/100 ({selectedSettlement.riskStatus})
              </span>
              <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                Priority #{selectedSettlement.priorityRank}
              </span>
            </div>
          )}
        </div>

        {selectedSettlement ? (
          <div style={{ padding: '16px 20px' }}>
            {/* Key Metric Gauges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={12} />
                  <span>Population</span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
                  {selectedSettlement.population.toLocaleString()}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mountain size={12} />
                  <span>Elevation</span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
                  {selectedSettlement.elevation} m
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Droplets size={12} />
                  <span>Rainfall (mm)</span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                  {selectedSettlement.rainfall} mm
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Droplets size={12} />
                  <span>River Gauge</span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: selectedSettlement.waterLevel === 'CRITICAL' ? '#dc2626' : '#ea580c', marginTop: '2px' }}>
                  {selectedSettlement.waterLevelMeters} m ({selectedSettlement.waterLevel})
                </div>
              </div>
            </div>

            {/* Road Accessibility Status */}
            <div style={{ background: selectedSettlement.accessibility === 'CUT_OFF' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${selectedSettlement.accessibility === 'CUT_OFF' ? '#fca5a5' : '#86efac'}`, padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: selectedSettlement.accessibility === 'CUT_OFF' ? '#991b1b' : '#166534' }}>
                  Road Accessibility
                </span>
                <b style={{ fontSize: '12px', color: selectedSettlement.accessibility === 'CUT_OFF' ? '#dc2626' : '#16a34a' }}>
                  {selectedSettlement.accessibility}
                </b>
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                {selectedSettlement.accessibility === 'CUT_OFF' 
                  ? '⚠️ Direct causeway impassable. Surface rescue requires high-ridge bypass or boat units.'
                  : '✓ Primary access corridors currently open and verified.'}
              </div>
            </div>

            {/* Contributing Evidence */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Contributing Evidence Factors:
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                {(selectedSettlement.whyExplanation || []).map((ev, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{ev}</li>
                ))}
              </ul>
            </div>

            {/* Settlement Quick Select List */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.4px' }}>
                All District Settlements:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {settlements.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSettlement(s)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: selectedSettlement.id === s.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: selectedSettlement.id === s.id ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Pop: {s.population.toLocaleString()} | Elev: {s.elevation}m</div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: s.riskStatus === 'CRITICAL' ? '#fee2e2' : s.riskStatus === 'HIGH' ? '#ffedd5' : '#fef9c3',
                      color: s.riskStatus === 'CRITICAL' ? '#dc2626' : s.riskStatus === 'HIGH' ? '#ea580c' : '#ca8a04'
                    }}>
                      {s.riskScore}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
            Click on any settlement marker on the map to inspect its real-time telemetry.
          </div>
        )}
      </div>

    </div>
  );
}
