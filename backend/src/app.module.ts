import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DroneModule } from './drone/drone.module';
import { ObservationModule } from './observation/observation.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/groundzero'),
    DroneModule,
    ObservationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
