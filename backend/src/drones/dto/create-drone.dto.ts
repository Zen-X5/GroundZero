import { Position3D } from '../../common/schemas/position-3d.schema';

export class CreateDroneDto {
  callsign: string;
  sector: 'SECTOR_A' | 'SECTOR_B' | 'SECTOR_C';
  position: Position3D;
  heading?: number;
  speed?: number;
  batteryPercentage?: number;
  status?: 'SCANNING' | 'INSPECTING_OPENING' | 'RELAYING' | 'RETURNING' | 'OFFLINE';
  role?: 'SCOUT' | 'RELAY' | 'COORDINATOR';
  communicationRangeMeters?: number;
  meshConnected?: boolean;
  sensors?: {
    rgbActive: boolean;
    thermalActive: boolean;
    lidarActive: boolean;
  };
  coveragePercentage?: number;
}

export class UpdateDroneTelemetryDto {
  position?: Position3D;
  heading?: number;
  speed?: number;
  batteryPercentage?: number;
  status?: 'SCANNING' | 'INSPECTING_OPENING' | 'RELAYING' | 'RETURNING' | 'OFFLINE';
  meshConnected?: boolean;
  coveragePercentage?: number;
}
