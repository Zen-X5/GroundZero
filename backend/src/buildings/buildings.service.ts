import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BuildingInspection, BuildingInspectionDocument } from './schemas/building.schema';

@Injectable()
export class BuildingsService {
  private readonly logger = new Logger(BuildingsService.name);
  private memoryBuildings: Map<string, BuildingInspection> = new Map();

  constructor(
    @InjectModel(BuildingInspection.name) private buildingModel: Model<BuildingInspectionDocument>,
  ) {
    this.seedDefaultBuildings();
  }

  private seedDefaultBuildings() {
    const defaults: BuildingInspection[] = [
      {
        name: 'urban_building_1_apartments',
        position: { x: 155, y: 32, z: 5 },
        heightMeters: 10,
        floors: 3,
        structuralDamage: 'MODERATE',
        accessibleOpenings: [
          { openingId: 'window_fl2_south', floorLevel: 2, dimensionsMeters: [6.0, 1.4], isObstructed: false, detectedOccupants: 2, openingType: 'WINDOW', inspectionConfidence: 0.92 },
          { openingId: 'window_fl1_south', floorLevel: 1, dimensionsMeters: [6.0, 1.4], isObstructed: true, detectedOccupants: 1, openingType: 'WINDOW', inspectionConfidence: 0.85 },
        ],
        inspectionStatus: 'IN_PROGRESS',
        estimatedOccupancyProbability: 0.88,
        inspectionDrones: [],
        lastInspectedAt: new Date(),
      },
      {
        name: 'urban_building_2_commercial',
        position: { x: 148, y: 75, z: 7 },
        heightMeters: 14,
        floors: 4,
        structuralDamage: 'LOW',
        accessibleOpenings: [
          { openingId: 'glass_facade_fl2', floorLevel: 2, dimensionsMeters: [10.0, 2.5], isObstructed: false, detectedOccupants: 2, openingType: 'WINDOW', inspectionConfidence: 0.95 },
        ],
        inspectionStatus: 'IN_PROGRESS',
        estimatedOccupancyProbability: 0.75,
        inspectionDrones: [],
        lastInspectedAt: new Date(),
      },
    ];
    defaults.forEach((b) => this.memoryBuildings.set(b.name, b));
  }

  async findAll(): Promise<BuildingInspection[]> {
    try {
      const docs = await this.buildingModel.find().populate('inspectionDrones').exec();
      if (docs.length > 0) return docs;
    } catch (e) {
      this.logger.warn(`MongoDB unavailable: ${e.message}`);
    }
    return Array.from(this.memoryBuildings.values());
  }

  async findByName(name: string): Promise<BuildingInspection | null> {
    try {
      const doc = await this.buildingModel.findOne({ name }).populate('inspectionDrones').exec();
      if (doc) return doc;
    } catch (e) {
      this.logger.warn(`MongoDB unavailable: ${e.message}`);
    }
    return this.memoryBuildings.get(name) || null;
  }

  async updateInspection(name: string, dto: Partial<BuildingInspection>): Promise<BuildingInspection> {
    const existing = this.memoryBuildings.get(name) || ({} as BuildingInspection);
    const updated = {
      ...existing,
      ...dto,
      name,
      lastInspectedAt: new Date(),
    } as BuildingInspection;
    this.memoryBuildings.set(name, updated);

    try {
      return await this.buildingModel
        .findOneAndUpdate(
          { name },
          { $set: updated },
          { upsert: true, new: true },
        )
        .populate('inspectionDrones')
        .exec();
    } catch (e) {
      return updated;
    }
  }
}
