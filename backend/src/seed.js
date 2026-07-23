require('dotenv').config();

const mongoose = require('mongoose');
const Zone = require('./models/Zone');
const Station = require('./models/Station');
const Reading = require('./models/Reading');
const { getMockData } = require('./services/mock-data');
const { zones, ZONES_CSV_PATH } = require('./services/zones');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/airsense';

function buildApproxBoundary(lat, lng) {
  const delta = 0.01;
  return {
    type: 'Polygon',
    coordinates: [[
      [lng - delta, lat - delta],
      [lng + delta, lat - delta],
      [lng + delta, lat + delta],
      [lng - delta, lat + delta],
      [lng - delta, lat - delta],
    ]],
  };
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log(`[SEED] Connected to ${MONGO_URI}`);
  console.log(`[SEED] Loading zones from ${ZONES_CSV_PATH}`);

  const mockData = getMockData();
  const now = new Date();

  for (const zone of zones) {
    await Zone.findOneAndUpdate(
      { zoneId: zone.zoneId },
      {
        zoneId: zone.zoneId,
        name: zone.name,
        city: zone.city,
        landUseType: zone.landUseType,
        population: zone.population,
        lat: zone.lat,
        lng: zone.lng,
        geoBoundary: buildApproxBoundary(zone.lat, zone.lng),
      },
      { upsert: true, new: true, runValidators: true }
    );

    await Station.findOneAndUpdate(
      { stationId: zone.caaqmsStationRef },
      {
        stationId: zone.caaqmsStationRef,
        name: `${zone.name} CAAQMS`,
        lat: zone.lat,
        lng: zone.lng,
        city: zone.city,
      },
      { upsert: true, new: true, runValidators: true }
    );

    const currentAQI = mockData?.attribution?.[zone.zoneId]?.currentAQI
      || mockData?.forecast?.[zone.zoneId]?.forecast?.[0]?.predictedAQI
      || 200;

    await Reading.findOneAndUpdate(
      { stationId: zone.caaqmsStationRef, timestamp: now },
      {
        stationId: zone.caaqmsStationRef,
        timestamp: now,
        pm25: Math.round(currentAQI * 0.45),
        pm10: Math.round(currentAQI * 0.9),
        no2: Math.round(currentAQI * 0.18),
        so2: Math.round(currentAQI * 0.1),
        co: Number((currentAQI / 180).toFixed(2)),
        aqi: currentAQI,
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  console.log(`[SEED] Upserted ${zones.length} zones, ${zones.length} station references, and ${zones.length} demo readings`);
}

seed()
  .catch((err) => {
    console.error('[SEED] Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
