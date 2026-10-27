import { HttpException } from '@nestjs/common';

export interface ApiErrorDetail {
  field: string;
  message: string;
}

/**
 * Typed application error thrown by services and guards.
 * Mapped to the standard error envelope by ApiExceptionFilter.
 */
export class ApiException extends HttpException {
  readonly code: string;
  readonly details?: ApiErrorDetail[];

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: ApiErrorDetail[],
  ) {
    super(message, statusCode);
    this.name = 'ApiException';
    this.code = code;
    this.details = details;
  }
}
