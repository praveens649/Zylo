import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ApiException } from '../common/api-error.js';
import type { AuthenticatedRequest } from './auth.guard.js';
import { SYSTEM_ROLE } from '../common/constants.js';

/**
 * Admin-only authorization — must run after AuthGuard (needs req.user).
 * Only SUPER_ADMIN accounts pass; there is no dynamic role matrix.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (request.user?.role !== SYSTEM_ROLE) {
      throw new ApiException(
        403,
        'FORBIDDEN',
        'Administrator access required',
      );
    }

    return true;
  }
}
