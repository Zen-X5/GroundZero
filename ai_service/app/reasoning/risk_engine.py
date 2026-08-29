from typing import List, Dict, Any, Tuple

def calculate_explainable_risk(
    environment: str,
    mobility_condition: str,
    opening_accessible: bool,
    flood_proximity_meters: float,
    flood_rising_rate_m_per_hr: float = 0.2,
    time_since_first_detected_mins: float = 0.0
) -> Tuple[float, Dict[str, Any]]:
    """
    Computes explainable risk score (0 - 100) and structured reasoning breakdown.
    Formula:
    Risk = (0.45 * EnvironmentalThreat + 0.35 * MobilityDeficit + 0.20 * Inaccessibility) * UrgencyMultiplier
    """
    reasoning: List[str] = []

    # 1. Environmental Threat (0 - 100)
    env_threat = 20.0
    if environment in ['WATER_RAFT', 'ROOF_FLOOD', 'TREE_PERCH']:
        env_threat = 75.0
        if flood_proximity_meters < 1.0:
            env_threat += 20.0
            reasoning.append("Immediate flood submergence threat (< 1.0m clearance)")
        if flood_rising_rate_m_per_hr > 0.15:
            env_threat += 5.0
            reasoning.append(f"Flood water rising rapidly ({flood_rising_rate_m_per_hr:.2f}m/hr)")
    elif environment in ['WINDOW_VOID', 'RUBBLE_SURFACE']:
        env_threat = 65.0
        reasoning.append("Structural instability and aftershock collapse risk in rubble/void")
    elif environment == 'ROAD_DEBRIS':
        env_threat = 40.0
        reasoning.append("Stranded in hazardous debris corridor")

    env_threat = min(env_threat, 100.0)

    # 2. Mobility Status (0 - 100, where 100 = completely immobile / trapped / injured)
    mobility_score = 30.0
    if mobility_condition == 'PRONE_INJURED':
        mobility_score = 95.0
        reasoning.append("Survivor detected in prone/injured posture with zero self-evacuation capability")
    elif mobility_condition == 'SITTING_HUDDLED':
        mobility_score = 70.0
        reasoning.append("Exhausted / trapped survivor clinging to perch with limited mobility")
    elif mobility_condition == 'STANDING_WAVING':
        mobility_score = 35.0
        reasoning.append("Survivor is mobile and actively signaling for extraction")

    # 3. Inaccessibility Score (0 - 100, where 100 = severely obstructed / confined)
    inaccessibility_score = 30.0
    if environment == 'WINDOW_VOID':
        if not opening_accessible:
            inaccessibility_score = 90.0
            reasoning.append("Access route is obstructed; requires specialized technical breach")
        else:
            inaccessibility_score = 65.0
            reasoning.append("Accessible only via upper-floor window void opening")
    elif environment == 'TREE_PERCH':
        inaccessibility_score = 60.0
        reasoning.append("Aerial basket or boat winch extraction required from tree canopy")
    elif environment == 'ROOF_FLOOD':
        inaccessibility_score = 35.0
        reasoning.append("Open roof surface suitable for direct helicopter/boat extraction")

    # 4. Urgency Multiplier (1.0 -> 1.5 based on elapsed time without rescue)
    urgency_multiplier = min(1.0 + (time_since_first_detected_mins / 120.0) * 0.5, 1.5)
    if urgency_multiplier > 1.15:
        reasoning.append(f"High wait time in hazardous zone ({time_since_first_detected_mins:.0f} mins)")

    # Weighted Calculation
    raw_risk = (0.45 * env_threat + 0.35 * mobility_score + 0.20 * inaccessibility_score) * urgency_multiplier
    final_risk_score = round(min(max(raw_risk, 0.0), 100.0), 1)

    details = {
        "environmentalThreat": round(env_threat, 1),
        "mobilityStatus": round(mobility_score, 1),
        "accessibilityScore": round(inaccessibility_score, 1),
        "urgencyMultiplier": round(urgency_multiplier, 2),
        "reasoning": reasoning
    }

    return final_risk_score, details
