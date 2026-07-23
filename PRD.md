# PRD — AI-Powered Urban Air Quality Intelligence Platform
**Project Codename:** AirSense
**Hackathon:** ET AI Hackathon 2026 — Problem Statement #5
**Theme:** Smart Cities / Environmental Intelligence / Geospatial Analytics / Public Health
**City Scope:** Delhi (single-city deep dive, architecture designed to scale to multi-city)
**Team Size:** 3 (ML, Backend, Frontend)
**Tech Stack:** Node.js (backend API) + Python FastAPI (ML microservice) + React (frontend)

---

## 1. Problem Statement (Summary)

Delhi (and most Indian metros) generates massive AQI monitoring data via CAAQMS stations, but there is no unified intelligence layer that:
- Attributes pollution to specific sources at a given location, in real time
- Forecasts AQI hyperlocally (ward/grid level) 24-72 hours ahead
- Tells enforcement teams *where* to act for maximum impact
- Communicates personalized risk to citizens in their language

The data exists. The decision-layer does not. AirSense builds that layer.

---

## 2. Goals

| Goal | Success Metric |
|---|---|
| Forecast AQI better than naive baseline | Forecast RMSE < persistence-baseline RMSE by a measurable margin |
| Attribute pollution sources with explainable confidence | Attribution model output validated against known land-use/traffic patterns for at least 3 test zones |
| Help enforcement prioritize action | Generate a ranked, evidence-backed action list for at least 5 zones |
| Communicate risk to citizens | Functional advisory bot responding in at least 2 languages (Hindi + English) |
| Demonstrate cross-city scalability | Dashboard architecture supports adding a 2nd city with config change, not code rewrite |

---

## 3. Target Users

1. **City/Municipal Administrators** — need ward-level risk picture + enforcement prioritization
2. **Pollution Control Board Officers** — need source attribution + evidence for enforcement action
3. **Citizens** (general public, vulnerable groups) — need personalized, simple health advisories
4. **(Future) Multi-city policy teams** — need comparative intelligence across cities

---

## 4. Scope — All 5 Features (Full Build)

### 4.1 Geospatial Pollution Source Attribution Engine
**What it does:** For a given location and time window, estimates the probability that observed AQI spike is attributable to: vehicular traffic, industrial activity, construction dust, or stubble/biomass burning (seasonal).

**Functional Requirements:**
- Ingest CAAQMS station readings (PM2.5, PM10, NO2, SO2, CO) at regular intervals
- Ingest static layers: land-use map (industrial zones, residential, construction permit zones — from OSM/government data), road network + traffic density proxy
- Ingest wind direction/speed (for plume-drift estimation)
- Output: per-zone, per-timestamp source attribution with confidence score (weighted scoring model — explainable, not black-box)
- Display as overlay on map (color-coded by dominant source)

**Out of scope:** True dispersion-modelling (CFD-level) — explicitly noted as a "production roadmap" item, not built in hackathon version.

---

### 4.2 Hyperlocal Predictive AQI Forecasting Agent
**What it does:** Predicts AQI 24-72 hours ahead at grid/ward resolution for Delhi.

**Functional Requirements:**
- Historical AQI time-series ingestion (CPCB CAAQMS public data)
- Feature set: lag AQI values, weather (temp, humidity, wind), day-of-week, season/festival calendar (e.g. stubble-burning season, Diwali)
- Baseline model: SARIMA/Prophet for fast implementation
- Stretch model: XGBoost with lag + weather features, or LSTM if time permits
- Spatial interpolation between station points using IDW (Inverse Distance Weighting) to approximate grid-level estimates
- Output: forecast values + confidence interval, displayed as time-series chart and heatmap

**Evaluation requirement (explicit in problem statement):** Must report RMSE/MAE vs a persistence baseline ("tomorrow = today") to prove genuine predictive value.

**Honesty clause:** PRD explicitly states current version uses station-data spatial interpolation, not true 1km satellite-grade resolution — disclosed transparently in the demo, not oversold.

---

### 4.3 Enforcement Intelligence & Prioritisation Agent
**What it does:** Cross-references attribution engine output + known emission source registry (industries, construction sites, waste-burning hotspots) to generate a ranked list of zones/sources for enforcement action.

**Functional Requirements:**
- Input: attribution engine output + static registry of known sources (mock/sample dataset acceptable where real registry unavailable)
- Scoring logic: weight by (a) AQI severity, (b) population exposure (using population density layer), (c) confidence of attribution
- Output: ranked list with supporting evidence (map snapshot + data points) per recommendation
- Simple rule-based + scoring model — not a separate ML model, reuses attribution output

---

### 4.4 Multi-City Comparative Intelligence Dashboard
**What it does:** Compares AQI trends and (mocked) intervention effectiveness across multiple cities.

**Functional Requirements (Hackathon version — lightweight):**
- Backend designed to be **city-agnostic** (city as a config parameter, not hardcoded)
- For demo: Delhi shown live/real; 1-2 other cities (e.g. Mumbai, Kolkata) shown with available public historical CPCB data (no live forecasting needed for these — just historical comparison charts)
- UI: side-by-side trend charts, ranking table

**Note:** This is intentionally the lightest-effort feature — built to prove architectural scalability, not full feature depth, given single-city deep-dive decision.

---

### 4.5 Citizen Health Risk Advisory System
**What it does:** Conversational interface giving ward-level health risk alerts and personalized advisories.

