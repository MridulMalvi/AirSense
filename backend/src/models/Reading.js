const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
  stationId: { type: String, required: true, ref: 'Station' },
  timestamp: { type: Date, required: true },
  pm25: Number,
  pm10: Number,
  no2: Number,
  so2: Number,
  co: Number,
  aqi: { type: Number, required: true },
}, { timestamps: false });

// Compound index for efficient time-series queries
ReadingSchema.index({ stationId: 1, timestamp: -1 });

module.exports = mongoose.model('Reading', ReadingSchema);
