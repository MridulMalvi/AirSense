const express = require('express');
const router = express.Router();
const { callML } = require('../services/ml-client');
const { getLatestZoneAirQuality, getLatestZoneWeather } = require('../services/live-data');
const { getTrafficForZone } = require('../services/traffic-client');
const { isValidZone, zoneIds, getZone } = require('../services/zones');

router.post('/run', async (req, res) => {
  const wardIds = req.body.ward_ids || req.body.wardIds || [req.body.ward_id || req.body.zoneId || 'anand-vihar'];
  const primaryZone = wardIds[0];

  if (!isValidZone(primaryZone)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ZONE', message: `Valid zones: ${zoneIds.join(', ')}` },
    });
  }

  try {
    const [liveAQI, weather, traffic] = await Promise.all([
      getLatestZoneAirQuality(primaryZone),
      getLatestZoneWeather(primaryZone),
      getTrafficForZone(primaryZone),
    ]);
    const zone = getZone(primaryZone);
    const zoneContext = {
      zoneId: primaryZone,
      zoneName: zone?.name,
      currentAQI: liveAQI?.currentAQI,
      source: liveAQI?.source,
      congestionIndex: traffic?.congestionIndex,
      trafficSource: traffic?.source,
      windSpeed: weather?.windSpeed,
      humidity: weather?.humidity,
      industrialActivity: zone?.landUseType === 'industrial' ? 0.85 : zone?.landUseType === 'mixed' ? 0.55 : 0.25,
      constructionActivity: 0.55,
    };

    const simulation = await callML('/simulation/run', 'post', {
      ward_ids: wardIds,
      interventions: req.body.interventions || {},
      forecast_hours: req.body.forecast_hours || req.body.forecastHours || 48,
      zone_context: zoneContext,
    });

    res.json({ success: true, zoneContext, ...simulation });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: { code: 'SIMULATION_UNAVAILABLE', message: err.message },
    });
  }
});

module.exports = router;
