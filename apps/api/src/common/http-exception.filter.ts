import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : undefined;

    if (typeof raw === 'object' && raw !== null && 'code' in raw) {
      response.status(status).json(raw);
      return;
    }

    const message = exception instanceof HttpException ? exception.message : 'Internal server error';
    response.status(status).json({
      code: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message,
    });
  }
}
