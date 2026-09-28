from typing import Dict, Any, Tuple, List

def calculate_flood_risk(
    rainfall_mm: float,
    elevation_m: float,
    water_level_status: str,
    ground_reports_count: int,
    accessibility: str,
    population: int
) -> Tuple[int, str, List[str]]:
    """
    Explainable Flood Risk Scoring Model (0 - 100)
    Factors:
    - Rainfall (0 - 35 pts)
    - Elevation Vulnerability (0 - 25 pts)
    - Water Level Gauge (0 - 20 pts)
    - Ground Distress Reports (0 - 20 pts)
    """
    factors = []

    # 1. Rainfall score (max 35)
    if rainfall_mm >= 140:
        rf_score = 35
        factors.append(f"Torrential rainfall accumulation ({rainfall_mm:.1f} mm)")
    elif rainfall_mm >= 90:
        rf_score = 28
        factors.append(f"Heavy rainfall intensity ({rainfall_mm:.1f} mm)")
    elif rainfall_mm >= 50:
        rf_score = 18
        factors.append(f"Moderate persistent rainfall ({rainfall_mm:.1f} mm)")
    elif rainfall_mm >= 25:
        rf_score = 10
        factors.append(f"Light baseline showers ({rainfall_mm:.1f} mm)")
    elif rainfall_mm > 5:
        rf_score = 4
        factors.append(f"Minor localized precipitation ({rainfall_mm:.1f} mm)")
    else:
        rf_score = 0
        factors.append(f"Dry weather / No active precipitation ({rainfall_mm:.1f} mm)")

    # 2. Elevation vulnerability (max 25)
    # Low ground is only a danger IF rain or river water is actively present!
    has_water_hazard = (rainfall_mm >= 25) or (water_level_status.upper() in ["WARNING", "CRITICAL"])
    if has_water_hazard:
        if elevation_m <= 40:
            elev_score = 25
            factors.append(f"Extreme low-elevation depression ({elevation_m:.0f}m - basin floor collecting runoff)")
        elif elevation_m <= 50:
            elev_score = 18
            factors.append(f"Low-lying river plain terrain ({elevation_m:.0f}m - flood prone)")
        elif elevation_m <= 70:
            elev_score = 10
            factors.append(f"Moderate elevation plateau ({elevation_m:.0f}m)")
        else:
            elev_score = 2
            factors.append(f"High ground elevation ({elevation_m:.0f}m - natural buffer)")
    else:
        elev_score = 2 if elevation_m <= 45 else 0
        factors.append(f"Topography stable at {elevation_m:.0f}m (no active inundation)")

    # 3. Water level indicator (max 20)
    wl_upper = water_level_status.upper()
    if wl_upper == "CRITICAL":
        wl_score = 20
        factors.append("River gauge crossed CRITICAL flood threshold (>2.2m)")
    elif wl_upper == "WARNING":
        wl_score = 14
        factors.append("River gauge active in WARNING zone (>1.6m)")
    else:
        wl_score = 0
        factors.append("River stream water level within normal seasonal banks (<1.0m)")

    # 4. Ground reports (max 20)
    if ground_reports_count >= 3:
        rep_score = 20
        factors.append(f"Multiple confirmed ground distress reports ({ground_reports_count})")
    elif ground_reports_count == 2:
        rep_score = 14
        factors.append(f"2 verified ground reports of street inundation")
    elif ground_reports_count == 1:
        rep_score = 8
        factors.append(f"1 field report logged by citizen/ward officer")
    else:
        rep_score = 0

    # Isolation booster: if road is completely cut off, vulnerability amplifies
    if accessibility == "CUT_OFF":
        factors.append("Settlement road access severed (isolation amplification)")
        isolation_bonus = 6
    else:
        isolation_bonus = 0

    total_score = min(100, rf_score + elev_score + wl_score + rep_score + isolation_bonus)

    # Classification
    if total_score >= 81:
        status = "CRITICAL"
    elif total_score >= 61:
        status = "HIGH"
    elif total_score >= 31:
        status = "MODERATE"
    else:
        status = "LOW"

    return total_score, status, factors
