import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DetectionClass } from '../../common/enums/detection-class.enum';
import { BoundingBox, BoundingBoxSchema } from '../../common/schemas/bounding-box.schema';

export type DetectionDocument = HydratedDocument<Detection>;

@Schema({ timestamps: true })
export class Detection {
  @Prop({ required: true, unique: true, index: true })
  detection_id: string;

  @Prop({ required: true, index: true })
  observation_id: string;

  @Prop({ type: String, enum: DetectionClass, default: DetectionClass.PERSON })
  class: DetectionClass;

  @Prop({ required: true, min: 0, max: 1 })
  confidence: number;

  @Prop({ type: BoundingBoxSchema, required: false })
  bounding_box?: BoundingBox;

  @Prop({ required: true })
  timestamp: string;
}

export const DetectionSchema = SchemaFactory.createForClass(Detection);
