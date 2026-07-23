/**
 * zones.routes.js — Returns canonical zone list used by the ML service.
 * GET /api/zones  -> { zones: [...], count: N }
 *
 * Fix 3: This endpoint was missing -- frontend fetchZones() silently fell back
 * to the local FALLBACK_ZONES constant. Now returns live zone data from the
 * shared zones_metadata.csv via the zones service.
 */

const express = require('express');
const router = express.Router();
const { zones } = require('../services/zones');

// GET /api/zones
router.get('/', (_req, res) => {
  res.json({
    zones,
    count: zones.length,
    source: 'zones_metadata.csv',
  });
});

module.exports = router;
