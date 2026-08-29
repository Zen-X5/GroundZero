import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RiskLevel } from '../../common/enums/risk-level.enum';
import { SurvivorStatus } from '../../common/enums/survivor-status.enum';
import { Location, LocationSchema } from '../../common/schemas/location.schema';

export type SurvivorDocument = HydratedDocument<Survivor>;

@Schema({ _id: false })
export class SurvivorRiskFactors {
  @Prop({ default: 0 })
  survivor_confidence: number;

  @Prop({ default: 0 })
  flood: number;

  @Prop({ default: 0 })
  structural_damage: number;

  @Prop({ default: 0 })
  accessibility: number;

  @Prop({ default: 0 })
  isolation: number;
}
export const SurvivorRiskFactorsSchema = SchemaFactory.createForClass(SurvivorRiskFactors);

@Schema({ _id: false })
export class SurvivorRisk {
  @Prop({ required: true, min: 0, max: 1, default: 0 })
  score: number;

  @Prop({ type: String, enum: RiskLevel, default: RiskLevel.LOW })
  level: RiskLevel;

  @Prop({ type: SurvivorRiskFactorsSchema, default: () => ({}) })
  factors: SurvivorRiskFactors;
}
export const SurvivorRiskSchema = SchemaFactory.createForClass(SurvivorRisk);

@Schema({ _id: false })
export class SurvivorPriority {
  @Prop({ required: true, default: 999 })
  priority: number;

  @Prop({ required: true, min: 0, max: 1, default: 0 })
  score: number;

  @Prop({ type: [String], default: [] })
  reasons: string[];
}
export const SurvivorPrioritySchema = SchemaFactory.createForClass(SurvivorPriority);

@Schema({ timestamps: true })
export class Survivor {
  @Prop({ required: true, unique: true, index: true })
  survivor_id: string;

  @Prop({ type: LocationSchema, required: true })
  location: Location;

  @Prop({ required: true, min: 0, max: 1, default: 0 })
  confidence: number;

  @Prop({ type: [String], default: [] })
  observations: string[];

  @Prop({ type: [String], default: [] })
  detected_by: string[];

  @Prop({ type: String, enum: SurvivorStatus, default: SurvivorStatus.UNRESCUED })
  status: SurvivorStatus;

  @Prop({ type: SurvivorRiskSchema, default: () => ({ score: 0, level: RiskLevel.LOW, factors: {} }) })
  risk: SurvivorRisk;

  @Prop({ type: SurvivorPrioritySchema, default: () => ({ priority: 999, score: 0, reasons: [] }) })
  priority: SurvivorPriority;
}

export const SurvivorSchema = SchemaFactory.createForClass(Survivor);
