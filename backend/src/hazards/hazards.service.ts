import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hazard, HazardDocument } from './schemas/hazard.schema';

@Injectable()
export class HazardsService {
  private readonly logger = new Logger(HazardsService.name);
  private memoryHazards: Map<string, Hazard> = new Map();

  constructor(
    @InjectModel(Hazard.name) private hazardModel: Model<HazardDocument>,
  ) {
    this.seedDefaultHazards();
  }

  private seedDefaultHazards() {
    const defaults: Hazard[] = [
      {
        name: 'HAZ_FLOOD_DEEP',
        type: 'FLOOD',
        position: { x: 35, y: 55, z: 1.0 },
        severity: 92,
        radiusMeters: 45,
        active: true,
        metadata: { waterDepthMeters: 1.0, risingRateMetersPerHour: 0.25, currentSpeedMs: 0.4 },
      },
      {
        name: 'HAZ_ROAD_BLOCKAGE',
        type: 'DEBRIS',
        position: { x: 105, y: 50, z: 1.5 },
        severity: 75,
        radiusMeters: 20,
        active: true,
        metadata: { blockageType: 'OVERTURNED_VEHICLES_AND_BARRIERS', clearanceRequired: true },
      },
    ];
    defaults.forEach((h) => this.memoryHazards.set(h.name, h));
  }

  async findAll(): Promise<Hazard[]> {
    try {
      const docs = await this.hazardModel.find().exec();
      if (docs.length > 0) return docs;
    } catch (e) {
      this.logger.warn(`MongoDB unavailable: ${e.message}`);
    }
    return Array.from(this.memoryHazards.values());
  }

  async upsertHazard(hazard: Hazard): Promise<Hazard> {
    this.memoryHazards.set(hazard.name, hazard);
    try {
      return await this.hazardModel
        .findOneAndUpdate(
          { name: hazard.name },
          { $set: hazard },
          { upsert: true, new: true },
        )
        .exec();
    } catch (e) {
      return hazard;
    }
  }
}
