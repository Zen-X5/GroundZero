import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ExplainableRiskBreakdown {
  @Prop({ required: true, type: Number, min: 0, max: 100 })
  environmentalThreat: number; // Rising flood, fire, structural instability (0-100)

  @Prop({ required: true, type: Number, min: 0, max: 100 })
  mobilityStatus: number; // Prone/injured vs mobile/waving (0-100)

  @Prop({ required: true, type: Number, min: 0, max: 100 })
  accessibilityScore: number; // Rescuer extraction route difficulty (0-100)

  @Prop({ required: true, type: Number, default: 1.0 })
  urgencyMultiplier: number;

  @Prop({ type: [String], default: [] })
  reasoning: string[]; // e.g. ["Rising flood water (0.2m/hr)", "Trapped inside 2nd-floor void"]
}

export const ExplainableRiskBreakdownSchema = SchemaFactory.createForClass(ExplainableRiskBreakdown);
