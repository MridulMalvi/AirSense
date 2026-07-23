import React, { useEffect, useMemo, useState } from 'react';
import { fetchWardReports, submitPollutionReport } from '../services/api';
import { FALLBACK_ZONES, SOURCE_COLORS, SOURCE_ICONS } from '../constants/zones';

function getReporterId() {
  const key = 'airsense_reporter_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = `anon-${window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now()}`;
  localStorage.setItem(key, next);
  return next;
}

function categoryLabel(category) {
  return (category || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function ReportsPage() {
  const reporterId = useMemo(() => getReporterId(), []);
  const [zoneId, setZoneId] = useState('anand-vihar');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchWardReports(zoneId)
      .then(setReportData)
      .catch(() => setReportData(null));
  }, [zoneId, result]);

  function onImageChange(event) {
    const file = event.target.files?.[0];
    setImage(file || null);
    setPreview(file ? URL.createObjectURL(file) : '');
    setResult(null);
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    if (!image) {
      setError('Attach a JPG, PNG, or WEBP image before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const data = await submitPollutionReport({ zoneId, reporterId, image, description });
      setResult(data);
      setDescription('');
      setImage(null);
      setPreview('');
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Report service unavailable.');
    } finally {
      setSubmitting(false);
    }
  }

  const classification = result?.classification;

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Crowdsourced Pollution Reports</h1>
        <p style={{ fontSize: '0.8rem', color: '#7b91b0', marginTop: '0.2rem' }}>
          Upload field evidence. Groq vision classifies the source, and validated reports boost attribution signals for 6 hours.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)', gap: '1rem' }}>
        <form className="card" onSubmit={submit}>
          <div className="card-title">Submit Report</div>

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
              <div className="stat-label">Photo Evidence</div>
              <input className="form-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={onImageChange} />
            </label>

            {preview && (
              <img
                src={preview}
                alt="Report preview"
                style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
              />
            )}

            <label>
              <div className="stat-label">Optional Description</div>
              <textarea
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Example: Dust from uncovered construction material near main road"
              />
            </label>

            <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '0.75rem', fontSize: '0.78rem', color: '#f59e0b' }}>
              Vision classification is assistive evidence, not automatic legal proof. Low-confidence reports go to review.
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Analyzing...' : 'Submit Report'}
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div className="card-title">Classification Result</div>
            {classification ? (
              <div>
                <div className="stat-value" style={{ fontSize: '1rem', textTransform: 'capitalize' }}>
                  {categoryLabel(classification.category)}
                </div>
                <div className="stat-sub">
                  {Math.round(classification.confidence * 100)}% confidence · {classification.severity} severity
                </div>
                <p style={{ fontSize: '0.8rem', color: '#7b91b0', marginTop: '0.7rem', lineHeight: 1.6 }}>
                  {classification.description}
                </p>
                <div style={{ marginTop: '0.7rem' }}>
                  <span className={result.status === 'validated' ? 'tag tag-green' : 'tag tag-amber'}>
                    {result.status}
                  </span>
                  {result.attributionApplied && (
                    <span className="tag tag-blue" style={{ marginLeft: '0.4rem' }}>
                      attribution +{result.attributionWeight}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '1.5rem 0' }}>No report submitted yet.</div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Last 24 Hours</div>
            <div className="stat-row" style={{ marginBottom: '0.85rem' }}>
              <div className="stat-tile">
                <div className="stat-label">Total</div>
                <div className="stat-value">{reportData?.summary?.total ?? 0}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-label">Validated</div>
                <div className="stat-value">{reportData?.summary?.validated ?? 0}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {(reportData?.reports || []).slice(0, 5).map(report => {
                const category = report.classification?.category || 'unknown';
                const color = SOURCE_COLORS[
                  category === 'garbage_burning' ? 'biomass_burning'
                    : category === 'construction_dust' ? 'construction'
                    : category === 'vehicle_smoke' ? 'traffic'
                    : category === 'industrial_emission' ? 'industrial'
                    : 'other'
                ] || '#64748b';
                return (
                  <div key={report._id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.55rem' }}>
                    <img src={report.imageUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color, fontWeight: 700, fontSize: '0.8rem' }}>
                        {SOURCE_ICONS[category] || '●'} {categoryLabel(category)}
                      </div>
                      <div style={{ color: '#7b91b0', fontSize: '0.72rem' }}>
                        {report.status} · {Math.round((report.classification?.confidence || 0) * 100)}%
                      </div>
                    </div>
                  </div>
                );
              })}
              {!(reportData?.reports || []).length && (
                <div className="empty-state" style={{ padding: '1.2rem 0' }}>No recent reports for this zone.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
