# ML Engineer — Task File

> **Read `00-shared-foundation.md` first and make sure that's fully done before starting here.**
> Your job: Forecasting model + Source Attribution engine + Enforcement scoring logic. You own everything inside `ml-service/`.

---

## WEEK 1 — Data Prep + Mock Output (so backend isn't blocked)

### Task 1.1 — Get and clean CAAQMS data
- [ ] Download Delhi CAAQMS historical data from data.gov.in / CPCB (CSV format)
- [ ] Filter to the 8–10 zones agreed in shared foundation Step 6
- [ ] Clean: handle missing values (forward-fill or drop), standardize timestamp format
- [ ] Save cleaned file as `ml-service/data/cpcb_delhi_cleaned.csv`
- [ ] **Acceptance check:** file has columns `[stationId, timestamp, pm25, pm10, no2, so2, co, aqi]`, no nulls in `aqi` column

### Task 1.2 — Get weather data
- [ ] Pull historical weather data for Delhi (temp, humidity, wind speed, wind direction) for the same date range as AQI data, via OpenWeatherMap historical API or a free dataset
- [ ] Save as `ml-service/data/weather_delhi.csv`
- [ ] **Acceptance check:** file has `[timestamp, temp, humidity, wind_speed, wind_direction]`, date range overlaps with AQI data

### Task 1.3 — Get land-use / zone metadata
- [ ] For each of the 8-10 zones, manually tag dominant land-use type: `industrial`, `residential`, `commercial`, `mixed` (use Google Maps/OSM visually, doesn't need to be perfectly scientific)
- [ ] Save as `ml-service/data/zones_metadata.csv` with columns `[zoneId, name, landUseType, lat, lng, population_estimate]`
- [ ] **Acceptance check:** every zone from shared foundation Step 6 has a row here

### Task 1.4 — Commit mock output file (CRITICAL — unblocks backend)
- [ ] Create `ml-service/data/mock_outputs.json` with **hand-written fake but realistic** responses matching the exact shapes from `00-shared-foundation.md` Step 2, for forecast, attribution, and enforcement endpoints
- [ ] Commit and push this by **end of Day 2, Week 1** — do not wait for real model
- [ ] **Acceptance check:** Backend person confirms they can use this file directly

---

## WEEK 2 — Forecasting Model

### Task 2.1 — Baseline forecasting model (SARIMA or Prophet)
- [ ] Pick ONE station's historical AQI data, build a simple SARIMA or Prophet model to forecast next 24-72 hours
- [ ] Write this in `ml-service/forecasting/model.py`
- [ ] Generate forecast for 24hr, 48hr, 72hr horizons
- [ ] **Acceptance check:** model runs end-to-end on one station's data and produces 3 forecast values without errors

### Task 2.2 — Compute persistence baseline
- [ ] Write a function that computes "tomorrow = today" baseline forecast (trivial — just shift values)
- [ ] Compute RMSE of your model vs RMSE of persistence baseline on a held-out test set (last 2 weeks of data, not used in training)
- [ ] **Acceptance check:** you have two numbers — `modelRMSE` and `persistenceRMSE` — and modelRMSE is lower (if not, debug or tune before moving on, this is the #1 thing judges check)

### Task 2.3 — Add weather + calendar features (upgrade if time allows)
- [ ] If baseline works and you have time, build an XGBoost model with features: lag-AQI (t-1, t-2, t-3), wind speed/direction, temp, humidity, day-of-week, is_festival_season (simple boolean for Diwali/stubble-burning window)
- [ ] Compare XGBoost RMSE against SARIMA/Prophet baseline — keep whichever is better
- [ ] **Acceptance check:** documented comparison table (SARIMA RMSE vs XGBoost RMSE vs persistence RMSE) saved somewhere you can paste into the deck later

### Task 2.4 — Spatial interpolation for grid-level estimates
- [ ] Implement IDW (Inverse Distance Weighting) to interpolate AQI between your station points, so you can estimate values for zones without a station
- [ ] Write in `ml-service/forecasting/model.py` or a separate `interpolation.py`
- [ ] **Acceptance check:** for any zone in your list, you can produce an estimated AQI value even if it has no direct station

### Task 2.5 — Wrap forecasting in FastAPI endpoint
- [ ] In `ml-service/main.py`, expose `GET /forecast/{wardId}` returning the exact shape agreed in shared foundation Step 2
- [ ] **Acceptance check:** `curl localhost:8001/forecast/some-ward-id` returns valid JSON matching the contract

---

## WEEK 3 — Source Attribution + Enforcement Logic

### Task 3.1 — Build the attribution scoring model
- [ ] In `ml-service/attribution/scoring_model.py`, write a weighted scoring function:
  - Input: AQI reading at a zone + time, wind direction, nearby land-use type, time-of-day (proxy for traffic)
  - Logic: e.g., if landUseType == industrial AND wind blowing from that direction → weight toward "industrial"; if time is 8-10am/6-8pm AND high traffic-density zone → weight toward "traffic"
  - Output: a dict of `{ traffic: 0.X, industrial: 0.X, construction: 0.X, other: 0.X }` summing to 1.0
- [ ] **Acceptance check:** for at least 3 different test zones, the output scores make logical sense (e.g., an industrial-zone-tagged area shows higher industrial score) — sanity check manually

### Task 3.2 — Wrap attribution in FastAPI endpoint
- [ ] Expose `GET /attribution/{zoneId}` matching the contract shape
- [ ] **Acceptance check:** returns valid JSON, scores sum to ~1.0

### Task 3.3 — Enforcement ranking logic
- [ ] In `ml-service/enforcement/ranking.py`: combine (a) current/forecasted AQI severity, (b) population estimate for zone, (c) attribution confidence → compute a single priority score per zone
- [ ] Simple formula is fine: `score = aqi_severity_weight * 0.4 + population_weight * 0.3 + confidence_weight * 0.3` (tune weights as needed)
- [ ] Sort zones descending by score, return top N
- [ ] **Acceptance check:** expose `GET /enforcement/priorities` matching contract shape, returns a sorted list with reasoning text per zone (e.g., "High AQI + high population + 70% industrial attribution")

---

## WEEK 4 — Validation, Tuning, Documentation

### Task 4.1 — Final model validation
- [ ] Re-run RMSE comparison (model vs persistence) on the most recent data available
- [ ] Create one clean chart: forecast vs actual vs persistence baseline, for at least 1 zone, covering a 1-week test window
- [ ] **Acceptance check:** chart saved as an image, ready to paste into the presentation deck

### Task 4.2 — Write model limitations doc
- [ ] Write a short `ml-service/MODEL_NOTES.md`: what data is real vs interpolated, what would change in a production version, known limitations
- [ ] This becomes the "honesty disclaimer" content for the deck — judges respect this

### Task 4.3 — Support integration
- [ ] Be available to debug with backend person if real API responses don't match what they expected
- [ ] Fix any crashes/edge cases found during integration testing (e.g., what happens if a zone has no station data — should return a sensible default, not crash)

---

## Definition of Done (whole ML portion)
- [ ] `/forecast/{wardId}` returns real model output, documented RMSE beats persistence baseline
- [ ] `/attribution/{zoneId}` returns explainable scores summing to 1.0
- [ ] `/enforcement/priorities` returns ranked list with reasoning
- [ ] `MODEL_NOTES.md` written, disclosing mock vs real data clearly
- [ ] All 3 endpoints tested directly via `curl` or Postman before handing to backend for final integration
