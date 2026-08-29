# MASTER PROJECT SPECIFICATION

**PROJECT:** Ground-Zero Autonomous Swarm Rescue & Emergency Communication System  
**EVENT:** Prakriti Avinya 2026 (Disaster Management / Communication Blackout Track)

---

## 1. Executive Summary & Problem Statement
In the immediate aftermath of a severe earthquake accompanied by secondary urban flooding:
- Cellular base transceiver stations (BTS), electrical grids, fiber-optic backbones, and emergency hotlines are completely destroyed or offline.
- Survivors are trapped inside partially collapsed structures, debris fields, and rapidly rising rooftop flood zones.
- Incident commanders and first responders operate in complete information blackout without ground-truth visibility into survivor locations, accessibility, or life-threat severity.

**Ground-Zero** deploys an autonomous multi-drone aerial swarm that restores local communication, searches disaster sectors, fuses multi-spectral sensing, calculates risk-adjusted rescue priorities, and broadcasts situational awareness directly to a command Digital Twin.

---

## 2. Core Technological Pillars (SEE • CONNECT • DECIDE)

```
       +-------------------------------------------------------------+
       |                       DISASTER SCENE                        |
       |  (Earthquake rubble, rising floodwaters, damaged buildings) |
       +-------------------------------------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
   [ 1. SEE ]                                                [ 2. CONNECT ]
Autonomous Search & Sensor Fusion                         Self-Healing Mesh / MANET
- Multi-spectral (RGB + Thermal)                          - Drone-to-Drone relay links
- Multi-drone detection fusion                            - Local emergency Wi-Fi hotspot
- Building opening & void inspection                      - Resilient to node dropouts
         |                                                         |
         +----------------------------+----------------------------+
                                      |
                                      v
                                [ 3. DECIDE ]
                       AI Risk & Priority Engine
                       - Spatial-temporal de-duplication
                       - Multi-factor risk calculation
                       - Dynamic rescue priority queue
                       - Explainable AI reasoning
                                      |
                                      v
                        [ COMMAND DIGITAL TWIN ]
                 Real-time 2D/3D situational dashboard
```

---

## 3. System Architecture & Component Mapping

| Subsystem | Primary Tech Stack | Core Responsibilities |
| :--- | :--- | :--- |
| **Simulation & Swarm** | Gazebo, ROS 2, Python/C++ | Disaster world modeling, 5–10 drone models, sensor simulation (RGB, Thermal, LiDAR), sector allocation, collision avoidance, mesh network link simulation, dynamic disaster events. |
| **AI & Fusion Backend** | Python, FastAPI / WebSocket, OpenCV / PyTorch / NumPy | Sensor fusion, survivor confidence scoring, multi-drone spatial clustering, building opening & void inspection analysis, risk prioritization engine, explainability engine. |
| **Frontend & Digital Twin** | Modern Web (Vanilla JS/TS / React / Vite), Canvas / Leaflet / Three.js, WebSockets | Live disaster map, swarm telemetry, mesh topology graph, survivor heatmap, building inspection cards, prioritized rescue queue, live disaster alert feed, timeline scrubber. |

---

## 4. Scientific Constraints & Integrity Rules
- **No Concrete Penetration ("No X-Ray Fiction"):** Thermal and optical sensors cannot see through solid concrete or debris. 
- **Probabilistic Structural Inference:** For collapsed buildings, survivor probability must be derived from:
  1. Thermal plumes venting through windows, vents, or fissures.
  2. Audible/optical movement visible from unobstructed angles.
  3. Pre-disaster building occupancy estimates + structural damage assessment.
  4. Environmental threat vectors (rising water rate, structural collapse hazard).

---

## 5. End-to-End Demonstration Scenario
1. **Disaster Trigger:** Earthquake strikes; flooding begins; cellular towers fail.
2. **Swarm Launch:** 5–10 drones launch autonomously and establish an ad-hoc mesh.
3. **Sector Allocation:** Swarm partitions the disaster map into priority search grids.
4. **Perception & Multi-Angle Fusion:** Drones identify heat/visual signatures; multiple drones view the same target; AI fuses them into a single verified survivor entry.
5. **Building Inspection:** Drones orbit damaged buildings to inspect window openings and assess structural risk.
6. **Dynamic Disaster Escalation:** Flood level rises; one drone experiences simulated power loss; swarm autonomously shifts coverage to maintain mesh connectivity and rescue monitoring.
7. **Responder Action:** Command Digital Twin displays prioritized rescue queue with AI justifications (e.g. *"Survivor #4: High flood threat (+40%), trapped on lower floor opening (+30%), confidence 92%"*).
