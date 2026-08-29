import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Drone } from '../../drones/schemas/drone.schema';
import { MeshLink, MeshLinkSchema } from '../../common/schemas/mesh-link.schema';

export type NetworkTopologyDocument = NetworkTopology & Document;

@Schema({ timestamps: true, collection: 'network_topologies' })
export class NetworkTopology {
  @Prop({ required: true, unique: true, type: String })
  networkName: string; // e.g. "GROUNDZERO_MANET_01"

  @Prop({ type: Types.ObjectId, ref: 'Drone', required: false })
  gatewayDrone?: Types.ObjectId | Drone;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Drone' }], default: [] })
  activeNodes: Types.ObjectId[] | Drone[];

  @Prop({ type: [MeshLinkSchema], default: [] })
  links: MeshLink[];

  @Prop({ required: true, type: Boolean, default: false })
  blackoutZoneActive: boolean;

  @Prop({ type: Boolean, default: false })
  connectedToGround: boolean;

  @Prop({ type: Number, min: 0, max: 100, default: 100 })
  networkHealth: number;

  @Prop({ type: Number, default: 0 })
  activeNodeCount: number;

  @Prop({ type: Number, default: 0 })
  estimatedCoverageRadiusMeters: number;

  @Prop({ type: Date, default: Date.now })
  lastTopologyUpdate: Date;
}

export const NetworkTopologySchema = SchemaFactory.createForClass(NetworkTopology);
