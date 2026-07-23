# AGENTS.md — AirSense Build Guide

> This file is the single reference for **how to build this project correctly**, **what mistakes to avoid**, and **what we're actually being judged on**. Read this before writing code, and re-read the relevant section before each major decision. If you're an AI coding assistant (Claude Code, Cursor, etc.) working on this repo, treat this file as your primary context — the decisions here are final unless a teammate explicitly changes them in the shared docs.

---

## 1. What We're Building (one paragraph)

AirSense is an AI platform for Delhi that (1) predicts AQI 24-72hrs ahead at zone level, (2) attributes pollution spikes to a source (traffic/industrial/construction), (3) ranks zones for enforcement action, (4) compares cities historically, and (5) gives citizens personalized health advice via chat — built across a Python ML microservice, a Node.js backend, and a React frontend.

Full spec: `PRD.md`. Setup steps: `00-shared-foundation.md`. Individual work: `ml-tasks.md`, `backend-tasks.md`, `frontend-tasks.md`.

---

## 2. How to Build — Sequencing Rules

**Build in this order, no exceptions:**

1. Shared foundation (repo, API contract, mock data, DB schema, zone list) — **before any feature code**
2. Mock-data-driven backend + frontend (parallel) — **before** real ML model is ready
3. Real ML model — swapped into backend once both contract and model are validated independently
4. Integration pass — only after all 3 pieces work standalone
5. Polish + demo prep — last 2-3 days only, no new features

**Why this order matters:** the single biggest way hackathon teams fail is building features in isolation and discovering on the last day that nothing fits together. The API contract (locked in `00-shared-foundation.md`) exists specifically to prevent this. **Nobody changes a response shape without telling the other two people first.**

---

## 3. Pitfalls — What Will Go Wrong If You're Not Careful

### Pitfall 1: Trying to build all 5 features at full depth
You will run out of time. The two features that actually carry the judging weight are **Forecasting** and **Source Attribution** — these are where "Technical Excellence" (20%) gets evaluated with a real metric (RMSE vs baseline). Enforcement, Multi-City, and Advisory are important for "Business Impact" and "UX" but can be lighter-weight without hurting your score as much.
**Fix:** Build Forecasting + Attribution to genuine depth. Keep Enforcement rule-based (not a separate model). Keep Multi-City to historical-comparison-only for non-primary cities. Keep Advisory to web-chat in 2 languages, not multi-channel.

### Pitfall 2: Forecasting model that doesn't beat the baseline
If your model's RMSE is worse than (or barely better than) the persistence baseline ("tomorrow = today"), this is an immediate red flag to judges — the problem statement explicitly calls this metric out. A model that "looks fancy" but loses to a naive baseline is worse than presenting no model at all.
**Fix:** Always compute and display both numbers. If your fancy model underperforms, fall back to the simpler one that wins. Simple-but-correct beats complex-but-wrong.

### Pitfall 3: Presenting mock/sample data as if it's live
Judges will ask "is this real data?" — if caught overstating, it damages credibility across the entire demo, not just that one feature.
**Fix:** Every screen/slide that uses mock data (construction permits, emission registry, some city comparisons) should say so plainly. There's an "honesty disclaimer" slide planned in the deck for exactly this reason — use it, don't skip it.

### Pitfall 4: Building UI before the API contract is locked
If frontend starts coding against assumptions instead of the agreed contract, you'll spend Week 4 rewriting components instead of polishing them.
**Fix:** Nobody writes UI/API code before `00-shared-foundation.md` Phase/Step 2 (API contract) is fully signed off by all three people.

### Pitfall 5: One person blocked waiting on another
Classic failure: frontend waiting on backend waiting on ML's "real" model, and nobody making progress in Week 1.
**Fix:** The mock data file (`ml-service/data/mock_outputs.json`) exists specifically to prevent this. It must exist by Day 2. Backend and frontend build against it immediately, swap to real data later — interface doesn't change, so the swap is painless.

### Pitfall 6: No fallback if live APIs fail during the actual demo
Live CPCB/weather API calls during judging are a single point of failure — slow wifi, API downtime, rate limits can all kill a demo mid-presentation.
**Fix:** Build a "demo mode" / frozen snapshot of the exact data you'll show judges. Test the full demo flow with internet off before the actual presentation.

### Pitfall 7: Spatial interpolation presented as if it's true 1km-resolution sensing
The problem statement mentions "1km grid resolution" — we are NOT building real 1km-resolution sensing (would need way more stations/satellite processing than is feasible). We're interpolating between existing CAAQMS stations.
**Fix:** Be explicit about this in `MODEL_NOTES.md` and in the deck. Judges respect technical honesty far more than oversold claims that fall apart under a follow-up question.

