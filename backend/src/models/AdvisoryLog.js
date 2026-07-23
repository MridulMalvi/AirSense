const mongoose = require('mongoose');

const AdvisoryLogSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },  // anonymous random ID — no PII
  location: String,
  query: String,
  reply: String,
  riskLevel: { type: String, enum: ['low', 'moderate', 'high', 'very-high', 'severe'] },
  language: { type: String, enum: ['en', 'hi', 'kn'], default: 'en' },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: false });

AdvisoryLogSchema.index({ sessionId: 1, timestamp: -1 });

module.exports = mongoose.model('AdvisoryLog', AdvisoryLogSchema);
