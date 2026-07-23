# ARCHITECTURE.md — AirSense System Architecture

> Standalone deep-dive into system design. For the quick version, see `README.md`. For product requirements, see `PRD.md`.

---

## 1. High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         EXTERNAL DATA SOURCES                     │
│  CPCB CAAQMS API   OpenWeatherMap API   OSM Land-Use   Population │
│  (AQI readings)    (weather/wind)       (zone tags)    (Census)   │
└───────────┬──────────────┬──────────────────┬──────────────┬─────┘
            │              │                  │              │
            └──────────────┴──────────────────┴──────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │   ML MICROSERVICE (FastAPI)    │
                  │   Port: 8001                    │
                  │                                  │
                  │  ┌────────────────────────────┐ │
                  │  │ forecasting/                │ │
                  │  │  - model.py (SARIMA/XGBoost)│ │
                  │  │  - interpolation.py (IDW)   │ │
                  │  └────────────────────────────┘ │
                  │  ┌────────────────────────────┐ │
                  │  │ attribution/                 │ │
                  │  │  - scoring_model.py          │ │
                  │  └────────────────────────────┘ │
                  │  ┌────────────────────────────┐ │
                  │  │ enforcement/                 │ │
                  │  │  - ranking.py                │ │
                  │  └────────────────────────────┘ │
                  └───────────────┬─────────────────┘
                                  │  REST (JSON)
                                  ▼
                  ┌───────────────────────────────┐
                  │   BACKEND (Node.js/Express)     │
                  │   Port: 5000                    │
                  │                                  │
                  │  ┌──────────┐  ┌──────────────┐ │
                  │  │ Routes   │  │ Services      │ │
                  │  │ /forecast│  │ ml-client.js  │ │
                  │  │ /attrib. │  │ llm-client.js │ │
                  │  │ /enforce.│  │ cache.js      │ │
                  │  │ /cities  │  └──────────────┘ │
                  │  │ /advisory│                    │
                  │  └──────────┘                    │
                  │         │              │          │
                  │         ▼              ▼          │
                  │  ┌──────────┐   ┌──────────┐    │
                  │  │ MongoDB  │   │  Redis    │    │
                  │  │(geospat. │   │ (caching) │    │
                  │  │ indexes) │   │           │    │
                  │  └──────────┘   └──────────┘    │
                  └───────────────┬─────────────────┘
                                  │  REST (JSON)
                                  ▼
                  ┌───────────────────────────────┐
                  │   FRONTEND (React)              │
                  │   Port: 3000                    │
                  │                                  │
                  │  MapView | ForecastChart          │
                  │  EnforcementList | CityCompare    │
                  │  AdvisoryChat                     │
                  └───────────────┬─────────────────┘
                                  │
                                  ▼
                            END USER
              (Municipal Officer / PCB Officer / Citizen)
