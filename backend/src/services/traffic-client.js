const axios = require('axios');
const { getCache, setCache } = require('./cache');
const { getZone, zones } = require('./zones');

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const TRAFFIC_TTL_SECONDS = 900;

function buildFallbackTraffic(zoneId, reason = 'TOMTOM_API_KEY is not configured') {
  return {
    zoneId,
    congestionIndex: 0.5,
    currentSpeed: null,
    freeFlowSpeed: null,
    confidence: 0,
    roadClosure: false,
    source: 'traffic-fallback',
    isLive: false,
    dataFreshness: 'stale',
    lastUpdated: new Date().toISOString(),
    error: reason,
  };
}

function normalizeTomTomResponse(zoneId, payload) {
  const flow = payload?.flowSegmentData || {};
  const currentSpeed = Number(flow.currentSpeed || 0);
  const freeFlowSpeed = Number(flow.freeFlowSpeed || 0);
  const congestionIndex = freeFlowSpeed > 0
    ? Math.max(0, Math.min(1, 1 - currentSpeed / freeFlowSpeed))
    : 0.5;

  return {
    zoneId,
    congestionIndex: Number(congestionIndex.toFixed(3)),
    currentSpeed: currentSpeed || null,
    freeFlowSpeed: freeFlowSpeed || null,
    currentTravelTime: flow.currentTravelTime || null,
    freeFlowTravelTime: flow.freeFlowTravelTime || null,
    confidence: Number(flow.confidence || 0),
    roadClosure: Boolean(flow.roadClosure),
    source: 'tomtom',
    isLive: true,
    dataFreshness: 'fresh',
    lastUpdated: new Date().toISOString(),
  };
}

async function getTrafficForZone(zoneId, options = {}) {
  const zone = getZone(zoneId);
  if (!zone) return buildFallbackTraffic(zoneId, 'Unknown zone');

  const cacheKey = `traffic:${zoneId}`;
  if (!options.forceRefresh) {
    const cached = await getCache(cacheKey);
    if (cached) return { ...cached, fromCache: true };
  }

  if (!TOMTOM_API_KEY) {
    return buildFallbackTraffic(zoneId);
  }

  try {
    const response = await axios.get(
      'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json',
      {
        params: {
          key: TOMTOM_API_KEY,
          point: `${zone.lat},${zone.lng}`,
          unit: 'kmph',
        },
        timeout: 7000,
        proxy: false,
      }
    );

    const result = normalizeTomTomResponse(zoneId, response.data);
    await setCache(cacheKey, result, TRAFFIC_TTL_SECONDS);
    return result;
  } catch (err) {
    const cached = await getCache(cacheKey);
    if (cached) {
      return { ...cached, isLive: false, dataFreshness: 'stale', error: err.message };
    }
    return buildFallbackTraffic(zoneId, err.message);
  }
}

async function getTrafficForAllZones(options = {}) {
  const results = [];
  for (const zone of zones) {
    results.push(await getTrafficForZone(zone.zoneId, options));
  }
  return results;
}

function trafficContributionMultiplier(congestionIndex) {
  const congestion = Number.isFinite(congestionIndex) ? congestionIndex : 0.5;
  return 0.5 + congestion * 1.5;
}

module.exports = {
  getTrafficForZone,
  getTrafficForAllZones,
  trafficContributionMultiplier,
};
