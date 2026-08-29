import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { CreateObservationDto } from './dto/create-observation.dto';
import { Observation, ObservationDocument } from './schemas/observation.schema';

@Injectable()
export class ObservationService {
  constructor(
    @InjectModel(Observation.name) private observationModel: Model<ObservationDocument>,
    private readonly aiService: AiService,
  ) {}

  async create(createObservationDto: CreateObservationDto): Promise<{ observation: Observation; detections: any[] }> {
    // 1. Create and save raw observation fact
    const newObservation = new this.observationModel({
      ...createObservationDto,
      ai_status: 'pending',
    });
    let savedObservation = await newObservation.save();

    // 2. Trigger AI processing (calling FastAPI)
    savedObservation.ai_status = 'processing';
    savedObservation = await savedObservation.save();

    const aiRequest = {
      observation_id: savedObservation.observation_id,
      drone_id: savedObservation.drone_id,
      sensor: savedObservation.sensor,
      timestamp: savedObservation.timestamp,
      location: {
        frame: savedObservation.location.frame,
        x: savedObservation.location.x,
        y: savedObservation.location.y,
        z: savedObservation.location.z,
      },
    };

    const aiResult = await this.aiService.requestPrediction(aiRequest);

    if (aiResult) {
      savedObservation.ai_status = 'completed';
      savedObservation = await savedObservation.save();
      return {
        observation: savedObservation,
        detections: aiResult.detections,
      };
    } else {
      savedObservation.ai_status = 'failed';
      savedObservation = await savedObservation.save();
      return {
        observation: savedObservation,
        detections: [],
      };
    }
  }

  async findAll(): Promise<Observation[]> {
    return this.observationModel.find().exec();
  }

  async findById(observationId: string): Promise<Observation> {
    const observation = await this.observationModel.findOne({ observation_id: observationId }).exec();
    if (!observation) {
      throw new NotFoundException(`Observation with ID ${observationId} not found`);
    }
    return observation;
  }

  async findByDrone(droneId: string): Promise<Observation[]> {
    return this.observationModel.find({ drone_id: droneId }).exec();
  }
}
