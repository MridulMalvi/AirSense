import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FALLBACK_ZONES, getAQIColor, getAQICategory, SOURCE_COLORS } from '../constants/zones';

const DELHI_CENTER = [28.6139, 77.2090];

/**
 * MapView — Dark Leaflet map of Delhi with AQI-colored zone markers.
 *
 * Props:
 *   zones: enriched zone objects with currentAQI, dominantSource, attributionConfidence
 *   onZoneClick: (zoneId: string) => void
 *   selectedZone: string | null
 */
function getTrafficColor(congestionIndex) {
  if (congestionIndex == null) return '#64748b';
  if (congestionIndex < 0.35) return '#22c55e';
  if (congestionIndex < 0.7) return '#f97316';
  return '#b91c1c';
}

export default function MapView({ zones = [], onZoneClick, selectedZone, traffic = [] }) {
  const [showTraffic, setShowTraffic] = useState(false);

  // Merge API zone data over the fallback coords
  const enriched = FALLBACK_ZONES.map((fz) => {
    const live = zones.find((z) => z.zoneId === fz.zoneId) || {};
    const trafficData = traffic.find((t) => t.zoneId === fz.zoneId) || live.traffic;
    return { ...fz, ...live, traffic: trafficData };
  });

  return (
    <div className="map-wrap" style={{ height: '440px' }}>
      <MapContainer
        center={DELHI_CENTER}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        {enriched.map((zone) => {
          const aqi = zone.currentAQI || null;  // null = not yet loaded; don't fallback to misleading 200
          const aqiColor = getAQIColor(aqi);
          const trafficColor = getTrafficColor(zone.traffic?.congestionIndex);
          const srcColor = showTraffic
            ? trafficColor
            : zone.dominantSource ? (SOURCE_COLORS[zone.dominantSource] || '#64748b') : aqiColor;
          const isSelected = selectedZone === zone.zoneId;

          return (
            <CircleMarker
              key={zone.zoneId}
              center={[zone.lat, zone.lng]}
              radius={isSelected ? 22 : 16}
              pathOptions={{
                fillColor: srcColor,
                fillOpacity: isSelected ? 0.9 : 0.72,
                color: isSelected ? '#ffffff' : srcColor,
                weight: isSelected ? 3 : 1.5,
              }}
              eventHandlers={{ click: () => onZoneClick && onZoneClick(zone.zoneId) }}
            >
              <Popup>
                <div style={{ minWidth: 190 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                    {zone.name}
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: aqi ? aqiColor : '#64748b', lineHeight: 1 }}>
                    {aqi ? `AQI ${aqi}` : 'AQI —'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem' }}>
                    {aqi ? getAQICategory(aqi) : 'Loading live data…'}
                  </div>
                  {zone.dominantSource && (
                    <div style={{ fontSize: '0.78rem', borderTop: '1px solid #333', paddingTop: '0.35rem', marginTop: '0.2rem' }}>
                      <span style={{ color: srcColor, fontWeight: 600 }}>
                        ● {zone.dominantSource.charAt(0).toUpperCase() + zone.dominantSource.slice(1)}
                      </span>
                      {zone.attributionConfidence && (
                        <span style={{ color: '#888' }}>
                          {' '}({Math.round(zone.attributionConfidence * 100)}% confidence)
                        </span>
                      )}
                    </div>
                  )}
                  {zone.traffic && (
                    <div style={{ fontSize: '0.76rem', borderTop: '1px solid #333', paddingTop: '0.35rem', marginTop: '0.35rem', color: '#888' }}>
                      <div style={{ color: trafficColor, fontWeight: 700 }}>
                        Traffic congestion: {Math.round((zone.traffic.congestionIndex ?? 0.5) * 100)}%
                      </div>
                      <div>
                        {zone.traffic.currentSpeed != null
                          ? `${zone.traffic.currentSpeed} km/h now · ${zone.traffic.freeFlowSpeed} km/h free-flow`
                          : 'Fallback traffic estimate'}
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      onClick={() => onZoneClick && onZoneClick(zone.zoneId)}
                      style={{
                        width: '100%', padding: '0.3rem 0.6rem', borderRadius: '6px',
                        background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)',
                        color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      View Forecast & Attribution →
                    </button>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <button
        className={`btn btn-ghost${showTraffic ? ' active' : ''}`}
        onClick={() => setShowTraffic(prev => !prev)}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 500,
          background: 'rgba(7,13,26,0.88)',
          fontSize: '0.72rem',
          padding: '0.38rem 0.7rem',
        }}
      >
        Traffic Layer
      </button>

      {/* AQI Legend */}
      <div className="map-legend">
        <div style={{ fontWeight: 600, color: '#7b91b0', marginBottom: '0.25rem', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {showTraffic ? 'Traffic Congestion' : 'Source Attribution'}
        </div>
        {(showTraffic ? [
          { color: '#22c55e', label: 'Free' },
          { color: '#f97316', label: 'Congested' },
          { color: '#b91c1c', label: 'Gridlock' },
          { color: '#64748b', label: 'Fallback/Loading' },
        ] : [
          { color: '#ef4444', label: 'Traffic' },
          { color: '#f97316', label: 'Industrial' },
          { color: '#a16207', label: 'Construction' },
          { color: '#64748b', label: 'Unknown/Loading' },
        ]).map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="legend-dot" style={{ background: color }} />
            <span style={{ color: '#7b91b0' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
