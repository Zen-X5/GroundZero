import { Module } from '@nestjs/common';
import { AiClient } from './ai.client';
import { AiService } from './ai.service';

@Module({
  providers: [AiClient, AiService],
  exports: [AiService],
})
export class AiModule {}
