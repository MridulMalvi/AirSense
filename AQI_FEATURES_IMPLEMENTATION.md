# AQI Intelligence Platform — Feature Implementation Instructions
> Prompt file for AI coding assistants (Cursor / Claude / Copilot)
> Project: Smart City AQI Command Center
> Stack: MERN (MongoDB, Express, React, Node.js) + Python (FastAPI) + Redis

---

## HOW TO USE THIS FILE

Paste this entire file at the start of a new AI session. The AI will:
1. Read the global context and existing system description
2. **Ask you clarifying questions before writing any code** — answer them so it can proceed correctly
3. Implement the feature you specify, section by section

**Do NOT tell the AI to skip questions or make assumptions silently.** Unclear requirements = wrong code. Let it ask.

---

## GLOBAL CONTEXT (AI: read this fully before asking anything)

You are implementing features for an AQI (Air Quality Index) Intelligence Platform targeting Indian city administrators and citizens. The system already has:
- A base MERN stack with ward-level AQI data ingestion
- A dashboard showing real-time AQI readings per zone/ward
- A Source Attribution module that estimates pollution contributors (vehicular, industrial, construction, burning)
- A basic LLM chat widget for citizens to query their local air quality

The four features below must be implemented as **self-contained modules** that integrate into this existing system. Each module has its own backend service, API routes, and frontend component. Do not break existing functionality.

**Before writing any code for a feature, ask the developer the clarifying questions listed under that feature's "Questions to Ask First" section. Wait for answers before proceeding.**

---

## FEATURE 1 — WHAT-IF SIMULATION ENGINE

### Goal
Allow city administrators to test hypothetical interventions (e.g., "halt construction in Zone A + divert traffic from Zone B") and see a predicted AQI delta over the next 48 hours.

### Questions to Ask First
Before starting this feature, ask the developer:
1. Do you have real historical AQI + weather + traffic data available, or should I generate synthetic training data for the ML model?
2. Where are your existing ward definitions stored — MongoDB collection, a config file, or a hardcoded list? Share the schema or file path.
3. Does your existing project already have a Python/FastAPI service, or is everything in Node.js? Should I add a new FastAPI microservice or implement this in Node.js?
4. Do you want the Simulation Panel accessible only to admin users, or also to citizens?
5. What charting library are you currently using in the frontend (Recharts, Chart.js, D3, or none yet)?

### Architecture
- **Backend:** Python FastAPI microservice at `/api/simulation`
- **ML Model:** XGBoost surrogate model (not a physics simulator — frame as "ML-based scenario approximation")
- **Frontend:** React panel in the Admin Dashboard with sliders + output graph

### Backend Implementation (`/services/simulation-service/`)

```
POST /api/simulation/run
Body: {
  "ward_ids": ["ward_12", "ward_15"],
  "interventions": {
    "halt_construction": true,
    "traffic_diversion_percent": 40,
    "industrial_shutdown": false
  },
  "forecast_hours": 48
}

Response: {
  "baseline_aqi": [...],       // 48 hourly AQI values without intervention
  "simulated_aqi": [...],      // 48 hourly AQI values with intervention
  "delta_summary": {
    "avg_reduction": 23.4,
    "peak_improvement_at_hour": 18,
    "confidence": 0.78
  },
  "contributing_factors": {
    "vehicular": -12.1,
    "construction": -8.3,
    "wind_effect": +2.1
  }
}
```

### Synthetic Training Data Generation (use this when real data is unavailable)

Generate exactly **10,000 rows** of synthetic training data using the following domain-aware rules. Do not skip this step or use random noise — the rules must reflect real-world AQI behavior:

