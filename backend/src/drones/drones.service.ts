import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Drone, DroneDocument } from './schemas/drone.schema';
import { CreateDroneDto, UpdateDroneTelemetryDto } from './dto/create-drone.dto';

@Injectable()
export class DronesService {
  private readonly logger = new Logger(DronesService.name);
  private memoryDrones: Map<string, Drone> = new Map();

  constructor(
    @InjectModel(Drone.name) private droneModel: Model<DroneDocument>,
  ) {}

  async findAll(): Promise<Drone[]> {
    try {
      const docs = await this.droneModel.find().exec();
      if (docs.length > 0) return docs;
    } catch (e) {
      this.logger.warn(`MongoDB unavailable: ${e.message}`);
    }
    return Array.from(this.memoryDrones.values());
  }

  async findByCallsign(callsign: string): Promise<Drone | null> {
    try {
      const doc = await this.droneModel.findOne({ callsign }).exec();
      if (doc) return doc;
    } catch (e) {
      this.logger.warn(`MongoDB unavailable: ${e.message}`);
    }
    return this.memoryDrones.get(callsign) || null;
  }

  async findById(id: string): Promise<Drone | null> {
    try {
      return await this.droneModel.findById(id).exec();
    } catch (e) {
      return null;
    }
  }

  async upsertTelemetry(dto: CreateDroneDto): Promise<Drone> {
    const payload = {
      ...dto,
      lastHeartbeatAt: new Date(),
    };

    this.memoryDrones.set(dto.callsign, payload as Drone);

    try {
      return await this.droneModel
        .findOneAndUpdate(
          { callsign: dto.callsign },
          { $set: payload },
          { upsert: true, new: true },
        )
        .exec();
    } catch (e) {
      return payload as Drone;
    }
  }

  async updateStatus(callsign: string, updateDto: UpdateDroneTelemetryDto): Promise<Drone | null> {
    const existing = this.memoryDrones.get(callsign) || ({} as Drone);
    const updated = {
      ...existing,
      ...updateDto,
      callsign,
      lastHeartbeatAt: new Date(),
    } as Drone;
    this.memoryDrones.set(callsign, updated);

    try {
      return await this.droneModel
        .findOneAndUpdate(
          { callsign },
          { $set: { ...updateDto, lastHeartbeatAt: new Date() } },
          { new: true },
        )
        .exec();
    } catch (e) {
      return updated;
    }
  }
}
