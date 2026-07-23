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
        ? prev.length > 1 ? prev.filter(c => c !== name) : prev   // keep at least one
        : [...prev, name]
    );
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
          Multi-City AQI Comparison
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#7b91b0', marginTop: '0.2rem' }}>
          Historical AQI trends across Indian cities — Delhi shown with live pipeline, others via CPCB archives.
        </p>
      </div>

      {/* Disclaimer */}
      <div style={{
        background: 'rgba(245,158,11,0.07)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 10,
        padding: '0.75rem 1rem',
        fontSize: '0.78rem',
        color: '#f59e0b',
        marginBottom: '1.25rem',
        display: 'flex',
        gap: '0.6rem',
        alignItems: 'flex-start',
      }}>
        <span style={{ flexShrink: 0 }}>📋</span>
        <span>
          <strong>Data Transparency:</strong> Delhi uses our live AQI ingestion pipeline with real-time CAAQMS data.
          Mumbai and Kolkata use historical CPCB archives (not live). Dashed chart lines = historical data. We do not
          claim equivalent live coverage for all cities.
        </span>
      </div>

      {/* Main card */}
      <div className="card">
        <div className="section-header">
          <div>
            <div className="card-title">
              <span className="card-title-icon">🌆</span>
              Historical AQI Trends
            </div>
            <div className="section-sub">
              Toggle cities using the buttons below the chart
            </div>
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

      {/* Info footer */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem 1rem',
        background: 'rgba(59,130,246,0.05)',
        border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: 10,
        fontSize: '0.75rem',
        color: '#7b91b0',
      }}>
        💡 <strong>Scalability note:</strong> AirSense's backend is city-agnostic — any city with CAAQMS station data
        can be onboarded. The Delhi deployment is the deep integration; other cities are demonstration of the
        multi-city architecture.
      </div>
    </div>
  );
}