```python
# generate_synthetic_data.py
import pandas as pd
import numpy as np
import random

def generate_synthetic_aqi_data(n_rows=10000, seed=42):
    """
    Generate domain-aware synthetic AQI training data.
    Rules are derived from real atmospheric science patterns for Indian cities.
    """
    np.random.seed(seed)
    random.seed(seed)
    rows = []

    for _ in range(n_rows):
        hour_of_day     = random.randint(0, 23)
        day_of_week     = random.randint(0, 6)        # 0=Monday, 6=Sunday
        ward_id         = random.randint(1, 20)        # 20 wards
        temperature     = np.random.normal(28, 6)      # Celsius, Indian city average
        wind_speed      = np.random.exponential(8)     # km/h, right-skewed
        wind_direction  = random.randint(0, 359)       # degrees
        humidity        = np.random.normal(60, 15)     # percent
        is_raining      = 1 if random.random() < 0.1 else 0

        # Traffic density: peaks at morning (8-10) and evening (5-8) rush hours
        if 7 <= hour_of_day <= 10 or 17 <= hour_of_day <= 20:
            traffic_density = np.random.uniform(0.6, 1.0)
        elif 0 <= hour_of_day <= 5:
            traffic_density = np.random.uniform(0.0, 0.2)
        else:
            traffic_density = np.random.uniform(0.2, 0.6)

        # Lower traffic on Sunday
        if day_of_week == 6:
            traffic_density *= 0.6

        # Construction: more active during day, zero at night
        construction_activity = np.random.uniform(0.4, 1.0) if 8 <= hour_of_day <= 18 else 0.0

        # Industrial: runs 24/7 with slight night reduction
        industrial_emission = np.random.uniform(0.3, 0.7) if 22 <= hour_of_day or hour_of_day <= 5 else np.random.uniform(0.5, 1.0)

        # Burning: mostly evening/night
        burning_activity = np.random.uniform(0.3, 0.8) if hour_of_day >= 18 or hour_of_day <= 6 else np.random.uniform(0.0, 0.2)

        # Base AQI calculation from contributions
        base_aqi = (
            traffic_density       * 80  +   # vehicles are big contributor
            construction_activity * 50  +
            industrial_emission   * 60  +
            burning_activity      * 70
        )

        # Environmental modifiers
        if wind_speed > 15:
            base_aqi *= 0.7           # strong wind disperses pollutants
        if is_raining:
            base_aqi *= 0.5           # rain washes pollutants down
        if temperature > 35:
            base_aqi *= 1.15          # heat traps pollutants (inversion effect)
        if humidity > 80:
            base_aqi *= 1.1           # high humidity worsens particulate matter

        current_aqi = np.clip(base_aqi + np.random.normal(0, 10), 0, 500)

        # Target: AQI delta next hour (positive = worsening, negative = improving)
        hour_trend = 1.0 if (hour_of_day >= 6 and hour_of_day <= 10) else -0.5
        aqi_delta_next_hour = (
            traffic_density * 5 +
            construction_activity * 3 +
            industrial_emission * 2 -
            wind_speed * 0.3 +
            hour_trend +
            np.random.normal(0, 3)     # noise
        )

        rows.append({
            "current_aqi": round(current_aqi, 2),
            "traffic_density": round(traffic_density, 3),
            "construction_activity_flag": round(construction_activity, 3),
            "industrial_emission_index": round(industrial_emission, 3),
            "burning_activity": round(burning_activity, 3),
            "wind_speed": round(wind_speed, 2),
            "wind_direction": wind_direction,
            "temperature": round(temperature, 1),
            "humidity": round(humidity, 1),
            "is_raining": is_raining,
            "hour_of_day": hour_of_day,
            "day_of_week": day_of_week,
            "ward_id_encoded": ward_id,
            "aqi_delta_next_hour": round(aqi_delta_next_hour, 3)   # TARGET
        })

    return pd.DataFrame(rows)

if __name__ == "__main__":
    df = generate_synthetic_aqi_data(10000)
    df.to_csv("synthetic_aqi_training_data.csv", index=False)
    print(f"Generated {len(df)} rows. AQI range: {df['current_aqi'].min():.1f} – {df['current_aqi'].max():.1f}")
    print(f"Delta range: {df['aqi_delta_next_hour'].min():.2f} – {df['aqi_delta_next_hour'].max():.2f}")
```

