import React, { useState, useEffect } from 'react';
import CityCompare from '../components/CityCompare.jsx';
import { fetchCitiesCompare } from '../services/api';

const ALL_CITIES = ['delhi', 'mumbai', 'kolkata'];

export default function ComparePage() {
  const [citiesData,     setCitiesData]     = useState(null);
  const [selectedCities, setSelectedCities] = useState(['delhi', 'mumbai', 'kolkata']);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchCitiesCompare(ALL_CITIES)
      .then(data => setCitiesData(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleCity(name) {
    setSelectedCities(prev =>
      prev.includes(name)
        ? prev.length > 1 ? prev.filter(c => c !== name) : prev
        : [...prev, name]
    );
  }

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="page-header">
        <span className="page-header-badge">🌆 Multi-City</span>
        <h1>Multi-City AQI Comparison</h1>
        <p>
          Historical AQI trends across Indian cities — Delhi shown with live pipeline, others via CPCB archives.
        </p>
      </div>

      {/* ── Data transparency disclaimer ─────────────────────── */}
      <div className="info-box info-box-amber fade-slide-up" style={{ marginBottom: '1.25rem' }}>
        <span style={{ flexShrink: 0, fontSize: '1rem' }}>📋</span>
        <span>
          <strong>Data Transparency:</strong> Delhi uses our live AQI ingestion pipeline with real-time CAAQMS data.
          Mumbai and Kolkata use historical CPCB archives (not live). Dashed chart lines = historical data. We do not
          claim equivalent live coverage for all cities.
        </span>
      </div>

      {/* ── Main chart card ──────────────────────────────────── */}
      <div className="card fade-slide-up fade-slide-up-d1">
        <div className="section-header">
          <div>
            <div className="card-title">
              <span className="card-title-icon">📈</span>
              Historical AQI Trends
            </div>
            <div className="section-sub">Toggle cities using the buttons below the chart</div>
          </div>
        </div>

        <CityCompare
          cities={citiesData?.cities || []}
          selectedCities={selectedCities}
          onToggleCity={toggleCity}
          loading={loading}
          error={error}
        />
      </div>

      {/* ── Scalability note ─────────────────────────────────── */}
      <div className="info-box info-box-blue fade-slide-up fade-slide-up-d2" style={{ marginTop: '1rem' }}>
        <span style={{ flexShrink: 0 }}>💡</span>
        <span>
          <strong>Scalability note:</strong> AirSense's backend is city-agnostic — any city with CAAQMS station data
          can be onboarded. The Delhi deployment is the deep integration; other cities are a demonstration of the
          multi-city architecture.
        </span>
      </div>
    </div>
  );
}
