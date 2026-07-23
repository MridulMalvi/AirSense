/**
 * attribution.routes.js
 * GET /api/attribution/:zoneId
 * Returns source attribution breakdown for a zone (traffic/industrial/construction/biomass_burning).
 */

const express = require('express');
const router = express.Router();
const { callML } = require('../services/ml-client');
const { getCache, setCache } = require('../services/cache');
const Attribution = require('../models/Attribution');
const { zoneIds, isValidZone } = require('../services/zones');
const { getLatestZoneAirQuality } = require('../services/live-data');
const { getTrafficForZone, trafficContributionMultiplier } = require('../services/traffic-client');
const { getReportSignals } = require('../services/report-signals');

function normalizeSources(sources) {
  const total = sources.reduce((sum, source) => sum + Number(source.confidence || 0), 0) || 1;
  return sources
    .map((source) => ({ ...source, confidence: Number((Number(source.confidence || 0) / total).toFixed(2)) }))
    .sort((a, b) => b.confidence - a.confidence);
}

function applyReportSignals(sources, reportSignals) {
  const signalEntries = Object.entries(reportSignals || {}).filter(([, weight]) => weight > 0);
  if (!signalEntries.length) return sources;

  return sources.map((source) => {
    const boost = Number(reportSignals[source.category] || 0);
    if (!boost) return source;
    return {
      ...source,
      confidence: Number(source.confidence || 0) + Math.min(boost * 0.08, 0.18),
      evidence: `${source.evidence || 'Attribution signal'}; citizen reports boost ${boost.toFixed(2)}`,
    };
  });
}

function enrichAttribution(baseData, liveAQI, traffic, reportSignals) {
  const result = { ...baseData };

  if (liveAQI?.currentAQI) {
    result.currentAQI = liveAQI.currentAQI;
    result.aqiSource = liveAQI.source;
    result.liveAQI = {
      isLive: liveAQI.isLive,
      lastUpdated: liveAQI.fetchedAt,
      dataFreshness: liveAQI.dataFreshness,
      pollutants: liveAQI.pollutants,
    };
  }

  if (traffic) {
    const multiplier = trafficContributionMultiplier(traffic.congestionIndex);
    const sources = (result.sources || []).map((source) => {
      if (source.category !== 'traffic') return source;
      return {
        ...source,
        confidence: Number(source.confidence || 0) * multiplier,
        evidence: `${source.evidence || 'Traffic signal'}; TomTom congestion index ${traffic.congestionIndex}`,
      };
    });

    result.sources = normalizeSources(sources);
    result.dominantSource = result.sources[0]?.category || result.dominantSource;
    result.traffic = traffic;
  }

  if (reportSignals) {
    result.sources = normalizeSources(applyReportSignals(result.sources || [], reportSignals));
    result.dominantSource = result.sources[0]?.category || result.dominantSource;
    result.reportSignals = reportSignals;
  }

  result.source = result.aqiSource || result.dataSource || 'ml-service';
  result.isLive = Boolean(liveAQI?.isLive || traffic?.isLive);
  result.lastUpdated = liveAQI?.fetchedAt || new Date().toISOString();
  result.dataFreshness = liveAQI?.dataFreshness || result.dataFreshness || 'stale';
  return result;
}

/**
 * GET /api/attribution/:zoneId
 */
router.get('/:zoneId', async (req, res) => {
  const { zoneId } = req.params;

  if (!isValidZone(zoneId)) {
    return res.status(400).json({
      error: 'Invalid zone ID',
      message: `zoneId "${zoneId}" not found. Valid zones: ${zoneIds.join(', ')}`,
    });
  }

  const cacheKey = `attribution:${zoneId}`;

  try {
    // Check cache
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, fromCache: true });
    }

    // Call ML service
    const mlData = await callML(`/attribution/${zoneId}`);
    const [liveAQI, traffic, reportSignals] = await Promise.all([
      getLatestZoneAirQuality(zoneId),
      getTrafficForZone(zoneId),
      getReportSignals(zoneId),
    ]);
    const enrichedData = enrichAttribution(mlData, liveAQI, traffic, reportSignals);

    // Cache for 5 minutes
    await setCache(cacheKey, enrichedData, 300);

    // Persist to MongoDB (best-effort — only when DB is connected)
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        await Attribution.findOneAndUpdate(
          { zoneId },
          { zoneId, ...enrichedData, timestamp: new Date() },
          { upsert: true, new: true }
        );
      }
    } catch (dbErr) {
      console.warn('[ATTRIBUTION] DB persist failed (non-fatal):', dbErr.message);
    }

    return res.json(enrichedData);
  } catch (err) {
    console.error('[ATTRIBUTION ROUTE ERROR]', err.message);
    return res.status(503).json({
      error: 'Attribution service unavailable',
      message: err.message,
      retryAfter: 30,
    });
  }
});

/**
 * GET /api/attribution  — list all available zones
 */
router.get('/', (_req, res) => {
  res.json({ availableZones: zoneIds });
});

module.exports = router;