**Model Training (run after generating data):**
```python
# train_model.py
import pandas as pd
import joblib
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

FEATURES = [
    "current_aqi", "traffic_density", "construction_activity_flag",
    "industrial_emission_index", "burning_activity", "wind_speed",
    "wind_direction", "temperature", "humidity", "is_raining",
    "hour_of_day", "day_of_week", "ward_id_encoded"
]
TARGET = "aqi_delta_next_hour"

df = pd.read_csv("synthetic_aqi_training_data.csv")
X_train, X_test, y_train, y_test = train_test_split(df[FEATURES], df[TARGET], test_size=0.2, random_state=42)

model = XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.05, random_state=42)
model.fit(X_train, y_train)

mae = mean_absolute_error(y_test, model.predict(X_test))
print(f"Test MAE: {mae:.3f} AQI units")   # expect ~3-5 for synthetic data

joblib.dump(model, "simulation_model.pkl")
print("Model saved as simulation_model.pkl")
```

**FastAPI Routes:**
```python
# routes/simulation.py
@router.post("/run")
async def run_simulation(request: SimulationRequest):
    # 1. Load model from disk
    # 2. Fetch current AQI + weather for requested wards from MongoDB
    # 3. Build feature matrix for each ward, each hour
    # 4. Run baseline pass (no interventions)
    # 5. Run intervention pass (modify feature matrix per intervention flags)
    # 6. Autoregressive rollout: feed predicted AQI back as input for next hour
    # 7. Return both series + delta summary
```

**Intervention → Feature Mapping:**
- `halt_construction: true` → set `construction_activity_flag = 0` for all 48 hours
- `traffic_diversion_percent: N` → multiply `traffic_density` by `(1 - N/100)`
- `industrial_shutdown: true` → set `industrial_emission_index = 0`

### Frontend Implementation (`/client/src/components/SimulationPanel/`)

**Component: `SimulationPanel.jsx`**
- Ward multi-select dropdown (pull from existing ward list API)
- Sliders:
  - "Reduce Construction Activity" (0–100%)
  - "Traffic Diversion" (0–100%)
  - "Industrial Activity Reduction" (0–100%)
- "Forecast Window" toggle: 12h / 24h / 48h
- Submit button: "Run Simulation"
- Output: Line chart with two lines — "Baseline AQI" (red) and "Simulated AQI" (green)
- Summary card below chart: avg reduction, peak improvement hour, confidence score
- Show a yellow warning banner: `"This is an ML-based approximation, not a certified atmospheric model."`

**State management:** Use React Query for the POST call. Show a skeleton loader during the ~2-3s model inference.

---

## FEATURE 2 — LIVE TRAFFIC & MOBILITY API INTEGRATION

### Goal
Replace static vehicular emission estimates in Source Attribution with real-time traffic congestion data, updated every 15 minutes per ward.

### Questions to Ask First
Before starting this feature, ask the developer:
1. Do you have a TomTom API key, or should I set up the integration to work with a mock/fallback until you get one?
2. Where is your ward configuration currently stored — MongoDB, a JSON config file, or hardcoded? I need the ward centroid coordinates (lat/lng) for each ward.
3. What does your existing `sourceAttribution.js` look like? Share the file so I can integrate the traffic data without breaking the existing calculation.
4. Is Redis already connected in your Node.js backend? Share the Redis client setup code.
5. Does your ward map use Leaflet, Mapbox, Google Maps, or something else? This affects how I add the traffic overlay layer.

### Architecture
- **Primary API:** TomTom Traffic Flow API (free tier: 2,500 req/day)
- **Fallback API:** HERE Traffic API
- **Backend:** New Node.js service that polls traffic data and writes to Redis with 15-min TTL
- **Integration point:** Source Attribution calculation must consume Redis traffic data instead of static lookup table

### Environment Variables Required
```env
TOMTOM_API_KEY=your_key_here
HERE_API_KEY=your_key_here
TRAFFIC_POLL_INTERVAL_MS=900000   # 15 minutes
```

### Backend Implementation (`/services/traffic-service/`)

