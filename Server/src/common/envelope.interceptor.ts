import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Controllers return { data, meta? } — this interceptor wraps them in the
 * standard success envelope the client expects:
 *   { success: true, data: ..., meta?: ... }
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((body: unknown) => {
        if (
          typeof body === 'object' &&
          body !== null &&
          'data' in body
        ) {
          const { data, meta } = body as { data: unknown; meta?: unknown };
          return {
            success: true,
            data,
            ...(meta !== undefined ? { meta } : {}),
          };
        }
        return { success: true, data: body };
      }),
    );
  }
}
