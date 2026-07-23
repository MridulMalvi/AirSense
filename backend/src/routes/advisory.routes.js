/**
 * advisory.routes.js
 * POST /api/advisory/chat
 * Citizen health advisory chatbot — LLM-generated, Hindi + English.
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : require('uuid');
const { generateAdvisory } = require('../services/llm-client');
const { callML } = require('../services/ml-client');
const AdvisoryLog = require('../models/AdvisoryLog');
const { isValidZone, zoneIds } = require('../services/zones');
const { getLatestZoneAirQuality } = require('../services/live-data');

// Simple POI proximity check (mock — in production, would query a spatial DB)
const VULNERABLE_ZONES = ['rk-puram', 'rohini', 'dwarka']; // zones near hospitals/schools in sample data

/**
 * POST /api/advisory/chat
 * Body: { location: string, query: string, language: 'en' | 'hi' | 'kn' }
 */
router.post('/chat', async (req, res) => {
  const { location, query, language = 'en' } = req.body;

  if (!location || !query) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Both "location" and "query" are required.',
    });
  }

  if (!['en', 'hi', 'kn'].includes(language)) {
    return res.status(400).json({
      error: 'Unsupported language',
      message: 'language must be "en", "hi", or "kn"',
    });
  }

  if (!isValidZone(location)) {
    return res.status(400).json({
      error: 'Invalid zone ID',
      message: `location "${location}" not found. Valid zones: ${zoneIds.join(', ')}`,
    });
  }

  try {
    // 1. Fetch live AQI from the shared live-data service
    let currentAQI = 200; // fallback
    let aqiSource = 'fallback';
    try {
      const liveAQI = await getLatestZoneAirQuality(location);
      if (!liveAQI?.currentAQI) throw new Error(liveAQI?.error || 'Live AQI unavailable');
      currentAQI = liveAQI.currentAQI;
      aqiSource = liveAQI.source;
    } catch {
      // Fallback to ML forecast
      try {
        const forecastData = await callML(`/forecast/${location}`);
        currentAQI = forecastData?.forecast?.[0]?.predictedAQI || 200;
        aqiSource = 'ml-forecast-fallback';
      } catch {
        console.warn('[ADVISORY] All AQI sources failed, using fallback AQI 200');
      }
    }

    // 2. Check if zone is near vulnerable POI (hospital/school)
    const nearVulnerablePOI = VULNERABLE_ZONES.includes(location);

    // 3. Call LLM (falls back to static message if LLM unavailable)
    const { reply, riskLevel } = await generateAdvisory({
      location,
      aqi: currentAQI,
      query,
      language,
      nearVulnerablePOI,
    });

    // 4. Log interaction to MongoDB (anonymous session, no PII)
    const sessionId = uuidv4 ? uuidv4() : `session-${Date.now()}`;
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        await AdvisoryLog.create({
          sessionId,
          location,
          query,
          reply,
          riskLevel,
          language,
          timestamp: new Date(),
        });
      }
    } catch (dbErr) {
      console.warn('[ADVISORY] DB log failed (non-fatal):', dbErr.message);
    }

    return res.json({ reply, riskLevel, location, currentAQI, aqiSource });
  } catch (err) {
    console.error('[ADVISORY ROUTE ERROR]', err.message);
    return res.status(503).json({
      error: 'Advisory service unavailable',
      reply: language === 'hi'
        ? 'क्षमा करें, सलाह सेवा अभी उपलब्ध नहीं है। सामान्य सुझाव: AQI 200 से ऊपर होने पर बाहर जाने से बचें।'
        : language === 'kn'
        ? 'ಕ್ಷಮಿಸಿ, ಸಲಹಾ ಸೇವೆ ಈಗ ಲಭ್ಯವಿಲ್ಲ. ಸಾಮಾನ್ಯ ಸಲಹೆ: AQI 200 ಮೀರಿದರೆ ಹೊರಗೆ ಹೋಗಬೇಡಿ.'
        : 'Advisory service temporarily unavailable. General guidance: avoid outdoor activity if AQI is above 200.',
      riskLevel: 'unknown',
    });
  }
});

module.exports = router;
