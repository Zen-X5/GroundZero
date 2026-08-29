import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Position3D {
  @Prop({ required: true, type: Number })
  x: number; // Gazebo World X (meters)

  @Prop({ required: true, type: Number })
  y: number; // Gazebo World Y (meters)

  @Prop({ required: true, type: Number })
  z: number; // Altitude AGL / Elevation (meters)
}

export const Position3DSchema = SchemaFactory.createForClass(Position3D);
