import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { SurvivorsService } from './survivors.service';
import { CreateSurvivorDto, UpdateSurvivorDto } from './dto/create-survivor.dto';

@Controller('survivors')
export class SurvivorsController {
  constructor(private readonly survivorsService: SurvivorsService) {}

  @Get()
  async getAllSurvivors() {
    return await this.survivorsService.findAll();
  }

  @Get(':code')
  async getSurvivorByCode(@Param('code') code: string) {
    return await this.survivorsService.findByCode(code);
  }

  @Post('detection')
  async postDetection(@Body() dto: CreateSurvivorDto) {
    return await this.survivorsService.upsertDetection(dto);
  }

  @Patch(':code')
  async patchSurvivor(
    @Param('code') code: string,
    @Body() dto: UpdateSurvivorDto,
  ) {
    return await this.survivorsService.updateSurvivor(code, dto);
  }
}
