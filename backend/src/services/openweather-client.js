const axios = require('axios');
const { pm25ToAQI } = require('./aqi-calculator');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const AIR_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';
const WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';

async function fetchOpenWeatherAirQuality({ lat, lng }) {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY is not configured');
  }

  const response = await axios.get(AIR_URL, {
    params: { lat, lon: lng, appid: OPENWEATHER_API_KEY },
    timeout: 7000,
    proxy: false,
  });

  const item = response.data?.list?.[0];
  const components = item?.components || {};
  const pm25 = Number(components.pm2_5 || 0);

  return {
    observedAt: item?.dt ? new Date(item.dt * 1000).toISOString() : new Date().toISOString(),
    aqi: pm25ToAQI(pm25),
    pollutants: {
      pm25,
      pm10: Number(components.pm10 || 0),
      no2: Number(components.no2 || 0),
      so2: Number(components.so2 || 0),
      co: Number(components.co || 0),
      o3: Number(components.o3 || 0),
      nh3: Number(components.nh3 || 0),
    },
    providerAQI: item?.main?.aqi,
    source: 'openweather',
    isLive: true,
  };
}

async function fetchOpenWeatherWeather({ lat, lng }) {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY is not configured');
  }

  const response = await axios.get(WEATHER_URL, {
    params: { lat, lon: lng, appid: OPENWEATHER_API_KEY, units: 'metric' },
    timeout: 7000,
    proxy: false,
  });

  return {
    windSpeed: Number(response.data?.wind?.speed || 0),
    windDirection: Number(response.data?.wind?.deg || 0),
    temperature: Number(response.data?.main?.temp || 0),
    humidity: Number(response.data?.main?.humidity || 0),
    description: response.data?.weather?.[0]?.description || '',
    observedAt: new Date((response.data?.dt || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    source: 'openweather',
    isLive: true,
  };
}

module.exports = {
  fetchOpenWeatherAirQuality,
  fetchOpenWeatherWeather,
};
