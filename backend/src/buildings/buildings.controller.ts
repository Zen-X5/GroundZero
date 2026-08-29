import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingInspection } from './schemas/building.schema';

@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  async getAllBuildings() {
    return await this.buildingsService.findAll();
  }

  @Get(':name')
  async getBuildingByName(@Param('name') name: string) {
    return await this.buildingsService.findByName(name);
  }

  @Post(':name/inspection')
  async updateInspection(
    @Param('name') name: string,
    @Body() dto: Partial<BuildingInspection>,
  ) {
    return await this.buildingsService.updateInspection(name, dto);
  }
}
