import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { DroneStatus } from '../../common/enums/drone-status.enum';
import { DroneMissionDto, LocationDto } from './create-drone.dto';

export class UpdateDroneDto {
  @IsOptional()
  @IsEnum(DroneStatus)
  status?: DroneStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  position?: LocationDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  battery?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DroneMissionDto)
  mission?: DroneMissionDto;
}
