import React, { useState, useRef, useEffect } from 'react';
import { postAdvisoryChat } from '../services/api';
import { FALLBACK_ZONES } from '../constants/zones';

const RISK_STYLES = {
  low:      { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   color: '#22c55e', label: 'LOW RISK' },
  moderate: { bg: 'rgba(250,204,21,0.08)',  border: 'rgba(250,204,21,0.25)',  color: '#facc15', label: 'MODERATE' },
  high:     { bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.3)',   color: '#f97316', label: 'HIGH RISK' },
  'very-high': { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', label: 'VERY HIGH' },
  severe:   { bg: 'rgba(124,58,237,0.10)',  border: 'rgba(124,58,237,0.3)',  color: '#8b5cf6', label: 'SEVERE' },
};

const SUGGESTION_CHIPS = {
  en: [
    'Should I go for a morning run today?',
    'Is it safe for my child to play outside?',
    'What mask should I wear?',
    'What are current pollution levels near me?',
  ],
  hi: [
    'क्या आज सुबह टहलने जाना सुरक्षित है?',
    'क्या मेरे बच्चे बाहर खेल सकते हैं?',
    'मुझे कौन सा मास्क पहनना चाहिए?',
    'आज हवा की गुणवत्ता कैसी है?',
  ],
  kn: [
    'ಇಂದು ಬೆಳಿಗ್ಗೆ ಓಡಲು ಹೋಗಲು ಸಾಧ್ಯವೇ?',
    'ನನ್ನ ಮಗು ಬಯಟೆ ಆಟಲು ಸಧ್ಯವೇ?',
    'ಯಾವ ಮಾಸ್ಕ್ ಧರಿಸಬೇಕು?',
    'ಇಂದು ಗಾಳಿನ ಗುಣಮಟ್ಟ ಹೇಗಿದೆ?',
  ],
};

const FALLBACK_REPLY = {
  en: (loc) => `Sorry, the advisory service is temporarily unavailable. General tip: If AQI in ${loc.replace(/-/g, ' ')} is above 200, avoid prolonged outdoor activity and wear an N95 mask if going out.`,
  hi: (loc) => `क्षमा करें, सेवा अभी उपलब्ध नहीं है। सामान्य सुझाव: यदि ${loc.replace(/-/g, ' ')} में AQI 200 से अधिक है, तो बाहर न जाएं और अगर जाएं तो N95 मास्क पहनें।`,
  kn: (loc) => `ಕ್ಷಮಿಸಿ, ಸೇವೆ ಗೈ ಲಭ್ಯವಿಲ್ಲ. ಸಾಮಾನ್ಯ ಸಲಹೆ: ${loc.replace(/-/g, ' ')} ನಲ್ಲಿ AQI 200 ಕ್ಕಿಂತ ಹೆಚ್ಚಿದ್ದರೆ, ಹೋಗಲೇ ಬೇಡ, N95 ಮಾಸ್ಕ್ ಧರಿಸಿ.`,
};

/* ── Send icon SVG ─────────────────────────────────────────── */
function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

export default function AdvisoryChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '🌿 नमस्ते! I\'m AirSense Advisory — your personal air quality health guide.\n\nSelect your zone, choose a language, and ask me anything about Delhi\'s air quality.',
      riskLevel: null,
    },
  ]);
  const [input, setInput]       = useState('');
  const [language, setLanguage] = useState('en');
  const [location, setLocation] = useState('anand-vihar');
  const [loading, setLoading]   = useState(false);
  const [riskLevel, setRiskLevel] = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text) {
    const query = (text || input).trim();
    if (!query || loading) return;
    setInput('');

    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setLoading(true);

    try {
      const data = await postAdvisoryChat({ location, query, language });
      setRiskLevel(data.riskLevel);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.reply,
        riskLevel: data.riskLevel,
        currentAQI: data.currentAQI,
      }]);
    } catch {
      const fallback = FALLBACK_REPLY[language] || FALLBACK_REPLY.en;
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: fallback(location),
        isError: true,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const placeholders = {
    en: 'Ask about air quality, health risks, precautions…',
    hi: 'अपना सवाल यहाँ लिखें…',
    kn: 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ…',
  };

  return (
    <div className="chat-wrap">
      {/* ── Controls row ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
        <select
          id="advisory-zone-select"
          className="form-select"
          value={location}
          onChange={e => setLocation(e.target.value)}
          style={{ flex: '1', minWidth: 140, maxWidth: 220 }}
        >
          {FALLBACK_ZONES.map(z => (
            <option key={z.zoneId} value={z.zoneId}>{z.name}</option>
          ))}
        </select>

        {/* Language pills */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {[['en', '🇬🇧 EN'], ['hi', '🇮🇳 HI'], ['kn', '🇮🇳 KN']].map(([code, label]) => (
            <button
              key={code}
              className={`btn btn-ghost${language === code ? ' active' : ''}`}
              onClick={() => setLanguage(code)}
              style={{ fontSize: '0.78rem', padding: '0.38rem 0.75rem' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Risk level badge */}
        {riskLevel && RISK_STYLES[riskLevel] && (
          <span style={{
            background: RISK_STYLES[riskLevel].bg,
            border: `1px solid ${RISK_STYLES[riskLevel].border}`,
            color: RISK_STYLES[riskLevel].color,
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.69rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: RISK_STYLES[riskLevel].color, display: 'inline-block' }} />
            {RISK_STYLES[riskLevel].label}
          </span>
        )}
      </div>

      {/* ── Suggestion chips ───────────────────────────────────── */}
      <div className="chip-row" style={{ marginBottom: '0.7rem' }}>
        {(SUGGESTION_CHIPS[language] || SUGGESTION_CHIPS.en).map(q => (
          <button key={q} className="chip" onClick={() => sendMessage(q)}>{q}</button>
        ))}
      </div>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div className="chat-messages">
        {messages.map((msg, i) => {
          const riskStyle = msg.riskLevel ? RISK_STYLES[msg.riskLevel] : null;
          const isUser = msg.role === 'user';
          return (
            <div
              key={i}
              style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '0.5rem' }}
            >
              {/* Bot avatar */}
              {!isUser && (
                <div className="msg-avatar" title="AirSense Advisory AI">🌿</div>
              )}
              <div
                className={`msg-bubble ${isUser ? 'msg-user' : 'msg-bot'} ${msg.isError ? 'msg-error' : ''}`}
                style={riskStyle ? { borderColor: riskStyle.border } : undefined}
              >
                {msg.text}
                {msg.currentAQI && (
                  <div className="msg-meta">
                    📍 {location.replace(/-/g, ' ')} · Current AQI {msg.currentAQI}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            <div className="msg-avatar">🌿</div>
            <div className="typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input row ──────────────────────────────────────────── */}
      <div className="chat-input-row">
        <input
          ref={inputRef}
          id="advisory-chat-input"
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholders[language]}
          disabled={loading}
          autoComplete="off"
        />
        <button
          id="advisory-send-btn"
          className="btn-send"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          title="Send message"
        >
          {loading ? (
            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
          ) : (
            <>
              Send <SendIcon />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
