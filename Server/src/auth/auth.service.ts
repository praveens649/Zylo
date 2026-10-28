import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import type { UserModel } from '../generated/prisma/models.js';
import { ApiException } from '../common/api-error.js';

export type UserWithRole = UserModel;

/** Claims embedded in the signed JWT. */
export interface JwtPayload {
  /** User id */
  sub: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {}

  /** Build the safe user payload (no password hash). */
  async safeUser(user: UserModel) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image ?? undefined,
      mustChangePassword: user.mustChangePassword,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  /** Sign a JWT access token for the user (returned in the response body). */
  async issueToken(user: Pick<UserModel, 'id' | 'role'>): Promise<string> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return this.jwt.signAsync(payload);
  }

  /**
   * Revoke a token server-side — stores its hash in Redis until the
   * token's own `exp` passes, so blocklist entries self-clean. Called
   * on logout and after a password change.
   */
  async revokeToken(token: string): Promise<void> {
    const decoded = this.jwt.decode<{ exp?: number }>(token);
    const remaining = decoded?.exp
      ? decoded.exp - Math.floor(Date.now() / 1000)
      : 0;
    if (remaining > 0) {
      await this.redis.set(`bl:${RedisService.hash(token)}`, '1', remaining);
    }
  }

  /**
   * Verify a JWT's signature + expiry and load the user it belongs to.
   * The DB lookup keeps `isActive` revocation live — a deactivated user is
   * rejected even with a valid token. A Redis blocklist key revokes
   * individual tokens before expiry (logout, password change).
   */
  async resolveTokenUser(token: string): Promise<UserModel> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new ApiException(
          401,
          'TOKEN_EXPIRED',
          'Your session has expired. Please log in again',
        );
      }
      throw new ApiException(
        401,
        'TOKEN_INVALID',
        'Your session is invalid. Please log in again',
      );
    }

    if (await this.redis.get(`bl:${RedisService.hash(token)}`)) {
      throw new ApiException(
        401,
        'TOKEN_REVOKED',
        'Your session is invalid. Please log in again',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new ApiException(
        401,
        'TOKEN_INVALID',
        'Your session is invalid. Please log in again',
      );
    }

    return user;
  }
}
