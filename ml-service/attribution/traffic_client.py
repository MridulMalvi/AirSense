"""
traffic_client.py — TomTom Traffic Flow API client for AirSense ML service

Fetches live road congestion data for a given lat/lon point using the
TomTom Traffic Flow Segment API (free tier: 2,500 req/day).

Congestion Multiplier definition
---------------------------------
  multiplier = currentTravelTime / freeFlowTravelTime

  = 1.0  → no congestion, traffic moving at free-flow speed
  = 1.5  → 50% slower than free-flow (moderate)
  = 2.0  → twice as slow (heavy congestion)
  = 3.0+ → severe gridlock

Three-tier fallback strategy (hackathon resilient)
---------------------------------------------------
  1. Live TomTom API         (requires TOMTOM_API_KEY in .env)
  2. In-process cache        (10-minute TTL, reduces daily quota burn)
  3. Deterministic mock      (activated if API key missing, rate-limited,
                              or network fails during demo — NEVER raises)

API reference
-------------
  https://developer.tomtom.com/traffic-api/documentation/traffic-flow/flow-segment-data

Usage
-----
    from attribution.traffic_client import get_congestion_multiplier
    multiplier = get_congestion_multiplier(lat=28.6469, lon=77.3152)
    # → e.g. 1.73  (73% slower than free-flow)
"""

import os
import time
import httpx
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ─────────────────────────────────────────────────────────────

TOMTOM_API_KEY: str = os.getenv("TOMTOM_API_KEY", "")

# TomTom Flow Segment endpoint — returns traffic data for the road segment
# nearest to the provided lat/lon point.
# Zoom level 10 gives city-level road segments (good for ward-level analysis).
TOMTOM_FLOW_URL = (
    "https://api.tomtom.com/traffic/services/4/flowSegmentData"
    "/absolute/10/json"
)

REQUEST_TIMEOUT = 6     # seconds — tight enough for hackathon demo latency
CACHE_TTL_SECONDS = 600  # 10-minute cache TTL (matches weather_client.py)

# ── In-process cache ──────────────────────────────────────────────────────────
# Key: "lat_2dp,lon_2dp" (rounded to 2dp = ~1km resolution)
# Value: {"multiplier": float, "raw": dict, "fetched_at": float}
_traffic_cache: dict = {}

# ── Deterministic mock fallback values ────────────────────────────────────────
# Used when no API key is set or the API call fails.
# Values are keyed by rounded lat to give zone-specific mock variation.
# Based on observed Delhi traffic patterns by area type.
_MOCK_MULTIPLIERS_BY_LAT = {
    28.64: 2.1,   # Anand Vihar area — chronically congested
    28.71: 1.4,   # Rohini — moderate residential
    28.56: 1.8,   # RK Puram / Dwarka — evening rush
    28.63: 1.6,   # ITO / central — moderate commercial
    28.67: 1.7,   # Punjabi Bagh
    28.53: 1.5,   # Okhla — industrial, moderate
    28.85: 1.2,   # Narela — low congestion, industrial outskirts
    28.59: 1.4,   # Lodhi Road — tree-lined, less congested
}
_MOCK_DEFAULT_MULTIPLIER = 1.5  # generic Delhi fallback


# ── Public interface ──────────────────────────────────────────────────────────

