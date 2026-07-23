# AirSense — AI-Powered Urban Air Quality Intelligence

> Built for **ET AI Hackathon 2026** — Problem Statement #5 (Smart Cities / Environmental Intelligence)

AirSense fuses CAAQMS monitoring data, live weather, traffic signals, land-use, and population layers into a single intelligence platform that **predicts** AQI hyperlocally, **attributes** pollution to its source, **ranks** enforcement priorities, **advises** citizens — and lets officials simulate what-if interventions — moving city administration from reactive monitoring to proactive action.

Demo city: **Delhi** (11 zones). Architecture is city-agnostic by design.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Folder Structure](#folder-structure)
5. [Setup Instructions](#setup-instructions)
6. [Environment Variables](#environment-variables)
7. [API Endpoints](#api-endpoints)
8. [Feature Deep-Dive](#feature-deep-dive)
9. [Data Sources & Honesty Disclaimer](#data-sources--honesty-disclaimer)
10. [Demo Mode (Offline / Judging Fallback)](#demo-mode-offline--judging-fallback)
11. [Roadmap (Post-Hackathon)](#roadmap-post-hackathon)

---

## Features

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | **AQI Forecasting** (24–72hr, hyperlocal) | ✅ Live | 4 seasonal SARIMA models; RMSE vs baseline always shown |
| 2 | **Source Attribution** (traffic / industrial / construction / biomass) | ✅ Live | Explainable weighted scoring — not a black box |
| 3 | **Enforcement Prioritization** | ✅ Live | Rule-based composite score; action text per dominant source |
| 4 | **Multi-City Comparison** | ⚠️ Mock data | Delhi + 2 other cities via historical data only |
| 5 | **Citizen Advisory Chat** (EN / HI / KN) | ✅ Live | Groq LLM `llama3-8b-8192`; static template fallback |
| 6 | **What-If Simulation** | ✅ Live | Scenario surrogate model; baseline vs intervention AQI chart |
| 7 | **Crowdsourced Pollution Reports** | ✅ Live | Photo upload → Groq Vision classify → attribution signal boost |
| 8 | **AQI Push Alerts** | ✅ Live | Firebase web push; in-app log fallback |
| 9 | **Live AQI & Weather** | ✅ Live | OpenWeatherMap; 10-min cache; CSV fallback |
| 10 | **Traffic Data** | ✅ Live | TomTom congestion index; used in simulation |

---

## Architecture

```
+----------------------------------------------------------+
|  Data Sources                                            |
|  CPCB CAAQMS | OpenWeatherMap | TomTom Traffic | OSM     |
+---------------------------+------------------------------+
                            |
                            v
+----------------------------------------------------------+
|  ML Microservice  (Python 3 + FastAPI, port 8001)        |
|  forecasting/   -> Season-aware SARIMA pkl models        |
|  attribution/   -> Weighted source-scoring (explainable) |
|  enforcement/   -> Composite ranking                     |
|  simulation/    -> What-if scenario surrogate model      |
+---------------------------+------------------------------+
                            |  REST / JSON
                            v
+----------------------------------------------------------+
|  Backend  (Node.js + Express, port 5000)                 |
|  11 route groups | Redis 5-min cache | MongoDB           |
|  Groq Vision (reports) | Firebase Admin (alerts)         |
|  Cloudinary (image CDN) | TomTom | OpenWeatherMap        |
+---------------------------+------------------------------+
                            |  REST / JSON (Vite proxy)
                            v
+----------------------------------------------------------+
|  Frontend  (React 18 + Vite, port 3000)                  |
|  Dashboard | Forecast | Attribution | Enforcement        |
|  Advisory Chat | City Compare | Reports | Alerts         |
|  What-If Simulation                                      |
+----------------------------------------------------------+
```

Full rationale and requirements: [`PRD.md`](./PRD.md) | Architecture detail: [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **ML Service** | Python 3, FastAPI, uvicorn, pandas, numpy, statsmodels (SARIMAX), Prophet, XGBoost, httpx |
| **Backend** | Node.js 18+, Express, MongoDB + Mongoose, Redis, Groq SDK (LLM + Vision), Firebase Admin, Cloudinary, multer, axios |
| **Frontend** | React 18, Vite, react-router-dom, react-leaflet (map), Recharts (charts), axios, Firebase JS SDK |
| **LLM** | Groq `llama3-8b-8192` for advisory + vision classification; falls back to static template |
| **Storage** | MongoDB (data persistence), Redis (5-min API cache), Cloudinary (report image CDN) |
| **Notifications** | Firebase Cloud Messaging (web push); in-app alert log fallback |
| **Deployment** | Docker Compose (local/demo) |

---

## Folder Structure

```
gen ai hackathon/
+-- AGENTS.md                     Build rules & pitfalls (read before coding)
+-- PRD.md                        Full product spec
+-- ARCHITECTURE.md               System architecture diagram
+-- 00-shared-foundation.md       Locked API contract
+-- codebase_map.md               Full file tree, feature status, API inventory
+-- docker-compose.yml
|
+-- backend/
|   +-- .env                      Credentials (see Environment Variables)
|   +-- package.json
|   +-- src/
|       +-- app.js                Express entry; mounts 11 route groups
|       +-- routes/
|       |   +-- forecast.routes.js
|       |   +-- attribution.routes.js
|       |   +-- enforcement.routes.js
|       |   +-- cities.routes.js         [mock data only]
|       |   +-- advisory.routes.js
|       |   +-- zones.routes.js
|       |   +-- live.routes.js
|       |   +-- traffic.routes.js
|       |   +-- reports.routes.js
|       |   +-- alerts.routes.js
|       |   +-- simulation.routes.js
|       +-- models/               10 Mongoose schemas
|       +-- services/             14 service modules (ML client, LLM, cache, live data, vision, alerts...)
|
+-- frontend/
|   +-- vite.config.js            Proxy /api -> localhost:5000
|   +-- package.json
|   +-- src/
|       +-- App.jsx               6 routes
|       +-- pages/                Dashboard, ComparePage, AdvisoryPage, ReportsPage, AlertsPage, SimulationPage
|       +-- components/           NavBar, MapView, ForecastChart, AttributionPanel, EnforcementList, AdvisoryChat, CityCompare
|       +-- services/api.js       All axios calls (10 functions)
|       +-- services/firebase-messaging.js
|       +-- constants/zones.js    FALLBACK_ZONES, AQI color helpers
|
+-- ml-service/
    +-- main.py                   FastAPI entry
    +-- weather_client.py         OWM client + 10-min cache + CSV fallback
    +-- forecasting/model.py      Season-aware SARIMA (4 pkl artifacts)
    +-- attribution/scoring_model.py
    +-- enforcement/ranking.py
    +-- simulation/engine.py      What-if scenario surrogate
    +-- models/                   sarima_winter/spring/summer/autumn.pkl
    +-- data/                     zones_metadata.csv, cpcb_samples.csv, weather_samples.csv, mock_outputs.json
    +-- requirements.txt
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB (local or Atlas)
- Redis (local or cloud) — *optional, app works without it*

### 1. Clone & install

```powershell
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install

# ML Service
cd ml-service
pip install -r requirements.txt
```

### 2. Configure environment variables

Copy and fill the env files:

```powershell
# Backend
copy backend\.env.example backend\.env
# ML Service
copy ml-service\.env.example ml-service\.env
```

See the [Environment Variables](#environment-variables) section below for all keys.

### 3. Start all three services

Open three separate terminals:

```powershell
# Terminal 1 — Frontend (http://localhost:3000)
cd frontend
npm run dev

# Terminal 2 — Backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 3 — ML Service (http://localhost:8001)
cd ml-service
python -m uvicorn main:app --reload --port 8001
```

### 4. (Optional) Docker Compose

```bash
docker compose up --build
```

### 5. Verify everything is running

```powershell
curl http://localhost:5000/health    # Backend
curl http://localhost:8001/health    # ML Service
# Then open http://localhost:3000 in your browser
```

---

## Environment Variables

### `backend/.env`

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/airsense
REDIS_URL=redis://localhost:6379
ML_SERVICE_URL=http://localhost:8001

# OpenWeatherMap (live AQI + weather)
OPENWEATHER_API_KEY=your_key_here

# TomTom (traffic congestion)
TOMTOM_API_KEY=your_key_here

# LLM — advisory chat (Groq recommended)
LLM_API_KEY=your_groq_key_here
LLM_PROVIDER=Groq

# Offline/demo mode (skips all ML + external API calls)
DEMO_MODE=false
NODE_ENV=development

# Crowdsourced reports — image storage (optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# Push alerts — Firebase Admin SDK (optional)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
```

### `ml-service/.env`

```env
OPENWEATHER_API_KEY=your_key_here
CPCB_DATA_PATH=./data/cpcb_samples.csv
ZONES_METADATA_PATH=./data/zones_metadata.csv
MODEL_PATH=./models/
USE_MOCK_DATA=false
```

### Graceful degradation

| Missing dependency | Effect |
|---|---|
| Redis | Cache disabled; app still works |
| MongoDB | No-DB mode; alert + report features degrade |
| Cloudinary | `/api/reports/submit` returns 503 |
| Firebase | Alerts fall back to in-app log only |
| LLM key | Advisory falls back to static template |
| `DEMO_MODE=true` | Skips all ML + API calls; uses `mock_outputs.json` |

---

## API Endpoints

### Backend (`http://localhost:5000`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service health + config status |
| GET | `/api/zones` | List all 11 valid zone IDs |
| GET | `/api/forecast/:wardId` | 24–72hr AQI forecast + RMSE vs baseline |
| GET | `/api/attribution/:zoneId` | Source breakdown (traffic/industrial/construction/biomass) |
| GET | `/api/enforcement/priorities?limit=N` | Ranked enforcement action list |
| GET | `/api/cities/compare?cities=delhi,mumbai` | Multi-city comparison *(mock data)* |
| POST | `/api/advisory/chat` | LLM advisory — body: `{ location, query, language }` |
| GET | `/api/live/aqi` | Live AQI for all zones |
| GET | `/api/live/aqi/:zoneId` | Live AQI for a single zone |
| GET | `/api/live/weather/:zoneId` | Live weather for a zone |
| GET | `/api/traffic` | Traffic congestion index |
| POST | `/api/reports/submit` | Upload photo → AI classify → attribution signal |
| GET | `/api/reports/ward/:zoneId` | Last 24hr crowdsourced reports for a zone |
| POST | `/api/reports/:id/moderate` | Validate or reject a report |
| POST | `/api/alerts/subscribe` | Subscribe to AQI push alerts |
| DELETE | `/api/alerts/unsubscribe` | Unsubscribe |
| POST | `/api/alerts/test` | Send a test alert |
| GET | `/api/alerts/summary` | Active subscribers + recent alert log |
| POST | `/api/simulation/run` | What-if scenario simulation |

### ML Service (`http://localhost:8001`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/forecast/:ward_id` | Season-aware SARIMA forecast |
| GET | `/attribution/:zone_id` | Weighted source attribution |
| GET | `/enforcement/priorities?limit=N` | Ranked enforcement list |
| POST | `/simulation/run` | Scenario simulation |

---

## Feature Deep-Dive

### 1. AQI Forecasting
- **Model:** 4 pre-trained seasonal SARIMA pkl artifacts (winter/spring/summer/autumn)
- **Zero training delay** at inference — just load pkl and forecast
- **Fallback chain:** pkl → on-the-fly SARIMA from CSV → noise-around-baseline
- **Spatial variation:** deterministic MD5 zone offset applied to city-level signal
- **Key judging metric:** RMSE vs persistence baseline always computed and shown in UI
- Files: `ml-service/forecasting/model.py`, `ml-service/models/sarima_*.pkl`

### 2. Source Attribution
- **Explainable weighted scoring** — not a black box; each score traces to its inputs
- Signals: NO2/CO (traffic), SO2/CO + land-use (industrial), PM10:PM2.5 ratio (construction), season + fire data (biomass)
- **Live OWM Air Pollution API** for pollutant readings; falls back to `cpcb_samples.csv`
- All 4 source scores normalized to sum = 1.0; evidence string generated per source
- Files: `ml-service/attribution/scoring_model.py`

### 3. Enforcement Ranking
- Composite score = `0.4 × (AQI/500) + 0.3 × (population/max_pop) + 0.3 × attribution_confidence`
- Action text generated per dominant source (specific, not generic)
- Files: `ml-service/enforcement/ranking.py`

### 4. What-If Simulation *(Bonus feature)*
- Scenario surrogate model with physics-inspired delta equations
- **Interventions:** traffic diversion %, construction halt, industrial shutdown
- **Context inputs:** live AQI, TomTom congestion, OWM wind/humidity
- Returns: baseline vs simulated AQI series + confidence score
- Files: `ml-service/simulation/engine.py`, `backend/src/routes/simulation.routes.js`, `frontend/src/pages/SimulationPage.jsx`

### 5. Crowdsourced Reports *(Bonus feature)*
- Users upload a pollution photo → Groq Vision classifies (garbage_burning, construction_dust, vehicle_smoke, industrial_emission)
- Confidence ≥ 0.6 → `validated` → `applyReportSignal()` boosts that source's attribution score for 6 hours
- Image stored on Cloudinary CDN
- Files: `backend/src/routes/reports.routes.js`, `backend/src/services/groq-vision-client.js`

### 6. Push Alerts *(Bonus feature)*
- Firebase web push (requires HTTPS + credentials for production; works on localhost with permission grant)
- **In-app log fallback** when Firebase is unconfigured — every alert is always stored in `AlertLog` MongoDB collection
- Subscriber preferences: zone, language (EN/HI/KN), threshold level (moderate/poor/severe)
- Files: `backend/src/routes/alerts.routes.js`, `backend/src/services/alert-service.js`

### 7. Citizen Advisory Chat
- Multilingual: **English, Hindi, Kannada** — language selector in UI
- Groq `llama3-8b-8192` with location-aware system prompt
- Falls back to static template if no LLM key is configured
- Files: `backend/src/routes/advisory.routes.js`, `frontend/src/components/AdvisoryChat.jsx`

---

## Data Sources & Honesty Disclaimer

| Data | Source | Status |
|---|---|---|
| AQI readings | CPCB CAAQMS via OpenWeatherMap Air Pollution API | ✅ Live |
| Weather (temp, wind, humidity) | OpenWeatherMap | ✅ Live |
| Traffic congestion | TomTom Traffic API | ✅ Live |
| SARIMA training data | CPCB historical CSV (`cpcb_samples.csv`) | ✅ Real data |
| Zone metadata | `zones_metadata.csv` (11 Delhi CAAQMS stations) | ✅ Real |
| Multi-city comparison | `mock_outputs.json` | ⚠️ Mock — disclosed in UI |
| Construction permit registry | Not integrated | ⚠️ Simulated via PM10/PM2.5 ratio |
| Emission source inventory | Not integrated | ⚠️ Estimated from land-use type |

> The 1km grid resolution in the problem statement refers to the goal — AirSense interpolates between existing CAAQMS stations (11 zones), not from true 1km-resolution sensors. This is stated explicitly in `ml-service/MODEL_NOTES.md`.

---

## Demo Mode (Offline / Judging Fallback)

If live APIs or the ML service are unavailable during the demo, enable demo mode:

```env
# backend/.env
DEMO_MODE=true
```

This makes the backend serve `ml-service/data/mock_outputs.json` directly — **no ML service, OWM, TomTom, or internet connection needed.** The full dashboard, charts, and enforcement list all render correctly.

Test the offline flow before judging day:
1. Set `DEMO_MODE=true`
2. Stop the ML service
3. Disconnect from the internet
4. Verify the full demo flow still works

---

## Roadmap (Post-Hackathon)

- True atmospheric dispersion modelling (replace IDW interpolation)
- WhatsApp / IVR integration for citizen advisory
- Live multi-city forecasting (not just historical comparison)
- Integration with real construction permit + emission source registries
- Additional regional languages (Tamil, Bengali, Punjabi)
- Production auth + role-based access for municipal/PCB users
- Upgrade SARIMA → XGBoost/LSTM if performance justifies (benchmark first)
