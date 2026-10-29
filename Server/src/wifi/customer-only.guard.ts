import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ApiException } from '../common/api-error.js';
import { SYSTEM_ROLE } from '../common/constants.js';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';

/**
 * Blocks SUPER_ADMIN from customer purchase endpoints. Must run after AuthGuard.
 * Admins fulfil orders from the WiFi Console; they never buy or pay.
 */
@Injectable()
export class CustomerOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.role === SYSTEM_ROLE) {
      throw new ApiException(403, 'CUSTOMER_ONLY', 'Admin accounts cannot place or pay for WiFi orders');
    }
    return true;
  }
}
