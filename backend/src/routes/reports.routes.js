const express = require('express');
const multer = require('multer');
const router = express.Router();
const PollutionReport = require('../models/PollutionReport');
const { isValidZone, zoneIds, getZone } = require('../services/zones');
const { uploadReportImage } = require('../services/cloudinary-client');
const { classifyPollutionImage } = require('../services/groq-vision-client');
const { applyReportSignal } = require('../services/report-signals');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(null, true);
    return cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
  },
});

function statusFromClassification(classification) {
  if (classification.category === 'unknown') return 'needs_review';
  if (classification.confidence >= 0.6) return 'validated';
  return 'needs_review';
}

router.post('/submit', upload.single('image'), async (req, res) => {
  const { zoneId, reporterId = `anon-${Date.now()}`, description = '', lat, lng } = req.body;

  if (!zoneId || !isValidZone(zoneId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ZONE', message: `Valid zones: ${zoneIds.join(', ')}` },
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_IMAGE', message: 'Attach an image file named "image".' },
    });
  }

  try {
    const zone = getZone(zoneId);
    const uploaded = await uploadReportImage(req.file.buffer, { reporterId, zoneId });
    const classification = await classifyPollutionImage(uploaded.imageUrl);
    const status = statusFromClassification(classification);
    let signal = { applied: false, weight: 0 };

    if (status === 'validated') {
      signal = await applyReportSignal(zoneId, classification);
    }

    const report = await PollutionReport.create({
      reporterId,
      zoneId,
      zoneName: zone?.name,
      coordinates: {
        lat: Number(lat) || zone?.lat,
        lng: Number(lng) || zone?.lng,
      },
      imageUrl: uploaded.imageUrl,
      imagePublicId: uploaded.imagePublicId,
      userDescription: description,
      classification,
      status,
      attributionApplied: signal.applied,
      attributionWeight: signal.weight,
      validatedAt: status === 'validated' ? new Date() : undefined,
    });

    return res.json({
      success: true,
      reportId: report._id,
      status,
      classification,
      attributionApplied: signal.applied,
      attributionWeight: signal.weight,
      message: status === 'validated'
        ? 'Report validated and added to attribution signals.'
        : 'Report submitted for review.',
    });
  } catch (err) {
    console.error('[REPORT SUBMIT]', err.message);
    return res.status(503).json({
      success: false,
      error: { code: 'REPORT_SERVICE_UNAVAILABLE', message: err.message },
    });
  }
});

router.get('/ward/:zoneId', async (req, res) => {
  const { zoneId } = req.params;
  if (!isValidZone(zoneId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ZONE', message: `Valid zones: ${zoneIds.join(', ')}` },
    });
  }

  let reports = [];
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      reports = await PollutionReport.find({ zoneId, createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    }
  } catch (err) {
    console.warn('[REPORTS WARD GET]', err.message);
  }

  const byCategory = {};
  for (const report of reports) {
    const category = report.classification?.category || 'unknown';
    byCategory[category] = (byCategory[category] || 0) + 1;
  }

  res.json({
    success: true,
    reports,
    summary: {
      total: reports.length,
      validated: reports.filter((report) => report.status === 'validated').length,
      byCategory,
    },
  });
});

router.post('/:id/moderate', async (req, res) => {
  const { action, reason = '' } = req.body;
  if (!['validate', 'reject'].includes(action)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ACTION', message: 'action must be "validate" or "reject".' },
    });
  }

  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: { code: 'DB_UNAVAILABLE', message: 'Database not connected.' } });
    }
    const report = await PollutionReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found.' } });
    }

    report.status = action === 'validate' ? 'validated' : 'rejected';
    report.moderationReason = reason;
    report.validatedAt = action === 'validate' ? new Date() : undefined;

    if (action === 'validate' && !report.attributionApplied) {
      const signal = await applyReportSignal(report.zoneId, report.classification);
      report.attributionApplied = signal.applied;
      report.attributionWeight = signal.weight;
    }

    await report.save();
    res.json({ success: true, report });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'MODERATION_FAILED', message: err.message } });
  }
});

module.exports = router;
