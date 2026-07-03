"""
train_seasonal_models.py — Build pre-trained SARIMA pkl artifacts for all 4 seasons.

Run this script ONCE (or whenever cpcb_samples.csv is updated with new data):
    cd ml-service
    python forecasting/train_seasonal_models.py

Output: ml-service/models/sarima_{season}.pkl  (4 files, one per season)
Each pkl contains: {"model_fit", "model_rmse", "persistence_rmse"}

Model: SARIMAX(1,1,1)(1,0,1,4) — same spec as the original design.
AQI:   EPA piecewise-linear breakpoints (NOT pm25 * 3.5 approximation).
"""
import pandas as pd
import numpy as np
import warnings
import pickle
import os
from statsmodels.tsa.statespace.sarimax import SARIMAX
from pathlib import Path

warnings.filterwarnings('ignore')

DATA_PATH   = Path(__file__).parent.parent / "data"
MODELS_PATH = Path(__file__).parent.parent / "models"
CPCB_CSV    = DATA_PATH / "cpcb_samples.csv"


def get_season(month: int) -> str:
    if month in [3, 4, 5]:
        return "spring"
    elif month in [6, 7, 8]:
        return "summer"
    elif month in [9, 10, 11]:
        return "autumn"
    else:
        return "winter"


def pm25_to_aqi(pm25: float) -> int:
    """
    EPA piecewise-linear AQI formula — consistent with forecasting/model.py
    and attribution/scoring_model.py. Do NOT use pm25 * 3.5.
    """
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


def compute_persistence_rmse(actual: np.ndarray) -> float:
    """Persistence baseline: predict t+1 = t. RMSE over 1-step-ahead predictions."""
    if len(actual) < 2:
        return float("nan")
    y_true = actual[1:]
    y_pred = actual[:-1]
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def main():
    os.makedirs(MODELS_PATH, exist_ok=True)

    print(f"Loading data from {CPCB_CSV}...")
    try:
        # Try 8-column format (updated CPCB data)
        df = pd.read_csv(CPCB_CSV, skiprows=6)
        if df.shape[1] >= 8:
            df.columns = ["time", "pm10", "pm25", "no2", "so2", "co", "dust", "uv_index"]
        else:
            df.columns = ["time", "pm10", "pm25", "no2", "so2", "co"]
    except Exception as e:
        print(f"[ERROR] Could not read {CPCB_CSV}: {e}")
        raise

    df.dropna(subset=["pm25"], inplace=True)
    df["time"] = pd.to_datetime(df["time"])
    df.set_index("time", inplace=True)
    df.sort_index(inplace=True)

    # Use EPA formula — consistent with model.py inference
    df["aqi"] = df["pm25"].apply(pm25_to_aqi).astype(float)

    df_6h = df["aqi"].resample("6h").mean().ffill()

    print(f"Total data points (6-hourly): {len(df_6h)}")
    print(f"Date range: {df_6h.index[0]} -> {df_6h.index[-1]}")
    print()

    # ── Group by season ──────────────────────────────────────────────────────
    seasonal_data: dict[str, list] = {
        "spring": [], "summer": [], "autumn": [], "winter": [],
    }
    for timestamp, aqi_val in df_6h.items():
        seasonal_data[get_season(timestamp.month)].append(float(aqi_val))

    results = {}

    for season, data in seasonal_data.items():
        n = len(data)
        print(f"{'='*55}")
        print(f"Season: {season.upper()}  ({n} data points)")

        if n < 50:
            print(f"  [SKIP] Not enough data (need ≥50, got {n})")
            continue

        train_data = np.array(data)
        val_window = min(28, n - 10)  # keep ≥10 training points

        print(f"  Fitting SARIMAX(1,1,1)(1,0,1,4)...")
        model = SARIMAX(train_data, order=(1, 1, 1), seasonal_order=(1, 0, 1, 4))
        model_fit = model.fit(disp=False)

        # ── RMSE on held-out validation window ─────────────────────────────
        actual_val  = train_data[-val_window:]
        predicted_val = model_fit.predict(
            start=len(train_data) - val_window,
            end=len(train_data) - 1
        )
        model_rmse      = float(round(np.sqrt(np.mean((actual_val - predicted_val) ** 2)), 2))
        persistence_rmse = float(round(compute_persistence_rmse(actual_val), 2))

        improvement = round((1 - model_rmse / persistence_rmse) * 100, 1) \
            if persistence_rmse > 0 else 0.0

        print(f"  Model RMSE:       {model_rmse}")
        print(f"  Persistence RMSE: {persistence_rmse}")
        print(f"  Improvement:      {improvement}% vs naive baseline")

        # ── Save artifact ───────────────────────────────────────────────────
        pkl_path = MODELS_PATH / f"sarima_{season}.pkl"
        artifact = {
            "model_fit":        model_fit,
            "model_rmse":       model_rmse,
            "persistence_rmse": persistence_rmse,
            "trained_on":       f"{n} data points ({df_6h.index[0].date()} to {df_6h.index[-1].date()})",
            "aqi_formula":      "EPA piecewise-linear (pm25_to_aqi)",
            "sarima_order":     "(1,1,1)(1,0,1,4)",
        }
        with open(pkl_path, "wb") as f:
            pickle.dump(artifact, f)

        results[season] = {
            "model_rmse": model_rmse,
            "persistence_rmse": persistence_rmse,
            "improvement": improvement,
            "data_points": n,
        }
        print(f"  ✅ Saved → {pkl_path}")
        print()

    # ── Summary table ────────────────────────────────────────────────────────
    print(f"\n{'='*55}")
    print("TRAINING COMPLETE — Summary")
    print(f"{'='*55}")
    print(f"{'Season':<10} {'Model RMSE':>12} {'Persist RMSE':>14} {'Improvement':>12} {'N points':>9}")
    print("-" * 60)
    for season, r in results.items():
        print(f"{season:<10} {r['model_rmse']:>12.2f} {r['persistence_rmse']:>14.2f} "
              f"{r['improvement']:>11.1f}% {r['data_points']:>9}")
    print()
    print("Models saved to:", MODELS_PATH)
    print("All models use EPA AQI formula — consistent with model.py inference.")


if __name__ == "__main__":
    main()