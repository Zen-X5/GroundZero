import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Position3D, Position3DSchema } from '../../common/schemas/position-3d.schema';

export type HazardDocument = Hazard & Document;

@Schema({ timestamps: true, collection: 'hazards' })
export class Hazard {
  @Prop({ required: true, unique: true, type: String })
  name: string; // e.g. "HAZ_FLOOD_DEEP"

  @Prop({
    required: true,
    type: String,
    enum: ['FLOOD', 'DEBRIS', 'STRUCTURAL', 'FIRE', 'COMMUNICATION_BLACKOUT'],
  })
  type: string;

  @Prop({ required: true, type: Position3DSchema })
  position: Position3D;

  @Prop({ required: true, type: Number, min: 0, max: 100 })
  severity: number;

  @Prop({ required: true, type: Number })
  radiusMeters: number;

  @Prop({ required: true, type: Boolean, default: true })
  active: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const HazardSchema = SchemaFactory.createForClass(Hazard);
