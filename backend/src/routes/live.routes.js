const express = require('express');
const router = express.Router();
const { getAllZoneAirQuality, getLatestZoneAirQuality, getLatestZoneWeather } = require('../services/live-data');
const { isValidZone, zoneIds } = require('../services/zones');

router.get('/aqi', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const readings = await getAllZoneAirQuality({ forceRefresh });
  res.json({
    readings,
    count: readings.length,
    sourcePriority: ['openweather', 'stale-cache', 'unavailable'],
  });
});

router.get('/aqi/:zoneId', async (req, res) => {
  const { zoneId } = req.params;
  if (!isValidZone(zoneId)) {
    return res.status(400).json({
      error: 'Invalid zone ID',
      message: `zoneId "${zoneId}" not found. Valid zones: ${zoneIds.join(', ')}`,
    });
  }

  const reading = await getLatestZoneAirQuality(zoneId, { forceRefresh: req.query.refresh === 'true' });
  return res.json(reading);
});

router.get('/weather/:zoneId', async (req, res) => {
  const { zoneId } = req.params;
  if (!isValidZone(zoneId)) {
    return res.status(400).json({
      error: 'Invalid zone ID',
      message: `zoneId "${zoneId}" not found. Valid zones: ${zoneIds.join(', ')}`,
    });
  }

  const weather = await getLatestZoneWeather(zoneId, { forceRefresh: req.query.refresh === 'true' });
  return res.json(weather);
});

module.exports = router;
