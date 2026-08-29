import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Survivor, SurvivorDocument } from './schemas/survivor.schema';
import { CreateSurvivorDto, UpdateSurvivorDto } from './dto/create-survivor.dto';
import { Drone, DroneDocument } from '../drones/schemas/drone.schema';

@Injectable()
export class SurvivorsService {
  private readonly logger = new Logger(SurvivorsService.name);
  private memorySurvivors: Map<string, Survivor> = new Map();

  constructor(
    @InjectModel(Survivor.name) private survivorModel: Model<SurvivorDocument>,
    @InjectModel(Drone.name) private droneModel: Model<DroneDocument>,
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

  calculateRiskScore(
    environment: string,
    posture: string,
    confidenceScore: number,
    confirmingDronesCount: number
  ): { riskScore: number; riskDetails: any } {
    let envThreat = 50;
    let envReason = 'Sighted on open ground or road block';
    switch (environment) {
      case 'WATER_RAFT':
        envThreat = 80;
        envReason = 'Submerged in flood water on temporary raft (High threat)';
        break;
      case 'WINDOW_VOID':
        envThreat = 85;
        envReason = 'Trapped in unstable building opening/void (Critical structural threat)';
        break;
      case 'ROOF_FLOOD':
        envThreat = 75;
        envReason = 'On roof surrounded by rising flood waters';
        break;
      case 'TREE_PERCH':
        envThreat = 50;
        envReason = 'Isolated in tree canopy (Stable but hard to reach)';
        break;
      case 'RUBBLE_SURFACE':
        envThreat = 60;
        envReason = 'On unstable collapse debris/rubble surface';
        break;
      case 'ROAD_DEBRIS':
        envThreat = 40;
        envReason = 'On open ground or road block debris (Lower threat)';
        break;
    }

    let mobilityVal = 50;
    let mobilityReason = 'Posture analyzed as standing/alert';
    switch (posture) {
      case 'PRONE_INJURED':
        mobilityVal = 90;
        mobilityReason = 'Posture analyzed as PRONE/INJURED (Severe mobility impairment)';
        break;
      case 'SITTING_HUDDLED':
        mobilityVal = 65;
        mobilityReason = 'Posture analyzed as SITTING/HUDDLED (Possible shock/exposure)';
        break;
      case 'STANDING_WAVING':
        mobilityVal = 30;
        mobilityReason = 'Posture analyzed as STANDING/WAVING (Active and mobile)';
        break;
    }

    let accessibilityVal = 50;
    if (environment === 'WINDOW_VOID' || environment === 'TREE_PERCH') {
      accessibilityVal = 80;
    } else if (environment === 'ROAD_DEBRIS') {
      accessibilityVal = 30;
    }

    let multiplier = 1.0;
    if (confirmingDronesCount > 1) {
      multiplier += 0.1 * (confirmingDronesCount - 1);
    }

    const rawRisk = (envThreat * 0.4 + mobilityVal * 0.4 + accessibilityVal * 0.2) * multiplier;
    const finalRiskScore = Math.min(Math.max(Math.round(rawRisk * confidenceScore * 10) / 10, 10), 99.9);

    const reasoning = [
      envReason,
      mobilityReason,
      `Sighting verified by ${confirmingDronesCount} swarm node(s) with ${(confidenceScore * 100).toFixed(0)}% confidence`,
    ];
    if (confirmingDronesCount > 1) {
      reasoning.push(`Swarm consensus multiplier: ${multiplier.toFixed(1)}x urgency escalation`);
    }

    return {
      riskScore: finalRiskScore,
      riskDetails: {
        environmentalThreat: envThreat,
        mobilityStatus: mobilityVal,
        accessibilityScore: accessibilityVal,
        urgencyMultiplier: multiplier,
        reasoning,
      },
    };
  }

  async upsertDetection(dto: CreateSurvivorDto): Promise<Survivor> {
    const SPATIAL_THRESHOLD = 5.0; // 5 meters
    let matchedSurvivorCode = dto.code;
    let existing: Survivor | null = null;

    // Resolve confirmingDrones callsign strings to MongoDB ObjectIds (with auto-create fallback)
    const droneIds: Types.ObjectId[] = [];
    if (dto.confirmingDrones && dto.confirmingDrones.length > 0) {
      for (const callsign of dto.confirmingDrones) {
        if (typeof callsign === 'string') {
          try {
            let droneDoc = await this.droneModel.findOne({ callsign: callsign.toLowerCase() }).exec();
            if (!droneDoc) {
              droneDoc = await this.droneModel.create({
                callsign: callsign.toLowerCase(),
                sector: dto.sector || 'SECTOR_A',
                position: { x: 0, y: 0, z: 0 },
                heading: 0,
                speed: 0,
                batteryPercentage: 100,
                status: 'SCANNING',
                role: 'SCOUT',
                communicationRangeMeters: 150,
                meshConnected: true
              });
            }
            if (droneDoc) {
              droneIds.push(droneDoc._id as Types.ObjectId);
            }
          } catch (err) {}
        }
      }
    }

    const newPos = dto.globalPosition;

    // Check memory first
    if (newPos) {
      for (const [code, surv] of this.memorySurvivors.entries()) {
        const oldPos = surv.globalPosition;
        if (oldPos) {
          const dist = Math.sqrt(
            Math.pow(newPos.x - oldPos.x, 2) + Math.pow(newPos.y - oldPos.y, 2)
          );
          if (dist <= SPATIAL_THRESHOLD) {
            matchedSurvivorCode = code;
            existing = surv;
            break;
          }
        }
      }
    }

    // Fallback: Check MongoDB
    if (!existing && newPos) {
      try {
        const docs = await this.survivorModel.find().exec();
        for (const doc of docs) {
          const oldPos = doc.globalPosition;
          if (oldPos) {
            const dist = Math.sqrt(
              Math.pow(newPos.x - oldPos.x, 2) + Math.pow(newPos.y - oldPos.y, 2)
            );
            if (dist <= SPATIAL_THRESHOLD) {
              matchedSurvivorCode = doc.code;
              existing = doc.toObject();
              break;
            }
          }
        }
      } catch (e) {
        this.logger.warn(`Proximity search failed in DB: ${e.message}`);
      }
    }

    const observationCount = (existing?.observationCount || 0) + (dto.observationCount || 1);

    // Merge confirming drones object IDs
    const existingDrones = (existing?.confirmingDrones || []).map((d: any) =>
      d._id ? d._id.toString() : d.toString(),
    );
    const newDrones = droneIds.map((id) => id.toString());
    const mergedDroneIds = Array.from(new Set([...existingDrones, ...newDrones])).map(
      (idStr) => new Types.ObjectId(idStr),
    );

    // Coordinate Weighted Average
    let mergedPos = dto.globalPosition;
    let mergedConfidence = dto.confidenceScore;

    if (existing && existing.globalPosition && newPos) {
      const totalConf = (existing.confidenceScore || 0.5) + (dto.confidenceScore || 0.5);
      mergedPos = {
        x: Number((((existing.globalPosition.x * (existing.confidenceScore || 0.5)) + (newPos.x * (dto.confidenceScore || 0.5))) / totalConf).toFixed(1)),
        y: Number((((existing.globalPosition.y * (existing.confidenceScore || 0.5)) + (newPos.y * (dto.confidenceScore || 0.5))) / totalConf).toFixed(1)),
        z: Number((((existing.globalPosition.z * (existing.confidenceScore || 0.5)) + (newPos.z * (dto.confidenceScore || 0.5))) / totalConf).toFixed(1)),
      };

      // Bayesian confidence boost if a new drone confirmed it
      const isNewDroneConfirmation = mergedDroneIds.length > existingDrones.length;
      if (isNewDroneConfirmation) {
        mergedConfidence = 1 - (1 - (existing.confidenceScore || 0.5)) * (1 - (dto.confidenceScore || 0.5));
        mergedConfidence = Math.min(Math.max(mergedConfidence, 0.0), 0.99);
      } else {
        mergedConfidence = Math.max(existing.confidenceScore, dto.confidenceScore);
      }
    }

    // Resolve posture from sensorEvidence
    const posture = (dto.sensorEvidence as any)?.posture || 'STANDING_WAVING';

    // Calculate risk details dynamically based on sensor data!
    const { riskScore: calculatedRisk, riskDetails: calculatedDetails } = this.calculateRiskScore(
      dto.environment || existing?.environment || 'ROAD_DEBRIS',
      posture,
      mergedConfidence,
      mergedDroneIds.length
    );

    const payload: Survivor = {
      ...dto,
      code: matchedSurvivorCode,
      globalPosition: mergedPos,
      confidenceScore: mergedConfidence,
      confirmingDrones: mergedDroneIds,
      observationCount,
      riskScore: calculatedRisk,
      riskDetails: calculatedDetails,
      firstDetectedAt: existing?.firstDetectedAt || new Date(),
      lastSeenAt: new Date(),
      status: dto.status || existing?.status || 'RESCUE_QUEUED',
      rescuePriorityRank: existing?.rescuePriorityRank || 999,
      estimatedGroupSize: dto.estimatedGroupSize ?? existing?.estimatedGroupSize ?? 1,
      notes: Array.from(new Set([...(existing?.notes || []), ...(dto.notes || []), `Observation #${observationCount} processed.`])),
    };

    this.memorySurvivors.set(matchedSurvivorCode, payload);
    await this.recalculatePriorityQueue();

    try {
      const gateway = require('../gateway/events.gateway').getGlobalEventsGateway();
      if (gateway) {
        gateway.broadcastSurvivorUpdate(payload);
        gateway.broadcastAlert({
          level: payload.riskScore >= 80 ? 'CRITICAL' : 'WARNING',
          title: `Multi-Drone Sighting: ${payload.code}`,
          message: `Coordinates: (${payload.globalPosition.x}m, ${payload.globalPosition.y}m) | Confirming Swarm Nodes: ${mergedDroneIds.length} | Confidence: ${(payload.confidenceScore * 100).toFixed(0)}%`,
          timestamp: Date.now(),
        });
      }
    } catch (_) {}

    try {
      return await this.survivorModel
        .findOneAndUpdate(
          { code: matchedSurvivorCode },
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
