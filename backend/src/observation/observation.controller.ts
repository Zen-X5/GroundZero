import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateObservationDto } from './dto/create-observation.dto';
import { ObservationService } from './observation.service';
import { Observation } from './schemas/observation.schema';

@Controller('observations')
export class ObservationController {
  constructor(private readonly observationService: ObservationService) {}

  @Post()
  async create(
    @Body() createObservationDto: CreateObservationDto,
  ): Promise<{ observation: Observation; detections: any[] }> {
    return this.observationService.create(createObservationDto);
  }

  @Get()
  async findAll(): Promise<Observation[]> {
    return this.observationService.findAll();
  }

  @Get(':observationId')
  async findById(@Param('observationId') observationId: string): Promise<Observation> {
    return this.observationService.findById(observationId);
  }

  @Get('drone/:droneId')
  async findByDrone(@Param('droneId') droneId: string): Promise<Observation[]> {
    return this.observationService.findByDrone(droneId);
  }
}
