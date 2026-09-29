"""
Data Processing Layer.

Loads raw multi-source data (CSV / JSON), cleans it, fills missing values,
enriches terrain from a public DEM, and integrates settlements with the road
graph. Output is the structured dataset consumed by the risk / priority engines.
"""
import csv
import json
import math
import os
import statistics
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import requests

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
CACHE_DIR = os.path.join(DATA_DIR, "cache")

DISTRICT = {
    "districtId": "DIST_PUNE_01",
    "districtName": "Pune District — Mula-Pawana Basin",
    "state": "Maharashtra",
    "center": [18.5780, 73.7950],
    "zoom": 13,
    "riverSystems": ["Mula River", "Pawana River"],
    # Approximate river-bed elevation used as the terrain datum (metres ASL).
    "riverDatumM": 555.0,
    "boundary": [
        [18.6080, 73.7300], [18.6080, 73.8450], [18.5500, 73.8450], [18.5500, 73.7300]
    ],
}

# Water-level gauge thresholds (metres)
WATER_WARNING_M = 1.5
WATER_CRITICAL_M = 2.1

ROAD_WINDING_FACTOR = 1.25


def classify_water_level(meters: float) -> str:
    if meters >= WATER_CRITICAL_M:
        return "CRITICAL"
    if meters >= WATER_WARNING_M:
        return "WARNING"
    return "NORMAL"


def classify_terrain(relative_elevation_m: float) -> str:
    if relative_elevation_m < 12:
        return "LOW_LYING"
    if relative_elevation_m < 25:
        return "MID_SLOPE"
    return "HIGH_GROUND"


