# 🚨 Ground-Zero Swarm Rescue — Development Plan & Live TODO Tracker

> **Engineering Mandate:** Build vertically. Gazebo ➔ ROS 2 ➔ AI/Backend ➔ Frontend Digital Twin must work end-to-end starting from Phase 1.
>
> **Status Legend:**
> - `[ ]` **PENDING** (Not started)
> - `[/]` **IN PROGRESS** (Currently working)
> - `[x]` or `[DONE]` **COMPLETED** (Verified and working)

---

## 📊 Master Phase Matrix & Status Overview

| Phase | Bitupan (Simulation & Swarm) | Sahid (AI / Intelligence) | Rashel (Frontend / Digital Twin) | 🎯 Phase Goal | Overall Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **1. Foundation** | Setup pure Gazebo disaster world (water, buildings, windows, 35+ survivors). `[DONE]` | Setup NestJS backend + MongoDB Atlas schemas + WebSocket Gateway + FastAPI AI Service. `[DONE]` | Build dashboard: prioritized rescue queue, swarm grid, opening inspector, live alerts. `[DONE]` | End-to-End Vertical Pipeline | `[DONE]` |
| **2. Multi-Spectral Perception** | 3 multi-sensor drones with RGB optical & thermal camera & autonomous search flight. `[DONE]` | **Multi-Spectral Fusion:** YOLOv8 posture + FLIR heat extraction + Bayesian confidence ($85\%-98\%$) + Ray-projected GPS ground coordinates + NestJS push. `[DONE]` | Dual-Stream Multi-Spectral HUD view (RGB + FLIR split), live badges, and Explainable AI reasoning cards. `[DONE]` | Multi-spectral survivor verification with 0 false alarms | `[DONE]` |
| **3. Swarm Intelligence** | Implement multi-drone sector allocation, formation/coverage and collision avoidance. Drone-to-drone comms. `[DONE]` | Build detection fusion: multiple drones observing same survivor ➔ one unified detection. Priority score. | Show drone coverage circles, communication links, and priority heatmap. | Swarm behaves like one coordinated system | `[DONE]` |

| **4. Comms Blackout** | Simulate destroyed cellular towers / disconnected zones. Implement drone-to-drone relay/mesh concept. `[DONE]` | Track network connectivity & determine which drone can relay info. Handle delayed/missing data. `[DONE]` | Show LIVE network topology: 🟢 connected / 🔴 disconnected / 🟡 weak. `[DONE]` | System keeps working without cellular infrastructure | `[DONE]` |
| **5. Building Search** | Create damaged/collapsed buildings + accessible openings/windows. Drones navigate around structures. | Detect buildings ➔ identify openings ➔ analyze RGB/thermal observations ➔ estimate probability (No X-ray). | 3D building view + survivor probability + inspection status. | Autonomous building inspection | `[PENDING]` |
| **6. Disaster Dynamics** | Introduce changing flood levels, blocked routes, drone failure/battery loss, etc. | Recalculate risk and priorities dynamically as conditions change. | Live alerts: CRITICAL / HIGH / MEDIUM, timeline of events. | System adapts instead of following a fixed script | `[PENDING]` |
| **7. Final Integration**| Connect Gazebo ROS 2 topics ➔ backend. Stabilize swarm behavior. | Connect perception + fusion + risk engine + communication logic. | Connect every live data stream to Digital Twin. | One complete unified system | `[PENDING]` |
| **8. Final Polish** | Make simulation visually clean and reliable. | Prepare AI explanation: *why this survivor is priority #1*. | Make dashboard presentation-ready + replay/demo controls. | Competition-ready demo | `[PENDING]` |

---

## 🛠️ Phase-by-Phase Detailed Todo Checklist

---

### 📍 Phase 1: Foundation (End-to-End Vertical Pipeline)
*Goal: Gazebo ➔ ROS 2 ➔ AI/Backend ➔ Web Dashboard working with mock/preliminary data.*

