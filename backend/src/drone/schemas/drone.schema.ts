import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DroneStatus } from '../../common/enums/drone-status.enum';
import { MissionType } from '../../common/enums/mission-type.enum';
import { Location, LocationSchema } from '../../common/schemas/location.schema';

export type DroneDocument = HydratedDocument<Drone>;

@Schema({ _id: false })
export class DroneMission {
  @Prop({ type: String, enum: MissionType, default: MissionType.IDLE })
  type: MissionType;

  @Prop({ type: String, default: null })
  sector_id: string | null;
}
export const DroneMissionSchema = SchemaFactory.createForClass(DroneMission);

@Schema({ timestamps: true })
export class Drone {
  @Prop({ required: true, unique: true, index: true })
  drone_id: string;

  @Prop({ type: String, enum: DroneStatus, default: DroneStatus.IDLE })
  status: DroneStatus;

  @Prop({ type: LocationSchema, required: true })
  position: Location;

  @Prop({ required: true, min: 0, max: 100 })
  battery: number;

  @Prop({ type: DroneMissionSchema, default: () => ({ type: MissionType.IDLE, sector_id: null }) })
  mission: DroneMission;
}

export const DroneSchema = SchemaFactory.createForClass(Drone);
