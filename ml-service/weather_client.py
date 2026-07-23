"""
weather_client.py — Live weather + air quality fetcher for AirSense ML service

Fetches from OpenWeatherMap:
  - Current weather  : /data/2.5/weather        → wind, temp, humidity
  - Live pollutants  : /data/2.5/air_pollution   → PM2.5, PM10, NO2, SO2, CO, AQI

Both functions fall back gracefully:
  API unavailable → static CSV → hardcoded defaults
Both results are cached for 10 minutes to avoid API hammering.

Usage:
    from weather_client import get_weather, get_air_quality
    weather = get_weather(lat=28.6448, lon=77.2167)
    aq      = get_air_quality(lat=28.6448, lon=77.2167)
"""

import os
import time
import httpx
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Config ─────────────────────────────────────────────────────────────────────
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
OPENWEATHER_URL     = "https://api.openweathermap.org/data/2.5/weather"
OWM_AIR_POLLUTION_URL = "https://api.openweathermap.org/data/2.5/air_pollution"
REQUEST_TIMEOUT     = 5   # seconds
CACHE_TTL_SECONDS   = 600 # 10 minutes

# Delhi centroid defaults
DELHI_LAT = 28.6139
DELHI_LON = 77.2090

DATA_PATH   = Path(__file__).parent / "data"
WEATHER_CSV = DATA_PATH / "weather_samples.csv"
CPCB_CSV    = DATA_PATH / "cpcb_samples.csv"

# In-process caches
_weather_cache: dict = {}
_aq_cache: dict = {}


# ── Weather (wind / temp) ─────────────────────────────────────────────────────

def get_weather(lat: float = DELHI_LAT, lon: float = DELHI_LON) -> dict:
    """
    Returns: windSpeed (m/s), windDirection (°), temperature (°C),
             humidity (%), description, dataSource
    Never raises.
    """
    cache_key = f"{round(lat, 2)},{round(lon, 2)}"
    cached = _weather_cache.get(cache_key)
    if cached and (time.time() - cached["fetched_at"]) < CACHE_TTL_SECONDS:
        return {**cached["data"], "dataSource": "cache"}

    if OPENWEATHER_API_KEY:
        try:
            live = _fetch_live_weather(lat, lon)
            _weather_cache[cache_key] = {"data": live, "fetched_at": time.time()}
            print(f"[WEATHER] Live: wind {live['windSpeed']}m/s @ {live['windDirection']}°, {live['temperature']}°C")
            return live
        except Exception as e:
            print(f"[WEATHER] Live fetch failed ({e}), falling back to CSV")
    else:
        print("[WEATHER] No OPENWEATHER_API_KEY — using CSV fallback")

    return _fallback_weather_from_csv()


