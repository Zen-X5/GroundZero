from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import requests
import asyncio
import logging

from app.core.config import settings
from app.perception.fusion import fuse_sensor_modalities, calculate_multi_drone_boost
from app.reasoning.risk_engine import calculate_explainable_risk

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Ground-Zero AI Intelligence Microservice for Multi-Drone Fusion and Explainable Risk Scoring",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("GroundZeroAI")
logging.basicConfig(level=logging.INFO)

# Request Models
class SensorObservation(BaseModel):
    droneId: str
    survivorCode: str
    rgbConfidence: Optional[float] = None
    thermalConfidence: Optional[float] = None
    lidarEvidence: Optional[float] = None
    motionConfidence: Optional[float] = None

class RiskCalculationRequest(BaseModel):
    survivorCode: str
    environment: str = "ROOF_FLOOD"
    mobilityCondition: str = "STANDING_WAVING"
    openingAccessible: bool = True
    floodProximityMeters: float = 2.0
    floodRisingRateMPerHr: float = 0.2
    timeElapsedMins: float = 0.0

@app.get("/")
def root():
    return {"service": settings.PROJECT_NAME, "status": "ONLINE"}

@app.get("/health")
def health():
    return {"status": "HEALTHY", "backend_url": settings.BACKEND_API_URL}

@app.post("/api/ai/fuse-observation")
def fuse_observation(obs: SensorObservation):
    base_conf = fuse_sensor_modalities(
        rgb_conf=obs.rgbConfidence,
        thermal_conf=obs.thermalConfidence,
        lidar_evidence=obs.lidarEvidence,
        motion_conf=obs.motionConfidence
    )
    return {
        "survivorCode": obs.survivorCode,
        "droneId": obs.droneId,
        "fusedConfidence": base_conf
    }

@app.post("/api/ai/calculate-risk")
def calculate_risk(req: RiskCalculationRequest):
    risk_score, details = calculate_explainable_risk(
        environment=req.environment,
        mobility_condition=req.mobilityCondition,
        opening_accessible=req.openingAccessible,
        flood_proximity_meters=req.floodProximityMeters,
        flood_rising_rate_m_per_hr=req.floodRisingRateMPerHr,
        time_since_first_detected_mins=req.timeElapsedMins
    )
    return {
        "survivorCode": req.survivorCode,
        "riskScore": risk_score,
        "riskDetails": details
    }

