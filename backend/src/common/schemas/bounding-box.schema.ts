import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsNumber, Min } from 'class-validator';

@Schema({ _id: false })
export class BoundingBox {
  @Prop({ required: true })
  @IsNumber()
  x: number;

  @Prop({ required: true })
  @IsNumber()
  y: number;

  @Prop({ required: true })
  @IsNumber()
  @Min(0)
  width: number;

  @Prop({ required: true })
  @IsNumber()
  @Min(0)
  height: number;
}

export const BoundingBoxSchema = SchemaFactory.createForClass(BoundingBox);
