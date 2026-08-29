import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { LocationDto } from '../../drone/dto/create-drone.dto';

export class AiPredictRequestDto {
  @IsString()
  observation_id: string;

  @IsString()
  drone_id: string;

  @IsString()
  sensor: string;

  @IsOptional()
  @IsString()
  image?: string | null;

  @IsString()
  timestamp: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}
