import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { HazardType } from '../../common/enums/hazard-type.enum';
import { Location, LocationSchema } from '../../common/schemas/location.schema';

export type HazardDocument = HydratedDocument<Hazard>;

@Schema({ timestamps: true })
export class Hazard {
  @Prop({ required: true, unique: true, index: true })
  hazard_id: string;

  @Prop({ type: String, enum: HazardType, required: true })
  type: HazardType;

  @Prop({ required: true, min: 0, max: 1 })
  severity: number;

  @Prop({ type: LocationSchema, required: true })
  location: Location;

  @Prop({ required: true, default: 0 })
  radius: number;

  @Prop({ required: true, default: 'active' })
  status: string;
}

export const HazardSchema = SchemaFactory.createForClass(Hazard);
