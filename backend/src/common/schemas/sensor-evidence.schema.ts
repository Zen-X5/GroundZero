import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class SensorEvidence {
  @Prop({ type: Number, min: 0, max: 1, required: false })
  rgbConfidence?: number;

  @Prop({ type: Number, min: 0, max: 1, required: false })
  thermalConfidence?: number;

  @Prop({ type: Number, min: 0, max: 1, required: false })
  lidarEvidence?: number;

  @Prop({ type: Number, min: 0, max: 1, required: false })
  visualMotionConfidence?: number;
}

export const SensorEvidenceSchema = SchemaFactory.createForClass(SensorEvidence);
