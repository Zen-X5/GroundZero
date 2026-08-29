import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Hazard, HazardSchema } from './schemas/hazard.schema';
import { HazardsService } from './hazards.service';
import { HazardsController } from './hazards.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Hazard.name, schema: HazardSchema }]),
  ],
  controllers: [HazardsController],
  providers: [HazardsService],
  exports: [HazardsService],
})
export class HazardsModule {}
