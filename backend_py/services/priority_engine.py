from typing import List, Dict, Any, Tuple

def calculate_response_priorities(settlements: List[Dict[str, Any]], roads: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Priority != Risk.
    Calculates operational response priority combining:
    1. Flood Risk (40%)
    2. Population Exposed (25%)
    3. Road Accessibility Urgency (15%)
    4. Ground Report Severity (20%)
    """
    scored = []

    for s in settlements:
        risk_score = s.get("riskScore", 50)
        pop = s.get("population", 1000)
        # Normalize population (0 - 5000 -> 0 - 100)
        pop_score = min(100, (pop / 4000.0) * 100)

        reports_count = s.get("groundReportsCount", 0)
        report_score = min(100, reports_count * 35)

        accessibility = s.get("accessibility", "OPEN")
        # If accessible or cut off, calculate urgency
        if accessibility == "CUT_OFF":
            # Cut off requires extreme urgent amphibious/boat response
            access_urgency = 95
        elif accessibility == "AT_RISK":
            access_urgency = 75
        else:
            access_urgency = 50

        priority_score = int(
            (risk_score * 0.40) +
            (pop_score * 0.25) +
            (access_urgency * 0.15) +
            (report_score * 0.20)
        )
        priority_score = max(5, min(100, priority_score))

        # Build explainable "WHY" bullet points
        why_list = []
        if risk_score >= 81:
            why_list.append("Extreme flood danger (CRITICAL risk score)")
        elif risk_score >= 61:
            why_list.append("Elevated flood hazard (HIGH risk score)")

        why_list.append(f"{pop:,} residents exposed in immediate impact zone")

        if reports_count >= 2:
            why_list.append(f"Multiple urgent field reports ({reports_count}) requiring rescue intervention")
        elif reports_count == 1:
            why_list.append("1 verified citizen hazard report logged")

        if accessibility == "CUT_OFF":
            why_list.append("CRITICAL: Primary access roads severed — requires boat or aerial route")
        elif accessibility == "AT_RISK":
            why_list.append("Access route compromised by encroaching floodwater")
        else:
            why_list.append("Emergency route remains accessible for rapid vehicular deployment")

        item = dict(s)
        item["responsePriority"] = priority_score
        item["whyExplanation"] = why_list
        scored.append(item)

    # Sort descending by responsePriority
    scored.sort(key=lambda x: x["responsePriority"], reverse=True)

    # Assign priorityRank 1, 2, 3...
    for idx, item in enumerate(scored, 1):
        item["priorityRank"] = idx

    return scored
