# AirSense

AirSense is a Delhi-focused air-quality intelligence dashboard that combines AQI forecasting, pollution source attribution, enforcement prioritization, city comparisons, and citizen advisories in a single app.

The project is structured as a Python ML microservice, a Node.js/Express backend, and a React frontend. It is designed for demo use and uses mock data fallback when live AI or external services are unavailable.

---

## What the project does

- Forecasts AQI for monitored Delhi zones using a model-backed endpoint with mock fallback
- Attributes pollution spikes to likely sources such as traffic, industrial activity, and construction
- Ranks zones by enforcement priority using severity, population exposure, and attribution confidence
- Compares Delhi with other cities using sample historical data
- Provides a citizen advisory chat interface for Hindi/English/Kannada responses
- Exposes a health endpoint and a service architecture that supports demo and local development workflows

---

## Architecture

```text
Frontend (React + Vite)
        |
        v
Backend (Node.js + Express)
        |
        +--> ML Service (FastAPI + Python)
        |
        +--> MongoDB (best-effort persistence)
        |
        +--> Redis cache (best-effort caching)

Demo / mock fallback:
- backend falls back to mock JSON when database or upstream service is unavailable
- ML service serves mock outputs from ml-service/data/mock_outputs.json by default
```

The real app flow is:

1. Frontend calls backend endpoints
2. Backend validates request data and checks cache
3. Backend calls the ML service for forecasts/attribution/enforcement output
4. If services fail, the app falls back to structured mock data instead of crashing

---

## Tech stack

- Frontend: React, Vite, React Router, Leaflet, Recharts, Axios
- Backend: Node.js, Express, MongoDB, Redis, Axios, dotenv, node-cron
- ML service: Python, FastAPI, pandas, numpy, scikit-learn, statsmodels, xgboost, geopandas
- External integrations: OpenWeatherMap, Google GenAI/OpenAI, Telegram bot support

---

## Repository structure

```text
AirSense/
├── AGENTS.md
├── ARCHITECTURE.md
├── PRD.md
├── README.md
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── app.js
│   │   ├── ingest.js
│   │   ├── seed.js
│   │   ├── data/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   └── .env.example (if present in your checkout)
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   └── src/
├── ml-service/
│   ├── main.py
│   ├── requirements.txt
│   ├── weather_client.py
│   ├── attribution/
│   ├── data/
│   ├── enforcement/
│   ├── forecasting/
│   └── models/
└── ...
```

---

## Running the app locally

### Prerequisites

- Node.js 18+
- Python 3.10+
- Optional: MongoDB and Redis for full local backend behavior
- Optional: Docker Desktop for running the compose stack

### 1) Start the ML service

```bash
cd ml-service
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

This serves the model endpoints at:

- http://localhost:8001/health
- http://localhost:8001/forecast/{ward_id}
- http://localhost:8001/attribution/{zone_id}
- http://localhost:8001/enforcement/priorities

### 2) Start the backend

```bash
cd backend
npm install
npm run dev
```

The backend starts on port 5000 by default and exposes API routes under `/api`.

If MongoDB or Redis is not available, the app still starts in a degraded mode and relies on mock data and fallback logic.

### 3) Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on the Vite default port, usually:

- http://localhost:5173

---

## Docker setup

The repo includes a Compose file for running the app stack together.

```bash
docker compose up --build
```

This starts:

- ML service on port 8001
- Backend on port 5000
- Frontend on port 3000
- MongoDB on port 27017
- Redis on port 6379

---

## Backend API

These are the routes implemented by the backend.

### Health and discovery

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Backend health check |
| GET | `/api/zones` | List valid Delhi zones |
| GET | `/api/cities` | List supported comparison cities |

### Forecasting

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/forecast/:wardId` | Returns forecast data for a zone |
| GET | `/api/forecast` | Lists available zone IDs |

### Attribution

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/attribution/:zoneId` | Returns source attribution scores |
| GET | `/api/attribution` | Lists available zone IDs |

### Enforcement

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/enforcement/priorities?limit=10` | Returns ranked enforcement priorities |

### City comparison

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cities/compare?cities=delhi,mumbai` | Returns comparison data for selected cities |

### Advisory

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/advisory/chat` | Sends a citizen query and receives language-aware AQI guidance |

Example request body:

```json
{
  "location": "anand-vihar",
  "query": "Should I go outside today?",
  "language": "en"
}
```

---

## Frontend pages

The React app currently contains:

- Dashboard: map view, AQI stats, forecast and attribution panels, enforcement list
- Multi-City page: comparison view for Delhi and additional city data
- Advisory page: chat interface for public health guidance

The app includes a theme toggle and uses a mock/safe fallback when the backend is unavailable.

---

## Environment variables

The backend reads values from environment variables, typically via a local `.env` file.

Example:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/airsense
REDIS_URL=redis://localhost:6379
ML_SERVICE_URL=http://localhost:8001
DEMO_MODE=false
OPENWEATHER_API_KEY=your_key_here
LLM_API_KEY=your_key_here
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ALERT_CHAT_ID=your_chat_id_here
AQI_ALERT_THRESHOLD=300
ALERT_CRON_SCHEDULE=0 */6 * * *
ALERTS_ENABLED=true
```

For Python, the ML service can use mock data by default through `USE_MOCK_DATA=true` in the environment.

---

## Demo behavior and fallback logic

This project is built to keep working during demos even when dependencies are missing or upstream services fail.

Important behavior:

- Backend starts even if MongoDB is unavailable
- ML service serves mock data from `ml-service/data/mock_outputs.json`
- Backend falls back to cached or mock data when upstream calls fail
- Advisory endpoint uses a generic message if the LLM is unavailable
- Frontend uses the backend API directly and can render with fallback sample data

---

## Project notes

- The app is centered on Delhi, but the architecture is intended to be city-agnostic at the service level.
- The current implementation emphasizes a functional demo workflow more than production-grade persistence or real-time ingestion.
- More detailed design rationale and requirements are in [ARCHITECTURE.md](ARCHITECTURE.md) and [PRD.md](PRD.md).

---

## Useful commands

```bash
# ML service
cd ml-service
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev

# Full stack via Docker
cd .
docker compose up --build
```

---

## Status

This repository currently contains a working prototype structure with mock-data-driven demo behavior, backend API wiring, ML endpoints, and React UI pages. It is ready for local development and demonstration, with the main next steps being real model tuning and production hardening.
