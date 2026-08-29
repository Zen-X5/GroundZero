import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SectorDocument = HydratedDocument<Sector>;

@Schema({ _id: false })
export class SectorBounds {
  @Prop({ required: true })
  min_x: number;

  @Prop({ required: true })
  max_x: number;

  @Prop({ required: true })
  min_y: number;

  @Prop({ required: true })
  max_y: number;
}
export const SectorBoundsSchema = SchemaFactory.createForClass(SectorBounds);

@Schema({ timestamps: true })
export class Sector {
  @Prop({ required: true, unique: true, index: true })
  sector_id: string;

  @Prop({ required: true, default: 'active' })
  status: string;

  @Prop({ type: SectorBoundsSchema, required: true })
  bounds: SectorBounds;

  @Prop({ type: [String], default: [] })
  assigned_drones: string[];

  @Prop({ required: true, min: 0, max: 1, default: 0 })
  coverage: number;

  @Prop({ required: true, default: 0 })
  survivors_detected: number;
}

export const SectorSchema = SchemaFactory.createForClass(Sector);
