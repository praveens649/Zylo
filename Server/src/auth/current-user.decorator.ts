import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { UserModel } from '../generated/prisma/models.js';
import type { AuthenticatedRequest } from './auth.guard.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserModel => {
    return ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  },
);
