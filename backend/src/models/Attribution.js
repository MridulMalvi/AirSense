const mongoose = require('mongoose');

const SourceSchema = new mongoose.Schema({
  category: { type: String, enum: ['traffic', 'industrial', 'construction', 'biomass_burning'] },
  confidence: { type: Number, min: 0, max: 1 },
  evidence: String,
}, { _id: false });

const AttributionSchema = new mongoose.Schema({
  zoneId: { type: String, required: true, ref: 'Zone' },
  timestamp: { type: Date, default: Date.now },
  currentAQI: Number,
  sources: [SourceSchema],
  windDirection: String,
  windSpeed: Number,
  dominantSource: String,
  dataFreshness: { type: String, enum: ['fresh', 'stale'], default: 'fresh' },
}, { timestamps: true });

AttributionSchema.index({ zoneId: 1, timestamp: -1 });

module.exports = mongoose.model('Attribution', AttributionSchema);