@app.post("/api/ai/seed-phase1-demo")
def seed_phase1_demo():
    """
    Seeds Phase 1 end-to-end demo data to the NestJS backend for immediate testing.
    """
    survivors_data = [
        {
            "survivorCode": "SURV_01A_APT_WINDOW",
            "globalPosition": {"x": 154.5, "y": 26.5, "z": 3.8},
            "sector": "SECTOR_C",
            "environment": "WINDOW_VOID",
            "confidenceScore": 0.94,
            "confirmingDrones": ["drone_2", "drone_3"],
            "observationCount": 4,
            "riskScore": 88.5,
            "rescuePriorityRank": 1,
            "riskDetails": {
                "environmentalThreat": 80.0,
                "mobilityStatus": 85.0,
                "accessibilityScore": 75.0,
                "urgencyMultiplier": 1.2,
                "reasoning": ["Trapped inside 2nd-floor window opening", "Submerged ground floor (1.0m flood)", "Limited mobility"]
            },
            "status": "RESCUE_QUEUED",
            "estimatedGroupSize": 3
        },
        {
            "survivorCode": "SURV_06A_HOUSE_ROOF",
            "globalPosition": {"x": 38.5, "y": 22.8, "z": 3.8},
            "sector": "SECTOR_A",
            "environment": "ROOF_FLOOD",
            "confidenceScore": 0.96,
            "confirmingDrones": ["drone_1"],
            "observationCount": 2,
            "riskScore": 82.0,
            "rescuePriorityRank": 2,
            "riskDetails": {
                "environmentalThreat": 90.0,
                "mobilityStatus": 40.0,
                "accessibilityScore": 40.0,
                "urgencyMultiplier": 1.1,
                "reasoning": ["Rising flood lake (0.25m/hr)", "Survivor actively signaling on submerged rooftop"]
            },
            "status": "IDENTIFIED",
            "estimatedGroupSize": 2
        },
        {
            "survivorCode": "SURV_01_TREE_LAKE",
            "globalPosition": {"x": 18.8, "y": 32.5, "z": 4.5},
            "sector": "SECTOR_A",
            "environment": "TREE_PERCH",
            "confidenceScore": 0.89,
            "confirmingDrones": ["drone_1"],
            "observationCount": 1,
            "riskScore": 76.0,
            "rescuePriorityRank": 3,
            "riskDetails": {
                "environmentalThreat": 85.0,
                "mobilityStatus": 70.0,
                "accessibilityScore": 60.0,
                "urgencyMultiplier": 1.0,
                "reasoning": ["Clinging to upper oak tree branches above 1.0m floodwater", "Requires boat/basket rescue"]
            },
            "status": "IDENTIFIED",
            "estimatedGroupSize": 1
        }
    ]

    results = []
    for s in survivors_data:
        try:
            res = requests.post(f"{settings.BACKEND_API_URL}/survivors/detection", json=s, timeout=3)
            results.append({"survivorCode": s["survivorCode"], "status": res.status_code})
        except Exception as e:
            results.append({"survivorCode": s["survivorCode"], "error": str(e)})

    return {"message": "Phase 1 survivor seed dispatched to NestJS backend", "results": results}


# --- TDoA Geolocation Simulation Endpoints ---

class DroneInput(BaseModel):
    id: str
    lat: float
    lon: float

class TdoaSimulationRequest(BaseModel):
    drones: List[DroneInput]
    trueSurvivorPos: List[float]  # [lat, lon]
    noiseStdNs: Optional[float] = 10.0
    seed: Optional[int] = 42

@app.post("/api/ai/tdoa-simulate")
def api_tdoa_simulate(req: TdoaSimulationRequest):
    from app.reasoning.tdoa_locator import (
        simulate_arrival_times,
        solve_tdoa,
        generate_hyperbola,
        build_beacon,
        haversine_distance
    )
    import numpy as np

    drones_list = [{"id": d.id, "lat": d.lat, "lon": d.lon} for d in req.drones]
    true_pos = (req.trueSurvivorPos[0], req.trueSurvivorPos[1])

    # 1. Simulate arrival times
    arrival_times = simulate_arrival_times(
        drones_list, true_pos, noise_std_ns=req.noiseStdNs, seed=req.seed
    )

    # 2. Solve TDoA
    est_pos, residual_cost = solve_tdoa(drones_list, arrival_times)
    error_m = haversine_distance(*true_pos, *est_pos)

    # 3. Build beacon
    beacon = build_beacon(est_pos, error_m)

    # 4. Generate hyperbolas
    area_center = (
        np.mean([d["lat"] for d in drones_list]),
        np.mean([d["lon"] for d in drones_list]),
    )
    hyperbolas = {}
    n = len(drones_list)
    for i in range(n):
        for j in range(i + 1, n):
            dt_ij = arrival_times[i] - arrival_times[j]
            key = f"{drones_list[i]['id']}-{drones_list[j]['id']}"
            pts = generate_hyperbola(drones_list[i], drones_list[j], dt_ij, area_center)
            hyperbolas[key] = pts

    return {
        "drones": drones_list,
        "arrivalTimes": arrival_times,
        "estimatedPosition": [est_pos[0], est_pos[1]],
        "truePosition": [true_pos[0], true_pos[1]],
        "errorMeters": error_m,
        "beacon": beacon,
        "hyperbolas": hyperbolas,
        "residualCost": residual_cost
    }

