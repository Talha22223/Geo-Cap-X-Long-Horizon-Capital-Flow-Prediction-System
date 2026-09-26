import { NestInterceptor, ExecutionContext, CallHandler, Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { type ApiResponse } from '@geocap-x/shared';
import { Response, Request } from 'express';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  private readonly logger = new Logger('SLA-Monitor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const startTime = Date.now();
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();

    return next.handle().pipe(
      tap(() => {
        const executionTime = Date.now() - startTime;
        if (response && !response.headersSent) {
          response.setHeader('X-Response-Time', `${executionTime}ms`);
        }
        if (executionTime > 300 && request?.url && !request.url.includes('/ai/')) {
          this.logger.warn(`SLA Warning: Route ${request.method} ${request.url} took ${executionTime}ms (> 300ms threshold)`);
        }
      }),
      map((data) => {
        // If it already matches our API response format, don't wrap twice
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...data,
            timestamp: (data as any).timestamp || new Date().toISOString(),
          };
        }
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      })
    );
  }
}
