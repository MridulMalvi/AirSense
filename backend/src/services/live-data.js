const Reading = require('../models/Reading');
const { getCache, setCache } = require('./cache');
const { getZone, zones } = require('./zones');
const { fetchOpenWeatherAirQuality, fetchOpenWeatherWeather } = require('./openweather-client');

const LIVE_TTL_SECONDS = 900;

function freshnessFromFetchedAt(fetchedAt) {
  if (!fetchedAt) return 'stale';
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  return ageMs <= LIVE_TTL_SECONDS * 1000 ? 'fresh' : 'stale';
}

async function getLatestZoneAirQuality(zoneId, options = {}) {
  const zone = getZone(zoneId);
  if (!zone) return null;

  const cacheKey = `live:aqi:${zoneId}`;
  if (!options.forceRefresh) {
    const cached = await getCache(cacheKey);
    if (cached) {
      return { ...cached, dataFreshness: freshnessFromFetchedAt(cached.fetchedAt), fromCache: true };
    }
  }

  try {
    const live = await fetchOpenWeatherAirQuality({ lat: zone.lat, lng: zone.lng });
    const result = {
      zoneId,
      stationId: zone.caaqmsStationRef,
      lat: zone.lat,
      lng: zone.lng,
      currentAQI: live.aqi,
      providerAQI: live.providerAQI,
      pollutants: live.pollutants,
      observedAt: live.observedAt,
      fetchedAt: new Date().toISOString(),
      source: live.source,
      isLive: true,
      dataFreshness: 'fresh',
    };

    await setCache(cacheKey, result, LIVE_TTL_SECONDS);

    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        await Reading.findOneAndUpdate(
          { stationId: result.stationId, timestamp: new Date(result.observedAt) },
          {
            stationId: result.stationId,
            timestamp: new Date(result.observedAt),
            pm25: result.pollutants.pm25,
            pm10: result.pollutants.pm10,
            no2: result.pollutants.no2,
            so2: result.pollutants.so2,
            co: result.pollutants.co,
            aqi: result.currentAQI,
          },
          { upsert: true, new: true, runValidators: true }
        );
      }
    } catch (dbErr) {
      console.warn('[LIVE DATA] Reading persist failed (non-fatal):', dbErr.message);
    }

    return result;
  } catch (err) {
    const cached = await getCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        isLive: false,
        dataFreshness: 'stale',
        source: `${cached.source || 'openweather'}-stale-cache`,
        error: err.message,
      };
    }

    return {
      zoneId,
      currentAQI: null,
      pollutants: null,
      fetchedAt: new Date().toISOString(),
      source: 'unavailable',
      isLive: false,
      dataFreshness: 'stale',
      error: err.message,
    };
  }
}

async function getLatestZoneWeather(zoneId, options = {}) {
  const zone = getZone(zoneId);
  if (!zone) return null;

  const cacheKey = `live:weather:${zoneId}`;
  if (!options.forceRefresh) {
    const cached = await getCache(cacheKey);
    if (cached) {
      return { ...cached, dataFreshness: freshnessFromFetchedAt(cached.fetchedAt), fromCache: true };
    }
  }

  try {
    const live = await fetchOpenWeatherWeather({ lat: zone.lat, lng: zone.lng });
    const result = {
      zoneId,
      ...live,
      fetchedAt: new Date().toISOString(),
      dataFreshness: 'fresh',
    };
    await setCache(cacheKey, result, LIVE_TTL_SECONDS);
    return result;
  } catch (err) {
    const cached = await getCache(cacheKey);
    if (cached) {
      return { ...cached, isLive: false, dataFreshness: 'stale', error: err.message };
    }
    return { zoneId, source: 'unavailable', isLive: false, dataFreshness: 'stale', error: err.message };
  }
}

async function getAllZoneAirQuality(options = {}) {
  const results = [];
  for (const zone of zones) {
    results.push(await getLatestZoneAirQuality(zone.zoneId, options));
  }
  return results;
}

module.exports = {
  getLatestZoneAirQuality,
  getLatestZoneWeather,
  getAllZoneAirQuality,
};
