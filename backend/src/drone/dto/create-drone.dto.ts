import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { DroneStatus } from '../../common/enums/drone-status.enum';
import { MissionType } from '../../common/enums/mission-type.enum';

export class LocationDto {
  @IsString()
  frame: string;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  z: number;
}

export class DroneMissionDto {
  @IsEnum(MissionType)
  type: MissionType;

  @IsOptional()
  @IsString()
  sector_id?: string;
}

export class CreateDroneDto {
  @IsString()
  drone_id: string;

  @IsOptional()
  @IsEnum(DroneStatus)
  status?: DroneStatus;

  @ValidateNested()
  @Type(() => LocationDto)
  position: LocationDto;

  @IsNumber()
  @Min(0)
  @Max(100)
  battery: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DroneMissionDto)
  mission?: DroneMissionDto;
}
