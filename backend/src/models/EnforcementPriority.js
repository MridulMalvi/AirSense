const mongoose = require('mongoose');

const PriorityItemSchema = new mongoose.Schema({
  zoneId: String,
  name: String,
  score: { type: Number, min: 0, max: 1 },
  rank: Number,
  reason: String,
  evidence: {
    aqi: Number,
    aqiCategory: String,
    population: Number,
    dominantSource: String,
    attributionConfidence: Number,
    keyPollutant: String,
    keyPollutantValue: String,
    nearbySourceCount: Number,
  },
}, { _id: false });

const EnforcementPrioritySchema = new mongoose.Schema({
  generatedAt: { type: Date, default: Date.now },
  priorities: [PriorityItemSchema],
  totalZonesEvaluated: Number,
}, { timestamps: true });

module.exports = mongoose.model('EnforcementPriority', EnforcementPrioritySchema);
