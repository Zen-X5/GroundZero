import { Injectable, Logger } from '@nestjs/common';
import { AiPredictRequestDto } from './dto/ai-predict-request.dto';
import { AiPredictResponseDto } from './dto/ai-predict-response.dto';

@Injectable()
export class AiClient {
  private readonly logger = new Logger(AiClient.name);
  private readonly fastapiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';

  async predict(request: AiPredictRequestDto): Promise<AiPredictResponseDto> {
    const url = `${this.fastapiUrl}/predict`;
    this.logger.log(`[AI] Sending prediction request to FastAPI for observation: ${request.observation_id}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`FastAPI returned status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as AiPredictResponseDto;
      this.logger.log(`[AI] FastAPI response received successfully. Found ${data.detections?.length || 0} detections.`);
      return data;
    } catch (error) {
      this.logger.error(`[AI] Error communicating with FastAPI service: ${error.message}`);
      throw error;
    }
  }
}
