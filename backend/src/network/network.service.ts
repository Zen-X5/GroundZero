import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NetworkTopology, NetworkTopologyDocument } from './schemas/network.schema';

@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);
  private currentTopology: NetworkTopology = {
    networkName: 'GROUNDZERO_MANET_01',
    activeNodes: [],
    links: [],
    blackoutZoneActive: true,
    connectedToGround: true,
    networkHealth: 94,
    activeNodeCount: 3,
    estimatedCoverageRadiusMeters: 450,
    lastTopologyUpdate: new Date(),
  };

  constructor(
    @InjectModel(NetworkTopology.name) private topologyModel: Model<NetworkTopologyDocument>,
  ) {}

  async getLatestTopology(): Promise<NetworkTopology> {
    try {
      const doc = await this.topologyModel
        .findOne()
        .populate('gatewayDrone')
        .populate('activeNodes')
        .populate('links.sourceDrone')
        .populate('links.targetDrone')
        .sort({ updatedAt: -1 })
        .exec();
      if (doc) return doc;
    } catch (e) {
      this.logger.warn(`MongoDB unavailable: ${e.message}`);
    }
    return this.currentTopology;
  }

  async updateTopology(dto: Partial<NetworkTopology>): Promise<NetworkTopology> {
    const payload = {
      ...this.currentTopology,
      ...dto,
      lastTopologyUpdate: new Date(),
    } as NetworkTopology;

    this.currentTopology = payload;

    try {
      return await this.topologyModel
        .findOneAndUpdate(
          { networkName: payload.networkName },
          { $set: payload },
          { upsert: true, new: true },
        )
        .populate('gatewayDrone')
        .populate('activeNodes')
        .exec();
    } catch (e) {
      return payload;
    }
  }
}