**`trafficPoller.js` — Background job (runs on server start)**
```javascript
// Uses node-cron or setInterval
// For each ward in WARDS_CONFIG:
//   1. Get ward centroid coordinates (lat, lng) from ward config
//   2. Call TomTom /traffic/services/4/flowSegmentData/absolute/10/json?point={lat},{lng}&key={API_KEY}
//   3. Extract: currentSpeed, freeFlowSpeed, currentTravelTime, freeFlowTravelTime
//   4. Compute congestion_index = 1 - (currentSpeed / freeFlowSpeed)  // 0=free flow, 1=gridlock
//   5. Write to Redis: SET traffic:{ward_id} {JSON.stringify(data)} EX 1800
//   6. On TomTom failure: fall back to HERE API same endpoint pattern
//   7. Log failures silently — do NOT crash the main process
```

**`GET /api/traffic/ward/:wardId`**
```javascript
// 1. Read from Redis: GET traffic:{wardId}
// 2. If cache miss: fetch live, write to Redis, return
// 3. Return: { wardId, congestion_index, currentSpeed, lastUpdated }
```

**Source Attribution Integration:**
In your existing `sourceAttribution.js` calculation file, replace the static vehicular emission weight lookup with:
```javascript
const trafficData = await redis.get(`traffic:${wardId}`);
const congestion = trafficData ? JSON.parse(trafficData).congestion_index : 0.5;
// fallback 0.5 = moderate traffic assumed if API is down
const vehicularContribution = BASE_VEHICULAR_EMISSION * (0.5 + congestion * 1.5);
// Scaling: gridlock (1.0) = 2x base emission | free flow (0.0) = 0.5x base
// Ask developer to confirm this scaling formula makes sense for their baseline emission values
```

### Frontend Implementation

**Traffic Overlay on Ward Map:**
- Add a toggle button "Traffic Layer" in the map toolbar
- When enabled: color each ward polygon by congestion_index using gradient `#00C853 (free) → #FF6D00 (congested) → #B71C1C (gridlock)`
- Show tooltip on ward hover: "Congestion Index: 0.72 | Speed: 23 km/h | Last updated: 4 min ago"
- Pulse animation on wards with congestion_index > 0.8

**Correlation Widget (optional but high-impact for demo):**
- Small scatter plot: X = congestion_index, Y = vehicular AQI contribution, one point per ward
- Shows the real-time correlation between traffic and pollution — powerful visual for judges

---

## FEATURE 3 — PROACTIVE PUSH ALERTS (WhatsApp + SMS)

### Goal
Send automated, localized AQI spike warnings to citizens before a forecasted spike hits their specific ward.

### Questions to Ask First
Before starting this feature, ask the developer:
1. Do you have a Gupshup or Twilio account set up? If not, should I mock the sending service so the rest of the flow can be tested locally?
2. Does your system already have an AQI forecast model that outputs future AQI values? If yes, share the API endpoint or function. If no, should I implement a simple moving-average forecast as a placeholder?
3. Do you want citizens to subscribe via a frontend widget, or is this admin-managed only for the hackathon?
4. What alert thresholds do you want to use for Moderate / Poor / Severe? The defaults I've specified are AQI 100 / 200 / 300 — confirm or change these.
5. Should alert messages be sent in Hindi, English, or should users choose their language at subscription time?

### Architecture
- **WhatsApp:** Gupshup WhatsApp Business API (preferred for Indian market) OR Meta WhatsApp Cloud API (sandbox for PoC)
- **SMS fallback:** Twilio SMS API
- **Trigger:** Node.js cron job that runs every hour, checks 6-hour AQI forecast, sends alerts if threshold crossed
- **User registry:** MongoDB collection `alert_subscribers`

### Environment Variables Required
```env
GUPSHUP_API_KEY=your_key_here
GUPSHUP_APP_NAME=your_app_name
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
AQI_ALERT_THRESHOLD_MODERATE=100
AQI_ALERT_THRESHOLD_POOR=200
AQI_ALERT_THRESHOLD_SEVERE=300
```

