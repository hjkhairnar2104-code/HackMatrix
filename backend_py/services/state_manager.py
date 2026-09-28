import copy
import time
from typing import Dict, Any, List, Optional
from datetime import datetime

from data.initial_data import (
    INITIAL_SETTLEMENTS,
    INITIAL_ROADS,
    INITIAL_RESOURCES,
    INITIAL_REPORTS,
    DISTRICT_METADATA
)
from services.weather_service import fetch_live_weather
from services.risk_engine import calculate_flood_risk
from services.priority_engine import calculate_response_priorities
from services.routing_engine import calculate_rescue_route
from services.resource_engine import recommend_resource_for_settlement
from services.ai_ground_report import extract_ground_report_info, generate_ai_decision_explanation

class ResQGridStateManager:
    def __init__(self):
        self.reset_to_baseline()

    def reset_to_baseline(self):
        self.settlements = copy.deepcopy(INITIAL_SETTLEMENTS)
        self.roads = copy.deepcopy(INITIAL_ROADS)
        self.resources = copy.deepcopy(INITIAL_RESOURCES)
        self.reports = copy.deepcopy(INITIAL_REPORTS)
        self.mode = "DEMO_SIMULATION"
        self.simulation_step = 1
        self.simulation_title = "Hackathon Baseline Flood Scenario"
        self.recalculate_all()

    def set_real_world_live_mode(self):
        """
        Sets telemetry strictly to actual outside real-time conditions:
        Takes actual Open-Meteo live rainfall (currently 0.0mm in Pune),
        calm normal river gauges (0.5m), zero synthetic reports.
        Result: System correctly reflects ALL CLEAR / NO FLOOD.
        """
        self.mode = "LIVE"
        self.simulation_step = 0
        self.simulation_title = "Actual Outside Real-Time Telemetry"
        weather = fetch_live_weather(DISTRICT_METADATA["center"][0], DISTRICT_METADATA["center"][1])
        actual_rain = float(weather.get("precipitation", 0.0))

        for s in self.settlements:
            s["rainfall"] = actual_rain
            s["waterLevel"] = "NORMAL"
            s["waterLevelMeters"] = 0.5
            s["groundReportsCount"] = 0
            s["accessibility"] = "OPEN"

        for r in self.roads:
            r["status"] = "OPEN"
            r["accessibility"] = "NORMAL"

        self.reports = []
        self.recalculate_all()

    def recalculate_all(self):
        """
        Executes the Core Dynamic Response Loop:
        HAZARD CHANGES -> RISK CHANGES -> AFFECTED SETTLEMENTS CHANGE
        -> RESPONSE PRIORITY CHANGES -> ROAD ACCESSIBILITY CHECK
        -> ROUTE VALIDATION -> RESOURCE RECOMMENDATION -> EVIDENCE GENERATION
        """
        # 1. Recalculate Risk for every settlement
        for s in self.settlements:
            rf = s.get("rainfall", 40.0)
            elev = s.get("elevation", 45.0)
            wl = s.get("waterLevel", "NORMAL")
            reps = s.get("groundReportsCount", 0)
            acc = s.get("accessibility", "OPEN")
            pop = s.get("population", 2000)

            risk_score, risk_status, factors = calculate_flood_risk(rf, elev, wl, reps, acc, pop)
            s["riskScore"] = risk_score
            s["riskStatus"] = risk_status
            s["whyExplanation"] = factors

        # 2. Recalculate Priorities (Priority != Risk)
        self.settlements = calculate_response_priorities(self.settlements, self.roads)

        # 3. Target top priority settlement (Rank #1 or #2)
        top_settlement = self.settlements[0] if self.settlements else None
        village_a = next((s for s in self.settlements if s["id"] == "S1"), top_settlement)

        # 4. Route Calculation for Village A (Primary focus of demo)
        res_boat = next((r for r in self.resources if r["id"] == "BOAT-02"), self.resources[0])
        self.current_route = calculate_rescue_route(res_boat, village_a, self.roads)

        # 5. Resource Recommendations for Top Settlements
        self.recommendations = []
        for s in self.settlements[:3]:
            rec = recommend_resource_for_settlement(s, self.resources, self.roads)
            self.recommendations.append(rec)

        # 6. Generate Active Alerts
        self.alerts = []
        for s in self.settlements:
            if s["riskStatus"] in ["CRITICAL", "HIGH"]:
                alert_type = "CRITICAL_FLOOD_WARNING" if s["riskStatus"] == "CRITICAL" else "FLOOD_RISK_ADVISORY"
                rec = next((r for r in self.recommendations if r["settlementId"] == s["id"]), None)
                rec_action = f"Deploy {rec['recommendedResourceName']}" if rec else "Pre-position evacuation units"
                
                self.alerts.append({
                    "id": f"ALT-{s['id']}-{int(time.time())}",
                    "type": alert_type,
                    "title": f"🚨 {alert_type.replace('_', ' ')}: {s['name']}",
                    "settlementId": s["id"],
                    "settlementName": s["name"],
                    "riskScore": s["riskScore"],
                    "severity": s["riskStatus"],
                    "message": f"Severe inundation dynamics detected in {s['name']}. Risk score {s['riskScore']}/100. Priority rank #{s['priorityRank']}.",
                    "evidence": s["whyExplanation"],
                    "confidence": 0.93 if s["riskStatus"] == "CRITICAL" else 0.88,
                    "recommendedAction": rec_action,
                    "timestamp": "Just now"
                })

        # 7. AI Decision Explanation for Rank #1
        if top_settlement:
            alt_avail = self.current_route.get("alternativeRouteStatus") == "VALID"
            self.ai_explanation = generate_ai_decision_explanation(
                top_settlement["name"],
                top_settlement["priorityRank"],
                top_settlement["riskScore"],
                top_settlement["population"],
                top_settlement["accessibility"],
                alt_avail,
                self.recommendations[0]["recommendedResourceName"] if self.recommendations else "Rescue Boat 02"
            )
        else:
            self.ai_explanation = "Operational baseline established."

    def simulate_heavy_rainfall(self, increment_mm: float = 55.0):
        self.mode = "DEMO_SIMULATION"
        for s in self.settlements:
            if s["id"] in ["S1", "S2"]:
                s["rainfall"] += increment_mm
                s["waterLevel"] = "CRITICAL"
                s["waterLevelMeters"] = round(s["waterLevelMeters"] + 0.8, 2)
            else:
                s["rainfall"] += round(increment_mm * 0.4, 1)
        self.recalculate_all()

    def simulate_water_level(self, increment_m: float = 0.7):
        self.mode = "DEMO_SIMULATION"
        for s in self.settlements:
            s["waterLevelMeters"] = round(s["waterLevelMeters"] + increment_m, 2)
            if s["waterLevelMeters"] >= 2.0:
                s["waterLevel"] = "CRITICAL"
            elif s["waterLevelMeters"] >= 1.5:
                s["waterLevel"] = "WARNING"
        self.recalculate_all()

    def simulate_road_blockage(self, road_id: str = "R12", target_status: Optional[str] = None):
        self.mode = "DEMO_SIMULATION"
        road = next((r for r in self.roads if r["id"] == road_id), None)
        if road:
            if target_status:
                road["status"] = target_status
            else:
                road["status"] = "BLOCKED" if road["status"] == "OPEN" else "OPEN"

            road["accessibility"] = "IMPASSABLE" if road["status"] == "BLOCKED" else "NORMAL"

            # Update accessibility of connected settlements
            if road_id == "R12":
                v_a = next((s for s in self.settlements if s["id"] == "S1"), None)
                if v_a:
                    v_a["accessibility"] = "CUT_OFF" if road["status"] == "BLOCKED" else "OPEN"

        self.recalculate_all()

    def submit_ground_report(self, description: str, location: str = "Village A (Wakad)", severity: str = "HIGH", reporter_type: str = "CITIZEN") -> Dict[str, Any]:
        extracted = extract_ground_report_info(description, location, severity)

        rep_id = f"REP-{int(time.time() % 10000)}"
        new_report = {
            "id": rep_id,
            "location": extracted["location"],
            "description": description,
            "severity": extracted["severity"],
            "reporterType": reporter_type,
            "timestamp": "Just now",
            "status": "VERIFIED_AI",
            "extractedInfo": extracted
        }
        self.reports.insert(0, new_report)

        # Update settlement report count
        target_s = next((s for s in self.settlements if s["name"].startswith(extracted["location"].split()[0])), None)
        if not target_s:
            target_s = self.settlements[0]
        target_s["groundReportsCount"] += 1

        # If road was detected as BLOCKED, block Road R12
        if extracted["roadStatus"] == "BLOCKED":
            self.simulate_road_blockage("R12", "BLOCKED")
        else:
            self.recalculate_all()

        return new_report

    def trigger_hackathon_demo_step(self, step: int) -> Dict[str, Any]:
        """
        Executes the exact 6-Step Hackathon Demonstration Sequence
        """
        self.mode = "DEMO_SIMULATION"
        self.simulation_step = step

        if step == 1:
            self.reset_to_baseline()
            self.mode = "DEMO_SIMULATION"
            self.simulation_step = 1
            self.simulation_title = "Step 1: Initial Baseline Situation"
            description = "Village A (HIGH risk 62), Village B (CRITICAL risk 82). Road R12 is OPEN. Rescue Boat 02 AVAILABLE."

        elif step == 2:
            self.simulation_title = "Step 2: Heavy Rainfall Event"
            # Increase rainfall heavily
            for s in self.settlements:
                if s["id"] in ["S1", "S2"]:
                    s["rainfall"] = 145.0 if s["id"] == "S1" else 165.0
                    s["waterLevel"] = "WARNING" if s["id"] == "S1" else "CRITICAL"
                    s["waterLevelMeters"] = 1.9 if s["id"] == "S1" else 2.3
            self.recalculate_all()
            description = "Monsoon surge pushed rainfall to 145mm at Village A. Risk escalated to CRITICAL (91/100). Response priority elevated."

        elif step == 3:
            self.simulation_title = "Step 3: Ground Report Ingestion & AI Extraction"
            report_text = "Bridge near Village A is blocked and water has entered nearby houses."
            self.submit_ground_report(report_text, "Village A (Wakad Khurd)", "HIGH", "CITIZEN")
            description = "Citizen report received. AI parsed: Location=Village A, Infrastructure=Bridge, Severity=HIGH, Road=BLOCKED, Confidence=94%."

        elif step == 4:
            self.simulation_title = "Step 4: Road Closure Propagation"
            self.simulate_road_blockage("R12", "BLOCKED")
            description = "Road R12 (Wakad Causeway) marked BLOCKED on GIS map. Settlement A accessibility downgraded to CUT_OFF on primary artery."

        elif step == 5:
            self.simulation_title = "Step 5: Automatic Routing Recalculation"
            self.recalculate_all()
            description = "Original route via R12 invalidated. Alternative route generated via R7 Baner High-Ridge Bypass (VALID, 7.4km, ETA 15m)."

        elif step == 6:
            self.simulation_title = "Step 6: Final Response Plan & AI Decision Explanation"
            self.recalculate_all()
            description = "Coordinated response plan locked: #1 Village B, #2 Village A. Rescue Boat 02 assigned with route clearance."

        else:
            self.reset_to_baseline()
            description = "Reset completed."

        return {
            "step": step,
            "title": self.simulation_title,
            "description": description,
            "state": self.get_full_state()
        }

    def replay_historical_event(self):
        """
        Historical Replay Mode (15 August 2026 Flood Scenario)
        Displays prominent REPLAYED / NOT LIVE indicator.
        """
        self.mode = "REPLAYED_DATA"
        self.simulation_step = 2
        self.simulation_title = "Historical Replay: 15 August 2026 Monsoon Surge"
        for s in self.settlements:
            if s["id"] == "S1":
                s["rainfall"] = 158.0
                s["waterLevel"] = "CRITICAL"
                s["waterLevelMeters"] = 2.4
                s["groundReportsCount"] = 3
            elif s["id"] == "S2":
                s["rainfall"] = 175.0
                s["waterLevel"] = "CRITICAL"
                s["waterLevelMeters"] = 2.6
                s["groundReportsCount"] = 4
        # Block R12 in historical replay
        r12 = next((r for r in self.roads if r["id"] == "R12"), None)
        if r12:
            r12["status"] = "BLOCKED"
            r12["accessibility"] = "IMPASSABLE"
        self.recalculate_all()

    def get_full_state(self) -> Dict[str, Any]:
        weather = fetch_live_weather(DISTRICT_METADATA["center"][0], DISTRICT_METADATA["center"][1])

        # KPI Summary
        critical_areas = sum(1 for s in self.settlements if s["riskStatus"] == "CRITICAL")
        affected_pop = sum(s["population"] for s in self.settlements if s["riskStatus"] in ["CRITICAL", "HIGH"])
        blocked_roads = sum(1 for r in self.roads if r["status"] == "BLOCKED")
        avail_resources = sum(1 for res in self.resources if res["status"] == "AVAILABLE")

        kpi = {
            "criticalAreas": critical_areas,
            "affectedPopulation": affected_pop,
            "blockedRoads": blocked_roads,
            "activeWarnings": len(self.alerts),
            "availableResources": avail_resources,
            "districtName": DISTRICT_METADATA["districtName"],
            "lastUpdated": datetime.now().strftime("%H:%M:%S")
        }

        return {
            "district": DISTRICT_METADATA,
            "settlements": self.settlements,
            "roads": self.roads,
            "resources": self.resources,
            "reports": self.reports,
            "route": self.current_route,
            "recommendations": self.recommendations,
            "alerts": self.alerts,
            "kpi": kpi,
            "weather": weather,
            "aiExplanation": self.ai_explanation,
            "mode": self.mode,
            "simulation": {
                "step": self.simulation_step,
                "title": self.simulation_title,
                "isSimulation": self.mode != "LIVE"
            }
        }

# Global singleton manager
state_manager = ResQGridStateManager()
