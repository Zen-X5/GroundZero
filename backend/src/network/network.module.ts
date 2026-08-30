import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NetworkTopology, NetworkTopologySchema } from './schemas/network.schema';
import { NetworkService } from './network.service';
import { NetworkController } from './network.controller';
import { Drone, DroneSchema } from '../drones/schemas/drone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NetworkTopology.name, schema: NetworkTopologySchema },
      { name: Drone.name, schema: DroneSchema }
    ]),
  ],
  controllers: [NetworkController],
  providers: [NetworkService],
  exports: [NetworkService],
})
export class NetworkModule {}
