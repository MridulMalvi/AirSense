const mongoose = require('mongoose');

const AlertSubscriberSchema = new mongoose.Schema({
  token: { type: String, required: true },
  zoneId: { type: String, required: true, ref: 'Zone' },
  zoneName: String,
  language: { type: String, enum: ['en', 'hi', 'kn'], default: 'en' },
  channel: { type: String, enum: ['web_push', 'in_app'], default: 'web_push' },
  active: { type: Boolean, default: true },
  lastAlertedAt: Date,
  alertThresholds: {
    moderate: { type: Boolean, default: false },
    poor: { type: Boolean, default: true },
    severe: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: false });

AlertSubscriberSchema.index({ token: 1, zoneId: 1 }, { unique: true });
AlertSubscriberSchema.index({ zoneId: 1, active: 1 });

module.exports = mongoose.model('AlertSubscriber', AlertSubscriberSchema);
