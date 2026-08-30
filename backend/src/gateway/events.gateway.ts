import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DronesService } from '../drones/drones.service';
import { SurvivorsService } from '../survivors/survivors.service';
import { NetworkService } from '../network/network.service';
import { BuildingsService } from '../buildings/buildings.service';

let globalGatewayInstance: EventsGateway | null = null;

export function getGlobalEventsGateway(): EventsGateway | null {
  return globalGatewayInstance;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private broadcastInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly dronesService: DronesService,
    private readonly survivorsService: SurvivorsService,
    private readonly networkService: NetworkService,
    private readonly buildingsService: BuildingsService,
  ) {
    globalGatewayInstance = this;
  }

  onModuleInit() {
    this.logger.log('WebSocket Gateway initialized. Ready for push events.');
  }

  onModuleDestroy() {
    // Cleanup if necessary
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to Ground-Zero WebSocket: ${client.id}`);
    this.broadcastInitialState(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private async broadcastInitialState(client: Socket) {
    const drones = await this.dronesService.findAll();
    const survivors = await this.survivorsService.findAll();
    const topology = await this.networkService.getLatestTopology();

    client.emit('state:initial', {
      drones,
      survivors,
      topology,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: any): string {
    return 'pong';
  }

  // Broadcasters called by ingestion pipeline / AI service
  broadcastDroneTelemetry(droneData: any) {
    this.server.emit('telemetry:drone', droneData);
  }

  broadcastSurvivorUpdate(survivorData: any) {
    this.server.emit('detection:survivor', survivorData);
  }

  broadcastMeshTopology(topology: any) {
    this.server.emit('mesh:topology', topology);
  }

  broadcastAlert(alert: { level: string; title: string; message: string; timestamp: number }) {
    this.server.emit('system:alert', alert);
  }
}
