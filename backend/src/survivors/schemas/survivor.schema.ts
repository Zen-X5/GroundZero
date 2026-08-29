import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Position3D, Position3DSchema } from '../../common/schemas/position-3d.schema';
import { SensorEvidence, SensorEvidenceSchema } from '../../common/schemas/sensor-evidence.schema';
import { ExplainableRiskBreakdown, ExplainableRiskBreakdownSchema } from '../../common/schemas/risk-breakdown.schema';
import { Drone } from '../../drones/schemas/drone.schema';
import { BuildingInspection } from '../../buildings/schemas/building.schema';

export type SurvivorDocument = Survivor & Document;

@Schema({ timestamps: true, collection: 'survivors' })
export class Survivor {
  @Prop({ required: true, unique: true, type: String })
  code: string; // e.g. "SURV_01A"

  @Prop({ required: true, type: Position3DSchema })
  globalPosition: Position3D;

  @Prop({ required: true, type: String, enum: ['SECTOR_A', 'SECTOR_B', 'SECTOR_C'] })
  sector: string;

  @Prop({
    required: true,
    type: String,
    enum: ['TREE_PERCH', 'ROOF_FLOOD', 'WINDOW_VOID', 'RUBBLE_SURFACE', 'ROAD_DEBRIS', 'WATER_RAFT'],
  })
  environment: string;

  // Reference to Building if survivor is trapped inside/at a building opening
  @Prop({ type: Types.ObjectId, ref: 'BuildingInspection', required: false })
  building?: Types.ObjectId | BuildingInspection;

  // Fused Multi-Drone Confidence (0.0 - 1.0)
  @Prop({ required: true, type: Number, min: 0, max: 1, default: 0.5 })
  confidenceScore: number;

  @Prop({ type: SensorEvidenceSchema, required: false })
  sensorEvidence?: SensorEvidence;

  // Relational references to confirming Drones
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Drone' }], default: [] })
  confirmingDrones: Types.ObjectId[] | Drone[];

  @Prop({ type: Number, default: 1 })
  observationCount: number;

  // Dynamic Rescue Priority Ranking (1 = Top Priority)
  @Prop({ required: true, type: Number, min: 0, max: 100, default: 50 })
  riskScore: number;

  @Prop({ required: true, type: Number, default: 999 })
  rescuePriorityRank: number;

  @Prop({ required: true, type: ExplainableRiskBreakdownSchema })
  riskDetails: ExplainableRiskBreakdown;

  @Prop({
    required: true,
    type: String,
    enum: ['IDENTIFIED', 'INSPECTING', 'RESCUE_QUEUED', 'RESCUE_IN_PROGRESS', 'RESCUED'],
    default: 'IDENTIFIED',
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Drone', required: false })
  lastObservedBy?: Types.ObjectId | Drone;

  @Prop({ type: Number, default: 1 })
  estimatedGroupSize: number;

  @Prop({ type: Date, default: Date.now })
  firstDetectedAt: Date;

  @Prop({ type: Date, default: Date.now })
  lastSeenAt: Date;

  @Prop({ type: [String], default: [] })
  notes: string[];
}

export const SurvivorSchema = SchemaFactory.createForClass(Survivor);
