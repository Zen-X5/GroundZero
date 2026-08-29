import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DronesModule } from './drones/drones.module';
import { SurvivorsModule } from './survivors/survivors.module';
import { NetworkModule } from './network/network.module';
import { BuildingsModule } from './buildings/buildings.module';
import { HazardsModule } from './hazards/hazards.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/groundzero',
        serverSelectionTimeoutMS: 5000,
        autoIndex: true,
      }),
      inject: [ConfigService],
    }),
    DronesModule,
    SurvivorsModule,
    NetworkModule,
    BuildingsModule,
    HazardsModule,
    GatewayModule,
  ],
})
export class AppModule {}
