import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ApiException } from './api-error.js';

/**
 * Global error handler — shapes every thrown error into the standard envelope:
 *   { success: false, error: { code, message, details? } }
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // Typed application errors (guards, services)
    if (exception instanceof ApiException) {
      res.status(exception.getStatus()).json({
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
          ...(exception.details ? { details: exception.details } : {}),
        },
      });
      return;
    }

    // Throttler — 429
    if (exception instanceof ThrottlerException) {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        success: false,
        error: {
          code: req.path.includes('/auth/login')
            ? 'LOGIN_RATE_LIMITED'
            : 'RATE_LIMITED',
          message: 'Too many requests. Try again later',
        },
      });
      return;
    }

    // Nest built-ins (ValidationPipe failures, ParseUUIDPipe, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as
        | string
        | { message?: string | string[]; error?: string };

      const rawMessage =
        typeof body === 'string'
          ? body
          : Array.isArray(body?.message)
            ? body.message.join('; ')
            : (body?.message ?? exception.message);

      res.status(status).json({
        success: false,
        error: {
          code:
            status === 400
              ? 'VALIDATION_ERROR'
              : status === 401
                ? 'UNAUTHENTICATED'
                : status === 403
                  ? 'FORBIDDEN'
                  : status === 404
                    ? 'NOT_FOUND'
                    : 'HTTP_ERROR',
          message: rawMessage || 'Request failed',
        },
      });
      return;
    }

    // Prisma record-not-found (update/delete on missing row) → 404
    if (
      typeof exception === 'object' &&
      exception !== null &&
      (exception as { code?: string }).code === 'P2025'
    ) {
      res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Record not found' },
      });
      return;
    }

    // Prisma unique-constraint violation → 409
    if (
      typeof exception === 'object' &&
      exception !== null &&
      (exception as { code?: string }).code === 'P2002'
    ) {
      res.status(HttpStatus.CONFLICT).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A record with this value already exists',
        },
      });
      return;
    }

    console.error('API error:', exception);

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
}
