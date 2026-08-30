"""
TDoA (Time Difference of Arrival) Survivor Geolocation — 3-Drone Simulation
=============================================================================

Simulates 3 drones acting as reference receivers to triangulate the position
of a phone/signal source (survivor) using TDoA multilateration.

Pipeline:
  1. Define 3 drone positions (wide triangular spread) + a "true" survivor position
  2. Forward-simulate signal arrival times at each drone (haversine distance -> time)
  3. Add realistic timing noise (stand-in for imperfect clock sync)
  4. Solve for estimated survivor position via least-squares on pairwise TDoA
  5. Generate hyperbola point-sets (for animation) per drone pair
  6. Output a geotagged beacon object

Run directly:  python3 tdoa_locator.py
"""

import numpy as np
from scipy.optimize import least_squares
from datetime import datetime, timezone
import json

# ------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------
C = 3e8              # speed of RF signal propagation, m/s
EARTH_RADIUS = 6371000.0  # meters


# ------------------------------------------------------------------
# 1. Distance utilities
# ------------------------------------------------------------------
def haversine_distance(lat1, lon1, lat2, lon2):
    """Great-circle distance in meters between two lat/lon points."""
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    c = 2 * np.arcsin(np.sqrt(a))
    return EARTH_RADIUS * c


def latlon_offset_meters(lat, lon, north_m, east_m):
    """Offset a lat/lon point by a given number of meters north/east.
    Used only for generating hyperbola sample points on a local grid."""
    dlat = north_m / EARTH_RADIUS
    dlon = east_m / (EARTH_RADIUS * np.cos(np.radians(lat)))
    return lat + np.degrees(dlat), lon + np.degrees(dlon)


# ------------------------------------------------------------------
# 2. Forward simulation: generate synthetic arrival times
# ------------------------------------------------------------------
def simulate_arrival_times(drones, survivor_pos, noise_std_ns=10.0, seed=None):
    """
    drones: list of dicts [{"id":"D1","lat":..,"lon":..}, ...]
    survivor_pos: (lat, lon)
    noise_std_ns: Gaussian timing noise std dev, in nanoseconds

    Returns: list of arrival times (seconds, float) aligned to `drones` order
    """
    rng = np.random.default_rng(seed)
    slat, slon = survivor_pos
    arrival_times = []
    for d in drones:
        dist = haversine_distance(d["lat"], d["lon"], slat, slon)
        t_true = dist / C
        noise = rng.normal(0, noise_std_ns * 1e-9)  # ns -> s
        arrival_times.append(t_true + noise)
    return arrival_times


# ------------------------------------------------------------------
# 3. TDoA least-squares solver
# ------------------------------------------------------------------
def tdoa_residuals(candidate, drones, observed_dt, ref_idx=0):
    """
    candidate: [lat, lon] guess
    observed_dt: list of (i, j, dt_ij) pairwise observed time differences
    Residual = (predicted t_i - t_j) - (observed t_i - t_j), scaled to distance units
    """
    clat, clon = candidate
    predicted_times = [
        haversine_distance(d["lat"], d["lon"], clat, clon) / C for d in drones
    ]
    residuals = []
    for (i, j, dt_obs) in observed_dt:
        dt_pred = predicted_times[i] - predicted_times[j]
        # scale residual from seconds to meters (x C) so the optimizer's
        # error tolerance behaves consistently regardless of units
        residuals.append((dt_pred - dt_obs) * C)
    return residuals


def solve_tdoa(drones, arrival_times, initial_guess=None):
    """
    drones: list of {"id","lat","lon"}
    arrival_times: list of floats (seconds), aligned to drones order

    Returns: (est_lat, est_lon), residual_cost
    """
    n = len(drones)
    pairwise_dt = []
    for i in range(n):
        for j in range(i + 1, n):
            pairwise_dt.append((i, j, arrival_times[i] - arrival_times[j]))

    if initial_guess is None:
        # start guess = centroid of the 3 drones
        initial_guess = [
            np.mean([d["lat"] for d in drones]),
            np.mean([d["lon"] for d in drones]),
        ]

    # Assume ground-level altitude (alt=0) for the survivor — solving 2D (lat, lon) only, not 3D.
    # This simplification avoids height-ambiguity degeneracies when solving with flat, coplanar drone perches.
    result = least_squares(
        tdoa_residuals,
        initial_guess,
        args=(drones, pairwise_dt),
        method="lm",  # Levenberg-Marquardt, good for small well-posed problems
    )
    est_lat, est_lon = result.x
    residual_cost = float(np.sqrt(np.sum(result.fun ** 2)))  # meters-scale residual
    return (est_lat, est_lon), residual_cost


