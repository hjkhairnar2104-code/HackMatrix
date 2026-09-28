import asyncio
import json
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from services.state_manager import state_manager
from services.evaluation_service import get_false_alert_evaluation
from services.routing_engine import calculate_rescue_route
from services.ai_ground_report import set_gemini_api_key, get_gemini_api_key

app = FastAPI(
    title="ResQGrid API",
    description="AI-assisted local flood warning, risk analysis and response coordination platform",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connection Manager for Real-Time Live Push
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        try:
            # Send initial state immediately upon connection
            await websocket.send_json({
                "type": "INITIAL_STATE",
                "data": state_manager.get_full_state()
            })
        except Exception:
            self.disconnect(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# Background weather poller (fetches Open-Meteo every 35 seconds and broadcasts)
async def weather_poller_task():
    while True:
        try:
            await asyncio.sleep(35)
            # Re-evaluate live conditions
            state = state_manager.get_full_state()
            await manager.broadcast({
                "type": "WEATHER_TICK",
                "weather": state["weather"],
                "data": state
            })
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Poller Error]: {e}")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(weather_poller_task())

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive & receive client triggers if any
            data = await websocket.receive_text()
            # If client sends ping or action
            await websocket.send_json({"type": "PONG", "timestamp": str(asyncio.get_event_loop().time())})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

class GroundReportRequest(BaseModel):
    description: str
    location: Optional[str] = "Village A (Wakad Khurd)"
    severity: Optional[str] = "HIGH"
    reporterType: Optional[str] = "CITIZEN"

class RainfallSimulationRequest(BaseModel):
    incrementMm: Optional[float] = 55.0

class WaterLevelSimulationRequest(BaseModel):
    incrementM: Optional[float] = 0.7

class RoadBlockageRequest(BaseModel):
    roadId: str = "R12"
    status: Optional[str] = None

class ScenarioRouteRequest(BaseModel):
    scenario: int  # 1, 2, or 3
    settlementId: Optional[str] = "S1"

class ApiKeyConfigRequest(BaseModel):
    geminiApiKey: str

@app.get("/")
def root():
    return {
        "platform": "ResQGrid",
        "tagline": "From scattered flood signals to prioritized rescue decisions.",
        "status": "ONLINE",
        "district": "Pune District (Mula-Pawana-Mutha Basin)",
        "realTimeWebSocket": "/ws/live"
    }

@app.get("/api/state")
def get_system_state():
    return state_manager.get_full_state()

@app.get("/api/weather/live")
def get_live_weather():
    state = state_manager.get_full_state()
    return state["weather"]

@app.get("/api/settlements")
def get_settlements():
    return state_manager.settlements

@app.get("/api/roads")
def get_roads():
    return state_manager.roads

@app.get("/api/resources")
def get_resources():
    return state_manager.resources

@app.get("/api/alerts")
def get_alerts():
    return state_manager.alerts

@app.get("/api/evaluation")
def get_evaluation():
    return get_false_alert_evaluation()

@app.get("/api/config/status")
def get_config_status():
    has_key = bool(get_gemini_api_key())
    return {
        "geminiConfigured": has_key,
        "aiProvider": "Gemini 1.5 Flash (Live)" if has_key else "Local Deterministic NLP Parser (Active Fallback)",
        "weatherProvider": "Open-Meteo API (Live Automated Poller)",
        "routingProvider": "NetworkX + OSRM Local District Graph",
        "webSocketClients": len(manager.active_connections)
    }

@app.post("/api/config/gemini-key")
async def update_gemini_key(req: ApiKeyConfigRequest):
    set_gemini_api_key(req.geminiApiKey)
    return {
        "success": True,
        "message": "Gemini API key configured successfully.",
        "aiProvider": "Gemini 1.5 Flash (Live)"
    }

@app.post("/api/reports")
async def submit_ground_report(req: GroundReportRequest):
    new_report = state_manager.submit_ground_report(
        description=req.description,
        location=req.location or "Village A (Wakad)",
        severity=req.severity or "HIGH",
        reporter_type=req.reporterType or "CITIZEN"
    )
    full_state = state_manager.get_full_state()
    # Real-time WebSocket broadcast
    await manager.broadcast({
        "type": "REPORT_CREATED",
        "report": new_report,
        "data": full_state
    })
    return {
        "success": True,
        "report": new_report,
        "updatedState": full_state
    }

@app.post("/api/simulate/rainfall")
async def simulate_rainfall(req: RainfallSimulationRequest):
    state_manager.simulate_heavy_rainfall(req.incrementMm or 55.0)
    full_state = state_manager.get_full_state()
    await manager.broadcast({
        "type": "HAZARD_UPDATE",
        "event": "RAINFALL_SURGE",
        "data": full_state
    })
    return {
        "success": True,
        "message": f"Rainfall increased by {req.incrementMm} mm across district.",
        "updatedState": full_state
    }

@app.post("/api/simulate/waterlevel")
async def simulate_waterlevel(req: WaterLevelSimulationRequest):
    state_manager.simulate_water_level(req.incrementM or 0.7)
    full_state = state_manager.get_full_state()
    await manager.broadcast({
        "type": "HAZARD_UPDATE",
        "event": "WATER_LEVEL_SURGE",
        "data": full_state
    })
    return {
        "success": True,
        "message": f"River gauge water level increased by {req.incrementM} m.",
        "updatedState": full_state
    }

@app.post("/api/simulate/road-blockage")
async def simulate_road_blockage(req: RoadBlockageRequest):
    state_manager.simulate_road_blockage(req.roadId, req.status)
    full_state = state_manager.get_full_state()
    await manager.broadcast({
        "type": "ROAD_STATUS_CHANGED",
        "roadId": req.roadId,
        "data": full_state
    })
    return {
        "success": True,
        "message": f"Road {req.roadId} blockage toggled.",
        "updatedState": full_state
    }

@app.post("/api/simulate/step/{step_id}")
async def trigger_step(step_id: int):
    result = state_manager.trigger_hackathon_demo_step(step_id)
    await manager.broadcast({
        "type": "HACKATHON_STEP_TRIGGERED",
        "step": step_id,
        "title": result["title"],
        "data": result["state"]
    })
    return result

@app.post("/api/simulate/replay")
async def trigger_replay():
    state_manager.replay_historical_event()
    full_state = state_manager.get_full_state()
    await manager.broadcast({
        "type": "REPLAY_STARTED",
        "data": full_state
    })
    return {
        "success": True,
        "message": "Historical Replay Mode loaded (15 August 2026 Monsoon Surge)",
        "updatedState": full_state
    }

@app.post("/api/simulate/reset")
async def reset_system():
    state_manager.reset_to_baseline()
    full_state = state_manager.get_full_state()
    await manager.broadcast({
        "type": "SYSTEM_RESET",
        "data": full_state
    })
    return {
        "success": True,
        "message": "System reset to Step 1 baseline situation.",
        "updatedState": full_state
    }

@app.post("/api/simulate/real-world-live")
async def set_real_world_live():
    state_manager.set_real_world_live_mode()
    full_state = state_manager.get_full_state()
    await manager.broadcast({
        "type": "REAL_WORLD_LIVE_SYNC",
        "data": full_state
    })
    return {
        "success": True,
        "message": "System synced strictly to actual real-time outside weather (0mm / Normal).",
        "updatedState": full_state
    }

@app.post("/api/routes/validate")
def validate_route_scenario(req: ScenarioRouteRequest):
    res_boat = next((r for r in state_manager.resources if r["id"] == "BOAT-02"), state_manager.resources[0])
    village_a = next((s for s in state_manager.settlements if s["id"] == req.settlementId), state_manager.settlements[0])
    route_res = calculate_rescue_route(res_boat, village_a, state_manager.roads, force_scenario=req.scenario)
    return route_res

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