### MongoDB Schema (`alert_subscribers` collection)
```javascript
{
  _id: ObjectId,
  phone: String,          // E.164 format: +919876543210
  ward_id: String,        // "ward_12"
  ward_name: String,      // "Hazratganj"
  language: String,       // "hi" or "en"
  channel: String,        // "whatsapp" or "sms"
  active: Boolean,
  last_alerted_at: Date,  // prevent spam: min 4hr between alerts
  alert_thresholds: {
    moderate: Boolean,
    poor: Boolean,
    severe: Boolean
  },
  created_at: Date
}
```

### Backend Implementation (`/services/alert-service/`)

**`alertCron.js` — Runs every hour**
```javascript
// 1. Fetch 6-hour AQI forecast for all wards from forecast model
// 2. For each ward where max_forecasted_aqi > any threshold:
//    a. Find all active subscribers for that ward
//    b. Filter out subscribers alerted in last 4 hours
//    c. Group by channel (whatsapp / sms)
//    d. Send WhatsApp message via Gupshup API
//    e. Send SMS via Twilio for sms channel subscribers
//    f. Update last_alerted_at for all sent subscribers
// 3. Log all sends to MongoDB collection `alert_logs`
```

**Message Templates:**

Hindi WhatsApp template:
```
⚠️ AQI अलर्ट — {ward_name}

अगले {hours} घंटों में आपके क्षेत्र में AQI {forecasted_aqi} तक पहुंच सकता है।

स्तर: {level_hindi}  {emoji}
सलाह: {advice_hindi}

बाहर जाने से पहले मास्क पहनें।
```

English SMS template:
```
[AQI Alert] Ward: {ward_name} | Forecasted AQI: {value} in {hours}h | Level: {level} | Wear a mask before going out. Unsubscribe: {unsub_link}
```

AQI Level → Hindi mapping:
- 0–50: संतोषजनक (Satisfactory) ✅
- 51–100: मध्यम (Moderate) 🟡
- 101–200: खराब (Poor) 🟠
- 201–300: बहुत खराब (Very Poor) 🔴
- 300+: गंभीर (Severe) ☠️

**`POST /api/alerts/subscribe`**
```javascript
// Body: { phone, ward_id, language, channel, thresholds }
// Validate phone number format (E.164)
// Check: subscriber already exists? Update, don't duplicate
// Send confirmation message via chosen channel
// Return: { success: true, message: "Subscribed successfully" }
```

**`DELETE /api/alerts/unsubscribe`**
```javascript
// Body: { phone } OR token from URL param
// Set active: false (soft delete — keep data for analytics)
```

### Frontend Implementation

**Citizen-facing Subscribe Widget (`/client/src/components/AlertSubscribe/`):**
- Floating button on citizen dashboard: "🔔 Get AQI Alerts"
- Modal form:
  - Phone number input with +91 prefix
  - Ward dropdown (auto-populated, can auto-detect from browser geolocation)
  - Language toggle: हिंदी / English
  - Channel: WhatsApp (recommended) / SMS
  - Threshold checkboxes: Moderate, Poor, Severe
- On submit: POST to `/api/alerts/subscribe`
- Confirmation: "You'll receive a WhatsApp confirmation shortly"

**Admin Alert Dashboard (`/client/src/pages/AlertsAdmin/`):**
- Table: subscriber count per ward
- Metrics: total alerts sent today, delivery rate, most-alerted ward
- Manual trigger button: "Send Test Alert to Ward" (for demo purposes)

---

## FEATURE 4 — CROWDSOURCED REPORTING

### Goal
Citizens upload photos of pollution sources. Vision LLM auto-classifies the event. Validated reports feed ground-truth signals back into Source Attribution.

### Questions to Ask First
Before starting this feature, ask the developer:
1. Do you have a Cloudinary account for image storage, or should I use a different service (S3, local disk for dev)?
2. Do you have a Gemini API key or OpenAI API key? Which Vision model should I use for classification?
3. Does your app currently have any user authentication, or are users anonymous? This determines how I implement the reporter identity system.
4. Should the moderation (validate/reject) be manual by an admin, or fully automated based on confidence threshold alone?
5. How is your ward map rendered on the frontend? I need to add a reports layer with pin markers.

