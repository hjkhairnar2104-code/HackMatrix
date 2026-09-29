"""
ResQGrid state + the core dynamic response loop.

Every event (rainfall, water level, road change, ground report, replay frame,
resource status) mutates inputs only, then `recalculate_all()` re-derives:

  road status → settlement accessibility → risk → priority → routes →
  resource recommendation → evidence + confidence → alerts → explanation

and a diff of what changed is logged so the UI can show WHY decisions moved.
"""
import copy
import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from services.data_processing import load_and_process, classify_water_level, DATA_DIR
from services.weather_service import fetch_live_weather
from services.risk_engine import calculate_flood_risk, risk_confidence
from services.priority_engine import calculate_priority, rank_settlements
from services.routing_engine import plan_route, route_feasibility
from services.resource_engine import recommend_resources
from services.ai_ground_report import extract_ground_report_info, explain_decision, match_settlement

DEMO_REPORT = "Bridge near Village A is blocked and water has entered nearby houses."
VERIFIED_REPORTERS = ("WARD_OFFICER", "FIRST_RESPONDER")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ResQGridStateManager:
    def __init__(self):
        self.instance_id = uuid.uuid4().hex[:8]
        self._dataset = load_and_process(fetch_terrain=True)
        with open(os.path.join(DATA_DIR, "replay_15aug2026.json"), "r", encoding="utf-8") as f:
            self.replay_script = json.load(f)
        self.reset_to_baseline()

    # ------------------------------------------------------------------ setup
    def reset_to_baseline(self, log_event: bool = True):
        data = copy.deepcopy(self._dataset)
        self.district = data["district"]
        self.nodes = data["nodes"]
        self.settlements = data["settlements"]
        self.roads = data["roads"]
        self.resources = data["resources"]
        self.reports = data["reports"]
        self.processing_log = data["processingLog"]
        self.mode = "DEMO_SIMULATION"
        self.simulation_step = 1
        self.simulation_title = "Step 1: Initial situation"
        self.simulation_description = ""
        self.replay = None
        self.event_log: List[Dict[str, Any]] = []
        self.last_change = None
        self._alert_first_seen: Dict[str, str] = {}
        self._report_seq = 200
        self.recalculate_all()
        self.simulation_description = self._situation_summary()
        if log_event:
            self._log("RESET", "Scenario reset to baseline", [])

    # ------------------------------------------------------------------ core loop
    def recalculate_all(self):
        # Monotonic version lets clients discard stale/out-of-order state snapshots
        self.version = getattr(self, "version", 0) + 1
        by_id = {s["id"]: s for s in self.settlements}

        # 1. Road accessibility: manual/report status wins, otherwise hazard-driven
        for r in self.roads:
            if r.get("manualStatus"):
                r["status"] = r["manualStatus"]
                r["statusReason"] = r.get("manualReason") or "Operator update"
            else:
                r["status"], r["statusReason"] = "OPEN", "Normal conditions"
                if r.get("floodProne"):
                    for sid in (r["source"], r["destination"]):
                        s = by_id.get(sid)
                        if s and (s["waterLevel"] == "CRITICAL" or s["rainfall"] >= 150):
                            r["status"] = "AT_RISK"
                            r["statusReason"] = f"Flood-prone road next to {s['name']} (water {s['waterLevel'].lower()}, {s['rainfall']:.0f} mm)"
                            break
            r["accessibility"] = {"OPEN": "NORMAL", "AT_RISK": "RESTRICTED", "BLOCKED": "IMPASSABLE"}[r["status"]]

        # 2. Settlement accessibility from the live road graph
        for s in self.settlements:
            feasibility, best = route_feasibility(s, self.resources, self.nodes, self.roads)
            incident = [r for r in self.roads if s["id"] in (r["source"], r["destination"])]
            degraded = [r["id"] for r in incident if r["status"] != "OPEN"]
            if feasibility == "NONE":
                s["accessibility"] = "CUT_OFF"
            elif feasibility == "ALTERNATIVE" or degraded:
                s["accessibility"] = "AT_RISK"
            else:
                s["accessibility"] = "OPEN"
            s["routeFeasibility"] = feasibility
            s["degradedRoads"] = degraded

        # 3. Flood risk (explainable weighted model)
        weather_live = False
        for s in self.settlements:
            reps = self._reports_for(s["id"])
            s["groundReportsCount"] = len(reps)
            s.update(calculate_flood_risk(s, reps))
            s["affected"] = s["riskStatus"] in ("HIGH", "CRITICAL")
            s["riskConfidence"] = risk_confidence(s, reps, weather_live)

        # 4. Dynamic response priority (priority != risk)
        for s in self.settlements:
            deployed = [r["name"] for r in self.resources if r["status"] == "DEPLOYED" and r.get("currentAssignment") == s["id"]]
            s.update(calculate_priority(s, self._reports_for(s["id"]), s["routeFeasibility"], deployed))
        self.settlements = rank_settlements(self.settlements)
        for s in self.settlements:
            # Kept for UI compatibility: evidence behind the risk score
            s["whyExplanation"] = s["evidence"]

        # 5-6. Routes + resource recommendation
        self.recommendations = recommend_resources(self.settlements, self.resources, self.nodes, self.roads)
        self.routes = [rec["route"] for rec in self.recommendations if rec.get("route")]
        changed = next((r for r in self.routes if r["originalRouteStatus"] == "INVALID"), None)
        self.current_route = changed or (self.routes[0] if self.routes else None)

        # 7. Evidence + confidence alerts
        self.alerts = self._build_alerts()

        # 8. Explanation for the #1 priority (deterministic template; Gemini on demand)
        top_rec = self.recommendations[0] if self.recommendations else None
        self.ai_explanation = explain_decision(self._facts_for(top_rec), use_llm=False)["text"] if top_rec else "No settlement currently requires response."

    def _reports_for(self, sid: str) -> List[Dict[str, Any]]:
        return [r for r in self.reports if r.get("settlementId") == sid]

    def _build_alerts(self) -> List[Dict[str, Any]]:
        alerts = []
        recs = {r["settlementId"]: r for r in self.recommendations}
        for s in self.settlements:
            if not s["affected"]:
                continue
            rec = recs.get(s["id"])
            evidence = list(s["evidence"])
            if s["accessibility"] != "OPEN" and not any("accessibility" in e.lower() or "cut off" in e.lower() for e in evidence):
                evidence.append(f"Road accessibility reduced ({', '.join(s['degradedRoads']) or 'no direct route'})")
            kind = "CRITICAL_FLOOD_WARNING" if s["riskStatus"] == "CRITICAL" else "HIGH_FLOOD_WARNING"
            alerts.append(self._alert(
                f"{kind}-{s['id']}", kind, f"{'CRITICAL' if kind.startswith('CRITICAL') else 'HIGH'} FLOOD WARNING — {s['name']}",
                s, s["riskStatus"],
                f"Flood risk {s['riskScore']}/100 · {s['population']:,} people exposed · Priority #{s['priorityRank']}",
                evidence, s["riskConfidence"],
                rec["recommendedAction"] if rec else "Monitor and pre-position resources",
            ))
        for rec in self.recommendations:
            route = rec.get("route") or {}
            s = next(x for x in self.settlements if x["id"] == rec["settlementId"])
            if rec["routeStatus"] == "ESCALATION_REQUIRED":
                alerts.append(self._alert(
                    f"ESCALATION-{s['id']}", "ESCALATION_REQUIRED", f"ESCALATION REQUIRED — {s['name']}", s, "CRITICAL",
                    route.get("explanation") or rec["whySelected"][0],
                    [f"{rid} BLOCKED" for rid in route.get("blockedRoadsOnPath", [])] or rec["whySelected"],
                    0.9, rec["recommendedAction"],
                ))
            elif rec["routeStatus"] == "ALTERNATIVE_VALID":
                alerts.append(self._alert(
                    f"ROUTE-{s['id']}", "ROUTE_INVALIDATED", f"ROUTE INVALIDATED — {rec['recommendedResourceName']} → {s['name']}", s, "HIGH",
                    route["explanation"],
                    [f"{rid} BLOCKED on primary route" for rid in route["blockedRoadsOnPath"]] + [f"Alternative via {', '.join(route['alternativeRoadIds'])} verified open"],
                    rec["confidenceScore"], f"Use alternative route ({rec['distanceKm']} km, ETA {rec['etaMinutes']} min)",
                ))
        order = {"ESCALATION_REQUIRED": 0, "CRITICAL_FLOOD_WARNING": 1, "ROUTE_INVALIDATED": 2, "HIGH_FLOOD_WARNING": 3}
        alerts.sort(key=lambda a: (order[a["type"]], a["priorityRank"]))
        # Forget first-seen times for alerts that cleared
        active = {a["id"] for a in alerts}
        self._alert_first_seen = {k: v for k, v in self._alert_first_seen.items() if k in active}
        return alerts

    def _alert(self, aid, kind, title, s, severity, message, evidence, confidence, action):
        first = self._alert_first_seen.setdefault(aid, _now())
        return {
            "id": aid, "type": kind, "title": title,
            "settlementId": s["id"], "settlementName": s["name"], "priorityRank": s["priorityRank"],
            "riskScore": s["riskScore"], "severity": severity, "message": message,
            "evidence": evidence, "confidence": confidence, "recommendedAction": action,
            "timestamp": first, "updatedAt": _now(),
        }

    def _facts_for(self, rec: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        s = next(x for x in self.settlements if x["id"] == rec["settlementId"])
        route = rec.get("route") or {}
        return {
            "settlement": s["name"],
            "priorityRank": s["priorityRank"],
            "priorityScore": s["responsePriority"],
            "riskScore": s["riskScore"],
            "riskStatus": s["riskStatus"],
            "population": s["population"],
            "evidence": s["evidence"],
            "priorityReasons": s["priorityWhy"],
            "rankReason": s.get("rankReason"),
            "resource": rec.get("recommendedResourceName"),
            "routeStatus": rec["routeStatus"],
            "routeRoads": route.get("activeRoadIds", []),
            "blockedRoads": route.get("blockedRoadsOnPath", []),
            "etaMinutes": rec.get("etaMinutes"),
            "distanceKm": rec.get("distanceKm"),
            "confidence": s["riskConfidence"],
        }

    def explain(self, settlement_id: Optional[str] = None) -> Dict[str, Any]:
        rec = next((r for r in self.recommendations if r["settlementId"] == settlement_id), None) if settlement_id else None
        if rec is None and self.recommendations:
            rec = self.recommendations[0]
        if rec is None:
            return {"text": "No settlement currently requires response.", "source": "TEMPLATE", "facts": {}, "guard": "NOT_NEEDED"}
        return explain_decision(self._facts_for(rec), use_llm=True)

    # ------------------------------------------------------------------ change tracking
    def _snapshot(self) -> Dict[str, Any]:
        return {
            "settlements": {s["id"]: {"name": s["name"], "risk": s["riskScore"], "status": s["riskStatus"], "rank": s["priorityRank"],
                                      "priority": s["responsePriority"], "access": s["accessibility"]} for s in self.settlements},
            "roads": {r["id"]: r["status"] for r in self.roads},
            "recs": {r["settlementId"]: {"resource": r.get("recommendedResourceName"), "route": r["routeStatus"], "eta": r.get("etaMinutes")} for r in self.recommendations},
        }

    def _diff(self, before: Dict[str, Any], after: Dict[str, Any]) -> List[Dict[str, str]]:
        changes = []
        for rid, status in after["roads"].items():
            if before["roads"].get(rid) != status:
                changes.append({"stage": "ROAD", "text": f"Road {rid}: {before['roads'].get(rid)} → {status}"})
        for sid, a in after["settlements"].items():
            b = before["settlements"].get(sid)
            if not b:
                continue
            if b["risk"] != a["risk"]:
                status = f" ({b['status']} → {a['status']})" if b["status"] != a["status"] else ""
                changes.append({"stage": "RISK", "text": f"{a['name']}: risk {b['risk']} → {a['risk']}{status}"})
            if b["access"] != a["access"]:
                changes.append({"stage": "ACCESS", "text": f"{a['name']}: access {b['access']} → {a['access']}"})
            if b["rank"] != a["rank"]:
                changes.append({"stage": "PRIORITY", "text": f"{a['name']}: priority #{b['rank']} → #{a['rank']} (score {b['priority']} → {a['priority']})"})
        for sid, a in after["recs"].items():
            b = before["recs"].get(sid)
            name = after["settlements"][sid]["name"]
            if not b:
                changes.append({"stage": "RESOURCE", "text": f"{name}: new recommendation {a['resource'] or 'ESCALATE'}"})
                continue
            if b["route"] != a["route"]:
                changes.append({"stage": "ROUTE", "text": f"{name}: route {b['route']} → {a['route']}"})
            if b["resource"] != a["resource"]:
                changes.append({"stage": "RESOURCE", "text": f"{name}: recommended {b['resource'] or 'ESCALATE'} → {a['resource'] or 'ESCALATE'}"})
            elif a["eta"] != b["eta"] and a["eta"] is not None and b["eta"] is not None:
                changes.append({"stage": "ROUTE", "text": f"{name}: ETA {b['eta']} → {a['eta']} min"})
        return changes

    def _log(self, event: str, title: str, changes: List[Dict[str, str]]):
        entry = {"id": len(self.event_log) + 1, "event": event, "title": title, "timestamp": _now(), "changes": changes}
        self.event_log.insert(0, entry)
        del self.event_log[25:]
        self.last_change = entry

    def _apply(self, event: str, title: str, mutate) -> List[Dict[str, str]]:
        before = self._snapshot()
        mutate()
        self.recalculate_all()
        changes = self._diff(before, self._snapshot())
        self._log(event, title, changes)
        return changes

    # ------------------------------------------------------------------ events
    def simulate_heavy_rainfall(self, increment_mm: float = 50.0):
        def mutate():
            for s in self.settlements:
                s["rainfall"] = round(s["rainfall"] + increment_mm, 1)
                s["rainfallIntensity"] = round(s["rainfallIntensity"] + increment_mm / 4, 1)
                # River response to runoff scales with the local catchment
                s["waterLevelMeters"] = round(s["waterLevelMeters"] + increment_mm / 100 * s["catchmentFactor"], 2)
                s["waterLevel"] = classify_water_level(s["waterLevelMeters"])
        self._ensure_sim_mode()
        return self._apply("RAINFALL", f"Heavy rainfall simulated (+{increment_mm:.0f} mm)", mutate)

    def simulate_water_level(self, increment_m: float = 0.5):
        def mutate():
            for s in self.settlements:
                s["waterLevelMeters"] = round(s["waterLevelMeters"] + increment_m * (0.5 + s["catchmentFactor"] / 2), 2)
                s["waterLevel"] = classify_water_level(s["waterLevelMeters"])
        self._ensure_sim_mode()
        return self._apply("WATER_LEVEL", f"River water level increase simulated (+{increment_m} m)", mutate)

    def set_road_status(self, road_id: str, status: Optional[str] = None, reason: Optional[str] = None):
        road = next((r for r in self.roads if r["id"] == road_id), None)
        if road is None:
            raise KeyError(road_id)
        if status is None:
            status = "OPEN" if road["status"] == "BLOCKED" else "BLOCKED"
        status = status.upper()

        def mutate():
            if status == "OPEN":
                road["manualStatus"], road["manualReason"] = None, None
            else:
                road["manualStatus"] = status
                road["manualReason"] = reason or ("Simulated road closure" if status == "BLOCKED" else "Operator flagged at risk")
        self._ensure_sim_mode()
        return self._apply("ROAD", f"Road {road_id} set to {status}", mutate)

    def set_resource_status(self, resource_id: str, status: str, assignment: Optional[str] = None):
        res = next((r for r in self.resources if r["id"] == resource_id), None)
        if res is None:
            raise KeyError(resource_id)

        def mutate():
            res["status"] = status
            res["currentAssignment"] = assignment if status == "DEPLOYED" else None
        target = next((s["name"] for s in self.settlements if s["id"] == assignment), None)
        return self._apply("RESOURCE", f"{res['name']} → {status}{' at ' + target if target else ''} (prototype, not real dispatch)", mutate)

    def _link_road(self, text: str, sid: str, infra: str) -> Optional[Dict[str, Any]]:
        explicit = re.search(r"\bR(\d+)\b", text, re.IGNORECASE)
        if explicit:
            road = next((r for r in self.roads if r["id"] == f"R{explicit.group(1)}"), None)
            if road:
                return road
        incident = [r for r in self.roads if sid in (r["source"], r["destination"])]
        if not incident:
            return None
        return sorted(incident, key=lambda r: (r.get("infrastructure") != infra, not r.get("floodProne"), r["distanceKm"]))[0]

    def submit_ground_report(self, description: str, location: str, severity: str, reporter_type: str, timestamp: Optional[str] = None) -> Dict[str, Any]:
        extracted = extract_ground_report_info(description, location, severity, self.settlements)
        sid = extracted.get("settlementId")
        if not sid:
            target = match_settlement(location, self.settlements)
            sid = target["id"] if target else None
        settlement = next((s for s in self.settlements if s["id"] == sid), None)

        self._report_seq += 1
        report = {
            "id": f"REP-{self._report_seq}",
            "settlementId": sid,
            "location": settlement["name"] if settlement else location,
            "description": description,
            "severity": extracted["severity"],
            "reporterType": reporter_type,
            "timestamp": timestamp or _now(),
            "status": "AI_EXTRACTED",
            "extractedInfo": extracted,
            "linkedRoadId": None,
            "roadAction": None,
        }

        road = None
        if settlement and extracted["roadStatus"] in ("BLOCKED", "AT_RISK"):
            road = self._link_road(description, sid, extracted["infrastructure"])
        if road:
            report["linkedRoadId"] = road["id"]
            verified = reporter_type in VERIFIED_REPORTERS
            if extracted["roadStatus"] == "BLOCKED" and verified:
                new_status, action = "BLOCKED", f"{road['id']} marked BLOCKED ({reporter_type.replace('_', ' ').lower()} report)"
            elif road["status"] == "BLOCKED":
                new_status, action = "BLOCKED", f"{road['id']} already BLOCKED"
            else:
                new_status = "AT_RISK"
                action = (f"{road['id']} marked AT RISK — citizen report of blockage pending verification"
                          if extracted["roadStatus"] == "BLOCKED" else f"{road['id']} marked AT RISK")
            report["roadAction"] = action

        def mutate():
            self.reports.insert(0, report)
            if road and road["status"] != "BLOCKED":
                road["manualStatus"] = new_status
                road["manualReason"] = f"Ground report {report['id']}: {extracted['infrastructure'].lower()} {extracted['roadStatus'].lower().replace('_', ' ')}"
        self._ensure_sim_mode()
        changes = self._apply("REPORT", f"Ground report {report['id']} — {report['location']} ({report['severity']})", mutate)
        report["downstreamChanges"] = changes
        return report

    def _ensure_sim_mode(self):
        if self.mode != "REPLAYED_DATA":
            self.mode = "DEMO_SIMULATION"

    # ------------------------------------------------------------------ demo stepper
    def trigger_demo_step(self, step: int) -> Dict[str, Any]:
        """Steps are cumulative from baseline so any step can be clicked at any time."""
        self.reset_to_baseline(log_event=False)
        titles = {
            1: "Step 1: Initial situation",
            2: "Step 2: Heavy rainfall",
            3: "Step 3: Ground report (AI extraction)",
            4: "Step 4: Road closure",
            5: "Step 5: Automatic recalculation",
            6: "Step 6: Final response plan",
        }
        step = max(1, min(6, step))
        changes: List[Dict[str, str]] = []
        report = None
        if step >= 2:
            changes = self.simulate_heavy_rainfall(50)
        if step >= 3:
            report = self.submit_ground_report(DEMO_REPORT, "Village A (Wakad Khurd)", "HIGH", "CITIZEN")
            changes = report["downstreamChanges"]
        if step >= 4:
            changes = self.set_road_status("R12", "BLOCKED", "Closure confirmed by field team (bridge submerged)")

        self.mode = "DEMO_SIMULATION"
        self.simulation_step = step
        self.simulation_title = titles[step]
        self.simulation_description = self._step_caption(step, report, changes)
        return {"step": step, "title": self.simulation_title, "description": self.simulation_description, "changes": changes, "state": self.get_full_state()}

    def _situation_summary(self) -> str:
        parts = [f"{s['name'].split(' (')[0]} {s['riskStatus']} ({s['riskScore']})" for s in sorted(self.settlements, key=lambda x: x["id"])[:3]]
        r12 = next((r for r in self.roads if r["id"] == "R12"), None)
        boat = next((r for r in self.resources if r["id"] == "BOAT-02"), None)
        tail = []
        if r12:
            tail.append(f"Road R12 {r12['status']}")
        if boat:
            tail.append(f"Rescue Boat 02 {boat['status']}")
        return ", ".join(parts) + ". " + ", ".join(tail) + "."

    def _step_caption(self, step: int, report: Optional[Dict[str, Any]], changes: List[Dict[str, str]]) -> str:
        if step == 1:
            return self._situation_summary()
        if step == 2:
            risk = [c["text"] for c in changes if c["stage"] in ("RISK", "PRIORITY")][:3]
            return "Rainfall +50 mm district-wide. " + "; ".join(risk) + "."
        if step == 3 and report:
            ex = report["extractedInfo"]
            return (f"AI extracted: {ex['location']}, severity {ex['severity']}, road {ex['roadStatus']}, "
                    f"{ex['infrastructure'].lower()}, confidence {round(ex['confidence'] * 100)}%. {report.get('roadAction') or ''}")
        rec_a = next((r for r in self.recommendations if r["settlementId"] == "S1"), None)
        route = (rec_a or {}).get("route") or {}
        if step in (4, 5):
            if route.get("originalRouteStatus") == "INVALID":
                alt = "VALID via " + ", ".join(route.get("alternativeRoadIds", [])) if route.get("alternativeRouteStatus") == "VALID" else route.get("alternativeRouteStatus")
                return (f"R12 BLOCKED → {route['resourceName']} route to Village A rechecked: original INVALID, alternative {alt} "
                        f"({route.get('distanceKm')} km, ETA {route.get('etaMinutes')} min). Priorities and recommendations recalculated.")
            return "Road R12 blocked; routes rechecked."
        top3 = ", ".join(f"#{s['priorityRank']} {s['name'].split(' (')[0]}" for s in self.settlements[:3])
        top = self.recommendations[0] if self.recommendations else {}
        return (f"Response plan updated: {top3}. Blocked roads: {sum(1 for r in self.roads if r['status'] == 'BLOCKED')}. "
                f"Recommended: {top.get('recommendedResourceName') or 'ESCALATE'} → {top.get('settlementName')}. "
                f"Confidence {round(self.settlements[0]['riskConfidence'] * 100)}%.")

    # ------------------------------------------------------------------ route scenario testing
    def run_route_scenario(self, settlement_id: str, scenario: int, apply: bool = False) -> Dict[str, Any]:
        target = next((s for s in self.settlements if s["id"] == settlement_id), None)
        if target is None:
            raise KeyError(settlement_id)
        mobile = [r for r in self.resources if r.get("mobile") and r["status"] != "UNAVAILABLE"]
        test_roads = copy.deepcopy(self.roads)
        for r in test_roads:
            r["status"] = "OPEN"

        def best_route(roads):
            routes = [plan_route(res, target, self.nodes, roads, use_osrm=False) for res in mobile]
            ok = [r for r in routes if not r["escalationRequired"]]
            return min(ok, key=lambda r: r["etaMinutes"]) if ok else (routes[0] if routes else None)

        closed: List[str] = []
        if scenario >= 2:
            primary = best_route(test_roads)
            last_road = primary["originalRoadIds"][-1] if primary and primary["originalRoadIds"] else None
            closed = [last_road] if last_road else []
        if scenario >= 3:
            closed = [r["id"] for r in test_roads if settlement_id in (r["source"], r["destination"])]
        for r in test_roads:
            if r["id"] in closed:
                r["status"] = "BLOCKED"

        result = best_route(test_roads)
        labels = {1: "All roads open", 2: "Primary road blocked", 3: "Multiple roads blocked"}
        out = {"scenario": scenario, "scenarioLabel": labels.get(scenario, "Custom"), "blockedRoads": closed, "route": result, "applied": False}

        if apply:
            def mutate():
                for r in self.roads:
                    r["manualStatus"] = "BLOCKED" if r["id"] in closed else None
                    r["manualReason"] = f"Route test scenario {scenario}" if r["id"] in closed else None
            self._ensure_sim_mode()
            self._apply("SCENARIO", f"Route scenario {scenario} applied to live map ({labels.get(scenario)})", mutate)
            out["applied"] = True
        return out

    # ------------------------------------------------------------------ replay + live
    def load_replay_frame(self, index: int, running: bool = True):
        frames = self.replay_script["frames"]
        index = max(0, min(index, len(frames) - 1))
        frame = frames[index]
        if index == 0:
            self.reset_to_baseline(log_event=False)
            self.reports = []

        def mutate():
            for s in self.settlements:
                vals = frame["settlements"].get(s["id"])
                if vals:
                    s["rainfall"] = vals["rainfall"]
                    s["rainfallIntensity"] = vals["intensity"]
                    s["waterLevelMeters"] = vals["waterLevelM"]
                    s["waterLevel"] = classify_water_level(vals["waterLevelM"])
            for r in self.roads:
                st = frame.get("roads", {}).get(r["id"])
                if st:
                    r["manualStatus"] = None if st == "OPEN" else st
                    r["manualReason"] = f"Replayed observation {frame['time']}"
            for rep in frame.get("reports", []):
                self._report_seq += 1
                self.reports.insert(0, {**rep, "id": f"REP-{self._report_seq}", "timestamp": f"{self.replay_script['date']}T{frame['time']}:00+05:30",
                                        "status": "REPLAYED", "extractedInfo": {**rep["extractedInfo"], "source": "REPLAYED_DATA"}})
        self.mode = "REPLAYED_DATA"
        self._apply("REPLAY", f"[REPLAY {frame['time']}] {frame['label']}", mutate)
        self.simulation_title = f"Replay: {self.replay_script['eventName']}"
        self.simulation_description = frame["label"]
        self.replay = {
            "eventName": self.replay_script["eventName"], "date": self.replay_script["date"],
            "frame": index + 1, "totalFrames": len(frames), "frameTime": frame["time"],
            "label": frame["label"], "running": running and index < len(frames) - 1,
            "history": (self.replay or {}).get("history", []) if index else [],
        }
        self.replay["history"].append({
            "time": frame["time"],
            **{s["id"]: s["riskScore"] for s in self.settlements},
            "rainfallMax": max(s["rainfall"] for s in self.settlements),
        })

    def stop_replay(self):
        if self.replay:
            self.replay["running"] = False

    def set_real_world_live_mode(self):
        weather = fetch_live_weather(self.district["center"][0], self.district["center"][1])

        def mutate():
            for s in self.settlements:
                s["rainfall"] = float(weather.get("past24hMm", 0.0))
                s["rainfallIntensity"] = float(max(weather.get("precipitation") or 0.0, weather.get("maxIntensityNext24h") or 0.0))
                s["waterLevelMeters"] = round(0.6 * (0.5 + s["catchmentFactor"] / 2), 2)
                s["waterLevel"] = classify_water_level(s["waterLevelMeters"])
            for r in self.roads:
                r["manualStatus"], r["manualReason"] = None, None
            self.reports = []
        self.reset_to_baseline(log_event=False)
        self.mode = "LIVE"
        self.replay = None
        self.simulation_step = 0
        self.simulation_title = "Live: actual Open-Meteo rainfall"
        self._apply("LIVE", f"Synced to live weather ({weather['source']}: {weather.get('past24hMm', 0)} mm past 24h)", mutate)
        self.simulation_description = (f"Rainfall from {weather['source']} ({weather.get('past24hMm', 0)} mm past 24h, "
                                       f"{weather.get('next24hMm', 0)} mm forecast next 24h). Gauges at simulated normal baseline; no reports.")

    def refresh_live(self):
        if self.mode == "LIVE":
            weather = fetch_live_weather(self.district["center"][0], self.district["center"][1])
            for s in self.settlements:
                s["rainfall"] = float(weather.get("past24hMm", 0.0))
            self.recalculate_all()

    # ------------------------------------------------------------------ output
    def get_full_state(self) -> Dict[str, Any]:
        weather = fetch_live_weather(self.district["center"][0], self.district["center"][1])
        affected = [s for s in self.settlements if s["affected"]]
        kpi = {
            "criticalAreas": sum(1 for s in self.settlements if s["riskStatus"] == "CRITICAL"),
            "affectedPopulation": sum(s["population"] for s in affected),
            "blockedRoads": sum(1 for r in self.roads if r["status"] == "BLOCKED"),
            "atRiskRoads": sum(1 for r in self.roads if r["status"] == "AT_RISK"),
            "activeWarnings": len(self.alerts),
            "availableResources": sum(1 for r in self.resources if r["status"] == "AVAILABLE"),
            "districtName": self.district["districtName"],
            "lastUpdated": _now(),
        }
        return {
            "version": self.version,
            "instanceId": self.instance_id,
            "district": self.district,
            "nodes": [n for n in self.nodes.values() if n["kind"] == "BASE"],
            "settlements": self.settlements,
            "roads": self.roads,
            "resources": self.resources,
            "reports": self.reports,
            "route": self.current_route,
            "routes": self.routes,
            "recommendations": self.recommendations,
            "alerts": self.alerts,
            "kpi": kpi,
            "weather": weather,
            "aiExplanation": self.ai_explanation,
            "mode": self.mode,
            "simulation": {
                "step": self.simulation_step,
                "title": self.simulation_title,
                "description": self.simulation_description,
                "isSimulation": self.mode != "LIVE",
            },
            "replay": self.replay,
            "lastChange": self.last_change,
            "eventLog": self.event_log,
            "processingLog": self.processing_log,
            "dataSources": {
                "weather": "Open-Meteo API (live)" if weather["source"] == "OPEN_METEO_API" else "Fallback dataset (offline)",
                "terrain": self.settlements[0].get("elevationSource", "CSV") if self.settlements else "CSV",
                "settlements": "Simulated prototype data (population, gauges)",
                "roads": "Simulated prototype road graph",
                "routing": "NetworkX local graph + OSRM street ETA check",
                "reports": "Simulated / user-submitted",
            },
        }


state_manager = ResQGridStateManager()
