import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Drone } from '../../drones/schemas/drone.schema';

@Schema({ _id: false })
export class MeshLink {
  @Prop({ type: Types.ObjectId, ref: 'Drone', required: true })
  sourceDrone: Types.ObjectId | Drone;

  @Prop({ type: Types.ObjectId, ref: 'Drone', required: true })
  targetDrone: Types.ObjectId | Drone;

  @Prop({ required: true, type: Number })
  signalStrengthDbm: number; // e.g. -45 dBm

  @Prop({ required: true, type: String, enum: ['CONNECTED', 'DEGRADED', 'DISCONNECTED'] })
  linkStatus: string;

  @Prop({ required: true, type: Number, default: 0 })
  bandwidthKbps: number;

  @Prop({ type: Number, required: false })
  latencyMs?: number;

  @Prop({ type: Number, min: 0, max: 100, required: false })
  packetLossPercentage?: number;

  @Prop({ required: true, type: Boolean, default: false })
  hasGroundPath: boolean;

  @Prop({ type: Boolean, default: false })
  isActiveRoutingPath: boolean;
}

export const MeshLinkSchema = SchemaFactory.createForClass(MeshLink);
