import { Position3D } from '../../common/schemas/position-3d.schema';
import { SensorEvidence } from '../../common/schemas/sensor-evidence.schema';
import { ExplainableRiskBreakdown } from '../../common/schemas/risk-breakdown.schema';

export class CreateSurvivorDto {
  code: string;
  globalPosition: Position3D;
  sector: 'SECTOR_A' | 'SECTOR_B' | 'SECTOR_C';
  environment: 'TREE_PERCH' | 'ROOF_FLOOD' | 'WINDOW_VOID' | 'RUBBLE_SURFACE' | 'ROAD_DEBRIS' | 'WATER_RAFT';
  confidenceScore: number;
  building?: any;
  sensorEvidence?: SensorEvidence;
  confirmingDrones?: any[];
  observationCount?: number;
  riskScore: number;
  rescuePriorityRank?: number;
  riskDetails: ExplainableRiskBreakdown;
  status?: 'IDENTIFIED' | 'INSPECTING' | 'RESCUE_QUEUED' | 'RESCUE_IN_PROGRESS' | 'RESCUED';
  lastObservedBy?: any;
  estimatedGroupSize?: number;
  notes?: string[];
}

export class UpdateSurvivorDto {
  status?: 'IDENTIFIED' | 'INSPECTING' | 'RESCUE_QUEUED' | 'RESCUE_IN_PROGRESS' | 'RESCUED';
  rescuePriorityRank?: number;
  riskScore?: number;
  riskDetails?: ExplainableRiskBreakdown;
  notes?: string[];
}
