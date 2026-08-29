import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Survivor, SurvivorSchema } from './schemas/survivor.schema';
import { SurvivorsService } from './survivors.service';
import { SurvivorsController } from './survivors.controller';
import { Drone, DroneSchema } from '../drones/schemas/drone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Survivor.name, schema: SurvivorSchema },
      { name: Drone.name, schema: DroneSchema }
    ]),
  ],
  controllers: [SurvivorsController],
  providers: [SurvivorsService],
  exports: [SurvivorsService],
})
export class SurvivorsModule {}
