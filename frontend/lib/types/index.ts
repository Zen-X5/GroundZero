export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface ExplainableRiskBreakdown {
  environmentalThreat: number;
  mobilityStatus: number;
  accessibilityScore: number;
  urgencyMultiplier: number;
  reasoning: string[];
}

export interface Survivor {
  _id?: string;
  code: string;
  globalPosition: Position3D;
  sector: 'SECTOR_A' | 'SECTOR_B' | 'SECTOR_C';
  environment: 'TREE_PERCH' | 'ROOF_FLOOD' | 'WINDOW_VOID' | 'RUBBLE_SURFACE' | 'ROAD_DEBRIS' | 'WATER_RAFT';
  confidenceScore: number;
  confirmingDrones: any[];
  observationCount: number;
  riskScore: number;
  rescuePriorityRank: number;
  riskDetails: ExplainableRiskBreakdown;
  status: 'IDENTIFIED' | 'INSPECTING' | 'RESCUE_QUEUED' | 'RESCUE_IN_PROGRESS' | 'RESCUED';
  estimatedGroupSize: number;
  firstDetectedAt: string;
  lastSeenAt: string;
}

export interface Drone {
  _id?: string;
  callsign: string;
  sector: 'SECTOR_A' | 'SECTOR_B' | 'SECTOR_C';
  assignedSector?: string;
  position: Position3D;
  heading: number;
  speed: number;
  batteryPercentage: number;
  status: 'SCANNING' | 'INSPECTING_OPENING' | 'RELAYING' | 'RETURNING' | 'OFFLINE';
  role: 'SCOUT' | 'RELAY' | 'COORDINATOR';
  communicationRangeMeters: number;
  meshConnected: boolean;
  sensors: {
    rgbActive: boolean;
    thermalActive: boolean;
    lidarActive: boolean;
  };
  lastHeartbeatAt: string;
}

export interface MeshLink {
  sourceDrone: any;
  targetDrone: any;
  signalStrengthDbm: number;
  linkStatus: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';
  bandwidthKbps: number;
  hasGroundPath: boolean;
  isActiveRoutingPath?: boolean;
}

export interface NetworkTopology {
  networkName: string;
  gatewayDrone?: any;
  activeNodes: any[];
  links: MeshLink[];
  blackoutZoneActive: boolean;
  connectedToGround: boolean;
  networkHealth: number;
  activeNodeCount: number;
  estimatedCoverageRadiusMeters: number;
}

export interface AccessibleOpening {
  openingId?: string;
  name?: string;
  floorLevel: number;
  dimensionsMeters: number[];
  isObstructed: boolean;
  detectedOccupants: number;
  openingType?: string;
  inspectionConfidence?: number;
}

export interface BuildingInspection {
  _id?: string;
  name: string;
  position: Position3D;
  heightMeters?: number;
  floors?: number;
  structuralDamage: 'LOW' | 'MODERATE' | 'SEVERE_COLLAPSE';
  accessibleOpenings: AccessibleOpening[];
  inspectionStatus: 'UNINSPECTED' | 'IN_PROGRESS' | 'COMPLETED';
  estimatedOccupancyProbability: number;
  inspectionDrones: any[];
  lastInspectedAt?: string;
}

export interface SystemAlert {
  id: string;
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  timestamp: string;
}
