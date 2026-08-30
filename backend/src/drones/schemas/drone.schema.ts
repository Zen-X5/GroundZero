import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Position3D, Position3DSchema } from '../../common/schemas/position-3d.schema';

export type DroneDocument = Drone & Document;

@Schema({ timestamps: true, collection: 'drones' })
export class Drone {
  @Prop({ required: true, unique: true, type: String })
  callsign: string; // e.g. "drone_1" (Gazebo model name)

  @Prop({ required: true, type: String, enum: ['SECTOR_A', 'SECTOR_B', 'SECTOR_C'] })
  sector: string;

  @Prop({ required: true, type: Position3DSchema })
  position: Position3D;

  @Prop({ required: true, type: Number, default: 0 })
  heading: number; // Yaw degrees

  @Prop({ required: true, type: Number, default: 0 })
  speed: number; // m/s

  @Prop({ required: true, type: Number, min: 0, max: 100, default: 100 })
  batteryPercentage: number;

  @Prop({
    required: true,
    type: String,
    enum: ['SCANNING', 'INSPECTING_OPENING', 'RELAYING', 'RETURNING', 'OFFLINE'],
    default: 'SCANNING',
  })
  status: string;

  @Prop({
    required: true,
    type: String,
    enum: ['SCOUT', 'RELAY', 'COORDINATOR'],
    default: 'SCOUT',
  })
  role: string;

  @Prop({ required: true, type: Number, default: 150 })
  communicationRangeMeters: number;

  @Prop({ required: true, type: Boolean, default: true })
  meshConnected: boolean;

  @Prop({
    type: Object,
    default: { rgbActive: true, thermalActive: true, lidarActive: true },
  })
  sensors: {
    rgbActive: boolean;
    thermalActive: boolean;
    lidarActive: boolean;
  };

  @Prop({ type: Date, default: Date.now })
  lastHeartbeatAt: Date;

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  coveragePercentage: number;

  @Prop({ type: [String], default: [] })
  connectedPeers: string[];

  @Prop({ type: Boolean, default: false })
  isRelayActive: boolean;
}

export const DroneSchema = SchemaFactory.createForClass(Drone);