def _fetch_live_weather(lat: float, lon: float) -> dict:
    params = {"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric"}
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        resp = client.get(OPENWEATHER_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    wind = data.get("wind", {})
    main = data.get("main", {})
    return {
        "windSpeed":     float(wind.get("speed", 3.5)),
        "windDirection": float(wind.get("deg", 180)),
        "temperature":   float(main.get("temp", 28.0)),
        "humidity":      float(main.get("humidity", 60.0)),
        "description":   data.get("weather", [{}])[0].get("description", ""),
        "dataSource":    "live",
    }


def _fallback_weather_from_csv() -> dict:
    try:
        df = pd.read_csv(WEATHER_CSV, skiprows=3)
        df.columns = ["time", "temp", "humidity", "precip", "wcode", "wind_dir", "wind_speed"]
        df.dropna(subset=["wind_speed", "wind_dir"], inplace=True)
        row = df.iloc[-1]
        return {
            "windSpeed":     float(row["wind_speed"]),
            "windDirection": float(row["wind_dir"]),
            "temperature":   float(row.get("temp", 28.0)),
            "humidity":      float(row.get("humidity", 60.0)),
            "description":   "historical sample",
            "dataSource":    "csv-fallback",
        }
    except Exception as e:
        print(f"[WEATHER] CSV fallback failed ({e}), using defaults")
        return {"windSpeed": 3.5, "windDirection": 180.0, "temperature": 28.0,
                "humidity": 60.0, "description": "default", "dataSource": "hardcoded-default"}


# ── Air Quality (PM2.5, PM10, NO2, SO2, CO, AQI) ─────────────────────────────

def get_air_quality(lat: float = DELHI_LAT, lon: float = DELHI_LON) -> dict:
    """
    Returns: pm25, pm10, no2, so2, co (µg/m³), aqi (US 0-500), aqiSource
    Never raises.
    """
    cache_key = f"aq:{round(lat, 2)},{round(lon, 2)}"
    cached = _aq_cache.get(cache_key)
    if cached and (time.time() - cached["fetched_at"]) < CACHE_TTL_SECONDS:
        return {**cached["data"], "aqiSource": "cache"}

    if OPENWEATHER_API_KEY:
        try:
            live = _fetch_live_aq(lat, lon)
            _aq_cache[cache_key] = {"data": live, "fetched_at": time.time()}
            print(f"[AQI] Live: PM2.5={live['pm25']} µg/m³  NO2={live['no2']}  AQI={live['aqi']}  src={live['aqiSource']}")
            return live
        except Exception as e:
            print(f"[AQI] Live fetch failed ({e}), falling back to CSV")
    else:
        print("[AQI] No OPENWEATHER_API_KEY — using CSV fallback")

    return _fallback_aq_from_csv()


def _fetch_live_aq(lat: float, lon: float) -> dict:
    """OpenWeatherMap Air Pollution API → our pollutant schema."""
    params = {"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY}
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        resp = client.get(OWM_AIR_POLLUTION_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    comp = data["list"][0]["components"]
    pm25 = float(comp.get("pm2_5", 0))
    return {
        "pm25":      pm25,
        "pm10":      float(comp.get("pm10", 0)),
        "no2":       float(comp.get("no2", 0)),
        "so2":       float(comp.get("so2", 0)),
        "co":        float(comp.get("co", 0)),   # µg/m³
        "aqi":       _pm25_to_us_aqi(pm25),
        "aqiSource": "live-owm",
    }


def _fallback_aq_from_csv() -> dict:
    """Last row of cpcb_samples.csv as pollutant fallback."""
    try:
        df = pd.read_csv(CPCB_CSV, skiprows=6)
        df.columns = ["time", "pm10", "pm25", "no2", "so2", "co"]
        df.dropna(subset=["pm25"], inplace=True)
        row = df.iloc[-1]
        pm25 = float(row["pm25"])
        return {
            "pm25":      pm25,
            "pm10":      float(row.get("pm10", 0)),
            "no2":       float(row.get("no2", 0)),
            "so2":       float(row.get("so2", 0)),
            "co":        float(row.get("co", 0)),
            "aqi":       _pm25_to_us_aqi(pm25),
            "aqiSource": "csv-fallback",
        }
    except Exception as e:
        print(f"[AQI] CSV fallback failed ({e}), using hardcoded defaults")
        return {"pm25": 120.0, "pm10": 240.0, "no2": 60.0, "so2": 35.0,
                "co": 1500.0, "aqi": 185, "aqiSource": "hardcoded-default"}


def _pm25_to_us_aqi(pm25: float) -> int:
    """EPA piecewise-linear PM2.5 → US AQI (consistent with forecasting/model.py)."""
    breakpoints = [
        (0.0,   12.0,   0,   50),
        (12.1,  35.4,  51,  100),
        (35.5,  55.4, 101,  150),
        (55.5, 150.4, 151,  200),
        (150.5, 250.4, 201, 300),
        (250.5, 350.4, 301, 400),
        (350.5, 500.4, 401, 500),
    ]
    pm25 = max(0.0, round(float(pm25), 1))
    for c_lo, c_hi, i_lo, i_hi in breakpoints:
        if c_lo <= pm25 <= c_hi:
            return round((i_hi - i_lo) / (c_hi - c_lo) * (pm25 - c_lo) + i_lo)
    return 500 if pm25 > 500.4 else 0
