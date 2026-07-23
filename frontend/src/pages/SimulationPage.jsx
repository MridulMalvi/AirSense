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
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>What-If Simulation</h1>
        <p style={{ fontSize: '0.8rem', color: '#7b91b0', marginTop: '0.2rem' }}>
          Test intervention scenarios using live AQI, weather, TomTom traffic, and a lightweight scenario model.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.8fr) minmax(0, 1.2fr)', gap: '1rem' }}>
        <form className="card" onSubmit={submit}>
          <div className="card-title">Scenario Controls</div>
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            <label>
              <div className="stat-label">Zone</div>
              <select className="form-select" value={zoneId} onChange={e => setZoneId(e.target.value)}>
                {FALLBACK_ZONES.map(zone => (
                  <option key={zone.zoneId} value={zone.zoneId}>{zone.name}</option>
                ))}
              </select>
            </label>

            <label>
              <div className="stat-label">Forecast Window</div>
              <select className="form-select" value={forecastHours} onChange={e => setForecastHours(Number(e.target.value))}>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
              </select>
            </label>

            {[
              ['Traffic Diversion', trafficDiversion, setTrafficDiversion],
              ['Construction Reduction', constructionReduction, setConstructionReduction],
              ['Industrial Reduction', industrialReduction, setIndustrialReduction],
            ].map(([label, value, setter]) => (
              <label key={label}>
                <div className="stat-label">{label}: {value}%</div>
                <input type="range" min="0" max="100" value={value} onChange={e => setter(Number(e.target.value))} style={{ width: '100%' }} />
              </label>
            ))}

            <label style={{ color: '#7b91b0', fontSize: '0.82rem' }}>
              <input type="checkbox" checked={haltConstruction} onChange={e => setHaltConstruction(e.target.checked)} style={{ marginRight: '0.45rem' }} />
              Halt construction activity
            </label>
            <label style={{ color: '#7b91b0', fontSize: '0.82rem' }}>
              <input type="checkbox" checked={industrialShutdown} onChange={e => setIndustrialShutdown(e.target.checked)} style={{ marginRight: '0.45rem' }} />
              Temporary industrial shutdown
            </label>

            <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '0.75rem', fontSize: '0.78rem', color: '#f59e0b' }}>
              This is an ML-based scenario approximation, not a certified atmospheric model.
            </div>

            {error && <div className="error-msg">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Running...' : 'Run Simulation'}
            </button>
          </div>
        </form>

        <div className="card">
          <div className="section-header">
            <div>
              <div className="card-title">Scenario Output</div>
              <div className="section-sub">
                Baseline AQI versus simulated intervention outcome
              </div>
            </div>
          </div>

          {chartData.length ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                  <XAxis dataKey="hour" tick={{ fill: '#4a5d78', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#4a5d78', fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="baseline" stroke="#ef4444" strokeWidth={2.4} dot={false} name="Baseline AQI" />
                  <Line type="monotone" dataKey="simulated" stroke="#22c55e" strokeWidth={2.4} dot={false} name="Simulated AQI" />
                </LineChart>
              </ResponsiveContainer>

              <div className="stat-row" style={{ marginTop: '1rem' }}>
                <div className="stat-tile">
                  <div className="stat-label">Avg Reduction</div>
                  <div className="stat-value">{result.delta_summary.avg_reduction}</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-label">Peak Hour</div>
                  <div className="stat-value">{result.delta_summary.peak_improvement_at_hour}h</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-label">Confidence</div>
                  <div className="stat-value">{Math.round(result.delta_summary.confidence * 100)}%</div>
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {Object.entries(result.contributing_factors || {}).map(([key, value]) => (
                  <span key={key} className="tag tag-muted">{key.replace(/_/g, ' ')}: {value}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📈</div>
              <div>Run a scenario to compare expected AQI impact.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
