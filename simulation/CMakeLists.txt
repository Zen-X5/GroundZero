cmake_minimum_required(VERSION 3.8)
project(simulation)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

find_package(ament_cmake REQUIRED)

# Install worlds, models, launch files, config, and media
install(DIRECTORY
  worlds
  models
  launch
  config
  media
  DESTINATION share/${PROJECT_NAME}
)

# Install executable python scripts
install(PROGRAMS
  scripts/drone_scan_controller.py
  DESTINATION lib/${PROJECT_NAME}
)

ament_package()
