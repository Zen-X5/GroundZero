import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { DronesModule } from '../drones/drones.module';
import { SurvivorsModule } from '../survivors/survivors.module';
import { NetworkModule } from '../network/network.module';
import { BuildingsModule } from '../buildings/buildings.module';

@Module({
  imports: [DronesModule, SurvivorsModule, NetworkModule, BuildingsModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}
