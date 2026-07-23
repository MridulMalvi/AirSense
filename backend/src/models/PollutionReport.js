const mongoose = require('mongoose');

const PollutionReportSchema = new mongoose.Schema({
  reporterId: { type: String, required: true },
  zoneId: { type: String, required: true, ref: 'Zone' },
  zoneName: String,
  coordinates: {
    lat: Number,
    lng: Number,
  },
  imageUrl: { type: String, required: true },
  imagePublicId: String,
  userDescription: String,
  classification: {
    category: {
      type: String,
      enum: ['garbage_burning', 'construction_dust', 'vehicle_smoke', 'industrial_emission', 'unknown'],
      default: 'unknown',
    },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    description: String,
    rawResponse: String,
  },
  status: {
    type: String,
    enum: ['pending', 'validated', 'rejected', 'needs_review'],
    default: 'pending',
  },
  moderationReason: String,
  attributionApplied: { type: Boolean, default: false },
  attributionWeight: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  validatedAt: Date,
}, { timestamps: false });

PollutionReportSchema.index({ zoneId: 1, createdAt: -1 });
PollutionReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PollutionReport', PollutionReportSchema);