### Pitfall 8: Inconsistent zone lists across ML/Backend/Frontend
If each person independently picks their own "Delhi zones," nothing will join correctly across the system.
**Fix:** One canonical `zones_metadata.csv` file, created once during shared foundation, used by everyone. Never create a second version.

### Pitfall 9: Skipping the demo rehearsal
A 5-minute live demo that's never been rehearsed end-to-end is a common way to lose points on stage to bugs that would've been caught in a dry run.
**Fix:** Rehearse the full click-through flow at least twice before judging day, including the failure-mode fallback (demo mode).

### Pitfall 10: Overcomplicating the ML model when time is short
Jumping straight to LSTM/deep learning when a SARIMA/Prophet baseline would already beat persistence and is far faster to build, validate, and explain to judges.
**Fix:** Always build the simple baseline first. Only upgrade to XGBoost/LSTM if there's spare time in Week 2-3, and only keep it if it actually performs better — don't keep a more complex model just because it's more complex.

---

## 4. Judging Criteria — What Actually Gets Scored

| Criteria | Weight | What judges are checking | What we should show |
|---|---|---|---|
| Innovation | 25% | Is this more than "another AQI dashboard"? | Combine attribution + forecasting + enforcement into one explainable, end-to-end decision pipeline — not just data visualization |
| Business Impact | 25% | Can a real city official actually use this output? | Enforcement priority list with reasoning a PCB officer could act on same day |
| Technical Excellence | 20% | Is the model genuinely good, and do we understand its limits? | RMSE vs persistence baseline comparison chart; explainable attribution scoring (not a black box) |
| Scalability | 15% | Does this work beyond just Delhi? | City-agnostic backend architecture; demonstrated (even lightly) with a 2nd/3rd city |
| User Experience | 15% | Is it usable by both officials and citizens? | Clean map UI for officials; simple plain-language chat for citizens, multilingual |

**Specific evaluation focus lines from the problem statement (do not ignore these):**
- Source attribution accuracy vs ground-truth emission inventories → have a sanity-check comparison ready, even informal
- AQI forecast accuracy at hyperlocal resolution (RMSE vs persistence baseline) → must have this number, always
- Enforcement recommendation quality rated by domain experts → make the "reason" text genuinely useful, not generic
- Citizen advisory relevance and language coverage → test actual Hindi output quality, don't assume translation works without checking
- Demonstrated reduction in response time from signal to intervention → have a before/after story ready to tell verbally even if not literally measured

---

## 5. Decisions Already Locked (don't re-debate these mid-build)

- **City:** Delhi only for live/deep build. 1-2 other cities for historical comparison only.
- **Scope:** All 5 features built, but Forecasting + Attribution get the most depth; Enforcement/Multi-City/Advisory are intentionally lighter.
- **Stack:** Node.js + Express (backend), Python + FastAPI (ML service), React (frontend), MongoDB, optional Redis.
- **Languages for advisory:** Hindi + English minimum. More languages = stretch goal only, not required.
- **WhatsApp/IVR:** Out of scope. Web chat widget only.
- **Forecasting model:** Start with SARIMA/Prophet baseline. Upgrade to XGBoost only if it measurably beats the baseline and there's time.

If someone wants to change one of these, it needs explicit team agreement — not a silent unilateral change mid-build, since it likely breaks another person's in-progress work.

---

## 6. Quick Reference — Where Things Live

| Thing | File/Folder |
|---|---|
| Full product spec | `PRD.md` |
| Architecture + setup instructions | `README.md` |
| Pre-work before parallel coding starts | `00-shared-foundation.md` |
| Solo setup-lead walkthrough (if one person does shared foundation) | `foundation-lead-tasks.md` |
| ML person's tasks | `ml-tasks.md` |
| Backend person's tasks | `backend-tasks.md` |
| Frontend person's tasks | `frontend-tasks.md` |
| API contract | `00-shared-foundation.md` Step 2 (copy into shared doc) |
| Mock data for early development | `ml-service/data/mock_outputs.json` |
| Model limitations/honesty notes | `ml-service/MODEL_NOTES.md` (written in Week 4) |

---

## 7. Definition of "Demo Ready" (final bar before judging day)

- [ ] Forecast endpoint returns real model output with documented RMSE-vs-baseline comparison
- [ ] Attribution endpoint returns explainable, sane-looking scores for at least 3 test zones
- [ ] Enforcement list is sorted, has reasoning text, ties back to attribution output
- [ ] Multi-city view works for at least 2 cities (Delhi live, 1 other historical)
- [ ] Advisory chat responds correctly in Hindi and English
- [ ] Full demo flow rehearsed twice, works with internet off (demo mode)
- [ ] Deck includes an honest disclosure of what's real data vs mock/sample data
- [ ] Every team member can explain every part of the system, not just their own piece — judges may ask any of you any question
