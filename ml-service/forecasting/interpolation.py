"""
interpolation.py — Spatial IDW (Inverse Distance Weighting) interpolation

Used to approximate AQI values at grid/zone centroids that don't have
a direct CAAQMS station — interpolates from nearby station readings.

Note (per AGENTS.md + PRD honesty clause): This is NOT true 1km satellite-grade
resolution. We interpolate between existing station points. Must be disclosed
transparently in the demo/deck.
"""

import numpy as np
from typing import List, Tuple


def idw_interpolate(
    station_coords: List[Tuple[float, float]],
    station_values: List[float],
    target_lat: float,
    target_lng: float,
    power: int = 2,
) -> float:
    """
    Inverse Distance Weighting interpolation.

    Args:
        station_coords: List of (lat, lng) tuples for known stations
        station_values: AQI values at each station
        target_lat: Latitude of the zone centroid to estimate
        target_lng: Longitude of the zone centroid to estimate
        power: IDW exponent (2 is standard)

    Returns:
        Estimated AQI at the target location
    """
    distances = []
    for lat, lng in station_coords:
        dist = haversine_distance(lat, lng, target_lat, target_lng)
        distances.append(max(dist, 0.001))  # avoid division by zero

    weights = [1.0 / (d ** power) for d in distances]
    total_weight = sum(weights)
    interpolated = sum(w * v for w, v in zip(weights, station_values)) / total_weight
    return round(interpolated, 1)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Haversine formula — great-circle distance in km.
    """
    R = 6371  # Earth radius in km
    phi1, phi2 = np.radians(lat1), np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))
