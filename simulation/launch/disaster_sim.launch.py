import os
import tempfile
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, SetEnvironmentVariable
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare

def configure_drone_sdf(drone_name):
    pkg_share = get_package_share_directory('simulation')
    original_sdf = os.path.join(pkg_share, 'models', 'rescue_drone', 'model.sdf')
    
    with open(original_sdf, 'r') as f:
        content = f.read()
    
    # Replace the model name
    content = content.replace('<model name="rescue_drone">', f'<model name="{drone_name}">')
    
    # Replace relative topics with absolute namespaced topics
    content = content.replace('<topic>camera/image_raw</topic>', f'<topic>/{drone_name}/camera/image_raw</topic>')
    content = content.replace('<topic>thermal_camera/image_raw</topic>', f'<topic>/{drone_name}/thermal_camera/image_raw</topic>')
    content = content.replace('<topic>imu</topic>', f'<topic>/{drone_name}/imu</topic>')
    content = content.replace('<topic>cmd_vel</topic>', f'<topic>/{drone_name}/cmd_vel</topic>')
    content = content.replace('<odom_topic>odometry</odom_topic>', f'<odom_topic>/{drone_name}/odometry</odom_topic>')
    
    temp_sdf_path = os.path.join(tempfile.gettempdir(), f'{drone_name}.sdf')
    with open(temp_sdf_path, 'w') as f:
        f.write(content)
        
    return temp_sdf_path

def generate_launch_description():
    pkg_share = FindPackageShare('simulation')
    
    # Path to world file and media
    world_path = PathJoinSubstitution([pkg_share, 'worlds', 'disaster_night_world.sdf'])
    media_path = PathJoinSubstitution([pkg_share, 'media'])
    models_path = PathJoinSubstitution([pkg_share, 'models'])

    # Set Gazebo Resource Paths
    set_gz_resource_path = SetEnvironmentVariable(
        name='GZ_SIM_RESOURCE_PATH',
        value=[models_path, ':', media_path]
    )

    # Launch Gazebo Harmonic with the Pure Night Disaster World Simulation
    gz_sim = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([
                FindPackageShare('ros_gz_sim'),
                'launch',
                'gz_sim.launch.py'
            ])
        ),
        launch_arguments={
            'gz_args': ['-r ', world_path]
        }.items()
    )

    # Spawn Drone 1 (Sector A - Flood Area)
    spawn_drone_1 = Node(
        package='ros_gz_sim',
        executable='create',
        arguments=[
            '-world', 'disaster_night_world',
            '-file', configure_drone_sdf('drone_1'),
            '-name', 'drone_1',
            '-x', '10.0', '-y', '50.0', '-z', '8.0'
        ],
        output='screen'
    )

    # Spawn Drone 2 (Sector B - Evacuation / Relay Corridor)
    spawn_drone_2 = Node(
        package='ros_gz_sim',
        executable='create',
        arguments=[
            '-world', 'disaster_night_world',
            '-file', configure_drone_sdf('drone_2'),
            '-name', 'drone_2',
            '-x', '80.0', '-y', '50.0', '-z', '8.0'
        ],
        output='screen'
    )

    # Spawn Drone 3 (Sector C - Urban Flood Area)
    spawn_drone_3 = Node(
        package='ros_gz_sim',
        executable='create',
        arguments=[
            '-world', 'disaster_night_world',
            '-file', configure_drone_sdf('drone_3'),
            '-name', 'drone_3',
            '-x', '140.0', '-y', '50.0', '-z', '8.0'
        ],
        output='screen'
    )

    # ROS 2 <-> Gazebo Parameter Bridge
    bridge_config = os.path.join(
        get_package_share_directory('simulation'),
        'config',
        'ros_gz_bridge.yaml'
    )
    ros_gz_bridge = Node(
        package='ros_gz_bridge',
        executable='parameter_bridge',
        parameters=[{
            'config_file': bridge_config
        }],
        output='screen'
    )

    return LaunchDescription([
        set_gz_resource_path,
        gz_sim,
        spawn_drone_1,
        spawn_drone_2,
        spawn_drone_3,
        ros_gz_bridge
    ])

