import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Survivor, SurvivorDocument } from './schemas/survivor.schema';
import { CreateSurvivorDto, UpdateSurvivorDto } from './dto/create-survivor.dto';

@Injectable()
export class SurvivorsService {
  private readonly logger = new Logger(SurvivorsService.name);
  private memorySurvivors: Map<string, Survivor> = new Map();

  constructor(
    @InjectModel(Survivor.name) private survivorModel: Model<SurvivorDocument>,
  ) {}

  async findAll(): Promise<Survivor[]> {
    try {
      const docs = await this.survivorModel
        .find()
        .populate('confirmingDrones')
        .populate('building')
        .populate('lastObservedBy')
        .sort({ rescuePriorityRank: 1, riskScore: -1 })
        .exec();
      if (docs.length > 0) return docs;
    } catch (e) {
      this.logger.warn(`MongoDB query failed, using in-memory store: ${e.message}`);
    }
    const list = Array.from(this.memorySurvivors.values());
    return list.sort((a, b) => (a.rescuePriorityRank || 999) - (b.rescuePriorityRank || 999));
  }

  async findByCode(code: string): Promise<Survivor | null> {
    try {
      const doc = await this.survivorModel
        .findOne({ code })
        .populate('confirmingDrones')
        .populate('building')
        .populate('lastObservedBy')
        .exec();
      if (doc) return doc;
    } catch (e) {
      this.logger.warn(`MongoDB query failed: ${e.message}`);
    }
    return this.memorySurvivors.get(code) || null;
  }

  async upsertDetection(dto: CreateSurvivorDto): Promise<Survivor> {
    const existing = this.memorySurvivors.get(dto.code);
    const observationCount = (existing?.observationCount || 0) + (dto.observationCount || 1);

    const confirmingDrones = Array.from(
      new Set([...(existing?.confirmingDrones || []), ...(dto.confirmingDrones || [])]),
    );

    const payload: Survivor = {
      ...dto,
      estimatedGroupSize: dto.estimatedGroupSize ?? existing?.estimatedGroupSize ?? 1,
      confirmingDrones,
      observationCount,
      firstDetectedAt: existing?.firstDetectedAt || new Date(),
      lastSeenAt: new Date(),
      status: dto.status || existing?.status || 'IDENTIFIED',
      rescuePriorityRank: dto.rescuePriorityRank || existing?.rescuePriorityRank || 999,
      notes: dto.notes || existing?.notes || [],
    };

    this.memorySurvivors.set(dto.code, payload);
    await this.recalculatePriorityQueue();

    try {
      return await this.survivorModel
        .findOneAndUpdate(
          { code: dto.code },
          { $set: payload },
          { upsert: true, new: true },
        )
        .populate('confirmingDrones')
        .populate('building')
        .exec();
    } catch (e) {
      return payload;
    }
  }

  async updateSurvivor(code: string, dto: UpdateSurvivorDto): Promise<Survivor | null> {
    const existing = this.memorySurvivors.get(code);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...dto,
      lastSeenAt: new Date(),
    } as Survivor;

    this.memorySurvivors.set(code, updated);

    try {
      return await this.survivorModel
        .findOneAndUpdate(
          { code },
          { $set: updated },
          { new: true },
        )
        .populate('confirmingDrones')
        .populate('building')
        .exec();
    } catch (e) {
      return updated;
    }
  }

  private async recalculatePriorityQueue(): Promise<void> {
    const all = Array.from(this.memorySurvivors.values())
      .filter((s) => s.status !== 'RESCUED')
      .sort((a, b) => b.riskScore - a.riskScore);

    all.forEach((survivor, index) => {
      survivor.rescuePriorityRank = index + 1;
      this.memorySurvivors.set(survivor.code, survivor);
    });
  }
}
