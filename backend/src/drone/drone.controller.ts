import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DroneService } from './drone.service';
import { CreateDroneDto } from './dto/create-drone.dto';
import { UpdateDroneDto } from './dto/update-drone.dto';
import { Drone } from './schemas/drone.schema';

@Controller('drones')
export class DroneController {
  constructor(private readonly droneService: DroneService) {}

  @Post()
  async create(@Body() createDroneDto: CreateDroneDto): Promise<Drone> {
    return this.droneService.create(createDroneDto);
  }

  @Get()
  async findAll(): Promise<Drone[]> {
    return this.droneService.findAll();
  }

  @Get(':droneId')
  async findById(@Param('droneId') droneId: string): Promise<Drone> {
    return this.droneService.findById(droneId);
  }

  @Patch(':droneId')
  async update(
    @Param('droneId') droneId: string,
    @Body() updateDroneDto: UpdateDroneDto,
  ): Promise<Drone> {
    return this.droneService.update(droneId, updateDroneDto);
  }

  @Delete(':droneId')
  async remove(@Param('droneId') droneId: string): Promise<{ message: string }> {
    await this.droneService.remove(droneId);
    return { message: `Drone with ID ${droneId} has been successfully deleted` };
  }
}
