import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import { ObservationController } from './observation.controller';
import { ObservationService } from './observation.service';
import { Observation, ObservationSchema } from './schemas/observation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Observation.name, schema: ObservationSchema }]),
    AiModule,
  ],
  controllers: [ObservationController],
  providers: [ObservationService],
  exports: [ObservationService, MongooseModule],
})
export class ObservationModule {}