# ------------------------------------------------------------------
# 4. Hyperbola generation (for animation layer)
# ------------------------------------------------------------------
def generate_hyperbola(drone_a, drone_b, dt_ab, area_center, half_extent_m=2000, n_points=250):
    """
    Generates sample points approximating the TDoA hyperbola (locus of points
    with constant time-difference-of-arrival dt_ab between drone_a and drone_b).

    This uses the parametric cosh/sinh representation for the specific branch
    implied by the sign of dt_ab, resulting in a smooth, continuous path.
    """
    lat0, lon0 = area_center

    # Convert coordinates to relative meters from area_center
    cos_lat = np.cos(np.radians(lat0))
    
    pos_a_x = (drone_a["lon"] - lon0) * 111139.0 * cos_lat
    pos_a_y = (drone_a["lat"] - lat0) * 111320.0
    
    pos_b_x = (drone_b["lon"] - lon0) * 111139.0 * cos_lat
    pos_b_y = (drone_b["lat"] - lat0) * 111320.0

    dx = pos_b_x - pos_a_x
    dy = pos_b_y - pos_a_y
    dist = np.sqrt(dx * dx + dy * dy)
    c = dist / 2.0

    # 2a = C * dt
    a = (C * dt_ab) / 2.0

    # Clip to avoid imaginary numbers if timing noise is larger than spacing
    max_a = c * 0.99
    if abs(a) >= c:
        a = np.sign(a) * max_a

    b = np.sqrt(c * c - a * a)

    mid_x = (pos_a_x + pos_b_x) / 2.0
    mid_y = (pos_a_y + pos_b_y) / 2.0
    phi = np.atan2(dy, dx)

    points = []
    # Parametric sweep t to trace the curve branch
    t_vals = np.linspace(-2.2, 2.2, n_points)
    for t in t_vals:
        xp = a * np.cosh(t)
        yp = b * np.sinh(t)

        x = mid_x + xp * np.cos(phi) - yp * np.sin(phi)
        y = mid_y + xp * np.sin(phi) + yp * np.cos(phi)

        lat = lat0 + y / 111320.0
        lon = lon0 + x / (111139.0 * cos_lat)
        points.append({"lat": float(lat), "lon": float(lon)})

    return points



# ------------------------------------------------------------------
# 5. Confidence + beacon formatting
# ------------------------------------------------------------------
def error_to_confidence(error_m):
    if error_m < 20:
        return "high"
    elif error_m < 100:
        return "medium"
    else:
        return "low"


def build_beacon(est_pos, error_m, beacon_id="B-TDOA-001"):
    return {
        "beacon_id": beacon_id,
        "lat": round(est_pos[0], 6),
        "lon": round(est_pos[1], 6),
        "confidence": error_to_confidence(error_m),
        "source": "tdoa_drone_triangulation",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "estimated_error_meters": round(error_m, 2),
    }


# ------------------------------------------------------------------
# 6. Full pipeline runner
# ------------------------------------------------------------------
def run_simulation(drones, true_survivor_pos, noise_std_ns=10.0, seed=42):
    print("=" * 60)
    print("TDoA 3-DRONE SURVIVOR GEOLOCATION — SIMULATION RUN")
    print("=" * 60)

    print("\nDrone positions:")
    for d in drones:
        print(f"  {d['id']}: lat={d['lat']:.6f}, lon={d['lon']:.6f}")

    print(f"\nTrue survivor position: lat={true_survivor_pos[0]:.6f}, "
          f"lon={true_survivor_pos[1]:.6f}")

    # Step 1: forward-simulate arrival times
    arrival_times = simulate_arrival_times(
        drones, true_survivor_pos, noise_std_ns=noise_std_ns, seed=seed
    )
    print("\nSimulated arrival times (seconds since signal emission):")
    for d, t in zip(drones, arrival_times):
        print(f"  {d['id']}: t = {t*1e6:.4f} microseconds")

    print("\nPairwise time differences (TDoA):")
    n = len(drones)
    for i in range(n):
        for j in range(i + 1, n):
            dt = arrival_times[i] - arrival_times[j]
            print(f"  dt({drones[i]['id']}-{drones[j]['id']}) = {dt*1e9:.2f} ns")

    # Step 2: solve
    est_pos, residual_cost = solve_tdoa(drones, arrival_times)
    error_m = haversine_distance(*true_survivor_pos, *est_pos)

    print("\n--- RESULT ---")
    print(f"Estimated position:  lat={est_pos[0]:.6f}, lon={est_pos[1]:.6f}")
    print(f"True position:       lat={true_survivor_pos[0]:.6f}, "
          f"lon={true_survivor_pos[1]:.6f}")
    print(f"Position error:      {error_m:.2f} meters")
    print(f"Solver residual cost: {residual_cost:.4f} (meters-scale)")

    # Step 3: geotag beacon
    beacon = build_beacon(est_pos, error_m)
    print("\nGeotagged beacon output:")
    print(json.dumps(beacon, indent=2))

    # Step 4: hyperbolas (for animation layer — just report point counts here)
    print("\nGenerating hyperbolas for animation...")
    area_center = (
        np.mean([d["lat"] for d in drones]),
        np.mean([d["lon"] for d in drones]),
    )
    hyperbolas = {}
    for i in range(n):
        for j in range(i + 1, n):
            dt_ij = arrival_times[i] - arrival_times[j]
            key = f"{drones[i]['id']}-{drones[j]['id']}"
            pts = generate_hyperbola(drones[i], drones[j], dt_ij, area_center)
            hyperbolas[key] = pts
            print(f"  Hyperbola {key}: {len(pts)} points generated")

    return {
        "drones": drones,
        "arrival_times": arrival_times,
        "estimated_position": est_pos,
        "true_position": true_survivor_pos,
        "error_meters": error_m,
        "beacon": beacon,
        "hyperbolas": hyperbolas,
    }


# ------------------------------------------------------------------
# Demo entry point
# ------------------------------------------------------------------
if __name__ == "__main__":
    # Example: disaster zone roughly centered near Guwahati, Assam
    drones = [
        {"id": "Drone-A", "lat": 26.1445, "lon": 91.7362},
        {"id": "Drone-B", "lat": 26.1600, "lon": 91.7550},
        {"id": "Drone-C", "lat": 26.1300, "lon": 91.7600},
    ]

    true_survivor_pos = (26.1480, 91.7500)  # somewhere inside the triangle

    result = run_simulation(drones, true_survivor_pos, noise_std_ns=10.0, seed=42)

    print("\n" + "=" * 60)
    print("Run complete. Full result dict (incl. hyperbola points) is")
    print("available in `result` for wiring into a frontend/API layer.")
    print("=" * 60)
