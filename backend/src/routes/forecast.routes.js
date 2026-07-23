/**
 * forecast.routes.js
 * GET /api/forecast/:wardId
 * Returns 24-72hr AQI forecast with RMSE vs persistence baseline comparison.
 */

const express = require('express');
const router = express.Router();
const { callML } = require('../services/ml-client');
const { getCache, setCache } = require('../services/cache');
const Forecast = require('../models/Forecast');
const { zoneIds, isValidZone } = require('../services/zones');

/**
 * GET /api/forecast/:wardId
 */
router.get('/:wardId', async (req, res) => {
  const { wardId } = req.params;

  // Validate zone ID
  if (!isValidZone(wardId)) {
    return res.status(400).json({
      error: 'Invalid zone ID',
      message: `wardId "${wardId}" not found. Valid zones: ${zoneIds.join(', ')}`,
    });
  }

  const cacheKey = `forecast:${wardId}`;

  try {
    // 1. Check Redis cache
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, fromCache: true });
    }

    // 2. Call ML service (falls back to mock if ML is down)
    const mlData = await callML(`/forecast/${wardId}`);

    // 3. Cache the result for 5 minutes
    await setCache(cacheKey, mlData, 300);

    // 4. Persist to MongoDB (best-effort — only when DB is connected)
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        await Forecast.findOneAndUpdate(
          { wardId },
          { wardId, ...mlData, generatedAt: new Date() },
          { upsert: true, new: true }
        );
      }
    } catch (dbErr) {
      console.warn('[FORECAST] DB persist failed (non-fatal):', dbErr.message);
    }

    return res.json(mlData);
  } catch (err) {
    console.error('[FORECAST ROUTE ERROR]', err.message);
    return res.status(503).json({
      error: 'Forecast service unavailable',
      message: err.message,
      retryAfter: 30,
    });
  }
});

/**
 * GET /api/forecast  — list all available zone IDs
 */
router.get('/', (_req, res) => {
  res.json({ availableZones: zoneIds });
});

module.exports = router;
