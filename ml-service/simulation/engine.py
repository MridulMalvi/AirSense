from datetime import datetime, timedelta, timezone
from typing import Any
import math


def _clip_aqi(value: float) -> int:
    return int(max(0, min(500, round(value))))


def _hour_factor(hour: int) -> float:
    if 7 <= hour <= 10:
        return 1.08
    if 17 <= hour <= 20:
        return 1.10
    if 0 <= hour <= 5:
        return 0.94
    return 1.0


def _simulate_series(base_context: dict[str, Any], interventions: dict[str, Any], forecast_hours: int) -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    current_aqi = float(base_context.get("currentAQI") or 180)
    congestion = float(base_context.get("congestionIndex") if base_context.get("congestionIndex") is not None else 0.5)
    construction = float(base_context.get("constructionActivity") if base_context.get("constructionActivity") is not None else 0.55)
    industrial = float(base_context.get("industrialActivity") if base_context.get("industrialActivity") is not None else 0.55)
    wind_speed = float(base_context.get("windSpeed") if base_context.get("windSpeed") is not None else 3.5)
    humidity = float(base_context.get("humidity") if base_context.get("humidity") is not None else 60)

    traffic_reduction = min(max(float(interventions.get("traffic_diversion_percent", 0)) / 100.0, 0), 1)
    construction_reduction = 1.0 if interventions.get("halt_construction") else min(max(float(interventions.get("construction_reduction_percent", 0)) / 100.0, 0), 1)
    industrial_reduction = 1.0 if interventions.get("industrial_shutdown") else min(max(float(interventions.get("industrial_reduction_percent", 0)) / 100.0, 0), 1)

    series = []
    aqi = current_aqi
    for hour_index in range(forecast_hours):
        ts = now + timedelta(hours=hour_index + 1)
        traffic_effect = congestion * (1 - traffic_reduction) * 5.2
        construction_effect = construction * (1 - construction_reduction) * 3.4
        industrial_effect = industrial * (1 - industrial_reduction) * 2.8
        dispersion = min(wind_speed, 20) * 0.45
        humidity_penalty = 1.6 if humidity >= 80 else 0.0
        daily_wave = math.sin((hour_index / 24.0) * math.pi * 2) * 2.2

        delta = (
            traffic_effect
            + construction_effect
            + industrial_effect
            + humidity_penalty
            + daily_wave
            + (_hour_factor(ts.hour) - 1) * 12
            - dispersion
            - 3.2
        )
        aqi = _clip_aqi(aqi + delta)
        series.append({
            "hour": hour_index + 1,
            "timestamp": ts.isoformat(),
            "aqi": aqi,
        })
    return series


def run_simulation(payload: dict[str, Any]) -> dict[str, Any]:
    forecast_hours = int(payload.get("forecast_hours") or 48)
    forecast_hours = max(12, min(72, forecast_hours))
    ward_ids = payload.get("ward_ids") or [payload.get("ward_id") or "anand-vihar"]
    interventions = payload.get("interventions") or {}
    zone_context = payload.get("zone_context") or {}

    baseline_context = dict(zone_context)
    baseline = _simulate_series(baseline_context, {}, forecast_hours)
    simulated = _simulate_series(baseline_context, interventions, forecast_hours)

    reductions = [b["aqi"] - s["aqi"] for b, s in zip(baseline, simulated)]
    avg_reduction = round(sum(reductions) / len(reductions), 1) if reductions else 0
    peak_reduction = max(reductions) if reductions else 0
    peak_hour = reductions.index(peak_reduction) + 1 if reductions else 0

    traffic_delta = round((float(interventions.get("traffic_diversion_percent", 0)) / 100.0) * -18, 1)
    construction_delta = round((1.0 if interventions.get("halt_construction") else float(interventions.get("construction_reduction_percent", 0)) / 100.0) * -12, 1)
    industrial_delta = round((1.0 if interventions.get("industrial_shutdown") else float(interventions.get("industrial_reduction_percent", 0)) / 100.0) * -10, 1)
    wind_effect = round(min(float(zone_context.get("windSpeed") or 3.5), 20) * 0.35, 1)

    confidence = 0.62
    if zone_context.get("source") == "openweather":
        confidence += 0.08
    if zone_context.get("trafficSource") == "tomtom":
        confidence += 0.08

    return {
        "ward_ids": ward_ids,
        "baseline_aqi": baseline,
        "simulated_aqi": simulated,
        "delta_summary": {
            "avg_reduction": avg_reduction,
            "peak_improvement_at_hour": peak_hour,
            "confidence": round(min(confidence, 0.82), 2),
        },
        "contributing_factors": {
            "vehicular": traffic_delta,
            "construction": construction_delta,
            "industrial": industrial_delta,
            "wind_effect": wind_effect,
        },
        "model": "scenario-surrogate-v1",
        "disclaimer": "ML-based scenario approximation, not a certified atmospheric model.",
    }
