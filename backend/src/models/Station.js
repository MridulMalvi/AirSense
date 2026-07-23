const mongoose = require('mongoose');

const StationSchema = new mongoose.Schema({
  stationId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  city: { type: String, required: true, default: 'delhi' },
}, { timestamps: true });

module.exports = mongoose.model('Station', StationSchema);
