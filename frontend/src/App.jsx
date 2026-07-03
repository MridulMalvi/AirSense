import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ComparePage from './pages/ComparePage.jsx';
import AdvisoryPage from './pages/AdvisoryPage.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './index.css';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="app">
          <NavBar />
          <main className="main-content">
            <Routes>
              <Route path="/"        element={<Dashboard />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/advisory"element={<AdvisoryPage />} />
              {/* Catch-all */}
              <Route path="*" element={
                <div className="empty-state" style={{ paddingTop: '4rem' }}>
                  <div className="empty-state-icon">🌫️</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Page not found</div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <a href="/" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
                      ← Back to Dashboard
                    </a>
                  </div>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
