import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class BoundingBoxDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  @Min(0)
  width: number;

  @IsNumber()
  @Min(0)
  height: number;
}

export class AiDetectionItemDto {
  @IsString()
  class: string;

  @IsNumber()
  confidence: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => BoundingBoxDto)
  bounding_box?: BoundingBoxDto;
}

export class AiPredictResponseDto {
  @IsString()
  observation_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiDetectionItemDto)
  detections: AiDetectionItemDto[];
}
