# AirSense Frontend — Setup Guide

## Prerequisites
- Node.js ≥ 18 (LTS recommended)
- npm ≥ 9
- Backend running at `http://localhost:5000` (see `backend/README.md`)

---

## Quick Start

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies (already done if node_modules exists)
npm install

# 3. Copy environment variables
cp .env.example .env
# Leave VITE_API_BASE_URL blank — the Vite proxy will handle /api → localhost:5000

# 4. Start the dev server
npm run dev
```

App will be available at **http://localhost:3000**

---

## Environment Variable

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | *(empty — uses Vite proxy)* | Full backend API base URL. Set this for production or when running without the Vite proxy. Example: `http://my-backend.com/api` |

In development, **leave `VITE_API_BASE_URL` blank**. The Vite dev server automatically proxies all `/api/*` requests to `http://localhost:5000` via the config in `vite.config.js`.

---

## Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Delhi map + AQI forecast + source attribution + enforcement priority list |
| `/compare` | Multi-City Comparison | Historical AQI trends for Delhi, Mumbai, Kolkata |
| `/advisory` | Citizen Advisory Chat | AI-powered health advice in Hindi + English |

---

## File Structure

```
frontend/src/
├── components/
│   ├── NavBar.jsx           ← Top navigation bar
│   ├── MapView.jsx          ← Leaflet map with zone markers
│   ├── ForecastChart.jsx    ← 72-hr AQI forecast + confidence band + RMSE
│   ├── AttributionPanel.jsx ← Pollution source breakdown (bars + pie)
│   ├── EnforcementList.jsx  ← Ranked priority cards (clickable → selects zone)
│   ├── CityCompare.jsx      ← Multi-line historical chart + summary table
│   └── AdvisoryChat.jsx     ← Chat widget with suggestion chips, Hindi/EN
├── pages/
│   ├── Dashboard.jsx        ← Main dashboard (combines all map-side components)
│   ├── ComparePage.jsx      ← Wraps CityCompare with controls
│   └── AdvisoryPage.jsx     ← Wraps AdvisoryChat with AQI reference sidebar
├── services/
│   └── api.js               ← ALL axios calls centralized here
├── constants/
│   └── zones.js             ← FALLBACK_ZONES array + AQI color helpers
├── App.jsx                  ← React Router setup
├── main.jsx                 ← App entry point
└── index.css                ← Global design system (tokens, components, utilities)
```

---

## Backend API Expected

The frontend consumes these endpoints from `http://localhost:5000/api`:

| Method | Endpoint | Used By |
|---|---|---|
| `GET` | `/zones` | MapView (falls back to FALLBACK_ZONES if unavailable) |
| `GET` | `/forecast/:wardId` | ForecastChart |
| `GET` | `/attribution/:zoneId` | AttributionPanel |
| `GET` | `/enforcement/priorities?limit=10` | EnforcementList |
| `GET` | `/cities/compare?cities=delhi,mumbai,kolkata` | CityCompare |
| `POST` | `/advisory/chat` | AdvisoryChat |

All components have full loading skeletons + error fallbacks — the UI will not crash if any endpoint is down.

---

## Build for Production

```bash
npm run build
# Output → frontend/dist/
```

---

## Demo Mode Tips

- The app works with the **mock data backend** (no real model needed) — all UI renders from `ml-service/data/mock_outputs.json`
- To simulate offline judging: start backend with `DEMO_MODE=true`, which serves frozen snapshot data
- Advisory chat falls back to a static helpful message if `LLM_API_KEY` is not set — demo will still look functional
