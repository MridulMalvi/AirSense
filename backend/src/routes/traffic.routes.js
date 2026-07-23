const express = require('express');
const router = express.Router();
const { getTrafficForAllZones, getTrafficForZone } = require('../services/traffic-client');
const { isValidZone, zoneIds } = require('../services/zones');

router.get('/', async (req, res) => {
  const traffic = await getTrafficForAllZones({ forceRefresh: req.query.refresh === 'true' });
  res.json({ traffic, count: traffic.length });
});

router.get('/zone/:zoneId', async (req, res) => {
  const { zoneId } = req.params;
  if (!isValidZone(zoneId)) {
    return res.status(400).json({
      error: 'Invalid zone ID',
      message: `zoneId "${zoneId}" not found. Valid zones: ${zoneIds.join(', ')}`,
    });
  }

  const traffic = await getTrafficForZone(zoneId, { forceRefresh: req.query.refresh === 'true' });
  res.json(traffic);
});

module.exports = router;
