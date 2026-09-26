/**
 * ============================================================================
 * AI SERVICE HTTP CLIENT (AiService)
 * ============================================================================
 * WHAT:
 *   HTTP client dispatcher that executes remote requests to the Python FastAPI
 *   AI microservice (`AI_SERVICE_URL`, default `http://localhost:8000`).
 *   Implements a 15-second AbortController timeout, robust error translation,
 *   and structured diagnostics logging.
 *
 * WHY:
 *   Provides resilient microservice communication with graceful degradation
 *   (GATEWAY_TIMEOUT on 15s expiration, SERVICE_UNAVAILABLE on connection refusal).
 *
 * HOW IT CONNECTS:
 *   - ConfigService: Reads `AI_SERVICE_URL`.
 *   - Used by: `AiController` to proxy requests.
 * ============================================================================
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.aiBaseUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
  }

  async fetchFromAi(endpoint: string, options?: RequestInit): Promise<any> {
    const url = `${this.aiBaseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for AI analysis

    try {
      this.logger.debug(`Calling AI Service: ${options?.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal as any, // type cast for older Node definitions if any
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: await response.text() };
        }
        
        this.logger.error(`AI Service error: ${response.status} - ${JSON.stringify(errorData)}`);
        
        throw new HttpException(
          errorData.message || 'Error communicating with AI Service',
          response.status
        );
      }

      const data = await response.json();
      // Most FastAPI endpoints return { success, data } or just { ... }. We return as is.
      return data;
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
        this.logger.error(`AI Service timeout: ${url}`);
        throw new HttpException('Analysis service request timed out', HttpStatus.GATEWAY_TIMEOUT);
      }
      
      this.logger.error(`AI Service connection error: ${error.message}`);
      throw new HttpException('Analysis service is currently unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
