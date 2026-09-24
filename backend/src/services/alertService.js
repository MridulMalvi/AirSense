/**
 * alertService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Citizen Engagement — Automated AQI Push-Alert System
 *
 * Strategy
 * --------
 * • Uses Telegram Bot API (node-telegram-bot-api) — free, unlimited, no phone
 *   verification per recipient needed.  Ideal for hackathon prototypes.
 * • Runs a node-cron job every 6 hours to poll AQI forecasts for every
 *   monitored zone.
 * • When any zone's 24-hr forecasted AQI exceeds ALERT_THRESHOLD (default 300
 *   = "Severe" on India's CPCB AQI scale), an alert message is dispatched to
 *   the configured Telegram chat / channel.
 *
 * Production upgrade path
 * -----------------------
 * Replace `fetchForecastedAQI()` with a real call to `callML('/forecast/:id')`
 * once the ML service is ready.  The rest of the service is unchanged.
 *
 * Required .env variables (see bottom of this file for full list)
 * ───────────────────────────────────────────────────────────────
 *   TELEGRAM_BOT_TOKEN     — token from @BotFather
 *   TELEGRAM_ALERT_CHAT_ID — chat_id of the target user / group / channel
 *   AQI_ALERT_THRESHOLD    — (optional) override default 300
 *   ALERT_CRON_SCHEDULE    — (optional) override default "0 every-6hrs * * *"
 *   ALERTS_ENABLED         — set to "false" to disable without removing code
 */

'use strict';

const { TelegramBot } = require('node-telegram-bot-api');
const cron = require('node-cron');
const { zones } = require('./zones');

// ─── Configuration ────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ALERT_CHAT_ID;
const ALERT_THRESHOLD = Number(process.env.AQI_ALERT_THRESHOLD) || 300;

/**
 * Cron schedule — default: every 6 hours at the top of the hour.
 * Override via ALERT_CRON_SCHEDULE env var.
 * Examples:
 *   "0 every-3hrs * * *"   → every 3 hours (write 0 SLASH*SLASH3 * * *)
 *   "every-5min * * * *"   → every 5 minutes (useful for demo / testing)
 */
const CRON_SCHEDULE = process.env.ALERT_CRON_SCHEDULE || '0 */6 * * *';
const ALERTS_ENABLED = process.env.ALERTS_ENABLED !== 'false'; // default ON

// ─── AQI helpers ─────────────────────────────────────────────────────────────

/**
 * Maps a numeric AQI value to the CPCB India category label + emoji.
 * @param {number} aqi
 * @returns {{ label: string, emoji: string }}
 */
function aqiCategory(aqi) {
  if (aqi <= 50) return { label: 'Good', emoji: '🟢' };
  if (aqi <= 100) return { label: 'Satisfactory', emoji: '🟡' };
  if (aqi <= 200) return { label: 'Moderate', emoji: '🟠' };
  if (aqi <= 300) return { label: 'Poor', emoji: '🔴' };
  if (aqi <= 400) return { label: 'Very Poor', emoji: '🟣' };
  return { label: 'Severe', emoji: '⚫' };
}

// ─── Mock forecast fetcher (replace with real ML call later) ─────────────────

/**
 * Simulates fetching the 24-hour ahead AQI forecast for a given zone.
 *
 * The simulation produces realistic Delhi AQI variance:
 *   - Base AQI varies by land-use type (industrial zones trend higher)
 *   - A deterministic but zone-specific random jitter is applied
 *   - ~15% of calls intentionally spike above the ALERT_THRESHOLD to
 *     ensure the alert path is exercised during demos
 *
 * TODO (Week 3): swap body with → return callML(`/forecast/${zone.zoneId}`)
 *                and extract the 24hr aqi value from the ML response shape.
 *
 * @param {{ zoneId: string, name: string, landUseType: string }} zone
 * @returns {Promise<{ zoneId: string, zoneName: string, forecastedAQI: number, forecastHorizon: string, dataSource: string }>}
 */
