#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from sensor_msgs.msg import Image
from std_msgs.msg import String
from cv_bridge import CvBridge
import cv2
import numpy as np
import math
import json

class DroneScanController(Node):
    def __init__(self):
        super().__init__('drone_scan_controller')
        
        # CvBridge and gains
        self.bridge = CvBridge()
        self.Kp_linear = 0.8
        self.Kp_angular = 1.2
        self.max_linear_speed = 2.0  # m/s
        self.waypoint_tolerance = 1.2  # meters
        self.loop_count = 0
        
        # Telemetry & mesh network configs
        self.base_pos = [0.0, 50.0, 0.0]
        self.communication_range = 65.0  # meters
        
        # Axis-Aligned Bounding Boxes (AABB) of large concrete buildings to simulate obstacle blocking
        self.obstacles = [
            # Building 1: Apartments [x_min, x_max, y_min, y_max, height]
            [147.0, 163.0, 25.0, 39.0, 10.0],
            # Building 2: Commercial Tower [x_min, x_max, y_min, y_max, height]
            [141.0, 155.0, 68.0, 82.0, 14.0]
        ]
        
        # Detection database of survivor coordinates from world SDF
        self.survivors = {
            'survivor_01_tree1': [18.8, 32.5, 4.5],
            'survivor_02_tree2': [49.4, 75.5, 4.8],
            'survivor_03_tree4': [27.4, 82.2, 4.8],
            'survivor_04_tree5': [38.2, 52.4, 4.6],
            'survivor_05_tree8': [62.2, 59.6, 4.7],
            'survivor_06a_house1_roof': [38.5, 22.8, 3.8],
            'survivor_06b_house1_ledge': [37.2, 21.5, 3.5],
            'survivor_07a_house2_roof': [22.0, 80.0, 2.8],
            'survivor_07b_house2_window': [23.5, 78.5, 2.4],
            'survivor_08a_rescue_boat': [35.2, 60.0, 1.5],
            'survivor_09_floating_pallet': [25.0, 48.0, 1.12],
            'survivor_10_lake_verge': [10.5, 40.0, 1.05],
            'survivor_11_pickup_roof': [105.0, 50.0, 2.9],
            'survivor_12_wrecked_suv': [86.2, 44.0, 2.1],
            'survivor_13_cargo_container': [122.0, 56.0, 4.0],
            'survivor_14_jersey_barrier': [104.5, 41.5, 1.45],
            'survivor_15_highway_sign': [115.5, 49.0, 1.45],
            'survivor_b_n_tree1': [78.6, 76.4, 4.8],
            'survivor_b_s_tree4': [78.6, 24.4, 4.8],
            'survivor_21a_apt_window_waving': [154.5, 26.5, 3.8],
            'survivor_23a_commercial_roof': [148.0, 74.0, 14.4],
            'survivor_25b_warehouse_bay_waving': [176.5, 72.0, 1.8],
            'survivor_27a_clinic_entrance': [138.0, 44.5, 1.8],
            'survivor_28a_bank_balcony': [168.0, 50.0, 4.1]
        }
        self.detection_cooldowns = {}
        
        # Drones data structure
        self.drones = {
            'drone_1': {
                'pos': [0.0, 0.0, 0.0],
                'yaw': 0.0,
                'waypoints': self.generate_lawnmower_waypoints(10.0, 60.0, 20.0, 80.0, 8.0, step=15.0),
                'current_wp_idx': 0,
                'pub': self.create_publisher(Twist, '/drone_1/cmd_vel', 10),
                'thermal_pub': self.create_publisher(Image, '/drone_1/thermal_camera/image_raw', 10),
                'combined_pub': self.create_publisher(Image, '/drone_1/combined_camera/image_raw', 10),
                'received_odom': False,
                'received_img': False,
                'sub': None,
                'img_sub': None
            },
            'drone_2': { # Dynamic Relay Drone (steers between drone 1 and 3)
                'pos': [0.0, 0.0, 0.0],
                'yaw': 0.0,
                'waypoints': [[80.0, 50.0, 8.0]],
                'current_wp_idx': 0,
                'pub': self.create_publisher(Twist, '/drone_2/cmd_vel', 10),
                'thermal_pub': self.create_publisher(Image, '/drone_2/thermal_camera/image_raw', 10),
                'combined_pub': self.create_publisher(Image, '/drone_2/combined_camera/image_raw', 10),
                'received_odom': False,
                'received_img': False,
                'sub': None,
                'img_sub': None
            },
            'drone_3': {
                'pos': [0.0, 0.0, 0.0],
                'yaw': 0.0,
                'waypoints': self.generate_orbit_waypoints([
                    {'center': [155.0, 28.5], 'radius': 12.0, 'altitude': 16.0}, # Building 1 Orbit
                    {'center': [148.0, 74.0], 'radius': 12.0, 'altitude': 16.0}  # Building 2 Orbit
                ]),
                'current_wp_idx': 0,
                'pub': self.create_publisher(Twist, '/drone_3/cmd_vel', 10),
                'thermal_pub': self.create_publisher(Image, '/drone_3/thermal_camera/image_raw', 10),
                'combined_pub': self.create_publisher(Image, '/drone_3/combined_camera/image_raw', 10),
                'received_odom': False,
                'received_img': False,
                'sub': None,
                'img_sub': None
            }
        }
        
        # Swarm network status publisher
        self.network_pub = self.create_publisher(String, '/swarm/network_status', 10)
        
        # Setup subscribers dynamically for each drone
        for name in self.drones.keys():
            self.setup_drone_subscribers(name)
            
        # Timer loop at 10 Hz (every 0.1s)
        self.timer = self.create_timer(0.1, self.control_loop)
        self.get_logger().info('Drone Autonomous Scan Controller, Mesh Simulator & Multi-Spectral HUD Initialized!')

    def is_line_of_sight_blocked(self, p1, p2):
        # Sample 10 points along the line segment between nodes to check for building collision
        steps = 10
        for i in range(1, steps):
            t = float(i) / steps
            x = p1[0] + t * (p2[0] - p1[0])
            y = p1[1] + t * (p2[1] - p1[1])
            z = p1[2] + t * (p2[2] - p1[2])
            
            for obs in self.obstacles:
                if obs[0] <= x <= obs[1] and obs[2] <= y <= obs[3] and z <= obs[4]:
                    return True
        return False

    def setup_drone_subscribers(self, name):
        self.get_logger().info(f'Subscribing to topics for {name}...')
        self.drones[name]['sub'] = self.create_subscription(
            Odometry, 
            f'/{name}/odometry', 
            lambda msg, n=name: self.odom_callback(msg, n), 
            10
        )
        self.drones[name]['img_sub'] = self.create_subscription(
            Image, 
            f'/{name}/camera/image_raw', 
            lambda msg, n=name: self.image_callback(msg, n), 
            10
        )

    def odom_callback(self, msg, drone_name):
        pos = msg.pose.pose.position
        
        if not self.drones[drone_name]['received_odom']:
            self.drones[drone_name]['received_odom'] = True
            self.get_logger().info(f'[{drone_name}] Received first odometry packet! Start pos: x={pos.x:.2f}, y={pos.y:.2f}, z={pos.z:.2f}')
            
        self.drones[drone_name]['pos'] = [pos.x, pos.y, pos.z]
        
        q = msg.pose.pose.orientation
        siny_cosp = 2.0 * (q.w * q.z + q.x * q.y)
        cosy_cosp = 1.0 - 2.0 * (q.y * q.y + q.z * q.z)
        self.drones[drone_name]['yaw'] = math.atan2(siny_cosp, cosy_cosp)

    def image_callback(self, msg, drone_name):
        try:
            if not self.drones[drone_name]['received_img']:
                self.drones[drone_name]['received_img'] = True
                self.get_logger().info(f'[{drone_name}] Received first RGB camera frame!')
                
            # Convert ROS 2 Image to OpenCV image (BGR)
            cv_img = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
            
            # Apply False-Color Thermal camera filters (handles white dummy structures as well)
            thermal_cv = self.convert_rgb_to_thermal(cv_img)
            
            # Concat side-by-side
            combined_cv = np.hstack((cv_img, thermal_cv))
            
            # Draw HUD HUD indicators
            cv2.putText(combined_cv, "OPTICAL RGB", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            cv2.putText(combined_cv, "FLIR THERMAL IR (310K)", (cv_img.shape[1] + 10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            
            # Publish false-color thermal raw
            thermal_msg = self.bridge.cv2_to_imgmsg(thermal_cv, encoding='bgr8')
            thermal_msg.header = msg.header
            self.drones[drone_name]['thermal_pub'].publish(thermal_msg)
            
            # Publish combined side-by-side stream
            combined_msg = self.bridge.cv2_to_imgmsg(combined_cv, encoding='bgr8')
            combined_msg.header = msg.header
            self.drones[drone_name]['combined_pub'].publish(combined_msg)
        except Exception as e:
            self.get_logger().error(f'Error processing image for {drone_name}: {e}')

    def convert_rgb_to_thermal(self, cv_img):
        hsv = cv2.cvtColor(cv_img, cv2.COLOR_BGR2HSV)
        
        # 1. Mask for bright white/gray shapes (like the white dummy structures)
        # Value (brightness) > 170, Saturation < 90 (filters yellow lane markers)
        lower_white = np.array([0, 0, 170])
        upper_white = np.array([180, 90, 255])
        mask_white = cv2.inRange(hsv, lower_white, upper_white)
        
        # 2. Mask for orange/yellow/red shapes (standard human textures)
        lower_colored = np.array([0, 80, 50])
        upper_colored = np.array([45, 255, 255])
        mask_colored = cv2.inRange(hsv, lower_colored, upper_colored)
        
        # Combine masks
        mask = cv2.bitwise_or(mask_white, mask_colored)
        
        # Convert original image to grayscale for background
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        
        # Background gets cold tones (dark blue/purple look)
        b_channel = np.clip(gray.astype(np.int16) * 2 // 3, 0, 255).astype(np.uint8)
        g_channel = np.clip(gray.astype(np.int16) // 4, 0, 255).astype(np.uint8)
        r_channel = np.clip(gray.astype(np.int16) // 2, 0, 255).astype(np.uint8)
        thermal_img = cv2.merge([b_channel, g_channel, r_channel])
        
        # Heat bleeding simulation
        mask_blurred = cv2.GaussianBlur(mask, (15, 15), 0)
        
        if np.any(mask_blurred > 0):
            alpha = (mask_blurred / 255.0)[:, :, np.newaxis]
            
            # Heat signature (Red -> Yellow -> White hot spots)
            heat_sig = np.zeros_like(thermal_img)
            # Red channel
            heat_sig[:, :, 2] = np.clip(mask_blurred.astype(np.int16) * 3, 0, 255).astype(np.uint8)
            # Green channel
            heat_sig[:, :, 1] = np.clip(mask_blurred.astype(np.int16) * 2, 0, 255).astype(np.uint8)
            # Blue channel
            heat_sig[:, :, 0] = np.clip(mask_blurred.astype(np.int16) - 100, 0, 255).astype(np.uint8)
            
            thermal_img = (thermal_img * (1.0 - alpha) + heat_sig * alpha).astype(np.uint8)
            
        return thermal_img

    def generate_lawnmower_waypoints(self, x_min, x_max, y_min, y_max, alt, step):
        waypoints = []
        x = x_min
        going_up = True
        
        while x <= x_max:
            if going_up:
                waypoints.append([x, y_min, alt])
                waypoints.append([x, y_max, alt])
            else:
                waypoints.append([x, y_max, alt])
                waypoints.append([x, y_min, alt])
            x += step
            going_up = not going_up
            
        return waypoints

    def generate_orbit_waypoints(self, orbits):
        waypoints = []
        steps = 12
        for orbit in orbits:
            cx, cy = orbit['center']
            r = orbit['radius']
            alt = orbit['altitude']
            
            for i in range(steps):
                angle = (2.0 * math.pi / steps) * i
                x = cx + r * math.cos(angle)
                y = cy + r * math.sin(angle)
                waypoints.append([x, y, alt])
        return waypoints

    def control_loop(self):
        self.loop_count += 1
        print_status = (self.loop_count % 50 == 0) # Trigger telemetry print every 5s
        
        # 1. Dynamic Relay Drone (drone_2) midpoint calculation
        if self.drones['drone_1']['received_odom'] and self.drones['drone_3']['received_odom']:
            pos1 = self.drones['drone_1']['pos']
            pos3 = self.drones['drone_3']['pos']
            x_mid = (pos1[0] + pos3[0]) / 2.0
            y_mid = (pos1[1] + pos3[1]) / 2.0
            
            # Constraint Drone 2 inside Sector B central corridor
            x_mid = max(45.0, min(135.0, x_mid))
            y_mid = max(25.0, min(75.0, y_mid))
            
            self.drones['drone_2']['waypoints'] = [[x_mid, y_mid, 8.0]]
            
        # 2. Swarm MANET connectivity calculation
        nodes = ['base', 'drone_1', 'drone_2', 'drone_3']
        positions = {
            'base': self.base_pos,
            'drone_1': self.drones['drone_1']['pos'],
            'drone_2': self.drones['drone_2']['pos'],
            'drone_3': self.drones['drone_3']['pos']
        }
        
        links = []
        adj = {node: [] for node in nodes}
        
        for i in range(len(nodes)):
            for j in range(i+1, len(nodes)):
                n1 = nodes[i]
                n2 = nodes[j]
                
                # Verify odom exists before calculating
                if n1 != 'base' and not self.drones[n1]['received_odom']:
                    continue
                if n2 != 'base' and not self.drones[n2]['received_odom']:
                    continue
                    
                pos1 = positions[n1]
                pos2 = positions[n2]
                dx = pos1[0] - pos2[0]
                dy = pos1[1] - pos2[1]
                dz = pos1[2] - pos2[2]
                dist = math.sqrt(dx*dx + dy*dy + dz*dz)
                
                if dist <= self.communication_range:
                    # Apply obstacle attenuation/blockage model
                    if self.is_line_of_sight_blocked(pos1, pos2):
                        links.append({"from": n1, "to": n2, "lqi": 0.0, "status": "BLOCKED"})
                    else:
                        lqi = 100.0 * (1.0 - dist / self.communication_range)
                        links.append({"from": n1, "to": n2, "lqi": round(lqi, 1), "status": "CONNECTED"})
                        adj[n1].append((n2, lqi))
                        adj[n2].append((n1, lqi))
                else:
                    links.append({"from": n1, "to": n2, "lqi": 0.0, "status": "DISCONNECTED"})
                    
        # BFS search to find multi-hop routing path to Base Station
        queue = [['base']]
        visited = {'base'}
        paths = {'base': ['base']}
        
        while queue:
            path = queue.pop(0)
            node = path[-1]
            for neighbor, _ in adj[node]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    new_path = list(path) + [neighbor]
                    paths[neighbor] = new_path
                    queue.append(new_path)
                    
        routing = {}
        for name in ['drone_1', 'drone_2', 'drone_3']:
            if name in paths:
                routing[name] = list(reversed(paths[name])) # Path starting at drone going to base
            else:
                routing[name] = []
                
        # Publish Mesh network topology JSON payload
        network_status = {
            "drones": {
                name: {
                    "pos": self.drones[name]['pos'],
                    "connected_to_base": len(routing[name]) > 0
                } for name in ['drone_1', 'drone_2', 'drone_3']
            },
            "links": links,
            "routing": routing
        }
        status_msg = String()
        status_msg.data = json.dumps(network_status)
        self.network_pub.publish(status_msg)
        
        # 3. Print periodically console telemetry and routing tables
        if print_status:
            telemetry_str = " | ".join([
                f"{name.upper()}: ({self.drones[name]['pos'][0]:.2f}, {self.drones[name]['pos'][1]:.2f}, {self.drones[name]['pos'][2]:.2f})"
                for name in ['drone_1', 'drone_2', 'drone_3'] if self.drones[name]['received_odom']
            ])
            self.get_logger().info(f"[Telemetry] {telemetry_str}")
            
            routing_strs = []
            for name in ['drone_1', 'drone_2', 'drone_3']:
                path = routing[name]
                if path:
                    routing_strs.append(f"{name.upper()} -> " + " -> ".join([n.upper() for n in path[1:]]))
                else:
                    routing_strs.append(f"{name.upper()} -> [DISCONNECTED]")
            self.get_logger().info(f"[Mesh Network] Routing Table: " + " | ".join(routing_strs))
            
        # 4. Check for survivor proximity detections
        for d_name, d_data in self.drones.items():
            if not d_data['received_odom']:
                continue
            d_pos = d_data['pos']
            for s_name, s_pos in self.survivors.items():
                dx = d_pos[0] - s_pos[0]
                dy = d_pos[1] - s_pos[1]
                dist_2d = math.sqrt(dx*dx + dy*dy)
                
                # Check horizontal detection threshold of 8.0m (reasonable field-of-view sweep)
                if dist_2d < 8.0:
                    cooldown_key = f"{d_name}_{s_name}"
                    # Limit detection prints to once every 15s to keep console clean
                    if cooldown_key not in self.detection_cooldowns or self.loop_count - self.detection_cooldowns[cooldown_key] > 150:
                        self.detection_cooldowns[cooldown_key] = self.loop_count
                        self.get_logger().info(
                            f"🔥 [DETECTION] {d_name.upper()} detected Survivor '{s_name}' "
                            f"at World Coordinates (x={s_pos[0]:.2f}, y={s_pos[1]:.2f}, z={s_pos[2]:.2f}) | "
                            f"Distance: {dist_2d:.2f}m"
                        )
                        
        # 5. Steer drones along waypoints
        for name, data in self.drones.items():
            pos = data['pos']
            yaw = data['yaw']
            waypoints = data['waypoints']
            wp_idx = data['current_wp_idx']
            
            if not data['received_odom']:
                continue
                
            if not waypoints:
                continue
                
            target_wp = waypoints[wp_idx]
            
            dx = target_wp[0] - pos[0]
            dy = target_wp[1] - pos[1]
            dz = target_wp[2] - pos[2]
            dist_to_wp = math.sqrt(dx*dx + dy*dy + dz*dz)
            
            # Check waypoint reached
            if dist_to_wp < self.waypoint_tolerance:
                next_wp_idx = (wp_idx + 1) % len(waypoints)
                if next_wp_idx == 0:
                    sector_names = {
                        'drone_1': 'Sector A (Flooded Lake)',
                        'drone_2': 'Sector B (Highway Corridor)',
                        'drone_3': 'Sector C (Collapsed Buildings)'
                    }
                    self.get_logger().info(
                        f"✅ [Swarm Update] {name.upper()} has COMPLETED scanning of {sector_names[name]}!"
                    )
                data['current_wp_idx'] = next_wp_idx
                self.get_logger().info(f'{name} reached waypoint {wp_idx}, moving to index {data["current_wp_idx"]}')
                continue
                
            target_yaw = math.atan2(dy, dx)
            yaw_error = target_yaw - yaw
            yaw_error = math.atan2(math.sin(yaw_error), math.cos(yaw_error))
            
            local_dx = dx * math.cos(yaw) + dy * math.sin(yaw)
            local_dy = -dx * math.sin(yaw) + dy * math.cos(yaw)
            
            cmd_vel = Twist()
            cmd_vel.linear.x = self.Kp_linear * local_dx
            cmd_vel.linear.y = self.Kp_linear * local_dy
            cmd_vel.linear.z = self.Kp_linear * dz
            
            # Clamp angular yaw velocity to prevent high-frequency spinning oscillations
            raw_yaw_speed = self.Kp_angular * yaw_error
            cmd_vel.angular.z = max(-1.5, min(1.5, raw_yaw_speed))
            
            # Constrain speed to limits
            linear_speed = math.sqrt(cmd_vel.linear.x**2 + cmd_vel.linear.y**2 + cmd_vel.linear.z**2)
            if linear_speed > self.max_linear_speed:
                scale = self.max_linear_speed / linear_speed
                cmd_vel.linear.x *= scale
                cmd_vel.linear.y *= scale
                cmd_vel.linear.z *= scale
                
            data['pub'].publish(cmd_vel)

def main(args=None):
    rclpy.init(args=args)
    controller = DroneScanController()
    rclpy.spin(controller)
    controller.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
