import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BuildingInspection, BuildingInspectionSchema } from './schemas/building.schema';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BuildingInspection.name, schema: BuildingInspectionSchema }]),
  ],
  controllers: [BuildingsController],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
