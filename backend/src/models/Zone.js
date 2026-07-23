const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema({
  zoneId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  city: { type: String, required: true, default: 'delhi' },
  geoBoundary: {
    type: { type: String, enum: ['Polygon'], default: 'Polygon' },
    coordinates: [[[Number]]],  // GeoJSON polygon coordinates
  },
  landUseType: {
    type: String,
    enum: ['industrial', 'residential', 'commercial', 'mixed'],
    required: true,
  },
  population: Number,
  lat: Number,   // centroid lat (for quick distance calc)
  lng: Number,   // centroid lng
}, { timestamps: true });

// Geospatial index for zone boundary queries
ZoneSchema.index({ geoBoundary: '2dsphere' });

module.exports = mongoose.model('Zone', ZoneSchema);
