# seL4 & TRENTOS Drone Simulator

## Summary

A simulated-drone control system connecting Gazebo, PX4 SITL, a C++ proxy, and a TrentOS companion computer through MAVLink and UDP.

## Portfolio copy

> This operating-systems project connects a flight controller, a robotics simulator, and a trusted companion-computer environment. The flight task uses GPS and altitude data from Gazebo, then sends MAVLink commands to PX4 to navigate a simulated drone to a predefined destination.

## Architecture and implementation

- Gazebo Garden supplies the simulator, sensor integration, and pub/sub transport.
- PX4 SITL provides flight control through its uORB message bus and MAVLink interface.
- A C++ proxy subscribes to GPS and altitude topics, encodes messages with Jansson, and sends them over UDP.
- The TrentOS companion computer runs the flight task and uses `MAV_CMD_DO_SET_MODE`, arming/disarming, local-NED position targets, and landing commands.
- PX4 was extended with a custom drone model, world model, and minimal MAVLink channel because the default model lacked the required sensors.

## Lessons and next steps

The project documents dependency, Docker/X11, firewall, socket/QEMU, and world-loading constraints. Suggested improvements include better orchestration scripts, production network policies, and recovery when PX4 or Gazebo restart.

![System architecture](../assets/drone-simulator/architecture-03.png)
![Hardware setup](../assets/drone-simulator/setup-15.png)

- [Source PDF](../../pdf/Drone.pdf)
- [Demo video](../../videos/DroneDemo.mp4)

