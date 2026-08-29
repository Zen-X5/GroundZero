import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, SetEnvironmentVariable
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare

def generate_launch_description():
    pkg_share = FindPackageShare('simulation')
    
    # Path to world file, drone model, and media
    world_path = PathJoinSubstitution([pkg_share, 'worlds', 'disaster_night_world.sdf'])
    drone_model_path = PathJoinSubstitution([pkg_share, 'models', 'rescue_drone', 'model.sdf'])
    bridge_config_path = PathJoinSubstitution([pkg_share, 'config', 'ros_gz_bridge.yaml'])
    media_path = PathJoinSubstitution([pkg_share, 'media'])
    models_path = PathJoinSubstitution([pkg_share, 'models'])

    # Set Gazebo Resource Paths
    set_gz_resource_path = SetEnvironmentVariable(
        name='GZ_SIM_RESOURCE_PATH',
        value=[models_path, ':', media_path]
    )

    # Launch Gazebo Harmonic with the Night Disaster World
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

    # Spawn Drone 1 (Sector A - Flood Area: x=25, y=40, z=6.0)
    spawn_drone_1 = Node(
        package='ros_gz_sim',
        executable='create',
        output='screen',
        arguments=[
            '-file', drone_model_path,
            '-name', 'drone_1',
            '-x', '25.0',
            '-y', '40.0',
            '-z', '6.0',
            '-Y', '0.0'
        ]
    )

    # Spawn Drone 2 (Sector B - Debris Strip / Relay: x=100, y=50, z=8.0)
    spawn_drone_2 = Node(
        package='ros_gz_sim',
        executable='create',
        output='screen',
        arguments=[
            '-file', drone_model_path,
            '-name', 'drone_2',
            '-x', '100.0',
            '-y', '50.0',
            '-z', '8.0',
            '-Y', '0.0'
        ]
    )

    # Spawn Drone 3 (Sector C - Collapsed Buildings / Voids: x=150, y=30, z=6.0)
    spawn_drone_3 = Node(
        package='ros_gz_sim',
        executable='create',
        output='screen',
        arguments=[
            '-file', drone_model_path,
            '-name', 'drone_3',
            '-x', '150.0',
            '-y', '30.0',
            '-z', '6.0',
            '-Y', '0.0'
        ]
    )

    # ROS <-> Gazebo Bridge Node
    ros_gz_bridge = Node(
        package='ros_gz_bridge',
        executable='parameter_bridge',
        output='screen',
        parameters=[{
            'config_file': bridge_config_path
        }]
    )

    return LaunchDescription([
        set_gz_resource_path,
        gz_sim,
        spawn_drone_1,
        spawn_drone_2,
        spawn_drone_3,
        ros_gz_bridge
    ])
