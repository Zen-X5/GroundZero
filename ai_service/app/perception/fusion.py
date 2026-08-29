from typing import Optional, List, Dict, Any
import numpy as np

def fuse_sensor_modalities(
    rgb_conf: Optional[float] = None,
    thermal_conf: Optional[float] = None,
    lidar_evidence: Optional[float] = None,
    motion_conf: Optional[float] = None
) -> float:
    """
    Fuses available sensor modalities using weighted Bayesian evidence combination.
    Does not require all sensors to be present simultaneously.
    """
    weights = []
    values = []

    if rgb_conf is not None:
        weights.append(0.35)
        values.append(rgb_conf)
    if thermal_conf is not None:
        weights.append(0.40)  # Thermal carries high weight in blackout / low-light
        values.append(thermal_conf)
    if lidar_evidence is not None:
        weights.append(0.15)
        values.append(lidar_evidence)
    if motion_conf is not None:
        weights.append(0.10)
        values.append(motion_conf)

    if not values:
        return 0.5  # Neutral default

    norm_weights = np.array(weights) / sum(weights)
    fused_score = float(np.dot(norm_weights, np.array(values)))
    return round(min(max(fused_score, 0.0), 1.0), 3)


def calculate_multi_drone_boost(drone_count: int, base_confidence: float) -> float:
    """
    Multi-drone agreement boost:
    When 2 or more independent drones verify the sighting, confidence increases logarithmically.
    """
    if drone_count <= 1:
        return base_confidence
    boost = 1.0 - ((1.0 - base_confidence) * (0.6 ** (drone_count - 1)))
    return round(min(boost, 0.99), 3)
