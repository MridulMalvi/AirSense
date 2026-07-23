const AlertSubscriber = require('../models/AlertSubscriber');
const AlertLog = require('../models/AlertLog');
const { getZone } = require('./zones');
const { getLatestZoneAirQuality } = require('./live-data');
const { getAQICategory } = require('./aqi-calculator');
const { sendWebPush } = require('./firebase-client');

function getLevel(aqi) {
  if (aqi >= 300) return 'severe';
  if (aqi >= 200) return 'poor';
  if (aqi >= 100) return 'moderate';
  return 'low';
}

function shouldReceive(subscriber, level) {
  if (level === 'severe') return subscriber.alertThresholds?.severe !== false;
  if (level === 'poor') return subscriber.alertThresholds?.poor !== false;
  if (level === 'moderate') return subscriber.alertThresholds?.moderate === true;
  return false;
}

function buildAlertText({ zoneName, aqi, language }) {
  const category = getAQICategory(aqi);
  if (language === 'hi') {
    return {
      title: `AQI अलर्ट: ${zoneName}`,
      body: `आपके क्षेत्र में AQI ${aqi} (${category}) है। बाहर जाते समय मास्क पहनें और संवेदनशील लोग बाहर जाने से बचें।`,
    };
  }
  if (language === 'kn') {
    return {
      title: `AQI ಎಚ್ಚರಿಕೆ: ${zoneName}`,
      body: `ನಿಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ AQI ${aqi} (${category}) ಇದೆ. ಹೊರಗೆ ಹೋಗುವಾಗ ಮಾಸ್ಕ್ ಧರಿಸಿ; ಸೂಕ್ಷ್ಮ ಗುಂಪುಗಳು ಹೊರಗೆ ಹೋಗುವುದನ್ನು ತಪ್ಪಿಸಿ.`,
    };
  }
  return {
    title: `AQI Alert: ${zoneName}`,
    body: `AQI is ${aqi} (${category}) in your area. Wear a mask outdoors and limit exposure for sensitive groups.`,
  };
}

async function sendZoneAlert(zoneId, options = {}) {
  const zone = getZone(zoneId);
  if (!zone) throw new Error(`Unknown zone: ${zoneId}`);

  const liveAQI = await getLatestZoneAirQuality(zoneId);
  const aqi = options.aqi || liveAQI?.currentAQI || 200;
  const level = getLevel(aqi);
  const subscribers = await AlertSubscriber.find({ zoneId, active: true }).lean();
  const eligible = subscribers.filter((subscriber) => shouldReceive(subscriber, level));
  const logs = [];

  for (const subscriber of eligible) {
    const text = buildAlertText({ zoneName: zone.name, aqi, language: subscriber.language });
    let sendResult = { status: 'logged_only', configured: false };
    let error = '';

    try {
      if (subscriber.channel === 'web_push') {
        sendResult = await sendWebPush({
          token: subscriber.token,
          title: options.title || text.title,
          body: options.body || text.body,
          data: { zoneId, aqi, level, link: '/advisory' },
        });
      }
    } catch (err) {
      sendResult = { status: 'failed' };
      error = err.message;
    }

    const log = await AlertLog.create({
      zoneId,
      zoneName: zone.name,
      token: subscriber.token,
      channel: subscriber.channel,
      title: options.title || text.title,
      body: options.body || text.body,
      level,
      aqi,
      status: sendResult.status,
      providerResponse: sendResult.response ? { id: sendResult.response } : { configured: sendResult.configured },
      error,
    });
    logs.push(log);

    await AlertSubscriber.updateOne(
      { _id: subscriber._id },
      { lastAlertedAt: new Date(), updatedAt: new Date() }
    );
  }

  return {
    zoneId,
    zoneName: zone.name,
    aqi,
    level,
    subscribers: subscribers.length,
    sentOrLogged: logs.length,
    logs,
  };
}

module.exports = {
  sendZoneAlert,
  buildAlertText,
  getLevel,
};
