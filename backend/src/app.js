require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Route imports
const forecastRoutes = require('./routes/forecast.routes');
const attributionRoutes = require('./routes/attribution.routes');
const enforcementRoutes = require('./routes/enforcement.routes');
const citiesRoutes = require('./routes/cities.routes');
const advisoryRoutes = require('./routes/advisory.routes');
const zonesRoutes = require('./routes/zones.routes');
const liveRoutes = require('./routes/live.routes');
const trafficRoutes = require('./routes/traffic.routes');
const reportsRoutes = require('./routes/reports.routes');
const alertsRoutes = require('./routes/alerts.routes');
const simulationRoutes = require('./routes/simulation.routes');

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
app.use('/api/live', liveRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/simulation', simulationRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'airsense-backend',
    timestamp: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE === 'true',
    liveData: {
      openWeatherConfigured: Boolean(process.env.OPENWEATHER_API_KEY),
      tomTomConfigured: Boolean(process.env.TOMTOM_API_KEY),
    },
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
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/airsense';

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => {
    console.log('✅ Local MongoDB connected:', MONGO_URI);
    app.listen(PORT, () => {
      console.log(`🚀 AirSense backend running on port ${PORT}`);
      console.log(`   DEMO_MODE: ${process.env.DEMO_MODE === 'true' ? '✅ ON' : '❌ OFF'}`);
      console.log(`   ML_SERVICE: ${process.env.ML_SERVICE_URL || 'http://localhost:8001'}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Starting backend in resilient mode (bufferCommands disabled)');
    mongoose.set('bufferCommands', false);
    app.listen(PORT, () => {
      console.log(`🚀 AirSense backend running on port ${PORT}`);
    });
  });

module.exports = app;