- **Bitupan (Simulation & Disaster Environment):**
  - [x] `[DONE]` Setup Pure Gazebo Harmonic disaster world with terrain, elevated dry highway, and dynamic PBR flowing flood water (`simulation/worlds/disaster_night_world.sdf`).
  - [x] `[DONE]` Model damaged urban structures (Apartments, Commercial Tower, Warehouse, Clinic, Bank) with realistic multi-floor window voids and glass openings.
  - [x] `[DONE]` Generate 3D volumetric photorealistic human models (`human_standing_waving`, `human_sitting_clinging`, `human_prone_injured`) with PBR textures and thermal emissivity.
  - [x] `[DONE]` Populate 35+ realistic disaster survivors across roofs, window voids, road verges, and high tree branches in Sector A, Sector B flanks, and Sector C.
  - [x] `[DONE]` Spawn 2–3 quadcopter drone models in Gazebo (`simulation/models/rescue_drone/`).
  - [x] `[DONE]` Configure ROS 2 publishers for drone telemetry (`/drone_1/odometry`, `/drone_2/odometry`, `/drone_3/odometry`).
  - [x] `[DONE]` Publish preliminary camera topic stream (`/drone_1/camera/image_raw`, `/drone_2/camera/image_raw`, `/drone_3/camera/image_raw`).

- **Sahid (AI & Centralized Backend Intelligence):**
  - [x] `[DONE]` Initialize NestJS Centralized Backend + MongoDB Atlas integration (`backend/`).
  - [x] `[DONE]` Implement modular domain schemas:
    - **5 Core Collections:** `drones`, `survivors`, `network_topologies`, `building_inspections`, `hazards`
    - **5 Embedded Schemas:** `Position3D`, `SensorEvidence`, `ExplainableRiskBreakdown`, `AccessibleOpening`, `MeshLink`
  - [x] `[DONE]` Build real-time WebSocket Gateway (`EventsGateway`) broadcasting telemetry, detections, mesh topology, and alerts.
  - [x] `[DONE]` Build FastAPI AI microservice (`ai_service/`) with RGB+Thermal fusion and explainable risk calculation.

---

### 📍 Phase 2: Drone Perception & Multi-Spectral Sensing
*Goal: Multi-Spectral Fusion combining RGB Optical + Thermal LWIR (Infrared) + LiDAR to find and verify survivors without claiming concrete X-ray vision.*

> **🔬 Multi-Spectral Fusion Concept:**
> Autonomous aerial fusion combining **RGB Optical imagery** (human posture, waving, clothing), **Thermal Long-Wave Infrared (LWIR)** ($36.5^\circ\text{C}-37.5^\circ\text{C}$ body heat signatures contrasting with cold $12^\circ\text{C}$ floodwater/concrete), and **LiDAR depth clearance** into a unified Bayesian confidence score ($0.0 \rightarrow 1.0$) with zero false alarms from hot debris or unheated mannequins.

- **Bitupan (Simulation & Swarm):**
  - [x] `[DONE]` Add RGB optical camera plugin to drone models in Gazebo (`/drone_1/camera/image_raw`, `/drone_2/camera/image_raw`, `/drone_3/camera/image_raw`).
  - [x] `[DONE]` Add high-resolution thermal / IR camera stream (`/drone_1/thermal_camera/image_raw`, `/drone_2/thermal_camera/image_raw`, `/drone_3/thermal_camera/image_raw`).
  - [x] `[DONE]` Implement stable autonomous flight controllers (`drone_scan_controller.py`: Lawnmower search grid, Highway patrol, 16m standoff orbital window inspections).

- **Sahid (AI & Intelligence):**
  - [x] `[DONE]` Implement visual human detection on optical frames with posture analysis (`STANDING_WAVING`, `SITTING_HUDDLED`, `PRONE_INJURED`).
  - [x] `[DONE]` Implement radiometric thermal heat extraction (FLIR Inferno false-color colormap, $37^\circ\text{C}$ body heat clustering).
  - [x] `[DONE]` **Multi-Spectral Fusion Engine:** Real-time spatial IoU overlap, Bayesian confidence estimation ($85\%-98\%$), and live keyboard drone switching (`1`, `2`, `3`).
  - [x] `[DONE]` Calculate exact Ground GPS / $(X, Y, Z)$ coordinates from camera ray projection + drone altitude + gimbal pitch angle.
  - [x] `[DONE]` Push validated survivor records into NestJS backend schema (`POST /survivors/detection`).

