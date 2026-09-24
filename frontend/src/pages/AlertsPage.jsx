import React, { useEffect, useState } from 'react';
import { FALLBACK_ZONES } from '../constants/zones';
import { fetchAlertSummary, sendTestAlert, subscribeToAlerts } from '../services/api';
import { getAlertPushToken } from '../services/firebase-messaging';

/* ── Custom Checkbox component ─────────────────────────────── */
function Checkbox({ checked, onChange, id }) {
  return (
    <label className="check-label" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      <span className="check-box" />
    </label>
  );
}

export default function AlertsPage() {
  const [zoneId, setZoneId] = useState('anand-vihar');
  const [language, setLanguage] = useState('en');
  const [thresholds, setThresholds] = useState({ moderate: false, poor: true, severe: true });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  function loadSummary() {
    fetchAlertSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }

  useEffect(() => { loadSummary(); }, []);

  async function subscribe(event) {
    event.preventDefault();
    setLoading(true);
    setStatus('');
    setError('');
    try {
      const push = await getAlertPushToken();
      const response = await subscribeToAlerts({
        token: push.token,
        zoneId,
        language,
        channel: push.channel,
        thresholds,
      });
      setStatus(response.success
        ? `Subscribed for ${push.channel === 'web_push' ? 'web push' : 'in-app'} alerts${push.reason ? ` (${push.reason})` : ''}.`
        : 'Subscription saved.');
      loadSummary();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Could not subscribe.');
    } finally {
      setLoading(false);
    }
  }

  async function testAlert() {
    setLoading(true);
    setStatus('');
    setError('');
    try {
      const response = await sendTestAlert({ zoneId, aqi: 350 });
      setStatus(`Test alert processed for ${response.result?.sentOrLogged ?? response.sentOrLogged ?? 0} subscriber(s).`);
      loadSummary();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Could not send test alert.');
    } finally {
      setLoading(false);
    }
  }

  const THRESHOLDS_CONFIG = [
    { key: 'moderate', label: 'Moderate and above', sub: 'AQI 100+', color: 'var(--aqi-moderate)' },
    { key: 'poor',     label: 'Poor and above',     sub: 'AQI 200+', color: 'var(--aqi-poor)' },
    { key: 'severe',   label: 'Severe',             sub: 'AQI 300+', color: 'var(--aqi-severe)' },
  ];

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="page-header">
        <span className="page-header-badge">🔔 Push Notifications</span>
        <h1>AQI Push Alerts</h1>
        <p>
          Free alert path using Firebase web push, with in-app logging fallback when Firebase is not configured.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(280px,0.8fr)', gap: '1.1rem' }}>
        {/* ── Subscribe form ─────────────────────────────────── */}
        <form className="card fade-slide-up" onSubmit={subscribe}>
          <div className="card-title">🔔 Subscribe to Alerts</div>
          <div style={{ display: 'grid', gap: '1rem' }}>

            {/* Zone */}
            <label>
              <div className="form-label">Zone</div>
              <select
                id="alert-zone-select"
                className="form-select"
                value={zoneId}
                onChange={e => setZoneId(e.target.value)}
              >
                {FALLBACK_ZONES.map(zone => (
                  <option key={zone.zoneId} value={zone.zoneId}>{zone.name}</option>
                ))}
              </select>
            </label>

            {/* Language */}
            <label>
              <div className="form-label">Notification Language</div>
              <select
                id="alert-language-select"
                className="form-select"
                value={language}
                onChange={e => setLanguage(e.target.value)}
              >
                <option value="en">🇬🇧 English</option>
                <option value="hi">🇮🇳 Hindi</option>
                <option value="kn">🇮🇳 Kannada</option>
              </select>
            </label>

            {/* Alert Thresholds */}
            <div>
              <div className="form-label" style={{ marginBottom: '0.65rem' }}>Alert Thresholds</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {THRESHOLDS_CONFIG.map(({ key, label, sub, color }) => (
                  <div
                    key={key}
                    onClick={() => setThresholds(prev => ({ ...prev, [key]: !prev[key] }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${thresholds[key] ? `${color}44` : 'var(--border)'}`,
                      background: thresholds[key] ? `${color}0d` : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`threshold-${key}`}
                      checked={thresholds[key]}
                      onChange={e => setThresholds(prev => ({ ...prev, [key]: e.target.checked }))}
                      style={{ display: 'none' }}
                    />
                    {/* Custom checkbox visual */}
                    <span style={{
                      width: 18, height: 18,
                      borderRadius: 5,
                      border: `1.5px solid ${thresholds[key] ? color : 'var(--border-hover)'}`,
                      background: thresholds[key] ? color : 'var(--bg-input)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                    }}>
                      {thresholds[key] && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.83rem', fontWeight: 600, color: thresholds[key] ? color : 'var(--text-primary)' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info note */}
            <div className="info-box info-box-blue">
              <span>🔒</span>
              <span>
                On localhost, browser push can work after notification permission. In deployed environments,
                HTTPS and Firebase web credentials are required.
              </span>
            </div>

            {/* Feedback */}
            {error && <div className="error-msg">{error}</div>}
            {status && <div className="status-success">{status}</div>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                id="alert-subscribe-btn"
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Working…
                  </>
                ) : '🔔 Subscribe'}
              </button>
              <button
                id="alert-test-btn"
                className="btn btn-ghost"
                type="button"
                onClick={testAlert}
                disabled={loading}
              >
                Send Test Alert
              </button>
            </div>
          </div>
        </form>

        {/* ── Alert Activity panel ────────────────────────────── */}
        <div className="card fade-slide-up fade-slide-up-d1">
          <div className="card-title">📊 Alert Activity</div>
          <div className="stat-row" style={{ marginBottom: '1.1rem' }}>
            <div className="stat-tile">
              <div className="stat-label">Subscribers</div>
              <div className="stat-value">{summary?.activeSubscribers ?? 0}</div>
              <div className="stat-sub">active</div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Recent Logs</div>
              <div className="stat-value">{summary?.recentLogs?.length ?? 0}</div>
              <div className="stat-sub">logged alerts</div>
            </div>
          </div>

          {/* Log items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(summary?.recentLogs || []).slice(0, 8).map(log => (
              <div key={log._id} className="alert-log-item">
                <div className="alert-log-title">{log.title}</div>
                <div className="alert-log-meta">
                  <span>📍 {log.zoneName || log.zoneId}</span>
                  <span>AQI {log.aqi}</span>
                  <span className={`tag ${log.status === 'sent' ? 'tag-green' : 'tag-muted'}`} style={{ fontSize: '0.65rem' }}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
            {!(summary?.recentLogs || []).length && (
              <div className="empty-state" style={{ padding: '1.5rem 0' }}>
                <span className="empty-state-icon">🔕</span>
                No alert logs yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
