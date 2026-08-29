import { Controller, Get, Post, Body } from '@nestjs/common';
import { HazardsService } from './hazards.service';
import { Hazard } from './schemas/hazard.schema';

@Controller('hazards')
export class HazardsController {
  constructor(private readonly hazardsService: HazardsService) {}

  @Get()
  async getAllHazards() {
    return await this.hazardsService.findAll();
  }

  @Post()
  async upsertHazard(@Body() hazard: Hazard) {
    return await this.hazardsService.upsertHazard(hazard);
  }
}