**Functional Requirements:**
- Input: forecast AQI for user's selected ward/location
- Vulnerability mapping: flags if user is near hospital/school zone (static POI data) — used to adjust advisory tone/urgency
- LLM-generated advisory text, in **Hindi + English** for hackathon scope (multi-language stretch goal: Tamil/Kannada if time permits)
- Delivery channel: Web chat widget (WhatsApp/IVR explicitly out of scope for hackathon — noted as roadmap item, integration complexity too high for timeline)

---

## 5. Non-Functional Requirements

- **Explainability:** Every AI output (attribution, forecast, enforcement ranking) must show *why* — no unexplained black-box numbers, since judges and real users (officials) need to trust/audit decisions
- **Performance:** Dashboard must load city-level view in <3s on demo hardware
- **Data integrity:** All "live" data sources must be clearly labeled vs "mocked/sample" data in both UI and presentation deck — do not misrepresent mock data as real-time
- **Scalability (architectural, not load-tested):** Codebase structured so adding a new city = config change, not rewrite

---

## 6. Data Sources

| Data | Source | Type |
|---|---|---|
| AQI station readings | CPCB CAAQMS (data.gov.in / CPCB API) | Real |
| Weather | OpenWeatherMap API | Real |
| Land use / industrial zones | OpenStreetMap (OSM) | Real |
| Traffic density | Proxy via time-of-day patterns / Google Maps traffic (if API access available) | Real or modeled proxy |
| Construction permits, emission source registry | Sample/mock dataset | Mocked (disclosed) |
| Population density | WorldPop / Census ward data | Real |

---

## 7. Architecture Overview

```
[Data Sources: CPCB, Weather API, OSM, Population]
            |
            v
   [Python ML Microservice — FastAPI]
   - Forecasting model (SARIMA/XGBoost)
   - Source Attribution scoring model
   - Enforcement ranking logic
            |
            v  (REST API — JSON)
   [Node.js Backend — Express]
   - Data orchestration / caching (Redis)
   - MongoDB (geospatial-indexed: stations, zones, forecasts, advisories)
   - Auth (if needed for admin/enforcement view)
   - LLM integration (citizen advisory text generation)
            |
            v  (REST API)
   [React Frontend]
   - Map view (Leaflet/Mapbox) — heatmap + source attribution overlay
   - Forecast charts (per ward, 24-72hr)
   - Enforcement priority list view
   - Multi-city comparison view
   - Citizen advisory chat widget
```

---

## 8. Team & Role Split

| Role | Owner | Responsibilities |
|---|---|---|
| ML Engineer | TBD | Forecasting model, Source Attribution engine, model validation/benchmarking |
| Backend Engineer | TBD | Data pipeline, MongoDB schema, Node.js APIs, enforcement ranking integration, LLM wiring for advisory |
| Frontend Engineer | TBD | React dashboard, map visualizations, citizen chat UI, demo video & deck |

---

## 9. Timeline (4 Weeks — 22 Jun to 22 Jul)

| Week | Milestone |
|---|---|
| Week 1 (22–29 Jun) | Data pipeline live (CPCB, weather, OSM), DB schema finalized, API contract agreed between backend/frontend, architecture diagram finalized |
| Week 2 (30 Jun–6 Jul) | Forecasting model v1 (baseline) + Source Attribution v1 working; backend APIs serving mock-then-real ML outputs |
| Week 3 (7–13 Jul) | Enforcement Intelligence + Multi-City Dashboard + Citizen Advisory bot built; frontend integration begins |
| Week 4 (14–20 Jul) | Full integration, model tuning, UI polish, multi-language advisory testing |
| 21–22 Jul | Demo video, deck finalization, dry-run rehearsal |

---

## 10. Evaluation Criteria Mapping (from problem statement)

| Judging Criteria | Weight | How AirSense Addresses It |
|---|---|---|
| Innovation | 25% | Combines attribution + forecasting + enforcement in one explainable pipeline, not just a dashboard |
| Business Impact | 25% | Directly actionable output for municipal/PCB officers — ranked enforcement list, not just data |
| Technical Excellence | 20% | Real model with documented RMSE-vs-baseline comparison, geospatial interpolation, explainable scoring |
| Scalability | 15% | City-agnostic backend design, demonstrated with 2nd/3rd city historical comparison |
| User Experience | 15% | Clean map-based UI + plain-language citizen advisory in multiple languages |

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Forecasting model accuracy looks weak under scrutiny | Always present alongside persistence-baseline comparison; be upfront about interpolation limitations |
| Real-time data API limits/downtime during demo | Cache a "demo dataset" snapshot as fallback; never rely on live API call during actual judging demo |
| Scope creep (trying to perfect all 5 features) | Strict feature-freeze after Week 3; Week 4 is integration/polish only, no new features |
| Team member blocked waiting on another's output | ML person shares mock/dummy JSON output structure to backend by Day 3 of Week 1, so backend doesn't wait |
| Multi-language advisory complexity | Use LLM-based translation for Hindi/English at minimum; treat additional languages as stretch goal only |

---

## 12. Explicitly Out of Scope (for hackathon version)

- True atmospheric dispersion / CFD modelling
- WhatsApp/IVR integration (web chat only for citizen advisory)
- Real-time live demo across more than 1 fully-live city (others = historical comparison only)
- Production-grade authentication/security hardening
