// Canonical fallback zones list — kept in sync with zones_metadata.csv
// Used by MapView, AdvisoryChat, Dashboard, etc.

export const FALLBACK_ZONES = [
  { zoneId: "anand-vihar",  name: "Anand Vihar",  lat: 28.6469, lng: 77.3152, landUseType: "industrial" },
  { zoneId: "rk-puram",    name: "RK Puram",      lat: 28.5641, lng: 77.1825, landUseType: "residential" },
  { zoneId: "ito",         name: "ITO",            lat: 28.6280, lng: 77.2410, landUseType: "commercial" },
  { zoneId: "dwarka",      name: "Dwarka",         lat: 28.5921, lng: 77.0460, landUseType: "residential" },
  { zoneId: "rohini",      name: "Rohini",         lat: 28.7041, lng: 77.1025, landUseType: "mixed" },
  { zoneId: "punjabi-bagh",name: "Punjabi Bagh",   lat: 28.6692, lng: 77.1310, landUseType: "mixed" },
  { zoneId: "okhla",       name: "Okhla",          lat: 28.5355, lng: 77.2730, landUseType: "industrial" },
  { zoneId: "mandir-marg", name: "Mandir Marg",    lat: 28.6358, lng: 77.2010, landUseType: "commercial" },
  { zoneId: "narela",      name: "Narela",         lat: 28.8561, lng: 77.0956, landUseType: "industrial" },
  { zoneId: "lodhi-road",  name: "Lodhi Road",     lat: 28.5918, lng: 77.2216, landUseType: "commercial" },
  { zoneId: "wazirpur",    name: "Wazirpur",       lat: 28.7108, lng: 77.1721, landUseType: "industrial" },
];

export const ZONE_MAP = Object.fromEntries(FALLBACK_ZONES.map((z) => [z.zoneId, z]));

// AQI scale helpers
export function getAQIColor(aqi) {
  if (!aqi) return "#64748b";
  if (aqi <= 50)  return "#22c55e";
  if (aqi <= 100) return "#a3e635";
  if (aqi <= 200) return "#facc15";
  if (aqi <= 300) return "#f97316";
  if (aqi <= 400) return "#ef4444";
  return "#7c3aed";
}

export function getAQICategory(aqi) {
  if (!aqi) return "Unknown";
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

// Source attribution color palette
export const SOURCE_COLORS = {
  traffic:         "#ef4444",
  industrial:      "#f97316",
  construction:    "#a16207",
  biomass_burning: "#dc2626",
  other:           "#64748b",
};

export const SOURCE_ICONS = {
  traffic:         "🚗",
  industrial:      "🏭",
  construction:    "🏗️",
  biomass_burning: "🔥",
  other:           "❓",
};
