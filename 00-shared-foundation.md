# 00 — SHARED FOUNDATION (Do This First, Together)

> **Goal of this file:** Resolve every dependency that would block parallel work. Nobody touches their individual task file until everything in this doc is done and agreed. This should take **Day 1–2 of Week 1**, done together (call/in-person), not solo.

---

## STEP 1 — Repo & Folder Skeleton (30 min, anyone can do, share screen)

```bash
mkdir airsense && cd airsense
mkdir -p ml-service/forecasting ml-service/attribution ml-service/enforcement ml-service/data
mkdir -p backend/src/routes backend/src/models backend/src/services
mkdir -p frontend/src/components frontend/src/pages
git init
git add -A && git commit -m "project skeleton"
```

Push to a shared GitHub repo. Add all 3 teammates as collaborators. **Everyone clones this before writing any code.**

---

## STEP 2 — Agree on the API Contract (1–2 hrs, all 3 present — THIS IS THE MOST IMPORTANT STEP)

Backend builds these endpoints. ML service feeds them. Frontend consumes them. Lock this down NOW so nobody waits on anybody later.

| Endpoint | Method | Request | Response (example shape) | Owner |
|---|---|---|---|---|
| `/api/forecast/:wardId` | GET | `wardId` (string) | `{ wardId, forecast: [{ timestamp, predictedAQI, confidenceLow, confidenceHigh }], baselineComparison: { modelRMSE, persistenceRMSE } }` | Backend serves, ML computes |
| `/api/attribution/:zoneId` | GET | `zoneId` (string) | `{ zoneId, timestamp, sources: [{ category: "traffic", confidence: 0.6 }, { category: "industrial", confidence: 0.3 }, { category: "construction", confidence: 0.1 }] }` | Backend serves, ML computes |
| `/api/enforcement/priorities` | GET | none / optional `?limit=5` | `{ priorities: [{ zoneId, score, reason, evidence: { aqi, population, dominantSource } }] }` | Backend serves, ML computes |
| `/api/cities/compare` | GET | `?cities=delhi,mumbai` | `{ cities: [{ name, historicalAQI: [{date, aqi}] }] }` | Backend only |
| `/api/advisory/chat` | POST | `{ location, query, language }` | `{ reply, riskLevel }` | Backend (calls LLM) |

**Action items right now:**
- [ ] All 3 people agree these shapes are good (change field names if needed — but lock it before coding)
- [ ] Paste this table into a shared doc/Notion — this is the contract nobody breaks without telling the other two

---

## STEP 3 — Mock Data Contract (so nobody waits on real model/data)

ML person will NOT have a working model on Day 1. Backend and Frontend should NOT wait for it.

- [ ] **ML person:** by end of Day 2, commit a file `ml-service/data/mock_outputs.json` with hardcoded fake responses matching the exact shapes from Step 2. This unblocks backend immediately.
- [ ] **Backend person:** build APIs against this mock file first. Swap to real ML service call later — interface stays identical.
- [ ] **Frontend person:** build UI against backend's mock-fed APIs from Day 3 onward. Don't wait for real model accuracy to be ready.

---

## STEP 4 — Database Schema Agreement (30 min)

MongoDB collections (backend owns creation, but everyone should know this):

```
stations: { stationId, name, lat, lng, city }
readings: { stationId, timestamp, pm25, pm10, no2, so2, co, aqi }
zones: { zoneId, name, city, geoBoundary (GeoJSON), landUseType, population }
forecasts: { wardId, generatedAt, forecast: [...] }
attributions: { zoneId, timestamp, sources: [...] }
enforcementPriorities: { generatedAt, priorities: [...] }
advisoryLogs: { userId/sessionId, location, query, reply, timestamp }
```

- [ ] Backend creates these as Mongoose schemas in `backend/src/models/` by end of Day 2

---

## STEP 5 — Environment & Access Setup (everyone does this individually, Day 1)

- [ ] Get CPCB/data.gov.in API key or download sample CAAQMS dataset (Delhi) → share path with team
- [ ] Get OpenWeatherMap free API key → share key (or each person gets own key, doesn't matter)
- [ ] Pick LLM provider for advisory text + decide who holds the API key (whoever owns backend `.env`)
- [ ] Everyone installs: Node.js 18+, Python 3.10+, MongoDB (local or shared Atlas cluster — **recommend shared Atlas cluster so nobody fights over local data**), Redis (optional for v1, can skip caching initially)

---

## STEP 6 — Decide City Boundaries & Zones for Delhi (1 hr, ML + Backend together)

- [ ] Pick 8–10 Delhi zones/wards to focus on (e.g., Anand Vihar, RK Puram, ITO, Dwarka, Rohini, etc.) — don't try to cover all of Delhi, pick a representative sample with known CAAQMS stations
- [ ] Get rough lat/lng boundaries for these zones (can approximate, doesn't need to be perfect GeoJSON for v1)
- [ ] This zone list goes into the `zones` collection — both ML and Backend work off this exact same list

---

## STEP 7 — Communication Routine (ongoing)

- [ ] Set up a WhatsApp/Discord group for the 3 of you
- [ ] Daily 15-min sync (voice note okay if no time for call) — just "what I did yesterday, what I'm doing today, what's blocking me"
- [ ] Anyone who changes the API contract from Step 2 MUST message the group before changing — don't silently change response shapes

---

## Checklist Before Splitting Into Individual Task Files

- [ ] Repo created, everyone has access and has cloned it
- [ ] API contract table agreed and pasted somewhere shared
- [ ] Mock data file plan agreed (ML commits this by Day 2)
- [ ] DB schema agreed
- [ ] Everyone has their API keys / tools installed
- [ ] Zone list for Delhi finalized
- [ ] Communication channel set up

**Once every box above is ticked — open your individual task file (`ml-tasks.md`, `backend-tasks.md`, or `frontend-tasks.md`) and start. From this point, all 3 of you work in parallel.**