- **Rashel (Frontend & Digital Twin):**
  - [x] `[DONE]` Build Multi-Spectral Dual-Stream Aerial HUD view (RGB Optical side-by-side with FLIR Thermal IR).
  - [x] `[DONE]` Display live survivor detection markers with real-time confidence badges, risk breakdown, and posture tags.
  - [x] `[DONE]` Build Explainable AI Survivor Detail Modal with sensor evidence sliders and priority rankings.
  - [x] `[DONE]` Live WebSocket streaming updates the Prioritized Rescue Queue and alert ticker with real-time GPS coordinates.

---

### 📍 Phase 3: Swarm Intelligence & Coordinated Search
*Goal: Swarm autonomously divides search sectors, avoids collisions, and fuses multi-drone observations.*

- **Bitupan (Simulation & Swarm):**
  - [x] `[DONE]` Scale simulation up to 5–10 active autonomous drones.
  - [x] `[DONE]` Implement autonomous sector allocation (Grid partitioning / Voronoi coverage).
  - [x] `[DONE]` Implement inter-drone collision avoidance and minimum distance buffers.
  - [x] `[DONE]` Simulate peer-to-peer radio packet exchange between drones.

- **Sahid (AI & Intelligence):**
  - [x] `[x]` Build multi-drone spatial-temporal fusion: merge overlapping detections of the same survivor into a single verified target.
  - [x] `[x]` Boost survivor confidence score when multiple independent drones confirm the sighting.
  - [x] `[x]` Calculate initial survivor priority ranking based on initial sensor data.

- **Rashel (Frontend & Digital Twin):**
  - [x] `[x]` Render drone coverage search circles / sector polygons in real-time.
  - [x] `[x]` Render all active drones with orientation headings, speed, and altitude.
  - [x] `[x]` Animate inter-drone communication links and pulse lines.
  - [x] `[x]` Display live prioritized survivor heatmap.

---

### 📍 Phase 4: Communication Blackout & Ad-Hoc Mesh (MANET)
*Goal: Complete cellular failure simulation; swarm forms self-healing aerial relay network.*

- **Bitupan (Simulation & Swarm):**
  - [x] `[DONE]` Simulate total ground cellular tower blackout (zero base station signal).
  - [x] `[DONE]` Implement radio distance/obstacle attenuation model for drone-to-drone links.
  - [x] `[DONE]` Program relay drone positioning behavior (drones autonomously hovering as communication bridges).

- **Sahid (AI & Intelligence):**
  - [x] `[x]` Maintain live swarm network adjacency matrix & routing graph.
  - [x] `[x]` Track connected vs. disconnected drones; determine best multi-hop relay routes.
  - [x] `[x]` Implement edge caching: store detections on disconnected drones and flush upon reconnect.

- **Rashel (Frontend & Digital Twin):**
  - [x] `[x]` Build Live Mesh Network Topology visualizer widget:
    - 🟢 **Green:** Connected / High-throughput link
    - 🟡 **Yellow:** Weak / Multi-hop relay link
    - 🔴 **Red:** Disconnected / Out of range
  - [x] `[x]` Visualize emergency Wi-Fi hotspot coverage bubbles available for ground survivors.

---

### 📍 Phase 5: Building Search & Opening Inspection
*Goal: Autonomous multi-angle inspection of damaged structures without claiming concrete X-ray vision.*

- **Bitupan (Simulation & Swarm):**
  - [ ] `[ ]` Build damaged/collapsed structures with accessible windows, voids, and fissures.
  - [ ] `[ ]` Program orbital inspection flight maneuvers allowing drones to circle buildings at multiple altitudes and angles.

