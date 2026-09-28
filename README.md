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

### 1. Start the Backend (Python FastAPI)
```bash
cd backend_py
pip install fastapi uvicorn networkx requests pydantic
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend API: `http://127.0.0.1:8000`
* Swagger API Docs: `http://127.0.0.1:8000/docs`
* Real-time WebSocket: `ws://127.0.0.1:8000/ws/live`

### 2. Start the Frontend (React + Vite + Leaflet)
```bash
cd frontend
npm install
npm run dev
```
* Dashboard URL: `http://localhost:5173`

---

## 🗺️ Key Capabilities

1. **Physical Multi-Source Risk Engine**: Combines live Open-Meteo precipitation, terrain elevation, municipal river gauges, and verified citizen reports.
2. **Priority ≠ Risk**: Response priority factors in population exposure and road isolation, not just raw hazard depth.
3. **Route Invalidation & Alternative Bypass**: When a road (e.g. Wakad Causeway R12) is blocked, the primary route is invalidated and an alternative high-ridge corridor is discovered.
4. **Autonomous AI Entity Extraction**: Citizen reports are analyzed to extract location, severity, damaged infrastructure, and road impassability.
5. **Real-Time WebSocket Push**: Every event broadcasts across `ws://127.0.0.1:8000/ws/live`, updating map markers and routes with **zero browser refresh**.
6. **What-If Simulation Toolbar**: Includes an interactive 6-step hackathon demo stepper, live rainfall injection, river gauge elevation, road toggles, and 15-August historical flood replay.

---

## 📋 Hackathon Demo Sequence (2-Minute Walkthrough)

Click through the top **Hackathon Demo Stepper** in the UI:
1. **1. Baseline**: Normal conditions. Village A (HIGH), Village B (CRITICAL), Road R12 OPEN.
2. **2. Heavy Rain**: Rainfall surges to 145mm. Risk score updates to CRITICAL (91/100).
3. **3. Ground Report**: Citizen reports *"Bridge near Village A is blocked and water in houses"*. AI parses infrastructure and road blockage.
4. **4. Road Closure**: Road R12 marked BLOCKED. Settlement A access severed.
5. **5. Route Recalc**: Original route invalidated (`❌ INVALID`). Alternative route discovered via R7 High-Ridge Bypass (`✓ VALID`).
6. **6. Final Plan**: Coordinated response locks with Rescue Boat 02 recommendation and AI decision explanation.
