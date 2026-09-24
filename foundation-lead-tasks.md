# Foundation Setup Lead — Task File

> You're the person who understands all three areas (ML basics, backend, frontend). Your job is to **solo-complete** `00-shared-foundation.md` — so that the ML, Backend, and Frontend teammates can start their own work in parallel from Day 3, without waiting on each other.
>
> **Deadline: finish this within Day 1-2 of Week 1 — after this, the other three pick up their individual task files.**

---

## PHASE 1 — Repo & Skeleton (Day 1, ~1 hr)

### Task 1.1 — Create repo + folder structure
```bash
mkdir airsense && cd airsense
mkdir -p ml-service/forecasting ml-service/attribution ml-service/enforcement ml-service/data
mkdir -p backend/src/routes backend/src/models backend/src/services
mkdir -p frontend/src/components frontend/src/pages
git init
git add -A && git commit -m "project skeleton"
```
- [ ] Push to GitHub, create the repo
- [ ] Add all three teammates as collaborators
- [ ] **Check:** all 3 can clone the repo, access confirmed

### Task 1.2 — Add root-level docs
- [ ] Drop `PRD.md` and `README.md` (already created) into the repo root
- [ ] Put `00-shared-foundation.md`, `ml-tasks.md`, `backend-tasks.md`, `frontend-tasks.md` into a `/docs` folder so everyone has their own file
- [ ] **Check:** all files committed to the repo

---

## PHASE 2 — API Contract Lock (Day 1, ~1-2 hrs — the most critical step)

### Task 2.1 — Finalize the API contract document
- [ ] Copy the Step 2 table from `00-shared-foundation.md` into a shared doc (Notion/Google Doc, or directly in the README)
- [ ] Write out the exact response shape for all 5 endpoints:
  - `/api/forecast/:wardId`
  - `/api/attribution/:zoneId`
  - `/api/enforcement/priorities`
  - `/api/cities/compare`
  - `/api/advisory/chat`
- [ ] **Check:** write out each shape as sample JSON with fake values and verify it actually makes sense

### Task 2.2 — Walk the team through the contract
- [ ] Share this contract with all three teammates — if roles aren't assigned yet, since you understand all three areas, you can help decide who takes ML/Backend/Frontend
- [ ] **Check:** everyone has reviewed the contract, no major confusion on field names

---

## PHASE 3 — Mock Data File (Day 1-2, ~2 hrs — you build this so nobody has to wait)

> Normally the ML person builds this, but since you're the setup lead, build it upfront so Backend and Frontend can start working from Day 1 — the ML person swaps it for real model output later.

### Task 3.1 — Write the mock JSON
- [ ] Create `ml-service/data/mock_outputs.json` with **hand-written, realistic fake data** for all 5 endpoints, matching the exact shape locked in Phase 2
- [ ] Example structure:
```json
{
  "forecast": {
    "wardId": "anand-vihar",
    "forecast": [
      { "timestamp": "2026-06-23T00:00:00Z", "predictedAQI": 280, "confidenceLow": 250, "confidenceHigh": 310 }
    ],
    "baselineComparison": { "modelRMSE": 18.2, "persistenceRMSE": 24.5 }
  },
  "attribution": {
    "zoneId": "anand-vihar",
    "timestamp": "2026-06-22T18:00:00Z",
    "sources": [
      { "category": "traffic", "confidence": 0.6 },
      { "category": "industrial", "confidence": 0.3 },
      { "category": "construction", "confidence": 0.1 }
    ]
  },
  "enforcement": {
    "priorities": [
      { "zoneId": "anand-vihar", "score": 0.87, "reason": "High AQI + high population + 60% traffic attribution", "evidence": { "aqi": 320, "population": 45000, "dominantSource": "traffic" } }
    ]
  }
}
```
- [ ] **Check:** file is valid JSON (run `python -m json.tool mock_outputs.json` or any JSON validator)

### Task 3.2 — Explain how to use the mock data
- [ ] Tell the backend person to read directly from this file for Week 1 APIs, instead of waiting on the real ML model
- [ ] **Check:** backend person confirms they can use it

---

## PHASE 4 — Database Schema Lock (Day 2, ~30-45 min)

### Task 4.1 — Finalize MongoDB collections
- [ ] Take the schema from `00-shared-foundation.md` Step 4 and confirm fields for each collection:
  - `stations`, `readings`, `zones`, `forecasts`, `attributions`, `enforcementPriorities`, `advisoryLogs`
- [ ] **Check:** schema is documented and shared with the backend person — they'll build Mongoose models from it

### Task 4.2 — Decide on a shared MongoDB instance
- [ ] Decide: local MongoDB on each person's machine, or a shared MongoDB Atlas free-tier cluster (recommended — everyone sees the same data, no conflicts)
- [ ] If using Atlas, create the cluster and share the connection string
- [ ] **Check:** at least one connection method is decided and tested

---

## PHASE 5 — Zone List Finalization (Day 2, ~1 hr)

### Task 5.1 — Pick 8-10 Delhi zones
- [ ] Look up known CAAQMS station locations (available on the CPCB website) and pick 8-10 zones that are representative for the demo — e.g. Anand Vihar, RK Puram, ITO, Dwarka, Rohini, Punjabi Bagh, etc.
- [ ] For each zone, note: name, approximate lat/lng, land-use type (industrial/residential/commercial/mixed)
- [ ] Save as `ml-service/data/zones_metadata.csv` (columns: `zoneId, name, landUseType, lat, lng, population_estimate`)
- [ ] **Check:** file has all 8-10 zones, no duplicates

### Task 5.2 — Distribute this list to the team
- [ ] Give this exact file to both ML and Backend — they should both work off the same zone list, not separate ones
- [ ] **Check:** both confirm they're using the same file

---

## PHASE 6 — API Keys & Environment Setup (Day 1-2, ~1 hr)

### Task 6.1 — Get external API access
- [ ] Get a CPCB/data.gov.in API key or download the CAAQMS historical dataset directly
- [ ] Create an OpenWeatherMap free API key
- [ ] Decide on an LLM provider (for the advisory feature) and get an API key
- [ ] **Check:** all three keys/access points work — test each with one sample call

### Task 6.2 — Build .env templates
- [ ] Create `backend/.env.example` and `ml-service/.env.example` (format already in the README)
- [ ] Share actual keys somewhere secure (don't paste raw keys in a group chat — use a password manager or private note if possible)
- [ ] **Check:** all teammates have set up their local `.env` files

---

## PHASE 7 — Communication Setup (Day 1, ~15 min)

### Task 7.1 — Set up the group
- [ ] Create a WhatsApp/Discord group with all three teammates
- [ ] Fix a daily 15-min sync time (e.g. 9 PM)
- [ ] **Check:** group is active, everyone has sent a confirmation message

---

## FINAL HANDOFF CHECKLIST

Once all of the above is done, hand each teammate their respective task file (`ml-tasks.md`, `backend-tasks.md`, `frontend-tasks.md`) and tell them to start working in parallel:

- [ ] Repo ready, everyone has access
- [ ] API contract locked and reviewed by everyone
- [ ] `mock_outputs.json` committed
- [ ] DB schema finalized, connection method decided
- [ ] Zone list (`zones_metadata.csv`) ready and distributed
- [ ] API keys/env setup done
- [ ] Communication group active

**Once this checklist is complete, your "setup lead" work is done — you can now pick your actual role (ML/Backend/Frontend) and follow that task file.**
