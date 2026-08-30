import { Controller, Get, Post, Body, Param } from '@nestjs/common';
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

  @Get('connectivity/:callsign')
  async getConnectivity(@Param('callsign') callsign: string) {
    const isConnected = await this.networkService.isDroneConnected(callsign);
    return { callsign, isConnected };
  }
}
