import React from 'react';
import AdvisoryChat from '../components/AdvisoryChat.jsx';

const AQI_LEVELS = [
  { range: '0–50',    label: 'Good',         color: '#22c55e', tip: 'Ideal for all outdoor activities.' },
  { range: '51–100',  label: 'Satisfactory', color: '#a3e635', tip: 'Minor concern for sensitive groups.' },
  { range: '101–200', label: 'Moderate',     color: '#facc15', tip: 'Limit prolonged outdoor exertion.' },
  { range: '201–300', label: 'Poor',         color: '#f97316', tip: 'Avoid outdoor activity if possible.' },
  { range: '301–400', label: 'Very Poor',    color: '#ef4444', tip: 'Stay indoors. Use air purifier.' },
  { range: '400+',    label: 'Severe',       color: '#8b5cf6', tip: 'Health emergency. N95 mandatory.' },
];

const HEALTH_TIPS = [
  { icon: '👶', text: 'Keep children indoors when AQI > 150' },
  { icon: '🏃', text: 'Avoid running near busy roads at peak hours (7–10 AM)' },
  { icon: '😷', text: 'N95/N99 masks reduce PM2.5 exposure by ~95%' },
  { icon: '🌿', text: 'Indoor plants can marginally improve air quality' },
  { icon: '💧', text: 'Stay hydrated — helps respiratory mucosa' },
  { icon: '🏥', text: 'Asthma/COPD patients: carry inhaler outdoors' },
];

const LANGUAGES = [
  { flag: '🇬🇧', lang: 'English',           status: 'Full support',     available: true },
  { flag: '🇮🇳', lang: 'Hindi (हिंदी)',      status: 'Full support',     available: true },
  { flag: '🇮🇳', lang: 'Kannada (ಕನ್ನಡ)',   status: 'Full support',     available: true },
  { flag: '🇮🇳', lang: 'Tamil (தமிழ்)',      status: 'Coming soon',      available: false },
];

export default function AdvisoryPage() {
  return (
    <div>
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="page-header">
        <span className="page-header-badge">🌿 AI Health Guide</span>
        <h1>Citizen Health Advisory</h1>
        <p>
          Ask AirSense about air quality, health precautions, and safe outdoor activity — in Hindi, Kannada, or English.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.1rem' }}>
        {/* ── Chat card ─────────────────────────────────────── */}
        <div className="card fade-slide-up">
          <div className="card-title">
            <span className="card-title-icon">💬</span>
            Health Advisory Chat
            <span className="tag tag-blue" style={{ marginLeft: 'auto', fontSize: '0.64rem' }}>
              Powered by Groq / Llama 3.1
            </span>
          </div>
          <AdvisoryChat />
        </div>

        {/* ── Info sidebar ──────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* AQI Reference Guide */}
          <div className="card fade-slide-up fade-slide-up-d1">
            <div className="card-title">📊 AQI Reference Guide</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {AQI_LEVELS.map(({ range, label, color, tip }) => (
                <div
                  key={range}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.7rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: `${color}0d`,
                    border: `1px solid ${color}22`,
                    transition: 'background 0.2s',
                  }}
                >
                  <span
                    style={{
                      width: 10, height: 10,
                      borderRadius: '50%',
                      background: color,
                      marginTop: '0.28rem',
                      flexShrink: 0,
                      boxShadow: `0 0 8px ${color}66`,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color }}>
                      {range} — {label}
                    </div>
                    <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      {tip}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Health Tips */}
          <div className="card fade-slide-up fade-slide-up-d2">
            <div className="card-title">🛡️ General Health Tips</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {HEALTH_TIPS.map(({ icon, text }) => (
                <div
                  key={text}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    padding: '0.35rem 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Language support */}
          <div className="card fade-slide-up fade-slide-up-d3">
            <div className="card-title">🌐 Language Support</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {LANGUAGES.map(({ flag, lang, status, available }) => (
                <div
                  key={lang}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    background: available ? 'rgba(16,185,129,0.04)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: available ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {flag} {lang}
                  </span>
                  <span className={`tag ${available ? 'tag-green' : 'tag-muted'}`} style={{ fontSize: '0.64rem' }}>
                    {available ? '✓' : '🔜'} {status}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                More regional languages planned for production rollout.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
