import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SensorType } from '../../common/enums/sensor-type.enum';
import { Location, LocationSchema } from '../../common/schemas/location.schema';

export type ObservationDocument = HydratedDocument<Observation>;

@Schema({ timestamps: true })
export class Observation {
  @Prop({ required: true, unique: true, index: true })
  observation_id: string;

  @Prop({ required: true, index: true })
  drone_id: string;

  @Prop({ type: String, enum: SensorType, required: true })
  sensor: SensorType;

  @Prop({ required: true })
  timestamp: string;

  @Prop({ type: LocationSchema, required: true })
  location: Location;

  @Prop({ type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' })
  ai_status: string;
}

export const ObservationSchema = SchemaFactory.createForClass(Observation);
