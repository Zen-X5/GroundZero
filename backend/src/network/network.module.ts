import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NetworkTopology, NetworkTopologySchema } from './schemas/network.schema';
import { NetworkService } from './network.service';
import { NetworkController } from './network.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: NetworkTopology.name, schema: NetworkTopologySchema }]),
  ],
  controllers: [NetworkController],
  providers: [NetworkService],
  exports: [NetworkService],
})
export class NetworkModule {}
