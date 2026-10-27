import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ApiException } from '../common/api-error.js';
import type { AuthenticatedRequest } from './auth.guard.js';

/**
 * Blocks users who still hold a temporary password.
 * Must run after AuthGuard (needs req.user).
 */
@Injectable()
export class RequirePasswordChangedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (request.user?.mustChangePassword) {
      throw new ApiException(
        403,
        'PASSWORD_CHANGE_REQUIRED',
        'Change your password before accessing this resource',
      );
    }

    return true;
  }
}
