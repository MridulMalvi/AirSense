import React, { useState, useRef, useEffect } from 'react';
import { postAdvisoryChat } from '../services/api';
import { FALLBACK_ZONES } from '../constants/zones';

const RISK_STYLES = {
  low:      { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   color: '#22c55e', label: 'LOW RISK' },
  moderate: { bg: 'rgba(250,204,21,0.08)',  border: 'rgba(250,204,21,0.25)',  color: '#facc15', label: 'MODERATE' },
  high:     { bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.3)',   color: '#f97316', label: 'HIGH RISK' },
  'very-high': { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', label: 'VERY HIGH' },
  severe:   { bg: 'rgba(124,58,237,0.10)',  border: 'rgba(124,58,237,0.3)',  color: '#7c3aed', label: 'SEVERE' },
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

  return (
    <div className="chat-wrap">
      {/* Controls row */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
        <select
          className="form-select"
          value={location}
          onChange={e => setLocation(e.target.value)}
          style={{ flex: '1', minWidth: 140, maxWidth: 220 }}
        >
          {FALLBACK_ZONES.map(z => (
            <option key={z.zoneId} value={z.zoneId}>{z.name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[['en', '🇬🇧 EN'], ['hi', '🇮🇳 HI'], ['kn', '🇮🇳 KN']].map(([code, label]) => (
            <button
              key={code}
              className={`btn btn-ghost${language === code ? ' active' : ''}`}
              onClick={() => setLanguage(code)}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              {label}
            </button>
          ))}
        </div>

        {riskLevel && RISK_STYLES[riskLevel] && (
          <span style={{
            background: RISK_STYLES[riskLevel].bg,
            border: `1px solid ${RISK_STYLES[riskLevel].border}`,
            color: RISK_STYLES[riskLevel].color,
            padding: '0.25rem 0.7rem',
            borderRadius: '20px',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}>
            ● {RISK_STYLES[riskLevel].label}
          </span>
        )}
      </div>

      {/* Suggestion chips */}
      <div className="chip-row" style={{ marginBottom: '0.6rem' }}>
        {(SUGGESTION_CHIPS[language] || SUGGESTION_CHIPS.en).map(q => (
          <button key={q} className="chip" onClick={() => sendMessage(q)}>{q}</button>
        ))}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => {
          const riskStyle = msg.riskLevel ? RISK_STYLES[msg.riskLevel] : null;
          return (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ fontSize: '1.1rem', marginRight: '0.4rem', alignSelf: 'flex-end', paddingBottom: '2px' }}>
                  🌿
                </div>
              )}
              <div
                className={`msg-bubble ${msg.role === 'user' ? 'msg-user' : 'msg-bot'} ${msg.isError ? 'msg-error' : ''}`}
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

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🌿</span>
            <div className="typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={language === 'hi' ? 'अपना सवाल यहाँ लिखें…' : language === 'kn' ? 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ…' : 'Ask about air quality, health risks, precautions…'}
          disabled={loading}
        />
        <button
          className="btn btn-primary"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{ flexShrink: 0 }}
        >
          {loading ? '…' : 'Send ↑'}
        </button>
      </div>
    </div>
  );
}
