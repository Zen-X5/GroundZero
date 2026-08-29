#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
import math

class DroneScanController(Node):
    def __init__(self):
        super().__init__('drone_scan_controller')
        
        # Controller gain
        self.Kp_linear = 0.8
        self.Kp_angular = 1.2
        self.max_linear_speed = 2.0  # m/s
        self.waypoint_tolerance = 1.0  # meters
        
        # Drones data structure
        self.drones = {
            'drone_1': {
                'pos': [0.0, 0.0, 0.0],
                'yaw': 0.0,
                'waypoints': self.generate_lawnmower_waypoints(10.0, 60.0, 20.0, 80.0, 8.0, step=15.0),
                'current_wp_idx': 0,
                'pub': self.create_publisher(Twist, '/drone_1/cmd_vel', 10),
                'sub': None
            },
            'drone_2': {
                'pos': [0.0, 0.0, 0.0],
                'yaw': 0.0,
                'waypoints': [
                    [80.0, 20.0, 8.0],
                    [80.0, 80.0, 8.0]
                ],
                'current_wp_idx': 0,
                'pub': self.create_publisher(Twist, '/drone_2/cmd_vel', 10),
                'sub': None
            },
            'drone_3': {
                'pos': [0.0, 0.0, 0.0],
                'yaw': 0.0,
                'waypoints': self.generate_orbit_waypoints([
                    {'center': [155.0, 28.5], 'radius': 12.0, 'altitude': 8.0}, # Building 1
                    {'center': [148.0, 74.0], 'radius': 12.0, 'altitude': 8.0}  # Building 2
                ]),
                'current_wp_idx': 0,
                'pub': self.create_publisher(Twist, '/drone_3/cmd_vel', 10),
                'sub': None
            }
        }
        
        # Setup subscribers dynamically
        self.drones['drone_1']['sub'] = self.create_subscription(
            Odometry, '/drone_1/odometry', lambda msg: self.odom_callback(msg, 'drone_1'), 10)
        self.drones['drone_2']['sub'] = self.create_subscription(
            Odometry, '/drone_2/odometry', lambda msg: self.odom_callback(msg, 'drone_2'), 10)
        self.drones['drone_3']['sub'] = self.create_subscription(
            Odometry, '/drone_3/odometry', lambda msg: self.odom_callback(msg, 'drone_3'), 10)
            
        # Timer loop at 10 Hz
        self.timer = self.create_timer(0.1, self.control_loop)
        self.get_logger().info('Drone Autonomous Scan Controller Initialized!')

    def odom_callback(self, msg, drone_name):
        # Extract positions
        pos = msg.pose.pose.position
        self.drones[drone_name]['pos'] = [pos.x, pos.y, pos.z]
        
        # Extract yaw from quaternion orientation
        q = msg.pose.pose.orientation
        siny_cosp = 2.0 * (q.w * q.z + q.x * q.y)
        cosy_cosp = 1.0 - 2.0 * (q.y * q.y + q.z * q.z)
        self.drones[drone_name]['yaw'] = math.atan2(siny_cosp, cosy_cosp)

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
        steps = 12  # Number of points in the circle
        for orbit in orbits:
            cx, cy = orbit['center']
            r = orbit['radius']
            alt = orbit['altitude']
            
            # Add points along the circle
            for i in range(steps):
                angle = (2.0 * math.pi / steps) * i
                x = cx + r * math.cos(angle)
                y = cy + r * math.sin(angle)
                waypoints.append([x, y, alt])
        return waypoints

    def control_loop(self):
        for name, data in self.drones.items():
            pos = data['pos']
            yaw = data['yaw']
            waypoints = data['waypoints']
            wp_idx = data['current_wp_idx']
            
            # If no waypoints, drone hovers
            if not waypoints:
                continue
                
            target_wp = waypoints[wp_idx]
            
            # Calculate distance error
            dx = target_wp[0] - pos[0]
            dy = target_wp[1] - pos[1]
            dz = target_wp[2] - pos[2]
            dist_to_wp = math.sqrt(dx*dx + dy*dy + dz*dz)
            
            # Check if waypoint reached
            if dist_to_wp < self.waypoint_tolerance:
                # Advance to next waypoint (looping around)
                data['current_wp_idx'] = (wp_idx + 1) % len(waypoints)
                self.get_logger().info(f'{name} reached waypoint {wp_idx}, moving to index {data["current_wp_idx"]}')
                continue
                
            # Compute heading angle to waypoint
            target_yaw = math.atan2(dy, dx)
            yaw_error = target_yaw - yaw
            
            # Normalize yaw error to [-pi, pi]
            yaw_error = math.atan2(math.sin(yaw_error), math.cos(yaw_error))
            
            # Rotate world coordinates error vector into local frame
            # VelocityControl plugin requires command velocity in robot's local frame
            local_dx = dx * math.cos(yaw) + dy * math.sin(yaw)
            local_dy = -dx * math.sin(yaw) + dy * math.cos(yaw)
            
            # Proportional speed controls
            cmd_vel = Twist()
            cmd_vel.linear.x = self.Kp_linear * local_dx
            cmd_vel.linear.y = self.Kp_linear * local_dy
            cmd_vel.linear.z = self.Kp_linear * dz
            cmd_vel.angular.z = self.Kp_angular * yaw_error
            
            # Constrain linear speed
            linear_speed = math.sqrt(cmd_vel.linear.x**2 + cmd_vel.linear.y**2 + cmd_vel.linear.z**2)
            if linear_speed > self.max_linear_speed:
                scale = self.max_linear_speed / linear_speed
                cmd_vel.linear.x *= scale
                cmd_vel.linear.y *= scale
                cmd_vel.linear.z *= scale
                
            # Publish commands
            data['pub'].publish(cmd_vel)

def main(args=None):
    rclpy.init(args=args)
    controller = DroneScanController()
    rclpy.spin(controller)
    controller.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
