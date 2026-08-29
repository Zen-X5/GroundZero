# AGENTS.md — Ground-Zero Autonomous Swarm Rescue & Emergency Communication System

## 🚨 MANDATORY CONTEXT FOR AI AGENTS
Every agent starting a session in this repository **MUST** read and adhere to the project constraints, architectural mandates, and team workflows defined below.

---

### 📌 PROJECT MISSION
**Project:** Ground-Zero Autonomous Swarm Rescue & Emergency Communication System  
**Event / Context:** Prakriti Avinya 2026 — Ground-Zero Communication Blackout  
**Core Problem:** Severe earthquake causing structural collapse and urban flooding. Cellular infrastructure, power substations, fiber lines, and emergency hotlines are dead. First responders lack visibility into survivor locations or rescue priority.

### 🎯 THE THREE PILLARS (KEY DIFFERENTIATOR)
Do NOT treat this as just "drones with thermal cameras". This is:
> **"A self-organizing aerial emergency network that restores local communication, searches disaster zones, fuses multi-drone intelligence, and continuously prioritizes survivors for rescue when ground communication infrastructure has failed."**

1. **SEE:** Find and map potential survivors using simulated RGB + thermal sensing.
2. **CONNECT:** Maintain ad-hoc drone-to-drone mesh (MANET) communication and provide local emergency Wi-Fi without cellular towers.
3. **DECIDE:** Fuse multi-drone detections, inspect building openings, calculate risk scores, and dynamically prioritize rescue queues.

---

### 🔬 CRITICAL SCIENTIFIC CONSTRAINT
- **NEVER claim drones can see through concrete or solid walls.**
- Thermal / RGB sensors cannot penetrate thick concrete.
- For collapsed structures, estimate survivor probability through:
  - Accessible openings / windows / voids
  - Multi-angle drone inspection
  - Structural damage severity and building classification
  - Environmental threat proximity (flood levels, fire, structural instability)

---

### ⚙️ VERTICAL INTEGRATION PRINCIPLE (MANDATORY)
- **Always build vertically.** Never develop modules in isolation for days without pipeline integration.
- **Continuous pipeline:** `Gazebo Simulation` ➔ `ROS 2 Bridge` ➔ `AI / Fusion Engine` ➔ `Backend / WebSocket` ➔ `Digital Twin Frontend`.
- **Start with Phase 1 dummy data end-to-end** before swapping in complex logic.

---

### 👥 TEAM DIVISION & ROLES
1. **Bitupan — Simulation, Drone Control & Swarm**
   - Gazebo disaster environment (collapsed buildings, flood water levels, obstacles).
   - Multi-drone spawning (5–10 drones), kinematics, and sensor plugins (RGB, Thermal, LiDAR/Depth).
   - Swarm sector allocation, collision avoidance, and drone-to-drone mesh/MANET communication simulation.
   - Dynamic disaster triggers (flood rising, road blockage, drone battery loss, node failure).

2. **Sahid — AI, Intelligence & Data Fusion**
   - AI backend services and schema definitions (`Survivor`, `Detection`, `RiskScore`, `NetworkNode`).
   - RGB + Thermal sensor fusion and survivor confidence scoring.
   - Multi-drone spatial-temporal detection fusion (de-duplicating multi-angle observations into single unified survivor records).
   - Building damage & opening accessibility intelligence; survivor probability modeling.
   - Risk calculation & dynamic rescue priority ranking with explainable AI reasoning.

3. **Rashel — Frontend, Digital Twin & Visualization**
   - Real-time Web Digital Twin / Dashboard.
   - Live 2D/3D map showing drone positions, coverage zones, survivor heatmaps, and building inspection states.
   - Mesh network topology visualization (Green = Connected, Yellow = Degraded, Red = Disconnected).
   - Rescue priority queue, real-time alert feed, and simulation timeline/replay.

---

### 📁 KEY DOCUMENTS
- **Full Roadmap & Split Todo List:** [`TODO_TEAM_ROADMAP.md`](file:///d:/GroundZero/TODO_TEAM_ROADMAP.md)
- **Project Master Specification:** [`PROJECT_MASTER.md`](file:///d:/GroundZero/PROJECT_MASTER.md)
