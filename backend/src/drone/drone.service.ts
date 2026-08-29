import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DroneStatus } from '../common/enums/drone-status.enum';
import { CreateDroneDto, LocationDto } from './dto/create-drone.dto';
import { UpdateDroneDto } from './dto/update-drone.dto';
import { Drone, DroneDocument } from './schemas/drone.schema';

@Injectable()
export class DroneService {
  constructor(
    @InjectModel(Drone.name) private droneModel: Model<DroneDocument>,
  ) {}

  async create(createDroneDto: CreateDroneDto): Promise<Drone> {
    const createdDrone = new this.droneModel(createDroneDto);
    return createdDrone.save();
  }

  async findAll(): Promise<Drone[]> {
    return this.droneModel.find().exec();
  }

  async findById(droneId: string): Promise<Drone> {
    const drone = await this.droneModel.findOne({ drone_id: droneId }).exec();
    if (!drone) {
      throw new NotFoundException(`Drone with ID ${droneId} not found`);
    }
    return drone;
  }

  async update(droneId: string, updateDroneDto: UpdateDroneDto): Promise<Drone> {
    const updatedDrone = await this.droneModel
      .findOneAndUpdate({ drone_id: droneId }, updateDroneDto, { new: true })
      .exec();
    if (!updatedDrone) {
      throw new NotFoundException(`Drone with ID ${droneId} not found`);
    }
    return updatedDrone;
  }

  async updateStatus(droneId: string, status: DroneStatus): Promise<Drone> {
    return this.update(droneId, { status });
  }

  async updatePosition(droneId: string, position: LocationDto): Promise<Drone> {
    return this.update(droneId, { position });
  }

  async updateBattery(droneId: string, battery: number): Promise<Drone> {
    return this.update(droneId, { battery });
  }

  async remove(droneId: string): Promise<void> {
    const result = await this.droneModel.deleteOne({ drone_id: droneId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Drone with ID ${droneId} not found`);
    }
  }
}
