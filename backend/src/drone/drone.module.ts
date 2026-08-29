import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DroneController } from './drone.controller';
import { DroneService } from './drone.service';
import { Drone, DroneSchema } from './schemas/drone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Drone.name, schema: DroneSchema }]),
  ],
  controllers: [DroneController],
  providers: [DroneService],
  exports: [DroneService, MongooseModule],
})
export class DroneModule {}