### Architecture
- **Image storage:** Cloudinary (free tier sufficient) OR AWS S3
- **Vision classification:** Google Gemini 1.5 Flash Vision API OR OpenAI GPT-4o Vision
- **Moderation:** Confidence threshold auto-filter + optional admin review
- **Source Attribution integration:** Validated reports increment real-time event counters per ward per category

### Environment Variables Required
```env
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
GEMINI_API_KEY=your_key            # or OPENAI_API_KEY
VISION_CONFIDENCE_THRESHOLD=0.60
```

### MongoDB Schema (`pollution_reports` collection)
```javascript
{
  _id: ObjectId,
  reporter_id: String,        // anonymous UUID stored in localStorage
  ward_id: String,
  ward_name: String,
  coordinates: { lat: Number, lng: Number },
  image_url: String,          // Cloudinary URL
  image_public_id: String,    // for deletion if rejected

  classification: {
    category: String,         // "garbage_burning" | "construction_dust" | "vehicle_smoke" | "industrial_emission" | "unknown"
    confidence: Float,
    description: String,
    severity: String,         // "low" | "medium" | "high"
    raw_response: String
  },

  status: String,             // "pending" | "validated" | "rejected" | "needs_review"
  moderation_reason: String,

  attribution_applied: Boolean,
  attribution_weight: Float,  // confidence * severity_multiplier

  created_at: Date,
  validated_at: Date
}
```

### Backend Implementation (`/services/report-service/`)

**`POST /api/reports/submit`**
```javascript
// 1. Receive: multipart form — image file + { lat, lng, ward_id, description? }
// 2. Validate: file type (jpg/png/webp only), max size 10MB
// 3. Upload to Cloudinary with auto quality compression
// 4. Call Vision LLM classifier
// 5. Apply confidence threshold:
//    - confidence >= 0.6 AND category != "unknown" → status: "validated"
//    - confidence >= 0.6 AND category == "unknown" → status: "needs_review"
//    - confidence < 0.6 → status: "needs_review", do NOT apply to attribution
// 6. If validated: call updateSourceAttribution(ward_id, category, weight)
// 7. Save to MongoDB
// 8. Return: { report_id, status, classification, message }
```

**`classifyImage(imageUrl)` — Vision LLM Classifier**
```javascript
const prompt = `
You are an environmental monitoring AI. Analyze this image and classify the primary pollution source visible.

Return ONLY a valid JSON object with this exact structure:
{
  "category": "garbage_burning" | "construction_dust" | "vehicle_smoke" | "industrial_emission" | "unknown",
  "confidence": 0.0 to 1.0,
  "severity": "low" | "medium" | "high",
  "description": "One sentence describing what you see"
}

Rules:
- If no clear pollution source is visible, use "unknown" with confidence < 0.4
- confidence reflects how certain you are of the category, not severity
- Be conservative: if image is blurry or ambiguous, lower confidence
- Do not include any text outside the JSON object
`;
// Send image as base64 to Vision API
// Parse response JSON
// Return structured classification object
```

**`updateSourceAttribution(wardId, category, weight)` — Attribution Integration**
```javascript
const CATEGORY_MAP = {
  "garbage_burning": "burning_contribution",
  "construction_dust": "construction_contribution",
  "vehicle_smoke": "vehicular_contribution",
  "industrial_emission": "industrial_contribution"
};
// In Redis: INCRBYFLOAT source_attr:{ward_id}:{category}_reports {weight}
// Counters accumulate over a 6-hour window with TTL decay
// Source Attribution calculation reads these and applies a crowdsourced_boost multiplier
```

**`GET /api/reports/ward/:wardId`**
```javascript
// Returns last 24h validated reports for a ward
// { reports: [...], summary: { total, by_category: {...} } }
```

