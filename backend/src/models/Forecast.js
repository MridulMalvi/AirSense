const mongoose = require('mongoose');

const ForecastPointSchema = new mongoose.Schema({
  timestamp: Date,
  predictedAQI: Number,
  confidenceLow: Number,
  confidenceHigh: Number,
}, { _id: false });

const ForecastSchema = new mongoose.Schema({
  wardId: { type: String, required: true, ref: 'Zone' },
  generatedAt: { type: Date, default: Date.now },
  forecast: [ForecastPointSchema],
  baselineComparison: {
    modelRMSE: Number,
    persistenceRMSE: Number,
    modelName: String,
    improvementPercent: Number,
  },
  dataFreshness: { type: String, enum: ['fresh', 'stale'], default: 'fresh' },
}, { timestamps: true });

ForecastSchema.index({ wardId: 1, generatedAt: -1 });

module.exports = mongoose.model('Forecast', ForecastSchema);
