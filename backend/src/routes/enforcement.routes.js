/**
 * enforcement.routes.js
 * GET /api/enforcement/priorities
 * Returns a ranked list of zones for enforcement action.
 */

const express = require('express');
const router = express.Router();
const { callML } = require('../services/ml-client');
const { getCache, setCache } = require('../services/cache');
const EnforcementPriority = require('../models/EnforcementPriority');

/**
 * GET /api/enforcement/priorities?limit=5
 */
router.get('/priorities', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  // Namespace cache key by mode so mock and real data never collide
  const mode = process.env.DEMO_MODE === 'true' ? 'demo' : 'live';
  const cacheKey = `enforcement:priorities:${mode}`;

  try {
    // Check cache
    const cached = await getCache(cacheKey);
    if (cached) {
      const result = { ...cached, fromCache: true };
      result.priorities = result.priorities.slice(0, limit);
      return res.json(result);
    }

    // Call ML service
    const mlData = await callML('/enforcement/priorities');

    // Cache for 5 minutes
    await setCache(cacheKey, mlData, 300);

    // Persist to MongoDB (best-effort — only when DB is connected)
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        await EnforcementPriority.create({
          generatedAt: new Date(),
          priorities: mlData.priorities,
          totalZonesEvaluated: mlData.totalZonesEvaluated,
        });
      }
    } catch (dbErr) {
      console.warn('[ENFORCEMENT] DB persist failed (non-fatal):', dbErr.message);
    }

    // Apply limit
    const result = { ...mlData };
    result.priorities = result.priorities.slice(0, limit);
    return res.json(result);
  } catch (err) {
    console.error('[ENFORCEMENT ROUTE ERROR]', err.message);
    return res.status(503).json({
      error: 'Enforcement service unavailable',
      message: err.message,
      retryAfter: 30,
    });
  }
});

module.exports = router;
