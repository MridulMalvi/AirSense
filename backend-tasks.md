# Backend Engineer — Task File

> **Read `00-shared-foundation.md` first and make sure that's fully done before starting here.**
> Your job: Data pipeline orchestration, MongoDB, Node.js APIs, LLM integration for advisory, enforcement/multi-city backend logic. You own `backend/`.

---

## WEEK 1 — Foundation + Mock-Driven APIs (don't wait on ML's real model)

### Task 1.1 — Project scaffold
- [ ] `cd backend && npm init -y`
- [ ] Install: `express mongoose redis dotenv cors axios`
- [ ] Set up `backend/src/app.js` with a basic Express server, CORS enabled, `.env` loaded
- [ ] **Acceptance check:** `npm run dev` starts server, `GET /health` returns `{ status: "ok" }`

### Task 1.2 — MongoDB schemas
- [ ] In `backend/src/models/`, create Mongoose schemas for: `Station`, `Reading`, `Zone`, `Forecast`, `Attribution`, `EnforcementPriority`, `AdvisoryLog` (use the field list from `00-shared-foundation.md` Step 4)
- [ ] Connect to MongoDB (local or shared Atlas cluster — confirm with team which one)
- [ ] **Acceptance check:** server starts without DB connection errors, you can manually insert a test document into each collection

### Task 1.3 — Load zone metadata into DB
- [ ] Once ML person shares `zones_metadata.csv`, write a one-time seed script `backend/src/seed.js` to load zones into the `Zone` collection
- [ ] **Acceptance check:** `Zone.find()` returns all 8-10 zones agreed in shared foundation

### Task 1.4 — Build APIs against ML's mock_outputs.json (don't wait for real model)
- [ ] As soon as ML person commits `mock_outputs.json`, build:
  - `GET /api/forecast/:wardId` — reads from mock file, returns matching contract shape
  - `GET /api/attribution/:zoneId` — same, from mock
  - `GET /api/enforcement/priorities` — same, from mock
- [ ] **Acceptance check:** all 3 endpoints return valid JSON matching the contract, testable via Postman/curl — frontend person can now start building against these immediately

---

## WEEK 2 — Real Data Pipeline + Swap Mock for Real ML Calls

### Task 2.1 — Ingest real CAAQMS + weather data into DB
- [ ] Write a script to load ML person's cleaned CSV files (`cpcb_delhi_cleaned.csv`, `weather_delhi.csv`) into `Station` and `Reading` collections
- [ ] Set up a basic cron/interval job (even just a manual script run is fine for hackathon) to simulate "live" data refresh
- [ ] **Acceptance check:** `Reading.find({ stationId: 'X' })` returns real historical data, not mock

### Task 2.2 — Swap forecast/attribution/enforcement endpoints to call ML microservice
- [ ] Once ML person's FastAPI endpoints (`/forecast/{wardId}`, `/attribution/{zoneId}`, `/enforcement/priorities`) are live on `localhost:8001`, replace the mock-file reads in your routes with `axios` calls to the ML service
- [ ] Add basic error handling: if ML service is down, fall back to last cached/mock response rather than crashing
- [ ] **Acceptance check:** your endpoints now return real model output, verified by comparing against what ML person tested directly

### Task 2.3 — Add Redis caching (optional but recommended)
- [ ] Cache forecast/attribution responses for a few minutes so repeated frontend calls don't hit ML service every time
- [ ] **Acceptance check:** second call to same endpoint within cache window returns faster (check response time or add a log)

---

## WEEK 3 — Enforcement, Multi-City, and Advisory Bot

### Task 3.1 — Multi-city comparison endpoint
- [ ] `GET /api/cities/compare?cities=delhi,mumbai` — for Delhi, pull from your real `Reading` data; for other cities, load a static historical CSV (download once from CPCB for 1-2 other cities, no live pipeline needed)
- [ ] **Acceptance check:** endpoint returns historical AQI trend arrays for each requested city

### Task 3.2 — Citizen Advisory endpoint (LLM integration)
- [ ] `POST /api/advisory/chat` — accepts `{ location, query, language }`
- [ ] Logic: fetch current/forecast AQI for that location (reuse forecast endpoint internally), then call an LLM API with a prompt like: *"User is at [location], current/forecast AQI is [X], they asked: [query]. Respond in [language] with practical health advice, keep it short."*
- [ ] Support at minimum Hindi and English (`language` param: "hi" or "en")
- [ ] Log every interaction to `AdvisoryLog` collection
- [ ] **Acceptance check:** sending a test query returns a sensible, language-appropriate response

### Task 3.3 — Static vulnerability layer for advisory urgency
- [ ] Add a simple static list of hospital/school zones (manually compiled, doesn't need to be exhaustive — 5-10 known locations is enough) to `Zone` collection or a separate `POI` collection
- [ ] In the advisory logic, if user location is near a flagged POI, bump the urgency/tone of the LLM prompt
- [ ] **Acceptance check:** advisory response for a location near a flagged school/hospital reads noticeably more urgent than a generic one

---

## WEEK 4 — Integration Support, Hardening, Docs

### Task 4.1 — Full integration testing with frontend
- [ ] Go through every endpoint with frontend person live — confirm response shapes actually match what their UI expects (don't assume the contract from Week 1 survived unchanged)
- [ ] Fix any mismatches immediately, document any contract changes in the shared doc

### Task 4.2 — Error handling pass
- [ ] Every endpoint should handle: missing/invalid zoneId or wardId, ML service downtime, empty DB results — return clean error JSON, never a raw stack trace
- [ ] **Acceptance check:** hitting each endpoint with an invalid ID returns a clean `4xx` response, not a crash

### Task 4.3 — Demo data snapshot (CRITICAL — don't rely on live APIs during actual judging)
- [ ] Create a "frozen" snapshot of all key API responses (forecast, attribution, enforcement, city comparison) for the exact demo flow you'll show judges
- [ ] Have a way to serve this snapshot if live data/APIs fail during the demo (env flag like `DEMO_MODE=true`)
- [ ] **Acceptance check:** you can run the full demo flow with internet off, using only the snapshot, and it still works

### Task 4.4 — README/API docs update
- [ ] Update the API Endpoints table in the main `README.md` if any shapes changed from the original contract
- [ ] **Acceptance check:** README reflects actual final API behavior, not the Week-1 draft

---

## Definition of Done (whole Backend portion)
- [ ] All 5 endpoints live, tested, returning real (not mock) data
- [ ] MongoDB populated with real Delhi zone/station/reading data
- [ ] Advisory chat working in Hindi + English
- [ ] Demo-mode fallback tested and working without live internet
- [ ] README API docs updated to match final implementation
