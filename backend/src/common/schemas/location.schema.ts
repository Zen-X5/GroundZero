import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsNumber, IsString } from 'class-validator';

@Schema({ _id: false })
export class Location {
  @Prop({ required: true, default: 'world' })
  @IsString()
  frame: string;

  @Prop({ required: true })
  @IsNumber()
  x: number;

  @Prop({ required: true })
  @IsNumber()
  y: number;

  @Prop({ required: true })
  @IsNumber()
  z: number;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
