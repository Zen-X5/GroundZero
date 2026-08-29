import { Injectable, Logger } from '@nestjs/common';
import { AiClient } from './ai.client';
import { AiPredictRequestDto } from './dto/ai-predict-request.dto';
import { AiPredictResponseDto } from './dto/ai-predict-response.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly aiClient: AiClient) {}

  /**
   * Orchestrates requesting a prediction from the AI Inference Service.
   * Gracefully handles service unavailability to prevent application crashes.
   */
  async requestPrediction(request: AiPredictRequestDto): Promise<AiPredictResponseDto | null> {
    try {
      return await this.aiClient.predict(request);
    } catch (error) {
      this.logger.error(
        `[AI] FastAPI is unavailable. Saved observation ${request.observation_id} will remain unprocessed by AI.`,
      );
      // Return null to signify AI processing failed, keeping NestJS online
      return null;
    }
  }
}
