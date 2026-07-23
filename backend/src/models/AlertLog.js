const mongoose = require('mongoose');

const AlertLogSchema = new mongoose.Schema({
  zoneId: String,
  zoneName: String,
  token: String,
  channel: String,
  title: String,
  body: String,
  level: String,
  aqi: Number,
  status: { type: String, enum: ['sent', 'logged_only', 'failed'], default: 'logged_only' },
  providerResponse: Object,
  error: String,
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

AlertLogSchema.index({ zoneId: 1, createdAt: -1 });
AlertLogSchema.index({ token: 1, createdAt: -1 });

module.exports = mongoose.model('AlertLog', AlertLogSchema);