```

---

## 2. Component Responsibilities

### ML Microservice (Python + FastAPI)
**Owns:** all predictive/analytical logic. Stateless — does not persist data itself, reads from shared data files/DB and returns computed results.

| Module | Responsibility | Depends on |
|---|---|---|
| `forecasting/model.py` | Train + serve AQI forecast (SARIMA/Prophet/XGBoost) | Historical readings, weather data |
| `forecasting/interpolation.py` | Spatial IDW interpolation for zones without direct stations | Station coordinates, zone coordinates |
| `attribution/scoring_model.py` | Weighted source-attribution scoring | AQI reading, land-use type, wind direction, time-of-day |
| `enforcement/ranking.py` | Combine attribution + severity + population into ranked list | Attribution output, population data |

### Backend (Node.js + Express)
**Owns:** orchestration, persistence, caching, external integrations (LLM), and is the only layer the frontend talks to directly.

| Module | Responsibility | Depends on |
|---|---|---|
| `routes/forecast.routes.js` | Serve forecast data (mock or real via ML service) | ML service or mock JSON |
| `routes/attribution.routes.js` | Serve attribution data | ML service or mock JSON |
| `routes/enforcement.routes.js` | Serve ranked enforcement list | ML service or mock JSON |
| `routes/cities.routes.js` | Serve multi-city historical comparison | MongoDB (Reading collection) |
| `routes/advisory.routes.js` | Handle citizen chat, call LLM, log interaction | LLM API, MongoDB (AdvisoryLog) |
| `services/ml-client.js` | Axios wrapper for calling ML microservice, with fallback handling | ML service |
| `services/cache.js` | Redis read/write wrapper | Redis |

### Frontend (React)
**Owns:** all visualization and user interaction. No business logic — purely presentational + API consumption.

| Component | Responsibility |
|---|---|
| `MapView.jsx` | Render Delhi map, zone markers, attribution color overlay, heatmap |
| `ForecastChart.jsx` | Plot forecast + confidence band + baseline comparison line |
| `EnforcementList.jsx` | Render ranked priority cards |
| `CityCompare.jsx` | Render multi-city historical comparison charts |
| `AdvisoryChat.jsx` | Chat UI, language toggle, location picker |

---

## 3. Data Flow — Sequence Diagrams (text form)

### 3.1 Forecast Request Flow
```
User clicks zone on map
   → Frontend: GET /api/forecast/anand-vihar
   → Backend: check Redis cache for "forecast:anand-vihar"
       → if cached: return cached response
       → if not cached:
           → Backend: GET ml-service:8001/forecast/anand-vihar
           → ML Service: load historical data for zone,
                         run forecasting model,
                         compute RMSE vs persistence baseline,
                         return JSON
           → Backend: store in Redis (TTL ~5 min), return to frontend
   → Frontend: render ForecastChart with response
```

### 3.2 Citizen Advisory Flow
```
User types query in AdvisoryChat, selects language="hi"
   → Frontend: POST /api/advisory/chat { location, query, language }
   → Backend:
       1. Internally call forecast logic for `location` to get current/predicted AQI
       2. Check if `location` is near a flagged POI (hospital/school) → adjust urgency flag
       3. Build prompt for LLM: location + AQI + urgency + query + language
       4. Call LLM API, get response
       5. Log interaction to MongoDB (AdvisoryLog)
       6. Return { reply, riskLevel } to frontend
   → Frontend: display reply in chat window
```

### 3.3 Enforcement Priority Flow
```
Admin opens Enforcement view
   → Frontend: GET /api/enforcement/priorities
   → Backend: GET ml-service:8001/enforcement/priorities
   → ML Service:
       1. For each zone, get latest attribution scores
       2. For each zone, get population + current AQI severity
       3. Compute weighted score, sort descending
       4. Return ranked list with reasoning text
   → Backend: return to frontend (cache briefly)
   → Frontend: render EnforcementList cards
```

---

## 4. Database Schema (Detailed)

```javascript
// stations
{
  stationId: String,     // unique CAAQMS station ID
  name: String,
  lat: Number,
  lng: Number,
  city: String
}

// readings
{
  stationId: String,     // ref → stations
  timestamp: Date,
  pm25: Number,
  pm10: Number,
  no2: Number,
  so2: Number,
  co: Number,
  aqi: Number
}
// Index: { stationId: 1, timestamp: -1 }

// zones
{
  zoneId: String,        // unique, e.g. "anand-vihar"
  name: String,
  city: String,
  geoBoundary: {          // GeoJSON polygon (approximate is fine for v1)
    type: "Polygon",
    coordinates: [...]
  },
  landUseType: String,    // industrial | residential | commercial | mixed
  population: Number
}
// Index: { geoBoundary: "2dsphere" }  ← geospatial index

// forecasts
{
  wardId: String,         // ref → zones.zoneId
  generatedAt: Date,
  forecast: [
    { timestamp: Date, predictedAQI: Number, confidenceLow: Number, confidenceHigh: Number }
  ],
  baselineComparison: { modelRMSE: Number, persistenceRMSE: Number }
}

// attributions
{
  zoneId: String,         // ref → zones.zoneId
  timestamp: Date,
  sources: [
    { category: String, confidence: Number }
  ]
}

// enforcementPriorities
{
  generatedAt: Date,
  priorities: [
    { zoneId: String, score: Number, reason: String, evidence: Object }
  ]
}

