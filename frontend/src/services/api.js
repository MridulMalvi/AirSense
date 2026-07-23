/**
 * api.js — All axios API calls, centralized.
 * Base URL driven by VITE_API_BASE_URL env var (falls back to /api via Vite proxy).
 */

import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({ baseURL: BASE, timeout: 15000 });

// ── Zones ─────────────────────────────────────────────────────────────────────
export async function fetchZones() {
  const { data } = await api.get("/zones");
  return data;
}

// ── Forecast ──────────────────────────────────────────────────────────────────
export async function fetchForecast(wardId) {
  const { data } = await api.get(`/forecast/${wardId}`);
  return data;
}

// ── Attribution ───────────────────────────────────────────────────────────────
export async function fetchAttribution(zoneId) {
  const { data } = await api.get(`/attribution/${zoneId}`);
  return data;
}

// ── Live AQI / traffic ────────────────────────────────────────────────────────
export async function fetchLiveAQI() {
  const { data } = await api.get("/live/aqi");
  return data;
}

export async function fetchTraffic() {
  const { data } = await api.get("/traffic");
  return data;
}

// ── Enforcement ───────────────────────────────────────────────────────────────
export async function fetchEnforcementPriorities(limit = 10) {
  const { data } = await api.get(`/enforcement/priorities?limit=${limit}`);
  return data;
}

// ── Cities comparison ─────────────────────────────────────────────────────────
export async function fetchCitiesCompare(cities = ["delhi", "mumbai", "kolkata"]) {
  const { data } = await api.get(`/cities/compare?cities=${cities.join(",")}`);
  return data;
}

// ── Advisory chat ─────────────────────────────────────────────────────────────
export async function postAdvisoryChat({ location, query, language }) {
  const { data } = await api.post("/advisory/chat", { location, query, language });
  return data;
}

// ── Crowdsourced pollution reports ────────────────────────────────────────────
export async function submitPollutionReport({ zoneId, reporterId, image, description }) {
  const form = new FormData();
  form.append("zoneId", zoneId);
  form.append("reporterId", reporterId);
  form.append("description", description || "");
  form.append("image", image);

  const { data } = await api.post("/reports/submit", form, {
    headers: { "content-type": "multipart/form-data" },
    timeout: 30000,
  });
  return data;
}

export async function fetchWardReports(zoneId) {
  const { data } = await api.get(`/reports/ward/${zoneId}`);
  return data;
}

// ── AQI alerts ────────────────────────────────────────────────────────────────
export async function subscribeToAlerts(payload) {
  const { data } = await api.post("/alerts/subscribe", payload);
  return data;
}

export async function sendTestAlert(payload) {
  const { data } = await api.post("/alerts/test", payload);
  return data;
}

export async function fetchAlertSummary() {
  const { data } = await api.get("/alerts/summary");
  return data;
}

// ── What-if simulation ───────────────────────────────────────────────────────
export async function runSimulation(payload) {
  const { data } = await api.post("/simulation/run", payload, { timeout: 30000 });
  return data;
}