async function fetchForecastedAQI(zone) {
  // Base AQI by land-use type — reflects real Delhi patterns
  const baseByLandUse = {
    industrial: 280,
    commercial: 210,
    mixed: 200,
    residential: 170,
  };
  const base = baseByLandUse[zone.landUseType] ?? 200;

  // Deterministic jitter derived from zoneId hash so results are reproducible
  // within a single run but vary across zones.
  const jitter =
    zone.zoneId
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 80; // 0–79

  // Small time-based variation so the value shifts slightly each cron run
  const timeFactor = Math.floor(Date.now() / (1000 * 60 * 60)) % 40; // 0–39

  const forecastedAQI = Math.round(base + jitter - 40 + timeFactor);

  return {
    zoneId: zone.zoneId,
    zoneName: zone.name,
    forecastedAQI,
    forecastHorizon: '24h',
    dataSource: 'mock', // ← flip to 'ml-service' after real model is wired
  };
}

// ─── Telegram message builder ─────────────────────────────────────────────────

/**
 * Formats the list of breaching zones into a single Telegram message.
 * Uses HTML parse mode for bold/italic — Telegram renders it natively.
 *
 * @param {Array<{ zoneId, zoneName, forecastedAQI, forecastHorizon }>} breachingZones
 * @returns {string} HTML-formatted Telegram message
 */
function buildAlertMessage(breachingZones) {
  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const zoneLines = breachingZones
    .sort((a, b) => b.forecastedAQI - a.forecastedAQI) // worst first
    .map((z) => {
      const { emoji, label } = aqiCategory(z.forecastedAQI);
      return (
        `${emoji} <b>${z.zoneName}</b>\n` +
        `   AQI (${z.forecastHorizon} forecast): <b>${z.forecastedAQI}</b> — ${label}`
      );
    })
    .join('\n\n');

  return (
    `🚨 <b>AirSense — Severe AQI Alert</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ <b>${breachingZones.length} zone(s)</b> in Delhi are forecast to exceed ` +
    `AQI ${ALERT_THRESHOLD} in the next 24 hours.\n\n` +
    `${zoneLines}\n\n` +
    `🕒 Checked at: ${timestamp}\n` +
    `📊 Threshold: AQI > ${ALERT_THRESHOLD} (Severe)\n` +
    `🔗 Open AirSense dashboard for enforcement priorities.\n\n` +
    `<i>ℹ️ Forecast is model-estimated. Data may include mock values during prototype phase.</i>`
  );
}

// ─── Core check-and-alert logic ───────────────────────────────────────────────

/**
 * Main polling function — called by the cron job and on-demand.
 * Fetches forecasts for all monitored zones, collects breaches, sends one
 * consolidated Telegram message (not a separate message per zone).
 *
 * @param {TelegramBot} bot - initialised bot instance
 * @returns {Promise<{ checked: number, breaches: number, sent: boolean }>}
 */
async function runAQICheck(bot) {
  console.log('[AlertService] Starting AQI forecast check…');

  // Only check Delhi zones — filter out other cities if zones.js grows
  const delhiZones = zones.filter((z) => !z.city || z.city === 'delhi');

  const results = await Promise.allSettled(
    delhiZones.map((zone) => fetchForecastedAQI(zone))
  );

  const breachingZones = [];

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      const data = result.value;
      if (data.forecastedAQI > ALERT_THRESHOLD) {
        breachingZones.push(data);
        console.log(
          `[AlertService] ⚠️  Breach detected — ${data.zoneName}: AQI ${data.forecastedAQI}`
        );
      }
    } else {
      // Individual zone failure is logged but doesn't abort the whole check
      console.warn(
        `[AlertService] Failed to fetch forecast for zone index ${idx}:`,
        result.reason?.message
      );
    }
  });

  console.log(
    `[AlertService] Check complete — ${delhiZones.length} zones checked, ` +
      `${breachingZones.length} breach(es) found.`
  );

  if (breachingZones.length === 0) {
    return { checked: delhiZones.length, breaches: 0, sent: false };
  }

  // Send one consolidated message to avoid flooding the chat
  try {
    const message = buildAlertMessage(breachingZones);
    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'HTML' });
    console.log(
      `[AlertService] ✅ Alert sent to chat ${CHAT_ID} for ${breachingZones.length} zone(s).`
    );
    return { checked: delhiZones.length, breaches: breachingZones.length, sent: true };
  } catch (err) {
    console.error('[AlertService] ❌ Failed to send Telegram message:', err.message);
    // Re-throw so the caller / cron wrapper can log it as a job failure
    throw err;
  }
}

