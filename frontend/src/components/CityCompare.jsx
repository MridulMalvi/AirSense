import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { getAQICategory } from '../constants/zones';

const CITY_PALETTE = {
  delhi:   '#3b82f6',
  mumbai:  '#10b981',
  kolkata: '#f59e0b',
  bangalore: '#8b5cf6',
  hyderabad: '#ec4899',
};

function avg(arr) {
  if (!arr?.length) return 0;
  return Math.round(arr.reduce((s, x) => s + x.aqi, 0) / arr.length);
}

function trend(arr) {
  if (!arr || arr.length < 4) return 'stable';
  const half = Math.floor(arr.length / 2);
  const first = avg(arr.slice(0, half));
  const second = avg(arr.slice(half));
  if (second < first - 5)  return '📉 Improving';
  if (second > first + 5)  return '📈 Worsening';
  return '➡️ Stable';
}

function LoadingSkeleton() {
  return (
    <div>
      <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: '0.75rem' }} />
      <div className="skeleton" style={{ height: 260, width: '100%', borderRadius: 8 }} />
      <div className="skeleton" style={{ height: 80, width: '100%', marginTop: '1rem', borderRadius: 8 }} />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0d1526', border: '1px solid #1e2d45', borderRadius: 10, padding: '0.6rem 0.9rem', fontSize: '0.8rem' }}>
      <div style={{ color: '#7b91b0', marginBottom: '0.3rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.name.charAt(0).toUpperCase() + p.name.slice(1)}: {p.value} ({getAQICategory(p.value)})
        </div>
      ))}
    </div>
  );
};

/**
 * CityCompare — Multi-line historical AQI comparison with summary table.
 * Props:
 *   cities: [{ name, historicalAQI: [{ date, aqi }], isLive, dataNote }]
 *   selectedCities: string[]
 *   onToggleCity: (name) => void
 *   loading: bool
 *   error: string | null
 */
export default function CityCompare({ cities = [], selectedCities, onToggleCity, loading, error }) {
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return <div className="error-msg">Could not load city comparison data. Please try again.</div>;
  }

  // Filter to selected
  const visible = selectedCities
    ? cities.filter(c => selectedCities.includes(c.name))
    : cities;

  if (!visible.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🌆</div>
        <div>Select at least one city to compare.</div>
      </div>
    );
  }

  // Merge dates
  const dateMap = {};
  visible.forEach(city => {
    (city.historicalAQI || []).forEach(({ date, aqi }) => {
      if (!dateMap[date]) dateMap[date] = { date };
      dateMap[date][city.name] = aqi;
    });
  });
  const chartData = Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div>
      {/* City toggles */}
      {onToggleCity && (
        <div className="city-toggle-group" style={{ marginBottom: '1rem' }}>
          {cities.map(city => {
            const color = CITY_PALETTE[city.name] || '#94a3b8';
            const active = !selectedCities || selectedCities.includes(city.name);
            return (
              <button
                key={city.name}
                className="btn btn-ghost"
                style={{
                  borderColor: active ? color : undefined,
                  color: active ? color : undefined,
                  background: active ? `${color}15` : undefined,
                  fontSize: '0.8rem',
                  padding: '0.35rem 0.85rem',
                }}
                onClick={() => onToggleCity(city.name)}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: active ? color : '#2d4266', display: 'inline-block' }} />
                {' '}{city.name.charAt(0).toUpperCase() + city.name.slice(1)}
                {city.isLive
                  ? <span className="tag tag-green" style={{ marginLeft: '0.25rem' }}>live</span>
                  : <span className="tag tag-muted" style={{ marginLeft: '0.25rem' }}>historical</span>
                }
              </button>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: '0.72rem', color: '#4a5d78', marginBottom: '0.85rem' }}>
        ⚠️ Delhi shown with live AQI pipeline — other cities use historical CPCB archives (not live forecasting). Dashed lines = historical.
      </p>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
          <XAxis dataKey="date" tick={{ fill: '#4a5d78', fontSize: 10 }} tickFormatter={v => v.slice(5)} tickLine={false} />
          <YAxis tick={{ fill: '#4a5d78', fontSize: 10 }} tickLine={false} axisLine={false}
            label={{ value: 'AQI', angle: -90, position: 'insideLeft', fill: '#4a5d78', fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.78rem', color: '#7b91b0' }} iconType="circle" iconSize={8} />
          <ReferenceLine y={200} stroke="#f97316" strokeDasharray="4 3" strokeWidth={1}
            label={{ value: 'Poor', fill: '#f97316', fontSize: 9, position: 'right' }} />
          {visible.map(city => {
            const color = CITY_PALETTE[city.name] || '#94a3b8';
            return (
              <Line key={city.name} type="monotone" dataKey={city.name}
                stroke={color} strokeWidth={city.isLive ? 2.5 : 1.8}
                strokeDasharray={city.isLive ? '0' : '6 4'}
                dot={false} name={city.name}
                activeDot={{ r: 5, fill: color }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      {/* Summary table */}
      <table className="summary-table" style={{ marginTop: '1.25rem' }}>
        <thead>
          <tr>
            <th>City</th>
            <th>Avg AQI</th>
            <th>Min AQI</th>
            <th>Max AQI</th>
            <th>Trend</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(city => {
            const hist = city.historicalAQI || [];
            const color = CITY_PALETTE[city.name] || '#94a3b8';
            const aqis  = hist.map(h => h.aqi);
            return (
              <tr key={city.name}>
                <td>
                  <span style={{ color, fontWeight: 600 }}>
                    ● {city.name.charAt(0).toUpperCase() + city.name.slice(1)}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{avg(hist)}</td>
                <td style={{ color: '#22c55e' }}>{aqis.length ? Math.min(...aqis) : '—'}</td>
                <td style={{ color: '#ef4444' }}>{aqis.length ? Math.max(...aqis) : '—'}</td>
                <td style={{ fontSize: '0.82rem' }}>{trend(hist)}</td>
                <td>
                  {city.isLive
                    ? <span className="tag tag-green">🟢 Live</span>
                    : <span className="tag tag-muted">📁 Historical</span>
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
