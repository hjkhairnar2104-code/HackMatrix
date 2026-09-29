"""
False-alert evaluation: replays labelled simulated scenarios through the SAME
risk engine used live, and compares its alerts with the scenario outcome.
Prototype evaluation only — not real-world accuracy.
"""
import json
import os
from typing import Any, Dict

from services.data_processing import DATA_DIR, DISTRICT, classify_terrain, classify_water_level
from services.risk_engine import calculate_flood_risk

ALERT_LEVELS = ("HIGH", "CRITICAL")


def get_false_alert_evaluation() -> Dict[str, Any]:
    with open(os.path.join(DATA_DIR, "evaluation_scenarios.json"), "r", encoding="utf-8") as f:
        cases = json.load(f)["cases"]

    rows = []
    tp = fp = fn = tn = 0
    for c in cases:
        s = {
            "rainfall": c["rainfall"], "rainfallIntensity": c["intensity"], "waterLevelMeters": c["waterLevelM"],
            "waterLevel": classify_water_level(c["waterLevelM"]), "relativeElevation": c["relativeElevation"],
            "elevation": DISTRICT["riverDatumM"] + c["relativeElevation"], "terrainClass": classify_terrain(c["relativeElevation"]),
            "population": c["population"], "accessibility": c["accessibility"],
        }
        risk = calculate_flood_risk(s, [{"severity": sev} for sev in c["reports"]])
        alerted = risk["riskStatus"] in ALERT_LEVELS
        flooded = c["observed"] == "FLOODED"
        if alerted and flooded:
            verdict, tp = "CORRECT_ALERT", tp + 1
        elif alerted:
            verdict, fp = "FALSE_ALERT", fp + 1
        elif flooded:
            verdict, fn = "MISSED_EVENT", fn + 1
        else:
            verdict, tn = "CORRECT_NO_ALERT", tn + 1
        rows.append({
            "caseId": c["caseId"], "location": c["location"], "scenario": c["scenario"],
            "signal": f"{c['rainfall']} mm, gauge {c['waterLevelM']} m, {len(c['reports'])} report(s)",
            "riskScore": risk["riskScore"], "alertDecision": risk["riskStatus"],
            "observed": c["observed"], "verdict": verdict,
        })

    total_alerts = tp + fp
    return {
        "totalScenarios": len(cases),
        "totalAlerts": total_alerts,
        "correctAlerts": tp,
        "falseAlerts": fp,
        "missedEvents": fn,
        "correctNoAlert": tn,
        "falseAlertRatePercent": round(100 * fp / total_alerts, 1) if total_alerts else 0.0,
        "precisionPercent": round(100 * tp / total_alerts, 1) if total_alerts else 0.0,
        "recallPercent": round(100 * tp / (tp + fn), 1) if (tp + fn) else 0.0,
        "alertThreshold": "Risk status HIGH or CRITICAL (score ≥ 61)",
        "evaluationDataset": "Simulated & replayed prototype scenarios (evaluation_scenarios.json)",
        "disclaimer": "Prototype evaluation using simulated/replayed scenarios. Not real-world accuracy.",
        "cases": rows,
    }
