import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NetworkTopology, NetworkTopologyDocument } from './schemas/network.schema';
import { Drone, DroneDocument } from '../drones/schemas/drone.schema';
import { MeshLink } from '../common/schemas/mesh-link.schema';

@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);
  private currentTopology: NetworkTopology = {
    networkName: 'GROUNDZERO_MANET_01',
    activeNodes: [],
    links: [],
    blackoutZoneActive: true,
    connectedToGround: true,
    networkHealth: 100,
    activeNodeCount: 0,
    estimatedCoverageRadiusMeters: 450,
    lastTopologyUpdate: new Date(),
  };

  constructor(
    @InjectModel(NetworkTopology.name) private topologyModel: Model<NetworkTopologyDocument>,
    @InjectModel(Drone.name) private droneModel: Model<DroneDocument>,
  ) {}

  async getLatestTopology(): Promise<NetworkTopology> {
    try {
      const drones = await this.droneModel.find().exec();
      if (drones.length === 0) {
        return this.currentTopology;
      }

      // Nodes: "ground_station" and each drone's callsign
      const nodes = new Set<string>(['ground_station']);
      drones.forEach((d) => nodes.add(d.callsign.toLowerCase()));

      // Build Adjacency Graph
      const adjacencyList = new Map<string, Set<string>>();
      nodes.forEach((n) => adjacencyList.set(n, new Set<string>()));

      // Distance Threshold for automatic communication connection: 64m
      const COMMS_RANGE = 64.0;

      for (let i = 0; i < drones.length; i++) {
        const d1 = drones[i];
        const c1 = d1.callsign.toLowerCase();

        // 1. Check distance connection to ground station (assumed at 0, 50, 0)
        const distToBase = Math.sqrt(
          Math.pow(d1.position.x - 0.0, 2) + Math.pow(d1.position.y - 50.0, 2),
        );
        if (distToBase <= COMMS_RANGE || (d1.connectedPeers || []).map(p => p.toLowerCase()).includes('ground_station')) {
          adjacencyList.get('ground_station').add(c1);
          adjacencyList.get(c1).add('ground_station');
        }

        // 2. Check connections to other drones
        for (let j = i + 1; j < drones.length; j++) {
          const d2 = drones[j];
          const c2 = d2.callsign.toLowerCase();

          const dist = Math.sqrt(
            Math.pow(d1.position.x - d2.position.x, 2) + Math.pow(d1.position.y - d2.position.y, 2),
          );

          // Connect if they are within range OR report each other as connected peers
          const isPeerReported =
            (d1.connectedPeers || []).map(p => p.toLowerCase()).includes(c2) ||
            (d2.connectedPeers || []).map(p => p.toLowerCase()).includes(c1);

          if (dist <= COMMS_RANGE || isPeerReported) {
            adjacencyList.get(c1).add(c2);
            adjacencyList.get(c2).add(c1);
          }
        }
      }

      // BFS to determine routing path to GROUND_STATION
      const queue: string[] = ['ground_station'];
      const visited = new Set<string>(['ground_station']);
      const parentMap = new Map<string, string>();

      while (queue.length > 0) {
        const curr = queue.shift();
        const neighbors = adjacencyList.get(curr) || new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            parentMap.set(neighbor, curr);
            queue.push(neighbor);
          }
        }
      }

      // Generate links payload
      const links: MeshLink[] = [];

      for (let i = 0; i < drones.length; i++) {
        const d1 = drones[i];
        const c1 = d1.callsign.toLowerCase();

        // Check A to B links
        for (let j = i + 1; j < drones.length; j++) {
          const d2 = drones[j];
          const c2 = d2.callsign.toLowerCase();

          if (adjacencyList.get(c1).has(c2)) {
            const dist = Math.sqrt(
              Math.pow(d1.position.x - d2.position.x, 2) + Math.pow(d1.position.y - d2.position.y, 2),
            );
            const dbm = Math.round(-30 - 0.4 * dist);
            const status = dbm >= -65 ? 'CONNECTED' : (dbm >= -85 ? 'DEGRADED' : 'DISCONNECTED');

            // Active path check: if one is the parent of the other in BFS tree
            const isParentChild = parentMap.get(c1) === c2 || parentMap.get(c2) === c1;

            links.push({
              sourceDrone: d1._id as Types.ObjectId,
              targetDrone: d2._id as Types.ObjectId,
              signalStrengthDbm: dbm,
              linkStatus: status,
              bandwidthKbps: Math.max(100, Math.round(54000 - 350 * dist)),
              hasGroundPath: visited.has(c1) && visited.has(c2),
              isActiveRoutingPath: isParentChild,
            });
          }
        }
      }

      // Calculate health: Drones with verified route to ground
      const activeDronesCount = drones.length;
      const connectedDronesCount = drones.filter((d) => visited.has(d.callsign.toLowerCase())).length;
      const networkHealth = activeDronesCount > 0 ? Math.round((connectedDronesCount / activeDronesCount) * 100) : 100;

      // Sync drone connectivity statuses in database
      for (const d of drones) {
        const isConn = visited.has(d.callsign.toLowerCase());
        await this.droneModel.updateOne(
          { _id: d._id },
          { $set: { meshConnected: isConn } }
        ).exec();
      }

      // Update in-memory and database topology
      const gatewayDrone = drones.find((d) => adjacencyList.get('ground_station').has(d.callsign.toLowerCase()));
      const payload: NetworkTopology = {
        networkName: 'GROUNDZERO_MANET_01',
        gatewayDrone: gatewayDrone?._id as Types.ObjectId || null,
        activeNodes: drones.map((d) => d._id as Types.ObjectId),
        links,
        blackoutZoneActive: true,
        connectedToGround: connectedDronesCount > 0,
        networkHealth,
        activeNodeCount: activeDronesCount,
        estimatedCoverageRadiusMeters: 450,
        lastTopologyUpdate: new Date(),
      };

      this.currentTopology = payload;

      // Save to Mongo
      const savedDoc = await this.topologyModel
        .findOneAndUpdate(
          { networkName: payload.networkName },
          { $set: payload },
          { upsert: true, new: true },
        )
        .populate('gatewayDrone')
        .populate('activeNodes')
        .populate('links.sourceDrone')
        .populate('links.targetDrone')
        .exec();

      // Broadcast Mesh Topology update over Websocket
      try {
        const gateway = require('../gateway/events.gateway').getGlobalEventsGateway();
        if (gateway) {
          gateway.broadcastMeshTopology(savedDoc);
        }
      } catch (_) {}

      return savedDoc;
    } catch (e) {
      this.logger.error(`Failed compiling mesh routing table: ${e.message}`);
    }
    return this.currentTopology;
  }

  async updateTopology(dto: Partial<NetworkTopology>): Promise<NetworkTopology> {
    const payload = {
      ...this.currentTopology,
      ...dto,
      lastTopologyUpdate: new Date(),
    } as NetworkTopology;

    this.currentTopology = payload;

    try {
      const saved = await this.topologyModel
        .findOneAndUpdate(
          { networkName: payload.networkName },
          { $set: payload },
          { upsert: true, new: true },
        )
        .populate('gatewayDrone')
        .populate('activeNodes')
        .populate('links.sourceDrone')
        .populate('links.targetDrone')
        .exec();

      try {
        const gateway = require('../gateway/events.gateway').getGlobalEventsGateway();
        if (gateway) {
          gateway.broadcastMeshTopology(saved);
        }
      } catch (_) {}

      return saved;
    } catch (e) {
      return payload;
    }
  }

  // Helper method: Check if a drone is connected to base station
  async isDroneConnected(callsign: string): Promise<boolean> {
    try {
      const drones = await this.droneModel.find().exec();
      const drone = drones.find((d) => d.callsign.toLowerCase() === callsign.toLowerCase());
      if (!drone) return false;

      // Build routing paths from GROUND_STATION in same way
      const nodes = new Set<string>(['ground_station']);
      drones.forEach((d) => nodes.add(d.callsign.toLowerCase()));
      const adjacencyList = new Map<string, Set<string>>();
      nodes.forEach((n) => adjacencyList.set(n, new Set<string>()));
      const COMMS_RANGE = 64.0;

      for (let i = 0; i < drones.length; i++) {
        const d1 = drones[i];
        const c1 = d1.callsign.toLowerCase();
        const distToBase = Math.sqrt(Math.pow(d1.position.x - 0.0, 2) + Math.pow(d1.position.y - 50.0, 2));
        if (distToBase <= COMMS_RANGE || (d1.connectedPeers || []).map(p => p.toLowerCase()).includes('ground_station')) {
          adjacencyList.get('ground_station').add(c1);
          adjacencyList.get(c1).add('ground_station');
        }
        for (let j = i + 1; j < drones.length; j++) {
          const d2 = drones[j];
          const c2 = d2.callsign.toLowerCase();
          const dist = Math.sqrt(Math.pow(d1.position.x - d2.position.x, 2) + Math.pow(d1.position.y - d2.position.y, 2));
          const isPeerReported =
            (d1.connectedPeers || []).map(p => p.toLowerCase()).includes(c2) ||
            (d2.connectedPeers || []).map(p => p.toLowerCase()).includes(c1);
          if (dist <= COMMS_RANGE || isPeerReported) {
            adjacencyList.get(c1).add(c2);
            adjacencyList.get(c2).add(c1);
          }
        }
      }

      const queue: string[] = ['ground_station'];
      const visited = new Set<string>(['ground_station']);
      while (queue.length > 0) {
        const curr = queue.shift();
        const neighbors = adjacencyList.get(curr) || new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      return visited.has(callsign.toLowerCase());
    } catch (_) {
      return false;
    }
  }
}
