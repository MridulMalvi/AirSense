# Frontend Engineer — Task File

> **Read `00-shared-foundation.md` first and make sure that's fully done before starting here.**
> Your job: React dashboard, map visualizations, citizen advisory chat UI, demo video + presentation deck. You own `frontend/` and the final demo storytelling.

---

## WEEK 1 — Scaffold + Build Against Mock Data (don't wait for real backend)

### Task 1.1 — Project scaffold
- [ ] `cd frontend && npm create vite@latest . -- --template react` (or CRA, your choice)
- [ ] Install: `leaflet react-leaflet recharts axios react-router-dom`
- [ ] Set up basic routing: `/` (main dashboard), `/compare` (multi-city), `/advisory` (chat)
- [ ] **Acceptance check:** `npm run dev` shows a blank app with working navigation between 3 routes

### Task 1.2 — Map component skeleton
- [ ] In `src/components/MapView.jsx`, render a Leaflet map centered on Delhi
- [ ] Plot the 8-10 zones (from shared foundation Step 6) as static markers using hardcoded lat/lng for now (don't wait for backend)
- [ ] **Acceptance check:** map loads, zone markers visible, clicking a marker shows zone name in a popup

### Task 1.3 — Build against backend's mock-fed endpoints
- [ ] As soon as backend person's Week 1 endpoints are live (even if mock-data-fed), point your `axios` calls at them: `GET /api/forecast/:wardId`, `/api/attribution/:zoneId`, `/api/enforcement/priorities`
- [ ] Don't worry that data is fake right now — build the UI logic and layout against it
- [ ] **Acceptance check:** clicking a zone on the map fetches and displays (even fake) forecast/attribution data somewhere on screen

---

## WEEK 2 — Forecast Chart + Attribution Overlay

### Task 2.1 — Forecast chart component
- [ ] In `src/components/ForecastChart.jsx`, use Recharts to plot a line chart: predicted AQI over next 24-72hr, with a shaded confidence band (use `confidenceLow`/`confidenceHigh` from API)
- [ ] Add a second line showing the persistence baseline for visual comparison (this is a strong demo moment — "see, our model tracks better")
- [ ] **Acceptance check:** selecting any zone shows its forecast chart with both model and baseline lines

### Task 2.2 — Attribution overlay on map
- [ ] When a zone is clicked, color its marker/region based on dominant attributed source (e.g., red = traffic, orange = industrial, brown = construction)
- [ ] Add a small breakdown panel (pie chart or simple bar) showing the `{ traffic: 0.6, industrial: 0.3, ... }` breakdown
- [ ] **Acceptance check:** different zones visually show different dominant colors, breakdown panel updates correctly per zone

### Task 2.3 — Heatmap layer (stretch, do if time allows)
- [ ] Add a heatmap overlay (leaflet.heat or similar) showing AQI intensity across the map, interpolated between zones
- [ ] **Acceptance check:** heatmap visually shows higher intensity in known high-pollution zones (sanity check against real data once available)

---

## WEEK 3 — Enforcement List, Multi-City View, Advisory Chat UI

### Task 3.1 — Enforcement priority list view
- [ ] In `src/components/EnforcementList.jsx`, render the ranked list from `/api/enforcement/priorities` as cards: zone name, score, reason text, mini evidence snapshot (AQI value + dominant source)
- [ ] **Acceptance check:** list renders sorted by priority score, each card readable and clear at a glance

### Task 3.2 — Multi-city comparison view
- [ ] In `src/components/CityCompare.jsx`, fetch `/api/cities/compare?cities=delhi,mumbai,kolkata` (or whichever 2-3 cities backend supports) and render side-by-side line charts or a comparison table
- [ ] **Acceptance check:** switching between cities in a dropdown updates the comparison chart

### Task 3.3 — Citizen advisory chat widget
- [ ] In `src/components/AdvisoryChat.jsx`, build a simple chat UI: text input, language toggle (Hindi/English), message history
- [ ] On submit, call `POST /api/advisory/chat` with `{ location, query, language }` and display the reply
- [ ] Add a location picker (dropdown of the 8-10 zones is fine — no need for full geolocation)
- [ ] **Acceptance check:** sending a query in Hindi gets a Hindi response, English gets English

---

## WEEK 4 — Polish, Integration, Demo Assets

### Task 4.1 — Full integration pass with backend
- [ ] Go through every screen with backend person live, confirm real data renders correctly (not just mock)
- [ ] Fix any broken layouts caused by real data shapes differing slightly from mock assumptions

### Task 4.2 — UI polish pass
- [ ] Consistent color scheme, spacing, loading states (spinners) for every API call, empty states (what shows if a zone has no data)
- [ ] Make sure the dashboard looks coherent end-to-end, not like 5 separate disconnected screens — add a clean top nav linking all views
- [ ] **Acceptance check:** click through every screen, nothing looks broken or inconsistent

### Task 4.3 — Demo flow script
- [ ] Write a literal step-by-step script of what you'll click through during the live demo (e.g., "1. Show map, click Anand Vihar zone → 2. Show forecast chart, point out beats baseline → 3. Show attribution breakdown → 4. Show enforcement list → 5. Switch to multi-city view → 6. Show advisory chat in Hindi")
- [ ] Rehearse this flow at least twice before the actual demo day
- [ ] **Acceptance check:** full flow runs smoothly in under 4-5 minutes without errors

### Task 4.4 — Demo video recording
- [ ] Record a 3-5 minute screen capture following the demo flow script, with voiceover explaining what's happening
- [ ] **Acceptance check:** video uploaded/saved, watchable end-to-end without confusion

### Task 4.5 — Presentation deck
- [ ] Build slides: Problem (use the problem statement context) → Solution overview → Architecture diagram (from README) → Live demo screenshots → Model validation chart (get from ML person) → Roadmap → Team
- [ ] Include the "honesty disclaimer" slide (what's real data vs mock) — judges respect this, don't skip it
- [ ] **Acceptance check:** deck tells a complete story even without the live demo, in case demo fails on stage

---

## Definition of Done (whole Frontend portion)
- [ ] All 5 feature views built and functional against real backend data
- [ ] Demo flow rehearsed and reliably works end-to-end
- [ ] Demo video recorded
- [ ] Presentation deck complete, including model validation chart and honesty disclaimer
