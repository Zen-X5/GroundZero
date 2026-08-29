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
| **1. Foundation** | Setup pure Gazebo disaster world (water, buildings, windows, 35+ survivors). | Setup NestJS backend + MongoDB Atlas schemas + WebSocket Gateway + FastAPI AI Service. `[DONE]` | Build dashboard skeleton: map, survivor markers, risk queue, basic panels. | Backend ➔ AI ➔ Web working end-to-end | `[IN PROGRESS]` |
| **2. Drone Perception** | Add RGB/thermal camera simulation, drone movement and basic flight control. | Implement person detection + thermal/RGB fusion. Generate survivor coordinates/confidence. | Display live detections and survivor locations on map. | Drones can actually find potential survivors | `[PENDING]` |
| **3. Swarm Intelligence** | Implement multi-drone sector allocation, formation/coverage and collision avoidance. Drone-to-drone comms. | Build detection fusion: multiple drones observing same survivor ➔ one unified detection. Priority score. | Show drone coverage circles, communication links, and priority heatmap. | Swarm behaves like one coordinated system | `[PENDING]` |
| **4. Comms Blackout** | Simulate destroyed cellular towers / disconnected zones. Implement drone-to-drone relay/mesh concept. | Track network connectivity & determine which drone can relay info. Handle delayed/missing data. | Show LIVE network topology: 🟢 connected / 🔴 disconnected / 🟡 weak. | System keeps working without cellular infrastructure | `[PENDING]` |
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

- **Rashel (Frontend & Digital Twin):**
  - [ ] `[ ]` Initialize high-tech dark mode dashboard interface with glassmorphic cards.
  - [ ] `[ ]` Integrate live 2D/3D map (Leaflet / MapLibre / Three.js).
  - [ ] `[ ]` Connect WebSocket client to backend service.
  - [ ] `[ ]` Render real-time moving drone markers and preliminary survivor beacon pins on map.

---

### 📍 Phase 2: Drone Perception & Multi-Spectral Sensing
*Goal: Drones search and generate realistic RGB + Thermal survivor detections.*

- **Bitupan (Simulation & Swarm):**
  - [ ] `[ ]` Add RGB optical camera plugin to drone models in Gazebo.
  - [ ] `[ ]` Add simulated thermal / IR sensor plugin (temperature gradient map / IR signature).
  - [ ] `[ ]` Implement stable low-altitude flight paths & hover controllers for area scanning.

- **Sahid (AI & Intelligence):**
  - [ ] `[ ]` Implement visual human detection on optical frames (YOLO / OpenCV contour / posture model).
  - [ ] `[ ]` Implement thermal signature extractor (hotspot thresholding & body heat clustering).
  - [ ] `[ ]` Build RGB + Thermal fusion scoring: compute combined survivor confidence score ($0.0 \rightarrow 1.0$).
  - [ ] `[ ]` Output calibrated GPS / World coordinates for detected survivors.

- **Rashel (Frontend & Digital Twin):**
  - [ ] `[ ]` Display live survivor detection markers with real-time confidence % badges.
  - [ ] `[ ]` Implement survivor density heatmap overlay layer on the disaster map.
  - [ ] `[ ]` Build Survivor Detail Drawer showing RGB & Thermal inspection thumbnails.

---

### 📍 Phase 3: Swarm Intelligence & Coordinated Search
*Goal: Swarm autonomously divides search sectors, avoids collisions, and fuses multi-drone observations.*

- **Bitupan (Simulation & Swarm):**
  - [ ] `[ ]` Scale simulation up to 5–10 active autonomous drones.
  - [ ] `[ ]` Implement autonomous sector allocation (Grid partitioning / Voronoi coverage).
  - [ ] `[ ]` Implement inter-drone collision avoidance and minimum distance buffers.
  - [ ] `[ ]` Simulate peer-to-peer radio packet exchange between drones.

- **Sahid (AI & Intelligence):**
  - [ ] `[ ]` Build multi-drone spatial-temporal fusion: merge overlapping detections of the same survivor into a single verified target.
  - [ ] `[ ]` Boost survivor confidence score when multiple independent drones confirm the sighting.
  - [ ] `[ ]` Calculate initial survivor priority ranking based on initial sensor data.

- **Rashel (Frontend & Digital Twin):**
  - [ ] `[ ]` Render drone coverage search circles / sector polygons in real-time.
  - [ ] `[ ]` Render all active drones with orientation headings, speed, and altitude.
  - [ ] `[ ]` Animate inter-drone communication links and pulse lines.
  - [ ] `[ ]` Display live prioritized survivor heatmap.

---

### 📍 Phase 4: Communication Blackout & Ad-Hoc Mesh (MANET)
*Goal: Complete cellular failure simulation; swarm forms self-healing aerial relay network.*

- **Bitupan (Simulation & Swarm):**
  - [ ] `[ ]` Simulate total ground cellular tower blackout (zero base station signal).
  - [ ] `[ ]` Implement radio distance/obstacle attenuation model for drone-to-drone links.
  - [ ] `[ ]` Program relay drone positioning behavior (drones autonomously hovering as communication bridges).

- **Sahid (AI & Intelligence):**
  - [ ] `[ ]` Maintain live swarm network adjacency matrix & routing graph.
  - [ ] `[ ]` Track connected vs. disconnected drones; determine best multi-hop relay routes.
  - [ ] `[ ]` Implement edge caching: store detections on disconnected drones and flush upon reconnect.

- **Rashel (Frontend & Digital Twin):**
  - [ ] `[ ]` Build Live Mesh Network Topology visualizer widget:
    - 🟢 **Green:** Connected / High-throughput link
    - 🟡 **Yellow:** Weak / Multi-hop relay link
    - 🔴 **Red:** Disconnected / Out of range
  - [ ] `[ ]` Visualize emergency Wi-Fi hotspot coverage bubbles available for ground survivors.

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
