import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorCode, ApiErrorResponse } from '@anivora/types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: ApiErrorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected internal server error occurred.';
    let details: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string) || exception.message;
        details = resObj.error || resObj.details || null;
      }

      errorCode = this.mapHttpStatusToErrorCode(status);
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      message = exception.message;
    }

    const errorPayload: ApiErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        details,
      },
    };

    response.status(status).json(errorPayload);
  }

  private mapHttpStatusToErrorCode(status: number): ApiErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'INVALID_INPUT';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'CONTENT_NOT_FOUND';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'SOURCE_UNAVAILABLE';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_DEGRADED';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