def haversine_km(a: List[float], b: List[float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(h))


def polyline_km(coords: List[List[float]]) -> float:
    return sum(haversine_km(coords[i], coords[i + 1]) for i in range(len(coords) - 1))


def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    text = str(value).strip().replace(",", "")
    if text == "" or text.lower() in ("na", "nan", "null", "none"):
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _read_json(name: str) -> Any:
    with open(os.path.join(RAW_DIR, name), "r", encoding="utf-8") as f:
        return json.load(f)


def fetch_dem_elevations(points: List[List[float]]) -> Optional[List[float]]:
    """Real terrain from the Open-Meteo Elevation API (Copernicus DEM, 90 m)."""
    cache_path = os.path.join(CACHE_DIR, "elevation.json")
    key = ";".join(f"{p[0]:.4f},{p[1]:.4f}" for p in points)
    try:
        url = "https://api.open-meteo.com/v1/elevation"
        params = {
            "latitude": ",".join(str(p[0]) for p in points),
            "longitude": ",".join(str(p[1]) for p in points),
        }
        resp = requests.get(url, params=params, timeout=4)
        if resp.status_code == 200:
            values = resp.json().get("elevation")
            if values and len(values) == len(points):
                os.makedirs(CACHE_DIR, exist_ok=True)
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump({"key": key, "elevation": values}, f)
                return values
    except Exception as e:
        print(f"[DataProcessing] DEM request failed, using cached/CSV terrain: {e}")

    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            cached = json.load(f)
        if cached.get("key") == key:
            return cached["elevation"]
    except Exception:
        pass
    return None


def load_and_process(fetch_terrain: bool = True) -> Dict[str, Any]:
    log: List[Dict[str, Any]] = []

    # ---------- 1. Settlements: load + clean ----------
    with open(os.path.join(RAW_DIR, "settlements.csv"), "r", encoding="utf-8") as f:
        raw_rows = list(csv.DictReader(f))
    log.append({"step": "LOAD", "detail": f"Loaded {len(raw_rows)} settlement rows from settlements.csv"})

    settlements: List[Dict[str, Any]] = []
    cleaned_fields = 0
    for row in raw_rows:
        name = " ".join((row.get("name") or "").split())
        if name != (row.get("name") or ""):
            cleaned_fields += 1
        if "," in (row.get("population") or ""):
            cleaned_fields += 1
        settlements.append({
            "id": row["id"].strip(),
            "name": name,
            "latitude": _to_float(row.get("latitude")),
            "longitude": _to_float(row.get("longitude")),
            "population": int(_to_float(row.get("population")) or 0),
            "elevation": _to_float(row.get("elevationM")),
            "rainfall": _to_float(row.get("rainfall24hMm")),
            "rainfallIntensity": _to_float(row.get("rainfallIntensityMmHr")),
            "waterLevelMeters": _to_float(row.get("waterLevelM")),
            "catchmentFactor": _to_float(row.get("catchmentFactor")) or 0.5,
            "dataSource": (row.get("dataSource") or "SIMULATED_PROTOTYPE").strip(),
            "imputedFields": [],
        })
    log.append({"step": "CLEAN", "detail": f"Normalised {cleaned_fields} malformed text/number fields (whitespace, thousands separators)"})

    # ---------- 2. Missing-value handling ----------
    imputed = 0
    known_levels = [s["waterLevelMeters"] for s in settlements if s["waterLevelMeters"] is not None]
    median_level = statistics.median(known_levels) if known_levels else 1.0
    known_rain = [s["rainfall"] for s in settlements if s["rainfall"] is not None]
    median_rain = statistics.median(known_rain) if known_rain else 40.0
    for s in settlements:
        if s["rainfall"] is None:
            s["rainfall"] = median_rain
            s["imputedFields"].append("rainfall")
            imputed += 1
        if s["rainfallIntensity"] is None:
            # Peak-hour intensity approximated from 24h accumulation
            s["rainfallIntensity"] = round(s["rainfall"] / 8.0, 1)
            s["imputedFields"].append("rainfallIntensity")
            imputed += 1
        if s["waterLevelMeters"] is None:
            # Scale the district median gauge by the local catchment factor
            s["waterLevelMeters"] = round(median_level * (0.5 + s["catchmentFactor"] / 2), 2)
            s["imputedFields"].append("waterLevelMeters")
            imputed += 1
    log.append({"step": "IMPUTE", "detail": f"Filled {imputed} missing values (median / catchment-scaled / intensity-from-accumulation)"})

    # ---------- 3. Terrain enrichment (public DEM) ----------
    elevation_source = "CSV_CACHED_DEM"
    if fetch_terrain:
        dem = fetch_dem_elevations([[s["latitude"], s["longitude"]] for s in settlements])
        if dem:
            for s, elev in zip(settlements, dem):
                s["elevation"] = float(elev)
            elevation_source = "OPEN_METEO_DEM"
    for s in settlements:
        if s["elevation"] is None:
            s["elevation"] = DISTRICT["riverDatumM"] + 15
            s["imputedFields"].append("elevation")
        s["elevationSource"] = elevation_source
        s["relativeElevation"] = round(s["elevation"] - DISTRICT["riverDatumM"], 1)
        s["terrainClass"] = classify_terrain(s["relativeElevation"])
        s["waterLevel"] = classify_water_level(s["waterLevelMeters"])
    log.append({"step": "TERRAIN", "detail": f"Terrain from {elevation_source}; height above river datum ({DISTRICT['riverDatumM']:.0f} m) and terrain class derived"})

    # ---------- 4. Road network: validate + transform ----------
    network = _read_json("road_network.json")
    nodes = {n["id"]: dict(n) for n in network["nodes"]}
    for s in settlements:
        nodes[s["id"]] = {"id": s["id"], "name": s["name"], "latitude": s["latitude"], "longitude": s["longitude"], "kind": "SETTLEMENT"}

    roads: List[Dict[str, Any]] = []
    filled_distances = 0
    for r in network["roads"]:
        if r["source"] not in nodes or r["destination"] not in nodes:
            log.append({"step": "VALIDATE", "detail": f"Dropped road {r['id']}: unknown endpoint"})
            continue
        road = dict(r)
        if _to_float(road.get("distanceKm")) is None:
            road["distanceKm"] = round(polyline_km(road["coordinates"]) * ROAD_WINDING_FACTOR, 1)
            filled_distances += 1
        road["sourceName"] = nodes[road["source"]]["name"]
        road["destinationName"] = nodes[road["destination"]]["name"]
        road["status"] = "OPEN"
        road["statusReason"] = "Normal conditions"
        road["manualStatus"] = None
        roads.append(road)
    log.append({"step": "TRANSFORM", "detail": f"Built road graph: {len(nodes)} nodes, {len(roads)} roads ({filled_distances} missing lengths derived from geometry)"})

    # ---------- 5. Geographic integration ----------
    for s in settlements:
        s["connectedRoadIds"] = [r["id"] for r in roads if s["id"] in (r["source"], r["destination"])]
    resources = _read_json("resources.json")
    for res in resources:
        res.setdefault("currentAssignment", None)
    log.append({"step": "INTEGRATE", "detail": "Joined settlements ↔ roads ↔ resources on graph nodes; rainfall + terrain + gauge features prepared"})

    now = datetime.now(timezone.utc)
    reports = []
    for rep in _read_json("reports.json"):
        rep = dict(rep)
        rep["timestamp"] = (now - timedelta(minutes=rep.pop("minutesAgo", 0))).isoformat()
        rep["status"] = "AI_EXTRACTED"
        reports.append(rep)

    return {
        "district": DISTRICT,
        "settlements": settlements,
        "nodes": nodes,
        "roads": roads,
        "resources": resources,
        "reports": reports,
        "processingLog": log,
    }
