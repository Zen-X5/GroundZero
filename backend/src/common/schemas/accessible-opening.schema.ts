import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Position3D, Position3DSchema } from './position-3d.schema';

@Schema({ _id: false })
export class AccessibleOpening {
  @Prop({ required: true, type: String })
  openingId: string; // e.g. "window_fl2_south"

  @Prop({ required: true, type: Number })
  floorLevel: number;

  @Prop({ type: [Number], required: true })
  dimensionsMeters: number[]; // [width, height]

  @Prop({ required: true, type: Boolean, default: false })
  isObstructed: boolean;

  @Prop({ required: true, type: Number, default: 0 })
  detectedOccupants: number;

  @Prop({ type: Position3DSchema, required: false })
  position?: Position3D;

  @Prop({ type: String, enum: ['WINDOW', 'DOOR', 'BALCONY', 'OTHER'], default: 'WINDOW' })
  openingType?: string;

  @Prop({ type: Number, min: 0, max: 1, required: false })
  inspectionConfidence?: number;
}

export const AccessibleOpeningSchema = SchemaFactory.createForClass(AccessibleOpening);
