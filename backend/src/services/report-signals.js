const { getCache, setCache } = require('./cache');

const TTL_SECONDS = 21600; // 6 hours
const CATEGORY_TO_ATTRIBUTION = {
  garbage_burning: 'biomass_burning',
  construction_dust: 'construction',
  vehicle_smoke: 'traffic',
  industrial_emission: 'industrial',
};

function severityMultiplier(severity) {
  if (severity === 'high') return 1.4;
  if (severity === 'medium') return 1.0;
  return 0.6;
}

function computeReportWeight(classification) {
  return Number(((classification.confidence || 0) * severityMultiplier(classification.severity)).toFixed(3));
}

async function applyReportSignal(zoneId, classification) {
  const attributionCategory = CATEGORY_TO_ATTRIBUTION[classification.category];
  if (!attributionCategory) return { applied: false, weight: 0 };

  const key = `source_attr:${zoneId}:${attributionCategory}_reports`;
  const previous = await getCache(key);
  const previousWeight = Number(previous?.weight || 0);
  const weight = computeReportWeight(classification);
  await setCache(key, { weight: Number((previousWeight + weight).toFixed(3)), updatedAt: new Date().toISOString() }, TTL_SECONDS);
  return { applied: true, weight };
}

async function getReportSignals(zoneId) {
  const signals = {};
  for (const category of Object.values(CATEGORY_TO_ATTRIBUTION)) {
    const data = await getCache(`source_attr:${zoneId}:${category}_reports`);
    signals[category] = Number(data?.weight || 0);
  }
  return signals;
}

module.exports = {
  applyReportSignal,
  getReportSignals,
  computeReportWeight,
};