**`POST /api/reports/:id/moderate`** — Admin only
```javascript
// Body: { action: "validate" | "reject", reason? }
// Updates status, triggers or removes attribution impact
// Check JWT role: "admin" before processing
```

### Frontend Implementation

**Citizen Report Widget (`/client/src/components/ReportWidget/`):**

Submission flow (3 steps):
1. **Capture:** Camera button (mobile) OR file upload (desktop). Show preview immediately.
2. **Locate:** Map pin on ward. Auto-detect from geolocation if permission granted. Manual ward dropdown fallback.
3. **Submit:** Optional description field. "Submit Report" button.

Loading state: "🔍 Analyzing your photo with AI..." (2-4 seconds)

Success state:
- Validated: "✅ Report confirmed! Garbage burning detected (82% confidence). Added to {ward_name}'s pollution data."
- Needs review: "📋 Your report has been submitted for review by our team."

**Gamification layer:**
- Store reporter_id UUID in localStorage (no signup needed)
- Badge system: 1 report → "Observer", 5 → "Scout", 20 → "Guardian"
- Ward leaderboard: "Top reporters in {ward_name} this week"

**Admin Report Map Overlay:**
- Toggle "Report Layer" on ward map
- Color-coded pins by category: 🔴 Burning | 🟠 Construction | 🟡 Vehicles | ⚫ Industrial
- Clicking a pin: photo, classification, confidence, "Validate / Reject" buttons (admin only)
- Summary card: "47 reports today | 38 validated | Top: Construction dust"

---

## CROSS-FEATURE INTEGRATION NOTES

### Data Flow
```
Traffic API (Feature 2)
    ↓
Source Attribution Engine  ←── Crowdsourced Reports (Feature 4)
    ↓
AQI Forecast Model
    ↓
What-If Simulation (Feature 1)  +  Push Alerts (Feature 3)
```

### Shared Redis Key Conventions
```
traffic:{ward_id}                    → Live traffic data (TTL: 1800s)
forecast:{ward_id}:{horizon_hours}   → AQI forecast (TTL: 3600s)
source_attr:{ward_id}                → Attribution breakdown (TTL: 900s)
source_attr:{ward_id}:*_reports      → Crowdsourced counters (TTL: 21600s)
alert:last_sent:{phone}:{ward_id}    → Spam prevention (TTL: 14400s)
simulation:cache:{hash}              → Simulation result cache (TTL: 300s)
```

### API Gateway (add to Express main router)
```javascript
app.use('/api/simulation', require('./routes/simulation'));
app.use('/api/traffic',    require('./routes/traffic'));
app.use('/api/alerts',     require('./routes/alerts'));
app.use('/api/reports',    require('./routes/reports'));
```

### Error Handling Standard (apply to all 4 features)
- All routes return `{ success: false, error: { code, message } }` on failure
- Never expose stack traces to client
- All external API calls (TomTom, Gupshup, Gemini) must have try-catch with graceful degradation
- Log external API failures to MongoDB `service_error_logs`

---

## HACKATHON DEMO SCRIPT HINTS

**Feature 1 (Simulation):** Current AQI → move sliders → show AQI drop → "This is what would happen if the city halted construction in this zone."

**Feature 2 (Traffic):** Show traffic-colored ward map → "Live congestion is directly changing the vehicular attribution percentage — in real time."

**Feature 3 (Alerts):** Subscribe with a real phone → trigger test alert from admin panel → receive WhatsApp live during the demo.

**Feature 4 (Crowdsourcing):** Upload photo of construction dust or burning → AI classifies in real time → category counter ticks up on attribution panel.

---

## IMPLEMENTATION PRIORITY ORDER

Build in this sequence — you get a working demo at any stopping point:

1. **Feature 3** (Push Alerts) — no ML dependency, testable with real phone in 4-6 hours
2. **Feature 2** (Traffic API) — visual map impact, 4-6 hours
3. **Feature 4** (Crowdsourced Reports) — works without gamification, 8-10 hours
4. **Feature 1** (Simulation) — do last, most complex, most impressive if done right

Do not start Feature 1 until Features 2, 3, 4 are stable.
