const fs = require('fs');
const path = require('path');

const ZONES_CSV_PATH = path.join(__dirname, '../../../ml-service/data/zones_metadata.csv');

const FALLBACK_ZONES = [
  { zoneId: 'anand-vihar', name: 'Anand Vihar', city: 'delhi', landUseType: 'industrial', lat: 28.6469, lng: 77.3152, population: 48000, caaqmsStationRef: 'DPCC_AV_01' },
  { zoneId: 'rk-puram', name: 'RK Puram', city: 'delhi', landUseType: 'residential', lat: 28.5651, lng: 77.1876, population: 62000, caaqmsStationRef: 'DPCC_RK_01' },
  { zoneId: 'ito', name: 'ITO', city: 'delhi', landUseType: 'commercial', lat: 28.6271, lng: 77.2421, population: 35000, caaqmsStationRef: 'DPCC_ITO_01' },
  { zoneId: 'dwarka', name: 'Dwarka', city: 'delhi', landUseType: 'residential', lat: 28.5921, lng: 77.0460, population: 85000, caaqmsStationRef: 'DPCC_DW_01' },
  { zoneId: 'rohini', name: 'Rohini', city: 'delhi', landUseType: 'residential', lat: 28.7413, lng: 77.1151, population: 92000, caaqmsStationRef: 'DPCC_RH_01' },
  { zoneId: 'punjabi-bagh', name: 'Punjabi Bagh', city: 'delhi', landUseType: 'mixed', lat: 28.6714, lng: 77.1321, population: 54000, caaqmsStationRef: 'DPCC_PB_01' },
  { zoneId: 'okhla', name: 'Okhla', city: 'delhi', landUseType: 'industrial', lat: 28.5355, lng: 77.2767, population: 41000, caaqmsStationRef: 'DPCC_OK_01' },
  { zoneId: 'narela', name: 'Narela', city: 'delhi', landUseType: 'industrial', lat: 28.8561, lng: 77.0956, population: 28000, caaqmsStationRef: 'DPCC_NR_01' },
  { zoneId: 'lodhi-road', name: 'Lodhi Road', city: 'delhi', landUseType: 'commercial', lat: 28.5918, lng: 77.2216, population: 22000, caaqmsStationRef: 'DPCC_LR_01' },
  { zoneId: 'wazirpur', name: 'Wazirpur', city: 'delhi', landUseType: 'industrial', lat: 28.7108, lng: 77.1721, population: 33000, caaqmsStationRef: 'DPCC_WZ_01' },
];

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function loadZonesFromCsv() {
  if (!fs.existsSync(ZONES_CSV_PATH)) {
    return FALLBACK_ZONES;
  }

  const lines = fs.readFileSync(ZONES_CSV_PATH, 'utf-8').trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const row = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index]]));
    return {
      zoneId: record.zoneId,
      name: record.name,
      city: 'delhi',
      landUseType: record.landUseType,
      lat: Number(record.lat),
      lng: Number(record.lng),
      population: Number(record.population_estimate),
      caaqmsStationRef: record.caaqms_station_ref,
    };
  });
}

const zones = loadZonesFromCsv();
const zoneIds = zones.map((zone) => zone.zoneId);
const zoneById = new Map(zones.map((zone) => [zone.zoneId, zone]));

function isValidZone(zoneId) {
  return zoneById.has(zoneId);
}

function getZone(zoneId) {
  return zoneById.get(zoneId) || null;
}

module.exports = {
  zones,
  zoneIds,
  isValidZone,
  getZone,
  ZONES_CSV_PATH,
};
