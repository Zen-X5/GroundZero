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

    return LaunchDescription([
        set_gz_resource_path,
        gz_sim
    ])
