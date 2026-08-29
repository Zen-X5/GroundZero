# 🚁 Ground-Zero Simulation (Bitupan Track)

This package contains the **Gazebo Harmonic** night disaster simulation world, multi-drone models, and **ROS 2 Jazzy** bridge configuration for the Ground-Zero Swarm Rescue System.

---

## 🗺️ World Architecture: $200\text{m} \times 100\text{m}$ Disaster Flood & Evacuation Corridor

1. **Sector A ($0\text{m} \le x < 70\text{m}$): Deep Inundation Lake ($z = 2.2\text{m}$)**
   - Fully submerged residential zone with 10 submerged trees, 2 submerged houses, floating pallet raft, and oil barrels.
   - Inflatable rescue boat with blue emergency beacon.
   - **Survivors:** Tree 1 $(z=4.8)$, Tree 2 $(z=5.0)$, Roof Apex $(z=3.8)$, Rescue Raft $(z=2.8)$.

2. **Sector B ($70\text{m} \le x < 130\text{m}$): Elevated Dry Highway Corridor (NO WATER ON ROAD)**
   - An elevated asphalt embankment ($z = 1.4\text{m}$) rising above the water table as an emergency evacuation arterial.
   - Guardrails, yellow highway lines, and abandoned/wrecked vehicles (SUV, sedan, van, container).
   - **Survivor #5:** Trapped on the hood of a stranded pickup truck on the road $(x=105.0, y=50.0, z=3.1)$.

3. **Sector C ($130\text{m} \le x \le 200\text{m}$): Flooded Urban Streets ($z = 0.85\text{m}$)**
   - Floodwaters inundate all urban streets, alleyways, and surround all 6 building foundations.
   - **6 Buildings in Water:**
     - **Building 1 (Apartments):** 1st-floor window aperture with **Survivor #6 inside** $(x=155.0, y=28.5, z=4.5)$.
     - **Building 2 (Commercial Tower):** 14m high-rise with **Survivor #7 on rooftop deck** $(x=148.0, y=74.0, z=14.9)$.
     - **Building 3 (Collapsed Rubble):** Concrete slab pile (**0 survivors - Negative control**).
     - **Building 4 (Warehouse):** Industrial hall with collapsed metal roof.
     - **Building 5 (Medical Clinic):** Structure with red cross emblem.
     - **Building 6 (Bank):** Tilted structure with cracked balcony.
   - Streetlights, urban debris clusters, and red emergency hazard strobe.

---

## 🚀 How to Build & Run in WSL2 / Ubuntu (ROS 2 Jazzy)

### 1. Prerequisites
Ensure you have ROS 2 Jazzy and Gazebo Harmonic installed:
```bash
sudo apt update
sudo apt install -y ros-jazzy-ros-gz ros-jazzy-ros-gz-sim ros-jazzy-ros-gz-bridge
```

### 2. Build the Workspace
From your ROS 2 workspace root (e.g. `~/groundzero_ws` or your mapped repository):
```bash
# Source ROS 2 Jazzy
source /opt/ros/jazzy/setup.bash

# Build the simulation package
colcon build --packages-select simulation

# Source the workspace
source install/setup.bash
```

### 3. Set Gazebo Resource Paths & Launch
```bash
export GZ_SIM_RESOURCE_PATH=$GZ_SIM_RESOURCE_PATH:$(ros2 pkg prefix simulation)/share/simulation/models

# Launch Gazebo world, 3 drones, and ROS 2 bridge
ros2 launch simulation disaster_sim.launch.py
```

---

## 📡 Live ROS 2 Topics Published

| Drone | Telemetry / Odom | RGB Camera Stream | Control Velocity |
| :--- | :--- | :--- | :--- |
| **Drone 1 (Flood)** | `/drone_1/odometry` | `/drone_1/camera/image_raw` | `/drone_1/cmd_vel` |
| **Drone 2 (Relay)** | `/drone_2/odometry` | `/drone_2/camera/image_raw` | `/drone_2/cmd_vel` |
| **Drone 3 (Urban)** | `/drone_3/odometry` | `/drone_3/camera/image_raw` | `/drone_3/cmd_vel` |

---

## 🧪 Testing Drones from Terminal

Test sending a hover/move command to Drone 1:
```bash
ros2 topic pub /drone_1/cmd_vel geometry_msgs/msg/Twist "{linear: {x: 1.0, y: 0.0, z: 0.0}, angular: {z: 0.0}}"
```

View camera stream:
```bash
ros2 run rqt_image_view rqt_image_view /drone_1/camera/image_raw
```
