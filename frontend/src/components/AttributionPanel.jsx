import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SOURCE_COLORS, SOURCE_ICONS } from '../constants/zones';

function LoadingSkeleton() {
  return (
    <div style={{ padding: '0.5rem 0' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ marginBottom: '0.75rem' }}>
          <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: '0.3rem' }} />
          <div className="skeleton" style={{ height: 7, width: '100%', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={{
      background: '#0d1526', border: '1px solid #1e2d45',
      borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.8rem',
    }}>
      <div style={{ fontWeight: 600 }}>{name}</div>
      <div style={{ color: '#7b91b0' }}>{Math.round(value * 100)}%</div>
    </div>
  );
};

/**
 * AttributionPanel — Source attribution bars + pie chart.
 * Props:
 *   zoneId: string
 *   sources: [{ category, confidence, evidence }]
 *   dominantSource: string
 *   windDirection: string
 *   windSpeed: number
 *   loading: bool
 *   error: string | null
 */
export default function AttributionPanel({
  zoneId, sources = [], dominantSource, windDirection, windSpeed,
  currentAQI, weatherDataSource, aqiSource, traffic, dataFreshness, lastUpdated, loading, error
}) {
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div>Attribution data unavailable for this zone.</div>
      </div>
    );
  }

  if (!sources.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🗺️</div>
        <div>Select a zone to see pollution source attribution.</div>
      </div>
    );
  }

  const pieData = sources.map(s => ({
    name: s.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: s.confidence,
    color: SOURCE_COLORS[s.category] || '#64748b',
  }));

  return (
    <div>
      <div style={{ marginBottom: '0.85rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.35rem' }}>
          Pollution Source Attribution
          <span style={{ color: '#7b91b0', fontWeight: 400, fontSize: '0.8rem', marginLeft: '0.4rem' }}>
            — {zoneId?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </span>
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {dominantSource && (
            <span className="tag tag-orange">
              {SOURCE_ICONS[dominantSource] || '●'} Dominant: {dominantSource}
            </span>
          )}
          {windDirection && (
            <span className="tag tag-blue">
              🌬️ {windDirection} {windSpeed ? `${windSpeed} m/s` : ''}
            </span>
          )}
          {currentAQI && (
            <span className="tag" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>
              AQI {currentAQI}
            </span>
          )}
          {/* Live data provenance badges */}
          {aqiSource === 'live-owm' && (
            <span className="tag" style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: '0.65rem' }}>
              🔴 Live AQI · OpenWeatherMap
            </span>
          )}
          {weatherDataSource === 'live' && (
            <span className="tag" style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: '0.65rem' }}>
              🌐 Live Weather
            </span>
          )}
          {(aqiSource === 'csv-fallback' || weatherDataSource === 'csv-fallback') && (
            <span className="tag tag-muted" style={{ fontSize: '0.65rem' }}>📄 Sample data</span>
          )}
          {traffic && (
            <span className={traffic.isLive ? 'tag tag-green' : 'tag tag-muted'} style={{ fontSize: '0.65rem' }}>
              TomTom traffic {Math.round((traffic.congestionIndex ?? 0.5) * 100)}%
            </span>
          )}
          {dataFreshness && (
            <span className={dataFreshness === 'fresh' ? 'tag tag-green' : 'tag tag-amber'} style={{ fontSize: '0.65rem' }}>
              {dataFreshness}
            </span>
          )}
        </div>
      </div>

      {/* Horizontal bar breakdown */}
      <div className="attr-bar-row" style={{ marginBottom: '1rem' }}>
        {sources.map((src) => {
          const color = SOURCE_COLORS[src.category] || '#64748b';
          const icon  = SOURCE_ICONS[src.category]  || '●';
          const pct   = Math.round(src.confidence * 100);
          return (
            <div key={src.category} className="attr-bar-item">
              <div className="attr-bar-label">
                <span style={{ color: color, fontWeight: 600 }}>
                  {icon} {src.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span style={{ fontWeight: 700, color: color }}>{pct}%</span>
              </div>
              <div className="attr-bar-track">
                <div
                  className="attr-bar-fill"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              {src.evidence && (
                <div style={{ fontSize: '0.68rem', color: '#4a5d78', marginTop: '0.2rem' }}>
                  {src.evidence}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pie chart */}
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={3}
            dataKey="value"
          >
            {pieData.map((entry, i) => (
              <Cell key={i} fill={entry.color} opacity={0.85} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '0.75rem', color: '#7b91b0' }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>

      <p style={{ fontSize: '0.68rem', color: '#4a5d78', marginTop: '0.25rem', textAlign: 'center' }}>
        ℹ️ Scores computed from live OpenWeather pollutant ratios + land-use + time-of-day + seasonal factors + TomTom traffic where configured.
        Fully explainable — no black-box model.
        {lastUpdated ? ` Last updated ${new Date(lastUpdated).toLocaleTimeString()}.` : ''}
      </p>
    </div>
  );
}
