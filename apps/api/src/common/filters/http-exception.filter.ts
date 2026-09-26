import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { CustomLogger } from '../logger/winston.logger';
import { type ApiResponse } from '@geocap-x/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new CustomLogger();

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const exceptionResponse: any =
      exception instanceof HttpException ? exception.getResponse() : null;

    const details =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? exceptionResponse.message || exceptionResponse
        : null;

    // Log the error detail with request context
    this.logger.error(
      `${request.method} ${request.url} failed with status ${status}: ${exception.message || exception}`,
      exception.stack,
      'HttpExceptionFilter'
    );

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        message,
        code: `ERR_HTTP_${status}`,
        details: process.env.NODE_ENV !== 'production' ? details || exception.stack : details,
      },
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}
