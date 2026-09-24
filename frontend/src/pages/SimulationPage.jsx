import React, { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FALLBACK_ZONES } from '../constants/zones';
import { runSimulation } from '../services/api';

/* ── Custom slider label component ────────────────────────── */
function SliderField({ label, value, setter, unit = '%' }) {
  const pct = value;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div className="form-label" style={{ marginBottom: 0 }}>{label}</div>
        <span style={{
          fontSize: '0.82rem',
          fontWeight: 700,
          color: pct > 0 ? 'var(--accent-blue)' : 'var(--text-muted)',
          background: pct > 0 ? 'var(--accent-blue-dim)' : 'transparent',
          padding: '0.15rem 0.55rem',
          borderRadius: '20px',
          border: pct > 0 ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
          minWidth: 42,
          textAlign: 'center',
          transition: 'all 0.2s',
        }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={e => setter(Number(e.target.value))}
        style={{
          width: '100%',
          background: `linear-gradient(to right, var(--accent-blue) ${pct}%, var(--border) ${pct}%)`,
        }}
      />
    </div>
  );
}

/* ── Custom chart tooltip ──────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '0.6rem 0.9rem',
      fontSize: '0.8rem',
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>Hour {label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.stroke, fontWeight: 600, display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
          <span>{p.name}</span>
          <span>{p.value?.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

export default function SimulationPage() {
  const [zoneId, setZoneId] = useState('anand-vihar');
  const [forecastHours, setForecastHours] = useState(48);
  const [trafficDiversion, setTrafficDiversion] = useState(30);
  const [constructionReduction, setConstructionReduction] = useState(50);
  const [industrialReduction, setIndustrialReduction] = useState(0);
  const [haltConstruction, setHaltConstruction] = useState(false);
  const [industrialShutdown, setIndustrialShutdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await runSimulation({
        ward_ids: [zoneId],
        forecast_hours: forecastHours,
        interventions: {
          traffic_diversion_percent: trafficDiversion,
          construction_reduction_percent: constructionReduction,
          industrial_reduction_percent: industrialReduction,
          halt_construction: haltConstruction,
          industrial_shutdown: industrialShutdown,
        },
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Simulation unavailable.');
    } finally {
      setLoading(false);
    }
  }

  const chartData = result?.baseline_aqi?.map((point, index) => ({
    hour: point.hour,
    baseline: point.aqi,
    simulated: result.simulated_aqi?.[index]?.aqi,
  })) || [];

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="page-header">
        <span className="page-header-badge">📈 Policy Simulator</span>
        <h1>What-If Simulation</h1>
        <p>
          Test intervention scenarios using live AQI, weather, TomTom traffic, and a lightweight scenario model.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,0.8fr) minmax(0,1.2fr)', gap: '1.1rem' }}>
        {/* ── Scenario controls form ─────────────────────────── */}
        <form className="card fade-slide-up" onSubmit={submit}>
          <div className="card-title">🎛️ Scenario Controls</div>
          <div style={{ display: 'grid', gap: '1.1rem' }}>

            {/* Zone */}
            <div>
              <div className="form-label">Zone</div>
              <select
                id="sim-zone-select"
                className="form-select"
                value={zoneId}
                onChange={e => setZoneId(e.target.value)}
              >
                {FALLBACK_ZONES.map(zone => (
                  <option key={zone.zoneId} value={zone.zoneId}>{zone.name}</option>
                ))}
              </select>
            </div>

            {/* Forecast window */}
            <div>
              <div className="form-label">Forecast Window</div>
              <select
                id="sim-horizon-select"
                className="form-select"
                value={forecastHours}
                onChange={e => setForecastHours(Number(e.target.value))}
              >
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
              </select>
            </div>

            {/* Sliders */}
            <SliderField label="Traffic Diversion"       value={trafficDiversion}       setter={setTrafficDiversion}       />
            <SliderField label="Construction Reduction"  value={constructionReduction}  setter={setConstructionReduction}  />
            <SliderField label="Industrial Reduction"    value={industrialReduction}    setter={setIndustrialReduction}    />

            {/* Toggle switches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={haltConstruction}
                  onChange={e => setHaltConstruction(e.target.checked)}
                />
                <span className="toggle-track" />
                Halt construction activity
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={industrialShutdown}
                  onChange={e => setIndustrialShutdown(e.target.checked)}
                />
                <span className="toggle-track" />
                Temporary industrial shutdown
              </label>
            </div>

            {/* Disclaimer */}
            <div className="info-box info-box-amber">
              <span>⚠️</span>
              <span>This is an ML-based scenario approximation, not a certified atmospheric model.</span>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button
              id="sim-run-btn"
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Running Simulation…
                </>
              ) : '▶ Run Simulation'}
            </button>
          </div>
        </form>

        {/* ── Scenario output ─────────────────────────────────── */}
        <div className="card fade-slide-up fade-slide-up-d1">
          <div className="section-header">
            <div>
              <div className="card-title">📊 Scenario Output</div>
              <div className="section-sub">Baseline AQI versus simulated intervention outcome</div>
            </div>
            {result && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="tag tag-red" style={{ fontSize: '0.65rem' }}>── Baseline</span>
                <span className="tag tag-green" style={{ fontSize: '0.65rem' }}>── Simulated</span>
              </div>
            )}
          </div>

          {chartData.length ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,69,0.8)" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    stroke="var(--accent-red)"
                    strokeWidth={2.2}
                    dot={false}
                    name="Baseline AQI"
                    strokeDasharray="6 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="simulated"
                    stroke="var(--accent-green)"
                    strokeWidth={2.5}
                    dot={false}
                    name="Simulated AQI"
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="stat-row" style={{ marginTop: '1.1rem' }}>
                <div className="stat-tile">
                  <div className="stat-label">Avg Reduction</div>
                  <div className="stat-value" style={{ color: 'var(--accent-green)' }}>
                    {result.delta_summary.avg_reduction}
                  </div>
                  <div className="stat-sub">AQI units</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-label">Peak Hour</div>
                  <div className="stat-value">{result.delta_summary.peak_improvement_at_hour}h</div>
                  <div className="stat-sub">max improvement</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-label">Confidence</div>
                  <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
                    {Math.round(result.delta_summary.confidence * 100)}%
                  </div>
                  <div className="stat-sub">model confidence</div>
                </div>
              </div>

              {Object.keys(result.contributing_factors || {}).length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {Object.entries(result.contributing_factors).map(([key, value]) => (
                    <span key={key} className="tag tag-muted">
                      {key.replace(/_/g, ' ')}: {value}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon">📈</span>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                No simulation running yet
              </div>
              <div>Configure intervention parameters and click <strong>Run Simulation</strong> to compare expected AQI impact.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
