import React from 'react';
import { SOURCE_ICONS, SOURCE_COLORS, getAQIColor } from '../constants/zones';

function getPriorityClass(score) {
  if (score >= 0.7) return 'priority-high';
  if (score >= 0.4) return 'priority-medium';
  return 'priority-low';
}

function getRankStyle(rank) {
  if (rank === 1) return { background: 'rgba(239,68,68,0.18)', color: '#ef4444' };
  if (rank === 2) return { background: 'rgba(249,115,22,0.18)', color: '#f97316' };
  if (rank === 3) return { background: 'rgba(245,158,11,0.18)', color: '#f59e0b' };
  return { background: 'rgba(100,116,139,0.12)', color: '#64748b' };
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="skeleton" style={{ height: 88, borderRadius: 14 }} />
      ))}
    </div>
  );
}

/**
 * EnforcementList — Ranked enforcement priority cards.
 * Props:
 *   priorities: [{ zoneId, name, score, rank, reason, evidence }]
 *   selectedZone: string
 *   onZoneClick: (zoneId) => void
 *   loading: bool
 *   error: string | null
 */
export default function EnforcementList({ priorities = [], selectedZone, onZoneClick, loading, error }) {
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return <div className="error-msg">Could not load enforcement priorities. Backend may be starting up.</div>;
  }

  if (!priorities.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🚨</div>
        <div>No enforcement data available yet.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {/* Response Time Impact Strip — Business Impact (25%) criterion */}
      <div style={{
        display: 'flex', gap: '0.5rem', alignItems: 'stretch',
        padding: '0.6rem 0.85rem',
        background: 'linear-gradient(90deg, rgba(59,130,246,0.06) 0%, rgba(6,182,212,0.06) 100%)',
        border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: 10, fontSize: '0.72rem',
      }}>
        <div style={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '0.75rem' }}>
          <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: '0.15rem' }}>⏱ Without AirSense</div>
          <div style={{ color: '#4a5d78' }}>Days to identify hotspot + route inspectors</div>
        </div>
        <div style={{ flex: 1, paddingLeft: '0.75rem' }}>
          <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: '0.15rem' }}>⚡ With AirSense</div>
          <div style={{ color: '#4a5d78' }}>&lt; 2 hrs from signal to field action</div>
        </div>
      </div>

      {priorities.map((item) => {
        const srcColor = item.evidence?.dominantSource
          ? (SOURCE_COLORS[item.evidence.dominantSource] || '#64748b')
          : '#64748b';
        const aqiColor = getAQIColor(item.evidence?.aqi);
        const isSelected = selectedZone === item.zoneId;

        return (
          <div
            key={item.zoneId}
            className={`enforcement-card${isSelected ? ' selected' : ''}`}
            onClick={() => onZoneClick && onZoneClick(item.zoneId)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onZoneClick && onZoneClick(item.zoneId)}
          >
            {/* Rank bubble */}
            <div className="rank-bubble" style={getRankStyle(item.rank)}>
              #{item.rank}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700 }}>{item.name || item.zoneId}</h3>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', flexShrink: 0 }}>
                  <span className={`tag ${getPriorityClass(item.score)}`}>
                    Score {Math.round(item.score * 100)}
                  </span>
                  <span style={{ background: `${aqiColor}18`, color: aqiColor, border: `1px solid ${aqiColor}35` }}
                    className="tag">
                    AQI {item.evidence?.aqi}
                  </span>
                  {item.evidence?.dominantSource && (
                    <span style={{ background: `${srcColor}15`, color: srcColor, border: `1px solid ${srcColor}30` }} className="tag">
                      {SOURCE_ICONS[item.evidence.dominantSource]} {item.evidence.dominantSource}
                    </span>
                  )}
                </div>
              </div>

              {/* Reason */}
              <p style={{ fontSize: '0.8rem', color: '#7b91b0', lineHeight: 1.55, marginBottom: '0.45rem' }}>
                {item.reason}
              </p>

              {/* Evidence row */}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: '#4a5d78', flexWrap: 'wrap' }}>
                {item.evidence?.population != null && (
                  <span>👥 {item.evidence.population.toLocaleString()} residents</span>
                )}
                {item.evidence?.attributionConfidence != null && (
                  <span>🎯 {Math.round(item.evidence.attributionConfidence * 100)}% attribution confidence</span>
                )}
                {item.evidence?.aqiCategory && (
                  <span>📊 {item.evidence.aqiCategory}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
