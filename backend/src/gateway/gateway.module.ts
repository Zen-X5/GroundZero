import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { DronesModule } from '../drones/drones.module';
import { SurvivorsModule } from '../survivors/survivors.module';
import { NetworkModule } from '../network/network.module';

@Module({
  imports: [DronesModule, SurvivorsModule, NetworkModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}
