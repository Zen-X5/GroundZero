import { Controller, Get, Post, Body } from '@nestjs/common';
import { NetworkService } from './network.service';
import { NetworkTopology } from './schemas/network.schema';

@Controller('network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('topology')
  async getTopology() {
    return await this.networkService.getLatestTopology();
  }

  @Post('topology')
  async updateTopology(@Body() dto: Partial<NetworkTopology>) {
    return await this.networkService.updateTopology(dto);
  }
}
