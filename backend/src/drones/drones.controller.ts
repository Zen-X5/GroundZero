import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { DronesService } from './drones.service';
import { CreateDroneDto, UpdateDroneTelemetryDto } from './dto/create-drone.dto';

@Controller('drones')
export class DronesController {
  constructor(private readonly dronesService: DronesService) {}

  @Get()
  async getAllDrones() {
    return await this.dronesService.findAll();
  }

  @Get(':callsign')
  async getDroneByCallsign(@Param('callsign') callsign: string) {
    return await this.dronesService.findByCallsign(callsign);
  }

  @Post('telemetry')
  async postTelemetry(@Body() dto: CreateDroneDto) {
    return await this.dronesService.upsertTelemetry(dto);
  }

  @Patch(':callsign')
  async patchTelemetry(
    @Param('callsign') callsign: string,
    @Body() updateDto: UpdateDroneTelemetryDto,
  ) {
    return await this.dronesService.updateStatus(callsign, updateDto);
  }

  @Post('purge-stale')
  async purgeStale() {
    return await this.dronesService.purgeStale();
  }
}