def get_congestion_multiplier(lat: float, lon: float) -> dict:
    """
    Return congestion data for the road segment nearest to (lat, lon).

    Returns a dict with:
        multiplier   (float): currentTravelTime / freeFlowTravelTime
                              1.0 = free-flow, >1.0 = congested
        current_tt   (float): current travel time in seconds
        free_flow_tt (float): free-flow travel time in seconds
        speed        (float): current speed in km/h
        free_speed   (float): free-flow speed in km/h
        data_source  (str):   "live-tomtom" | "cache" | "mock"

    NEVER raises — always returns a valid dict with a sane multiplier.
    """
    cache_key = f"{round(lat, 2)},{round(lon, 2)}"

    # ── Layer 1: Check cache ───────────────────────────────────────────────────
    cached = _traffic_cache.get(cache_key)
    if cached and (time.time() - cached["fetched_at"]) < CACHE_TTL_SECONDS:
        print(
            f"[TRAFFIC] Cache hit for ({lat:.2f}, {lon:.2f}) — "
            f"multiplier={cached['multiplier']:.2f}"
        )
        return {**cached, "data_source": "cache"}

    # ── Layer 2: Live TomTom API ───────────────────────────────────────────────
    if TOMTOM_API_KEY:
        try:
            result = _fetch_live_traffic(lat, lon)
            # Store in cache (without data_source field to avoid stale labels)
            _traffic_cache[cache_key] = {
                "multiplier":   result["multiplier"],
                "current_tt":   result["current_tt"],
                "free_flow_tt": result["free_flow_tt"],
                "speed":        result["speed"],
                "free_speed":   result["free_speed"],
                "fetched_at":   time.time(),
            }
            print(
                f"[TRAFFIC] Live TomTom ({lat:.4f}, {lon:.4f}): "
                f"speed={result['speed']} km/h, "
                f"free-flow={result['free_speed']} km/h, "
                f"multiplier={result['multiplier']:.2f}"
            )
            return result
        except Exception as exc:
            print(
                f"[TRAFFIC] Live fetch failed ({exc}) — "
                "falling back to deterministic mock"
            )
    else:
        print("[TRAFFIC] No TOMTOM_API_KEY set — using deterministic mock")

    # ── Layer 3: Deterministic mock ────────────────────────────────────────────
    return _get_mock_congestion(lat)


# ── Internal: live API call ───────────────────────────────────────────────────

def _fetch_live_traffic(lat: float, lon: float) -> dict:
    """
    Call TomTom Flow Segment API and parse the response.

    API returns JSON structured as:
      {
        "flowSegmentData": {
          "currentSpeed":    <km/h>,
          "freeFlowSpeed":   <km/h>,
          "currentTravelTime": <seconds>,
          "freeFlowTravelTime": <seconds>,
          ...
        }
      }

    Raises on any HTTP error or missing fields so the caller can fall back.
    """
    params = {
        "key":   TOMTOM_API_KEY,
        "point": f"{lat},{lon}",
        "unit":  "KMPH",
    }
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        resp = client.get(TOMTOM_FLOW_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    fsd = data["flowSegmentData"]

    current_tt   = float(fsd["currentTravelTime"])
    free_flow_tt = float(fsd["freeFlowTravelTime"])

    # Guard against malformed responses where freeFlowTravelTime is 0
    if free_flow_tt <= 0:
        raise ValueError(
            f"TomTom returned freeFlowTravelTime={free_flow_tt} — cannot compute multiplier"
        )

    multiplier = current_tt / free_flow_tt

    # Cap at 5.0 — anything beyond is likely a data anomaly (roadblock, incident)
    # and shouldn't dominate the attribution score unfairly.
    multiplier = min(multiplier, 5.0)

    return {
        "multiplier":   round(multiplier, 3),
        "current_tt":   current_tt,
        "free_flow_tt": free_flow_tt,
        "speed":        float(fsd.get("currentSpeed", 0)),
        "free_speed":   float(fsd.get("freeFlowSpeed", 0)),
        "data_source":  "live-tomtom",
    }


# ── Internal: deterministic mock ─────────────────────────────────────────────

def _get_mock_congestion(lat: float) -> dict:
    """
    Return a deterministic mock congestion value based on rounded latitude.
    Gives realistic, zone-differentiated values during demo without API calls.
    """
    lat_key = round(lat, 2)
    multiplier = _MOCK_MULTIPLIERS_BY_LAT.get(lat_key, _MOCK_DEFAULT_MULTIPLIER)

    # Add a small time-of-day variation so the value isn't completely static
    hour = time.localtime().tm_hour
    peak = 1.2 if (7 <= hour <= 10 or 17 <= hour <= 20) else 1.0
    multiplier = min(multiplier * peak, 5.0)

    return {
        "multiplier":   round(multiplier, 3),
        "current_tt":   None,   # not available in mock
        "free_flow_tt": None,
        "speed":        None,
        "free_speed":   None,
        "data_source":  "mock",
    }
