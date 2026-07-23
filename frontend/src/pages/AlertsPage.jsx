import React, { useEffect, useState } from 'react';
import { FALLBACK_ZONES } from '../constants/zones';
import { fetchAlertSummary, sendTestAlert, subscribeToAlerts } from '../services/api';
import { getAlertPushToken } from '../services/firebase-messaging';

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

  useEffect(() => {
    loadSummary();
  }, []);

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
      const response = await sendTestAlert({ zoneId, aqi: 350 }); // force Severe AQI so threshold filter always passes
      setStatus(`Test alert processed for ${response.result?.sentOrLogged ?? response.sentOrLogged ?? 0} subscriber(s).`);
      loadSummary();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Could not send test alert.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>AQI Push Alerts</h1>
        <p style={{ fontSize: '0.8rem', color: '#7b91b0', marginTop: '0.2rem' }}>
          Free alert path using Firebase web push, with in-app logging fallback when Firebase is not configured.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.8fr)', gap: '1rem' }}>
        <form className="card" onSubmit={subscribe}>
          <div className="card-title">Subscribe</div>
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <label>
              <div className="stat-label">Zone</div>
              <select className="form-select" value={zoneId} onChange={e => setZoneId(e.target.value)}>
                {FALLBACK_ZONES.map(zone => (
                  <option key={zone.zoneId} value={zone.zoneId}>{zone.name}</option>
                ))}
              </select>
            </label>

            <label>
              <div className="stat-label">Language</div>
              <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="kn">Kannada</option>
              </select>
            </label>

            <div>
              <div className="stat-label">Alert Thresholds</div>
              {[
                ['moderate', 'Moderate and above (AQI 100+)'],
                ['poor', 'Poor and above (AQI 200+)'],
                ['severe', 'Severe (AQI 300+)'],
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'block', fontSize: '0.82rem', color: '#7b91b0', margin: '0.35rem 0' }}>
                  <input
                    type="checkbox"
                    checked={thresholds[key]}
                    onChange={e => setThresholds(prev => ({ ...prev, [key]: e.target.checked }))}
                    style={{ marginRight: '0.45rem' }}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '0.75rem', fontSize: '0.78rem', color: '#7b91b0' }}>
              On localhost, browser push can work after notification permission. In deployed environments, HTTPS and Firebase web credentials are required.
            </div>

            {error && <div className="error-msg">{error}</div>}
            {status && <div className="tag tag-green" style={{ width: 'fit-content' }}>{status}</div>}

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Working...' : 'Subscribe'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={testAlert} disabled={loading}>
                Send Test Alert
              </button>
            </div>
          </div>
        </form>

        <div className="card">
          <div className="card-title">Alert Activity</div>
          <div className="stat-row" style={{ marginBottom: '1rem' }}>
            <div className="stat-tile">
              <div className="stat-label">Subscribers</div>
              <div className="stat-value">{summary?.activeSubscribers ?? 0}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Recent Logs</div>
              <div className="stat-value">{summary?.recentLogs?.length ?? 0}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {(summary?.recentLogs || []).slice(0, 8).map(log => (
              <div key={log._id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.55rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{log.title}</div>
                <div style={{ fontSize: '0.72rem', color: '#7b91b0' }}>
                  {log.zoneName || log.zoneId} · AQI {log.aqi} · {log.status}
                </div>
              </div>
            ))}
            {!(summary?.recentLogs || []).length && (
              <div className="empty-state" style={{ padding: '1.25rem 0' }}>No alert logs yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
