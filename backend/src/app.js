require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);

// Route imports
const forecastRoutes = require('./routes/forecast.routes');
const attributionRoutes = require('./routes/attribution.routes');
const enforcementRoutes = require('./routes/enforcement.routes');
const citiesRoutes = require('./routes/cities.routes');
const advisoryRoutes = require('./routes/advisory.routes');
const zonesRoutes = require('./routes/zones.routes');

// Services
const { initAlertService } = require('./services/alertService');

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Request logger (lightweight — no morgan needed for hackathon)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/zones', zonesRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/attribution', attributionRoutes);
app.use('/api/enforcement', enforcementRoutes);
app.use('/api/cities', citiesRoutes);
app.use('/api/advisory', advisoryRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'airsense-backend',
    timestamp: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE === 'true',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Database Connection ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/airsense';

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => {
    console.log('✅ MongoDB connected:', MONGO_URI);
    app.listen(PORT, () => {
      console.log(`🚀 AirSense backend running on port ${PORT}`);
      console.log(`   DEMO_MODE: ${process.env.DEMO_MODE === 'true' ? '✅ ON' : '❌ OFF'}`);
      console.log(`   ML_SERVICE: ${process.env.ML_SERVICE_URL || 'http://localhost:8001'}`);
      // Start the automated AQI alert cron job
      initAlertService();
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Starting without DB — some routes will fall back to mock data');
    app.listen(PORT, () => {
      console.log(`🚀 AirSense backend (no-DB mode) running on port ${PORT}`);
      // Start alert service even without DB — it doesn't depend on MongoDB
      initAlertService();
    });
  });

module.exports = app;
