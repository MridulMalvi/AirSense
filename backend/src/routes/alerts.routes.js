const express = require('express');
const router = express.Router();
const AlertSubscriber = require('../models/AlertSubscriber');
const AlertLog = require('../models/AlertLog');
const { isValidZone, zoneIds, getZone } = require('../services/zones');
const { sendZoneAlert } = require('../services/alert-service');

router.post('/subscribe', async (req, res) => {
  const {
    token,
    zoneId,
    language = 'en',
    channel = 'web_push',
    thresholds = { moderate: false, poor: true, severe: true },
  } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'Push token is required.' } });
  }
  if (!isValidZone(zoneId)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_ZONE', message: `Valid zones: ${zoneIds.join(', ')}` } });
  }
  if (!['en', 'hi', 'kn'].includes(language)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_LANGUAGE', message: 'language must be en, hi, or kn.' } });
  }

  const zone = getZone(zoneId);
  let subscriber = null;
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      subscriber = await AlertSubscriber.findOneAndUpdate(
        { token, zoneId },
        {
          token,
          zoneId,
          zoneName: zone?.name,
          language,
          channel,
          active: true,
          alertThresholds: thresholds,
          updatedAt: new Date(),
        },
        { upsert: true, new: true, runValidators: true }
      );
    }
  } catch (err) {
    console.warn('[ALERT SUBSCRIBE]', err.message);
  }

  res.json({ success: true, subscriber: subscriber || { token, zoneId, active: true } });
});

router.delete('/unsubscribe', async (req, res) => {
  const { token, zoneId } = req.body;
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      await AlertSubscriber.updateMany(
        { token, ...(zoneId ? { zoneId } : {}) },
        { active: false, updatedAt: new Date() }
      );
    }
  } catch (err) {
    console.warn('[ALERT UNSUBSCRIBE]', err.message);
  }
  res.json({ success: true });
});

router.post('/test', async (req, res) => {
  const { zoneId = 'anand-vihar', title, body, aqi } = req.body;
  if (!isValidZone(zoneId)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_ZONE', message: `Valid zones: ${zoneIds.join(', ')}` } });
  }

  try {
    const result = await sendZoneAlert(zoneId, { title, body, aqi });
    res.json({ success: true, result });
  } catch (err) {
    res.status(503).json({ success: false, error: { code: 'ALERT_SEND_FAILED', message: err.message } });
  }
});

router.get('/summary', async (_req, res) => {
  let activeSubscribers = 0;
  let logs = [];
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      [activeSubscribers, logs] = await Promise.all([
        AlertSubscriber.countDocuments({ active: true }),
        AlertLog.find().sort({ createdAt: -1 }).limit(20).lean(),
      ]);
    }
  } catch (err) {
    console.warn('[ALERT SUMMARY]', err.message);
  }
  res.json({
    success: true,
    activeSubscribers,
    recentLogs: logs,
  });
});

module.exports = router;
