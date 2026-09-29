# ResQGrid — Local Flood Warning, Risk Analysis & Response Coordination Platform

> **HackMatrix 5.0 — Problem Statement: MISC-04**  
> *Tagline:* From scattered flood signals to prioritized rescue decisions.  
> *One-Line Description:* An AI-assisted flood-response decision-support platform that combines rainfall, terrain, settlement, ground-report, and road data to dynamically identify affected locations, prioritize rescue response, validate routes, recommend resources, and explain why each decision changes.

---

## ⚡ The Core Dynamic Response Loop

ResQGrid is **not a static dashboard**. It continuously connects physical flood signals to coordinated emergency response:

```text
MULTI-SOURCE HAZARD SIGNALS (Open-Meteo + River Gauges + Topography)
                            ↓
               EXPLAINABLE FLOOD RISK ENGINE (0–100)
                            ↓
               AFFECTED SETTLEMENT TOPOGRAPHY
                            ↓
             DYNAMIC RESPONSE PRIORITY (PRIORITY ≠ RISK)
                            ↓
               ROAD ACCESSIBILITY & BLOCKAGES
                            ↓
               RESCUE ROUTE VALIDATION (NetworkX)
              (Original Invalidation → Alternative Bypass)
                            ↓
               EMERGENCY RESOURCE RECOMMENDATION
                            ↓
             EXPLAINABLE AI REASONING + CONFIDENCE
```

---

## 🚀 Quick Start (Running Locally)

### 1. Backend (Python FastAPI)
```bash
cd backend_py
python -m venv .venv
.venv\Scriptsctivate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
* API: `http://127.0.0.1:8000` · Swagger: `http://127.0.0.1:8000/docs` · WebSocket: `ws://127.0.0.1:8000/ws/live`
* Optional: put `GEMINI_API_KEY=...` in `backend_py/.env`. Without it (or if the quota is exhausted) the local rule parser and templates are used automatically.

### 2. Frontend (React + Vite + Leaflet + Recharts)
```bash
cd frontend
npm install
npm run dev
```
* Dashboard: `http://localhost:5173`

---

## 🧱 How the pipeline is implemented

| Stage | Module | Notes |
|---|---|---|
| Data processing | `services/data_processing.py` | Loads `data/raw/*.csv/json`, cleans text/number fields, imputes missing values, enriches terrain from Open-Meteo DEM (cached), builds the road graph |
| Flood risk (0-100) | `services/risk_engine.py` | Weighted, explainable: rainfall, intensity, terrain, water level, reports, population, accessibility — per-factor points |
| Response priority | `services/priority_engine.py` | Risk 45 · population 15 · reports 15 · reachability 10 · resource coverage gap 15 (priority ≠ risk) |
| Road accessibility + routes | `services/routing_engine.py` | NetworkX shortest path on the district graph; blocked roads removed, at-risk penalised; original route invalidated → alternative → escalation. OSRM used as a street-level ETA cross-check |
| Resource recommendation | `services/resource_engine.py` | Suitability × ETA scoring, no double assignment, candidates shown |
| Evidence + confidence, alerts, change log | `services/state_manager.py` | Every event re-runs the full loop and records what changed |
| LLM (Gemini) | `services/ai_ground_report.py` | Only extracts report fields and rephrases facts; output validated, numbers not in the facts are rejected |
| Evaluation | `services/evaluation_service.py` | Runs 24 labelled simulated/replayed scenarios through the live risk engine |
| Replay | `data/replay_15aug2026.json` | 6 frames, 4 s apart, labelled REPLAYED / NOT LIVE |

**Data labelling:** rainfall (Open-Meteo) and terrain (Open-Meteo DEM) are real; population, gauges, roads, resources and reports are simulated prototype data.

---

## 📋 Demo sequence (2–3 minutes)

Use the **Demo scenario** buttons (each step is rebuilt from baseline, so any step can be clicked at any time):
1. **Baseline** — Village A HIGH, Village B CRITICAL, Village C MODERATE; R12 open; Rescue Boat 02 available.
2. **Heavy Rain** — +50 mm: risk rises, flood-prone roads turn AT RISK, priorities recalculate.
3. **Ground Report** — "Bridge near Village A is blocked…": AI extracts severity/road/infrastructure; citizen report marks R12 AT RISK pending verification.
4. **Road Closure** — R12 confirmed BLOCKED.
5. **Recalculate** — Boat 02's route to Village A: original INVALID → alternative via R7 VALID.
6. **Final Plan** — #1 Village B, #2 Village A; recommendations, confidence, and **Explain decision**.

Also try: block any road from the toolbar, the 3 route scenarios on *Resources & Routes*, "Mark deployed", and *Replay & Evaluation*.

---

## 🌐 Production Deployment Guide

ResQGrid is production-ready and can be deployed as a **single unified web service** (FastAPI serves both the API, real-time WebSocket, and the compiled React SPA) or as a decoupled system.

### Option 1: Render.com (Recommended — 1-Click Free Web Service)
1. Push your repository to GitHub.
2. Sign in to [Render.com](https://render.com) and click **New +** → **Web Service** (or use **Blueprint** with the included `render.yaml`).
3. Connect your `HackMatrix` GitHub repository.
4. Configure settings:
   - **Environment:** `Python 3`
   - **Build Command:** `./build.sh` (or `cd frontend && npm install && npm run build && cd ../backend_py && pip install -r requirements.txt`)
   - **Start Command:** `python -m uvicorn main:app --app-dir backend_py --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
5. (Optional) In **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Your Google AI Gemini key for real-time field report parsing)*
6. Click **Deploy Web Service**! Render will build the React frontend, install backend dependencies, and launch ResQGrid with live WebSocket support.

---

### Option 2: Docker Container (Any Cloud / VPS / Local)
Deploy anywhere Docker is installed with a single command:

```bash
# 1. Build the multi-stage production image:
docker build -t resqgrid:latest .

# 2. Run the unified container on port 8000:
docker run -d -p 8000:8000 --name resqgrid-app resqgrid:latest
```
Visit `http://localhost:8000` to access the full live application.

Or using Docker Compose:
```bash
docker compose up -d --build
```

---

### Option 3: Railway.app / Heroku (Procfile)
1. Connect your repository to [Railway.app](https://railway.app).
2. Railway detects the `Dockerfile` or `Procfile` automatically.
3. Set the environment variable `PORT` (Railway provides this automatically).
4. Launch!

---

### Option 4: Split Deployment (Frontend on Vercel + Backend on Render/Railway)
- **Backend (Render / Railway):**
  - Root directory: `backend_py`
  - Start command: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Frontend (Vercel):**
  - Root directory: `frontend`
  - Framework Preset: `Vite`
  - Set Environment Variables:
    - `VITE_API_URL`: `https://your-backend.onrender.com`
    - `VITE_WS_URL`: `wss://your-backend.onrender.com/ws/live`

