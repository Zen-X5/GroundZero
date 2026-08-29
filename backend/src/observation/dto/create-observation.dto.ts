import { Type } from 'class-transformer';
import { IsEnum, IsString, ValidateNested } from 'class-validator';
import { SensorType } from '../../common/enums/sensor-type.enum';
import { LocationDto } from '../../drone/dto/create-drone.dto';

export class CreateObservationDto {
  @IsString()
  observation_id: string;

  @IsString()
  drone_id: string;

  @IsEnum(SensorType)
  sensor: SensorType;

  @IsString()
  timestamp: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}
