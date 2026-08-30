import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Position3D, Position3DSchema } from '../../common/schemas/position-3d.schema';
import { AccessibleOpening, AccessibleOpeningSchema } from '../../common/schemas/accessible-opening.schema';
import { Drone } from '../../drones/schemas/drone.schema';

export type BuildingInspectionDocument = BuildingInspection & Document;

@Schema({ timestamps: true, collection: 'building_inspections' })
export class BuildingInspection {
  @Prop({ required: true, unique: true, type: String })
  name: string; // e.g. "urban_building_1_apartments" (Gazebo model name)

  @Prop({ required: true, type: Position3DSchema })
  position: Position3D;

  @Prop({ type: Number, required: false })
  heightMeters?: number;

  @Prop({ type: Number, required: false })
  floors?: number;

  @Prop({
    required: true,
    type: String,
    enum: ['LOW', 'MODERATE', 'SEVERE_COLLAPSE'],
    default: 'MODERATE',
  })
  structuralDamage: string;

  @Prop({ type: [AccessibleOpeningSchema], default: [] })
  accessibleOpenings: AccessibleOpening[];

  @Prop({
    required: true,
    type: String,
    enum: ['UNINSPECTED', 'IN_PROGRESS', 'COMPLETED'],
    default: 'UNINSPECTED',
  })
  inspectionStatus: string;

  @Prop({ type: Number, min: 0, max: 1, default: 0 })
  estimatedOccupancyProbability: number;

  @Prop({ type: [String], default: [] })
  surveyedAngles: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Drone' }], default: [] })
  inspectionDrones: Types.ObjectId[] | Drone[];

  @Prop({ type: Date, required: false })
  lastInspectedAt?: Date;
}

export const BuildingInspectionSchema = SchemaFactory.createForClass(BuildingInspection);