// ─── Service initialisation ───────────────────────────────────────────────────

/**
 * Initialises the Telegram bot and registers the cron job.
 * Call this once from app.js after the server starts listening.
 *
 * Safe to call when ALERTS_ENABLED=false — exits immediately without
 * creating a bot instance or scheduling any jobs.
 *
 * @returns {{ bot: TelegramBot|null, job: cron.ScheduledTask|null, runNow: Function }}
 */
function initAlertService() {
  // ── Guard: feature flag ────────────────────────────────────────────────────
  if (!ALERTS_ENABLED) {
    console.log('[AlertService] ℹ️  ALERTS_ENABLED=false — alert service is disabled.');
    return { bot: null, job: null, runNow: async () => {} };
  }

  // ── Guard: required env vars ───────────────────────────────────────────────
  if (!BOT_TOKEN) {
    console.error(
      '[AlertService] ❌ TELEGRAM_BOT_TOKEN is not set. ' +
        'Alert service will NOT start. Add it to backend/.env'
    );
    return { bot: null, job: null, runNow: async () => {} };
  }
  if (!CHAT_ID) {
    console.error(
      '[AlertService] ❌ TELEGRAM_ALERT_CHAT_ID is not set. ' +
        'Alert service will NOT start. Add it to backend/.env'
    );
    return { bot: null, job: null, runNow: async () => {} };
  }

  // ── Validate cron expression ───────────────────────────────────────────────
  if (!cron.validate(CRON_SCHEDULE)) {
    console.error(
      `[AlertService] ❌ Invalid ALERT_CRON_SCHEDULE: "${CRON_SCHEDULE}". ` +
        'Falling back to default "0 */6 * * *".'
    );
  }

  // ── Instantiate the bot in polling=false mode ──────────────────────────────
  // We only SEND messages — no need to poll for incoming updates.
  const bot = new TelegramBot(BOT_TOKEN, { polling: false });

  // ── Cron job ───────────────────────────────────────────────────────────────
  const effectiveSchedule = cron.validate(CRON_SCHEDULE) ? CRON_SCHEDULE : '0 */6 * * *';
  const job = cron.schedule(
    effectiveSchedule,
    async () => {
      try {
        await runAQICheck(bot);
      } catch (err) {
        // Cron errors are non-fatal — log and move on until next tick
        console.error('[AlertService] Cron job encountered an error:', err.message);
      }
    },
    {
      timezone: 'Asia/Kolkata', // ensures cron fires in IST, not server UTC
    }
  );

  console.log(
    `[AlertService] ✅ Initialised — schedule: "${effectiveSchedule}" (IST), ` +
      `threshold: AQI > ${ALERT_THRESHOLD}, chat: ${CHAT_ID}`
  );

  /**
   * runNow() — convenience helper for testing without waiting for the cron.
   * Call it from a one-off script or a debug route:
   *   const { runNow } = require('./services/alertService').init();
   *   await runNow();
   */
  const runNow = () => runAQICheck(bot);

  return { bot, job, runNow };
}

module.exports = { initAlertService };
