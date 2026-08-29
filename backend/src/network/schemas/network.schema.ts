import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { NetworkStatus } from '../../common/enums/network-status.enum';

export type NetworkDocument = HydratedDocument<Network>;

@Schema({ _id: false })
export class NetworkNeighbor {
  @Prop({ required: true })
  drone_id: string;

  @Prop({ required: true, min: 0, max: 1 })
  signal: number;
}
export const NetworkNeighborSchema = SchemaFactory.createForClass(NetworkNeighbor);

@Schema({ timestamps: true })
export class Network {
  @Prop({ required: true, unique: true, index: true })
  node_id: string;

  @Prop({ type: String, enum: NetworkStatus, default: NetworkStatus.CONNECTED })
  status: NetworkStatus;

  @Prop({ type: [NetworkNeighborSchema], default: [] })
  neighbors: NetworkNeighbor[];

  @Prop({ required: true, default: false })
  internet_available: boolean;

  @Prop({ required: true, default: true })
  mesh_available: boolean;
}

export const NetworkSchema = SchemaFactory.createForClass(Network);
