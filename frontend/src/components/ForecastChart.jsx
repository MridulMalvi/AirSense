import React from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { getAQICategory } from '../constants/zones';

function fmt(ts) {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:00`;
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '1rem 0' }}>
      <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: '0.5rem' }} />
      <div className="skeleton" style={{ height: 200, width: '100%', borderRadius: 8 }} />
      <div className="skeleton" style={{ height: 36, width: '100%', marginTop: '0.75rem', borderRadius: 8 }} />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const aqi = payload.find(p => p.dataKey === 'aqi')?.value;
  return (
    <div style={{
      background: '#0d1526', border: '1px solid #1e2d45', borderRadius: 10,
      padding: '0.65rem 0.9rem', fontSize: '0.8rem',
    }}>
      <div style={{ color: '#7b91b0', marginBottom: '0.3rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {Math.round(p.value)}
        </div>
      ))}
      {aqi && (
        <div style={{ color: '#4a5d78', marginTop: '0.25rem', fontSize: '0.72rem' }}>
          {getAQICategory(aqi)}
        </div>
      )}
    </div>
  );
};

/**
 * ForecastChart — AQI forecast line + confidence shading + RMSE comparison.
 * Props:
 *   wardId: string
 *   forecast: [{ timestamp, predictedAQI, confidenceLow, confidenceHigh }]
 *   baselineComparison: { modelRMSE, persistenceRMSE, improvementPercent, modelName }
 *   loading: bool
 *   error: string | null
 */
export default function ForecastChart({ wardId, forecast = [], baselineComparison, loading, error }) {
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📡</div>
        <div>Forecast temporarily unavailable.</div>
        <div style={{ fontSize: '0.75rem', color: '#4a5d78', marginTop: '0.3rem' }}>
          General tip: limit outdoor activity when AQI is above 200.
        </div>
      </div>
    );
  }

  if (!forecast.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🗺️</div>
        <div>Select a zone on the map to view its AQI forecast.</div>
      </div>
    );
  }

  const chartData = forecast.map((pt) => ({
    time: fmt(pt.timestamp),
    aqi: pt.predictedAQI,
    low: pt.confidenceLow,
    high: pt.confidenceHigh,
  }));

  const allValues = forecast.flatMap((p) => [p.predictedAQI, p.confidenceLow, p.confidenceHigh].filter(Boolean));
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const pad = Math.max((dataMax - dataMin) * 0.3, 20);
  const minY = Math.max(0, Math.floor((dataMin - pad) / 10) * 10);
  const maxY = Math.min(500, Math.ceil((dataMax + pad) / 10) * 10);
  const beats = baselineComparison && baselineComparison.modelRMSE < baselineComparison.persistenceRMSE;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '0.85rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.1rem' }}>
          72-hr AQI Forecast
          <span style={{ color: '#7b91b0', fontWeight: 400, fontSize: '0.8rem', marginLeft: '0.4rem' }}>
            — {wardId?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </span>
        </h3>
        <p style={{ fontSize: '0.72rem', color: '#4a5d78' }}>
          Shaded band shows confidence interval · AQI range {minY}–{maxY} shown
          {maxY >= 200 && ' · Reference lines at AQI 200 and 300'}
        </p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="aqiLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
          <XAxis dataKey="time" tick={{ fill: '#4a5d78', fontSize: 10 }} tickLine={false} />
          <YAxis tick={{ fill: '#4a5d78', fontSize: 10 }} domain={[minY, maxY]} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {maxY >= 200 && minY <= 200 && (
            <ReferenceLine y={200} stroke="#f97316" strokeDasharray="5 4" strokeWidth={1.2}
              label={{ value: 'Poor', fill: '#f97316', fontSize: 10, position: 'right' }} />
          )}
          {maxY >= 300 && minY <= 300 && (
            <ReferenceLine y={300} stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.2}
              label={{ value: 'V.Poor', fill: '#ef4444', fontSize: 10, position: 'right' }} />
          )}
          {/* Confidence band */}
          <Area type="monotone" dataKey="high" stroke="none" fill="url(#confBand)" name="High" />
          {/* Main predicted line */}
          <Line type="monotone" dataKey="aqi" stroke="url(#aqiLine)" strokeWidth={2.5}
            dot={false} name="Predicted AQI" activeDot={{ r: 5, fill: '#3b82f6' }} />
          {/* Lower confidence bound */}
          <Line type="monotone" dataKey="low" stroke="#1e40af" strokeWidth={1}
            strokeDasharray="4 3" dot={false} name="Lower bound" />
        </AreaChart>
      </ResponsiveContainer>

      {/* RMSE comparison */}
      {baselineComparison && (
        <div className="rmse-box" style={{ marginTop: '0.85rem' }}>
          <div>
            <div className="rmse-label">Our Model RMSE</div>
            <div className="rmse-model">{baselineComparison.modelRMSE}</div>
          </div>
          <div style={{ color: '#4a5d78', fontSize: '1rem' }}>vs</div>
          <div>
            <div className="rmse-label">Naive Baseline RMSE</div>
            <div className="rmse-baseline">{baselineComparison.persistenceRMSE}</div>
          </div>
          {beats ? (
            <span className="rmse-badge">
              ✅ {baselineComparison.improvementPercent}% better
            </span>
          ) : (
            <span className="tag tag-amber">⚠️ Baseline comparable</span>
          )}
          {baselineComparison.modelName && (
            <span className="tag tag-muted">{baselineComparison.modelName}</span>
          )}
        </div>
      )}
    </div>
  );
}