- **Sahid (AI & Intelligence):**
  - [ ] `[ ]` Implement damaged building detection & perimeter opening identification.
  - [ ] `[ ]` Analyze RGB + Thermal feeds across multiple viewing angles.
  - [ ] `[ ]` Compute probabilistic survivor likelihood based on venting heat, motion near openings, and structural damage (strictly adhering to scientific rules).

- **Rashel (Frontend & Digital Twin):**
  - [ ] `[ ]` Build 3D / Isometric Building Inspection UI card.
  - [ ] `[ ]` Display inspection completion status, angles surveyed, and estimated survivor probability.

---

### 📍 Phase 6: Disaster Dynamics & Dynamic Re-Ranking
*Goal: Swarm and AI dynamically adapt to rising flood waters, road blockages, and drone losses.*

- **Bitupan (Simulation & Swarm):**
  - [ ] `[ ]` Trigger dynamic flood rise: water plane elevation increases dynamically during simulation.
  - [ ] `[ ]` Trigger dynamic road blockage / secondary structural collapse events.
  - [ ] `[ ]` Trigger drone battery depletion or communication node failure mid-operation.

- **Sahid (AI & Intelligence):**
  - [ ] `[ ]` Dynamically recalculate survivor risk scores based on proximity to rising flood levels.
  - [ ] `[ ]` Automatically reorder the Rescue Priority Queue as threats escalate.
  - [ ] `[ ]` Reconfigure swarm task allocation when a drone goes offline or disconnects.

- **Rashel (Frontend & Digital Twin):**
  - [ ] `[ ]` Build Real-Time Emergency Alert Ticker (`CRITICAL`, `HIGH`, `MEDIUM`).
  - [ ] `[ ]` Live animated update of the Prioritized Rescue Queue with rising threat tags.
  - [ ] `[ ]` Render dynamic flood layer expansion on the disaster map.

---

### 📍 Phase 7: Full Pipeline Integration
*Goal: Gazebo ➔ ROS 2 ➔ AI Perception/Fusion ➔ Backend ➔ Digital Twin working seamlessly in real time.*

- **Bitupan (Simulation & Swarm):**
  - [ ] `[ ]` Bridge all Gazebo simulation streams directly into standard ROS 2 topics.
  - [ ] `[ ]` Stabilize multi-drone physics and search loops for long-duration demo runs.

- **Sahid (AI & Intelligence):**
  - [ ] `[ ]` Connect perception, multi-drone fusion, risk prioritization, and network graph engines.
  - [ ] `[ ]` Stream unified operational state via WebSocket at $\ge 10\text{ Hz}$.

- **Rashel (Frontend & Digital Twin):**
  - [ ] `[ ]` Bind all UI panels, maps, network graphs, and queues to the live WebSocket stream.
  - [ ] `[ ]` Ensure smooth 60 FPS performance without frame drops.

---

### 📍 Phase 8: Final Polish & Competition Demo Mode
*Goal: Competition-ready demonstration with explainable AI reasoning and interactive controls.*

- **Bitupan (Simulation & Swarm):**
  - [ ] `[ ]` Polish environment visual realism (textures, lighting, water reflections).
  - [ ] `[ ]` Create single-command demo launch script (`launch_demo.sh` / `.bat`).

- **Sahid (AI & Intelligence):**
  - [ ] `[ ]` Implement Explainable AI (XAI) rationale generation (e.g., *"Survivor #1 prioritized: 15cm from flood water, trapped on ground floor, 94% confidence"*).
  - [ ] `[ ]` Verify robust error handling against missing or corrupted sensor packets.

- **Rashel (Frontend & Digital Twin):**
  - [ ] `[ ]` Add Demo Scenario Controls (Play / Pause / Inject Flood / Kill Drone / Reset).
  - [ ] `[ ]` Add Timeline / Event Replay scrubber.
  - [ ] `[ ]` Polish layout aesthetics, fonts, and responsive display.
