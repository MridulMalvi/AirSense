/**
 * ml-client.js
 * Axios wrapper for calling the Python ML microservice.
 * Falls back to mock_outputs.json if ML service is unavailable OR DEMO_MODE=true.
 */

const axios = require('axios');
const { getMockData } = require('./mock-data');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const DEMO_MODE = process.env.DEMO_MODE === 'true';

/**
 * Generic ML service caller with mock fallback.
 * @param {string} endpoint - e.g. '/forecast/anand-vihar'
 * @param {string} method - 'get' | 'post'
 * @param {object} data - POST body (optional)
 */
async function callML(endpoint, method = 'get', data = null) {
  if (DEMO_MODE) {
    console.log(`[DEMO_MODE] Returning mock data for ${endpoint}`);
    return getMockResponse(endpoint, data);
  }

  try {
    const url = `${ML_SERVICE_URL}${endpoint}`;
    const response = await axios({ method, url, data, timeout: 10000 });
    return response.data;
  } catch (err) {
    console.warn(`[ML CLIENT] ML service unavailable (${err.message}), falling back to mock data`);
    const mockResponse = getMockResponse(endpoint, data);
    if (mockResponse) {
      return { ...mockResponse, dataFreshness: 'stale' };
    }
    throw new Error('ML service down and no mock data available for this endpoint');
  }
}

/**
 * Parse the endpoint path and return the relevant mock data slice.
 */
function getMockResponse(endpoint, data = null) {
  const mockData = getMockData();

  // /simulation/run
  if (endpoint.startsWith('/simulation')) {
    return generateSimulationMock(data);
  }

  if (!mockData) return null;

  // /forecast/:wardId
  const forecastMatch = endpoint.match(/^\/forecast\/(.+)$/);
  if (forecastMatch) {
    const wardId = forecastMatch[1];
    return mockData.forecast[wardId] || Object.values(mockData.forecast)[0];
  }

  // /attribution/:zoneId
  const attributionMatch = endpoint.match(/^\/attribution\/(.+)$/);
  if (attributionMatch) {
    const zoneId = attributionMatch[1];
    return mockData.attribution[zoneId] || Object.values(mockData.attribution)[0];
  }

  // /enforcement/priorities
  if (endpoint.startsWith('/enforcement')) {
    return mockData.enforcement;
  }

  return null;
}

function generateSimulationMock(payload = {}) {
  const forecastHours = Math.max(12, Math.min(72, parseInt(payload?.forecast_hours || payload?.forecastHours) || 48));
  const wardIds = payload?.ward_ids || [payload?.ward_id || 'anand-vihar'];
  const interventions = payload?.interventions || {};
  const zoneContext = payload?.zone_context || {};

  const currentAQI = parseFloat(zoneContext.currentAQI) || 180;
  const congestion = zoneContext.congestionIndex !== undefined ? parseFloat(zoneContext.congestionIndex) : 0.5;
  const construction = zoneContext.constructionActivity !== undefined ? parseFloat(zoneContext.constructionActivity) : 0.55;
  const industrial = zoneContext.industrialActivity !== undefined ? parseFloat(zoneContext.industrialActivity) : 0.55;
  const windSpeed = zoneContext.windSpeed !== undefined ? parseFloat(zoneContext.windSpeed) : 3.5;
  const humidity = zoneContext.humidity !== undefined ? parseFloat(zoneContext.humidity) : 60;

  const trafficReduction = Math.min(Math.max((parseFloat(interventions.traffic_diversion_percent) || 0) / 100, 0), 1);
  const constructionReduction = interventions.halt_construction ? 1.0 : Math.min(Math.max((parseFloat(interventions.construction_reduction_percent) || 0) / 100, 0), 1);
  const industrialReduction = interventions.industrial_shutdown ? 1.0 : Math.min(Math.max((parseFloat(interventions.industrial_reduction_percent) || 0) / 100, 0), 1);

  const baseline = [];
  const simulated = [];
  let baseAQI = currentAQI;
  let simAQI = currentAQI;
  const now = new Date();

  for (let i = 0; i < forecastHours; i++) {
    const hour = i + 1;
    const ts = new Date(now.getTime() + hour * 3600000);
    const hourOfDay = ts.getUTCHours();
    const hourFactor = (hourOfDay >= 7 && hourOfDay <= 10) ? 1.08 : (hourOfDay >= 17 && hourOfDay <= 20) ? 1.10 : (hourOfDay <= 5) ? 0.94 : 1.0;

    const baseTraffic = congestion * 5.2;
    const simTraffic = congestion * (1 - trafficReduction) * 5.2;

    const baseConst = construction * 3.4;
    const simConst = construction * (1 - constructionReduction) * 3.4;

    const baseInd = industrial * 2.8;
    const simInd = industrial * (1 - industrialReduction) * 2.8;

    const dispersion = Math.min(windSpeed, 20) * 0.45;
    const humidityPenalty = humidity >= 80 ? 1.6 : 0.0;
    const dailyWave = Math.sin((i / 24.0) * Math.PI * 2) * 2.2;

    const baseDelta = baseTraffic + baseConst + baseInd + humidityPenalty + dailyWave + (hourFactor - 1) * 12 - dispersion - 3.2;
    const simDelta = simTraffic + simConst + simInd + humidityPenalty + dailyWave + (hourFactor - 1) * 12 - dispersion - 3.2;

    baseAQI = Math.max(0, Math.min(500, Math.round(baseAQI + baseDelta)));
    simAQI = Math.max(0, Math.min(500, Math.round(simAQI + simDelta)));

    baseline.push({ hour, timestamp: ts.toISOString(), aqi: baseAQI });
    simulated.push({ hour, timestamp: ts.toISOString(), aqi: simAQI });
  }

  const reductions = baseline.map((b, idx) => b.aqi - simulated[idx].aqi);
  const avgReduction = reductions.length ? Number((reductions.reduce((a, b) => a + b, 0) / reductions.length).toFixed(1)) : 0;
  const peakReduction = reductions.length ? Math.max(...reductions) : 0;
  const peakHour = reductions.indexOf(peakReduction) + 1;

  const trafficDelta = Number((trafficReduction * -18).toFixed(1));
  const constructionDelta = Number((constructionReduction * -12).toFixed(1));
  const industrialDelta = Number((industrialReduction * -10).toFixed(1));

  return {
    ward_ids: wardIds,
    baseline_aqi: baseline,
    simulated_aqi: simulated,
    delta_summary: {
      avg_reduction: avgReduction,
      peak_improvement_at_hour: peakHour,
      confidence: 0.78,
    },
    contributing_factors: {
      vehicular: trafficDelta,
      construction: constructionDelta,
      industrial: industrialDelta,
    },
  };
}

module.exports = { callML };