// advisoryLogs
{
  sessionId: String,
  location: String,
  query: String,
  reply: String,
  language: String,
  timestamp: Date
}
```

---

## 5. Error Handling & Resilience

| Failure Scenario | Handling Strategy |
|---|---|
| ML microservice is down | Backend returns last cached Redis value, or falls back to `mock_outputs.json` if no cache exists — never crashes or returns raw error to frontend |
| Invalid `zoneId`/`wardId` requested | Backend returns clean `400` with `{ error: "Invalid zone ID" }`, not a stack trace |
| LLM API timeout/failure | Backend returns a generic fallback advisory message ("Unable to fetch personalized advice right now, general guidance: ...") rather than failing the whole request |
| MongoDB connection drop | Backend logs error, returns `503` with retry-after hint; reconnect logic via Mongoose's built-in retry |
| External API (CPCB/Weather) rate-limited or down during data refresh | Use last successfully fetched dataset; flag staleness in response (`dataFreshness: "stale"`) rather than failing |
| Demo-day live API/internet failure | `DEMO_MODE=true` env flag serves a frozen, pre-validated snapshot of all 5 endpoints — tested to work fully offline |

---

## 6. Deployment Architecture (Demo Environment)

For the hackathon demo, everything runs via Docker Compose on a single machine (laptop) — no cloud deployment required, but designed so it *could* be deployed without rearchitecting:

```yaml
# docker-compose.yml (conceptual structure)
services:
  ml-service:
    build: ./ml-service
    ports: ["8001:8001"]
  backend:
    build: ./backend
    ports: ["5000:5000"]
    depends_on: [mongodb, redis, ml-service]
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]
  mongodb:
    image: mongo:latest
    ports: ["27017:27017"]
  redis:
    image: redis:latest
    ports: ["6379:6379"]
```

**Path to production (not built now, just noted for the roadmap/judges' scalability question):**
- ML service + backend → containerized, deployed on any cloud (AWS ECS/GCP Cloud Run)
- MongoDB → managed Atlas cluster (already using this pattern in dev)
- Frontend → static build served via CDN (Vercel/Netlify/S3+CloudFront)
- City-agnostic config → each new city = a config entry (zone list + data source mapping), not new code

---

## 7. Scalability Notes (for judging criteria — 15% weight)

- **Adding a new city:** requires (a) a new `zones_metadata` entry set, (b) a data source mapping for that city's CAAQMS stations — no code changes to ML model logic or backend route logic, since both are written to take `city`/`zoneId` as parameters, not hardcoded values.
- **Adding more zones within Delhi:** same pattern — just extend the zones collection, interpolation logic automatically extends.
- **Horizontal scaling (future):** ML service and backend are stateless (state lives in MongoDB/Redis), so both can be replicated behind a load balancer without code changes.

---

## 8. Security Notes (lightweight, hackathon-appropriate)

- API keys (CPCB, OpenWeatherMap, LLM) stored in `.env`, never committed to git (`.gitignore` includes `.env`)
- No citizen PII is required for the advisory feature — `sessionId` is anonymous/random, not tied to identity
- Admin/enforcement views are not auth-gated in the hackathon version — noted explicitly as a "production roadmap" item, not a security oversight being hidden

---

## 9. What's Explicitly Simplified for the Hackathon (vs a Real Production System)

| Area | Hackathon Version | Production Would Need |
|---|---|---|
| Spatial resolution | IDW interpolation between existing stations | Dense sensor network or satellite-derived PM2.5 at true 1km grid |
| Dispersion modelling | Simple wind-direction-weighted scoring | Full atmospheric dispersion/CFD modelling |
| Multi-city support | 1 live city + 1-2 historical-only | All cities live with equal depth |
| Citizen channel | Web chat only | WhatsApp + IVR + mobile push |
| Auth | None | Role-based access for officials vs public |
| Data refresh | Manual/script-triggered | Real-time streaming pipeline |

This table is intentionally included in the architecture doc (and should appear in the deck) — being upfront about simplifications is a credibility signal, not a weakness to hide.
