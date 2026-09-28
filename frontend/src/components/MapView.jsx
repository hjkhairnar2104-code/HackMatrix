import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function MapView({ 
  settlements = [], 
  roads = [], 
  resources = [], 
  route = null, 
  onSelectSettlement = null,
  height = '520px'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center on Pune District (Mula-Pawana-Mutha basin)
      const map = L.map(mapContainerRef.current, {
        center: [18.5780, 73.7950],
        zoom: 13,
        zoomControl: true
      });

      // Dark / OpenStreetMap clean tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | ResQGrid Decision Platform',
        maxZoom: 18,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup if unmounted
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Layers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    // 1. Draw Roads
    roads.forEach((road) => {
      if (!road.coordinates || road.coordinates.length < 2) return;

      let color = '#10b981'; // OPEN (green)
      let dashArray = null;
      let weight = 4;
      let opacity = 0.8;

      if (road.status === 'BLOCKED') {
        color = '#ef4444'; // BLOCKED (red)
        dashArray = '6, 6';
        weight = 5;
        opacity = 0.95;
      } else if (road.status === 'AT_RISK') {
        color = '#f59e0b'; // AT RISK (orange)
        weight = 4;
      }

      const polyline = L.polyline(road.coordinates, {
        color,
        weight,
        dashArray,
        opacity
      });

      polyline.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong style="font-size: 13px;">${road.name}</strong><br/>
          <span>Status: </span><b style="color: ${color}">${road.status}</b><br/>
          <span>Distance: ${road.distanceKm} km</span><br/>
          <span>Accessibility: ${road.accessibility}</span>
        </div>
      `);

      layerGroup.addLayer(polyline);

      // If blocked, put a blockage icon at midpoint
      if (road.status === 'BLOCKED') {
        const midIdx = Math.floor(road.coordinates.length / 2);
        const midCoord = road.coordinates[midIdx];
        const blockIcon = L.divIcon({
          className: 'custom-road-block-marker',
          html: `<div style="background: #dc2626; color: white; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">✕</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        const blockMarker = L.marker(midCoord, { icon: blockIcon });
        blockMarker.bindPopup(`<b>ROAD BLOCKED</b><br/>${road.name} is submerged.`);
        layerGroup.addLayer(blockMarker);
      }
    });

    // 2. Draw Active Rescue Routes
    if (route) {
      // Original Route
      if (route.originalCoordinates && route.originalCoordinates.length >= 2) {
        const isInvalid = route.originalRouteStatus === 'INVALID';
        const origPoly = L.polyline(route.originalCoordinates, {
          color: isInvalid ? '#dc2626' : '#2563eb',
          weight: 6,
          dashArray: isInvalid ? '8, 8' : null,
          opacity: isInvalid ? 0.7 : 0.9
        });
        origPoly.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <strong>Original Route</strong><br/>
            Status: <b style="color: ${isInvalid ? '#dc2626' : '#16a34a'}">${route.originalRouteStatus}</b><br/>
            ${isInvalid ? '⚠️ Compromised by flood blockage on R12' : 'Direct emergency corridor open'}
          </div>
        `);
        layerGroup.addLayer(origPoly);
      }

      // Alternative Route (if available)
      if (route.alternativeCoordinates && route.alternativeCoordinates.length >= 2) {
        const altPoly = L.polyline(route.alternativeCoordinates, {
          color: '#2563eb',
          weight: 6,
          opacity: 0.95
        });
        altPoly.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <strong style="color: #2563eb;">✓ Alternative Route (High-Ridge Bypass)</strong><br/>
            Status: <b>VALID (ACTIVE DIVERSION)</b><br/>
            Distance: ${route.distanceKm} km | ETA: ${route.etaMinutes} min<br/>
            <span>Clearance: Elevated ridge terrain avoids flood inundation.</span>
          </div>
        `);
        layerGroup.addLayer(altPoly);
      }
    }

    // 3. Draw Settlements
    settlements.forEach((s) => {
      let pinColor = '#16a34a';
      let haloClass = '';
      if (s.riskStatus === 'CRITICAL') {
        pinColor = '#dc2626';
        haloClass = 'pulse-ring-critical';
      } else if (s.riskStatus === 'HIGH') {
        pinColor = '#ea580c';
        haloClass = 'pulse-ring-high';
      } else if (s.riskStatus === 'MODERATE') {
        pinColor = '#d97706';
      }

      // Translucent risk circle buffer
      const circle = L.circle([s.latitude, s.longitude], {
        radius: s.riskStatus === 'CRITICAL' ? 1200 : 800,
        color: pinColor,
        fillColor: pinColor,
        fillOpacity: s.riskStatus === 'CRITICAL' ? 0.22 : 0.12,
        weight: 1
      });
      layerGroup.addLayer(circle);

      // Custom Settlement Marker with Priority Rank
      const icon = L.divIcon({
        className: 'custom-settlement-icon',
        html: `
          <div style="position: relative; cursor: pointer;">
            <div style="
              background: ${pinColor}; 
              color: white; 
              border: 2px solid #ffffff; 
              border-radius: 50%; 
              width: 32px; 
              height: 32px; 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center; 
              font-size: 11px; 
              font-weight: 800; 
              box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            ">
              #${s.priorityRank || 1}
            </div>
            <div style="
              background: rgba(15, 23, 42, 0.85); 
              color: #ffffff; 
              font-size: 10px; 
              font-weight: 700; 
              padding: 2px 6px; 
              border-radius: 4px; 
              position: absolute; 
              top: 34px; 
              left: 50%; 
              transform: translateX(-50%); 
              white-space: nowrap;
              border: 1px solid rgba(255,255,255,0.2);
            ">
              ${s.name.split(' ')[0]} ${s.name.split(' ')[1] || ''}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([s.latitude, s.longitude], { icon });

      marker.on('click', () => {
        if (onSelectSettlement) onSelectSettlement(s);
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; min-width: 220px; line-height: 1.4;">
          <div style="font-size: 14px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
            ${s.name}
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Response Priority:</span> 
            <b style="color: #2563eb;">#${s.priorityRank} (${s.responsePriority}/100)</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Flood Risk:</span> 
            <b style="color: ${pinColor}">${s.riskScore}/100 (${s.riskStatus})</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Population Exposed:</span> 
            <b>${s.population.toLocaleString()}</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Elevation:</span> 
            <b>${s.elevation} m</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Water Level Gauge:</span> 
            <b>${s.waterLevelMeters} m (${s.waterLevel})</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>Road Access:</span> 
            <b style="color: ${s.accessibility === 'CUT_OFF' ? '#dc2626' : '#16a34a'}">${s.accessibility}</b>
          </div>
          <div style="background: #f8fafc; padding: 6px; border-radius: 4px; font-size: 11px; border: 1px solid #e2e8f0;">
            <b>Contributing Evidence:</b>
            <ul style="margin: 4px 0 0 14px; padding: 0;">
              ${(s.whyExplanation || []).slice(0, 3).map(e => `<li>${e}</li>`).join('')}
            </ul>
          </div>
        </div>
      `);

      layerGroup.addLayer(marker);
    });

    // 4. Draw Emergency Resources
    resources.forEach((res) => {
      let iconSymbol = '🚒';
      if (res.type === 'RESCUE_BOAT') iconSymbol = '🚤';
      if (res.type === 'AMBULANCE') iconSymbol = '🚑';
      if (res.type === 'HOSPITAL') iconSymbol = '🏥';
      if (res.type === 'SHELTER') iconSymbol = '🏠';

      const resIcon = L.divIcon({
        className: 'custom-resource-marker',
        html: `
          <div style="
            background: #1e293b; 
            border: 2px solid #38bdf8; 
            border-radius: 8px; 
            width: 30px; 
            height: 30px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 15px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          ">
            ${iconSymbol}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const resMarker = L.marker([res.latitude, res.longitude], { icon: resIcon });
      resMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <strong style="color: #0284c7;">${res.name}</strong><br/>
          <span>Type: ${res.type}</span><br/>
          <span>Base: ${res.locationName}</span><br/>
          <span>Status: <b style="color: #16a34a">${res.status}</b></span>
        </div>
      `);
      layerGroup.addLayer(resMarker);
    });

  }, [settlements, roads, resources, route]);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div 
        ref={mapContainerRef} 
        style={{ width: '100%', height: '100%', borderRadius: '10px' }} 
      />

      {/* Map Legend Floating Widget */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        background: 'rgba(15, 23, 42, 0.92)',
        color: 'white',
        padding: '10px 14px',
        borderRadius: '8px',
        fontSize: '11px',
        zIndex: 500,
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.15)',
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{ fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>
          GIS Map Layers
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }}></span>
            <span>Critical Flood Risk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ea580c', display: 'inline-block' }}></span>
            <span>High Risk Area</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', background: '#10b981', display: 'inline-block' }}></span>
            <span>Road: OPEN</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', background: '#ef4444', display: 'inline-block' }}></span>
            <span>Road: BLOCKED</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '4px', background: '#2563eb', display: 'inline-block' }}></span>
            <span>Alternative Route</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🚤 / 🚑</span>
            <span>Rescue Units</span>
          </div>
        </div>
      </div>
    </div>
  );
}
